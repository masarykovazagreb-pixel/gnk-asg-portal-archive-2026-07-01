import core from './index-hash-auth-v1.js';

const VERSION='GNK_ASG_SESSION_COOKIE_V3_20260714_JSON_CONTACT_LOGIN_LOGOUT';
const COOKIE='gnk_asg_admin_session';
const LOGIN_PATH='/api/operator-session-login';
const LOGOUT_PATH='/api/operator-session-logout';
const CONTACT_PATH='/api/contact-submit';
const SESSION_TTL=60*60*8;
const enc=new TextEncoder();
const PATHS=new Set(['/api/admin-mail-send','/api/operator-send-mail','/api/operator-mailbox-config','/api/operator-signature-load','/api/operator-signature-save','/api/operator-mail-log']);
const hash=e=>String(e.OPERATOR_TOKEN_SHA256||'').trim().toLowerCase();
function eq(a,b){a=String(a||'');b=String(b||'');let x=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)x|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return x===0}
function b64(bytes){let s='';for(const x of new Uint8Array(bytes))s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
async function digest(value){const bytes=await crypto.subtle.digest('SHA-256',enc.encode(String(value||'')));return[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function mac(secret,value){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',key,enc.encode(value)))}
function cookie(r){for(const part of(r.headers.get('cookie')||'').split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===COOKIE){try{return decodeURIComponent(part.slice(i+1).trim())}catch{return''}}}return''}
async function sessionOk(r,e){const h=hash(e),v=cookie(r),i=v.indexOf('.');if(h.length!==64||i<1)return false;const exp=Number(v.slice(0,i)),sig=v.slice(i+1);if(!Number.isFinite(exp)||exp<=Math.floor(Date.now()/1000))return false;return eq(sig,await mac(h,`gnk-asg-admin:${exp}`))}
function json(data,status=200,extra={}){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-session-cookie':VERSION,...extra}})}
function patch(e,secret){return new Proxy(e,{get(t,p,r){if(p==='GNK_ASG_OPERATOR_TOKEN')return secret;return Reflect.get(t,p,r)}})}
function requestWithToken(r,secret){const headers=new Headers(r.headers);headers.set('authorization',`Bearer ${secret}`);headers.set('x-operator-token',secret);return new Request(r,{headers})}
async function login(request,env){if(request.method==='GET')return json({ok:true,ready:true,authenticated:await sessionOk(request,env),sessionTtlSeconds:SESSION_TTL});if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_json'},400)}const token=String(body?.token||'').trim(),expected=hash(env);if(!token||expected.length!==64||!eq(await digest(token),expected))return json({ok:false,error:'invalid_credentials'},401);const exp=Math.floor(Date.now()/1000)+SESSION_TTL,value=`${exp}.${await mac(expected,`gnk-asg-admin:${exp}`)}`;return json({ok:true,authenticated:true,expiresAt:new Date(exp*1000).toISOString(),sessionTtlSeconds:SESSION_TTL},200,{'set-cookie':`${COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${SESSION_TTL}; HttpOnly; Secure; SameSite=Strict`})}
async function logout(request){if(!['POST','DELETE'].includes(request.method))return json({ok:false,error:'method_not_allowed'},405);return json({ok:true,authenticated:false},200,{'set-cookie':`${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`})}
async function normalizeContactRequest(request){const type=String(request.headers.get('content-type')||'').toLowerCase();if(request.method!=='POST'||!type.includes('application/json'))return request;let data;try{data=await request.clone().json()}catch{return request}const form=new FormData(),department=String(data.department||data.mailbox||data.departmentKey||'contact');for(const key of ['name','email','phone','subject','message','website','company_website','language']){if(data[key]!==undefined&&data[key]!==null)form.set(key,String(data[key]))}form.set('departmentKey',department);form.set('mailbox',department);form.set('consent',data.consent===true||['true','yes','on','1'].includes(String(data.consent||'').toLowerCase())?'true':'false');const headers=new Headers(request.headers);headers.delete('content-type');headers.delete('content-length');headers.set('accept','application/json');headers.set('x-gnk-contact-normalized',VERSION);return new Request(request.url,{method:'POST',headers,body:form,redirect:request.redirect})}
export default{
 async fetch(request,env,ctx){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===LOGIN_PATH)return login(request,env);
  if(path===LOGOUT_PATH)return logout(request);
  if(path===CONTACT_PATH)return core.fetch(await normalizeContactRequest(request),env,ctx);
  if(PATHS.has(path)&&await sessionOk(request,env)){const secret=hash(env);return core.fetch(requestWithToken(request,secret),patch(env,secret),ctx)}
  if(path==='/api/operator-auth-check'&&await sessionOk(request,env))return json({ok:true,authenticated:true,mode:'session',worker:'gnk-asg-contact-api'});
  return core.fetch(request,env,ctx)
 }
};
