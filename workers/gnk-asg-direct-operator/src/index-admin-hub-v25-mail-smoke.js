import app from './index-admin-hub-v24-activation.js';
import {
  runMailDeliverySmoke,
  handleMailDeliverySmoke,
  PUBLIC_PATH as MAIL_SMOKE_PATH,
  VERSION as MAIL_SMOKE_VERSION
} from './mail-delivery-smoke-v1.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V25_MAIL_SMOKE_20260627_R3';
const DEPLOYMENT_STATUS='/data/deployment-status.json';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-admin-hub-v25',VERSION);
  headers.set('x-gnk-asg-mail-delivery-smoke',MAIL_SMOKE_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function patchDeploymentStatus(response){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    return new Response(JSON.stringify({
      ...payload,
      entryPoint:'src/index-admin-hub-v25-mail-smoke.js',
      manualMailSending:'LIVE_AUTHENTICATED',
      manualMailService:'GNK_ASG_MANUAL_MAIL_SERVICE_V1_20260627',
      manualMailDeliveryHealth:MAIL_SMOKE_PATH,
      manualMailSmoke:MAIL_SMOKE_VERSION,
      mandatoryInternalCopy:'ENFORCED',
      signatureContactPolicy:'NO_PHONE_NO_WHATSAPP',
      mediaBulkSending:'LOCKED'
    },null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(path===MAIL_SMOKE_PATH){
      if(request.method==='GET')await runMailDeliverySmoke(env).catch(()=>null);
      const response=await handleMailDeliverySmoke(request,env);
      if(response)return stamp(response);
    }
    let response=await app.fetch(request,env,ctx);
    if(path===DEPLOYMENT_STATUS&&request.method==='GET')response=await patchDeploymentStatus(response);
    return stamp(response);
  },
  async scheduled(event,env,ctx){
    const smoke=runMailDeliverySmoke(env).catch(error=>({ok:false,error:String(error?.message||error)}));
    const upstream=typeof app.scheduled==='function'?app.scheduled(event,env,ctx):null;
    if(ctx?.waitUntil){
      ctx.waitUntil(smoke);
      if(upstream&&typeof upstream.then==='function')ctx.waitUntil(upstream);
      return;
    }
    return Promise.all([Promise.resolve(upstream),smoke]);
  },
  async email(message,env,ctx){
    if(typeof app.email==='function')return app.email(message,env,ctx);
  }
};
