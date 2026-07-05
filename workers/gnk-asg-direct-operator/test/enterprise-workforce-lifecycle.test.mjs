import assert from 'node:assert/strict';
import {__test,VERSION} from '../src/enterprise-project-operations-v1.js';

const projects=[
  {id:'P1',name:'Portal review',stage:'review',publicLabel:'REVIEW',workstreams:['functional test','mobile review'],firstBacklog:['verify runtime','record evidence']},
  {id:'P2',name:'Media kits',stage:'build',publicLabel:'REVIEW',workstreams:['fact sheet','asset pack'],firstBacklog:['validate sources','prepare downloads']}
];

const assignedAt='2026-07-05T10:00:00.000Z';
const assignments=__test.buildAssignments(projects,assignedAt);

assert.match(VERSION,/WORKFORCE_LIFECYCLE/);
assert.equal(assignments.length,1537);
assert.equal(new Set(assignments.map(item=>item.workerId)).size,1537);
assert.equal(assignments.every(item=>item.schemaVersion===2),true);
assert.equal(assignments.every(item=>item.operationallyEngaged===true),true);
assert.equal(assignments.every(item=>item.primaryTask?.id&&item.supportTask?.id),true);
assert.equal(assignments.every(item=>item.supportTask.status==='queued'),true);
assert.equal(assignments.every(item=>item.assignedAt===assignedAt),true);
assert.equal(assignments.every(item=>item.auditRequired&&item.peerReviewRequired&&item.auditRef),true);
assert.equal(assignments.every(item=>Array.isArray(item.auditTrail)&&item.auditTrail[0]?.type==='assigned'),true);

const statusCounts=assignments.reduce((out,item)=>{
  out[item.profileStatus]=(out[item.profileStatus]||0)+1;
  return out;
},{});
assert.deepEqual(statusCounts,{
  active:661,
  busy:219,
  scheduled:219,
  idle:219,
  'approval-required':219
});

const summary=__test.summarizeAssignments(assignments);
assert.deepEqual(summary,{
  total:1537,
  operationallyEngaged:1537,
  inProgress:880,
  scheduled:219,
  standby:219,
  reviewRequired:219,
  queuedSupportTasks:1537
});

const working={...assignments[0],progressPct:20,workState:'in-progress',primaryTask:{...assignments[0].primaryTask,status:'in-progress'}};
const advanced=__test.advanceAssignment(working,0,'2026-07-05T11:00:00.000Z');
assert.equal(advanced.workState,'in-progress');
assert.ok(advanced.progressPct>20);
assert.equal(advanced.lastHeartbeatAt,'2026-07-05T11:00:00.000Z');
assert.ok(advanced.nextCheckpointAt>advanced.lastHeartbeatAt);

const nearGate={...assignments[1],progressPct:84,workState:'in-progress',primaryTask:{...assignments[1].primaryTask,status:'in-progress'}};
const gated=__test.advanceAssignment(nearGate,1,'2026-07-05T11:00:00.000Z');
assert.equal(gated.workState,'review-required');
assert.equal(gated.primaryTask.status,'review-required');
assert.match(gated.currentAction,/awaiting peer and executive review/i);
assert.equal(gated.auditTrail.at(-1).type,'checkpoint-submitted');

assert.equal(__test.cycleSlot(new Date('2026-07-05T11:42:00.000Z')),'2026-07-05T11:00:00.000Z');
assert.equal(__test.workerId(0),'MCO-GNK01-0001');
assert.equal(__test.workerId(1536),'COD-GNK32-1537');

console.log(JSON.stringify({
  ok:true,
  version:VERSION,
  workers:assignments.length,
  tasks:assignments.length*2,
  summary
}));
