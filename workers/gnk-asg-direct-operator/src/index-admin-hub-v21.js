import app,{INDEX_LOCK_VERSION} from './index-lock-v4.js';
import {handleFaviconAsset,applyFaviconContract,FAVICON_VERSION} from './favicon-contract-v2.js';

const VERSION='GNK_ASG_ADMIN_HUB_V21_20260626_R9_ARTICLE_AUTOMATION';
const HEALTH_VERSION='GNK_ASG_PLATFORM_HEALTH_V1_20260626';
const MODULES=new Map([
  ['/operator-dashboard','operator'],
  ['/operator-mobile','mobile'],
  ['/mail-studio','mail'],
  ['/mail-studio-pro','mail'],
  ['/auto-editor','editor'],
  ['/news-admin','news'],
  ['/pdf-publisher','pdf'],
  ['/social-share','social'],
  ['/wa-center','whatsapp'],
  ['/review','overview'],
  ['/media-command-center','media']
]);

function baseHeaders(extra={}){
  return{
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-content-type-options':'nosniff',
    'x-gnk-asg-admin-hub':VERSION,
    'x-gnk-asg-favicon-contract':FAVICON_VERSION,
    'x-gnk-asg-index-lock':INDEX_LOCK_VERSION,
    ...extra
  };
}

function jsonResponse(payload,status=200,extra={}){
  return new Response(JSON.stringify(payload,null,2),{status,headers:baseHeaders({'content-type':'application/json; charset=utf-8',...extra})});
}
function redirect(location){return new Response(null,{status:303,headers:baseHeaders({location})});}

function deploymentStatus(){
  return jsonResponse({
    ok:true,
    service:'gnk-asg-direct-operator',
    entryPoint:'src/index-admin-hub-v21.js',
    adminHub:VERSION,
    indexLock:INDEX_LOCK_VERSION,
    indexHydration:'GNK_ASG_INDEX_SERVER_HYDRATION_V1_20260626',
    publicVisual:'GNK_ASG_PUBLIC_VISUAL_V24_RESILIENT_INDEX_20260626',
    contentResilience:'index-content-resilience-v1.js',
    marketChart:'index-live-market-chart-v4.js',
    articleAutomation:'GNK_ASG_ARTICLE_AUTOMATION_V2_20260626_R2',
    articleAutomationRuntime:'GNK_ASG_ARTICLE_AUTOMATION_V2_20260626_R3_SCHEDULED_CTX',
    articleVisual:'GNK_ASG_ARTICLE_VISUAL_V2_20260626',
    publicR2:'GNK_ASG_PUBLIC_R2_V1_20260626',
    favicon:FAVICON_VERSION,
    publicPortal:'src/index-portal-final-v13.js',
    authLayer:'GNK_ASG_UNIFIED_AUTH_V14_20260626',
    adminSession:'HTTPONLY_COOKIE_ONLY',
    browserTokenStorage:'DISABLED',
    mailStudioAuth:'GNK_ASG_MAIL_STUDIO_AUTH_BRIDGE_V16_20260626_COOKIE_ONLY',
    mediaCommand:'src/index-media-command-center-v21.js',
    mediaCommandWrapper:'GNK_ASG_MEDIA_COMMAND_CENTER_WRAPPER_V21_20260626_R4_DELIVERY',
    mediaCommandCore:'GNK_ASG_MEDIA_COMMAND_CENTER_V2_20260626_R3_HANDOFF_LOCK',
    mediaReadiness:'GNK_ASG_MEDIA_READINESS_V2_20260626',
    mediaDelivery:'GNK_ASG_MEDIA_OUTREACH_DELIVERY_V3_20260626',
    emailSendApi:'CLOUDFLARE_STRUCTURED_SEND_V1',
    contactImport:'HASH_LOCKED_V3',
    handoffManifest:'GNK_ASG_MEDIA_HANDOFF_2026-06-26',
    handoffSha256:'f34dda0a2aa7dfd88128c91a0e359b14ce20ced9bb74e02bcfaad62dfa81012f',
    platformHealth:'/data/platform-health.json',
    d1MigrationMode:'RUNTIME_SCHEMA_FALLBACK',
    testSending:'LOCKED',
    productionSending:'LOCKED',
    deliveryPolicy:{testRequiresAllowlist:true,pdfRequired:true,testGateRequired:true,maxPdfBytes:4194304,maxPerHour:10,maxPerDay:50,dispatchPerCron:1,messageIdRequired:true},
    checkedAt:new Date().toISOString()
  });
}

async function platformHealth(env){
  const kv=env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
  const bindings={
    assets:Boolean(env.ASSETS?.fetch),
    kv:Boolean(kv?.get),
    d1:Boolean(env.GNK_ASG_D1?.prepare),
    r2:Boolean(env.GNK_ASG_MEDIA_ASSETS),
    email:Boolean(env.EMAIL),
    ai:Boolean(env.AI)
  };
  const checks={assets:{ok:bindings.assets},kv:{ok:false},d1:{ok:false}};
  if(bindings.kv){
    try{await kv.get('__gnk_asg_health_probe__');checks.kv.ok=true;}
    catch{checks.kv={ok:false,error:'KV_READ_FAILED'};}
  }else checks.kv={ok:false,error:'KV_BINDING_MISSING'};
  if(bindings.d1){
    try{
      const row=await env.GNK_ASG_D1.prepare('SELECT 1 AS ok').first();
      checks.d1={ok:Number(row?.ok)===1};
      if(!checks.d1.ok)checks.d1.error='D1_UNEXPECTED_RESULT';
    }catch{checks.d1={ok:false,error:'D1_QUERY_FAILED'};}
  }else checks.d1={ok:false,error:'D1_BINDING_MISSING'};
  const ok=checks.assets.ok&&checks.kv.ok&&checks.d1.ok;
  return jsonResponse({ok,version:HEALTH_VERSION,bindings,checks,checkedAt:new Date().toISOString()},ok?200:503,{'x-gnk-asg-platform-health':HEALTH_VERSION});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname.replace(/\/+$/,'')||'/';
    const faviconResponse=await handleFaviconAsset(request,env,path);
    if(faviconResponse)return faviconResponse;
    if(path==='/data/deployment-status.json'&&['GET','HEAD'].includes(request.method)){
      const response=deploymentStatus();
      return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
    }
    if(path==='/data/platform-health.json'&&['GET','HEAD'].includes(request.method)){
      const response=await platformHealth(env);
      return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
    }
    const embedded=url.searchParams.get('embedded')==='1'||url.searchParams.get('standalone')==='1';
    if((path==='/admin'||path==='/operator/session/login')&&['GET','HEAD','POST'].includes(request.method))return redirect('/admin-center/');
    if(MODULES.has(path)&&['GET','HEAD'].includes(request.method)&&!embedded)return redirect(`/admin-center/?module=${encodeURIComponent(MODULES.get(path))}`);
    const response=await applyFaviconContract(request,await app.fetch(request,env,ctx));
    const headers=new Headers(response.headers);
    for(const [name,value] of Object.entries(baseHeaders()))headers.set(name,value);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
