import assert from 'node:assert/strict';
import {addEmailStatusButtons,VERSION as BUTTON_VERSION} from '../workers/gnk-asg-direct-operator/src/email-status-buttons-v1.js';
import {backfillManualMailStatus,VERSION as STATUS_VERSION} from '../workers/gnk-asg-direct-operator/src/manual-mail-status-backfill-v1.js';

const request=new Request('https://www.gnk-asg.hr/mail-studio/');
const response=new Response('<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="script-src \'self\'"></head><body><main>Mail Studio</main></body></html>',{headers:{'content-type':'text/html; charset=utf-8'}});
const patched=await addEmailStatusButtons(request,response);
const html=await patched.text();
assert.match(BUTTON_VERSION,/CSP_SAFE/);
assert.match(html,/id="gnk-email-tools-hub-v4"/);
assert.match(html,/src="\/assets\/email-tools-hub-v4\.js\?v=20260703-1"/);
assert.doesNotMatch(html,/prompt\(/);
assert.equal(patched.headers.get('x-gnk-asg-email-status-buttons'),BUTTON_VERSION);

const publicStatusResponse=new Response('<html><body>Public status</body></html>',{headers:{'content-type':'text/html'}});
const untouched=await addEmailStatusButtons(new Request('https://www.gnk-asg.hr/automation-status/'),publicStatusResponse);
assert.doesNotMatch(await untouched.text(),/gnk-email-tools-hub-v4/);

const prepared=[];
const batches=[];
class Statement{
 constructor(sql){this.sql=sql;this.values=[];prepared.push(this);}
 bind(...values){this.values=values;return this;}
 async all(){
  if(this.sql.includes('FROM manual_mail_messages'))return{results:[{
   id:'manual-test-1',from_email:'office@gnk-asg.hr',to_json:'["recipient@example.com"]',subject:'Test manual audit',status:'SENT',provider_json:'[]',error_code:'',error_message:'',created_at:'2026-07-03T08:00:00.000Z',sent_at:'2026-07-03T08:00:01.000Z'
  }]};
  return{results:[]};
 }
 async first(){return null;}
 async run(){return{meta:{changes:1}};}
}
const db={
 prepare(sql){return new Statement(sql);},
 async batch(statements){batches.push(statements);return statements.map(()=>({success:true}));}
};
const result=await backfillManualMailStatus({GNK_ASG_D1:db});
assert.equal(result.ok,true);
assert.equal(result.auditedRows,1);
assert.equal(result.candidateRecipients,1);
assert.ok(prepared.some(item=>item.sql.includes('INSERT INTO email_status_records')));
assert.ok(batches.length>=2);
assert.match(STATUS_VERSION,/MANUAL_MAIL_STATUS_BACKFILL/);

console.log(JSON.stringify({ok:true,buttonVersion:BUTTON_VERSION,statusVersion:STATUS_VERSION,manualAuditCandidates:result.candidateRecipients},null,2));
