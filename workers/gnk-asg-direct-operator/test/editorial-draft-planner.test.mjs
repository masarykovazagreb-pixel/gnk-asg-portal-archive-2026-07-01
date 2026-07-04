import assert from 'node:assert/strict';
import {
  EDITORIAL_DESKS,
  buildDailyEditorialPlan,
  deskDraftCount,
  runEditorialDraftPlanner,
  handleEditorialOperationsApi,
  __test
} from '../src/editorial-draft-planner-v1.js';

class MemoryKv {
  constructor(){this.map=new Map();this.puts=0;}
  async get(key){return this.map.get(key)??null;}
  async put(key,value){this.puts+=1;this.map.set(key,String(value));}
}

assert.equal(EDITORIAL_DESKS.length,5);
assert.equal(new Set(EDITORIAL_DESKS.map(item=>item.workerId)).size,5);
assert.equal(new Set(EDITORIAL_DESKS.map(item=>item.centre)).size,5);
assert.ok(EDITORIAL_DESKS.every(item=>!/(croatia|zagreb)/i.test(`${item.centre} ${item.desk}`)));

const date='2026-07-04';
for(const desk of EDITORIAL_DESKS){
  const count=deskDraftCount(date,desk.workerId);
  assert.ok(count>=3&&count<=5);
}

const plan=buildDailyEditorialPlan(date);
assert.equal(plan.project,'GNK DINAMO Ltd.');
assert.equal(plan.editorialBrand,'THE CODE Intelligence');
assert.equal(plan.connectedEntity,'GNK ASG d.o.o.');
assert.equal(plan.automaticDraftPreparation,true);
assert.equal(plan.automaticPublication,false);
assert.equal(plan.finalApprovalRequired,true);
assert.equal(plan.summary.editorialProfiles,5);
assert.ok(plan.summary.deskDrafts>=15&&plan.summary.deskDrafts<=25);
assert.equal(plan.summary.nerminOriginalOrCommentarySlots,5);
assert.equal(plan.summary.totalSlots,plan.slots.length);
assert.equal(new Set(plan.slots.map(item=>item.id)).size,plan.slots.length);
assert.equal(plan.slots.filter(item=>item.slotType==='nermin-original-or-commentary').length,5);
assert.ok(plan.slots.filter(item=>item.slotType==='desk-article').every(item=>item.state==='sources-required'&&item.automaticPublication===false));
assert.ok(plan.slots.filter(item=>item.slotType==='nermin-original-or-commentary').every(item=>item.state==='author-confirmation-required'&&item.authorshipConfirmed===false&&item.automaticPublication===false));

const kv=new MemoryKv();
const env={EDITORIAL_KV:kv};
const first=await runEditorialDraftPlanner(env,date);
assert.equal(first.ok,true);
assert.equal(first.created,true);
assert.equal(kv.puts,2);
const second=await runEditorialDraftPlanner(env,date);
assert.equal(second.ok,true);
assert.equal(second.created,false);
assert.equal(kv.puts,2);
const forced=await runEditorialDraftPlanner(env,date,{force:true});
assert.equal(forced.created,true);
assert.equal(kv.puts,4);

const noKv=await runEditorialDraftPlanner({},date);
assert.equal(noKv.skipped,'editorial_kv_unavailable');

const getResponse=await handleEditorialOperationsApi(new Request(`https://example.test/api/editorial-operations/plan?date=${date}`),env);
assert.equal(getResponse.status,200);
const getPayload=await getResponse.json();
assert.equal(getPayload.plan.date,date);

const configResponse=await handleEditorialOperationsApi(new Request('https://example.test/api/editorial-operations/config'),env);
assert.equal(configResponse.status,200);
const config=await configResponse.json();
assert.equal(config.profiles.length,5);
assert.equal(config.automaticPublication,false);

assert.equal(__test.planKey(date),`the-code:editorial-plan:${date}`);
console.log('THE_CODE_EDITORIAL_DRAFT_PLANNER_TESTS_OK');
