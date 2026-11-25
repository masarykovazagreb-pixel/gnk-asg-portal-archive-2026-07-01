#!/usr/bin/env node
/* AKTUAL WORLD 201 — original reporting assignment queue.
 * Prepares at most 30 source-linked pitches per country/day from an existing
 * successful feed refresh. Produces NO articles and never publishes by itself.
 * Deterministic, idempotent and fail-closed on missing/stale input.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
const root='apps/portal/data/';
const output=process.env.AKTUAL_EDITORIAL_QUEUE_OUT || root+'aktual-world-editorial-queue-v1.json';
const maxPerCountry=30;
const now=new Date();
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const registry=JSON.parse(fs.readFileSync(root+'world-countries-v1.json','utf8'));
const cachePath=process.env.AKTUAL_WORLD_CACHE || root+'aktual-world-headlines-v1.json';
if(!fs.existsSync(cachePath)){console.error('No headline cache: no assignments created.');process.exit(1);}
const cache=JSON.parse(fs.readFileSync(cachePath,'utf8'));
const cacheAge=Date.now()-Date.parse(cache.updatedAt);
if(!Number.isFinite(cacheAge)||cacheAge<0||cacheAge>24*3600*1000){console.error('Headline cache stale; no new assignments.');process.exit(1);}
const outputRows=[];
let total=0;
for(const country of registry.countries){
 const seen=new Set();
 const items=[];
 for(const item of (cache.countries?.[country.slug]||[])){
  if(items.length>=maxPerCountry)break;
  const published=Date.parse(item.publishedAt);
  if(!Number.isFinite(published)||Date.now()-published>72*3600*1000||published>Date.now()+3600000)continue;
  let url;
  try{url=new URL(item.url);if(url.protocol!=='https:'||url.username||url.password)continue;}catch{continue;}
  const title=String(item.title||'').trim(),source=String(item.source||'').trim();
  if(!title||!source)continue;
  const dedupeKey=url.origin+url.pathname;
  if(seen.has(dedupeKey))continue;seen.add(dedupeKey);
  items.push({
   id:crypto.createHash('sha256').update(country.slug+'|'+dedupeKey).digest('hex').slice(0,20),
   sourceTitle:title,sourceUrl:url.href,sourceName:source,sourcePublishedAt:new Date(published).toISOString(),
   editorialState:'needs_independent_verification_and_original_reporting',
   approval:false,publish:false,originalArticleUrl:null,sourceRights:'external_link_only'
  });
 }
 total+=items.length;
 outputRows.push({edition:country.slug,country:country.nameEn,desiredOriginalArticlesPerDay:30,sourceLinkedPitches:items.length,pitches:items});
}
const queue={version:1,planningDate:date,sourceCacheAt:cache.updatedAt,updatedAt:now.toISOString(),
 declaredGoal:'30 original, independently verified articles per country per day — target, not completed publication',
 status:'editorial_review_required',totalPitches:total,editions:outputRows.length,
 publishedOriginalArticles:0,rows:outputRows};
fs.writeFileSync(output,JSON.stringify(queue,null,2)+'\n');
console.log(JSON.stringify({editions:outputRows.length,pitches:total,complete30:outputRows.filter(x=>x.sourceLinkedPitches===30).length,published:0}));
