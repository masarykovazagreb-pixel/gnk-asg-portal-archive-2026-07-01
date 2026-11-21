#!/usr/bin/env node
/** World-news candidate gate: offline, read-only, fail closed.
 * Usage: node scripts/editorial-world-news-preflight-v1.mjs [candidate-json-path]
 * No scraping, publication, network access or production mutation.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const manifest=JSON.parse(readFileSync(new URL('../config/editorial/world-news-expansion-v1.json',import.meta.url),'utf8'));
const sourceIds=new Set(manifest.sources.map(s=>s.id));
const errors=[];
if(manifest.sources.some(s=>s.enabled || s.reviewStatus!=='pending_rights_and_feed_validation'))errors.push('Source activation must be separately approved.');
if(manifest.distribution.allowAutomaticPublish!==false)errors.push('Autopublish must remain disabled.');
if(new Set(manifest.sources.map(s=>s.id)).size!==manifest.sources.length)errors.push('Duplicate source IDs.');
for(const s of manifest.sources){
  if(!/^https:\/\//.test(s.homepage))errors.push('Invalid source URL: '+s.id);
}
const p=process.argv[2];
const input=p?JSON.parse(readFileSync(resolve(p),'utf8')):[];
if(!Array.isArray(input)) errors.push('Input must be an array.');
const seen=new Set(),ready=[];
for(const [i,v] of (Array.isArray(input)?input:[]).entries()){
  const id=String(v.canonical_url||'').trim();
  const title=String(v.title||'').trim();
  const normalized=title.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
  const required=['source_url','source_timestamp','fetched_at','language','editorial_status','attribution','rights_status'];
  for(const f of required)if(!v[f])errors.push('Item '+i+': missing '+f);
  if(!id.startsWith('https://'))errors.push('Item '+i+': missing HTTPS canonical URL');
  if(!String(v.source_url||'').startsWith('https://'))errors.push('Item '+i+': missing HTTPS source URL');
  if(!sourceIds.has(v.source_id))errors.push('Item '+i+': source not registered');
  if(!title)errors.push('Item '+i+': title missing');
  for(const t of ['source_timestamp','fetched_at'])if(v[t]&&!Number.isFinite(Date.parse(v[t])))errors.push('Item '+i+': invalid '+t);
  const tags=v.hashtags||[];
  if(!Array.isArray(tags)||tags.length>5||tags.some(t=>!/^#[\p{L}\p{N}_]+$/u.test(t)))errors.push('Item '+i+': invalid hashtags (max 5)');
  const key=createHash('sha256').update(id+'|'+normalized+'|'+String(v.content_hash||'')).digest('hex');
  if(seen.has(key)){errors.push('Item '+i+': duplicate');continue;} seen.add(key);
  if(v.editorial_status==='approved'&&v.rights_status==='cleared'&&v.fact_check_status==='passed'&&v.translation_status!=='unverified'){
    ready.push({canonical_url:id,title,source_id:v.source_id,language:v.language});
  }
}
console.log(JSON.stringify({manifestSources:manifest.sources.length,inputItems:input.length,eligibleForHumanReleaseReview:ready.length,valid:errors.length===0,errors},null,2));
if(errors.length)process.exitCode=1;
