import assert from 'node:assert/strict';
import {test} from 'node:test';
import {eligibleAfter30Minutes} from '../workers/gnk-asg-direct-operator/src/editorial-approval-decision-store-v2.js';

const SHA='a'.repeat(64);
const NOTIFIED='2026-10-23T08:00:00Z';
const DELIVERED='2026-10-23T08:20:00Z';
const evidence={
 status:'delivered',verified:true,receiptId:'server-provider-receipt-123',
 contentSha256:SHA,deliveredAt:DELIVERED,verifiedAt:DELIVERED
};
const entry={risk:'low',actionKind:'internal-operation',notifiedAt:NOTIFIED,
 deliveryEvidence:evidence,contentSha256:SHA,currentHash:SHA};
const assess=(record,now,receipt=evidence)=>eligibleAfter30Minutes(
 record,new Date(now),{trustedReceipt:receipt}
);

test('No provider-verified receipt: browser or ledger self-attestation cannot start timer',()=>{
 const result=eligibleAfter30Minutes(entry,new Date('2026-10-23T09:00:00Z'));
 assert.equal(result.eligible,false);
 assert.equal(result.reason,'trusted_delivery_receipt_required');
 assert.equal(assess(entry,'2026-10-23T09:00:00Z',{...evidence,receiptId:'other'}).eligible,false);
 assert.equal(assess(entry,'2026-10-23T09:00:00Z',{...evidence,contentSha256:'b'.repeat(64)}).eligible,false);
});

test('Thirty-minute deadline starts at verified delivery, not notification',()=>{
 const before=assess(entry,'2026-10-23T08:49:59.999Z');
 assert.equal(before.eligible,false);
 assert.equal(before.reason,'review_window_open');
 assert.equal(before.deadline,'2026-10-23T08:50:00.000Z');
 const onTime=assess(entry,'2026-10-23T08:50:00Z');
 assert.equal(onTime.eligible,true);
 assert.equal(onTime.reason,'low_risk_internal_no_objection');
});

test('Reject missing, forged, future and temporally impossible delivery',()=>{
 const now='2026-10-23T09:00:00Z';
 for(const proof of [
  {...evidence,status:'sent'},
  {...evidence,verified:false},
  {...evidence,receiptId:''},
  {...evidence,deliveredAt:'2026-10-23T10:00:00Z'},
  {...evidence,verifiedAt:'2026-10-23T10:00:00Z'},
  {...evidence,verifiedAt:'2026-10-23T08:19:59Z'},
  {...evidence,deliveredAt:'2026-10-23 08:20:00'},
  {...evidence,deliveredAt:'2026-10-23T07:59:59Z'}
 ]){
  assert.equal(assess({...entry,deliveryEvidence:proof},now).eligible,false);
 }
});

test('Reject changed content, post-notification edits, rejection and bad timestamps',()=>{
 const now='2026-10-23T09:00:00Z';
 for(const record of [
  {...entry,currentHash:'b'.repeat(64)},
  {...entry,contentSha256:'invalid'},
  {...entry,changedAt:'2026-10-23T08:10:00Z'},
  {...entry,changedAt:'invalid'},
  {...entry,rejectedAt:'2026-10-23T08:45:00Z'},
  {...entry,notifiedAt:'2026-10-23T08:30:00Z'}
 ]){
  assert.equal(assess(record,now).eligible,false);
 }
});

test('Public publishing, legal, financial, deployment and other scopes always require affirmative authorization',()=>{
 const now='2026-10-23T09:00:00Z';
 for(const actionKind of ['public-publication','production-deploy','legal','financial','security']){
  const result=assess({...entry,actionKind},now);
  assert.equal(result.eligible,false);
  assert.equal(result.reason,'requires_affirmative_authorization');
 }
 assert.equal(assess({...entry,risk:'high'},now).eligible,false);
});

test('A receipt is only a prerequisite; this helper never performs publication',()=>{
 const result=assess(entry,'2026-10-23T09:00:00Z');
 assert.deepEqual(Object.keys(result).sort(),['deadline','eligible','reason']);
 assert.equal(result.eligible,true);
});
