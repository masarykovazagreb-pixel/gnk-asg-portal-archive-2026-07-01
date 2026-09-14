#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const now = new Date(process.env.FRESHNESS_NOW || Date.now());
const read = (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };
const evaluate = (name, path, stampKeys, maxAgeMinutes, sourceStateKeys = [], cadenceMinutes = null) => {
  const payload = read(path);
  if (!payload) return {name, state:'error', path, maxAgeMinutes, cadenceMinutes, reason:'missing-or-invalid-payload', escalateSelfHeal:true};
  const raw = stampKeys.map((key) => payload[key]).find(Boolean);
  const stamp = raw ? new Date(raw) : null;
  if (!stamp || Number.isNaN(stamp.getTime())) return {name, state:'error', path, maxAgeMinutes, cadenceMinutes, reason:'missing-or-invalid-timestamp', escalateSelfHeal:true};
  const ageMinutes = Math.max(0, (now.getTime() - stamp.getTime()) / 60000);
  const sourceState = sourceStateKeys.map((key) => payload[key]).find((value) => value !== undefined && value !== null);
  const sourceError = sourceState === false || ['error','failed','unavailable','degraded'].includes(String(sourceState).toLowerCase());
  const missedCycles = cadenceMinutes ? Math.floor(ageMinutes / cadenceMinutes) : null;
  const escalateSelfHeal = sourceError || (cadenceMinutes ? missedCycles >= 2 || ageMinutes > cadenceMinutes * 2 : ageMinutes > maxAgeMinutes * 2);
  return {
    name,
    state:sourceError?'error':ageMinutes>maxAgeMinutes?'stale':'fresh',
    path,
    observedAt:stamp.toISOString(),
    ageMinutes:Math.round(ageMinutes),
    maxAgeMinutes,
    cadenceMinutes,
    missedCycles,
    escalateSelfHeal,
    sourceState:sourceState ?? null
  };
};
const resources = {
  weather:evaluate('Weather','apps/portal/data/weather-zagreb.json',['updated_at','checked_at'],360,['state','status'],360),
  aktual:evaluate('News/AKTUAL','apps/portal/data/news-automation-status.json',['updated_at'],290,['ok','status'],240),
  digitalAssets:evaluate('Digital Assets','apps/portal/data/fast_market_status.json',['timestamp_utc','updated_at','checked_at'],1080,['status']),
  worldMonitor:evaluate('World Monitor','apps/portal/data/world-monitor.json',['updated_at'],390,[],360),
};
const values = Object.values(resources);
const overall = values.some(x=>x.state==='error')?'error':values.some(x=>x.state==='stale')?'stale':'fresh';
const selfHealRequired = values.some(x=>x.escalateSelfHeal === true);
const output = {
  version:'GNK_ASG_FRESHNESS_V2_1',
  generatedAt:now.toISOString(),
  overall,
  selfHealRequired,
  resources,
  policy:{
    states:['fresh','stale','error'],
    staleMustNotReportOk:true,
    twoMissedCyclesEscalate:true,
    noTimestampBumpWithoutProducerOutput:true
  }
};
writeFileSync('apps/portal/data/freshness-status.json', JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
if (process.argv.includes('--require-fresh') && overall !== 'fresh') process.exitCode = 1;
