import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildActivityTimeline, validateActivityTimeline } from './activity-timeline.mjs';
import { buildAuditHistory, validateAuditHistory } from './audit-history.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outputDir = path.join(root, 'generated-operations-trace');
await mkdir(outputDir, { recursive: true });

const shadowManifest = JSON.parse(await readFile(path.join(root, 'generated-shadow', 'manifest.json'), 'utf8'));
const reviewIndex = JSON.parse(await readFile(path.join(root, 'generated-review', 'index.json'), 'utf8'));
const publicationManifest = JSON.parse(await readFile(path.join(root, 'generated-publication-plan', 'manifest.json'), 'utf8'));

const manifest = {
  schemaVersion: 'offline-operations-trace-manifest/v1',
  mode: 'OFFLINE',
  generatedAt: new Date().toISOString(),
  files: [],
  totals: { timelineEntries: 0, auditRecords: 0 },
  controls: { publicPublishingAllowed: false, productionWriteAllowed: false }
};

for (const file of shadowManifest.files ?? []) {
  const cycle = JSON.parse(await readFile(path.join(root, 'generated-shadow', file.filename), 'utf8'));
  const review = (reviewIndex.days ?? []).find((item) => item.date === file.date)?.review;
  const planFile = (publicationManifest.files ?? []).find((item) => item.date === file.date)?.filename;
  if (!review || !planFile) throw new Error(`Missing review or publication plan for ${file.date}`);
  const publicationPlan = JSON.parse(await readFile(path.join(root, 'generated-publication-plan', planFile), 'utf8'));

  const timeline = buildActivityTimeline(cycle, review, publicationPlan);
  const timelineResult = validateActivityTimeline(timeline);
  if (!timelineResult.ok) throw new Error(`${file.date} timeline: ${timelineResult.errors.join('; ')}`);

  const audit = buildAuditHistory(cycle, review, publicationPlan, timeline);
  const auditResult = validateAuditHistory(audit);
  if (!auditResult.ok) throw new Error(`${file.date} audit: ${auditResult.errors.join('; ')}`);

  const filename = `${file.date}.operations-trace.json`;
  await writeFile(path.join(outputDir, filename), `${JSON.stringify({ timeline, audit }, null, 2)}\n`, 'utf8');
  manifest.files.push({ date: file.date, filename, chainHead: audit.chainHead });
  manifest.totals.timelineEntries += timeline.entries.length;
  manifest.totals.auditRecords += audit.records.length;
}

await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
