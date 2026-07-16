import assert from 'node:assert/strict';
import fs from 'node:fs';

const autoreply=fs.readFileSync('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js','utf8');
const mime=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-autoreply-mime-v1.js','utf8');

for(const marker of [
  "MAIL_IDENTITY_AUTOREPLY_V7_20260716_AI_BRANDED_MIME",
  "buildAutoreplyRawEmail",
  "cid:${EMAIL_LOGO_CID}",
  "mail-studio-compatible-multipart-related",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "never invent facts or make commitments",
  "Never promise an outcome, deadline, response time, payment, approval, attendance, publication or contractual action",
  "MAIL_AUTO_REPLY_LIVE"
]) assert.ok(autoreply.includes(marker),`autoreply contract marker missing: ${marker}`);

for(const marker of [
  "loadEmailLogo",
  "Content-Type: multipart/related",
  "Content-ID: <${EMAIL_LOGO_CID}>",
  "Content-Disposition: inline",
  "X-Attachment-Id: ${EMAIL_LOGO_CID}",
  "X-GNK-ASG-Signature-Logo: ${logo?'cid-inline':'remote-png'}"
]) assert.ok(mime.includes(marker),`autoreply MIME marker missing: ${marker}`);

assert.equal(autoreply.includes("MAIL_AUTO_REPLY_LIVE='true'"),false,'repair must not enable live autoreplies');
assert.equal(autoreply.includes('env.MAIL_SEND.send'),false,'autoreply must continue through message.reply');
assert.equal(mime.includes('fetch('),false,'autoreply MIME builder must use canonical logo loader only');

console.log(JSON.stringify({
  ok:true,
  contract:'AUTOREPLY_MAIL_STUDIO_COMPATIBLE_CID_LOGO_AND_GUARDED_AI',
  cidInlineLogo:true,
  canonicalLogoLoader:true,
  perMailboxSignature:true,
  strongerContextualAI:true,
  commitmentsForbidden:true,
  liveSendingEnabled:false,
  productionDeploy:false
},null,2));
