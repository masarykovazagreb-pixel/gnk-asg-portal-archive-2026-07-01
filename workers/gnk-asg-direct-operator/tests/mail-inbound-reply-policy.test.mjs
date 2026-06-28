import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {autoReplyEligibility,buildAutoReplyContent,VERSION} from '../src/mail-inbound-reply-policy-v1.js';

function message(overrides={}){
  const headers=new Headers({
    subject:'Media questions for publication',
    'message-id':'<media-123@example.com>',
    ...(overrides.headers||{})
  });
  return{
    from:'journalist@example.com',
    to:'media@gnk-asg.hr',
    headers,
    ...overrides,
    headers
  };
}

const record={
  caseId:'GNK-ASG-20260628-ABCD1234',
  receivingCenter:{code:'ZAG',cityHr:'Zagreb',countryHr:'Hrvatska',cityEn:'Zagreb',countryEn:'Croatia',labelHr:'Zagreb, Hrvatska · Digitalni centar zaprimanja ZAG',labelEn:'Zagreb, Croatia · Digital Communications Intake Center ZAG'}
};

test('media and press mailboxes are eligible in media-only mode',()=>{
  assert.equal(autoReplyEligibility(message(),{mode:'media-only'}).eligible,true);
  assert.equal(autoReplyEligibility(message({to:'press@gnk-asg.hr'}),{mode:'media-only'}).eligible,true);
  assert.equal(autoReplyEligibility(message({to:'legal@gnk-asg.hr'}),{mode:'media-only'}).reason,'mailbox_not_enabled');
});

test('loop and automation safeguards suppress unsafe replies',()=>{
  assert.equal(autoReplyEligibility(message({from:'no-reply@example.com'})).reason,'automated_sender');
  assert.equal(autoReplyEligibility(message({from:'person@gnk-asg.hr'})).reason,'same_domain_sender');
  assert.equal(autoReplyEligibility(message({headers:{'auto-submitted':'auto-generated'}})).reason,'auto_submitted');
  assert.equal(autoReplyEligibility(message({headers:{'list-id':'news.example.com'}})).reason,'mailing_list');
  assert.equal(autoReplyEligibility(message({headers:{precedence:'bulk'}})).reason,'bulk_or_list');
  assert.equal(autoReplyEligibility(message({headers:{subject:'Automatic reply: away'}})).reason,'automated_subject');
});

test('automatic confirmation contains case ID, center, threading and suppression headers',()=>{
  const content=buildAutoReplyContent(record,message());
  assert.equal(content.sender,'media@gnk-asg.hr');
  assert.equal(content.recipient,'journalist@example.com');
  assert.match(content.text,/GNK-ASG-20260628-ABCD1234/);
  assert.match(content.text,/Digitalni centar zaprimanja/);
  assert.match(content.text,/automatska potvrda primitka/);
  assert.match(content.raw,/In-Reply-To: <media-123@example.com>/);
  assert.match(content.raw,/References: <media-123@example.com>/);
  assert.match(content.raw,/Auto-Submitted: auto-replied/);
  assert.match(content.raw,/X-Auto-Response-Suppress: All/);
  assert.match(content.raw,/Content-Type: multipart\/alternative/);
  assert.equal(VERSION,'GNK_ASG_MAIL_INBOUND_REPLY_POLICY_V1_20260628');
});

test('active service uses atomic D1 claims before replying',()=>{
  const root=path.resolve(import.meta.dirname,'..');
  const service=fs.readFileSync(path.join(root,'src/mail-inbound-auto-reply-v1.js'),'utf8');
  const wrapper=fs.readFileSync(path.join(root,'src/index-project50-v31-mail-inbox.js'),'utf8');
  const migration=fs.readFileSync(path.join(root,'migrations/0025_mail_inbound_auto_reply_claims.sql'),'utf8');
  assert.match(service,/GNK_ASG_MAIL_INBOUND_AUTO_REPLY_V2_ATOMIC_D1_20260628/);
  assert.match(service,/INSERT OR IGNORE INTO mail_inbound_auto_reply_claims/);
  assert.match(service,/changes===1/);
  assert.match(service,/claimStore:'D1'/);
  assert.match(service,/message\.reply\(new EmailMessage/);
  assert.match(service,/already_processed/);
  assert.match(service,/reply_failed/);
  assert.match(migration,/case_id TEXT PRIMARY KEY/);
  assert.ok(service.indexOf('atomicClaim(env,record,message)')<service.indexOf('message.reply(new EmailMessage'));
  assert.match(wrapper,/storeInboundMetadata/);
  assert.match(wrapper,/maybeSendInboundAutoReply/);
  assert.match(wrapper,/processInbound/);
});
