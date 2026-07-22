import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const PUBLIC_TABS = new Set(['projekti', 'rizici', 'misljenja', 'ovisnosti', 'zadaci', 'newsroom', 'workeri', 'zapisnik']);
const ADMIN_TABS = new Set(['plan', 'bilten', 'krediti']);

function addMinutes(localTime, minutes) {
  const [hour, minute] = localTime.split(':').map(Number);
  const total = hour * 60 + minute + minutes;
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function stableJitter(id, date, maxMinutes) {
  let hash = 2166136261;
  for (const ch of `${id}|${date}`) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const span = maxMinutes * 2 + 1;
  return (Math.abs(hash >>> 0) % span) - maxMinutes;
}

function chooseWindow(draft, windows) {
  const surface = PUBLIC_TABS.has(draft.tab) ? 'draft-queue' : 'admin-only';
  const candidates = windows.filter((window) => window.surface === surface);
  if (!candidates.length) return null;
  const index = Math.abs([...draft.id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % candidates.length;
  return candidates[index];
}

export function buildPublicationPlan(cycle, review, config) {
  if (cycle.mode !== 'OFFLINE' || review.mode !== 'OFFLINE') throw new Error('Publication planner only accepts OFFLINE inputs.');
  if (config.enabled !== false) throw new Error('Publication windows must remain disabled in offline mode.');

  const reviewByDraft = new Map((review.reviewedItems ?? []).map((item) => [item.draftId, item]));
  const items = [];

  for (const draft of cycle.drafts ?? []) {
    const reviewed = reviewByDraft.get(draft.id);
    const window = chooseWindow(draft, config.windows ?? []);
    const jitter = window ? stableJitter(draft.id, cycle.date, config.jitterMinutes ?? 0) : 0;
    const scheduledLocalTime = window ? addMinutes(window.localTime, jitter) : null;

    let state = 'BLOCKED';
    let reason = 'MISSING_REVIEW';

    if (reviewed?.decision === 'PASS_INTERNAL') {
      state = PUBLIC_TABS.has(draft.tab) ? 'DEFERRED' : 'READY_INTERNAL';
      reason = PUBLIC_TABS.has(draft.tab) ? 'PUBLIC_ACTIVATION_DISABLED' : 'INTERNAL_PREVIEW_READY';
    } else if (reviewed?.decision === 'REVISE') {
      state = 'DEFERRED';
      reason = 'REVISION_REQUIRED';
    } else if (reviewed?.decision === 'HOLD') {
      state = 'BLOCKED';
      reason = 'RISK_OR_EVIDENCE_HOLD';
    } else if (reviewed?.decision === 'REJECT') {
      state = 'REJECTED';
      reason = 'REVIEW_REJECTED';
    }

    items.push({
      draftId: draft.id,
      tab: draft.tab,
      state,
      reason,
      reviewDecision: reviewed?.decision ?? null,
      targetSurface: window?.surface ?? (ADMIN_TABS.has(draft.tab) ? 'admin-only' : 'draft-queue'),
      windowId: window?.id ?? null,
      scheduledLocalTime,
      timezone: config.timezone,
      publishAt: null,
      productionWriteAllowed: false,
      publicPublishingAllowed: false,
      humanApprovalRequired: true
    });
  }

  const counts = items.reduce((acc, item) => {
    acc[item.state] = (acc[item.state] ?? 0) + 1;
    return acc;
  }, {});

  return {
    schemaVersion: 'offline-publication-plan/v1',
    mode: 'OFFLINE',
    date: cycle.date,
    generatedAt: new Date().toISOString(),
    activation: {
      schedulerEnabled: false,
      publicPublishingEnabled: false,
      productionWritesEnabled: false
    },
    counts,
    items
  };
}

async function main() {
  const shadowManifest = JSON.parse(await readFile(path.join(root, 'generated-shadow', 'manifest.json'), 'utf8'));
  const reviewIndex = JSON.parse(await readFile(path.join(root, 'generated-review', 'index.json'), 'utf8'));
  const config = JSON.parse(await readFile(path.join(root, 'config', 'daily-publication-windows.json'), 'utf8'));
  const outputDir = path.join(root, 'generated-publication-plan');
  await mkdir(outputDir, { recursive: true });

  const manifest = {
    schemaVersion: 'offline-publication-plan-manifest/v1',
    mode: 'OFFLINE',
    generatedAt: new Date().toISOString(),
    publicPublishingAllowed: false,
    files: [],
    totals: {}
  };

  for (const file of shadowManifest.files ?? []) {
    const cycle = JSON.parse(await readFile(path.join(root, 'generated-shadow', file.filename), 'utf8'));
    const reviewEntry = (reviewIndex.days ?? []).find((item) => item.date === file.date);
    if (!reviewEntry?.review) throw new Error(`Missing review for ${file.date}`);
    const plan = buildPublicationPlan(cycle, reviewEntry.review, config);
    const filename = `${file.date}.publication-plan.json`;
    await writeFile(path.join(outputDir, filename), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
    manifest.files.push({ date: file.date, filename });
    for (const [state, count] of Object.entries(plan.counts)) manifest.totals[state] = (manifest.totals[state] ?? 0) + count;
  }

  await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
