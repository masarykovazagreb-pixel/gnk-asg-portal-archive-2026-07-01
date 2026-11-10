#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {enrichSitewideMeta} from './lib/sitewide-meta-enrichment-v1.mjs';
import {brandHashtagTarget,topicTagsForRoute} from './lib/seo-topic-taxonomy-v1.mjs';

const old='<!doctype html><html><head><title>Izvorni naslov</title><meta name="description" content="Opis koji je specifičan za stranicu."><link rel="canonical" href="https://gnk-asg.hr/gnk-aktual/media/"></head><body><h1>Izvorni naslov</h1></body></html>';
const revised=enrichSitewideMeta(old,{route:'/gnk-aktual/media/'});
assert.notEqual(revised,old);
assert(revised.includes('property="og:title" content="Izvorni naslov"'));
assert(revised.includes('property="og:site_name" content="AKTUAL MEDIA"'));
assert(revised.includes('property="og:url" content="https://gnk-asg.hr/gnk-aktual/media/"'));
assert(revised.includes('name="twitter:description" content="Opis koji je specifičan za stranicu."'));
assert(revised.includes('name="twitter:card" content="summary"'));
assert.equal(enrichSitewideMeta(revised,{route:'/gnk-aktual/media/'}),revised,'must be idempotent');
assert.equal((revised.match(/rel="canonical"/g)||[]).length,1);
assert.equal((revised.match(/name="description"/g)||[]).length,1);
assert.equal((revised.match(/<title>/g)||[]).length,1);
assert(!revised.includes('name="keywords"'));
assert(!revised.includes('rel="author"'));
assert(!revised.includes('#NerminSefić'));
for(const test of [
  old.replace('</head>','<meta name="robots" content="noindex,follow"></head>'),
  old.replace('https://gnk-asg.hr/gnk-aktual/media/','https://another-domain.example/'),
  old.replace('<title>Izvorni naslov</title>',''),
  old.replace('</head>','<meta http-equiv="refresh" content="0; url=/other/"></head>'),
])assert.equal(enrichSitewideMeta(test,{route:'/gnk-aktual/media/'}),test,'must skip unsafe/irrelevant pages');
assert.equal(brandHashtagTarget('#AKTUALMEDIA'),'/gnk-aktual/');
assert.equal(brandHashtagTarget('#GNKASG'),'/');
assert.equal(brandHashtagTarget('#NerminSefić'),'/nermin-sefic/');
assert.deepEqual(topicTagsForRoute('/gnk-aktual/media/hrvatska/').map(x=>x.label),['#AktualMediaWorld']);
assert.deepEqual(topicTagsForRoute('/en/future-technology/').map(x=>x.href),['/en/future-technology/']);
assert.deepEqual(topicTagsForRoute('/gnk-aktual/weekly/').map(x=>x.label),['#AktualMediaTjedni']);
assert.deepEqual(topicTagsForRoute('/'),[]);
assert.deepEqual(topicTagsForRoute('/admin/'),[]);
const core=fs.readFileSync('apps/shared/brand/favicon.svg','utf8');
assert(core.includes('ASG')&&core.includes('asg-gold')&&core.includes('#d4af37'));
for(const p of [
 'apps/portal/favicon.svg','apps/portal/assets/favicon.svg',
 'apps/portal/app/assets/favicon.svg','apps/portal/agenti/assets/favicon.svg',
 'apps/legacy-portal/favicon.svg','apps/legacy-portal/assets/favicon.svg',
 'apps/kanal/site/assets/favicon.svg',
]){
 assert.equal(fs.readFileSync(p,'utf8'),core,'inconsistent golden ASG favicon: '+p);
}
const portal='apps/portal/kanal';
for(const d of fs.readdirSync(portal,{withFileTypes:true}).filter(x=>x.isDirectory())){
 const p=path.join(portal,d.name,'assets/favicon.svg');
 if(fs.existsSync(p))assert.equal(fs.readFileSync(p,'utf8'),core,'inconsistent city favicon: '+p);
}
for(const size of [192,512]){
 const svg=fs.readFileSync('apps/portal/assets/app-icon-'+size+'.svg','utf8');
 assert(svg.includes('ASG')&&svg.includes('asg-gold'));
 assert.equal(svg,fs.readFileSync('apps/legacy-portal/assets/app-icon-'+size+'.svg','utf8'));
}
assert(fs.readFileSync('apps/portal/app/index.html','utf8').includes('href="/assets/favicon.svg"'));
console.log(JSON.stringify({ok:true,mode:'read-only',favicon:'golden ASG',semanticTopicLinks:true,metaIdempotent:true,noFalseAuthorship:true},null,2));
