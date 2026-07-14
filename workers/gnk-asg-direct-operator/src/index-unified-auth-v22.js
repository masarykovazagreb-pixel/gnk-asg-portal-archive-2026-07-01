import app,{VERSION as BASE_VERSION} from './index-unified-auth-v21.js';
import {handleEmailStatusRequest,VERSION as EMAIL_STATUS_VERSION} from './email-status-tracking-v5.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V32_DETAILED_EMAIL_STATUS_RECEIPT_${EMAIL_STATUS_VERSION}_${BASE_VERSION}`;
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isPublicReceiptPath=path=>/^\/api\/email-status\/receipt\/[A-Za-z0-9-]{20,80}\/[A-Za-z0-9_-]{40,200}$/.test(path);

export default{
 async fetch(request,env,ctx){
  const path=pathOf(request);
  if(isPublicReceiptPath(path)&&['GET','POST'].includes(request.method)){
   const response=await handleEmailStatusRequest(request,env);
   if(response)return response;
  }
  const response=await app.fetch(request,env,ctx);
  const headers=new Headers(response.headers);
  headers.set('x-gnk-active-release',VERSION);
  headers.set('x-gnk-email-status',EMAIL_STATUS_VERSION);
  headers.set('x-gnk-contrast-runtime','hardened-v4-all-pages-visual');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 },
 scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
 email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
