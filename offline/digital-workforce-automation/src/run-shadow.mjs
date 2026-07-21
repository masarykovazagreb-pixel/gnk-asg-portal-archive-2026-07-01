import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateDailyCycle, validateCycle } from './engine.mjs';
import { applyDailyLimits, validateDailyLimits } from './apply-daily-limits.mjs';
import { applyEventTaxonomy, validateEventTaxonomy } from './event-taxonomy.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const state = JSON.parse(await readFile(path.join(root, 'data', 'seed-company-state.json'), 'utf8'));
const operatingModel = JSON.parse(await readFile(path.join(root, 'config', 'company-operating-model.json'), 'utf8'));
const eventTaxonomy = JSON.parse(await readFile(path.join(root, 'config', 'event-taxonomy.json'), 'utf8'));

const start = process.argv[2] ?? '2026-07-22';
const days = Number.parseInt(process.argv[3] ?? '14', 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error('Start date must use YYYY-MM-DD.');
if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error('Days must be an integer from 1 to 90.');

const outputDir = path.join(root, 'generated-shadow');
await mkdir(outputDir, { recursive: true });

const startDate = new Date(`${start}T12:00:00Z`);
const manifest = {
  schemaVersion: 'offline-workforce-shadow-manifest/v1',
  mode: 'OFFLINE',
  generatedAt: new Date().toISOString(),
  start,
  days,
  files: [],
  totals: {
    events: 0,
    canonicalEvents: 0,
    aliasedEvents: 0,
    comments: 0,
    meetings: 0,
    tasks: 0,
    drafts: 0,
    draftsRemovedByDailyLimits: 0
  }
};

for (let offset = 0; offset < days; offset += 1) {
  const date = new Date(startDate);
  date.setUTCDate(startDate.getUTCDate() + offset);
  const day = date.toISOString().slice(0, 10);
  const generated = generateDailyCycle(state, day);
  const normalized = applyEventTaxonomy(generated, eventTaxonomy);
  const cycle = applyDailyLimits(normalized, operatingModel.dailyLimits);
  const cycleResult = validateCycle(cycle);
  const taxonomyResult = validateEventTaxonomy(cycle, eventTaxonomy);
  const limitResult = validateDailyLimits(cycle, operatingModel.dailyLimits);
  const errors = [...cycleResult.errors, ...taxonomyResult.errors, ...limitResult.errors];
  if (errors.length) throw new Error(`${day}: ${errors.join('; ')}`);

  const filename = `${day}.json`;
  const aliasedEvents = cycle.events.filter((event) => event.taxonomyAliased === true).length;
  await writeFile(path.join(outputDir, filename), `${JSON.stringify(cycle, null, 2)}\n`, 'utf8');
  manifest.files.push({
    date: day,
    filename,
    shaMode: 'deterministic-input',
    canonicalEvents: cycle.events.length,
    aliasedEvents,
    draftsRemovedByDailyLimits: cycle.controls.dailyLimitReport.removedTotal
  });
  manifest.totals.events += cycle.events.length;
  manifest.totals.canonicalEvents += cycle.events.length;
  manifest.totals.aliasedEvents += aliasedEvents;
  manifest.totals.comments += cycle.comments.length;
  manifest.totals.meetings += cycle.meetings.length;
  manifest.totals.tasks += cycle.tasks.length;
  manifest.totals.drafts += cycle.drafts.length;
  manifest.totals.draftsRemovedByDailyLimits += cycle.controls.dailyLimitReport.removedTotal;
}

await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
