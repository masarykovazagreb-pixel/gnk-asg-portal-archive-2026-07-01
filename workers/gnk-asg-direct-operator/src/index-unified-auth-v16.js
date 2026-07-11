import app,{VERSION as BASE_VERSION} from './index-unified-auth-v15.js';
import {
  withEmailStatusTracking,
  handleEmailStatusRequest,
  syncCloudflareEmailStatuses,
  API_PREFIX as EMAIL_STATUS_API,
  VERSION as EMAIL_STATUS_VERSION
} from './email-status-tracking-v5.js';
import {
  handlePdfCenter,
  API_PREFIX as PDF_CENTER_API,
  VERSION as PDF_CENTER_VERSION
} from './pdf-center-v1.js';
import {
  handleContactCaseCenter,
  API_PREFIX as CONTACT_CASE_API,
  VERSION as CONTACT_CASE_VERSION
} from './contact-case-center-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V33_20260711_PDF_CONTACT_CASE_CENTERS_${EMAIL_STATUS_VERSION}_${BASE_VERSION}`;

const WORKER_OPS_PATH='/worker-ops/';
const WORKER_OPS_LOGIN_NEXT='/operator-dashboard/?workerOpsReturn=1';
const ADMIN_CENTER_PATH='/admin-center/';
const ADMIN_MENU_SCRIPT='/assets/admin-menu-v1.js?v=20260711';
const EMAIL_STATUS_PIXEL_PREFIX=`${EMAIL_STATUS_API}/open/`;

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function isWorkerOpsPath(path){return path==='/worker-ops'||path.startsWith('/worker-ops/');}
function isAdminCenterPath(path){return path==='/admin-center'||path.startsWith('/admin-center/');}
function isEmailStatusApiPath(path){return path===EMAIL_STATUS_API||path.startsWith(`${EMAIL_STATUS_API}/`);}
function isPdfCenterApiPath(path){return path===PDF_CENTER_API||path.startsWith(`${PDF_CENTER_API}/`);}
function isContactCaseApiPath(path){return path===CONTACT_CASE_API||path.startsWith(`${CONTACT_CASE_API}/`);}
function isEmailStatusPixel(path){return path.startsWith(EMAIL_STATUS_PIXEL_PREFIX);}
function trackedEnv(env){return withEmailStatusTracking(env);}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-active-entrypoint':'src/index-unified-auth-v16.js','x-gnk-email-status-tracking':EMAIL_STATUS_VERSION}});}

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v16.js');
  headers.set('x-gnk-worker-ops-entry-guard',VERSION);
  headers.set('x-gnk-admin-center-guard',VERSION);
  headers.set('x-gnk-email-status-tracking',EMAIL_STATUS_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function isAuthenticated(request,env,ctx){
  const target=new URL('/api/operator-auth-check',request.url);
  const check=new Request(target.toString(),{method:'GET',headers:request.headers,redirect:'manual'});
  const response=await app.fetch(check,env,ctx);
  return response.status>=200&&response.status<300;
}

async function loginResponse(request,env,ctx,nextPath){
  const target=new URL('/admin-login/',request.url);
  target.searchParams.set('next',nextPath);
  const loginRequest=new Request(target.toString(),{method:'GET',headers:request.headers,redirect:'manual'});
  return app.fetch(loginRequest,env,ctx);
}

function patchWorkerOpsLoginRedirect(request,response){
  if(response.status<300||response.status>=400)return response;
  const location=response.headers.get('location');
  if(!location)return response;
  try{
    const target=new URL(location,request.url);
    const path=target.pathname.replace(/\/+$/,'')||'/';
    if(path!=='/operator-dashboard'||target.searchParams.get('workerOpsReturn')!=='1')return response;
    const headers=new Headers(response.headers);
    headers.set('location',WORKER_OPS_PATH);
    headers.set('cache-control','no-store');
    headers.set('x-gnk-worker-ops-login-return','redirected');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

function adminAssetPath(path){
  if(path==='/admin-center')return '/admin-center/index.html';
  if(path==='/admin-center/mail-search')return '/admin-center/mail-search/index.html';
  if(path==='/admin-center/pdf')return '/admin-center/pdf/index.html';
  if(path==='/admin-center/contacts')return '/admin-center/contacts/index.html';
  return null;
}

async function adminCenterResponse(request,env,path){
  const assetPath=adminAssetPath(path);
  if(!assetPath||!env.ASSETS?.fetch)return null;
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
  headers.set('x-robots-tag','noindex, nofollow, noarchive');
  headers.set('x-gnk-admin-center','operator-auth-required');
  return new Response(request.method==='HEAD'?null:await response.text(),{status:response.status,statusText:response.statusText,headers});
}

async function injectAdminMenu(request,response){
  const path=pathOf(request);
  if((path!=='/'&&path!=='/en')||response.status!==200)return response;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html'))return response;
  try{
    let html=await response.text();
    if(!html.includes('admin-menu-v1.js')){
      const script=`<script defer src="${ADMIN_MENU_SCRIPT}"></script>`;
      html=html.includes('</body>')?html.replace('</body>',`${script}</body>`):`${html}${script}`;
    }
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-admin-menu','protected-admin-center-v1');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
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
    return new Response(JSON.stringify({
      ...payload,
      deployedEntryPoint:'src/index-unified-auth-v16.js',
      wrapperEntryPoint:'src/index-unified-auth-v16.js',
      workerOpsEntryGuard:VERSION,
      workerOpsDirectAssetGuard:'operator-auth-required',
      workerOpsLoginReturn:'isolated-wrapper-redirect',
      adminCenter:'operator-auth-required',
      adminCenterModules:['/mail-studio/','/campaign-mailer/','/admin-center/mail-search/','/admin-center/pdf/','/admin-center/contacts/'],
      adminMenu:'public-entry-protected-destination',
      emailStatusTracking:EMAIL_STATUS_VERSION,
      pdfCenter:PDF_CENTER_VERSION,
      contactCaseCenter:CONTACT_CASE_VERSION,
      emailStatusApi:'operator-auth-required',
      emailStatusPixel:'public-no-request-metadata',
      scheduledAutomation:'email-status-sync-only',
      lowerScheduledHandlers:'disabled'
    },null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const active=trackedEnv(env),path=pathOf(request);

    if((request.method==='GET'||request.method==='HEAD')&&isAdminCenterPath(path)){
      if(!await isAuthenticated(request,active,ctx)){
        const url=new URL(request.url);
        const next=`${url.pathname}${url.search}`;
        return stamp(await loginResponse(request,active,ctx,next));
      }
      const response=await adminCenterResponse(request,active,path);
      if(response)return stamp(response);
    }

    if(isEmailStatusApiPath(path)){
      if(!isEmailStatusPixel(path)&&!await isAuthenticated(request,active,ctx))return json({ok:false,error:'unauthorized',message:'Operator/admin session required.'},401);
      const tracking=await handleEmailStatusRequest(request,active);
      return stamp(tracking||json({ok:false,error:'not_found'},404));
    }

    if(isPdfCenterApiPath(path)){
      if(!await isAuthenticated(request,active,ctx))return json({ok:false,error:'unauthorized',message:'Operator/admin session required.'},401);
      const pdfResponse=await handlePdfCenter(request,active);
      return stamp(pdfResponse||json({ok:false,error:'not_found'},404));
    }

    if(isContactCaseApiPath(path)){
      if(!await isAuthenticated(request,active,ctx))return json({ok:false,error:'unauthorized',message:'Operator/admin session required.'},401);
      const caseResponse=await handleContactCaseCenter(request,active);
      return stamp(caseResponse||json({ok:false,error:'not_found'},404));
    }

    if((request.method==='GET'||request.method==='HEAD')&&isWorkerOpsPath(path)&&!await isAuthenticated(request,active,ctx)){
      const response=await loginResponse(request,active,ctx,WORKER_OPS_LOGIN_NEXT);
      const patched=patchWorkerOpsLoginRedirect(request,response);
      return stamp(request.method==='HEAD'?new Response(null,{status:patched.status,statusText:patched.statusText,headers:patched.headers}):patched);
    }

    const response=patchWorkerOpsLoginRedirect(request,await app.fetch(request,active,ctx));
    const versionPatched=await patchVersionResponse(request,response);
    return stamp(await injectAdminMenu(request,versionPatched));
  },
  scheduled(event,env,ctx){
    const active=trackedEnv(env);
    const task=Promise.resolve(syncCloudflareEmailStatuses(active));
    if(ctx?.waitUntil){ctx.waitUntil(task);return;}
    return task;
  },
  async email(message,env,ctx){
    const active=trackedEnv(env);
    if(typeof app.email==='function')return app.email(message,active,ctx);
  }
};
