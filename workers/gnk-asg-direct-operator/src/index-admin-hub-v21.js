import app,{INDEX_LOCK_VERSION} from './index-lock-v4.js';
import {handleFaviconAsset,applyFaviconContract,FAVICON_VERSION} from './favicon-contract-v2.js';

const VERSION='GNK_ASG_ADMIN_HUB_V21_20260626_R11_RUNTIME_CONTRACTS';
const HEALTH_VERSION='GNK_ASG_PLATFORM_HEALTH_V1_20260626';
const MARKET_COMPAT_VERSION='GNK_ASG_MARKET_CHART_V3_BLOCK_V1_20260626';
const NEWS_RUNTIME_VERSION='GNK_ASG_NEWS_RUNTIME_CONTRACT_V1_20260626';
const PRIVATE_DATA_PATHS=new Set([
  '/data/media-outreach-contacts-v1.json',
  '/data/media-outreach-contacts.json',
  '/data/media-contacts.json'
]);
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
function privateNotFound(){return new Response('Not found',{status:404,headers:baseHeaders({'content-type':'text/plain; charset=utf-8','x-robots-tag':'noindex, nofollow, noarchive','x-gnk-asg-private-data':'BLOCKED'})});}
function marketV3Shim(request){
  const body='(()=>{window.__GNK_ASG_LIVE_MARKET_CHART_V3__=true;document.getElementById("gnk-live-market-chart-v3")?.remove();document.getElementById("gnk-market-v3-style")?.remove();})();';
  return new Response(request.method==='HEAD'?null:body,{status:200,headers:baseHeaders({'content-type':'application/javascript; charset=utf-8','x-gnk-asg-market-chart-compat':MARKET_COMPAT_VERSION})});
}

async function applyFinalHtmlGuards(response,path){
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!['/','/en'].includes(path)||!type.includes('text/html')||!response.ok)return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-market-chart-compat',MARKET_COMPAT_VERSION);
  let html=await response.text();
  html=html.replace(/<script\b[^>]*\bsrc=["'][^"']*\/assets\/index-live-market-chart-v3\.js[^"']*["'][^>]*>\s*<\/script>/gi,'');
  const guard='<script id="gnk-market-v3-final-guard">(()=>{window.__GNK_ASG_LIVE_MARKET_CHART_V3__=true;const clean=()=>{document.getElementById("gnk-live-market-chart-v3")?.remove();document.getElementById("gnk-market-v3-style")?.remove()};clean();if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",clean,{once:true})})();</script>';
  if(!html.includes('gnk-market-v3-final-guard'))html=html.includes('</body>')?html.replace('</body>',`${guard}</body>`):html+guard;
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function applyNewsStatusContract(response,path){
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(path!=='/data/news-automation-status.json'||!type.includes('application/json')||!response.ok)return response;
  try{
    const payload=await response.json();
    const corrected={
      ...payload,
      timeZone:'Europe/Zagreb',
      newsSchedule:['08:00','16:00','20:00'],
      newsRefreshesPerDay:3,
      activeNewsLimit:100,
      archivePruneAt:1000,
      archiveDeleteCount:500,
      autoEditorSchedule:'every 2 hours',
      runtimeContract:NEWS_RUNTIME_VERSION
    };
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-news-runtime',NEWS_RUNTIME_VERSION);
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

function deploymentStatus(){
  return jsonResponse({
    ok:true,
    service:'gnk-asg-direct-operator',
    entryPoint:'src/index-admin-hub-v21.js',
    adminHub:VERSION,
    indexLock:INDEX_LOCK_VERSION,
    indexHydration:'GNK_ASG_INDEX_SERVER_HYDRATION_V1_20260626',
    publicVisual:'GNK_ASG_PUBLIC_VISUAL_V30_CLEAN_POLISH_20260626',
    indexStyle:'INDEX_STABLE_POLISH_V30',
    contentResilience:'index-content-resilience-v1.js',
    marketChart:'index-live-market-chart-v4.js',
    marketChartCompatibility:MARKET_COMPAT_VERSION,
    newsRuntime:NEWS_RUNTIME_VERSION,
    newsSchedule:['08:00','16:00','20:00'],
    newsActiveLimit:100,
    newsArchivePruneAt:1000,
    newsArchiveDeleteCount:500,
    articleSchedule:'every 2 hours',
    articleAutomation:'GNK_ASG_ARTICLE_AUTOMATION_V2_20260626_R4_EDITORIAL_QA',
    articleAutomationRuntime:'GNK_ASG_ARTICLE_AUTOMATION_V2_20260626_R4_EDITORIAL_QA',
    editorialQa:'GNK_ASG_ARTICLE_EDITORIAL_QA_V1_20260626',
    articleVisual:'GNK_ASG_ARTICLE_VISUAL_V2_20260626',
    publicR2:'GNK_ASG_PUBLIC_R2_V1_20260626',
    favicon:FAVICON_VERSION,
    publicPortal:'src/index-portal-final-v13.js',
    authLayer:'GNK_ASG_UNIFIED_AUTH_V15_20260626_LOGIN_ISOLATION',
    adminSession:'HTTPONLY_COOKIE_ONLY',
    browserTokenStorage:'DISABLED',
    mailStudioAuth:'GNK_ASG_MAIL_STUDIO_AUTH_BRIDGE_V16_20260626_COOKIE_ONLY',
    mediaCommand:'src/index-media-command-center-v21.js',
    mediaCommandWrapper:'GNK_ASG_MEDIA_COMMAND_CENTER_WRAPPER_V21_20260626_R7_INTERNAL_TEST',
    mediaCommandCore:'GNK_ASG_MEDIA_COMMAND_CENTER_V2_20260626_R3_HANDOFF_LOCK',
    mediaControlSync:'GNK_ASG_MEDIA_CONTROL_SYNC_V3_20260626',
    mediaReadiness:'GNK_ASG_MEDIA_READINESS_V2_20260626',
    mediaDelivery:'GNK_ASG_MEDIA_OUTREACH_DELIVERY_V5_20260626_INTERNAL_TEST_GATE',
    mediaDeliveryCore:'GNK_ASG_MEDIA_OUTREACH_DELIVERY_V3_20260626',
    emailSendApi:'CLOUDFLARE_STRUCTURED_SEND_V1',
    contactImport:'HASH_LOCKED_V3',
    contactDataExposure:'BLOCKED',
    handoffManifest:'GNK_ASG_MEDIA_HANDOFF_2026-06-26',
    handoffSha256:'f34dda0a2aa7dfd88128c91a0e359b14ce20ced9bb74e02bcfaad62dfa81012f',
    platformHealth:'/data/platform-health.json',
    d1MigrationMode:'RUNTIME_SCHEMA_FALLBACK',
    internalTestGate:'EPHEMERAL_SECRET_404_BY_DEFAULT',
    testSending:'LOCKED',
    productionSending:'LOCKED',
    deliveryPolicy:{testRequiresAllowlist:true,pdfRequired:true,testGateRequired:true,maxPdfBytes:4194304,maxPerHour:10,maxPerDay:50,dispatchPerCron:1,messageIdRequired:true,actualR2DigestRequired:true},
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
    if(PRIVATE_DATA_PATHS.has(path)&&['GET','HEAD'].includes(request.method))return privateNotFound();
    if(path==='/assets/index-live-market-chart-v3.js'&&['GET','HEAD'].includes(request.method))return marketV3Shim(request);
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
    let response=await applyFaviconContract(request,await app.fetch(request,env,ctx));
    response=await applyFinalHtmlGuards(response,path);
    response=await applyNewsStatusContract(response,path);
    const headers=new Headers(response.headers);
    for(const [name,value] of Object.entries(baseHeaders()))headers.set(name,value);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
