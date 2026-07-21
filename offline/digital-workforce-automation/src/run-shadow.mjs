import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateDailyCycle, validateCycle } from './engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const state = JSON.parse(await readFile(path.join(root, 'data', 'seed-company-state.json'), 'utf8'));

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
  totals: { events: 0, comments: 0, meetings: 0, tasks: 0, drafts: 0 }
};

for (let offset = 0; offset < days; offset += 1) {
  const date = new Date(startDate);
  date.setUTCDate(startDate.getUTCDate() + offset);
  const day = date.toISOString().slice(0, 10);
  const cycle = generateDailyCycle(state, day);
  const result = validateCycle(cycle);
  if (!result.ok) throw new Error(`${day}: ${result.errors.join('; ')}`);

  const filename = `${day}.json`;
  await writeFile(path.join(outputDir, filename), `${JSON.stringify(cycle, null, 2)}\n`, 'utf8');
  manifest.files.push({ date: day, filename, shaMode: 'deterministic-input' });
  manifest.totals.events += cycle.events.length;
  manifest.totals.comments += cycle.comments.length;
  manifest.totals.meetings += cycle.meetings.length;
  manifest.totals.tasks += cycle.tasks.length;
  manifest.totals.drafts += cycle.drafts.length;
}

await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
