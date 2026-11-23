#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const text=p=>readFileSync(p,'utf8');
const sources=JSON.parse(text('apps/portal/data/hr-news-sources-v1.json'));
assert.ok(sources.sources.length>=13,'Missing Croatian news publishers');
assert.equal(sources.minDesiredExternalLinks,100);
assert.equal(sources.goalExternalLinks,200);
assert.equal(sources.goalOriginalApprovedReportsPerDay,30);
const hrt=sources.sources.find(x=>x.name==='HRT Vijesti');
assert.equal(hrt?.feed,'https://feed.hrt.hr/vijesti/page.xml','Use the HRT RSS address from the publisher official RSS directory');
assert.equal(hrt?.rights,'external_title_link_only');
assert.equal(hrt?.images,'do_not_download_or_republish');
const generator=text('scripts/hr-news-refresh-v1.mjs');
assert.match(generator,/PITCHES=30/);
assert.match(generator,/minimumDesiredExternalLinks:100/);
assert.match(generator,/externalLinkTargetMet:rows.length>=100/);
assert.match(generator,/sourceRights:'link_only_no_body_or_photograph'/);
const html=text('apps/portal/news/index.html');
assert.match(html,/href="\/news\/izvori\/hrt\/"/);
assert.match(html,/id="topic-filter"/);
assert.match(html,/id="source-filter"/);
assert.match(html,/izvornih uredničkih tekstova/);
const client=text('apps/portal/assets/hr-news-live-v1.js');
assert.match(client,/slice\(0,30\)/);
assert.match(client,/MIN_DESIRED=100/);
assert.match(client,/sourceFilter/);
assert.match(client,/topicFilter/);
assert.match(client,/hr-news-source-original-v1\.svg/);
assert.doesNotMatch(client,/\.innerHTML\s*=/);
const hrtPage=text('apps/portal/news/izvori/hrt/index.html');
assert.match(hrtPage,/<html lang="hr"/);
assert.match(hrtPage,/Ovo nije službena stranica/);
assert.match(hrtPage,/https:\/\/vijesti\.hrt\.hr/);
assert.match(hrtPage,/hr-news-hrt-v1\.js/);
const hrtClient=text('apps/portal/assets/hr-news-hrt-v1.js');
assert.match(hrtClient,/publisherDomain!=='hrt\.hr'/);
assert.match(hrtClient,/isHrtHost/);
assert.doesNotMatch(hrtClient,/\.innerHTML\s*=/);
for(const file of ['apps/portal/assets/hr-news-live-v1.js','apps/portal/assets/hr-news-hrt-v1.js','scripts/hr-news-refresh-v1.mjs']){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(result.status,0,file+' syntax: '+result.stderr);
}
const art=text('apps/portal/assets/editorial/hr-news/hr-news-source-original-v1.svg');
assert.match(art,/<svg/);
assert.match(art,/Originalna ilustracija/);
assert.ok(!/<image\b|<script\b|https?:\/\//.test(art.replace('http://www.w3.org/2000/svg','')),'No external image content embedded in original art');
for(const map of ['apps/portal/news/sitemap.xml','apps/portal/sitemap.xml']){
  assert.ok(text(map).includes('https://gnk-asg.hr/news/izvori/hrt/'),map+' needs HRT source desk');
}
const cache=JSON.parse(text('apps/portal/data/hr-news-feed-v1.json'));
const actual=Array.isArray(cache.items)?cache.items.length:0;
assert.ok(actual>0&&actual<=200,'Cached external source count must reflect real collected entries, never fabricated');
console.log(JSON.stringify({ok:true,sourcePublishers:sources.sources.length,cachedActualExternalLinks:actual,goalExternalLinks:100,goalOriginalApprovedArticles:30,hrtSeparate:true,originalArtwork:true,doesNotPretendLive:actual<100}));
