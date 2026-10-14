#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const registry=JSON.parse(read('apps/portal/data/editorial-registry.json'));
const columns=JSON.parse(read('apps/portal/data/kolumne.json'));
const weekly=JSON.parse(read('apps/portal/data/aktual-weekly.json'));
const commentsHtml=read('apps/portal/komentari/index.html');
const publicationsHtml=read('apps/portal/objave/index.html');
const columnsHtml=read('apps/portal/gnk-aktual/kolumne/index.html');
const weeklyHtml=read('apps/portal/gnk-aktual/tjedni/index.html');

const hr=(registry.items||[]).filter(x=>x.language==='hr');
const comments=hr.filter(x=>x.type==='komentar');
const publications=hr.filter(x=>x.type==='objava');

for(const item of comments) assert.ok(commentsHtml.includes('href="'+item.path+'"'), 'comment missing from archive: '+item.path);
for(const item of publications) assert.ok(publicationsHtml.includes('href="'+item.path+'"'), 'publication missing from archive: '+item.path);

const columnItems=Array.isArray(columns)?columns:(columns.items||[]);
assert.ok(columnItems.length>0,'columns registry must not be empty');
for(const item of columnItems.filter(x=>x&&x.url&&x.naslov)){
  assert.ok(columnsHtml.includes('href="'+item.url+'"'),'column missing from HTML-first archive: '+item.url);
}
assert.ok(!/<section id="columns"[^>]*>\s*<p class="empty">Učitavanje kolumni…<\/p>\s*<\/section>/.test(columnsHtml),'columns must not be loader-only');

const weeklyItems=(weekly.sections||[]).flatMap(s=>s.items||[]);
assert.ok(weeklyItems.length>=8,'weekly issue needs at least eight static stories');
for(const item of weeklyItems) assert.ok(weeklyHtml.includes('href="'+item.url+'"'),'weekly story missing from static HTML: '+item.url);
assert.ok(weekly.cover?.url&&weeklyHtml.includes('href="'+weekly.cover.url+'"'),'weekly cover missing from static HTML');

const imageCounts=new Map();
for(const item of hr){
  if(!item.image)continue;
  imageCounts.set(item.image,(imageCounts.get(item.image)||0)+1);
}
const repeated=[...imageCounts.entries()].sort((a,b)=>b[1]-a[1]);
const maxRegistryReuse=repeated[0]?.[1]||0;
assert.ok(maxRegistryReuse<=30,'editorial image reuse regressed above baseline: '+maxRegistryReuse);

const weeklyImageCounts=new Map();
for(const item of [weekly.cover,...weeklyItems].filter(Boolean)){
  if(!item.image)continue;
  weeklyImageCounts.set(item.image,(weeklyImageCounts.get(item.image)||0)+1);
}
const maxWeeklyReuse=Math.max(0,...weeklyImageCounts.values());
assert.ok(maxWeeklyReuse<=4,'weekly image reuse exceeds current diversity ceiling: '+maxWeeklyReuse);

console.log(JSON.stringify({
  ok:true,
  registry:{hr:hr.length,comments:comments.length,publications:publications.length},
  htmlFirst:{columns:columnItems.length,weeklyStories:weeklyItems.length},
  imageDiversity:{maxRegistryReuse,maxWeeklyReuse,topRegistryImages:repeated.slice(0,10)}
},null,2));
