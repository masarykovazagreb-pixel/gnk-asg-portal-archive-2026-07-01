import test from 'node:test';
import assert from 'node:assert/strict';
import {handleMailInbox,INBOX_PATH,VERSION} from '../src/mail-inbox-contact-v1.js';

const records={
  'contact:index':JSON.stringify([{caseId:'GNK-ASG-20260628-ABCD1234',receivedAt:'2026-06-28T09:40:00.000Z',name:'Test Media',email:'news@example.com',subject:'Media enquiry',status:'delivered-internal'}]),
  'contact:GNK-ASG-20260628-ABCD1234':JSON.stringify({caseId:'GNK-ASG-20260628-ABCD1234',receivedAt:'2026-06-28T09:40:00.000Z',mailboxKey:'media',mailboxAddress:'media@gnk-asg.hr',mailboxLabel:'Media',name:'Test Media',email:'news@example.com',subject:'Media enquiry',message:'Please send the approved media information.',status:'delivered-internal',attachmentName:'questions.pdf',attachmentSize:1200,attachmentKey:'contact-pdf/test/questions.pdf',r2Saved:true,source:'public-contact-form',autoReply:{sent:true},internalMail:{sent:true}})
};
const env={GNK_ASG_KV:{get:async key=>records[key]??null}};

test('Mail Studio Inbox returns normalized contact submissions',async()=>{
  const response=await handleMailInbox(new Request(`https://gnk-asg.hr${INBOX_PATH}?limit=20`),env);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-gnk-asg-mail-inbox'),VERSION);
  const payload=await response.json();
  assert.equal(payload.inboundConnected,true);
  assert.equal(payload.count,1);
  assert.equal(payload.items[0].caseId,'GNK-ASG-20260628-ABCD1234');
  assert.equal(payload.items[0].mailboxKey,'media');
  assert.equal(payload.items[0].from.email,'news@example.com');
  assert.equal(payload.items[0].attachment.filename,'questions.pdf');
  assert.equal(payload.items[0].attachment.stored,true);
});

test('Mail Studio Inbox reports missing storage binding',async()=>{
  const response=await handleMailInbox(new Request(`https://gnk-asg.hr${INBOX_PATH}`),{});
  assert.equal(response.status,503);
  const payload=await response.json();
  assert.equal(payload.inboundConnected,false);
  assert.deepEqual(payload.items,[]);
});
