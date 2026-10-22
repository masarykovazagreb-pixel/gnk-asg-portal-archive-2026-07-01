#!/usr/bin/env node
// Contract test of free-only national and regional agent execution.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const target=path.join(root,'scripts/aktual-free-editorial-network-v1.mjs');
const out=path.join(root,'artifacts/aktual-editorial-network');
assert.ok(fs.existsSync(target),'missing free-only agent executable');
const source=fs.readFileSync(target,'utf8');
assert.doesNotMatch(source,/api\.openai\.com|api\.exa\.ai|wrangler\s+deploy|git\s+push|POST\s+https?:|execFileSync/,'runner must not use paid models or release/mutate');
const result=spawnSync(process.execPath,[target],{cwd:root,encoding:'utf8',timeout:90000,env:{...process.env,AKTUAL_FREE_FEEDS:'0'}});
assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
const report=JSON.parse(fs.readFileSync(path.join(out,'report.json'),'utf8'));
assert.equal(report.deskAgents,23);
assert.equal(report.regionalAgents,8);
assert.equal(report.nationalAgents,15);
assert.ok(report.executableMicroChecks>=150,'at least 150 actually executed microchecks required');
assert.equal(report.executableMicroChecks,report.findings.length);
assert.equal(report.stats.passed+report.stats.warnings+report.stats.failed,report.executableMicroChecks);
assert.equal(report.stats.failed,0,'real source/route failures must block');
assert.equal(report.paidApiCalls,0);
assert.equal(report.freeOnly,true);
assert.equal(report.freeNationalFeedFetchEnabled,false);
assert.equal(report.operatingMode,'free-only-inspect-and-prepare-no-publication');
assert.ok(report.desks.every(d=>d.kind==='regional'||d.kind==='national'));
const registry=JSON.parse(fs.readFileSync(path.join(root,'apps/region/channels.json'),'utf8'));
for(const city of registry.channels){
 const p=JSON.parse(fs.readFileSync(path.join(out,'drafts',city.id+'.json'),'utf8'));
 assert.equal(p.agent,'REG-'+city.id.toUpperCase());
 assert.equal(p.language,city.lang);
 assert.equal(p.status,'HOLD');
 assert.equal(p.publicPublication,false);
 assert.equal(p.externalDistribution,false);
 assert.ok(p.sourceCandidates.length<=5);
 for(const c of p.sourceCandidates){
  assert.equal(c.language,city.lang);
  assert.equal(c.editorialStatus,'HOLD-source-review');
  assert.equal(c.needsHumanSourceVerification,true);
  assert.ok(c.sourceUrl.startsWith('https://'));
  assert.ok(c.id);
  assert.equal(c.requiresOriginalArticle,true);
  assert.ok(!Object.hasOwn(c,'author'));
 }
}
for(const item of JSON.parse(fs.readFileSync(path.join(root,'config/control-plane/aktual-editorial-network-v1.json'),'utf8')).national.sources){
 const p=JSON.parse(fs.readFileSync(path.join(out,'drafts','national-'+item.id+'.json'),'utf8'));
 assert.equal(p.status,'HOLD');
 assert.equal(p.language,'hr');
 assert.equal(p.sourceCandidates.length,0);
 assert.equal(p.publicPublication,false);
}
console.log('AKTUAL MEDIA FREE NETWORK PASS: '+report.deskAgents+' executing desks; '+report.executableMicroChecks+' real micro-checks; 0 paid API calls; 0 publications.');
