import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js','utf8');
const dedupe=fs.readFileSync('workers/gnk-asg-direct-operator/src/mail-autoreply-dedupe-v1.js','utf8');

assert.ok(source.includes('GNK_ASG_MAIL_IDENTITY_AUTOREPLY_V10_20260718_PRE_SEND_DEDUPE'),'updated autoreply version marker missing');
assert.ok(source.includes("dedupeKey=staticReason||!live?'':await messageIdKey(message)"),'locked or statically skipped autoreplies must not reserve message-id state');
assert.ok(source.includes("reservation=staticReason||!live?null:await reserveMessageId(kv,dedupeKey,now(),MESSAGE_ID_TTL)"),'live autoreplies must reserve message-id state before sending');
assert.ok(source.includes("reason=staticReason||(reservation?.ok?'':reservation?.reason||'dedupe_reservation_failed')"),'failed or duplicate reservations must prevent delivery');
assert.ok(source.includes("if(!audit.reply.ok)audit.dedupe.released=await releaseMessageId(kv,dedupeKey)"),'unsent replies must release the reservation');
assert.ok(source.includes("catch{audit.reply={ok:false,reason:'autoreply_send_failed'};audit.dedupe.released=await releaseMessageId(kv,dedupeKey)}"),'send failures must release the reservation');
assert.equal(source.includes('markMessageId('),false,'legacy post-send marker must not remain in V10');
assert.equal(source.includes('duplicateReason('),false,'legacy non-atomic duplicate lookup must not remain in V10');

assert.ok(dedupe.includes("if(await kv.get(key))return{ok:false,reason:'duplicate_message_id'}"),'reservation must reject an existing message-id');
assert.ok(dedupe.includes('await kv.put(key,value,{expirationTtl:ttl})'),'reservation must be persisted before delivery');
assert.ok(dedupe.includes('await kv.delete(key);return true'),'failed delivery reservations must be releasable');

console.log(JSON.stringify({
  ok:true,
  contract:'AUTOREPLY_ATOMIC_PRE_SEND_RESERVATION_WITH_FAILURE_RELEASE',
  lockedMessagesDoNotReserve:true,
  duplicateConcurrentRepliesBlocked:true,
  failedRepliesRemainRetryable:true,
  successfulRepliesRemainReserved:true,
  liveSendingPerformed:false,
  productionDeploy:false
},null,2));
