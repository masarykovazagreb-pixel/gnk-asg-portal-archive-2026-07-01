import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAndStoreInboundContent,MAX_RAW_SIZE,VERSION} from '../src/mail-inbound-parser-v1.js';

function memoryKv(initial={}){
  const data=new Map(Object.entries(initial));
  return{
    data,
    async get(key){return data.has(key)?data.get(key):null;},
    async put(key,value){data.set(key,String(value));}
  };
}

function memoryR2(){
  const data=new Map();
  return{
    data,
    async put(key,value,options){data.set(key,{value:new Uint8Array(value),options});}
  };
}

function streamOf(value){
  const bytes=new TextEncoder().encode(value);
  return{
    bytes,
    stream:new ReadableStream({start(controller){controller.enqueue(bytes);controller.close();}})
  };
}

function multipartMessage(){
  return [
    'From: Journalist Example <journalist@example.com>',
    'To: media@gnk-asg.hr',
    'Subject: Media questions with PDF',
    'Message-ID: <mime-test@example.com>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="mixed-boundary"',
    '',
    '--mixed-boundary',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    'Poštovani,',
    '',
    'Molimo odgovor na priložena pitanja.',
    '',
    '--mixed-boundary',
    'Content-Type: application/pdf; name="questions.pdf"',
    'Content-Disposition: attachment; filename="questions.pdf"',
    'Content-Transfer-Encoding: base64',
    '',
    'JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZz4+ZW5kb2JqCiUlRU9G',
    '--mixed-boundary--',
    ''
  ].join('\r\n');
}

const caseId='GNK-ASG-20260628-ABCD1234';
const baseRecord={
  caseId,
  receivedAt:'2026-06-28T08:00:00.000Z',
  from:'journalist@example.com',
  to:'media@gnk-asg.hr',
  subject:'Metadata subject',
  status:'received-metadata',
  contentParsed:false,
  autoReply:{sent:false}
};

test('PostalMime parser stores plain text and PDF while preserving auto-reply state',async()=>{
  const latest={...baseRecord,status:'received-auto-replied',autoReply:{sent:true,reason:'sent'}};
  const kv=memoryKv({
    [`mail:inbound:${caseId}`]:JSON.stringify(latest),
    'mail:inbound:index':JSON.stringify([{caseId,status:'received-auto-replied'}])
  });
  const r2=memoryR2();
  const source=streamOf(multipartMessage());
  const result=await parseAndStoreInboundContent({raw:source.stream,rawSize:source.bytes.length},{GNK_ASG_KV:kv,GNK_ASG_MEDIA_ASSETS:r2},baseRecord);
  assert.equal(result.ok,true);
  assert.equal(result.parsed,true);
  assert.equal(result.attachmentCount,1);
  assert.equal(result.storedAttachmentCount,1);
  const stored=JSON.parse(await kv.get(`mail:inbound:${caseId}`));
  assert.equal(stored.status,'received-auto-replied-parsed');
  assert.equal(stored.autoReply.sent,true);
  assert.equal(stored.contentParsed,true);
  assert.match(stored.message,/Molimo odgovor na priložena pitanja/);
  assert.equal(stored.fromName,'Journalist Example');
  assert.equal(stored.attachments[0].filename,'questions.pdf');
  assert.equal(stored.attachments[0].stored,true);
  assert.equal(r2.data.size,1);
  const [key,pdf]=[...r2.data.entries()][0];
  assert.match(key,new RegExp(`^mail-inbound/${caseId}/01-questions\\.pdf$`));
  assert.equal(pdf.options.httpMetadata.contentType,'application/pdf');
  assert.equal(VERSION,'GNK_ASG_MAIL_INBOUND_PARSER_V2_STATE_SAFE_20260628');
});

test('oversized raw email is rejected before MIME parsing',async()=>{
  const kv=memoryKv({[`mail:inbound:${caseId}`]:JSON.stringify(baseRecord)});
  const result=await parseAndStoreInboundContent({raw:new ReadableStream(),rawSize:MAX_RAW_SIZE+1},{GNK_ASG_KV:kv},baseRecord);
  assert.equal(result.ok,false);
  assert.equal(result.reason,'raw_message_too_large');
  const stored=JSON.parse(await kv.get(`mail:inbound:${caseId}`));
  assert.equal(stored.contentParsed,false);
  assert.match(stored.status,/parse-failed/);
});

test('HTML-only mail is converted to plain text and scripts are discarded',async()=>{
  const htmlMail=[
    'From: Example <example@example.com>',
    'To: media@gnk-asg.hr',
    'Subject: HTML only',
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    '<html><body><p>Potvrđena pitanja.</p><script>alert(1)</script></body></html>'
  ].join('\r\n');
  const kv=memoryKv({[`mail:inbound:${caseId}`]:JSON.stringify(baseRecord),'mail:inbound:index':'[]'});
  const source=streamOf(htmlMail);
  const result=await parseAndStoreInboundContent({raw:source.stream,rawSize:source.bytes.length},{GNK_ASG_KV:kv},baseRecord);
  assert.equal(result.ok,true);
  const stored=JSON.parse(await kv.get(`mail:inbound:${caseId}`));
  assert.match(stored.message,/Potvrđena pitanja/);
  assert.doesNotMatch(stored.message,/<script|alert\(1\)/i);
});
