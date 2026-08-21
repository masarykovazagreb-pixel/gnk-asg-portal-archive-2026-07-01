import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {enforceRequiredSignature,MANDATORY_BCC,ADDITIONAL_MANDATORY_BCC} from '../src/email-signature-contract-v1.js';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

assert.equal(MANDATORY_BCC,'beckuphome@gmail.com','primary mandatory control copy must use beckuphome@gmail.com');
assert.deepEqual(ADDITIONAL_MANDATORY_BCC,['rht@gmx.com'],'additional mandatory control copy must remain explicit and reviewable');

const outbound=enforceRequiredSignature({
  from:{email:'info@gnk-asg.hr',name:'GNK ASG Information Desk'},
  to:'recipient@example.com',
  subject:'Review message',
  text:'Controlled review message.'
});
assert.equal(outbound.bcc,'beckuphome@gmail.com, rht@gmx.com','outbound mail must include all mandatory control-copy addresses');
assert.match(outbound.text,/GNK ASG d\.o\.o\./,'institutional signature must remain attached');

const partiallyVisible=enforceRequiredSignature({
  from:'info@gnk-asg.hr',
  to:'beckuphome@gmail.com',
  subject:'Partial control-copy test',
  text:'Controlled review message.'
});
assert.equal(partiallyVisible.bcc,'rht@gmx.com','a mandatory control-copy already visible in To must not be duplicated, while the remaining mandatory copy stays enforced');

const fullyVisible=enforceRequiredSignature({
  from:'info@gnk-asg.hr',
  to:'beckuphome@gmail.com',
  cc:'rht@gmx.com',
  bcc:'beckuphome@gmail.com; rht@gmx.com',
  subject:'Direct control-copy test',
  text:'Controlled review message.'
});
assert.ok(!fullyVisible.bcc,'mandatory control-copy addresses must not be duplicated when both are already visible');

const wrangler=read('workers/gnk-asg-direct-operator/wrangler.toml');
for(const expected of [
  'MAIL_MANDATORY_BCC = "beckuphome@gmail.com"',
  'MAIL_PROFILE_TEST_RECIPIENTS = "beckuphome@gmail.com"',
  'MEDIA_OUTREACH_TEST_RECIPIENTS = "beckuphome@gmail.com"',
  'MEDIA_OUTREACH_AUTO_TEST_RECIPIENT = "beckuphome@gmail.com"',
  'MEDIA_OUTREACH_REPORT_RECIPIENTS = "beckuphome@gmail.com"'
])assert.ok(wrangler.includes(expected),`review configuration missing ${expected}`);

const projectsGateway=read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-projects-v1.js');
assert.ok(projectsGateway.includes('withRequiredEmailSignature'),'full gateway must enforce the central signature and BCC contract');
assert.ok(projectsGateway.includes('const signed=activeEnv(env)'),'outbound and reply/forward sends must use the signed environment');

const finalGateway=read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js');
const recordIndex=finalGateway.indexOf('await recordInbound(inbound,tracked)');
const studioIndex=finalGateway.indexOf('handleMailStudioInbound(inbound,tracked,ctx,app)');
assert.ok(recordIndex>=0&&studioIndex>recordIndex,'incoming mail must be recorded before Mail Studio processing');
assert.ok(finalGateway.includes('const nextInbound=studio?.message||inbound'),'processed inbound message must continue through the mail chain');

const extension=read('workers/gnk-asg-direct-operator/src/mail-studio-extension-v3.js');
assert.ok(extension.includes('recordMailSyncOutbound'),'Sent/Outbox records must be persisted');
assert.ok(extension.includes('prepareMailSyncInbound'),'Inbox records must be prepared and persisted');

const mediaWrapper=read('workers/gnk-asg-direct-operator/src/index-media-command-center-v20.js');
assert.ok(mediaWrapper.includes('message.forward(MANDATORY_BCC,headers)'),'media inbound copy must use the central primary control-copy address');

const runtime=read('workers/gnk-asg-direct-operator/src/index-enterprise-projects-runtime-v1.js');
assert.ok(runtime.includes("from './index-final-admin-gateway-v2.js'"),'review preview must use the full Mail Studio gateway');
assert.ok(runtime.includes("controlCopy:'beckuphome@gmail.com'"),'admin status must expose the primary control-copy destination');

console.log('EMAIL_CONTROL_COPY_CONTRACT_OK');
