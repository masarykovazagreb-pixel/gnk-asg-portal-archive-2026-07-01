import app from './index-unified-auth-v14.js';
import {
  patchIndexContractResponse,
  VERSION as INDEX_CONTRACT_INJECTION_VERSION
} from './index-contract-injection-v1.js';
import {
  handleAdminMediaRegistration,
  handlePublicMediaRegistration,
  isAdminMediaRegistrationApi,
  isPublicMediaRegistrationApi,
  VERSION as PUBLIC_MEDIA_REGISTRATION_VERSION
} from './media-public-registration-v1.js';
import {
  isNewsroomServiceAuthenticated
} from './newsroom-service-auth-v1.js';
import {
  handleNewsAutoPublication,
  isNewsAutoPublicationApi,
  VERSION as NEWS_AUTO_PUBLICATION_VERSION
} from './news-auto-publication-v1.js';
import {
  handleAiOperations,
  isAiOperationsApi,
  VERSION as AI_OPERATIONS_VERSION
} from './ai-operations-v1.js';
import {
  handleAiWorkerOrchestrator,
  isAiWorkerOrchestratorApi,
  VERSION as AI_WORKER_ORCHESTRATOR_VERSION
} from './ai-worker-orchestrator-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V30_20260710_WORKER_OPS_PROTECTED_${INDEX_CONTRACT_INJECTION_VERSION}_${PUBLIC_MEDIA_REGISTRATION_VERSION}_${NEWS_AUTO_PUBLICATION_VERSION}_${AI_OPERATIONS_VERSION}_${AI_WORKER_ORCHESTRATOR_VERSION}`;
const MAIL_STUDIO_RUNTIME='GNK_ASG_WEBMAIL_V27_20260709_BCC_SOURCE_CLEANUP';
const AUTO_REPLY_RUNTIME='GNK_ASG_AUTO_REPLY_CASE_CENTER_V1_20260709_PERSONALIZED_AI_SIGNATURES';
const SIGNATURE_CONTRACT='GNK_ASG_EMAIL_SIGNATURE_CONTRACT_V2_20260709_GOLD_LOGO_CASE_AUTO_REPLY';
const AUTO_REPLY_PANEL='/assets/mail-studio-auto-reply-panel-v1.js?v=20260709-auto-reply-panel';
const REFERENCE_GUARD='/assets/mail-studio-reference-code-v1.js?v=20260709-reference-code';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-auth-isolation':VERSION}})}

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-auth-isolation',VERSION);
  headers.set('x-gnk-index-contract-injection',INDEX_CONTRACT_INJECTION_VERSION);
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v15.js');
  headers.set('x-gnk-public-media-registration',PUBLIC_MEDIA_REGISTRATION_VERSION);
  headers.set('x-gnk-news-auto-publication',NEWS_AUTO_PUBLICATION_VERSION);
  headers.set('x-gnk-ai-operations',AI_OPERATIONS_VERSION);
  headers.set('x-gnk-ai-worker-orchestrator',AI_WORKER_ORCHESTRATOR_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function assetPassthrough(request,env){
  if(!env.ASSETS?.fetch)return null;
  const response=await env.ASSETS.fetch(request);
  if(response.status===404)return null;
  const headers=new Headers(response.headers);
  const path=pathOf(request).toLowerCase();
  if(path.endsWith('.js'))headers.set('content-type','application/javascript; charset=utf-8');
  if(path.endsWith('.css'))headers.set('content-type','text/css; charset=utf-8');
  headers.set('x-gnk-asg-auth-isolation',VERSION);
  headers.set('x-gnk-index-contract-injection',INDEX_CONTRACT_INJECTION_VERSION);
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v15.js');
  headers.set('x-gnk-public-media-registration',PUBLIC_MEDIA_REGISTRATION_VERSION);
  headers.set('x-gnk-news-auto-publication',NEWS_AUTO_PUBLICATION_VERSION);
  headers.set('x-gnk-ai-operations',AI_OPERATIONS_VERSION);
  headers.set('x-gnk-ai-worker-orchestrator',AI_WORKER_ORCHESTRATOR_VERSION);
  headers.set('x-content-type-options','nosniff');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function assetIndex(request,env,path){
  if(!env.ASSETS?.fetch)return null;
  const assetPath=path==='/en'?'/en/index.html':'/index.html';
  const target=new URL(assetPath,request.url);
  const response=await env.ASSETS.fetch(new Request(target,{method:'GET',headers:request.headers}));
  if(response.status===404)return null;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-auth-isolation',VERSION);
  headers.set('x-gnk-index-contract-injection',INDEX_CONTRACT_INJECTION_VERSION);
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v15.js');
  headers.set('x-gnk-public-media-registration',PUBLIC_MEDIA_REGISTRATION_VERSION);
  headers.set('x-gnk-news-auto-publication',NEWS_AUTO_PUBLICATION_VERSION);
  headers.set('x-gnk-ai-operations',AI_OPERATIONS_VERSION);
  headers.set('x-gnk-ai-worker-orchestrator',AI_WORKER_ORCHESTRATOR_VERSION);
  headers.set('x-gnk-asg-root-routing','static-asset-index-first');
  return new Response(await response.text(),{status:response.status,statusText:response.statusText,headers});
}

async function isAuthenticated(request,env,ctx){
  const target=new URL('/api/operator-auth-check',request.url);
  const check=new Request(target.toString(),{method:'GET',headers:request.headers,redirect:'manual'});
  const response=await app.fetch(check,env,ctx);
  return response.status>=200&&response.status<300;
}

async function isNewsAutoPublicationAuthenticated(request,env,ctx){
  if(await isNewsroomServiceAuthenticated(request,env))return true;
  return isAuthenticated(request,env,ctx);
}

function injectMailStudioScripts(html){
  let next=html;
  const scripts=[];
  if(!next.includes('mail-studio-auto-reply-panel-v1.js'))scripts.push(`<script defer src="${AUTO_REPLY_PANEL}"></script>`);
  if(!next.includes('mail-studio-reference-code-v1.js'))scripts.push(`<script defer src="${REFERENCE_GUARD}"></script>`);
  if(!scripts.length)return next;
  const bundle=scripts.join('');
  return next.includes('</body>')?next.replace('</body>',`${bundle}</body>`):`${next}${bundle}`;
}

async function protectedAssetPage(request,env,assetPath,extraHeaders={}){
  if(!env.ASSETS?.fetch)return null;
  const target=new URL(assetPath,request.url);
  const response=await env.ASSETS.fetch(new Request(target.toString(),{method:'GET',headers:request.headers}));
  if(response.status===404)return null;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('expires','0');
  headers.set('vary','cookie');
  headers.set('x-gnk-asg-auth-isolation',VERSION);
  headers.set('x-gnk-index-contract-injection',INDEX_CONTRACT_INJECTION_VERSION);
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v15.js');
  headers.set('x-gnk-public-media-registration',PUBLIC_MEDIA_REGISTRATION_VERSION);
  headers.set('x-gnk-news-auto-publication',NEWS_AUTO_PUBLICATION_VERSION);
  headers.set('x-gnk-ai-operations',AI_OPERATIONS_VERSION);
  headers.set('x-gnk-ai-worker-orchestrator',AI_WORKER_ORCHESTRATOR_VERSION);
  headers.set('x-robots-tag','noindex, nofollow, noarchive');
  Object.entries(extraHeaders).forEach(([k,v])=>headers.set(k,v));
  return new Response(await response.text(),{status:response.status,statusText:response.statusText,headers});
}

async function mailStudioV27(request,env){
  const response=await protectedAssetPage(request,env,'/mail-studio/index.html',{
    'x-gnk-asg-mail-studio-runtime':MAIL_STUDIO_RUNTIME,
    'x-gnk-asg-auto-reply-case-center':AUTO_REPLY_RUNTIME,
    'x-gnk-asg-auto-reply-panel':'GNK_ASG_MAIL_STUDIO_AUTO_REPLY_PANEL_V1_20260709',
    'x-gnk-asg-reference-code':'GNK_ASG_MAIL_STUDIO_REFERENCE_CODE_V1_20260709',
    'x-gnk-asg-email-signature-contract':SIGNATURE_CONTRACT,
    'x-gnk-asg-signature-logo':'gold'
  });
  if(!response)return null;
  const html=injectMailStudioScripts(await response.text());
  return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
}

async function workerOpsPage(request,env){
  return protectedAssetPage(request,env,'/worker-ops/index.html',{'x-gnk-worker-ops-dashboard':'protected-worker-operations-v1'});
}

async function patchVersionResponse(request,response){
  if(pathOf(request)!=='/data/portal-version.json'||response.status!==200)return response;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('application/json'))return response;
  try{
    const payload=await response.clone().json();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store');
    headers.set('x-gnk-asg-auth-isolation',VERSION);
    headers.set('x-gnk-index-contract-injection',INDEX_CONTRACT_INJECTION_VERSION);
    headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v15.js');
    headers.set('x-gnk-public-media-registration',PUBLIC_MEDIA_REGISTRATION_VERSION);
    headers.set('x-gnk-news-auto-publication',NEWS_AUTO_PUBLICATION_VERSION);
    headers.set('x-gnk-ai-operations',AI_OPERATIONS_VERSION);
    headers.set('x-gnk-ai-worker-orchestrator',AI_WORKER_ORCHESTRATOR_VERSION);
    return new Response(JSON.stringify({
      ...payload,
      deployedEntryPoint:'src/index-unified-auth-v15.js',
      wrapperEntryPoint:'src/index-unified-auth-v15.js',
      indexContractInjectionVersion:INDEX_CONTRACT_INJECTION_VERSION,
      authIsolationVersion:VERSION,
      publicMediaRegistration:PUBLIC_MEDIA_REGISTRATION_VERSION,
      publicMediaRegistrationFlow:'username-password-self-registration-outside-admin',
      mediaRegistrationAdminReview:'operator-auth-required',
      newsAutoPublication:NEWS_AUTO_PUBLICATION_VERSION,
      newsAutoPublicationFlow:'operator-auth-required-controlled-portal-queue',
      aiOperations:AI_OPERATIONS_VERSION,
      aiWorkerOrchestrator:AI_WORKER_ORCHESTRATOR_VERSION,
      aiWorkerOrchestratorFlow:'operator-auth-required-workers-and-9-projects',
      workerOpsDashboard:'operator-auth-required-protected-page',
      mailStudioRouting:'authenticated-v27-asset-first',
      mailStudioRuntime:MAIL_STUDIO_RUNTIME,
      mailStudioHotfix:'inactive-v26-retired',
      autoReplyCaseCenter:AUTO_REPLY_RUNTIME,
      autoReplyPanel:'GNK_ASG_MAIL_STUDIO_AUTO_REPLY_PANEL_V1_20260709',
      referenceCode:'GNK_ASG_MAIL_STUDIO_REFERENCE_CODE_V1_20260709',
      emailSignatureContract:SIGNATURE_CONTRACT,
      signatureLogo:'gold',
      indexRouting:'static-asset-index-first',
      rootRouting:'static-asset-index-first',
      assetRouting:'asset-passthrough-first'
    },null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

async function isolateLogin(response){
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html')||![401,403,503].includes(response.status))return stamp(response);
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('expires','0');
  headers.set('vary','cookie');
  headers.set('x-gnk-asg-auth-isolation',VERSION);
  headers.set('x-gnk-index-contract-injection',INDEX_CONTRACT_INJECTION_VERSION);
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v15.js');
  headers.set('x-gnk-public-media-registration',PUBLIC_MEDIA_REGISTRATION_VERSION);
  headers.set('x-gnk-news-auto-publication',NEWS_AUTO_PUBLICATION_VERSION);
  headers.set('x-gnk-ai-operations',AI_OPERATIONS_VERSION);
  headers.set('x-gnk-ai-worker-orchestrator',AI_WORKER_ORCHESTRATOR_VERSION);
  let html=await response.text();
  const isolation=`<style id="gnk-auth-page-isolation">html[data-gnk-auth-login="1"] #gnk-backend-shell,html[data-gnk-auth-login="1"] #gnk-admin-module-launcher-v7,html[data-gnk-auth-login="1"] #gnk-admin-lock-notice-v7,html[data-gnk-auth-login="1"] .gnk-admin-shell-lite,html[data-gnk-auth-login="1"] .gnk-shell-wrap,html[data-gnk-auth-login="1"] .gnk-shell-nav,html[data-gnk-auth-login="1"] body>header,html[data-gnk-auth-login="1"] body>nav{display:none!important;visibility:hidden!important;pointer-events:none!important}html[data-gnk-auth-login="1"] body{padding-top:0!important}</style><script id="gnk-auth-page-isolation-script">(()=>{const ids=['gnk-backend-shell','gnk-admin-module-launcher-v7','gnk-admin-lock-notice-v7'];const clean=()=>{ids.forEach(id=>document.getElementById(id)?.remove());document.querySelectorAll('.gnk-admin-shell-lite,.gnk-shell-wrap,.gnk-shell-nav').forEach(el=>el.remove())};clean();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true})})();</script>`;
  html=html.replace(/<html([^>]*)>/i,'<html$1 data-gnk-auth-login="1">');
  html=html.replace(/<body([^>]*)>/i,'<body$1 class="gnk-auth-login-page">');
  html=html.includes('</head>')?html.replace('</head>',`${isolation}</head>`):`${isolation}${html}`;
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(isPublicMediaRegistrationApi(path))return handlePublicMediaRegistration(request,env);
    if(isAdminMediaRegistrationApi(path)){
      if(!await isAuthenticated(request,env,ctx))return json({ok:false,error:'unauthorized',message:'Operator/admin session required.'},401);
      return handleAdminMediaRegistration(request,env);
    }
    if(isNewsAutoPublicationApi(path)){
      if(!await isNewsAutoPublicationAuthenticated(request,env,ctx))return json({ok:false,error:'unauthorized',message:'Operator/admin session or valid service token required.'},401);
      return handleNewsAutoPublication(request,env);
    }
    if(isAiOperationsApi(path)){
      if(!await isAuthenticated(request,env,ctx))return json({ok:false,error:'unauthorized',message:'Operator/admin session required.'},401);
      return handleAiOperations(request,env);
    }
    if(isAiWorkerOrchestratorApi(path)){
      if(!await isAuthenticated(request,env,ctx))return json({ok:false,error:'unauthorized',message:'Operator/admin session required.'},401);
      return handleAiWorkerOrchestrator(request,env);
    }
    if((request.method==='GET'||request.method==='HEAD')&&path==='/worker-ops'){
      if(await isAuthenticated(request,env,ctx)){
        const response=await workerOpsPage(request,env);
        if(response)return request.method==='HEAD'?new Response(null,{status:response.status,statusText:response.statusText,headers:response.headers}):response;
      }
    }
    if((request.method==='GET'||request.method==='HEAD')&&path==='/mail-studio'){
      if(await isAuthenticated(request,env,ctx)){
        const response=await mailStudioV27(request,env);
        if(response)return request.method==='HEAD'?new Response(null,{status:response.status,statusText:response.statusText,headers:response.headers}):response;
      }
    }
    if((request.method==='GET'||request.method==='HEAD')&&(path==='/'||path==='/en')){
      const response=await assetIndex(request,env,path);
      if(response)return request.method==='HEAD'?new Response(null,{status:response.status,statusText:response.statusText,headers:response.headers}):response;
    }
    if(request.method==='GET'&&path.startsWith('/assets/')){
      const response=await assetPassthrough(request,env);
      if(response)return response;
    }
    const response=await app.fetch(request,env,ctx);
    const versionPatched=await patchVersionResponse(request,response);
    const patched=await patchIndexContractResponse(request,versionPatched);
    return isolateLogin(patched);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
