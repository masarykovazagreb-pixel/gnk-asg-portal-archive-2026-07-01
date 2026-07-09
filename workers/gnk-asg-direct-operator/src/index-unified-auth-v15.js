import app from './index-unified-auth-v14.js';
import {
  patchIndexContractResponse,
  VERSION as INDEX_CONTRACT_INJECTION_VERSION
} from './index-contract-injection-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V26_20260709_MEDIA_USER_PASSWORD_${INDEX_CONTRACT_INJECTION_VERSION}`;
const MAIL_STUDIO_RUNTIME='GNK_ASG_WEBMAIL_V27_20260709_BCC_SOURCE_CLEANUP';
const AUTO_REPLY_RUNTIME='GNK_ASG_AUTO_REPLY_CASE_CENTER_V1_20260709_PERSONALIZED_AI_SIGNATURES';
const SIGNATURE_CONTRACT='GNK_ASG_EMAIL_SIGNATURE_CONTRACT_V2_20260709_GOLD_LOGO_CASE_AUTO_REPLY';
const AUTO_REPLY_PANEL='/assets/mail-studio-auto-reply-panel-v1.js?v=20260709-auto-reply-panel';
const REFERENCE_GUARD='/assets/mail-studio-reference-code-v1.js?v=20260709-reference-code';
const MEDIA_COOKIE='gnk_media_session';
const MEDIA_MAX_AGE=60*60*24*30;
const MEDIA_DEADLINE='2026-07-20T23:59:00+02:00';
const enc=new TextEncoder();

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-auth-isolation',VERSION);
  headers.set('x-gnk-index-contract-injection',INDEX_CONTRACT_INJECTION_VERSION);
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v15.js');
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
  headers.set('x-gnk-asg-root-routing','static-asset-index-first');
  return new Response(await response.text(),{status:response.status,statusText:response.statusText,headers});
}

const mediaStore=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const clean=(value,max=500)=>String(value||'').replace(/\u0000/g,'').trim().slice(0,max);
const mediaNow=()=>new Date().toISOString();
const mediaId=prefix=>`${prefix}-${mediaNow().replace(/[-:.TZ]/g,'').slice(0,14)}-${crypto.randomUUID().slice(0,8)}`;
const userKey=username=>`media:user:${clean(username,160).toLowerCase()}`;
const sessionKey=sid=>`media:session:${clean(sid,220)}`;
function mediaHeaders(extra={}){return{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-gnk-asg-auth-isolation':VERSION,'x-gnk-media-registration':'open-user-password-v1',...extra};}
function mediaJson(data,status=200,extra={}){return new Response(JSON.stringify(data,null,2),{status,headers:mediaHeaders(extra)});}
async function readMediaBody(request){try{return await request.json()}catch{return{}}}
async function sha256(value){const digest=await crypto.subtle.digest('SHA-256',enc.encode(String(value||'')));return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function randomToken(bytes=18){const arr=new Uint8Array(bytes);crypto.getRandomValues(arr);return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
async function passwordRecord(password){const salt=randomToken(18);return{salt,hash:await sha256(`${salt}:${password}`),algo:'sha256-salted-v1'};}
async function passwordOk(password,record){return Boolean(record?.salt&&record?.hash&&await sha256(`${record.salt}:${password}`)===record.hash)}
function cookieValue(request,name){for(const part of (request.headers.get('cookie')||'').split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===name){try{return decodeURIComponent(part.slice(i+1).trim())}catch{return''}}}return''}
function mediaSessionCookie(sid){return`${MEDIA_COOKIE}=${encodeURIComponent(sid)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MEDIA_MAX_AGE}`}
function clearMediaCookie(){return`${MEDIA_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}
function publicMediaSession(user){return{username:user.username,email:user.email,outlet:user.outlet,mailCode:user.mailCode,applicationId:user.applicationId||null,status:user.status||'DRAFT',data:user.data||{},createdAt:user.createdAt,updatedAt:user.updatedAt};}
async function getCurrentMediaUser(request,env){const kv=mediaStore(env),sid=cookieValue(request,MEDIA_COOKIE);if(!kv||!sid)return null;const session=await kv.get(sessionKey(sid),'json').catch(()=>null);if(!session||session.expiresAt<Date.now())return null;const user=await kv.get(userKey(session.username),'json').catch(()=>null);return user?{user,sid}:null;}
async function saveMediaUser(env,user){const kv=mediaStore(env);if(!kv)throw new Error('media_store_missing');user.updatedAt=mediaNow();await kv.put(userKey(user.username),JSON.stringify(user,null,2));return user;}
async function createMediaSession(env,username){const kv=mediaStore(env),sid=randomToken(32),expiresAt=Date.now()+MEDIA_MAX_AGE*1000;await kv.put(sessionKey(sid),JSON.stringify({username,createdAt:mediaNow(),expiresAt}),{expirationTtl:MEDIA_MAX_AGE});return sid;}
function mediaConfig(){return{ok:true,mode:'open_user_password',deadline:MEDIA_DEADLINE,maxDelegates:3,registrationOpen:true,credentials:'username_password',legacyCredentialsAccepted:false};}
async function handleMediaRegistration(request,env){
  const kv=mediaStore(env),path=pathOf(request).replace('/api/media-registration','')||'/';
  if(!kv)return mediaJson({ok:false,error:'media_store_missing',message:'Media registration store is not configured.'},503);
  if(request.method==='GET'&&path==='/config')return mediaJson(mediaConfig());
  if(request.method==='POST'&&path==='/register'){
    const body=await readMediaBody(request),outlet=clean(body.outlet||body.newsroom||body.legalName||body.company,220),email=clean(body.email||body.officialEmail,220).toLowerCase(),username=clean(body.username||email,160).toLowerCase(),password=String(body.password||'');
    if(!outlet)return mediaJson({ok:false,error:'required_fields_missing',missing:['outlet']},400);
    if(!/^\S+@\S+\.\S+$/.test(email))return mediaJson({ok:false,error:'invalid_email'},400);
    if(!/^[a-z0-9._%+-]{3,160}$/i.test(username))return mediaJson({ok:false,error:'invalid_username'},400);
    if(password.length<8)return mediaJson({ok:false,error:'weak_password',message:'Password must have at least 8 characters.'},400);
    if(await kv.get(userKey(username)))return mediaJson({ok:false,error:'username_taken'},409);
    const pass=await passwordRecord(password),user={username,email,outlet,pass,createdAt:mediaNow(),updatedAt:mediaNow(),mailCode:`GNK-MEDIA-2026-${randomToken(6).toUpperCase()}`,applicationId:null,status:'DRAFT',revision:0,data:{newsroom:{legalName:outlet,brandName:outlet,editorEmail:email},participants:[{officialEmail:email}]},documents:[],source:'open-user-password-registration'};
    await saveMediaUser(env,user);
    const sid=await createMediaSession(env,username);
    return mediaJson({ok:true,registered:true,session:publicMediaSession(user),config:mediaConfig()},200,{'set-cookie':mediaSessionCookie(sid)});
  }
  if(request.method==='POST'&&path==='/login'){
    const body=await readMediaBody(request),username=clean(body.username||body.email||body.mailCode,160).toLowerCase(),password=String(body.password||body.pin||'');
    const user=await kv.get(userKey(username),'json').catch(()=>null);
    if(!user||!(await passwordOk(password,user.pass)))return mediaJson({ok:false,error:'invalid_credentials'},401);
    const sid=await createMediaSession(env,user.username);
    return mediaJson({ok:true,authenticated:true,session:publicMediaSession(user),config:mediaConfig()},200,{'set-cookie':mediaSessionCookie(sid)});
  }
  if(request.method==='GET'&&path==='/session'){
    const current=await getCurrentMediaUser(request,env);
    if(!current)return mediaJson({ok:false,error:'no_session'},401);
    return mediaJson({ok:true,session:publicMediaSession(current.user),config:mediaConfig()});
  }
  if(request.method==='GET'&&path==='/draft'){
    const current=await getCurrentMediaUser(request,env);
    if(!current)return mediaJson({ok:false,error:'no_session'},401);
    return mediaJson({ok:true,session:publicMediaSession(current.user),documents:current.user.documents||[],config:mediaConfig()});
  }
  if(request.method==='PUT'&&path==='/draft'){
    const current=await getCurrentMediaUser(request,env);
    if(!current)return mediaJson({ok:false,error:'no_session'},401);
    const body=await readMediaBody(request);
    current.user.data=body.data||{};
    current.user.revision=Number(current.user.revision||0)+1;
    await saveMediaUser(env,current.user);
    return mediaJson({ok:true,revision:current.user.revision,session:publicMediaSession(current.user)});
  }
  if(request.method==='POST'&&path==='/submit'){
    const current=await getCurrentMediaUser(request,env);
    if(!current)return mediaJson({ok:false,error:'no_session'},401);
    const data=current.user.data||{},missing=[];
    if(!clean(data.newsroom?.legalName||current.user.outlet))missing.push('newsroom.legalName');
    const first=(Array.isArray(data.participants)&&data.participants[0])||{};
    if(!clean(first.fullName))missing.push('participants[0].fullName');
    if(!clean(first.officialEmail||current.user.email))missing.push('participants[0].officialEmail');
    if(!data.declarations?.newsroomAuthorization)missing.push('declarations.newsroomAuthorization');
    if(!data.declarations?.privacyConsent)missing.push('declarations.privacyConsent');
    if(!data.declarations?.accuracy)missing.push('declarations.accuracy');
    if(missing.length)return mediaJson({ok:false,error:'required_fields_missing',missing},400);
    current.user.status='SUBMITTED';
    current.user.applicationId=current.user.applicationId||`GNK-MEDIA-APP-${mediaNow().replace(/[-:.TZ]/g,'').slice(0,14)}`;
    current.user.submittedAt=mediaNow();
    await saveMediaUser(env,current.user);
    return mediaJson({ok:true,applicationId:current.user.applicationId,status:current.user.status,message:'Application received and remains editable.'});
  }
  if(request.method==='POST'&&path==='/document'){
    const current=await getCurrentMediaUser(request,env);
    if(!current)return mediaJson({ok:false,error:'no_session'},401);
    const form=await request.formData().catch(()=>null),file=form?.get('file'),category=clean(form?.get('category')||'document',80);
    if(category==='passport'&&!['APPROVED','TRAVEL_CONFIRMED','NEEDS_TRAVEL_DOCUMENTS'].includes(String(current.user.status||'').toUpperCase()))return mediaJson({ok:false,error:'passport_locked_until_approval'},403);
    if(!file||typeof file!=='object'||!('name'in file))return mediaJson({ok:false,error:'missing_file'},400);
    const document={id:mediaId('doc'),filename:clean(file.name,240),category,size_bytes:Number(file.size||0),content_type:clean(file.type,120),uploadedAt:mediaNow(),stored:'metadata_only'};
    current.user.documents=[document,...(current.user.documents||[])].slice(0,30);
    await saveMediaUser(env,current.user);
    return mediaJson({ok:true,document});
  }
  if(request.method==='POST'&&path==='/logout')return mediaJson({ok:true,loggedOut:true},200,{'set-cookie':clearMediaCookie()});
  return mediaJson({ok:false,error:'media_registration_not_found',path},404);
}

async function isAuthenticated(request,env,ctx){
  const target=new URL('/api/operator-auth-check',request.url);
  const check=new Request(target.toString(),{
    method:'GET',
    headers:request.headers,
    redirect:'manual'
  });
  const response=await app.fetch(check,env,ctx);
  return response.status>=200&&response.status<300;
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

async function mailStudioV27(request,env){
  if(!env.ASSETS?.fetch)return null;
  const target=new URL('/mail-studio/index.html',request.url);
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
  headers.set('x-gnk-asg-mail-studio-runtime',MAIL_STUDIO_RUNTIME);
  headers.set('x-gnk-asg-auto-reply-case-center',AUTO_REPLY_RUNTIME);
  headers.set('x-gnk-asg-auto-reply-panel','GNK_ASG_MAIL_STUDIO_AUTO_REPLY_PANEL_V1_20260709');
  headers.set('x-gnk-asg-reference-code','GNK_ASG_MAIL_STUDIO_REFERENCE_CODE_V1_20260709');
  headers.set('x-gnk-asg-email-signature-contract',SIGNATURE_CONTRACT);
  headers.set('x-gnk-asg-signature-logo','gold');
  headers.set('x-robots-tag','noindex, nofollow, noarchive');
  const html=injectMailStudioScripts(await response.text());
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
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
    return new Response(JSON.stringify({
      ...payload,
      deployedEntryPoint:'src/index-unified-auth-v15.js',
      wrapperEntryPoint:'src/index-unified-auth-v15.js',
      indexContractInjectionVersion:INDEX_CONTRACT_INJECTION_VERSION,
      authIsolationVersion:VERSION,
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
      assetRouting:'asset-passthrough-first',
      mediaRegistration:'open-user-password-v1'
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
    if(path.startsWith('/api/media-registration'))return handleMediaRegistration(request,env);
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