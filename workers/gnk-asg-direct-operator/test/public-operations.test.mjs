import assert from 'node:assert/strict';
import {approvalState,localDate,__test,VERSION,REVIEW_HOUR,APPROVAL_HOUR} from '../src/public-operations-v1.js';

const date='2026-07-05';
const beforeReview=new Date('2026-07-05T05:59:00.000Z');
const atReview=new Date('2026-07-05T06:00:00.000Z');
const beforeApproval=new Date('2026-07-05T06:59:00.000Z');
const atApproval=new Date('2026-07-05T07:00:00.000Z');

assert.equal(localDate(beforeReview),date,'test fixture must resolve to Europe/Zagreb date');
assert.equal(REVIEW_HOUR,8);
assert.equal(APPROVAL_HOUR,9);

const preparing=approvalState(date,null,beforeReview);
assert.deepEqual(preparing,{
  state:'preparing',
  approved:false,
  public:true,
  releaseAllowed:false,
  reason:'package_preparation_before_08'
});

for(const moment of [atReview,beforeApproval]){
  const awaiting=approvalState(date,null,moment);
  assert.equal(awaiting.state,'awaiting-executive-review');
  assert.equal(awaiting.approved,false);
  assert.equal(awaiting.public,true);
  assert.equal(awaiting.releaseAllowed,false);
}

const approvedBySilence=approvalState(date,null,atApproval);
assert.equal(approvedBySilence.state,'approved-by-silence');
assert.equal(approvedBySilence.approved,true);
assert.equal(approvedBySilence.public,true);
assert.equal(approvedBySilence.releaseAllowed,true);
assert.equal(approvedBySilence.reason,'no_stop_hold_or_cancel_before_09');

const held=approvalState(date,{state:'held',reason:'private internal explanation'},atApproval);
assert.equal(held.state,'held');
assert.equal(held.approved,false);
assert.equal(held.releaseAllowed,false);
assert.equal(held.reason,'held_by_executive_office');
assert.doesNotMatch(held.reason,/private internal explanation/);

const stopped=approvalState(date,{state:'STOP'},atApproval);
assert.equal(stopped.state,'stopped');
assert.equal(stopped.approved,false);
assert.equal(stopped.releaseAllowed,false);
assert.equal(stopped.reason,'stopped_by_executive_office');

const cancelled=approvalState(date,{state:'cancelled',reason:'private cancellation explanation'},atApproval);
assert.equal(cancelled.state,'cancelled');
assert.equal(cancelled.approved,false);
assert.equal(cancelled.releaseAllowed,false);
assert.equal(cancelled.reason,'cancelled_by_executive_office');
assert.doesNotMatch(cancelled.reason,/private cancellation explanation/);

const explicit=approvalState(date,{state:'approved-explicitly'},beforeReview);
assert.equal(explicit.state,'approved-explicitly');
assert.equal(explicit.approved,true);
assert.equal(explicit.releaseAllowed,true);

const preparingBoard=__test.governanceBoard(date,null,beforeReview);
assert.equal(preparingBoard.controls.find(item=>item.id==='reports-before-0800')?.state,'active');
assert.equal(preparingBoard.controls.find(item=>item.id==='approval-after-0800')?.state,'pending');
assert.equal(preparingBoard.controls.find(item=>item.id==='admin-token-lock')?.state,'token-required');

const reviewBoard=__test.governanceBoard(date,null,atReview);
assert.equal(reviewBoard.controls.find(item=>item.id==='reports-before-0800')?.state,'closed');
assert.equal(reviewBoard.controls.find(item=>item.id==='approval-after-0800')?.state,'active');

const approvedBoard=__test.governanceBoard(date,null,atApproval);
assert.equal(approvedBoard.controls.find(item=>item.id==='reports-before-0800')?.state,'closed');
assert.equal(approvedBoard.controls.find(item=>item.id==='approval-after-0800')?.state,'approved');
assert.equal(approvedBoard.policy.reviewAt,`${date} 08:00 Europe/Zagreb`);
assert.equal(approvedBoard.policy.silentApprovalAt,`${date} 09:00 Europe/Zagreb`);

assert.equal(__test.normalizeDecision('APPROVE'),'approved-explicitly');
assert.equal(__test.normalizeDecision('STOP'),'stopped');
assert.equal(__test.normalizeDecision('HOLD'),'held');
assert.equal(__test.normalizeDecision('CANCEL'),'cancelled');
assert.match(VERSION,/PUBLIC_OPERATIONS_V4/);
console.log('PUBLIC_OPERATIONS_0800_0900_POLICY_OK');
