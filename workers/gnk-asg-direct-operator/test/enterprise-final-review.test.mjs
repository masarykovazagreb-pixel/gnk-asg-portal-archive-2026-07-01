import assert from 'node:assert/strict';
import {
  GLOBAL_CENTRES,
  PROFILES,
  VERSION as MAIL_STUDIO_SIGNATURE_VERSION,
  normalizeMailStudioSignature,
  __test as mail
} from '../src/mail-studio-extension-v3.js';
import {__test as ai} from '../src/ai-inbound-auto-reply-v2.js';

assert.equal(GLOBAL_CENTRES.length,10);
assert.deepEqual(GLOBAL_CENTRES.map(item=>item.id),['new-york','london','paris','frankfurt','dubai','singapore','tokyo','sydney','toronto','zurich']);
for(let index=0;index<10;index+=1)assert.equal(mail.randomCentreIndex(index),index);
assert.equal(mail.randomCentreIndex(10),0);
assert.equal(mail.randomCentreIndex(-1),9);

let originalKvReads=0;
const randomKv=mail.randomCentreKv({
  async get(key){originalKvReads+=1;return key==='unrelated-key'?'42':'0';},
  async put(){return undefined;}
});
for(const key of ['mail-studio:centre-index:outbound:v1','mail-studio:centre-index:inbound:v1']){
  const selected=Number(await randomKv.get(key));
  assert.ok(Number.isInteger(selected)&&selected>=0&&selected<10);
}
assert.equal(originalKvReads,0);
assert.equal(await randomKv.get('unrelated-key'),'42');
assert.equal(originalKvReads,1);

const fallbackKv=mail.randomCentreKv();
for(const key of ['mail-studio:centre-index:global:v1','mail-studio:centre-index:outbound:v1','mail-studio:centre-index:inbound:v1']){
  const selected=Number(await fallbackKv.get(key));
  assert.ok(Number.isInteger(selected)&&selected>=0&&selected<10);
}
assert.equal(await fallbackKv.get('unrelated-key'),null);
await fallbackKv.put('ignored','value');
const fallbackEnv=mail.withNormalizedEmail({});
const fallbackSelected=Number(await fallbackEnv.GNK_ASG_KV.get('mail-studio:centre-index:outbound:v1'));
assert.ok(Number.isInteger(fallbackSelected)&&fallbackSelected>=0&&fallbackSelected<10);

const institutionalProfile=PROFILES.office;
const normalizedInstitutional=normalizeMailStudioSignature({
  from:{email:institutionalProfile.email,name:institutionalProfile.name},
  text:'Body',
  plainText:'Body',
  html:'<html><body><p>Body</p><table data-gnk-asg-signature="legacy"><tr><td>legacy</td></tr></table></body></html>',
  headers:{'X-GNK-ASG-Global-Centre':'London, United Kingdom'}
});
assert.match(normalizedInstitutional.text,/Global Service Centre: London, United Kingdom/);
assert.equal(normalizedInstitutional.text,normalizedInstitutional.plainText);
assert.equal((normalizedInstitutional.html.match(/data-gnk-asg-signature=/g)||[]).length,1);
assert.match(normalizedInstitutional.html,/gnk-asg-email-logo-transparent\.png/);
assert.doesNotMatch(normalizedInstitutional.html,/gnk-asg-email-logo-final\.png/);
assert.equal(normalizedInstitutional.headers['X-GNK-ASG-Signature-Parity'],MAIL_STUDIO_SIGNATURE_VERSION);
assert.equal(normalizedInstitutional.headers['X-GNK-ASG-Centre-Selection'],'RANDOM_10');

const mediaProfile=PROFILES.media;
const normalizedMedia=normalizeMailStudioSignature({from:{email:mediaProfile.email},text:'Test message',html:'<html><body><p>Test message</p></body></html>'});
assert.match(normalizedMedia.text,/Media Relations & Accreditation Center/);
assert.match(normalizedMedia.html,/gnk-asg-email-logo-transparent\.png/);
assert.equal((normalizedMedia.html.match(/data-gnk-asg-media-signature=/g)||[]).length,1);
assert.equal((normalizedMedia.text.match(/Media Relations & Accreditation Center/g)||[]).length,1);
assert.equal(normalizedMedia.headers['X-GNK-ASG-Centre-Selection'],'RANDOM_10');

for(const profile of Object.values(PROFILES)){
  if(profile.id==='media')continue;
  const message=normalizeMailStudioSignature({from:{email:profile.email},text:'Profile test',html:'<p>Profile test</p>',headers:{'X-GNK-ASG-Global-Centre':'Zagreb, Croatia'}});
  assert.match(message.html,/gnk-asg-email-logo-transparent\.png/);
  assert.equal((message.html.match(/data-gnk-asg-signature=/g)||[]).length,1);
  assert.equal((message.text.match(/Global Service Centre:/g)||[]).length,1);
}

assert.equal(ai.detectLanguage('Poštovani, možete li potvrditi prijavu?'),'hr');
assert.equal(ai.detectLanguage('Guten Tag, können Sie bitte antworten?'),'de');
assert.equal(ai.detectLanguage('Hello, please confirm receipt.'),'en');
assert.equal(ai.signatureName('Thank you\n\nKind regards\nExample Person','example@invalid.test'),'Example Person');

const incoming={from:'Example Person <example@invalid.test>',to:mediaProfile.email,headers:new Headers({from:'Example Person <example@invalid.test>',to:mediaProfile.email})};
const automaticPayload={from:{email:mediaProfile.email},to:'example@invalid.test',subject:'Re: Accreditation request',text:'Your message has been received.',headers:{'Auto-Submitted':'auto-replied'}};
assert.equal(ai.isAutomaticReply(automaticPayload,incoming),true);
assert.equal(ai.isAutomaticReply({...automaticPayload,headers:{},subject:'New message',text:'Manual note'},incoming),false);

console.log('ENTERPRISE_FINAL_REVIEW_UNIT_TESTS_OK');
