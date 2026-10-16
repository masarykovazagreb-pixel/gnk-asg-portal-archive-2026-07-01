import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const factsPath = 'data/ai-visibility/verified-facts.json';
const historyPath = 'data/ai-visibility/source-review-history.json';
const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
  if (key === '--help') {
    console.log('Usage: node scripts/record-ai-reference-review-v1.mjs --reviewer NAME --reviewed-at YYYY-MM-DD --note TEXT [--recorded-at YYYY-MM-DD]');
    process.exit(0);
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
  args.set(key, value);
  index += 1;
}

const reviewer = args.get('--reviewer');
const reviewedAt = args.get('--reviewed-at');
const note = args.get('--note');
const recordedAt = args.get('--recorded-at') || new Date().toISOString().slice(0, 10);
if (!reviewer?.trim() || !reviewedAt || !note?.trim()) {
  throw new Error('A human reviewer, reviewed-at date and review note are required. See --help.');
}
const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
if (!validDate(reviewedAt) || !validDate(recordedAt)) throw new Error('Dates must use valid YYYY-MM-DD calendar dates.');
if (recordedAt < reviewedAt) throw new Error('The history record cannot predate its source-review date.');

const source = JSON.parse(readFileSync(factsPath, 'utf8'));
if (source.reviewedAt !== reviewedAt) {
  throw new Error(`--reviewed-at must match verified-facts.json (${source.reviewedAt}); this tool does not update review dates or facts.`);
}
if (!Array.isArray(source.facts) || source.facts.length === 0) throw new Error('No facts are available to record.');
const seenFactIds = new Set();
for (const fact of source.facts) {
  if (!fact?.id || seenFactIds.has(fact.id) || !fact.statement || !fact.subject || !/^https:\/\/(?:infobiz\.fina\.hr|gnk-asg\.hr)\//.test(fact.source || '')) {
    throw new Error(`Invalid fact or public source: ${fact?.id || '(missing id)'}`);
  }
  seenFactIds.add(fact.id);
}
const snapshot = {
  schemaVersion: source.schemaVersion,
  reviewedAt: source.reviewedAt,
  publisher: source.publisher,
  independence: source.independence,
  facts: [...source.facts].sort((left, right) => left.id.localeCompare(right.id)),
  caveat: source.caveat,
};
const snapshotSha256 = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
let history;
try {
  history = JSON.parse(readFileSync(historyPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  history = {
    schemaVersion: '1.0',
    description: 'Append-only snapshots of the public AI-reference fact source. Build and copy operations never create review entries or advance dates.',
    records: [],
  };
}
if (history.schemaVersion !== '1.0' || !Array.isArray(history.records)) throw new Error('Invalid source review history schema.');
if (history.records.some((record) => record.snapshotSha256 === snapshotSha256)) {
  throw new Error('This exact fact snapshot is already in the review history; no duplicate was written.');
}
const previous = history.records.at(-1);
if (previous && (recordedAt < previous.recordedAt || reviewedAt < previous.reviewedAt)) {
  throw new Error('Review history dates must be append-only and non-decreasing.');
}
const previousFacts = new Map((previous?.sourceSnapshot?.facts || []).map((fact) => [fact.id, JSON.stringify(fact)]));
const changedFactIds = previous ? snapshot.facts
  .filter((fact) => previousFacts.get(fact.id) !== JSON.stringify(fact))
  .map((fact) => fact.id) : [];
const initialFactIds = previous ? [] : snapshot.facts.map((fact) => fact.id);
const removedFactIds = [...previousFacts.keys()].filter((id) => !snapshot.facts.some((fact) => fact.id === id));
const record = {
  revision: history.records.length + 1,
  revisionId: `${reviewedAt}-${snapshotSha256.slice(0, 12)}`,
  recordedAt,
  reviewedAt,
  reviewer: reviewer.trim(),
  note: note.trim(),
  snapshotSha256,
  factCount: snapshot.facts.length,
  reviewedFactIds: snapshot.facts.map((fact) => fact.id),
  initialFactIds,
  changedFactIds,
  removedFactIds,
  sourceSnapshot: snapshot,
};
history.records.push(record);
writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`);
console.log(`Recorded AI-reference revision ${record.revisionId}; fact data itself was not modified.`);
