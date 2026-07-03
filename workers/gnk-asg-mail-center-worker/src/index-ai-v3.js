import app from './index.js';
import {prepareAiAutoReply,VERSION as AI_REPLY_VERSION} from '../../gnk-asg-direct-operator/src/ai-inbound-auto-reply-v2.js';

export const VERSION=`GNK_ASG_MAIL_CENTER_AI_V3_20260703_${AI_REPLY_VERSION}`;

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-mail-center-ai',VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){
    if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);
  },
  async email(message,env,ctx){
    const prepared=prepareAiAutoReply(message,env);
    if(typeof app.email==='function')return app.email(prepared.message,prepared.env,ctx);
  }
};
