import * as legacy from './media-registration-legacy-v1.js';

export const VERSION='GNK_ASG_MEDIA_REGISTRATION_V2_20260715_OPEN_PBKDF2';
export const PUBLIC_UI=legacy.PUBLIC_UI;
export const ADMIN_UI=legacy.ADMIN_UI;

const PUBLIC_API='/api/media-registration';
const ADMIN_API='/api/media-registration-admin';
const COOKIE='gnk_asg_media_registration';
const SESSION_SECONDS=12*60*60;
const DEFAULT_ACCESS_EXPIRY='2026-10-10T23:59:59.000Z';
const ACCOUNT_ALGORITHM='PBKDF2-SHA256';
const LEGACY_ALGORITHM='LEGACY-SHA256';
const PBKDF2_ITERATIONS=210000;
const enc=new TextEncoder();

const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const dbOf=env=>env?.GNK_ASG_D1||null;
const kvOf=env=>env?.GNK_ASG_KV||env?.GNK_ASG_CONFIG_KV||null;
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const usernameOf=value=>clean(value).toLowerCase().replace(/[^a-z0-9._-]/g,'').slice(0,64);
const safeCountryCode=value=>{const normalized=clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z]/g,'');return(normalized.slice(0,2)||'WW').padEnd(2,'W')};

function json(data,status=200,extra={}){
 return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-content-type-options':'nosniff','x-gnk-asg-media-registration':VERSION,...extra}});
}
function sameOrigin(request){
 const origin=request.headers.get('origin');
 const site=clean(request.headers.get('sec-fetch-site')).toLowerCase();
 if(origin){try{return new URL(origin).origin===new URL(request.url).origin}catch{return false}}
 return !site||site==='same-origin'||site==='same-site'||site==='none';
}
function cookieValue(request){
 for(const part of String(request.headers.get('cookie')||'').split(';')){
  const index=part.indexOf('=');
  if(index>0&&part.slice(0,index).trim()===COOKIE){try{return decodeURIComponent(part.slice(index+1).trim())}catch{return''}}
 }
 return'';
}
const setCookie=(token,age=SESSION_SECONDS)=>`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;

function bytesToHex(bytes){return[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('')}
function bytesToBase64Url(bytes){let raw='';for(const value of new Uint8Array(bytes))raw+=String.fromCharCode(value);return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
function base64UrlToBytes(value){const normalized=String(value||'').replace(/-/g,'+').replace(/_/g,'/');const padded=normalized+'='.repeat((4-normalized.length%4)%4);const raw=atob(padded);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
async function sha256Hex(value){return bytesToHex(await crypto.subtle.digest('SHA-256',value instanceof Uint8Array?value:enc.encode(String(value||''))))}
async function passwordHash(password,salt,iterations=PBKDF2_ITERATIONS){
 const key=await crypto.subtle.importKey('raw',enc.encode(String(password||'')),{name:'PBKDF2'},false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256);
 return bytesToHex(bits);
}
function equalConstantTime(left,right){
 const a=String(left||''),b=String(right||'');let diff=a.length^b.length;
 for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
 return diff===0;
}
async function accessExpiry(env){
 const kv=kvOf(env);if(!kv)return DEFAULT_ACCESS_EXPIRY;
 try{const raw=await kv.get('media-registration:config:v1');const config=raw?JSON.parse(raw):{};return clean(config.accessExpiresAt)||DEFAULT_ACCESS_EXPIRY}catch{return DEFAULT_ACCESS_EXPIRY}
}

async function ensureLegacySchema(env){
 const response=await legacy.handleMediaRegistrationAdmin(new Request('https://gnk-asg.internal/api/media-registration-admin/status'),env);
 if(!response||response.status>=500)throw new Error('legacy_media_schema_unavailable');
}
async function ensureAccountSchema(env){
 await ensureLegacySchema(env);
 const db=dbOf(env);if(!db?.prepare)throw new Error('GNK_ASG_D1 binding missing');
 await db.prepare(`CREATE TABLE IF NOT EXISTS media_registration_accounts(
  username TEXT PRIMARY KEY,
  mail_code TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  outlet TEXT NOT NULL,
  country TEXT,
  language TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT ${PBKDF2_ITERATIONS},
  password_algorithm TEXT NOT NULL DEFAULT '${ACCOUNT_ALGORITHM}',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
 )`).run();
 for(const column of [
  `password_iterations INTEGER NOT NULL DEFAULT ${PBKDF2_ITERATIONS}`,
  `password_algorithm TEXT NOT NULL DEFAULT '${LEGACY_ALGORITHM}'`
 ]){try{await db.prepare(`ALTER TABLE media_registration_accounts ADD COLUMN ${column}`).run()}catch{}}
 await db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_registration_accounts_email ON media_registration_accounts(email)`).run();
 await db.prepare(`CREATE TABLE IF NOT EXISTS media_registration_rate_limits(rate_key TEXT PRIMARY KEY,window_start TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)`).run();
 return db;
}
async function consumeRateLimit(db,key,limit,windowMs){
 const stamp=now(),row=await db.prepare(`SELECT window_start,attempts FROM media_registration_rate_limits WHERE rate_key=?`).bind(key).first();
 if(!row||Date.now()-Date.parse(row.window_start)>=windowMs){
  await db.prepare(`INSERT INTO media_registration_rate_limits(rate_key,window_start,attempts,updated_at) VALUES(?,?,1,?) ON CONFLICT(rate_key) DO UPDATE SET window_start=excluded.window_start,attempts=1,updated_at=excluded.updated_at`).bind(key,stamp,stamp).run();
  return true;
 }
 if(Number(row.attempts||0)>=limit)return false;
 await db.prepare(`UPDATE media_registration_rate_limits SET attempts=attempts+1,updated_at=? WHERE rate_key=?`).bind(stamp,key).run();
 return true;
}
async function rateLimitRegistration(request,db,email){
 const ip=clean(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')||'unknown').split(',')[0];
 const ipKey=`register:ip:${await sha256Hex(ip)}`;
 const emailKey=`register:email:${await sha256Hex(email.toLowerCase())}`;
 const ipAllowed=await consumeRateLimit(db,ipKey,8,60*60*1000);
 const emailAllowed=await consumeRateLimit(db,emailKey,3,24*60*60*1000);
 return ipAllowed&&emailAllowed;
}
async function createSession(db,mailCode,eventType,detail={}){
 const token=bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32))),hash=await sha256Hex(token),created=now(),expires=new Date(Date.now()+SESSION_SECONDS*1000).toISOString();
 await db.batch([
  db.prepare(`INSERT INTO media_registration_sessions(session_hash,mail_code,created_at,expires_at,last_seen_at) VALUES(?,?,?,?,?)`).bind(hash,mailCode,created,expires,created),
  db.prepare(`INSERT INTO media_registration_drafts(mail_code,application_id,status,revision,data_json,created_at,updated_at) VALUES(?,'','DRAFT',1,'{}',?,?) ON CONFLICT(mail_code) DO NOTHING`).bind(mailCode,created,created),
  db.prepare(`INSERT INTO media_registration_audit(id,event_type,mail_code,detail_json,created_at) VALUES(?,?,?,?,?)`).bind(crypto.randomUUID(),eventType,mailCode,JSON.stringify(detail),created)
 ]);
 return{token,expires};
}
async function makeOpenMailCode(db,country,username){
 const date=new Date().toISOString().slice(0,10).replace(/-/g,''),countryCode=safeCountryCode(country),base=(username||'MEDIA').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'MEDIA';
 for(let attempt=0;attempt<12;attempt++){
  const random=bytesToBase64Url(crypto.getRandomValues(new Uint8Array(5))).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  const code=`GNK-MEDIA-${date}-${countryCode}-${base}-${random}`.slice(0,64);
  const exists=await db.prepare(`SELECT mail_code FROM media_invitation_access WHERE mail_code=?`).bind(code).first();
  if(!exists)return code;
 }
 throw new Error('mail_code_generation_failed');
}

async function register(request,env){
 if(!sameOrigin(request))return json({ok:false,error:'origin_not_allowed'},403);
 let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_json'},400)}
 const username=usernameOf(body.username||body.email),password=String(body.password||''),email=clean(body.email).toLowerCase(),outlet=clean(body.outlet||body.newsroom||body.mediaName),country=clean(body.country),language=clean(body.language||'English');
 if(username.length<4)return json({ok:false,error:'invalid_username'},400);
 if(password.length<8||password.length>128)return json({ok:false,error:'weak_password'},400);
 if(!validEmail(email))return json({ok:false,error:'invalid_email'},400);
 if(outlet.length<2||outlet.length>240)return json({ok:false,error:'outlet_required'},400);
 const db=await ensureAccountSchema(env);
 if(!await rateLimitRegistration(request,db,email))return json({ok:false,error:'rate_limited'},429,{'retry-after':'3600'});
 const existing=await db.prepare(`SELECT username,email FROM media_registration_accounts WHERE username=? OR email=?`).bind(username,email).first();
 if(existing)return json({ok:false,error:'account_exists'},409);
 const mailCode=await makeOpenMailCode(db,country,username),saltBytes=crypto.getRandomValues(new Uint8Array(16)),salt=bytesToBase64Url(saltBytes),hash=await passwordHash(password,saltBytes),created=now(),expires=await accessExpiry(env),hiddenPin=bytesToBase64Url(crypto.getRandomValues(new Uint8Array(16))),pinHash=await sha256Hex(`${mailCode}:${hiddenPin}`),draft=JSON.stringify({newsroom:{legalName:outlet,brandName:outlet,country,website:clean(body.website),editorName:clean(body.contactName),editorRole:clean(body.contactRole),editorEmail:email,language}});
 await db.batch([
  db.prepare(`INSERT INTO media_invitation_access(mail_code,outlet,email,recipient_name,recipient_title,country,language,pin_hash,pin_cipher,pin_iv,issued_at,expires_at,status,mail_status,queued_at,start_after,sent_at,provider_message_id,last_error,updated_at) VALUES(?,?,?,?,?,?,?,?,NULL,NULL,?,?,'ACTIVE','OPEN_REGISTERED',?,NULL,NULL,NULL,'',?)`).bind(mailCode,outlet,email,clean(body.contactName),clean(body.contactRole),country,language,pinHash,created,expires,created,created),
  db.prepare(`INSERT INTO media_registration_accounts(username,mail_code,email,outlet,country,language,password_hash,password_salt,password_iterations,password_algorithm,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,'ACTIVE',?,?)`).bind(username,mailCode,email,outlet,country,language,hash,salt,PBKDF2_ITERATIONS,ACCOUNT_ALGORITHM,created,created),
  db.prepare(`INSERT INTO media_registration_drafts(mail_code,application_id,status,revision,data_json,created_at,updated_at) VALUES(?,'','DRAFT',1,?,?,?) ON CONFLICT(mail_code) DO NOTHING`).bind(mailCode,draft,created,created)
 ]);
 const session=await createSession(db,mailCode,'open_registration_created',{username,email,outlet,passwordAlgorithm:ACCOUNT_ALGORITHM,passwordIterations:PBKDF2_ITERATIONS});
 return json({ok:true,session:{mailCode,username,outlet,email,country,language,status:'DRAFT'},sessionExpiresAt:session.expires,message:'Account created. You are signed in and can complete the application.'},201,{'set-cookie':setCookie(session.token)});
}
async function usernamePasswordLogin(request,env,body){
 if(!sameOrigin(request))return json({ok:false,error:'origin_not_allowed'},403);
 const rawLogin=clean(body.username||body.login||body.email).toLowerCase(),username=usernameOf(rawLogin),password=String(body.password||'');
 if(!rawLogin||!password)return json({ok:false,error:'invalid_credentials'},401);
 const db=await ensureAccountSchema(env),account=await db.prepare(`SELECT * FROM media_registration_accounts WHERE username=? OR email=?`).bind(username,rawLogin).first();
 if(!account||account.status!=='ACTIVE')return json({ok:false,error:'invalid_credentials'},401);
 const algorithm=clean(account.password_algorithm)||LEGACY_ALGORITHM,iterations=Math.max(100000,Number(account.password_iterations||PBKDF2_ITERATIONS)),salt=base64UrlToBytes(account.password_salt);
 const candidate=algorithm===LEGACY_ALGORITHM?await sha256Hex(`${account.username}:${password}:${account.password_salt}`):await passwordHash(password,salt,iterations);
 if(!equalConstantTime(candidate,account.password_hash))return json({ok:false,error:'invalid_credentials'},401);
 if(algorithm===LEGACY_ALGORITHM){
  const nextSaltBytes=crypto.getRandomValues(new Uint8Array(16)),nextSalt=bytesToBase64Url(nextSaltBytes),nextHash=await passwordHash(password,nextSaltBytes),updated=now();
  await db.prepare(`UPDATE media_registration_accounts SET password_hash=?,password_salt=?,password_iterations=?,password_algorithm=?,updated_at=? WHERE username=?`).bind(nextHash,nextSalt,PBKDF2_ITERATIONS,ACCOUNT_ALGORITHM,updated,account.username).run();
 }
 const access=await db.prepare(`SELECT * FROM media_invitation_access WHERE mail_code=?`).bind(account.mail_code).first();
 if(!access||Date.parse(access.expires_at)<=Date.now())return json({ok:false,error:'code_expired'},410);
 if(access.status!=='ACTIVE')return json({ok:false,error:'access_revoked'},403);
 const session=await createSession(db,account.mail_code,'login_success',{username:account.username,email:account.email,passwordAlgorithm:algorithm===LEGACY_ALGORITHM?`${LEGACY_ALGORITHM}_MIGRATED`:algorithm});
 return json({ok:true,session:{mailCode:account.mail_code,username:account.username,outlet:access.outlet,email:access.email,country:access.country,language:access.language,status:'DRAFT'},sessionExpiresAt:session.expires},200,{'set-cookie':setCookie(session.token)});
}
async function enrichSessionResponse(response,env){
 if(!response||!response.ok)return response;
 const payload=await response.json().catch(()=>null);if(!payload?.session?.mailCode)return json(payload||{ok:false,error:'invalid_response'},response.status);
 const db=await ensureAccountSchema(env),account=await db.prepare(`SELECT username FROM media_registration_accounts WHERE mail_code=?`).bind(payload.session.mailCode).first();
 return json({...payload,session:{...payload.session,username:account?.username||payload.session.username||''}},response.status,Object.fromEntries([...response.headers].filter(([key])=>key.toLowerCase()==='set-cookie')));
}
async function enhancedConfig(request,env){
 const response=await legacy.handleMediaRegistrationPublic(request,env);if(!response)return response;
 const payload=await response.json().catch(()=>({ok:false,error:'invalid_config_response'}));
 return json({...payload,openRegistration:true,loginMode:'username_password',legacyInvitationLogin:true,passwordPolicy:{algorithm:ACCOUNT_ALGORITHM,iterations:PBKDF2_ITERATIONS,minLength:8,maxLength:128}},response.status);
}
async function enhancedAdminStatus(request,env){
 const response=await legacy.handleMediaRegistrationAdmin(request,env);if(!response||!response.ok)return response;
 const payload=await response.json().catch(()=>({ok:false,error:'invalid_status_response'})),db=await ensureAccountSchema(env),accounts=(await db.prepare(`SELECT username,mail_code FROM media_registration_accounts ORDER BY updated_at DESC LIMIT 500`).all()).results||[],byCode=new Map(accounts.map(row=>[row.mail_code,row.username]));
 return json({...payload,version:VERSION,openRegistrationAccounts:accounts.length,registrations:(payload.registrations||[]).map(item=>({...item,username:byCode.get(item.mail_code)||''})),openRegistration:true,loginMode:'username_password',legacyInvitationLogin:true,passwordPolicy:{algorithm:ACCOUNT_ALGORITHM,iterations:PBKDF2_ITERATIONS}},response.status);
}
async function enhancedAdminConfig(request,env){
 const response=await legacy.handleMediaRegistrationAdmin(request,env);if(!response)return response;
 const payload=await response.json().catch(()=>({ok:false,error:'invalid_config_response'}));
 return json({...payload,config:{...(payload.config||{}),openRegistration:true,loginMode:'username_password',legacyInvitationLogin:true}},response.status);
}

export const processMediaInvitationQueue=legacy.processMediaInvitationQueue;

export async function handleMediaRegistrationPublic(request,env){
 const path=pathOf(request);
 if(request.method==='POST'&&path===`${PUBLIC_API}/register`)return register(request,env);
 if(request.method==='POST'&&path===`${PUBLIC_API}/login`){
  const body=await request.clone().json().catch(()=>null);
  if(body&&(body.username||body.login||body.email)&&body.password)return usernamePasswordLogin(request,env,body);
  return legacy.handleMediaRegistrationPublic(request,env);
 }
 if(request.method==='GET'&&path===`${PUBLIC_API}/config`)return enhancedConfig(request,env);
 if(request.method==='GET'&&(path===`${PUBLIC_API}/session`||path===`${PUBLIC_API}/draft`))return enrichSessionResponse(await legacy.handleMediaRegistrationPublic(request,env),env);
 return legacy.handleMediaRegistrationPublic(request,env);
}

export async function handleMediaRegistrationAdmin(request,env){
 const path=pathOf(request);
 if(request.method==='GET'&&path===`${ADMIN_API}/status`)return enhancedAdminStatus(request,env);
 if(request.method==='POST'&&path===`${ADMIN_API}/config`)return enhancedAdminConfig(request,env);
 return legacy.handleMediaRegistrationAdmin(request,env);
}
