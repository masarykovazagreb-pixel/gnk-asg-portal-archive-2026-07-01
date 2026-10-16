import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const source = readJson('data/ai-visibility/verified-facts.json');
const history = readJson('data/ai-visibility/source-review-history.json');
const publicHistory = readJson('apps/portal/ai-visibility/source-history.json');
const publicFacts = readJson('apps/portal/ai-visibility/facts.json');
const latest = history.records.at(-1);
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const snapshot = {
  schemaVersion: source.schemaVersion,
  reviewedAt: source.reviewedAt,
  publisher: source.publisher,
  independence: source.independence,
  facts: [...source.facts].sort((left, right) => left.id.localeCompare(right.id)),
  caveat: source.caveat,
};

assert.equal(history.schemaVersion, '1.0');
assert.deepEqual(publicHistory, history, 'the public JSON artifact must mirror the reviewed source history');
assert.equal(publicFacts.reviewedAt, source.reviewedAt, 'builds must not silently advance a review date');
assert(Array.isArray(history.records) && history.records.length >= 1);
assert.equal(latest.reviewedAt, source.reviewedAt);
assert.equal(latest.snapshotSha256, digest(snapshot));
assert.deepEqual(latest.sourceSnapshot, snapshot);
assert.equal(latest.factCount, source.facts.length);
assert.equal(new Set(latest.reviewedFactIds).size, source.facts.length);
assert.deepEqual(latest.changedFactIds, [], 'initial baseline snapshots must not be presented as changes');
assert.deepEqual(latest.initialFactIds, snapshot.facts.map((fact) => fact.id));
assert(latest.note.toLowerCase().includes('not') && latest.note.toLowerCase().includes('live'));
assert.match(latest.revisionId, /^\d{4}-\d{2}-\d{2}-[a-f0-9]{12}$/);
for (let index = 0; index < history.records.length; index += 1) {
  assert.equal(history.records[index].revision, index + 1, 'revision sequence must be contiguous');
  if (index > 0) {
    assert(history.records[index].recordedAt >= history.records[index - 1].recordedAt, 'recorded dates must be append-only');
    assert(history.records[index].reviewedAt >= history.records[index - 1].reviewedAt, 'review dates must not move backward');
  }
}
const page = readFileSync('apps/portal/ai/index.html', 'utf8');
const croatianPage = readFileSync('apps/portal/ai/hr/index.html', 'utf8');
assert(page.includes('/ai-visibility/source-history.json'));
assert(croatianPage.includes('/ai-visibility/source-history.json'));
assert(page.includes('data-ai-fact-list') && page.includes('data-ai-review-history-list'));
assert(croatianPage.includes('data-ai-fact-list') && croatianPage.includes('data-ai-review-history-list'));

const generated = spawnSync(process.execPath, ['scripts/generate-ai-visibility-v1.mjs', '--check'], { encoding: 'utf8' });
assert.equal(generated.status, 0, generated.stderr || generated.stdout);
const duplicate = spawnSync(process.execPath, [
  'scripts/record-ai-reference-review-v1.mjs',
  '--reviewer', latest.reviewer,
  '--reviewed-at', latest.reviewedAt,
  '--recorded-at', latest.recordedAt,
  '--note', latest.note,
], { encoding: 'utf8' });
assert.notEqual(duplicate.status, 0, 'duplicate snapshots must not be appended');
assert.match(duplicate.stderr, /already in the review history/);
console.log(`AI source review history, snapshots, public mirror and anti-drift guard: PASS (${history.records.length} revision(s))`);
