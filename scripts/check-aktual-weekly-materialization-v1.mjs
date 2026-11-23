#!/usr/bin/env node
// Preserve editorial safety when the next weekly issue has not been approved.
// A missing curated seed is a publication HOLD, not permission to invent news.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function decideWeeklyGate(readiness, current) {
  if (!readiness || !/^\d{4}-\d{2}-\d{2}$/.test(readiness.issue_week || ''))
    throw new Error('Weekly readiness is missing a valid issue week');
  if (!current || !/^\d{4}-\d{2}-\d{2}$/.test(current.issue_week || ''))
    throw new Error('Existing weekly publication is missing or invalid');
  if (readiness.ready) return 'verify';
  if (readiness.curated_count >= 8 || readiness.required !== 8)
    throw new Error('Inconsistent weekly editorial readiness');
  if (current.issue_week >= readiness.issue_week)
    throw new Error('Cannot hold: current weekly issue is not older than pending issue');
  if (!Array.isArray(current.sections) || current.sections.length < 5 ||
      !current.curation_digest || !current.counts || current.counts.selected_items < 8)
    throw new Error('Cannot hold: last published weekly issue is incomplete');
  return 'hold';
}
export function run() {
  const readiness = JSON.parse(execFileSync(process.execPath,
    ['scripts/build-aktual-media-weekly-v1.mjs', '--readiness'], {encoding:'utf8'}));
  const current = JSON.parse(readFileSync('apps/portal/data/aktual-weekly.json','utf8'));
  const decision = decideWeeklyGate(readiness,current);
  if (decision === 'verify') {
    execFileSync(process.execPath,['scripts/build-aktual-media-weekly-v1.mjs','--check'],{stdio:'inherit'});
  } else {
    console.log('::warning title=Weekly editorial hold::Issue '+readiness.issue_week+
      ' has '+readiness.curated_count+'/8 reviewed items. Existing issue '+
      current.issue_week+' retained; no new story, sitemap entry or issue generated.');
  }
  console.log(JSON.stringify({decision,pending_week:readiness.issue_week,published_week:current.issue_week}));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
