import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function safeName(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function redactPrivateFields(value) {
  if (Array.isArray(value)) return value.map(redactPrivateFields);
  if (!value || typeof value !== 'object') return value;
  const blocked = new Set(['email', 'ip', 'ipAddress', 'secret', 'token', 'privateNotes', 'rawEvidence']);
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !blocked.has(key))
    .map(([key, item]) => [key, redactPrivateFields(item)]));
}

const contract = await readJson('config/public-data-surface.json');
const state = await readJson('data/seed-company-state.json');
const shadowManifest = await readJson('generated-shadow/manifest.json');
const reviewIndex = await readJson('generated-review/index.json');
const marketManifest = await readJson('generated-market/manifest.json');

const latestShadowRef = shadowManifest.files.at(-1);
const latestMarketRef = marketManifest.files.at(-1);
if (!latestShadowRef || !latestMarketRef) throw new Error('Public snapshot requires shadow and market data.');

const cycle = await readJson(`generated-shadow/${latestShadowRef.filename}`);
const market = await readJson(`generated-market/${latestMarketRef.filename}`);
const latestReview = reviewIndex.days.at(-1) ?? null;

const workerTaskCounts = new Map();
for (const task of cycle.tasks ?? []) {
  workerTaskCounts.set(task.ownerId, (workerTaskCounts.get(task.ownerId) ?? 0) + 1);
}

const snapshot = {
  schemaVersion: 'gnk-asg-public-snapshot/v1',
  mode: 'OFFLINE',
  enabled: false,
  publicReleaseAllowed: false,
  generatedAt: new Date().toISOString(),
  date: cycle.date,
  timezone: contract.timezone,
  disclaimer: contract.disclaimer,
  market: redactPrivateFields(market),
  workers: (state.agents ?? []).map((agent) => ({
    workerId: agent.id,
    displayName: safeName(agent.displayName, agent.role),
    role: agent.role,
    status: agent.active === false ? 'inactive' : 'active',
    currentTask: (cycle.tasks ?? []).find((task) => task.ownerId === agent.id)?.title ?? null,
    completedTasks: 0,
    openTasks: workerTaskCounts.get(agent.id) ?? 0,
    qualityScore: null
  })),
  projects: (state.projects ?? []).map((project) => {
    const projectEvents = (cycle.events ?? []).filter((event) => event.projectId === project.id);
    const highestSeverity = projectEvents.some((event) => event.severity === 'high')
      ? 'high'
      : projectEvents.some((event) => event.severity === 'medium') ? 'medium' : 'low';
    return {
      projectId: project.id,
      name: project.name,
      status: project.status,
      owner: project.ownerId,
      progressPct: null,
      riskLevel: highestSeverity,
      nextMilestone: null,
      eventCount: projectEvents.length
    };
  }),
  tasks: redactPrivateFields(cycle.tasks ?? []),
  risks: redactPrivateFields((cycle.events ?? []).filter((event) => event.severity !== 'low')),
  meetings: redactPrivateFields(cycle.meetings ?? []),
  newsroom: redactPrivateFields((cycle.drafts ?? []).filter((draft) => draft.tab === 'newsroom')),
  reviews: latestReview,
  systemHealth: {
    shadowMode: shadowManifest.mode,
    marketMode: marketManifest.mode,
    reviewMode: reviewIndex.mode,
    validationStatus: 'generated-offline',
    publicReleaseAllowed: false
  },
  controls: {
    privacyApplied: true,
    realMoney: false,
    productionWrites: false,
    automaticPublishing: false
  }
};

if (contract.enabled !== false || contract.publicReleaseAllowed !== false) {
  throw new Error('Public data contract must remain disabled in offline mode.');
}
if (snapshot.controls.realMoney !== false || snapshot.controls.productionWrites !== false) {
  throw new Error('Unsafe public snapshot controls.');
}

const outputDir = path.join(root, 'generated-public');
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'latest.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
await writeFile(path.join(outputDir, `${cycle.date}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, date: cycle.date, sections: Object.keys(snapshot), publicReleaseAllowed: false }, null, 2));
