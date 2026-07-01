import {handleMediaCommandCenterEmail} from './media-command-center-v1.js';
import {isMediaInboxMessage,withoutLegacyMediaAcknowledgement,sendGlobalMediaAutoReply} from './media-global-auto-reply-v1.js';
import {withRequiredEmailSignature} from './email-signature-contract-v1.js';
import {withMediaGoldSignature} from './media-email-gold-signature-v1.js';
import {withEmbeddedMediaAutoReplyLogo} from './media-auto-reply-inline-logo-v1.js';

export const VERSION='GNK_ASG_MEDIA_CANONICAL_AUTO_REPLY_V1_20260701';

function replyEnv(env){
  return withRequiredEmailSignature(
    withMediaGoldSignature(
      withEmbeddedMediaAutoReplyLogo(env)
    )
  );
}

export async function handleCanonicalMediaAutoReply(message,env,ctx){
  if(!isMediaInboxMessage(message))return false;
  await handleMediaCommandCenterEmail(message,withoutLegacyMediaAcknowledgement(env),ctx);
  await sendGlobalMediaAutoReply(message,replyEnv(env));
  return true;
}
