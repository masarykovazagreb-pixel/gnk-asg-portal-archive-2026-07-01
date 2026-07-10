export const VERSION='GNK_ASG_MEDIA_PUBLIC_REGISTRATION_V1_20260710_USERNAME_PASSWORD_PUBLIC_FLOW';
const COOKIE='gnk_media_session';
const MAX_AGE=60*60*24*14;
const enc=new TextEncoder();
const dec=new TextDecoder();

const clean=value=>String(value||'').trim();
const lower=value=>clean(value).toLowerCase();
const now=()=>new Date().toISOString();
const keyAccount=id=>`media:account:${id}`;
const keyUsername=username=>`media:username:${username}`;
const keyDraft=id=>`media:draft:${id}`;
const keyDocs=id=>`media:documents:${id}`;

function kv(env){return env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;}
function json(data,status=200,extra={}){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-media-public-registration':VERSION,...extra}})}
function b64(bytes){let value='';for(const item of new Uint8Array(bytes))value+=String.fromCharCode(item);return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
function rb64(value){value=String(value||'').replace(/-/g,'+').replace(/_/g,'/');while(value.length%4)value+='=';return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
async function sha(value){return b64(await crypto.subtle.digest('SHA-256',enc.encode(String(value||''))))}
async function hmac(secret,value){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',key,enc.encode(value)))}
function eq(a,b){a=String(a||'');b=String(b||'');let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
async function readJson(store,key,fallback=null){try{const raw=await store.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
async function writeJson(store,key,value){await store.put(key,JSON.stringify(value,null,2));}
async function body(request){const type=(request.headers.get('content-type')||'').toLowerCase();try{if(type.includes('application/json'))return await request.json();if(type.includes('form-data')){const form=await request.formData();return Object.fromEntries([...form.entries()].filter(([,v])=>typeof v==='string'))}return {}}catch{return {}}}
function cookieValue(request){for(const part of (request.headers.get('cookie')||'').split(';')){const idx=part.indexOf('=');if(idx>0&&part.slice(0,idx).trim()===COOKIE){try{return decodeURIComponent(part.slice(idx+1).trim())}catch{return''}}}return''}
function clearCookie(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;}
async function makeCookie(account){const expires=Math.floor(Date.now()/1000)+MAX_AGE;const signature=await hmac(account.passwordHash,`${account.id}:${expires}`);return `${COOKIE}=${encodeURIComponent(`${account.id}.${expires}.${signature}`)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;}
async function sessionAccount(request,store){const value=cookieValue(request);const parts=value.split('.');if(parts.length!==3)return null;const [id,expRaw,sig]=parts;const exp=Number(expRaw);if(!id||!Number.isFinite(exp)||exp<=Math.floor(Date.now()/1000))return null;const account=await readJson(store,keyAccount(id),null);if(!account?.passwordHash)return null;const expected=await hmac(account.passwordHash,`${id}:${exp}`);return eq(sig,expected)?account:null;}
async function passwordHash(password,salt){return sha(`${salt}:${password}`)}
function publicAccount(account){return {id:account.id,username:account.username,email:account.email,outlet:account.outlet,country:account.country,website:account.website,status:account.status||'DRAFT',createdAt:account.createdAt,updatedAt:account.updatedAt};}
function validUsername(username){return /^[a-z0-9._-]{4,40}$/.test(username);}

async function register(request,env){
  const store=kv(env);if(!store)return json({ok:false,error:'kv_not_configured'},503);
  const data=await body(request),username=lower(data.username),password=String(data.password||''),email=lower(data.email),outlet=clean(data.outlet||data.newsroom||data.newsroomLegalName),country=clean(data.country),website=clean(data.website);
  if(!validUsername(username))return json({ok:false,error:'invalid_username',message:'Username mora imati 4–40 znakova: a-z, 0-9, točka, crtica ili podvlaka.'},400);
  if(password.length<8)return json({ok:false,error:'weak_password',message:'Password mora imati najmanje 8 znakova.'},400);
  if(!email.includes('@'))return json({ok:false,error:'invalid_email'},400);
  if(!outlet)return json({ok:false,error:'missing_outlet'},400);
  const existing=await store.get(keyUsername(username));
  if(existing)return json({ok:false,error:'username_taken'},409);
  const id=crypto.randomUUID(),salt=b64(crypto.getRandomValues(new Uint8Array(16))),account={id,username,email,outlet,country,website,salt,passwordHash:await passwordHash(password,salt),status:'DRAFT',createdAt:now(),updatedAt:now(),flow:'public-media-user-password'};
  await writeJson(store,keyAccount(id),account);await store.put(keyUsername(username),id);
  await writeJson(store,keyDraft(id),{accountId:id,status:'DRAFT',data:{newsroom:{legalName:outlet,brandName:outlet,country,website,editorEmail:email}},revision:1,createdAt:now(),updatedAt:now()});
  return json({ok:true,registered:true,session:publicAccount(account),message:'Media account created.'},201,{'set-cookie':await makeCookie(account)});
}

async function login(request,env){
  const store=kv(env);if(!store)return json({ok:false,error:'kv_not_configured'},503);
  const data=await body(request),username=lower(data.username||data.mailCode),password=String(data.password||data.pin||'');
  const id=await store.get(keyUsername(username));if(!id)return json({ok:false,error:'invalid_credentials'},401);
  const account=await readJson(store,keyAccount(id),null);if(!account?.passwordHash)return json({ok:false,error:'invalid_credentials'},401);
  const valid=eq(await passwordHash(password,account.salt),account.passwordHash);if(!valid)return json({ok:false,error:'invalid_credentials'},401);
  account.lastLoginAt=now();account.updatedAt=now();await writeJson(store,keyAccount(account.id),account);
  return json({ok:true,authenticated:true,session:publicAccount(account)},200,{'set-cookie':await makeCookie(account)});
}

async function requireAccount(request,env){const store=kv(env);if(!store)return {error:json({ok:false,error:'kv_not_configured'},503)};const account=await sessionAccount(request,store);if(!account)return {error:json({ok:false,error:'no_session'},401)};return {store,account};}

async function session(request,env){const state=await requireAccount(request,env);if(state.error)return state.error;return json({ok:true,session:publicAccount(state.account)});}
async function logout(){return json({ok:true,loggedOut:true},200,{'set-cookie':clearCookie()});}
async function config(){return json({ok:true,version:VERSION,deadline:'2026-07-20T23:59:00+02:00',maxDelegates:3,mode:'public_username_password'});}
async function draft(request,env){const state=await requireAccount(request,env);if(state.error)return state.error;const draft=await readJson(state.store,keyDraft(state.account.id),{accountId:state.account.id,status:'DRAFT',data:{},revision:0,createdAt:now(),updatedAt:now()});const documents=await readJson(state.store,keyDocs(state.account.id),[]);return json({ok:true,session:{...publicAccount(state.account),data:draft.data||{},applicationId:draft.applicationId||'',mailCode:state.account.username},documents,config:{deadline:'2026-07-20T23:59:00+02:00'}});}
async function saveDraft(request,env){const state=await requireAccount(request,env);if(state.error)return state.error;const data=await body(request);const existing=await readJson(state.store,keyDraft(state.account.id),{accountId:state.account.id,status:'DRAFT',data:{},revision:0,createdAt:now()});const next={...existing,data:data.data||{},revision:Number(existing.revision||0)+1,updatedAt:now()};await writeJson(state.store,keyDraft(state.account.id),next);return json({ok:true,revision:next.revision,updatedAt:next.updatedAt});}
async function submit(request,env){const state=await requireAccount(request,env);if(state.error)return state.error;const existing=await readJson(state.store,keyDraft(state.account.id),{accountId:state.account.id,data:{},revision:0,createdAt:now()});const applicationId=existing.applicationId||`MEDIA-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${state.account.id.slice(0,8).toUpperCase()}`;const next={...existing,applicationId,status:'SUBMITTED',submittedAt:now(),updatedAt:now()};state.account.status='SUBMITTED';state.account.updatedAt=now();await writeJson(state.store,keyDraft(state.account.id),next);await writeJson(state.store,keyAccount(state.account.id),state.account);return json({ok:true,status:'SUBMITTED',applicationId,message:'Application submitted. Approval is not automatic.'});}
async function documentMeta(request,env){const state=await requireAccount(request,env);if(state.error)return state.error;const type=(request.headers.get('content-type')||'').toLowerCase();let filename='document',category='general',size=0;if(type.includes('form-data')){const form=await request.formData();category=clean(form.get('category')||'general');const file=form.get('file');if(file&&typeof file==='object'){filename=clean(file.name||'document');size=Number(file.size||0)}}else{const data=await body(request);filename=clean(data.filename||filename);category=clean(data.category||category);size=Number(data.size||0)}const item={id:crypto.randomUUID(),filename,category,size_bytes:size,uploadedAt:now(),storage:'metadata_only_public_flow'};const list=await readJson(state.store,keyDocs(state.account.id),[]);list.unshift(item);await writeJson(state.store,keyDocs(state.account.id),list.slice(0,50));return json({ok:true,document:item});}

export function isPublicMediaRegistrationApi(path){return path==='/api/media-registration'||path.startsWith('/api/media-registration/');}
export async function handlePublicMediaRegistration(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(request.method==='GET'&&path==='/api/media-registration/config')return config();
  if(request.method==='POST'&&path==='/api/media-registration/register')return register(request,env);
  if(request.method==='POST'&&path==='/api/media-registration/login')return login(request,env);
  if(request.method==='GET'&&path==='/api/media-registration/session')return session(request,env);
  if(request.method==='POST'&&path==='/api/media-registration/logout')return logout();
  if(request.method==='GET'&&path==='/api/media-registration/draft')return draft(request,env);
  if(request.method==='PUT'&&path==='/api/media-registration/draft')return saveDraft(request,env);
  if(request.method==='POST'&&path==='/api/media-registration/submit')return submit(request,env);
  if(request.method==='POST'&&path==='/api/media-registration/document')return documentMeta(request,env);
  return json({ok:false,error:'not_found',path},404);
}
