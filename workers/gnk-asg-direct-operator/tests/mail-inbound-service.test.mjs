import test from 'node:test';
import assert from 'node:assert/strict';
import {storeInboundMetadata,INDEX_KEY,VERSION} from '../src/mail-inbound-service-v1.js';
import {handleMailInbox,INBOX_PATH} from '../src/mail-inbox-contact-v1.js';

function memoryKv(){
  const data=new Map();
  return{
    data,
    async get(key){return data.has(key)?data.get(key):null;},
    async put(key,value){data.set(key,String(value));}
  };
}

function message(){
  return{
    from:'journalist@example.com',
    to:'media@gnk-asg.hr',
    rawSize:4567,
    canBeForwarded:true,
    headers:new Headers({
      subject:'Questions for publication',
      'message-id':'<media-123@example.com>',
      date:'Sun, 28 Jun 2026 10:00:00 +0200'
    })
  };
}

test('direct inbound metadata is stored without consuming MIME content',async()=>{
  const kv=memoryKv();
  const env={GNK_ASG_KV:kv};
  const result=await storeInboundMetadata(message(),env,{receivedAt:'2026-06-28T08:00:00.000Z'});
  assert.equal(result.ok,true);
  assert.equal(result.duplicate,false);
  assert.match(result.record.caseId,/^GNK-ASG-20260628-[A-F0-9]{8}$/);
  assert.equal(result.record.from,'journalist@example.com');
  assert.equal(result.record.to,'media@gnk-asg.hr');
  assert.equal(result.record.mailboxKey,'media');
  assert.equal(result.record.subject,'Questions for publication');
  assert.equal(result.record.contentParsed,false);
  assert.equal(result.record.autoReply.reason,'metadata_only_phase');
  assert.equal(result.record.rawSize,4567);
  assert.ok(result.record.receivingCenter.code);
  assert.ok(kv.data.has(INDEX_KEY));
  assert.equal(VERSION,'GNK_ASG_MAIL_INBOUND_SERVICE_V3_STABLE_MESSAGE_DATE_20260628');
});

test('same Message-ID is deduplicated even when redelivery crosses calendar days',async()=>{
  const kv=memoryKv();
  const env={GNK_ASG_KV:kv};
  const first=await storeInboundMetadata(message(),env,{receivedAt:'2026-06-28T08:00:00.000Z'});
  const second=await storeInboundMetadata(message(),env,{receivedAt:'2026-06-29T09:35:00.000Z'});
  assert.equal(first.record.caseId,second.record.caseId);
  assert.equal(second.duplicate,true);
  assert.equal(JSON.parse(await kv.get(INDEX_KEY)).length,1);
});

test('unified Inbox includes direct email metadata',async()=>{
  const kv=memoryKv();
  const env={GNK_ASG_KV:kv};
  await storeInboundMetadata(message(),env,{receivedAt:'2026-06-28T08:00:00.000Z'});
  const response=await handleMailInbox(new Request(`https://gnk-asg.hr${INBOX_PATH}`),env);
  const payload=await response.json();
  assert.equal(payload.ok,true);
  assert.equal(payload.sources.directEmail,1);
  assert.equal(payload.items[0].source,'direct-email-routing');
  assert.equal(payload.items[0].from.email,'journalist@example.com');
  assert.equal(payload.items[0].contentParsed,false);
  assert.equal(payload.items[0].directEmail.canBeForwarded,true);
});
