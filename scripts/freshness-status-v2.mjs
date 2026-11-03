#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const now = new Date(process.env.FRESHNESS_NOW || Date.now());
const read = (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };
const classify = (sourceState, ageMinutes, maxAgeMinutes) => {
  const state = String(sourceState).toLowerCase();
  if (sourceState === false || ['error','failed','unavailable','degraded'].includes(state)) return 'error';
  // A stale fallback must NEVER be reported as fresh just because checked_at is recent.
  if (state === 'stale' || ageMinutes > maxAgeMinutes) return 'stale';
  return 'fresh';
};
if (process.argv.includes('--self-test')) {
  for (const [sourceState, age, max, expected] of [
    ['live', 0, 420, 'fresh'], ['stale', 0, 420, 'stale'],
    ['live', 421, 420, 'stale'], ['unavailable', 0, 420, 'error'],
    [false, 0, 420, 'error'], [true, 0, 290, 'fresh'],
  ]) {
    const actual = classify(sourceState, age, max);
    if (actual !== expected) throw new Error(`freshness regression: ${sourceState} => ${actual}, expected ${expected}`);
  }
  console.log('Freshness states: 6 regression cases passed');
  process.exit(0);
}
const evaluate = (name, path, stampKeys, maxAgeMinutes, sourceStateKeys = []) => {
  const payload = read(path);
  if (!payload) return {name, state:'error', path, maxAgeMinutes, reason:'missing-or-invalid-payload'};
  const raw = stampKeys.map((key) => payload[key]).find(Boolean);
  const stamp = raw ? new Date(raw) : null;
  if (!stamp || Number.isNaN(stamp.getTime())) return {name, state:'error', path, maxAgeMinutes, reason:'missing-or-invalid-timestamp'};
  const ageMinutes = Math.max(0, (now.getTime() - stamp.getTime()) / 60000);
  const sourceState = sourceStateKeys.map((key) => payload[key]).find((value) => value !== undefined && value !== null);
  return {name,state:classify(sourceState, ageMinutes, maxAgeMinutes),path,observedAt:stamp.toISOString(),ageMinutes:Math.round(ageMinutes),maxAgeMinutes,sourceState:sourceState ?? null};
};
const resources = {
  weather:evaluate('Weather','apps/portal/data/weather-zagreb.json',['updated_at','checked_at'],420,['state','status']),
  aktual:evaluate('News/AKTUAL','apps/portal/data/news-automation-status.json',['updated_at'],290,['ok','status']),
  digitalAssets:evaluate('Digital Assets','apps/portal/data/fast_market_status.json',['timestamp_utc','updated_at','checked_at'],1080,['status']),
};
const values = Object.values(resources);
const overall = values.some(x=>x.state==='error')?'error':values.some(x=>x.state==='stale')?'stale':'fresh';
const output = {version:'GNK_ASG_FRESHNESS_V2',generatedAt:now.toISOString(),overall,resources,policy:{states:['fresh','stale','error'],staleMustNotReportOk:true}};
writeFileSync('apps/portal/data/freshness-status.json', JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
if (process.argv.includes('--require-fresh') && overall !== 'fresh') process.exitCode = 1;
