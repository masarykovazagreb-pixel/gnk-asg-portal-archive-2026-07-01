import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reviewCycle } from './review-gate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const shadowDir = path.join(root, 'generated-shadow');
const reviewDir = path.join(root, 'generated-review');

await mkdir(reviewDir, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(shadowDir, 'manifest.json'), 'utf8'));
const previous = [];
const index = [];

for (const entry of manifest.files) {
  const cycle = JSON.parse(await readFile(path.join(shadowDir, entry.filename), 'utf8'));
  const review = reviewCycle(cycle, previous);
  const reviewFilename = entry.filename.replace(/\.json$/u, '.review.json');
  await writeFile(path.join(reviewDir, reviewFilename), `${JSON.stringify(review, null, 2)}\n`, 'utf8');

  index.push({
    date: cycle.date,
    source: entry.filename,
    review: reviewFilename,
    counts: review.counts,
    publicReleaseAllowed: false
  });
  previous.push(cycle);
}

const dashboard = {
  schemaVersion: 'offline-workforce-review-index/v1',
  mode: 'OFFLINE',
  generatedAt: new Date().toISOString(),
  publicReleaseAllowed: false,
  days: index,
  totals: index.reduce((acc, day) => {
    for (const [decision, count] of Object.entries(day.counts)) {
      acc[decision] = (acc[decision] ?? 0) + count;
    }
    return acc;
  }, {})
};

await writeFile(path.join(reviewDir, 'index.json'), `${JSON.stringify(dashboard, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(dashboard, null, 2));
