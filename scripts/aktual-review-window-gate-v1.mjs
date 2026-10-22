#!/usr/bin/env node
// Shared, deterministic 30-minute editorial-review decision checker.
// NOT a public publishing authorization, human fact check, or delivery service.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const VERSION='AKTUAL_REVIEW_WINDOW_GATE_V1_20261022';
export const REVIEW_MS=30*60*1000;
export const CLOCK_SKEW_MS=90*1000;
const validDate=x=>typeof x==='string'&&x.trim()?Date.parse(x):Number.NaN;
const safeHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const reject=new Set(['reject','rejected','hold','held','cancel','cancelled','withdraw']);
const highRisk=new Set(['public-publication','production-deploy','legal','financial','security','secret','dns','sensitive-personal-claim','political-persuasion']);
export function assessReview(entry,{now=new Date(),verifiedDigest=null}={}){
 const result={id:entry?.id??null,version:VERSION,status:'HOLD',deadline:null,mayProceedInternally:false,mayPublish:false,issues:[]};
 if(!entry||typeof entry!=='object'){result.issues.push('missing-entry');return result}
 if(!entry.id||!safeHash(entry.sha256)||!entry.sourceUrl){result.issues.push('missing-id-content-hash-or-source');return result}
 if(typeof verifiedDigest!=='string'||verifiedDigest!==entry.sha256){result.issues.push('digest-not-verified-against-frozen-payload');return result}
 const delivered=validDate(entry.proofOfDelivery?.deliveredAt);
 const evidence=entry.proofOfDelivery?.receiptId;
 if(!Number.isFinite(delivered)||!evidence||entry.proofOfDelivery?.status!=='delivered'){
  result.issues.push('confirmed-recipient-delivery-required');return result
 }
 if(!Number.isFinite(now.getTime())||delivered>now.getTime()+CLOCK_SKEW_MS){result.issues.push('invalid-or-future-clock');return result}
 const expiry=delivered+REVIEW_MS;result.deadline=new Date(expiry).toISOString();
 const decision=String(entry.decision?.type||'').toLowerCase();
 const decided=validDate(entry.decision?.at);
 if(reject.has(decision)){
  result.status='REJECTED';result.issues.push('rejected-or-held');return result
 }
 if(entry.changedAfterDelivery===true||entry.sourceVerified!==true){
  result.issues.push('frozen-content-changed-or-source-unverified');return result
 }
 if(!Number.isFinite(entry.preparedAt?validDate(entry.preparedAt):delivered)){
  result.issues.push('invalid-preparation-time');return result
 }
 if(highRisk.has(entry.action)||entry.scope!=='low-risk-internal'){
  result.status='EXPLICIT_APPROVAL_REQUIRED';result.issues.push('not-eligible-for-silent-approval');return result
 }
 if(decision==='approve'&&Number.isFinite(decided)&&decided<=now.getTime()){
  result.status='APPROVED_INTERNAL';result.mayProceedInternally=true;return result
 }
 if(now.getTime()<expiry){result.status='AWAITING_REVIEW';result.issues.push('thirty-minute-window-open');return result}
 if(entry.decision?.type&&!['none','pending',''].includes(decision)){
  result.issues.push('unknown-decision');return result
 }
 result.status='SILENT_INTERNAL_APPROVAL';result.mayProceedInternally=true;
 return result
}
export function evaluateLedger(ledger,{now=new Date()}={}){
 if(!ledger||!Array.isArray(ledger.entries))throw Error('Invalid review ledger');
 return {version:VERSION,generatedAt:now.toISOString(),total:ledger.entries.length,
  decisions:ledger.entries.map(e=>assessReview(e,{now,verifiedDigest:e?.currentSha256})),
  note:'No public release. Human source validation and separate production gate required.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const file=process.argv[2];
 if(!file)throw Error('Usage: node scripts/aktual-review-window-gate-v1.mjs <ledger.json>');
 const input=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));
 const output=evaluateLedger(input);
 console.log(JSON.stringify(output,null,2));
 if(output.decisions.some(x=>x.mayPublish))process.exitCode=1;
}
