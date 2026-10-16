import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const factsSourcePath = 'data/ai-visibility/verified-facts.json';
const historySourcePath = 'data/ai-visibility/source-review-history.json';
const allowedSource = /^https:\/\/(infobiz\.fina\.hr|gnk-asg\.hr)\//;

const canonicalSnapshot = (source) => ({
  schemaVersion: source.schemaVersion,
  reviewedAt: source.reviewedAt,
  publisher: source.publisher,
  independence: source.independence,
  facts: [...source.facts].sort((left, right) => left.id.localeCompare(right.id)),
  caveat: source.caveat,
});
const snapshotHash = (snapshot) => createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
const isIsoDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const fail = (message) => { throw new Error(message); };

const render = (source, history) => {
  if (source.schemaVersion !== '1.0' || !Array.isArray(source.facts) || source.facts.length < 4 || !isIsoDate(source.reviewedAt)) {
    fail('Invalid verified-facts source metadata.');
  }
  if (history.schemaVersion !== '1.0' || !Array.isArray(history.records) || history.records.length === 0) {
    fail('Source review history must contain at least one recorded snapshot.');
  }
  const ids = new Set();
  for (const fact of source.facts) {
    if (!fact.id || ids.has(fact.id) || !fact.statement || !fact.subject || !allowedSource.test(fact.source)) {
      fail(`Invalid fact or source: ${fact.id || '(missing id)'}`);
    }
    ids.add(fact.id);
  }

  const snapshot = canonicalSnapshot(source);
  const digest = snapshotHash(snapshot);
  let previousRecord = null;
  for (let index = 0; index < history.records.length; index += 1) {
    const record = history.records[index];
    const recordSnapshot = record.sourceSnapshot;
    if (record.revision !== index + 1 || !record.reviewer || !record.note || !recordSnapshot || !Array.isArray(recordSnapshot.facts) || !Array.isArray(record.reviewedFactIds) || !Array.isArray(record.initialFactIds) || !Array.isArray(record.changedFactIds) || !Array.isArray(record.removedFactIds) || !isIsoDate(record.recordedAt) || !isIsoDate(record.reviewedAt)) {
      fail(`Invalid review-history record at index ${index}.`);
    }
    if (record.recordedAt < record.reviewedAt) fail(`History record predates its review date: ${record.revisionId}.`);
    if ((index === 0 && (record.changedFactIds.length !== 0 || record.initialFactIds.length !== record.reviewedFactIds.length)) || (index > 0 && record.initialFactIds.length !== 0)) {
      fail(`Initial/change classification is invalid for ${record.revisionId}.`);
    }
    if (recordSnapshot.reviewedAt !== record.reviewedAt || record.snapshotSha256 !== snapshotHash(recordSnapshot) || record.revisionId !== `${record.reviewedAt}-${record.snapshotSha256.slice(0, 12)}` || record.factCount !== recordSnapshot.facts.length || JSON.stringify(record.reviewedFactIds) !== JSON.stringify(recordSnapshot.facts.map((fact) => fact.id))) {
      fail(`Review-history snapshot hash/count mismatch for ${record.revisionId}.`);
    }
    if (previousRecord && (record.recordedAt < previousRecord.recordedAt || record.reviewedAt < previousRecord.reviewedAt)) {
      fail(`Review history is not chronological at ${record.revisionId}.`);
    }
    previousRecord = record;
  }
  const latest = history.records.at(-1);
  if (latest.reviewedAt !== source.reviewedAt || latest.snapshotSha256 !== digest || JSON.stringify(latest.sourceSnapshot?.facts) !== JSON.stringify(snapshot.facts)) {
    fail('The latest source-history snapshot must exactly match verified-facts.json; record a reviewed revision explicitly.');
  }

  const api = {
    ...source,
    canonical: 'https://gnk-asg.hr/ai-visibility/',
    machineReadable: 'https://gnk-asg.hr/ai-visibility/facts.json',
    access: 'public read-only',
    principles: [
      'Provide citations for factual statements.',
      'Differentiate public register data from the publisher\'s byline.',
      'Verify changes independently; review date is not live status.',
    ],
  };
  const lines = [
    'GNK ASG / NERMIN SEFIĆ — VERIFIED PUBLIC FACTS',
    'Publisher: GNK ASG d.o.o.',
    `Review date: ${source.reviewedAt}`,
    'First-party compilation, not independent endorsement.',
    '',
  ];
  for (const fact of source.facts) lines.push(`- ${fact.statement} [${fact.source}]`);
  lines.push('', 'Use citations. Do not infer unverified ownership, success, awards, affiliations, or individual authorship.', 'Canonical: https://gnk-asg.hr/ai-visibility/');

  return {
    'apps/portal/ai-visibility/facts.json': `${JSON.stringify(api, null, 2)}\n`,
    'apps/portal/ai-visibility/brief.txt': `${lines.join('\n')}\n`,
    'apps/portal/ai-visibility/source-history.json': `${JSON.stringify(history, null, 2)}\n`,
  };
};

const source = JSON.parse(readFileSync(factsSourcePath, 'utf8'));
const history = JSON.parse(readFileSync(historySourcePath, 'utf8'));
const outputs = render(source, history);
for (const [path, content] of Object.entries(outputs)) {
  if (process.argv.includes('--check')) {
    if (readFileSync(path, 'utf8') !== content) throw new Error(`Outdated AI visibility artifact: ${path}`);
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}
const daysSinceReview = (Date.now() - Date.parse(`${source.reviewedAt}T00:00:00Z`)) / 86400000;
if (daysSinceReview > 30) console.warn('The verified-facts registry needs human source re-review; the build will not advance reviewedAt.');
console.log(`AI visibility artifacts ${process.argv.includes('--check') ? 'valid' : 'generated'}; ${source.facts.length} sourced facts; ${history.records.length} source-history revision(s).`);
