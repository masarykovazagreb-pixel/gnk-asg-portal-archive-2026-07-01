import fs from 'node:fs';
import assert from 'node:assert/strict';

const hr=fs.readFileSync('apps/portal/contact/index.html','utf8');
const en=fs.readFileSync('apps/portal/en/contact/index.html','utf8');
const client=fs.readFileSync('apps/portal/assets/contact-form-v2.js','utf8');
const handler=fs.readFileSync('workers/gnk-asg-direct-operator/src/contact-studio-mail-v1.js','utf8');
const contactAi=fs.readFileSync('workers/gnk-asg-direct-operator/src/contact-ai-reply-v1.js','utf8');
const inboundAiGuard=fs.readFileSync('workers/gnk-asg-direct-operator/src/ai-inbound-auto-reply-guard-v1.js','utf8');
const transport=fs.readFileSync('workers/gnk-asg-direct-operator/src/outbound-mail-transport-v1.js','utf8');
const scheduler=fs.readFileSync('workers/gnk-asg-direct-operator/src/manual-mail-scheduler-v1.js','utf8');
const campaign=fs.readFileSync('workers/gnk-asg-direct-operator/src/campaign-mailer-v2.js','utf8');
const newsGuard=fs.readFileSync('workers/gnk-asg-direct-operator/src/news-market-intelligence-guard-v1.js','utf8');
const gateway=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js','utf8');
const signature=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-signature-contract-v1.js','utf8');
const reviewConfig=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.toml','utf8');
const productionConfig=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.runtime.toml','utf8');

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
assert.match(handler,/createContactAcknowledgement/);
assert.match(handler,/enforceContactRateLimit/);
assert.match(handler,/contact:limit:ip:/);
assert.match(handler,/contact:limit:email:/);
assert.match(handler,/rate_limit_exceeded/);
assert.match(handler,/sendBrandedEmail/);
assert.match(handler,/internalMail/);
assert.match(handler,/autoReply/);
assert.match(handler,/deliveryOk/);
assert.match(handler,/CONTACT_INTERNAL='rht@gmx\.com'/);
assert.match(handler,/attachments:parsed\.attachments/);
assert.match(handler,/Auto-Submitted':'auto-replied/);
assert.doesNotMatch(handler,/env\.EMAIL\.send\(enforceRequiredSignature/);

assert.match(contactAi,/AI_CONTACT_REPLY_LIVE/);
assert.match(contactAi,/deterministic-fallback/);
assert.match(contactAi,/Do not approve accreditation/);
assert.match(contactAi,/No approval, payment confirmation, legal conclusion or binding decision/);
assert.match(contactAi,/createContactAcknowledgement/);

assert.match(inboundAiGuard,/MAIL_AUTO_REPLY_LIVE/);
assert.match(inboundAiGuard,/AI_AUTO_REPLY_DISABLED/);
assert.match(inboundAiGuard,/review_environment/);
assert.match(inboundAiGuard,/auto_reply_disabled/);
assert.match(inboundAiGuard,/email_binding_unavailable/);
assert.match(gateway,/ai-inbound-auto-reply-guard-v1\.js/);
assert.doesNotMatch(gateway,/from '\.\/ai-inbound-auto-reply-v2\.js'/);

assert.match(transport,/import \{EmailMessage\} from 'cloudflare:email'/);
assert.match(transport,/new EmailMessage\(prepared\.from,recipient,prepared\.raw\)/);
assert.match(transport,/enforceRequiredSignature/);
assert.match(transport,/Content-ID:/);
assert.match(transport,/Content-Location:/);
assert.match(transport,/X-Attachment-Id:/);

assert.match(scheduler,/mail-studio-extension-v4\.js/);
assert.doesNotMatch(scheduler,/mail-studio-extension-v2\.js/);
assert.match(scheduler,/review_environment/);
assert.match(scheduler,/manual_mail_disabled/);
assert.match(scheduler,/email_binding_unavailable/);
assert.match(scheduler,/MAIL_MANUAL_LIVE/);
assert.match(scheduler,/PUBLIC_ENVIRONMENT/);

assert.match(campaign,/review_environment/);
assert.match(campaign,/media_outreach_disabled/);
assert.match(campaign,/email_binding_unavailable/);
assert.match(campaign,/MEDIA_OUTREACH_LIVE/);
assert.match(campaign,/PUBLIC_ENVIRONMENT/);

assert.match(newsGuard,/safePublicHttpsUrl/);
assert.match(newsGuard,/unsafe_source_config/);
assert.match(newsGuard,/invalid_source_url/);
assert.match(newsGuard,/localhost/);
assert.ok(newsGuard.includes('192\\.168'));
assert.ok(newsGuard.includes('169\\.254'));
assert.match(gateway,/news-market-intelligence-guard-v1\.js/);
assert.doesNotMatch(gateway,/from '\.\/news-market-intelligence-v1\.js'/);

assert.match(worker,/handlesContactStudio\(path\)/);
assert.match(worker,/handleContactStudio\(request,env,ctx,app\)/);
assert.doesNotMatch(worker,/CLOUDFLARE_API_TOKEN|GNK_ASG_OPERATOR_TOKEN/);
assert.match(signature,/logo-gnk-asg-email\.png/);
assert.match(signature,/canonical-png-64x66/);

assert.match(reviewConfig,/PUBLIC_ENVIRONMENT\s*=\s*"review-[^"]+"/);
for(const flag of ['NEWS_AUTO_PUBLICATION_SCHEDULED_LIVE','MAIL_AUTO_REPLY_LIVE','MAIL_STUDIO_LIVE','MAIL_MANUAL_LIVE','AI_CONTACT_REPLY_LIVE']){
 assert.match(reviewConfig,new RegExp(`${flag}\\s*=\\s*"false"`));
}
assert.match(productionConfig,/PUBLIC_ENVIRONMENT\s*=\s*"production-direct-operator"/);
assert.doesNotMatch(productionConfig,/PUBLIC_ENVIRONMENT\s*=\s*"review-[^"]+"/);
assert.match(productionConfig,/MAIL_AUTO_REPLY_LIVE\s*=\s*"true"/);
assert.match(productionConfig,/AI_AUTO_REPLY_DISABLED\s*=\s*"false"/);
assert.match(productionConfig,/AI_CONTACT_REPLY_LIVE\s*=\s*"true"/);
assert.match(productionConfig,/AI_CONTACT_REPLY_MODEL\s*=\s*"@cf\/meta\/llama-3\.3-70b-instruct-fp8-fast"/);
assert.match(productionConfig,/MAIL_MANUAL_LIVE\s*=\s*"true"/);
for(const flag of ['MAIL_PROFILE_TEST_LIVE','MAIL_BOOTSTRAP_SMOKE_TEST','MEDIA_OUTREACH_LIVE','MEDIA_OUTREACH_SCHEDULED_LIVE','MEDIA_OUTREACH_TEST_LIVE','MEDIA_APPLICATION_AUTO_ACK']){
 assert.match(productionConfig,new RegExp(`${flag}\\s*=\\s*"false"`));
}

console.log(JSON.stringify({ok:true,forms:['hr','en'],endpoint:'/api/contact-submit',payloads:['json','multipart'],storage:'D1',mailTransport:'Cloudflare EmailMessage',mail:['internal','ai-or-deterministic-acknowledgement'],inlineLogo:true,rateLimit:['ip','email'],scheduledMail:{mailStudio:'v4',reviewFailClosed:true,featureFlagRequired:true,emailBindingRequired:true},campaignQueue:{reviewFailClosed:true,featureFlagRequired:true,emailBindingRequired:true},inboundAutoReply:{reviewFailClosed:true,featureFlagRequired:true,killSwitch:true,emailBindingRequired:true},newsIntelligence:{ssrfGuard:true,httpsOnly:true,privateNetworksBlocked:true},reviewMailFailClosed:true,reviewContactAiDisabled:true,productionContactAiEnabled:true,mailSent:false},null,2));
