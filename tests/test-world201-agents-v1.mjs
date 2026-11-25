import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {sourceBot,deskBot,countryAgent,masterAgent} from '../apps/agents/world201/coordinator-v1.mjs';
const registry=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const now=Date.parse('2026-01-10T12:00:00Z');
const record=(extra={})=>({title:'A linked headline',source:'Publisher',url:'https://publisher.org/news',publishedAt:'2026-01-10T11:00:00Z',...extra});
test('source bot discards unsafe URLs, future and stale material, and never copies body',()=>{
 const records=[record({body:'do not copy'}),record({url:'javascript:alert(1)'}),record({publishedAt:'2099-01-01'}),record({publishedAt:'2000-01-01'}),record({source:''})];
 const clean=sourceBot(records,now);assert.equal(clean.length,1);assert.deepEqual(Object.keys(clean[0]).sort(),['publishedAt','source','title','url']);assert.ok(!JSON.stringify(clean).includes('do not copy'));
});
test('desk bot and country agent select fresh diverse linked leads without approval',()=>{
 const rows=[record(),record({title:'Other',source:'Other source',url:'https://other.org/one',publishedAt:'2026-01-10T10:00:00Z'}),record({title:'Duplicate',url:'https://publisher.org/news?utm=x'})];
 const result=countryAgent(registry.countries[0],rows,{now,limit:2});assert.equal(result.selected.length,2);assert.equal(result.deskBot.distinctSourceLabels,2);assert.equal(result.publication,'not-approved');
 assert.throws(()=>deskBot(rows,0));assert.throws(()=>countryAgent({slug:'../unsafe'},rows,{now}));
});
test('master enumerates 201 configured editions without inventing candidates or permissions',()=>{
 const first=registry.countries[0],second=registry.countries[1];
 const cache={updatedAt:'2026-01-10T11:50:00Z',scopeUpdatedAt:{countries:{[first.slug]:'2026-01-09T10:00:00Z',[second.slug]:'2026-01-10T11:50:00Z'}},countries:{[first.slug]:[record()],[second.slug]:[record()]}};
 const report=masterAgent(registry,cache,{now});assert.equal(report.summary.countries,201);assert.equal(report.summary.withCandidates,1);assert.equal(report.summary.withoutCandidates,200);
 assert.equal(report.countries[0].cacheStatus,'missing-or-stale');assert.equal(report.countries[1].briefs[0].status,'lead-only');assert.deepEqual(report.countries[1].briefs[0].checksRequired,['facts','rights','language','editorial review']);
 assert.equal(report.automaticFullArticlePublishing,false);assert.equal(report.sourceHeadlinesAreVerifiedFacts,false);assert.equal(report.rolesPerCountry.length,3);assert.match(report.rolesAre,/not 603 independent/);
 const one=masterAgent(registry,cache,{now,slug:second.slug});assert.equal(one.summary.countries,1);assert.equal(one.countries[0].slug,second.slug);
 assert.throws(()=>masterAgent(registry,cache,{now,slug:'fake'}));assert.throws(()=>masterAgent({countries:[]},cache,{now}));
});
test('CLI handles missing cache transparently without network or writing public files',()=>{
 const run=spawnSync(process.execPath,['apps/agents/world201/run-v1.mjs','--cache','/nonexistent/none.json'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);const report=JSON.parse(run.stdout);assert.equal(report.summary.countries,201);assert.equal(report.summary.withCandidates,0);assert.ok(report.countries.every(x=>x.cacheStatus==='missing'));
});
