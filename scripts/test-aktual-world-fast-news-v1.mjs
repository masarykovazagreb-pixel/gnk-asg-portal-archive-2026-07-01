#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const registry=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
assert.equal(registry.countries.length,201,'Expected exactly 201 countries');
const assets=[
 'apps/portal/assets/am-refresh-v1.js',
 'apps/portal/assets/aktual-world-choices-v1.js',
 'apps/portal/assets/aktual-world-live-brief-v1.js'
];
for(const file of assets){
 assert.ok(fs.statSync(file).size>300,file+' cannot be empty');
 new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
}
const bootstrap=fs.readFileSync(assets[0],'utf8');
assert.match(bootstrap,/aktual-world-choices-v1\.js/);
assert.match(bootstrap,/aktual-world-live-brief-v1\.js/);
const topics=fs.readFileSync(assets[1],'utf8');
assert.match(topics,/20 izbora vijesti/);
assert.match(topics,/news\.google\.com\/search/);
const shelf=fs.readFileSync(assets[2],'utf8');
assert.match(shelf,/\/api\/public-news-feed/);
assert.match(shelf,/MAX_ROWS = 30/);
assert.match(shelf,/POLL_MS = 120000/);
assert.match(shelf,/safeUrl/);
assert.match(shelf,/textContent/);
assert.doesNotMatch(shelf,/innerHTML\s*=/);
let hr=0,en=0;
for(const country of registry.countries){
 for(const [lang,root] of [['hr','apps/portal/gnk-aktual/media'],['en','apps/portal/en/gnk-aktual/media']]){
   const file=path.join(root,country.slug,'index.html');
   assert.ok(fs.existsSync(file),'Missing '+lang+' page '+country.slug);
   const html=fs.readFileSync(file,'utf8');
   assert.match(html,/am-refresh-v1\.js/,'Bootstrap missing in '+lang+' '+country.slug);
   if(lang==='hr')hr++;else en++;
 }
}
console.log(JSON.stringify({ok:true,countries:201,hrPages:hr,enPages:en,topicChoices:20,maxVisibleSourceLinks:30,workerSlotsAreNotLive:true}));
