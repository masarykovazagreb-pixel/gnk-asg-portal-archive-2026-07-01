import app,{VERSION as V15_VERSION} from './index-unified-auth-v15-final.js';
import {handleMediaRegistrationPublic,handleMediaRegistrationAdmin,PUBLIC_UI,ADMIN_UI,VERSION as REGISTRATION_VERSION} from './media-registration-v1.js';
import {handleControlledMediaTest,VERSION as CONTROLLED_TEST_VERSION} from './media-registration-controlled-test-v1.js';
import {handleFinalMediaConfig,VERSION as FINAL_CONFIG_VERSION} from './media-registration-final-config-v1.js';
import {handleFullEnglishMediaTest,VERSION as FULL_ENGLISH_TEST_VERSION} from './media-registration-full-english-test-v1.js';
import {handleEnglishMediaCampaign,processEnglishInvitationQueue,VERSION as ENGLISH_CAMPAIGN_VERSION} from './media-registration-english-campaign-v1.js';

export const VERSION=`GNK_ASG_ACTIVE_ENTRY_V34_ENGLISH_MEDIA_TO_${V15_VERSION}`;
export const ENTRY_POINT='src/index-admin-hub-v34-english-media.js';
export const FALLBACK_IMAGES_ALLOWED=false;

const PUBLIC_API='/api/media-registration';
const ADMIN_API='/api/media-registration-admin';
const ADMIN_ALIAS='/api/media-portal-admin';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const matches=(path,base)=>path===base||path.startsWith(`${base}/`);
const isPublicRegistration=path=>matches(path,PUBLIC_UI)||matches(path,PUBLIC_API);
const isAdminRegistration=path=>matches(path,ADMIN_UI)||matches(path,ADMIN_API);
const isAdminAlias=path=>matches(path,ADMIN_ALIAS);
const isHtml=response=>String(response.headers.get('content-type')||'').toLowerCase().includes('text/html');

function stamp(response,flow=''){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-active-entry',VERSION);
  headers.set('x-gnk-asg-media-registration',REGISTRATION_VERSION);
  headers.set('x-gnk-asg-controlled-test',CONTROLLED_TEST_VERSION);
  headers.set('x-gnk-asg-final-config',FINAL_CONFIG_VERSION);
  headers.set('x-gnk-asg-full-english-test',FULL_ENGLISH_TEST_VERSION);
  headers.set('x-gnk-asg-english-campaign',ENGLISH_CAMPAIGN_VERSION);
  headers.set('x-gnk-asg-media-registration-routing','ADMIN_ALIAS_V34_ENGLISH');
  if(flow)headers.set('x-gnk-asg-active-flow',flow);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-active-entry':VERSION}});}
async function adminAuthorized(request,env,ctx){
  const probeUrl=new URL('/api/operator-auth-check',request.url),probe=new Request(probeUrl,{method:'GET',headers:request.headers});
  try{return (await app.fetch(probe,env,ctx)).ok;}catch{return false;}
}
function rerouteAdminAlias(request){
  const url=new URL(request.url),path=pathOf(request);
  url.pathname=ADMIN_API+path.slice(ADMIN_ALIAS.length);
  return new Request(url.toString(),request);
}
async function patchAdminChooser(response){
  if(!response.ok||!isHtml(response))return response;let body=await response.text();
  if(!body.includes('/media-registration-admin/'))body=body.replace('</section>','<a class="choice" href="/media-registration-admin/">MEDIA REGISTRATION</a></section>');
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store');return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
async function handleAdminFlow(request,env){
  const fullTest=await handleFullEnglishMediaTest(request,env);if(fullTest)return stamp(fullTest,'FULL_ENGLISH_MEDIA_TEST');
  const english=await handleEnglishMediaCampaign(request,env);if(english)return stamp(english,'ENGLISH_MEDIA_CAMPAIGN');
  const finalConfig=await handleFinalMediaConfig(request,env);if(finalConfig)return stamp(finalConfig,'FINAL_MEDIA_CONFIG');
  const controlled=await handleControlledMediaTest(request,env);if(controlled)return stamp(controlled,'CONTROLLED_MEDIA_TEST_LEGACY');
  const response=await handleMediaRegistrationAdmin(request,env);if(response)return stamp(response,'ADMIN_MEDIA_REGISTRATION');
  return null;
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(isAdminAlias(path)){
      if(!(await adminAuthorized(request,env,ctx)))return json({ok:false,error:'unauthorized'},401);
      const response=await handleAdminFlow(rerouteAdminAlias(request),env);if(response)return response;
    }
    if(isAdminRegistration(path)){
      if(!(await adminAuthorized(request,env,ctx)))return path.startsWith('/api/')?json({ok:false,error:'unauthorized'},401):new Response(null,{status:303,headers:{location:'/admin-center/','cache-control':'no-store'}});
      const response=await handleAdminFlow(request,env);if(response)return response;
    }
    if(isPublicRegistration(path)){
      const response=await handleMediaRegistrationPublic(request,env);if(response)return stamp(response,'PUBLIC_MEDIA_REGISTRATION');
    }
    let response=await app.fetch(request,env,ctx);
    if(request.method==='GET'&&path==='/admin-center')response=await patchAdminChooser(response);
    return stamp(response,'CORE');
  },
  async scheduled(event,env,ctx){
    const task=(async()=>{
      const upstream=typeof app.scheduled==='function'?await app.scheduled(event,env,ctx):null;
      const invitations=await processEnglishInvitationQueue(env).catch(error=>({ok:false,error:String(error?.message||error)}));
      return{upstream,invitations,version:VERSION};
    })();
    if(ctx?.waitUntil){ctx.waitUntil(task);return;}return task;
  },
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
