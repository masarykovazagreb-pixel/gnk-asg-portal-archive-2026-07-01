import base,{VERSION as BASE_VERSION} from './index-final-admin-gateway-v2.js';
import app from './index-final-admin-gateway-projects-v1.js';
import {authorizeCampaignMailer} from './campaign-mailer-shell-v2.js';
import {handleEditorialAutonomyApi,isEditorialAutonomyPublicPath,serveEditorialAutonomyPublic,runEditorialAutonomousRelease,VERSION as AUTONOMY_VERSION} from './editorial-autonomous-release-v1.js';

export const VERSION=`GNK_ASG_GATEWAY_V3_REVIEW_${BASE_VERSION}_${AUTONOMY_VERSION}`;
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isAutonomyApi=path=>path==='/api/editorial-operations/autonomous'||path.startsWith('/api/editorial-operations/autonomous/');
const denied=()=>new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-gateway-review':VERSION}});

export default{
 async fetch(request,env,ctx){
   const path=pathOf(request);
   if(isEditorialAutonomyPublicPath(path)){
     const response=await serveEditorialAutonomyPublic(request,env);
     if(response)return response;
   }
   if(isAutonomyApi(path)){
     if(!(await authorizeCampaignMailer(request,env,ctx,app)))return denied();
     const response=await handleEditorialAutonomyApi(request,env);
     if(response)return response;
   }
   return base.fetch(request,env,ctx);
 },
 scheduled(event,env,ctx){
   const task=Promise.allSettled([
     typeof base.scheduled==='function'?base.scheduled(event,env,ctx):Promise.resolve(null),
     runEditorialAutonomousRelease(env)
   ]);
   if(ctx?.waitUntil){ctx.waitUntil(task);return;}
   return task;
 },
 async email(message,env,ctx){
   if(typeof base.email==='function')return base.email(message,env,ctx);
 }
};
