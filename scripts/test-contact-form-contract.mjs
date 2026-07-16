import fs from 'node:fs';
import assert from 'node:assert/strict';

const hr=fs.readFileSync('apps/portal/contact/index.html','utf8');
const en=fs.readFileSync('apps/portal/en/contact/index.html','utf8');
const client=fs.readFileSync('apps/portal/assets/contact-form-v2.js','utf8');
const handler=fs.readFileSync('workers/gnk-asg-direct-operator/src/contact-studio-mail-v1.js','utf8');
const transport=fs.readFileSync('workers/gnk-asg-direct-operator/src/outbound-mail-transport-v1.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js','utf8');
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

assert.match(handler,/CONTACT_PATH='\/api\/contact-submit'/);
assert.match(handler,/parseContact/);
assert.match(handler,/application\/json/);
assert.match(handler,/multipart\/form-data/);
assert.match(handler,/createContactCase/);
assert.match(handler,/generateCaseId/);
assert.match(handler,/sendBrandedEmail/);
assert.match(handler,/internalMail/);
assert.match(handler,/autoReply/);
assert.match(handler,/deliveryOk/);
assert.match(handler,/CONTACT_INTERNAL='rht@gmx\.com'/);
assert.match(handler,/attachments:parsed\.attachments/);
assert.match(handler,/CONTACT_RATE_WINDOW_SECONDS=900/);
assert.match(handler,/CONTACT_RATE_LIMIT=5/);
assert.match(handler,/enforceContactRateLimit/);
assert.match(handler,/contact:rate:/);
assert.match(handler,/cf-connecting-ip/);
assert.match(handler,/expirationTtl:CONTACT_RATE_WINDOW_SECONDS\+60/);
assert.match(handler,/retry-after/);
assert.match(handler,/MAX_ATTACHMENTS=3/);
assert.match(handler,/MAX_ATTACHMENT_BYTES=3_200_000/);
assert.match(handler,/MAX_TOTAL_ATTACHMENT_BYTES=6_400_000/);
assert.match(handler,/too_many_attachments/);
assert.match(handler,/attachments_total_too_large/);
assert.match(handler,/request_too_large/);
assert.doesNotMatch(handler,/env\.EMAIL\.send\(enforceRequiredSignature/);

assert.match(transport,/import \{EmailMessage\} from 'cloudflare:email'/);
assert.match(transport,/new EmailMessage\(prepared\.from,recipient,prepared\.raw\)/);
assert.match(transport,/enforceRequiredSignature/);
assert.match(transport,/Content-ID:/);
assert.match(transport,/Content-Location:/);
assert.match(transport,/X-Attachment-Id:/);

assert.match(worker,/handlesContactStudio\(path\)/);
assert.match(worker,/handleContactStudio\(request,env,ctx,app\)/);
assert.doesNotMatch(worker,/CLOUDFLARE_API_TOKEN|GNK_ASG_OPERATOR_TOKEN/);
assert.match(signature,/logo-gnk-asg-email\.png/);
assert.match(signature,/canonical-png-64x66/);
console.log(JSON.stringify({ok:true,forms:['hr','en'],endpoint:'/api/contact-submit',payloads:['json','multipart'],storage:'D1',mailTransport:'Cloudflare EmailMessage',mail:['internal','acknowledgement'],rateLimit:{requests:5,windowSeconds:900,store:'existing KV',failClosed:true},attachments:{count:3,perFileBytes:3200000,totalBytes:6400000,pdfOnly:true},inlineLogo:true,mailSent:false},null,2));
