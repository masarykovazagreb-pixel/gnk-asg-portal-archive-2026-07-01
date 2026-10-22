import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function copyJson(root,p){
  const dest=path.join(root,p);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(path.join(project,p),dest);
}
test('factory derives bot identities and respects 30-minute, objection and risk gates',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asg-agent-v2-'));
  try{
    for(const p of [
      'config/control-plane/master-asg-agent-network-v2.json',
      'config/control-plane/workforce-bot-registry-v1.json',
      'config/control-plane/workforce-bot-taskboard-v1.json',
      'config/control-plane/bot-ownership-v1.json',
      'ops/agent-decisions-v1.json'
    ])copyJson(root,p);
    const reg=JSON.parse(fs.readFileSync(path.join(root,'config/control-plane/workforce-bot-registry-v1.json'),'utf8'));
    for(const b of reg.bots||[])fs.mkdirSync(path.join(root,'workers',b.worker),{recursive:true});
    fs.mkdirSync(path.join(root,'workers','gnk-asg-new-worker-unknown'),{recursive:true});
    const ledgerPath=path.join(root,'ops/agent-decisions-v1.json');
    const ledger=JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
    const delivery={messageId:'gh-notice-100',deliveryConfirmedAt:'2026-10-22T13:45:00Z'};
    ledger.decisions=[
      {id:'LOW-APPROVED',risk:'low',status:'proposed',action:'Propose a test-only change',notifiedAt:'2026-10-22T13:45:00Z',deliveryEvidence:delivery},
      {id:'LOW-TOO-NEW',risk:'low',status:'proposed',action:'Propose a test-only change',notifiedAt:'2026-10-22T14:45:00Z',deliveryEvidence:{messageId:'gh-notice-101',deliveryConfirmedAt:'2026-10-22T14:45:00Z'}},
      {id:'LOW-REJECTED',risk:'low',status:'proposed',action:'Rejected item',notifiedAt:'2026-10-22T13:45:00Z',deliveryEvidence:delivery,rejectedAt:'2026-10-22T14:55:00Z'},
      {id:'PROD-HOLD',risk:'critical',status:'proposed',action:'Deploy production',notifiedAt:'2026-10-22T13:45:00Z',deliveryEvidence:delivery},
      {id:'NO-NOTICE',risk:'low',status:'proposed',action:'Not actually delivered',notifiedAt:'2026-10-22T13:45:00Z',deliveryEvidence:null}
    ];
    fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));
    const result=spawnSync(process.execPath,[path.join(project,'scripts/master-asg-agent-network-v2.mjs')],{
      cwd:root,encoding:'utf8',timeout:20000,
      env:{...process.env,ASG_NOW:'2026-10-22T15:00:00Z',ASG_SKIP_LIVE:'1',
        GITHUB_TOKEN:'',GH_TOKEN:'',ENABLE_PUBLIC_RESEARCH:'0',ENABLE_AI_WRITING:'0',
        EXA_API_KEY:'',OPENAI_API_KEY:''}
    });
    assert.equal(result.status,0,result.stderr||result.stdout);
    const report=JSON.parse(fs.readFileSync(path.join(root,'artifacts/master-asg-agent-network/report.json'),'utf8'));
    const byId=Object.fromEntries(report.decisions.map(d=>[d.id,d]));
    assert.equal(byId['LOW-APPROVED'].status,'eligible-for-safe-internal-action');
    assert.equal(byId['LOW-TOO-NEW'].status,'pending');
    assert.equal(byId['LOW-REJECTED'].status,'rejected');
    assert.equal(byId['PROD-HOLD'].reason,'explicit-human-approval-required');
    assert.equal(byId['NO-NOTICE'].reason,'no-verifiable-delivery');
    assert.equal(report.governanceMissingWorkers.length,1);
    assert.ok(report.governanceMissingWorkers.includes('gnk-asg-new-worker-unknown'));
    assert.equal(report.autonomousWorkerAgents,(reg.bots||[]).length+1);
    assert.equal(report.productionShaVerified,false);
    assert.equal(report.boundaries.noProductionDeploy,true);
    assert.equal(report.boundaries.noMainWrites,true);
    assert.equal(report.publicResearch.status,'disabled-by-default');
    assert.equal(report.editorialDraft.status,'disabled-by-default');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
