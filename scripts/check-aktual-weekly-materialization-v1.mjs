#!/usr/bin/env node
/**
 * Scoped weekly editorial materialization gate.
 * If new curation is incomplete, retain a cryptographically matched, complete
 * archived issue. Do NOT publish, backdate, alter sitemaps or imply freshness.
 * A ready new issue MUST pass the existing canonical --check unchanged.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const https = value => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && Boolean(u.hostname);
  } catch { return false; }
};
const digest = doc => createHash('sha256').update(JSON.stringify(doc)).digest('hex');
export function decideWeeklyGate(readiness, published, archivedCuration) {
  if (!readiness || !datePattern.test(readiness.issue_week || ''))
    throw new Error('Missing or invalid pending weekly issue date');
  if (readiness.ready === true) return 'verify-current';
  if (readiness.ready !== false || readiness.required !== 8 ||
      !Number.isInteger(readiness.curated_count) || readiness.curated_count < 0 ||
      readiness.curated_count >= 8)
    throw new Error('Inconsistent weekly curation readiness');
  if (!published || !datePattern.test(published.issue_week || '') ||
      published.issue_week >= readiness.issue_week)
    throw new Error('Previous weekly issue is missing, invalid or not older');
  const sections = Array.isArray(published.sections) ? published.sections : [];
  const selected = sections.flatMap(s => Array.isArray(s.items) ? s.items : []);
  if (sections.length < 5 || selected.length < 8 ||
      published.counts?.selected_items !== selected.length ||
      !published.curation_digest || selected.some(x => !https(x.url) || !x.title || !x.source))
    throw new Error('Archived weekly publication is incomplete');
  if (!archivedCuration || archivedCuration.issue_week !== published.issue_week ||
      !Array.isArray(archivedCuration.items) || archivedCuration.items.length < 8 ||
      archivedCuration.items.some(x => !https(x.url) || !x.source ||
        !Array.isArray(x.verified_facts) || x.verified_facts.length === 0))
    throw new Error('Previous weekly curation cannot be verified');
  if (digest(archivedCuration) !== published.curation_digest)
    throw new Error('Previous weekly curation digest mismatch');
  const publishedUrls = new Set(selected.map(x => x.url));
  if (archivedCuration.items.some(x => !publishedUrls.has(x.url)))
    throw new Error('Archived curated sources do not match published issue');
  return 'hold-archived';
}
export function run() {
  const readiness = JSON.parse(execFileSync(process.execPath,
    ['scripts/build-aktual-media-weekly-v1.mjs','--readiness'], { encoding:'utf8' }));
  const published = JSON.parse(readFileSync('apps/portal/data/aktual-weekly.json','utf8'));
  const curation = JSON.parse(readFileSync('apps/portal/data/aktual-weekly-curation.json','utf8'));
  const decision = decideWeeklyGate(readiness, published, curation);
  if (decision === 'verify-current') {
    execFileSync(process.execPath, ['scripts/build-aktual-media-weekly-v1.mjs','--check'],
      { stdio:'inherit' });
  } else {
    console.log('::warning title=Weekly editorial HOLD::Pending issue '+readiness.issue_week+
      ' has '+readiness.curated_count+'/8 approved selections. Archived issue '+
      published.issue_week+' preserved without new publication or freshness claim.');
  }
  console.log(JSON.stringify({decision, pending_week:readiness.issue_week,
    published_week:published.issue_week, new_publication:false}));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  run();
