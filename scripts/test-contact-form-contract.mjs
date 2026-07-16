import fs from 'node:fs';
import assert from 'node:assert/strict';

const hr=fs.readFileSync('apps/portal/contact/index.html','utf8');
const en=fs.readFileSync('apps/portal/en/contact/index.html','utf8');
const client=fs.readFileSync('apps/portal/assets/contact-form-v2.js','utf8');
const handler=fs.readFileSync('workers/gnk-asg-direct-operator/src/contact-studio-mail-v1.js','utf8');
const transport=fs.readFileSync('workers/gnk-asg-direct-operator/src/outbound-mail-transport-v1.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js','utf8');
const signature=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-signature-contract-v1.js','utf8');
const reviewConfig=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.toml','utf8');
const productionConfig=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');

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

assert.match(reviewConfig,/PUBLIC_ENVIRONMENT\s*=\s*"review-[^"]+"/);
for(const flag of ['NEWS_AUTO_PUBLICATION_SCHEDULED_LIVE','MAIL_AUTO_REPLY_LIVE','MAIL_STUDIO_LIVE','MAIL_MANUAL_LIVE']){
 assert.match(reviewConfig,new RegExp(`${flag}\\s*=\\s*"false"`));
}
assert.match(productionConfig,/PUBLIC_ENVIRONMENT\s*=\s*"production-direct-operator"/);
assert.doesNotMatch(productionConfig,/PUBLIC_ENVIRONMENT\s*=\s*"review-[^"]+"/);
for(const flag of ['MAIL_AUTO_REPLY_LIVE','MAIL_STUDIO_LIVE','MAIL_MANUAL_LIVE']){
 assert.match(productionConfig,new RegExp(`${flag}\\s*=\\s*"true"`));
}

console.log(JSON.stringify({ok:true,forms:['hr','en'],endpoint:'/api/contact-submit',payloads:['json','multipart'],storage:'D1',mailTransport:'Cloudflare EmailMessage',mail:['internal','acknowledgement'],inlineLogo:true,reviewMailFailClosed:true,productionMailEnabled:true,mailSent:false},null,2));
