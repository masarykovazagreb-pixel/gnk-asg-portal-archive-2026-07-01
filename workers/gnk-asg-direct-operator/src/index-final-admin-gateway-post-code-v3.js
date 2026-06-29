import app,{VERSION as BASE_VERSION} from './index-final-admin-gateway-logo-v2.js';
import {handleMediaRegistrationPublic,VERSION as REGISTRATION_VERSION} from './media-registration-post-code-v2.js';

export const VERSION=`GNK_ASG_FINAL_GATEWAY_POST_CODE_V3_TO_${BASE_VERSION}`;
const PUBLIC_UI='/media-application';
const PUBLIC_API='/api/media-registration';
const BLOCKED_POST_PATHS=new Set([
  '/api/media-registration-admin/queue',
  '/api/media-registration-admin/send-test',
  '/api/media-registration-admin/dispatch-one',
  '/api/media-portal-admin/queue',
  '/api/media-portal-admin/send-test',
  '/api/media-portal-admin/dispatch-one'
]);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const matches=(path,base)=>path===base||path.startsWith(`${base}/`);
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-final-post-code':VERSION,'x-gnk-asg-media-registration':REGISTRATION_VERSION}});}
function stamp(response,flow=''){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-final-post-code',VERSION);
  headers.set('x-gnk-asg-media-registration',REGISTRATION_VERSION);
  if(flow)headers.set('x-gnk-asg-post-code-flow',flow);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(request.method==='POST'&&BLOCKED_POST_PATHS.has(path))return json({ok:false,error:'legacy_code_before_registration_blocked',message:'Initial invitations may not contain access codes. Codes are issued only after the newsroom completes initial registration.'},409);
    if(matches(path,PUBLIC_UI)||matches(path,PUBLIC_API)){
      const response=await handleMediaRegistrationPublic(request,env);
      if(response)return stamp(response,'POST_REGISTRATION_CODE');
    }
    return stamp(await app.fetch(request,env,ctx),'BASE');
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
