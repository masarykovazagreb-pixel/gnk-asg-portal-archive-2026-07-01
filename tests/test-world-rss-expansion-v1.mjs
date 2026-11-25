import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {selectCountryFeeds,diversifyHeadlines} from '../scripts/lib/aktual-world-selection-v1.mjs';
const registry=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const croatia=registry.countries.find(c=>c.slug==='hrvatska');
test('source gap audit counts distinct local-language publisher hosts, not Google categories',()=>{
 const run=spawnSync(process.execPath,['scripts/audit-world-rss-coverage-v1.mjs'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(run.stdout);assert.equal(report.countries,201);assert.equal(report.countryRows.length,201);
 const hr=report.countryRows.find(c=>c.slug==='hrvatska');const uniqueHosts=new Set(croatia.sourcesList.filter(s=>s.language===croatia.language&&s.rss&&new URL(s.rss).hostname!=='news.google.com').map(s=>new URL(s.rss).hostname.replace(/^www\./,'')));
 assert.equal(hr.directPublisherHosts,uniqueHosts.size);assert.equal(hr.gapToTen,Math.max(0,10-uniqueHosts.size));
 assert.match(report.scope,/not verified live/);
});

test('prioritises configured local-language direct feeds and never invents sources',()=>{
 const chosen=selectCountryFeeds(croatia,10);assert.equal(chosen.length,10);
 assert.ok(chosen.slice(0,9).every(s=>new URL(s.rss).hostname!=='news.google.com'&&s.language==='hr'));
 assert.equal(new URL(chosen[9].rss).hostname,'news.google.com');
 const india=registry.countries.find(c=>c.slug==='indija');assert.ok(selectCountryFeeds(india,10).every(s=>s.language===india.language));
 for(const c of registry.countries)assert.ok(selectCountryFeeds(c,10).every(s=>c.sourcesList.includes(s)));
});
test('multiple publishers survive the volume cap and duplicate URLs are removed',()=>{
 const rows=[1,2,3,4].map(n=>({title:'A'+n,source:'A',url:`https://a.example/${n}`,publishedAt:`2026-01-01T0${6-n}:00:00.000Z`}));
 rows.push({title:'B',source:'B',url:'https://b.example/story',publishedAt:'2026-01-01T01:00:00.000Z'}, {title:'duplicate',source:'C',url:'https://b.example/story?copy=1',publishedAt:'2026-01-01T00:30:00.000Z'});
 const chosen=diversifyHeadlines(rows,3);assert.equal(chosen.length,3);assert.ok(chosen.some(x=>x.source==='B'));assert.equal(new Set(chosen.map(x=>x.url.split('?')[0])).size,3);
 assert.ok(chosen[0].publishedAt>=chosen[1].publishedAt);
});
test('full refresh covers all 201 registry countries and limits concurrency per host',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world-bounded-'));
 try{
  const mock=path.join(tmp,'mock.mjs'),stats=path.join(tmp,'stats.json'),out=path.join(tmp,'cache.json');
  fs.writeFileSync(mock,`import fs from 'node:fs';const active={},max={};let id=0;globalThis.fetch=async url=>{const host=new URL(url).hostname;active[host]=(active[host]||0)+1;max[host]=Math.max(max[host]||0,active[host]);const n=++id;await new Promise(r=>setTimeout(r,2));active[host]--;const xml='<rss><channel><item><title>Mock headline '+n+'</title><link>https://example.org/'+n+'</link><pubDate>'+new Date().toUTCString()+'</pubDate></item></channel></rss>';return {ok:true,headers:{get:()=>null},text:async()=>xml};};process.on('exit',()=>fs.writeFileSync(process.env.MOCK_STATS,JSON.stringify({max,id})));`);
  const run=spawnSync(process.execPath,['--import',mock,'scripts/refresh-aktual-world-headlines-v1.mjs'],{env:{...process.env,AKTUAL_WORLD_CACHE_OUT:out,MOCK_STATS:stats,AKTUAL_FETCH_CONCURRENCY:'12'},encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const cache=JSON.parse(fs.readFileSync(out)),metrics=JSON.parse(fs.readFileSync(stats));assert.equal(Object.keys(cache.countries).length,201);assert.equal(Object.keys(cache.scopeUpdatedAt.countries).length,201);assert.ok(Object.values(metrics.max).every(n=>n<=3));assert.ok(metrics.id>=201);
  const briefing=spawnSync(process.execPath,['apps/agents/world201/run-v1.mjs','--cache',out],{encoding:'utf8'});assert.equal(briefing.status,0,briefing.stderr);const report=JSON.parse(briefing.stdout);assert.equal(report.summary.countries,201);assert.equal(report.summary.withCandidates,201);assert.equal(report.automaticFullArticlePublishing,false);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('single-country refresh preserves other timestamps and updates only one page and feed',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'world-target-'));
 try{
  const old=new Date(Date.now()-30*3600000).toISOString(),now=new Date().toISOString();
  const output=path.join(tmp,'cache.json');
  const oldRow={title:'Old retained',url:'https://example.org/old',source:'Old',publishedAt:now};
  fs.writeFileSync(output,JSON.stringify({updatedAt:old,countries:{srbija:[oldRow]},cities:{zagreb:[oldRow]},sourceChecks:[{kind:'country',scope:'srbija',source:'Old',status:'headlines'}]}));
  const mock=path.join(tmp,'mock.mjs');fs.writeFileSync(mock,`globalThis.fetch=async url=>{const host=new URL(url).hostname;const xml='<rss><channel><item><title>Headline '+host+'</title><link>https://example.org/'+host+'</link><pubDate>'+new Date().toUTCString()+'</pubDate></item></channel></rss>';return {ok:true,headers:{get:()=>null},text:async()=>xml};};`);
  const run=spawnSync(process.execPath,['--import',mock,'scripts/refresh-aktual-world-headlines-v1.mjs','--country','hrvatska'],{env:{...process.env,AKTUAL_WORLD_CACHE_OUT:output},encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);const cache=JSON.parse(fs.readFileSync(output));
  assert.equal(cache.feedAttempts,10);assert.equal(cache.countries.hrvatska.length,10);assert.deepEqual(cache.countries.srbija,[oldRow]);
  assert.equal(cache.scopeUpdatedAt.countries.srbija,old);assert.equal(cache.scopeUpdatedAt.cities.zagreb,old);assert.ok(cache.scopeUpdatedAt.countries.hrvatska!==old);
  const out=path.join(tmp,'out');for(const slug of ['hrvatska','srbija']){const dst=path.join(out,'media',slug);fs.mkdirSync(dst,{recursive:true});fs.copyFileSync(`apps/portal/gnk-aktual/media/${slug}/index.html`,path.join(dst,'index.html'));fs.writeFileSync(path.join(dst,'feed.xml'),'SENTINEL');}
  const other=fs.readFileSync(path.join(out,'media/srbija/index.html'),'utf8');
  const build=spawnSync(process.execPath,['scripts/build-aktual-world-v1.mjs','--country','hrvatska'],{env:{...process.env,AKTUAL_WORLD_OUT:out,AKTUAL_WORLD_CACHE:output},encoding:'utf8'});assert.equal(build.status,0,build.stderr);
  assert.equal(fs.readFileSync(path.join(out,'media/srbija/index.html'),'utf8'),other);assert.equal(fs.readFileSync(path.join(out,'media/srbija/feed.xml'),'utf8'),'SENTINEL');
  assert.ok(!fs.existsSync(path.join(out,'media/sitemap.xml')));assert.match(fs.readFileSync(path.join(out,'media/hrvatska/feed.xml'),'utf8'),/Headline/);
  const all=spawnSync(process.execPath,['scripts/build-aktual-world-v1.mjs'],{env:{...process.env,AKTUAL_WORLD_OUT:path.join(tmp,'all'),AKTUAL_WORLD_CACHE:output},encoding:'utf8'});assert.equal(all.status,0,all.stderr);
  assert.doesNotMatch(fs.readFileSync(path.join(tmp,'all/media/srbija/feed.xml'),'utf8'),/Old retained/,'30-hour cache must not be refreshed by another country');
  const before=fs.readFileSync(output,'utf8');
  const bad=spawnSync(process.execPath,['scripts/refresh-aktual-world-headlines-v1.mjs','--country','not-a-country'],{env:{...process.env,AKTUAL_WORLD_CACHE_OUT:output},encoding:'utf8'});assert.notEqual(bad.status,0);assert.equal(fs.readFileSync(output,'utf8'),before);
  const offline=path.join(tmp,'offline.mjs');fs.writeFileSync(offline,`globalThis.fetch=async()=>{throw Error('offline')}`);
  const failed=spawnSync(process.execPath,['--import',offline,'scripts/refresh-aktual-world-headlines-v1.mjs','--country','hrvatska'],{env:{...process.env,AKTUAL_WORLD_CACHE_OUT:output},encoding:'utf8'});assert.notEqual(failed.status,0);assert.equal(fs.readFileSync(output,'utf8'),before,'all failed feeds must preserve the cache');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
