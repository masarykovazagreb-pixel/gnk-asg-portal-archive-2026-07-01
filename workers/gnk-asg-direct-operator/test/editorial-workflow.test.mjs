import assert from 'node:assert/strict';
import {runEditorialDraftPlanner} from '../src/editorial-draft-planner-v1.js';
import {readEditorialPlan,saveEditorialSlot,queueEditorialSlotForRelease,listEditorialReleaseQueue,__test} from '../src/editorial-workflow-v1.js';

class MemoryKv{
  constructor(){this.map=new Map();}
  async get(key){return this.map.get(key)??null;}
  async put(key,value){this.map.set(key,String(value));}
}

const kv=new MemoryKv(),env={EDITORIAL_KV:kv},date='2026-07-04';
const generated=await runEditorialDraftPlanner(env,date);
assert.equal(generated.created,true);
const plan=await readEditorialPlan(env,date);
assert.ok(plan.slots.length>=20);
const desk=plan.slots.find(item=>item.slotType==='desk-article');
assert.ok(desk);

const incomplete=await saveEditorialSlot(env,{date,id:desk.id,patch:{title:'Incomplete title only',project:'Wrong entity',automaticPublication:true}});
assert.equal(incomplete.readiness.ok,false);
assert.equal(incomplete.slot.automaticPublication,false);
assert.equal(incomplete.slot.project,'GNK DINAMO Ltd.');
assert.equal(incomplete.slot.state,'sources-required');

const readyPatch={
  title:'Controlled enterprise publication workflow',
  slug:'controlled-enterprise-publication-workflow',
  language:'en',
  category:'Enterprise Intelligence',
  summary:'A fully sourced and reviewed enterprise analysis prepared for controlled publication through THE CODE Intelligence.',
  body:'Original analytical context. '.repeat(60),
  canonical:'https://www.gnk-asg.hr/publications/controlled-enterprise-publication-workflow/',
  image:'https://www.gnk-asg.hr/assets/gnk-asg-social-card.png',
  imageAlt:'Controlled enterprise publication workflow',
  primarySource:'https://example.org/primary',
  supportingSources:['https://example.org/supporting'],
  finalApproval:true,
  factCheckComplete:true,
  sourceReviewComplete:true,
  processDisclosure:'Automation assisted the draft structure; source review, factual verification and final approval were completed by the accountable editor.',
  dateReviewed:'2026-07-04T09:00:00Z',
  datePublished:'2026-07-04T09:00:00Z'
};
const saved=await saveEditorialSlot(env,{date,id:desk.id,patch:readyPatch});
assert.equal(saved.readiness.ok,true);
assert.equal(saved.slot.state,'ready-for-controlled-publication');
assert.equal(saved.slot.authorEntity,'GNK DINAMO Ltd. Group Editorial Desk');
assert.equal(saved.slot.automaticPublication,false);

const queued=await queueEditorialSlotForRelease(env,{date,id:desk.id});
assert.equal(queued.created,true);
assert.equal(queued.item.state,'awaiting-executive-release');
assert.equal(queued.item.automaticPublication,false);
const duplicate=await queueEditorialSlotForRelease(env,{date,id:desk.id});
assert.equal(duplicate.created,false);
assert.equal(duplicate.item.id,queued.item.id);

const queue=await listEditorialReleaseQueue(env);
assert.equal(queue.items.length,1);
assert.equal(queue.items[0].id,desk.id);
assert.equal(queue.automaticPublication,false);

const nermin=plan.slots.find(item=>item.slotType==='nermin-original-or-commentary');
const nerminBlocked=await saveEditorialSlot(env,{date,id:nermin.id,patch:{...readyPatch,publicationType:'nermin-commentary',commentApprovedByNermin:false}});
assert.equal(nerminBlocked.readiness.ok,false);
assert.equal(nerminBlocked.slot.state,'author-confirmation-required');
const nerminReady=await saveEditorialSlot(env,{date,id:nermin.id,patch:{...readyPatch,publicationType:'nermin-commentary',commentApprovedByNermin:true}});
assert.equal(nerminReady.readiness.ok,true);
assert.equal(nerminReady.slot.state,'ready-for-controlled-publication');
const nerminQueued=await queueEditorialSlotForRelease(env,{date,id:nermin.id});
assert.equal(nerminQueued.item.state,'awaiting-executive-release');

assert.equal(__test.planKey(date),`the-code:editorial-plan:${date}`);
assert.equal(__test.queueItemKey(desk.id),`the-code:publication-release-queue:${desk.id}`);
console.log('EDITORIAL_WORKFLOW_RELEASE_QUEUE_TESTS_OK');
