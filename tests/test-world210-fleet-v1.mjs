import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {runFleet} from '../apps/agents/world201/fleet-v1.mjs';
const registry=JSON.parse(fs.readFileSync('apps/portal/data/world-countries-v1.json','utf8'));
const now=Date.parse('2026-01-10T12:00:00Z'), slug=registry.countries[0].slug;
const cache={scopeUpdatedAt:{countries:{[slug]:'2026-01-10T11:50:00Z'}},countries:{[slug]:[
 {title:'Headline from source',source:'Publisher',url:'https://news.example.org/a',publishedAt:'2026-01-10T11:00:00Z',body:'NEVER COPY THIS'},
 {title:'Unsafe',source:'Publisher',url:'http://example.org/',publishedAt:'2026-01-10T11:00:00Z'}]}};
test('210 logical roles execute, prepare attributed leads and never approve or invent articles',()=>{
 const result=runFleet(registry,cache,{now});
 assert.equal(result.configuredAgents,210);assert.equal(result.executedAgents,210);assert.equal(result.countryAgents.length,201);assert.equal(result.networkAgents.length,9);
 assert.equal(new Set(result.networkAgents.map(a=>a.id)).size,9);assert.ok(result.networkAgents.every(a=>a.execution==='completed'));
 assert.equal(result.drafts.length,1);assert.equal(result.drafts[0].headline,'Headline from source');assert.equal(result.drafts[0].status,'review-required');
 assert.ok(!JSON.stringify(result).includes('NEVER COPY THIS'));assert.equal(result.automaticArticlePublishing,false);
 assert.equal(result.networkAgents.find(a=>a.id==='publication').status,'blocked');
 assert.equal(result.networkAgents.find(a=>a.id==='freshness').details.fresh,1);
});
test('single-country and absent or stale caches do not pretend full fleet executed or create leads',()=>{
 const one=runFleet(registry,cache,{now,slug});assert.equal(one.executedAgents,10);assert.equal(one.drafts.length,1);
 const missing=runFleet(registry,null,{now});assert.equal(missing.executedAgents,210);assert.equal(missing.drafts.length,0);assert.equal(missing.networkAgents.find(a=>a.id==='lead-writer').status,'empty');
 const stale=runFleet(registry,cache,{now:now+48*3600000});assert.equal(stale.drafts.length,0);
 assert.throws(()=>runFleet(registry,cache,{now,slug:'unknown'}));
});
test('CLI emits JSON only and rejects unknown options',()=>{
 const run=spawnSync(process.execPath,['apps/agents/world201/fleet-run-v1.mjs','--cache','/nonexistent/no.json'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout).executedAgents,210);
 const bad=spawnSync(process.execPath,['apps/agents/world201/fleet-run-v1.mjs','--publish'],{encoding:'utf8'});assert.notEqual(bad.status,0);
});
