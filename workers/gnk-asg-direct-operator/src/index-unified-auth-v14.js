import app from './index-portal-final-v13.js';

const VERSION='GNK_ASG_UNIFIED_AUTH_V16_20260701_ADMIN_SCOPE';
const COOKIE='gnk_asg_admin_session';
const MAX_AGE=43200;
const LOGIN='/admin-login';
const enc=new TextEncoder();

const PUBLIC_UI=[
  '/the-code','/media-application'
];
const UI=[
  '/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro',
  '/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review',
  '/media-command-center','/media-registration-admin','/campaign-mailer','/email-status'
];
const TOKEN_NAMES=new Set([
  'OPERATOR_TOKEN','GNK_ASG_OPERATOR_TOKEN','ADMIN_TOKEN','GNK_ASG_ADMIN_TOKEN',
  'NEWS_PUBLISH_TOKEN','SECRET_TOKEN'
]);
const EXACT_API=new Set([
  '/api/index-media-config','/api/media-upload','/api/admin-asset-list','/api/publish-queue'
]);

const clean=value=>String(value||'').trim();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const matches=(path,prefixes)=>prefixes.some(prefix=>path===prefix||path.startsWith(prefix+'/'));
const isPublicUi=path=>matches(path,PUBLIC_UI);
const isUi=path=>matches(path,UI);
const isProtectedApi=path=>path==='/operator'||path.startsWith('/operator/')||
  path.startsWith('/api/operator-')||path.startsWith('/api/admin-')||
  path.startsWith('/api/mail-center/')||path.startsWith('/api/news-admin')||
  path.startsWith('/api/pdf-publisher')||path.startsWith('/api/social-share')||
  path.startsWith('/api/wa-center')||path.startsWith('/api/media-command-center')||
  path.startsWith('/api/media-portal-admin')||path.startsWith('/api/campaign-mailer')||EXACT_API.has(path);

function json(data,status=200,extra={}){
  return new Response(JSON.stringify(data,null,2),{status,headers:{
    'content-type':'application/json; charset=utf-8','cache-control':'no-store',
    'x-gnk-asg-auth-layer':VERSION,...extra
  }});
}
function eq(a,b){a=String(a||'');b=String(b||'');let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
async function sha(value){const digest=await crypto.subtle.digest('SHA-256',enc.encode(String(value||'')));return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function b64(bytes){let value='';for(const item of new Uint8Array(bytes))value+=String.fromCharCode(item);return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');}
async function mac(secret,value){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',key,enc.encode(value)));}

function rawSecrets(env){return [...TOKEN_NAMES].map(name=>clean(env[name])).filter(Boolean);}
async function material(env){
  const configuredHash=clean(env.OPERATOR_TOKEN_SHA256).toLowerCase();
  if(/^[a-f0-9]{64}$/.test(configuredHash))return{configured:true,hash:configuredHash,raw:rawSecrets(env)[0]||'',source:'sha256'};
  const raw=rawSecrets(env)[0]||'';
  return raw?{configured:true,hash:await sha(raw),raw,source:'raw'}:{configured:false,hash:'',raw:'',source:'none'};
}
function requestToken(request){
  const authorization=request.headers.get('authorization')||'';
  const match=authorization.match(/^Bearer\s+(.+)$/i);
  return clean((match&&match[1])||request.headers.get('x-operator-token')||request.headers.get('x-admin-token')||request.headers.get('x-gnk-asg-token'));
}
function cookieValue(request){
  for(const part of (request.headers.get('cookie')||'').split(';')){
    const index=part.indexOf('=');
    if(index>0&&part.slice(0,index).trim()===COOKIE){try{return decodeURIComponent(part.slice(index+1).trim());}catch{return'';}}
  }
  return'';
}
async function tokenOk(request,env){
  const token=requestToken(request),auth=await material(env);
  if(!token||!auth.configured)return{ok:false,auth};
  return{ok:auth.raw?eq(token,auth.raw):eq(await sha(token),auth.hash),auth};
}
async function sessionOk(request,env){
  const auth=await material(env),value=cookieValue(request),dot=value.indexOf('.');
  if(!auth.configured||dot<1)return{ok:false,auth};
  const expires=Number(value.slice(0,dot)),signature=value.slice(dot+1);
  if(!Number.isFinite(expires)||expires<=Math.floor(Date.now()/1000))return{ok:false,auth};
  return{ok:eq(signature,await mac(auth.hash,`gnk-asg-admin:${expires}`)),auth};
}
async function access(request,env){
  const direct=await tokenOk(request,env);
  if(direct.ok)return{ok:true,mode:'token',auth:direct.auth};
  const session=await sessionOk(request,env);
  if(session.ok)return{ok:true,mode:'session',auth:session.auth};
  return{ok:false,mode:null,auth:direct.auth.configured?direct.auth:session.auth};
}
async function sessionCookie(auth){
  const expires=Math.floor(Date.now()/1000)+MAX_AGE;
  const signature=await mac(auth.hash,`gnk-asg-admin:${expires}`);
  return`${COOKIE}=${encodeURIComponent(`${expires}.${signature}`)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;
}
const clearCookie=()=>`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

function safeNext(value,fallback='/admin-center/'){
  try{
    const candidate=clean(value||fallback);
    if(!candidate.startsWith('/')||candidate.startsWith('//'))return fallback;
    const url=new URL(candidate,'https://gnk-asg.hr');
    const path=url.pathname.replace(/\/+$/,'')||'/';
    return isUi(path)?url.pathname+url.search+url.hash:fallback;
  }catch{return fallback;}
}
function esc(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function loginPage(next,message='',status=401){
  const target=safeNext(next),error=message?`<p class="error">${esc(message)}</p>`:'';
  const action=`${LOGIN}/?next=${encodeURIComponent(target)}`;
  return new Response(`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>GNK ASG — Sigurna prijava</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 20% 0%,#173257,#020812 55%);color:#fff;font-family:Arial,sans-serif}.card{width:min(440px,90%);padding:28px;border:1px solid #d7aa3c;border-radius:20px;background:#07172a;box-shadow:0 28px 80px rgba(0,0,0,.55)}h1{margin:0 0 12px;color:#ffe08a}p{color:#cbd5e1;line-height:1.5}.error{color:#ffb4b4}input,button,a{width:100%;box-sizing:border-box;padding:14px;margin-top:10px;border-radius:10px}input{border:1px solid rgba(215,170,60,.55);background:#020812;color:#fff}button{border:0;background:#e6bd57;color:#07101d;font-weight:900;cursor:pointer}.back{display:block;text-align:center;color:#fff;text-decoration:none;border:1px solid rgba(215,170,60,.35)}</style></head><body><main class="card"><h1>GNK ASG sigurna prijava</h1><p>Unesite postojeći operatorski token. Nakon provjere otvara se sigurna HttpOnly sesija koja traje 12 sati.</p>${error}<form method="post" action="${esc(action)}"><input name="token" type="password" required autofocus autocomplete="current-password" placeholder="Operatorski token"><button type="submit">PRIJAVA</button></form><a class="back" href="/">Povratak na portal</a></main></body></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-gnk-asg-auth-layer':VERSION}});
}
async function submittedToken(request){
  const type=(request.headers.get('content-type')||'').toLowerCase();
  try{
    if(type.includes('application/json'))return clean((await request.json()).token);
    const form=await request.formData();return clean(form.get('token'));
  }catch{return'';}
}
async function login(request,env,next,jsonMode=false){
  const token=await submittedToken(request),auth=await material(env);
  if(!auth.configured)return jsonMode?json({ok:false,error:'auth_not_configured'},503):loginPage(next,'Operatorski secret nije konfiguriran.',503);
  const valid=Boolean(token&&(auth.raw?eq(token,auth.raw):eq(await sha(token),auth.hash)));
  if(!valid)return jsonMode?json({ok:false,error:'invalid_token'},401):loginPage(next,'Token nije valjan.',401);
  const cookie=await sessionCookie(auth);
  if(jsonMode)return json({ok:true,authenticated:true,mode:'session',expiresIn:MAX_AGE},200,{'set-cookie':cookie});
  return new Response(null,{status:303,headers:{location:safeNext(next),'cache-control':'no-store','set-cookie':cookie,'x-gnk-asg-auth-layer':VERSION}});
}

function internalToken(auth){return`gnk-auth-v14-${auth.hash}`;}
function patchedEnv(env,token){return new Proxy(env,{get(target,property,receiver){if(TOKEN_NAMES.has(String(property)))return token;return Reflect.get(target,property,receiver);}});}
function patchedRequest(request,token){
  const headers=new Headers(request.headers);
  headers.set('authorization',`Bearer ${token}`);
  headers.set('x-operator-token',token);
  headers.set('x-admin-token',token);
  headers.set('x-gnk-asg-token',token);
  return new Request(request,{headers});
}
function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-auth-layer',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function forwardAuthenticated(request,env,ctx,auth){
  const token=internalToken(auth);
  return stamp(await app.fetch(patchedRequest(request,token),patchedEnv(env,token),ctx));
}
async function versionResponse(request,env,ctx){
  const response=await app.fetch(request,env,ctx);
  try{
    const payload=await response.clone().json();
    return json({...payload,authLayer:VERSION,deployedEntryPoint:'src/index-unified-auth-v14.js',backendStatusEndpoint:'/api/operator-backend-status',adminLogin:LOGIN,adminSessionSeconds:MAX_AGE,publicUi:PUBLIC_UI,protectedUi:UI});
  }catch{return stamp(response);}
}
function backendStatus(env){return{
  ok:true,authLayer:VERSION,worker:'gnk-asg-direct-operator',bindings:{
    kv:Boolean(env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV),d1:Boolean(env.GNK_ASG_D1),
    r2:Boolean(env.GNK_ASG_MEDIA_ASSETS),email:Boolean(env.EMAIL),ai:Boolean(env.AI)
  },modules:{operator:true,mobileAdmin:true,mail:true,autoEditor:true,publishing:true,media:true,market:true,news:true,campaignMailer:true},
  time:new Date().toISOString()
};}

async function fetchHandler(request,env,ctx){
  const url=new URL(request.url),path=pathOf(request);
  if(request.method==='GET'&&path==='/data/portal-version.json')return versionResponse(request,env,ctx);
  if(isPublicUi(path))return stamp(await app.fetch(request,env,ctx));
  if(path===LOGIN){
    const next=safeNext(url.searchParams.get('next'));
    if(request.method==='POST')return login(request,env,next,false);
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD, POST','cache-control':'no-store'}});
    const state=await access(request,env);
    if(!state.ok)return loginPage(next);
    const headers={location:next,'cache-control':'no-store','x-gnk-asg-auth-layer':VERSION};
    if(state.mode==='token')headers['set-cookie']=await sessionCookie(state.auth);
    return new Response(null,{status:303,headers});
  }
  if(path==='/operator/session/logout')return new Response(null,{status:303,headers:{location:safeNext(url.searchParams.get('next'),'/'),'cache-control':'no-store','set-cookie':clearCookie(),'x-gnk-asg-auth-layer':VERSION}});
  if(path==='/api/operator-session/login'&&request.method==='POST')return login(request,env,'/admin-center/',true);
  if(path==='/api/operator-auth-check'){
    const state=await access(request,env),headers={};
    if(state.ok&&state.mode==='token')headers['set-cookie']=await sessionCookie(state.auth);
    return json({ok:state.ok,authenticated:state.ok,mode:state.mode,configured:state.auth.configured,authLayer:VERSION,expiresIn:state.ok?MAX_AGE:0},state.ok?200:401,headers);
  }
  if(isUi(path)&&request.method==='POST'&&(request.headers.get('content-type')||'').includes('application/x-www-form-urlencoded'))return login(request,env,url.pathname+url.search,false);
  if(isUi(path)||isProtectedApi(path)){
    const state=await access(request,env);
    if(!state.ok)return isUi(path)&&['GET','HEAD'].includes(request.method)?loginPage(url.pathname+url.search):json({ok:false,error:'unauthorized',message:'Unesite valjani operatorski token.',configured:state.auth.configured},401);
    if(path==='/api/operator-backend-status')return json(backendStatus(env));
    return forwardAuthenticated(request,env,ctx,state.auth);
  }
  return stamp(await app.fetch(request,env,ctx));
}

export default{
  fetch:fetchHandler,
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
