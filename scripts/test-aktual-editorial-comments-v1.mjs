#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const news=JSON.parse(fs.readFileSync('apps/portal/data/news.json','utf8'));
const overlay=JSON.parse(fs.readFileSync('apps/portal/data/aktual-editorial-comments.json','utf8'));
assert.equal(overlay.schema,'gnk-asg/aktual-editorial-comments/v1');
assert.ok(Array.isArray(overlay.items)&&overlay.items.length>0&&overlay.items.length<=20);
const newsById=new Map(news.map(item=>[String(item.id),item]));
const seen=new Set();
for(const note of overlay.items){
  assert.ok(note.news_id&&!seen.has(note.news_id),'duplicate commentary news_id: '+note.news_id);
  seen.add(note.news_id);
  const item=newsById.get(String(note.news_id));
  assert.ok(item,'commentary target missing from current news feed: '+note.news_id);
  assert.equal(item.verified,true,'commentary target must be verified: '+note.news_id);
  assert.equal(note.source_url,item.url,'source_url must exactly match news item: '+note.news_id);
  assert.equal(note.source_name,item.source,'source_name must exactly match news item: '+note.news_id);
  assert.equal(note.source_published_at,item.published_at,'source_published_at must exactly match news item: '+note.news_id);
  assert.ok(typeof note.commentary_hr==='string'&&note.commentary_hr.length>=80&&note.commentary_hr.length<=420,'Croatian commentary length out of range: '+note.news_id);
  assert.ok(!/[<>]/u.test(note.commentary_hr),'commentary must be plain text: '+note.news_id);
  const verified=Date.parse(note.verified_at),expires=Date.parse(note.expires_at);
  assert.ok(Number.isFinite(verified)&&Number.isFinite(expires)&&expires>verified,'invalid commentary verification/expiry: '+note.news_id);
  assert.ok(expires-verified<=7*24*60*60*1000,'commentary expiry must be within seven days: '+note.news_id);
}
console.log(JSON.stringify({ok:true,comments:overlay.items.length,targets:[...seen]},null,2));
