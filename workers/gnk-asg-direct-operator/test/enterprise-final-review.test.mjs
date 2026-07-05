import assert from 'node:assert/strict';
import {
  GLOBAL_CENTRES,
  PROFILES,
  normalizeMailStudioSignature,
  handleMailStudioInbound,
  __test as mail
} from '../src/mail-studio-extension-v3.js';
import {MANDATORY_BCC,enforceRequiredSignature} from '../src/email-signature-contract-v1.js';
import {prepareAiAutoReply,__test as ai} from '../src/ai-inbound-auto-reply-v2.js';

assert.equal(GLOBAL_CENTRES.length,10);
assert.deepEqual(GLOBAL_CENTRES.map(item=>item.id),['new-york','london','paris','frankfurt','dubai','singapore','tokyo','sydney','toronto','zurich']);
for(let index=0;index<10;index+=1)assert.equal(mail.randomCentreIndex(index),index);
assert.equal(mail.randomCentreIndex(10),0);
assert.equal(mail.randomCentreIndex(-1),9);

assert.equal(MANDATORY_BCC,'beckuphome@gmail.com');
for(const profile of Object.values(PROFILES)){
  const normalized=normalizeMailStudioSignature({
    from:{email:profile.email,name:profile.name},
    to:'recipient@example.test',
    text:'Controlled enterprise review message.',
    html:'<p>Controlled enterprise review message.</p>',
    headers:{'X-GNK-ASG-Global-Centre':'London, United Kingdom'}
  });
  assert.match(normalized.text,/Global Service Centre:|Media Relations & Accreditation Center/);
  assert.match(normalized.html,/gnk-asg-email-logo-transparent\.png/);

  const delivered=enforceRequiredSignature(normalized);
  assert.ok(String(delivered.bcc||'').split(/[,;\s]+/).includes(MANDATORY_BCC));
  assert.equal(delivered.headers['X-GNK-ASG-Mandatory-Copy'],'ENFORCED');
  assert.doesNotMatch(delivered.text,/(?:\+385|091|Telefon:|Phone:|WhatsApp|wa\.me)/i);
  assert.doesNotMatch(delivered.html,/(?:\+385|091|Telefon:|Phone:|WhatsApp|wa\.me)/i);
}

const visibleCopy=enforceRequiredSignature({
  from:{email:PROFILES.office.email,name:PROFILES.office.name},
  to:MANDATORY_BCC,
  subject:'Visible control-copy test',
  text:'Controlled message.'
});
assert.ok(!String(visibleCopy.bcc||'').split(/[,;\s]+/).includes(MANDATORY_BCC));

const mime=['From: Example Person <example@invalid.test>',`To: ${PROFILES.office.email}`,'Subject: Inbox persistence test','Message-ID: <enterprise-inbox@example.test>','Content-Type: text/plain; charset=utf-8','','Hello, please confirm receipt.'].join('\r\n');
const inbound=await handleMailStudioInbound({
  from:'Example Person <example@invalid.test>',
  to:PROFILES.office.email,
  headers:new Headers({from:'Example Person <example@invalid.test>',to:PROFILES.office.email,subject:'Inbox persistence test','message-id':'<enterprise-inbox@example.test>'}),
  raw:new Blob([mime]).stream()
},{});
assert.equal(inbound.handled,false);
assert.ok(inbound.message);
assert.match(await new Response(inbound.message.raw).text(),/Inbox persistence test/);

assert.equal(ai.detectLanguage('Poštovani, možete li potvrditi prijavu?'),'hr');
assert.equal(ai.detectLanguage('Guten Tag, können Sie bitte antworten?'),'de');
assert.equal(ai.detectLanguage('Hello, please confirm receipt.'),'en');

const captured=[];
const incoming={from:'John Smith <john@example.test>',to:PROFILES.office.email,headers:new Headers({from:'John Smith <john@example.test>',to:PROFILES.office.email,subject:'Controlled inquiry','message-id':'<enterprise-reply@example.test>'}),raw:new Blob(['Hello, please confirm receipt.\n\nKind regards\nJohn Smith']).stream()};
const prepared=prepareAiAutoReply(incoming,{EMAIL:{async send(payload){captured.push(payload);return{messageId:'reply-1'};}}});
await prepared.env.EMAIL.send({from:{email:PROFILES.office.email,name:PROFILES.office.name},to:'john@example.test',subject:'Re: Controlled inquiry',text:'Your message has been received. Reference GNK-OFFICE-123456.',html:'<p>Your message has been received. Reference GNK-OFFICE-123456.</p>',headers:{'Auto-Submitted':'auto-replied'}});
assert.equal(captured.length,1);
assert.equal(captured[0].headers['X-GNK-ASG-AI-Language'],'en');
assert.match(captured[0].text,/Dear John Smith/);
assert.match(captured[0].text,/GNK-OFFICE-123456/);

console.log('ENTERPRISE_FINAL_REVIEW_TESTS_OK');
