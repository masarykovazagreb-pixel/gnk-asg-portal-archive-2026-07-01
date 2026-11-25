#!/usr/bin/env node
/**
 * Release-gate separation: verify the LAST PUBLISHED weekly issue, never
 * demand a new editorial issue just because the hourly news feed advanced.
 *
 * Strict next-issue generation remains controlled by build-aktual-media-weekly-v1.mjs.
 * This read-only check never creates, backdates or approves new editorial content.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

function load(path) {return JSON.parse(fs.readFileSync(path,'utf8'));}
const current=load('apps/portal/data/aktual-weekly.json');
const curated=load('apps/portal/data/aktual-weekly-curation.json');
const news=load('apps/portal/data/news.json');
const selected=(current.sections||[]).flatMap(x=>x.items||[]);
assert.match(String(current.issue_week||''),/^\d{4}-\d{2}-\d{2}$/);
assert.equal(current.issue_week,curated.issue_week,'Last published issue must match its curation');
assert.ok(Array.isArray(curated.items)&&curated.items.length>=8,'Published issue requires at least 8 selected sourced items');
const digest=createHash('sha256').update(JSON.stringify(curated)).digest('hex');
assert.equal(current.curation_digest,digest,'Published weekly digest differs from curated source');
assert.equal(selected.length,curated.items.length,'Published weekly selections differ from curated items');
const publishedUrls=new Set();
for(const item of selected){
  assert.ok(item&&typeof item.title==='string'&&item.title.length>4,'Published item missing title');
  assert.ok(item.source&&item.summary,'Published item missing source or original summary');
  const u=new URL(item.url);
  assert.equal(u.protocol,'https:','Only HTTPS linked source is allowed');
  assert.ok(!publishedUrls.has(u.href),'Duplicate published weekly source URL');
  publishedUrls.add(u.href);
}
for(const item of curated.items){
  assert.ok(publishedUrls.has(new URL(item.url).href),'Curated source not in materialized weekly issue');
  assert.ok(item.imagePolicy&&item.imageRights,'Curated image provenance missing');
}
assert.equal((current.counts||{}).selected_items,selected.length,'Incorrect published issue count');
const maxFeedDate=(Array.isArray(news)?news:news.items||[]).map(x=>Date.parse(x.published_at||x.publishedAt||'')).filter(Number.isFinite).sort((a,b)=>b-a)[0]||0;
const newestWeek=new Date(maxFeedDate);
const utcDay=newestWeek.getUTCDay()||7;
newestWeek.setUTCDate(newestWeek.getUTCDate()-utcDay+1);
const newsWeek=newestWeek.toISOString().slice(0,10);
console.log(JSON.stringify({ok:true,mode:'published-weekly-archive-integrity',materializedWeek:current.issue_week,newestNewsWeek:newsWeek,weeklyIssueIsCurrent:current.issue_week===newsWeek,items:selected.length,reminder:current.issue_week!==newsWeek?'Next weekly issue still awaits separate source-verified editorial curation.':'The materialized issue is current.'}));
