import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const signature=read('workers/gnk-asg-direct-operator/src/email-signature-contract-v1.js');
const mail=read('workers/gnk-asg-direct-operator/src/mail-studio-extension-v3.js');
const gateway=read('workers/gnk-asg-direct-operator/src/index-final-admin-gateway-v2.js');
const runtime=read('workers/gnk-asg-direct-operator/src/index-enterprise-projects-runtime-v1.js');
const wrangler=read('workers/gnk-asg-direct-operator/wrangler.toml');

assert.ok(signature.includes("MANDATORY_BCC='beckuphome@gmail.com'"));
assert.ok(signature.includes("ADDITIONAL_MANDATORY_BCC=['rht@gmx.com']"));
assert.ok(mail.includes('prepareMailSyncInbound'));
assert.ok(mail.includes('recordMailSyncOutbound'));
assert.ok(gateway.includes('handleMailStudioInbound'));
assert.ok(runtime.includes("from './index-final-admin-gateway-v2.js'"));
assert.ok(runtime.includes('x-robots-tag'));
assert.ok(wrangler.includes('MAIL_MANUAL_LIVE = "false"'));
assert.ok(wrangler.includes('MEDIA_OUTREACH_LIVE = "false"'));
assert.ok(wrangler.includes('MAIL_MANDATORY_BCC = "beckuphome@gmail.com"'));

console.log('ENTERPRISE_RUNTIME_CONTRACT_V2_OK');
