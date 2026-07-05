import assert from 'node:assert/strict';
import app from '../src/index-unified-auth-v14.js';
import {prepareMailSyncInbound,recordMailSyncOutbound,RETENTION_POLICY} from '../src/mail-sync-center-v2.js';
import {MANDATORY_BCC} from '../src/email-signature-contract-v1.js';
import {__test as facadeTest} from '../src/mail-studio-extension-v4.js';

const origin='https://gnk-asg.hr';
const env={};
const ctx={waitUntil(){}};

for(const route of ['/api/mail-center/sync/health','/api/mail-center/sync/messages?folder=inbox','/api/mail-center/sync/message?id=x']){
 const response=await app.fetch(new Request(origin+route),env,ctx);
 assert.equal(response.status,401,`${route} must require the existing admin session`);
 const payload=await response.json();
 assert.equal(payload.error,'unauthorized');
}

const mapped=facadeTest.mappedRequest(new Request(origin+'/api/mail-center/sync/messages?folder=sent'));
assert.equal(new URL(mapped.url).pathname,'/api/mail-sync/messages');
assert.equal(new URL(mapped.url).searchParams.get('folder'),'sent');
assert.equal(mapped.method,'GET');
assert.equal(RETENTION_POLICY.messageContentDays,365);
assert.equal(RETENTION_POLICY.attachmentDays,365);
assert.equal(RETENTION_POLICY.operationalMetadataDays,2555);
assert.equal(RETENTION_POLICY.legalHoldOverridesDeletion,true);
assert.equal(RETENTION_POLICY.reviewOnly,true);

const executed=[];
const d1={
 prepare(sql){
  const state={sql,binds:[]};
  return{
   bind(...binds){state.binds=binds;return this;},
   async run(){executed.push({...state});return{meta:{changes:1}};},
   async all(){executed.push({...state});return{results:[]};},
   async first(){executed.push({...state});return null;}
  };
 },
 async batch(){return[];}
};

const outbound=await recordMailSyncOutbound({GNK_ASG_D1:d1},{
 sourceId:'outbound-test-1',
 providerMessageId:'<provider-1@example.test>',
 from:{email:'office@gnk-asg.hr',name:'GNK ASG Office'},
 to:['Recipient <recipient@example.test>'],
 bcc:[MANDATORY_BCC],
 subject:'Re: Mail Sync test',
 text:'Body',
 headers:new Headers({
  'In-Reply-To':'<root@example.test>',
  'References':'<root@example.test> <parent@example.test>'
 })
});
assert.equal(outbound.direction,'OUTBOUND');
assert.equal(outbound.status,'SENT');
assert.match(outbound.threadId,/^mid:/);
const insert=executed.find(item=>item.sql.startsWith('INSERT INTO mail_sync_messages'));
assert.ok(insert,'outbound INSERT must execute');
assert.equal((insert.sql.match(/\?/g)||[]).length,insert.binds.length,'mail_sync_messages SQL bind count must match placeholders');
assert.equal(insert.binds[6],'root@example.test');
assert.equal(insert.binds[7],JSON.stringify(['root@example.test','parent@example.test']));
assert.equal(insert.binds[12],JSON.stringify([{email:MANDATORY_BCC,name:''}]));
assert.equal(insert.binds[17],'SENT');
assert.equal(insert.binds[18],'CONTENT_INDEXED');
const stateUpdate=executed.find(item=>item.sql.startsWith('UPDATE mail_sync_state SET last_outbound_at'));
assert.ok(stateUpdate,'mail_sync_state outbound counter update must execute');
assert.equal((stateUpdate.sql.match(/\?/g)||[]).length,stateUpdate.binds.length,'mail_sync_state SQL bind count must match placeholders');

const inboundStart=executed.length;
const boundary='GNK-ASG-MAIL-SYNC-BOUNDARY';
const inboundRaw=[
 'From: Example Sender <sender@example.test>',
 'To: office@gnk-asg.hr',
 'Cc: Archive Observer <observer@example.test>',
 'Subject: Controlled MIME inbox test',
 'Message-ID: <inbound-mime-1@example.test>',
 'In-Reply-To: <provider-1@example.test>',
 'References: <provider-1@example.test>',
 `Content-Type: multipart/mixed; boundary="${boundary}"`,
 '',
 `--${boundary}`,
 'Content-Type: multipart/alternative; boundary="ALT-BOUNDARY"',
 '',
 '--ALT-BOUNDARY',
 'Content-Type: text/plain; charset=utf-8',
 '',
 'Plain controlled inbox content.',
 '--ALT-BOUNDARY',
 'Content-Type: text/html; charset=utf-8',
 '',
 '<html><body><p>HTML controlled inbox content.</p></body></html>',
 '--ALT-BOUNDARY--',
 `--${boundary}`,
 'Content-Type: application/pdf; name="controlled.pdf"',
 'Content-Disposition: attachment; filename="controlled.pdf"',
 'Content-Transfer-Encoding: base64',
 '',
 'JVBERi0xLjQKJSBjb250cm9sbGVkIHRlc3QgUERGCg==',
 `--${boundary}--`,
 ''
].join('\r\n');
const inboundMessage={
 from:'Example Sender <sender@example.test>',
 to:'office@gnk-asg.hr',
 rawSize:new TextEncoder().encode(inboundRaw).byteLength,
 raw:new Blob([inboundRaw]).stream(),
 headers:new Headers({
  from:'Example Sender <sender@example.test>',
  to:'office@gnk-asg.hr',
  cc:'Archive Observer <observer@example.test>',
  subject:'Controlled MIME inbox test',
  'message-id':'<inbound-mime-1@example.test>',
  'in-reply-to':'<provider-1@example.test>',
  references:'<provider-1@example.test>'
 })
};
const preparedInbound=prepareMailSyncInbound(inboundMessage,{GNK_ASG_D1:d1});
assert.notEqual(preparedInbound.message.raw,inboundMessage.raw,'pipeline stream must be separated from capture stream');
const capturedInbound=await preparedInbound.capture;
assert.equal(capturedInbound.direction,'INBOUND');
assert.equal(capturedInbound.profileId,'office');
assert.equal(capturedInbound.mailboxEmail,'office@gnk-asg.hr');
assert.equal(capturedInbound.fromEmail,'sender@example.test');
assert.equal(capturedInbound.attachmentCount,1);
assert.equal(capturedInbound.processingStatus,'CONTENT_INDEXED');
assert.match(capturedInbound.textBody,/Plain controlled inbox content/);
assert.match(capturedInbound.htmlBody,/HTML controlled inbox content/);
assert.match(capturedInbound.threadId,/^mid:/);

const inboundOps=executed.slice(inboundStart);
const inboundInsert=inboundOps.find(item=>item.sql.startsWith('INSERT INTO mail_sync_messages')&&item.binds[1]==='INBOUND');
assert.ok(inboundInsert,'inbound INSERT must execute');
assert.equal((inboundInsert.sql.match(/\?/g)||[]).length,inboundInsert.binds.length,'inbound SQL bind count must match placeholders');
assert.equal(inboundInsert.binds[2],'office');
assert.equal(inboundInsert.binds[3],'office@gnk-asg.hr');
assert.equal(inboundInsert.binds[9],'sender@example.test');
assert.equal(inboundInsert.binds[14],'Controlled MIME inbox test');
assert.match(inboundInsert.binds[15],/Plain controlled inbox content/);
assert.match(inboundInsert.binds[16],/HTML controlled inbox content/);
assert.equal(inboundInsert.binds[18],1);
assert.ok(Number(inboundInsert.binds[19])>0);
assert.equal(inboundInsert.binds[20],'RECEIVED');
assert.equal(inboundInsert.binds[21],'CONTENT_INDEXED');
const inboundStateUpdate=inboundOps.find(item=>item.sql.startsWith('UPDATE mail_sync_state SET last_inbound_at'));
assert.ok(inboundStateUpdate,'mail_sync_state inbound counter update must execute');

console.log('MAIL_SYNC_CENTER_ROUTE_CONTRACT_OK');
