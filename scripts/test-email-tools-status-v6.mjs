import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {addEmailStatusButtons,VERSION as BUTTON_VERSION} from '../workers/gnk-asg-direct-operator/src/email-status-buttons-v1.js';
import {backfillManualMailStatus,VERSION as BACKFILL_VERSION} from '../workers/gnk-asg-direct-operator/src/manual-mail-status-backfill-v1.js';
import {emailStatusDayWindow,VERSION as DATE_VERSION} from '../workers/gnk-asg-direct-operator/src/email-status-date-window-v1.js';

const page=new Response('<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="script-src \'self\'"></head><body>Mail Studio</body></html>',{headers:{'content-type':'text/html; charset=utf-8'}});
const patched=await addEmailStatusButtons(new Request('https://www.gnk-asg.hr/mail-studio/'),page),html=await patched.text();
assert.match(BUTTON_VERSION,/CSP_SAFE/);assert.match(html,/gnk-email-tools-hub-v4/);assert.match(html,/email-tools-hub-v4\.js/);assert.doesNotMatch(html,/prompt\(/);
const publicPage=await addEmailStatusButtons(new Request('https://www.gnk-asg.hr/automation-status/'),new Response('<html><body>Public</body></html>',{headers:{'content-type':'text/html'}}));assert.doesNotMatch(await publicPage.text(),/gnk-email-tools-hub-v4/);
const asset=await readFile(new URL('../apps/portal/assets/email-tools-hub-v4.js',import.meta.url),'utf8');assert.match(asset,/date=today/);assert.match(asset,/!launcher\.contains\(event\.target\)/);assert.doesNotMatch(asset,/\bprompt\s*\(/);assert.doesNotMatch(asset,/\balert\s*\(/);

const prepared=[],batches=[];class Statement{constructor(sql){this.sql=sql;prepared.push(this)}bind(...values){this.values=values;return this}async all(){if(this.sql.includes('FROM manual_mail_messages'))return{results:[{id:'manual-1',from_email:'office@gnk-asg.hr',to_json:'["recipient@example.com"]',subject:'Test',status:'SENT',provider_json:'[]',error_code:'',error_message:'',created_at:'2026-07-03T08:00:00Z',sent_at:'2026-07-03T08:00:01Z'}]};return{results:[]}}async first(){return null}async run(){return{meta:{changes:1}}}}
const db={prepare:sql=>new Statement(sql),batch:async statements=>{batches.push(statements);return statements.map(()=>({success:true}))}};
const result=await backfillManualMailStatus({GNK_ASG_D1:db});assert.equal(result.ok,true);assert.equal(result.candidateRecipients,1);assert.ok(prepared.some(item=>item.sql.includes('INSERT INTO email_status_records')));assert.ok(batches.length>=2);assert.match(BACKFILL_VERSION,/BACKFILL/);
const summer=emailStatusDayWindow(new Date('2026-07-03T12:00:00Z')),winter=emailStatusDayWindow(new Date('2026-01-03T12:00:00Z')),dst=emailStatusDayWindow(new Date('2026-03-29T12:00:00Z'));
assert.equal(summer.start,'2026-07-02T22:00:00.000Z');assert.equal(summer.end,'2026-07-03T22:00:00.000Z');assert.equal(winter.start,'2026-01-02T23:00:00.000Z');assert.equal(winter.end,'2026-01-03T23:00:00.000Z');assert.equal((Date.parse(dst.end)-Date.parse(dst.start))/3600000,23);assert.match(DATE_VERSION,/DATE_WINDOW/);
console.log(JSON.stringify({ok:true,buttonVersion:BUTTON_VERSION,backfillVersion:BACKFILL_VERSION,dateVersion:DATE_VERSION},null,2));
