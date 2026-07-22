import assert from 'node:assert/strict';
import fs from 'node:fs';
const mail=fs.readFileSync('workers/gnk-asg-mail-center-worker/src/index.js','utf8');
const transport=fs.readFileSync('workers/gnk-asg-direct-operator/src/outbound-mail-transport-v1.js','utf8');
const status=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-status-tracking-v1.js','utf8');
const config=fs.readFileSync('workers/gnk-asg-mail-center-worker/wrangler.toml','utf8');
const checks={
  wrapperOrder:mail.includes("withEmailStatusTracking(withBrandedMimeTransport(env), 'direct-inbound-auto-reply')"),
  aiRuntime:mail.includes('target = prepareAiAutoReply(message, runtimeEnv)'),
  brandedMime:mail.includes('return sendBrandedEmail(env, payload)'),
  reference:mail.includes("'X-GNK-ASG-Reference': id"),
  messageIdReserved:transport.includes('const messageId=`<${crypto.randomUUID()}@gnk-asg.hr>`'),
  messageIdHeader:transport.includes('`Message-ID: ${messageId}`'),
  messageIdReturned:transport.includes('messageId:prepared.messageId'),
  providerMatch:(status.match(/REPLACE\(REPLACE\(provider_message_id/g)||[]).length>=2,
  d1:config.includes('binding = "GNK_ASG_D1"'),
  opens:config.includes('EMAIL_OPEN_TRACKING_ENABLED = "true"'),
  receipts:config.includes('EMAIL_RECEIPT_CONFIRMATION_ENABLED = "true"')
};
for(const [name,value] of Object.entries(checks))assert.equal(value,true,name);
console.log(JSON.stringify({ok:true,contract:'AI -> Email Status -> branded MIME -> Cloudflare',checks},null,2));
