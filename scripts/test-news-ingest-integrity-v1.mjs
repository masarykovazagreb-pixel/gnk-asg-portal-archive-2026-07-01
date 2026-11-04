import assert from 'node:assert/strict';
import fs from 'node:fs';

const writer=fs.readFileSync('scripts/gnk-news-refresh.mjs','utf8');
const records=JSON.parse(fs.readFileSync('apps/portal/data/news.json','utf8'));
assert.ok(Array.isArray(records)&&records.length>=50,'public news feed must contain useful articles');
const sources=new Set(records.map(item=>item.source).filter(Boolean));
assert.ok(sources.size>=6,'public news feed cannot be dominated by a single publisher');
assert.ok(records.every(item=>item.title&&/^https:\/\//.test(item.url||'')),'each public news item needs title and original HTTPS article URL');

for(const marker of [
  'feeds_http_ok: feedsHttpOk',
  'feeds_usable: feedsWithItems',
  'feeds_empty: feedsEmpty',
  'feeds_failed: feedsFailed',
  'status: usableCurrentCycle && enoughPublic',
  "'archive_fallback'",
  'public_items_written: publicItemsFinal.length',
  'current_cycle_distinct_sources: freshSources',
  'editor_approved: null',
  'editorial_review_state:',
  'independentlyFactChecked: false',
]){
  assert.ok(writer.includes(marker),'news writer missing truth-in-status marker: '+marker);
}
assert.ok(!writer.includes("editor_approved: 'Nermin Sefić'"),'automated RSS items cannot claim individual human approval');
const historicApproval=records.filter(item=>typeof item.editor_approved==='string').length;
console.log(JSON.stringify({
  ok:true,version:'GNK_NEWS_INGEST_INTEGRITY_V1',
  publishedItems:records.length,publicSources:sources.size,
  legacyEditorApprovalLabels:historicApproval,
  legacyNote:'Existing deployed JSON may retain historical approval labels until next canonical feed regeneration; never treat them as audit proof.',
  sourceQuality:'usable/empty/failure differentiated; archive fallback not fresh',
},null,2));
