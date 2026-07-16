import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js','utf8');

assert.ok(source.includes('MAIL_IDENTITY_AUTOREPLY_V8_20260716_DEDUPE_AFTER_SEND'),'updated autoreply version marker missing');
assert.ok(source.includes("dedupeReason=staticReason||!live?'':await duplicateReason(message,env)"),'locked autoreplies must not consume message-id dedupe state');
assert.ok(source.includes('if(audit.reply.ok)audit.dedupeMarked=await markMessageId(message,env)'),'message-id must be marked only after successful reply');
assert.equal(source.includes("await kv.put(key,now(),{expirationTtl:MESSAGE_ID_TTL});return''"),false,'duplicate lookup must not write before delivery');

console.log(JSON.stringify({
  ok:true,
  contract:'AUTOREPLY_DEDUPE_ONLY_AFTER_SUCCESSFUL_SEND',
  lockedMessagesRemainRetryable:true,
  failedRepliesRemainRetryable:true,
  successfulRepliesDeduplicated:true,
  liveSendingPerformed:false,
  productionDeploy:false
},null,2));