#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const now = new Date(process.env.FRESHNESS_NOW || Date.now());
const read = (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };
const evaluate = (name, path, stampKeys, maxAgeMinutes, sourceStateKeys = []) => {
  const payload = read(path);
  if (!payload) return {name, state:'error', path, maxAgeMinutes, reason:'missing-or-invalid-payload'};
  const raw = stampKeys.map((key) => payload[key]).find(Boolean);
  const stamp = raw ? new Date(raw) : null;
  if (!stamp || Number.isNaN(stamp.getTime())) return {name, state:'error', path, maxAgeMinutes, reason:'missing-or-invalid-timestamp'};
  const ageMinutes = Math.max(0, (now.getTime() - stamp.getTime()) / 60000);
  const sourceState = sourceStateKeys.map((key) => payload[key]).find(Boolean);
  const sourceError = sourceState === false || ['error','failed','unavailable'].includes(String(sourceState).toLowerCase());
  return {name,state:sourceError?'error':ageMinutes>maxAgeMinutes?'stale':'fresh',path,observedAt:stamp.toISOString(),ageMinutes:Math.round(ageMinutes),maxAgeMinutes,sourceState:sourceState ?? null};
};
const resources = {
  weather:evaluate('Weather','apps/portal/data/weather-zagreb.json',['updated_at','checked_at'],180,['state']),
  aktual:evaluate('News/AKTUAL','apps/portal/data/news-automation-status.json',['updated_at'],290,['ok','status']),
  digitalAssets:evaluate('Digital Assets','apps/portal/data/update_status.json',['updated_at'],1080,['status']),
};
const values = Object.values(resources);
const overall = values.some(x=>x.state==='error')?'error':values.some(x=>x.state==='stale')?'stale':'fresh';
const output = {version:'GNK_ASG_FRESHNESS_V2',generatedAt:now.toISOString(),overall,resources,policy:{states:['fresh','stale','error'],staleMustNotReportOk:true}};
writeFileSync('apps/portal/data/freshness-status.json', JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
if (process.argv.includes('--require-fresh') && overall !== 'fresh') process.exitCode = 1;
