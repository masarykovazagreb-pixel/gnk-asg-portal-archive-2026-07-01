import app,{VERSION as V15_VERSION} from './index-unified-auth-v15-final.js';
import {handleMediaRegistrationPublic,handleMediaRegistrationAdmin,processMediaInvitationQueue,PUBLIC_UI,ADMIN_UI,VERSION as REGISTRATION_VERSION} from './media-registration-v1.js';

export const VERSION=`GNK_ASG_ACTIVE_ENTRY_V29_MEDIA_REGISTRATION_TO_${V15_VERSION}`;
export const ENTRY_POINT='src/index-admin-hub-v28-news-no-fallback.js';
export const MEDIA_CONTACT_SEED_STATUS='INCOMPLETE_22_OF_42';
export const FALLBACK_IMAGES_ALLOWED=false;

const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isPublicRegistration=path=>path===PUBLIC_UI||path.startsWith(`${PUBLIC_UI}/`)||path.startsWith('/api/media-registration');
const isAdminRegistration=path=>path===ADMIN_UI||path.startsWith(`${ADMIN_UI}/`)||path.startsWith('/api/media-registration-admin');
const isHtml=response=>String(response.headers.get('content-type')||'').toLowerCase().includes('text/html');

function stamp(response,flow=''){
  const headers=new Headers(response.headers);headers.set('x-gnk-asg-active-entry',VERSION);headers.set('x-gnk-asg-media-registration',REGISTRATION_VERSION);if(flow)headers.set('x-gnk-asg-active-flow',flow);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-active-entry':VERSION,'x-gnk-asg-media-registration':REGISTRATION_VERSION}});}
async function adminAuthorized(request,env,ctx){
  const probeUrl=new URL('/api/operator-auth-check',request.url),probe=new Request(probeUrl,{method:'GET',headers:request.headers});
  try{return (await app.fetch(probe,env,ctx)).ok;}catch{return false;}
}
async function patchAdminChooser(response){
  if(!response.ok||!isHtml(response))return response;let body=await response.text();
  if(!body.includes('/media-registration-admin/'))body=body.replace('</section>','<a class="choice" href="/media-registration-admin/">MEDIA REGISTRATION</a></section>');
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store');return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(isPublicRegistration(path)){const response=await handleMediaRegistrationPublic(request,env);if(response)return stamp(response,'PUBLIC_MEDIA_REGISTRATION');}
    if(isAdminRegistration(path)){
      if(!(await adminAuthorized(request,env,ctx)))return path.startsWith('/api/')?json({ok:false,error:'unauthorized'},401):new Response(null,{status:303,headers:{location:'/admin-center/','cache-control':'no-store'}});
      const response=await handleMediaRegistrationAdmin(request,env);if(response)return stamp(response,'ADMIN_MEDIA_REGISTRATION');
    }
    let response=await app.fetch(request,env,ctx);
    if(request.method==='GET'&&path==='/admin-center')response=await patchAdminChooser(response);
    return stamp(response,'CORE');
  },
  async scheduled(event,env,ctx){
    const task=(async()=>{
      const upstream=typeof app.scheduled==='function'?await app.scheduled(event,env,ctx):null;
      const invitations=await processMediaInvitationQueue(env).catch(error=>({ok:false,error:String(error?.message||error)}));
      return{upstream,invitations,version:VERSION};
    })();
    if(ctx?.waitUntil){ctx.waitUntil(task);return;}return task;
  },
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};