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
  createContactCase,
  API_PREFIX as CONTACT_CASE_API,
  VERSION as CONTACT_CASE_VERSION
} from './contact-case-center-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V36_20260711_PROTECTED_ADMIN_SHELL_${EMAIL_STATUS_VERSION}_${BASE_VERSION}`;

const WORKER_OPS_PATH='/worker-ops/';
const WORKER_OPS_LOGIN_NEXT='/operator-dashboard/?workerOpsReturn=1';
const ADMIN_CENTER_PATH='/admin-center/';
const ADMIN_MENU_SCRIPT='/assets/admin-menu-v1.js?v=20260720-fix2';
const FLOATING_MENU_SCRIPT='/assets/public-floating-menu-v1.js?v=20260720-fix2';
const EMAIL_STATUS_PIXEL_PREFIX=`${EMAIL_STATUS_API}/open/`;
const PUBLIC_CONTACT_SUBMIT='/api/contact-submit';
const PROTECTED_UI_PREFIXES=[
  '/admin-center',
  '/mail-studio',
  '/campaign-mailer',
  '/media-registration-admin',
  '/operator-dashboard',
  '/digital-headquarters',
  '/email-status',
  '/worker-ops'
];

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function isWorkerOpsPath(path){return path==='/worker-ops'||path.startsWith('/worker-ops/');}
function isAdminCenterPath(path){return path==='/admin-center'||path.startsWith('/admin-center/');}
function isProtectedUiPath(path){return PROTECTED_UI_PREFIXES.some(prefix=>path===prefix||path.startsWith(`${prefix}/`));}
function isEmailStatusApiPath(path){return path===EMAIL_STATUS_API||path.startsWith(`${EMAIL_STATUS_API}/`);}
function isPdfCenterApiPath(path){return path===PDF_CENTER_API||path.startsWith(`${PDF_CENTER_API}/`);}
function isContactCaseApiPath(path){return path===CONTACT_CASE_API||path.startsWith(`${CONTACT_CASE_API}/`);}
function isEmailStatusPixel(path){return path.startsWith(EMAIL_STATUS_PIXEL_PREFIX);}
function trackedEnv(env){return withEmailStatusTracking(env);}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-active-entrypoint':'src/index-unified-auth-v16.js','x-gnk-email-status-tracking':EMAIL_STATUS_VERSION}});}
function clean(value,max=1000){return String(value??'').trim().slice(0,max);}
function hasConsent(value){return value===true||['true','1','yes','on'].includes(String(value??'').trim().toLowerCase());}

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v16.js');
  headers.set('x-gnk-worker-ops-entry-guard',VERSION);
  headers.set('x-gnk-admin-center-guard',VERSION);
  headers.set('x-gnk-protected-ui-guard',VERSION);
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
  if(path==='/admin-center/news-publication')return '/admin-center/news-publication/index.html';
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

async function handlePublicContactSubmit(request,env){
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  if(!env.GNK_ASG_D1)return json({ok:false,error:'contact_storage_unavailable'},503);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=='object')return json({ok:false,error:'invalid_json'},400);
  if(clean(body.website,200))return json({ok:true,accepted:true});
  if(!hasConsent(body.consent))return json({ok:false,error:'consent_required'},400);
  const payload={
    source:`public-contact:${clean(body.department,40)||'contact'}`,
    name:clean(body.name,160),
    email:clean(body.email,200).toLowerCase(),
    subject:clean(body.subject,220),
    message:clean(body.message,8000),
    language:'hr'
  };
  if(!payload.name||!payload.email||!payload.subject||!payload.message)return json({ok:false,error:'missing_required_fields'},400);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email))return json({ok:false,error:'invalid_email'},400);
  try{
    const result=await createContactCase(env,payload);
    return json({ok:true,accepted:true,...result},201);
  }catch(error){
    return json({ok:false,error:'contact_submit_failed'},500);
  }
}

async function injectScript(response,scriptSrc,marker,headerName,headerValue){
  if(response.status!==200)return response;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html'))return response;
  try{
    let html=await response.text();
    if(!html.includes(marker)){
      const script=`<script defer src="${scriptSrc}"></script>`;
      html=html.includes('</body>')?html.replace('</body>',`${script}</body>`):`${html}${script}`;
    }
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set(headerName,headerValue);
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

async function injectAdminMenu(request,response){
  const path=pathOf(request);
  if(path!=='/'&&path!=='/en')return response;
  return injectScript(response,ADMIN_MENU_SCRIPT,'admin-menu-v1.js','x-gnk-admin-menu','protected-admin-center-v1');
}

async function injectProtectedFloatingMenu(request,response){
  if(!isProtectedUiPath(pathOf(request)))return response;
  return injectScript(response,FLOATING_MENU_SCRIPT,'public-floating-menu-v1.js','x-gnk-protected-floating-menu','enabled');
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
      protectedUiPrefixes:PROTECTED_UI_PREFIXES,
      adminCenterModules:['/mail-studio/','/campaign-mailer/','/admin-center/mail-search/','/admin-center/pdf/','/admin-center/contacts/','/admin-center/news-publication/','/media-registration-admin/','/operator-dashboard/','/digital-headquarters/','/email-status/','/worker-ops/'],
      protectedFloatingMenu:'enabled',
      publicContactSubmit:PUBLIC_CONTACT_SUBMIT,
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

    if(path===PUBLIC_CONTACT_SUBMIT)return stamp(await handlePublicContactSubmit(request,active));

    if((request.method==='GET'||request.method==='HEAD')&&isProtectedUiPath(path)){
      if(!await isAuthenticated(request,active,ctx)){
        const url=new URL(request.url);
        const next=isWorkerOpsPath(path)?WORKER_OPS_LOGIN_NEXT:`${url.pathname}${url.search}`;
        const login=await loginResponse(request,active,ctx,next);
        const patched=isWorkerOpsPath(path)?patchWorkerOpsLoginRedirect(request,login):login;
        return stamp(request.method==='HEAD'?new Response(null,{status:patched.status,statusText:patched.statusText,headers:patched.headers}):patched);
      }
      if(isAdminCenterPath(path)){
        const response=await adminCenterResponse(request,active,path);
        if(response)return stamp(await injectProtectedFloatingMenu(request,response));
      }
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

    const response=patchWorkerOpsLoginRedirect(request,await app.fetch(request,active,ctx));
    const versionPatched=await patchVersionResponse(request,response);
    const protectedPatched=await injectProtectedFloatingMenu(request,versionPatched);
    return stamp(await injectAdminMenu(request,protectedPatched));
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
