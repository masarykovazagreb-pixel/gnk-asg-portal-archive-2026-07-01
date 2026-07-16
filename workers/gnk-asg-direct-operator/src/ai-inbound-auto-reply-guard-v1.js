import {prepareAiAutoReply as basePrepare,VERSION as BASE_VERSION} from './ai-inbound-auto-reply-v2.js';

export const VERSION=`GNK_ASG_AI_INBOUND_AUTO_REPLY_GUARD_V1_20260716_${BASE_VERSION}`;
const clean=value=>String(value??'').trim();
const enabled=value=>/^(1|true|yes|on)$/i.test(clean(value));
const isReview=env=>/^review(?:-|$)/i.test(clean(env?.PUBLIC_ENVIRONMENT));

export function prepareAiAutoReply(message,env){
  if(isReview(env))return{message,env,skipped:'review_environment'};
  if(!enabled(env?.MAIL_AUTO_REPLY_LIVE))return{message,env,skipped:'auto_reply_disabled'};
  if(enabled(env?.AI_AUTO_REPLY_DISABLED))return{message,env,skipped:'ai_auto_reply_disabled'};
  if(!env?.EMAIL?.send)return{message,env,skipped:'email_binding_unavailable'};
  return basePrepare(message,env);
}
