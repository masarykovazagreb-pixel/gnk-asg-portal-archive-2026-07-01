#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const REGISTRY='config/control-plane/workforce-bot-registry-v1.json';
const WORKERS='workers';
const OUT='artifacts/workforce-bot-orchestrator/assignment.json';

const registry=JSON.parse(fs.readFileSync(REGISTRY,'utf8'));
const dirs=fs.readdirSync(WORKERS,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
const bots=[...(registry.bots||[])];
const byWorker=new Map(bots.map(b=>[b.worker,b]));
const missing=dirs.filter(d=>!byWorker.has(d));
const orphan=bots.filter(b=>!dirs.includes(b.worker)).map(b=>b.worker);
const duplicateWorkers=bots.map(b=>b.worker).filter((v,i,a)=>a.indexOf(v)!==i);
const duplicateIds=bots.map(b=>b.botId).filter((v,i,a)=>a.indexOf(v)!==i);

const fail=[];
if(registry.policy?.everyWorkerMustHaveBotIdentity!==true) fail.push('coverage policy disabled');
if(missing.length) fail.push('missing bot identities: '+missing.join(', '));
if(orphan.length) fail.push('orphan registry entries: '+orphan.join(', '));
if(duplicateWorkers.length) fail.push('duplicate workers: '+[...new Set(duplicateWorkers)].join(', '));
if(duplicateIds.length) fail.push('duplicate bot ids: '+[...new Set(duplicateIds)].join(', '));

const assignments=bots.slice().sort((a,b)=>a.botId.localeCompare(b.botId)).map((b,index)=>({
  sequence:index+1, botId:b.botId, worker:b.worker, domain:b.domain, mode:b.mode,
  cadence:b.cadence||registry.policy.defaultCadence, mission:b.mission,
  nextTask:(b.tasks||[])[0]||'health audit', taskQueue:b.tasks||[],
  mutationAllowed:b.mode!=='observe-and-propose',
  guardrails:{prFirst:true,directMainWrites:false,noFabricatedFacts:true,doNotWeakenTests:true}
}));

const report={
  version:'GNK_ASG_WORKFORCE_BOT_ASSIGNMENT_V1', generatedAt:new Date().toISOString(),
  workers:dirs.length, bots:bots.length, coverageOk:fail.length===0, policy:registry.policy,
  summary:{
    active:assignments.filter(x=>x.mode==='active').length,
    prFirst:assignments.filter(x=>x.mode==='pr-first').length,
    sourceGated:assignments.filter(x=>x.mode==='source-gated').length,
    protectedObserveOnly:assignments.filter(x=>x.mode==='observe-and-propose').length
  },
  assignments
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(fail.length){
  console.error('WORKFORCE BOT ORCHESTRATOR FAIL:',fail.join(' | '));
  process.exit(1);
}
