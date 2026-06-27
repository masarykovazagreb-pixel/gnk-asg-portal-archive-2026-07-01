import app from './index-admin-hub-v24-activation.js';
import {
  runMailDeliverySmoke,
  handleMailDeliverySmoke,
  PUBLIC_PATH as MAIL_SMOKE_PATH,
  VERSION as MAIL_SMOKE_VERSION
} from './mail-delivery-smoke-v1.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V25_MAIL_SMOKE_20260627';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-admin-hub-v25',VERSION);
  headers.set('x-gnk-asg-mail-delivery-smoke',MAIL_SMOKE_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    if(pathOf(request)===MAIL_SMOKE_PATH){
      const response=await handleMailDeliverySmoke(request,env);
      if(response)return stamp(response);
    }
    return stamp(await app.fetch(request,env,ctx));
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
