import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assessReview,REVIEW_MS,evaluateLedger} from '../scripts/aktual-review-window-gate-v1.mjs';
const SHA='a'.repeat(64);
const delivered=new Date('2026-10-22T18:00:00Z');
const base={id:'EDITORIAL-TEST-1',sourceUrl:'https://gnk-asg.hr/gnk-aktual/',sha256:SHA,currentSha256:SHA,
 proofOfDelivery:{status:'delivered',receiptId:'smtp-provider-confirmation-123',deliveredAt:delivered.toISOString()},
 sourceVerified:true,action:'internal-seo-check',scope:'low-risk-internal',decision:{type:'none'}};
const assess=(entry,offset)=>assessReview(entry,{verifiedDigest:entry.currentSha256,now:new Date(delivered.getTime()+offset)});
test('Cannot silently approve before confirmed delivery',()=>{
 assert.equal(assess({...base,proofOfDelivery:{status:'sent',receiptId:'a',deliveredAt:delivered.toISOString()}},REVIEW_MS).status,'HOLD');
 assert.equal(assess({...base,proofOfDelivery:{}},REVIEW_MS).mayProceedInternally,false);
});
test('Exact 30-minute boundary, no premature approval',()=>{
 assert.equal(assess(base,REVIEW_MS-1).status,'AWAITING_REVIEW');
 assert.equal(assess(base,REVIEW_MS).status,'SILENT_INTERNAL_APPROVAL');
 assert.equal(assess(base,REVIEW_MS).mayPublish,false);
});
test('Reject or hold always wins, including after timeout',()=>{
 for(const type of ['reject','hold','cancel'])assert.equal(assess({...base,decision:{type,at:new Date(delivered.getTime()+4000).toISOString()}},REVIEW_MS+5000).status,'REJECTED');
});
test('Prevent silently authorizing external publication, deployment, legal and financial changes',()=>{
 for(const action of ['public-publication','production-deploy','legal','financial','security','secret','dns','sensitive-personal-claim']){
  assert.equal(assess({...base,action},REVIEW_MS).status,'EXPLICIT_APPROVAL_REQUIRED');
 }
 assert.equal(assess({...base,scope:'public'},REVIEW_MS).status,'EXPLICIT_APPROVAL_REQUIRED');
});
test('Frozen content, source and receipt must remain verified',()=>{
 assert.equal(assess({...base,changedAfterDelivery:true},REVIEW_MS).status,'HOLD');
 assert.equal(assess({...base,sourceVerified:false},REVIEW_MS).status,'HOLD');
 assert.equal(assess({...base,currentSha256:'b'.repeat(64)},REVIEW_MS).status,'HOLD');
 assert.equal(assess({...base,proofOfDelivery:{...base.proofOfDelivery,receiptId:''}},REVIEW_MS).status,'HOLD');
});
test('No future-delivery approval, and ledger always denies publishing',()=>{
 assert.equal(assess(base,-100000).status,'HOLD');
 const ledger=evaluateLedger({entries:[base]},{now:new Date(delivered.getTime()+REVIEW_MS)});
 assert.equal(ledger.decisions.length,1);
 assert.equal(ledger.decisions[0].mayPublish,false);
});
