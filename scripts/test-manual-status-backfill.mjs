import assert from 'node:assert/strict';
import {backfillManualMailStatus,VERSION} from '../workers/gnk-asg-direct-operator/src/email-status-tracking-v6.js';

const prepared=[];
const batches=[];
class Statement{
 constructor(sql){this.sql=sql;this.values=[];prepared.push(this);}
 bind(...values){this.values=values;return this;}
 async all(){
  if(this.sql.includes('FROM manual_mail_messages'))return{results:[{id:'manual-test-1',from_email:'office@gnk-asg.hr',to_json:'["recipient@example.com"]',subject:'Test manual audit',status:'SENT',provider_json:'[]',error_code:'',error_message:'',created_at:'2026-07-03T08:00:00.000Z',sent_at:'2026-07-03T08:00:01.000Z'}]};
  return{results:[]};
 }
 async first(){return null;}
 async run(){return{meta:{changes:1}};}
}
const db={prepare(sql){return new Statement(sql);},async batch(statements){batches.push(statements);return statements.map(()=>({success:true}));}};
const result=await backfillManualMailStatus({GNK_ASG_D1:db});
assert.equal(result.ok,true);
assert.equal(result.auditedRows,1);
assert.equal(result.candidateRecipients,1);
assert.ok(prepared.some(item=>item.sql.includes('INSERT INTO email_status_records')));
assert.equal(batches.length,2);
assert.match(VERSION,/AUDIT_BACKFILL/);
console.log(JSON.stringify({ok:true,version:VERSION,manualAuditCandidates:result.candidateRecipients,batches:batches.length},null,2));
