import fs from 'node:fs';
import assert from 'node:assert/strict';

const hr=fs.readFileSync('apps/portal/contact/index.html','utf8');
const en=fs.readFileSync('apps/portal/en/contact/index.html','utf8');
const client=fs.readFileSync('apps/portal/assets/contact-form-v2.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','utf8');
const signature=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-signature-contract-v1.js','utf8');

for(const page of [hr,en]){
 assert.match(page,/id="contactForm"/);
 assert.match(page,/name="department"/);
 assert.match(page,/name="email" type="email"/);
 assert.match(page,/name="subject"/);
 assert.match(page,/name="message"/);
 assert.match(page,/name="consent"/);
 assert.match(page,/name="website"/);
 assert.match(page,/contact-form-v2\.js/);
 assert.match(page,/logo-gnk-asg-canonical\.svg/);
}
assert.match(client,/fetch\('\/api\/contact-submit'/);
assert.match(client,/content-type':'application\/json/);
assert.match(client,/credentials:'same-origin'/);
assert.match(client,/deliveryOk/);
assert.match(client,/stored\|\|out\.accepted/);
assert.doesNotMatch(client,/alert\(/);

assert.match(worker,/CONTACT_PATH='\/api\/contact-submit'/);
assert.match(worker,/parseContact/);
assert.match(worker,/application\/json/);
assert.match(worker,/multipart\/form-data/);
assert.match(worker,/createContactCase/);
assert.match(worker,/generateCaseId/);
assert.match(worker,/sendSigned/);
assert.match(worker,/enforceRequiredSignature/);
assert.match(worker,/internalMail/);
assert.match(worker,/autoReply/);
assert.match(worker,/deliveryOk/);
assert.match(worker,/status=stored\?\(internalMail\.sent\?201:202\)/);
assert.match(worker,/if\(pathOf\(request\)===CONTACT_PATH\)return handleContact/);
assert.doesNotMatch(worker,/CLOUDFLARE_API_TOKEN|GNK_ASG_OPERATOR_TOKEN/);

assert.match(signature,/logo-gnk-asg-email\.png/);
assert.match(signature,/canonical-png/);
console.log(JSON.stringify({ok:true,forms:['hr','en'],endpoint:'/api/contact-submit',payloads:['json','multipart'],storage:'D1',mail:['internal','acknowledgement'],mailSent:false},null,2));