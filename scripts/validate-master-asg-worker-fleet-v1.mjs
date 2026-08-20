import fs from 'node:fs';

const path='config/master-asg-worker-fleet-v1.json';
const fleet=JSON.parse(fs.readFileSync(path,'utf8'));
const fail=(message)=>{throw new Error(`MASTER_ASG_WORKER_FLEET_INVALID: ${message}`)};
const requiredWorkers=[
  'master-orchestrator','planner-worker','reviewer-worker','health-sentinel','provider-scout',
  'world-intel-worker','intel-correlation-worker','intel-assessor-worker','intel-red-team-worker',
  'aktual-worker','market-worker','publication-worker','seo-entity-worker','qa-worker',
  'release-guardian','security-guardian'
];
const ids=new Set((fleet.workers||[]).map(worker=>worker.id));
for(const id of requiredWorkers) if(!ids.has(id)) fail(`missing worker ${id}`);
if(!fleet.principles?.singleWriter) fail('singleWriter must be true');
if(!fleet.principles?.exactShaRequiredForWrites) fail('exactShaRequiredForWrites must be true');
if(!fleet.principles?.failClosedOnUnknownState) fail('failClosedOnUnknownState must be true');
if(!fleet.principles?.provenanceRequired) fail('provenanceRequired must be true');
if(!fleet.principles?.contradictionSearchRequired) fail('contradictionSearchRequired must be true');
const contract=fleet.assessmentContract||{};
for(const field of ['primaryAssessment','confidence','sourceRefs','independentSourceCount','contradictions','alternativeScenarios','watchIndicators','whatWouldChangeAssessment','freshness','provenanceDigest']){
  if(!(contract.requiredFields||[]).includes(field)) fail(`assessment contract missing ${field}`);
}
for(const worker of fleet.workers||[]){
  if(!['R0','R1','R2','R3'].includes(worker.risk)) fail(`invalid risk class for ${worker.id}`);
  if(!worker.fallback) fail(`missing fallback for ${worker.id}`);
}
const release=(fleet.workers||[]).find(worker=>worker.id==='release-guardian');
for(const req of ['all-core-gates-green','head-sha-match']) if(!(release?.requires||[]).includes(req)) fail(`release guardian missing ${req}`);
const assessor=(fleet.workers||[]).find(worker=>worker.id==='intel-assessor-worker');
if(!(assessor?.requires||[]).includes('minimum-two-independent-sources-or-explicit-low-confidence')) fail('assessor independent-source rule missing');
const redTeam=(fleet.workers||[]).find(worker=>worker.id==='intel-red-team-worker');
if(!(redTeam?.capabilities||[]).includes('disconfirming-evidence-search')) fail('red-team disconfirming evidence capability missing');
console.log(`MASTER_ASG_WORKER_FLEET_OK workers=${ids.size} assessmentFields=${contract.requiredFields.length}`);
