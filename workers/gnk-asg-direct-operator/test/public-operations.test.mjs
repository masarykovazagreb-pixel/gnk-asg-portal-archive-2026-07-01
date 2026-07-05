import assert from 'node:assert/strict';
import {approvalState,localDate,__test,VERSION} from '../src/public-operations-v1.js';

const date='2026-07-05';
const beforeDeadline=new Date('2026-07-05T05:59:00.000Z');
const atDeadline=new Date('2026-07-05T06:00:00.000Z');

assert.equal(localDate(beforeDeadline),date,'test fixture must resolve to Europe/Zagreb date');

const preliminary=approvalState(date,null,beforeDeadline);
assert.deepEqual(preliminary,{
  state:'preliminary',
  approved:false,
  public:true,
  reason:'review_window_open_before_08'
});

const approvedBySilence=approvalState(date,null,atDeadline);
assert.equal(approvedBySilence.state,'approved-by-silence');
assert.equal(approvedBySilence.approved,true);
assert.equal(approvedBySilence.public,true);

const held=approvalState(date,{state:'held',reason:'private internal explanation'},beforeDeadline);
assert.equal(held.state,'held');
assert.equal(held.approved,false);
assert.equal(held.public,true);
assert.equal(held.reason,'held_by_executive_office');
assert.doesNotMatch(held.reason,/private internal explanation/);

const cancelled=approvalState(date,{state:'cancelled',reason:'private cancellation explanation'},atDeadline);
assert.equal(cancelled.state,'cancelled');
assert.equal(cancelled.approved,false);
assert.equal(cancelled.public,true);
assert.equal(cancelled.reason,'cancelled_by_executive_office');
assert.doesNotMatch(cancelled.reason,/private cancellation explanation/);

const explicit=approvalState(date,{state:'approved-explicitly'},beforeDeadline);
assert.equal(explicit.state,'approved-explicitly');
assert.equal(explicit.approved,true);
assert.equal(explicit.public,true);

const preliminaryBoard=__test.governanceBoard(date,null,beforeDeadline);
assert.equal(preliminaryBoard.controls.find(item=>item.id==='reports-before-0800')?.state,'active');
assert.equal(preliminaryBoard.controls.find(item=>item.id==='approval-after-0800')?.state,'pending');
assert.equal(preliminaryBoard.controls.find(item=>item.id==='admin-token-lock')?.state,'token-required');

const approvedBoard=__test.governanceBoard(date,null,atDeadline);
assert.equal(approvedBoard.controls.find(item=>item.id==='reports-before-0800')?.state,'closed');
assert.equal(approvedBoard.controls.find(item=>item.id==='approval-after-0800')?.state,'approved');

assert.match(VERSION,/PUBLIC_OPERATIONS_V2/);
console.log('PUBLIC_OPERATIONS_DEADLINE_POLICY_OK');
