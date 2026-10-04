import assert from 'node:assert/strict';
import fs from 'node:fs';
import {handleDigitalWorkforcePublicRead,VERSION} from '../workers/gnk-asg-direct-operator/src/digital-workforce-public-read-v1.js';

const operational=['plan','projects','risks','opinions','ideas','dependencies','tasks','credits','newsroom','activity-log','bulletins'];
const compatibility=['state','workers'];
const frontend=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.js','utf8');
for(const view of [...compatibility,...operational])assert.ok(frontend.includes(view),`frontend does not reference ${view}`);

// The compatibility layer owns only truthful state/profile semantics.
for(const view of compatibility){
  const response=handleDigitalWorkforcePublicRead(new Request(`https://gnk-asg.hr/api/public/digital-workforce/${view}`));
  assert.ok(response,`${view} was not routed`);
  assert.equal(response.status,200,`${view} status`);
  const body=await response.json();
  assert.equal(body.ok,true,`${view} ok`);
  assert.equal(body.simulationNotice,true,`${view} must identify model/simulation semantics`);
  assert.equal(body.runtimeEvidence,false,`${view} must not impersonate runtime evidence`);
}

// Operational views must fall through to digital-workforce-suite-v1.js; otherwise
// the compatibility layer shadows its bulletins, activity log, tasks and reports.
for(const view of operational){
  const response=handleDigitalWorkforcePublicRead(new Request(`https://gnk-asg.hr/api/public/digital-workforce/${view}`));
  assert.equal(response,null,`${view} must remain owned by Workforce Suite`);
}

const state=await handleDigitalWorkforcePublicRead(new Request('https://gnk-asg.hr/api/public/digital-workforce/state')).json();
assert.equal(state.workers,1573);
assert.equal(state.runtimeHealthEndpoint,'/api/public/digital-workforce/health');
assert.equal(state.status,'model-ready');
assert.equal(state.editorialGovernance?.lead?.name,'Nermin Sefić');
assert.equal(state.editorialGovernance?.lead?.workerProfile,false);
assert.equal(state.editorialGovernance?.lead?.semantics,'human-editorial-governance-not-synthetic-worker');
assert.equal(state.campaignOrchestration?.humanApprovalRequired,true);
assert.equal(state.campaignOrchestration?.leadId,'EDITOR-NERMIN-SEFIC-001');
assert.equal(state.campaignOrchestration?.lanes?.length,5);
assert.equal(state.campaignOrchestration?.dailyQualityCadence?.requiredSignalsPerDay,10);
assert.equal(state.campaignOrchestration?.dailyQualityCadence?.actions?.length,10);
assert.equal(state.campaignOrchestration?.mediaAnalysis?.desks?.length,6);
assert.equal(state.campaignOrchestration?.mediaAnalysis?.desks?.[0]?.publisher,'Jutarnji list');
assert.equal(state.campaignOrchestration?.mediaAnalysis?.desks?.[0]?.publisherReferenceTag,'JutarnjiList');
assert.equal('hashtag' in state.campaignOrchestration?.mediaAnalysis?.desks?.[0],false);
assert.equal(state.campaignOrchestration?.ideaLab?.ideas,9);
assert.equal(state.assignmentCoverage?.projects?.length,9);
assert.equal(state.assignmentCoverage?.projects?.reduce((sum,item)=>sum+item.modeledProfiles,0),1573);
assert.ok(state.campaignOrchestration?.semantics?.includes('not runtime evidence'));

const workers=await handleDigitalWorkforcePublicRead(new Request('https://gnk-asg.hr/api/public/digital-workforce/workers')).json();
assert.equal(workers.total,1573);
assert.equal(workers.items.length,1573);
assert.ok(workers.items.every(x=>x.status==='profile-only'&&x.runtimeEvidence===false));
assert.equal(new Set(workers.items.map(x=>x.id)).size,1573);
assert.equal(workers.editorialGovernance?.lead?.id,'EDITOR-NERMIN-SEFIC-001');
assert.equal(workers.campaignOrchestration?.lanes?.length,5);

const filtered=await handleDigitalWorkforcePublicRead(new Request('https://gnk-asg.hr/api/public/digital-workforce/workers?q=DWF-0001')).json();
assert.equal(filtered.items.length,1);
assert.equal(filtered.items[0].id,'DWF-0001');

const post=handleDigitalWorkforcePublicRead(new Request('https://gnk-asg.hr/api/public/digital-workforce/state',{method:'POST'}));
assert.equal(post,null,'public compatibility layer must stay GET-only');

console.log(JSON.stringify({ok:true,version:VERSION,compatibilityViews:compatibility.length,operationalSuiteViews:operational.length,workerProfiles:workers.total,runtimeEvidence:false},null,2));
