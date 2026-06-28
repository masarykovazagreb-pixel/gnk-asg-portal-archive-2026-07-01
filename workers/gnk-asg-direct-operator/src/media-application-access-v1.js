import { EmailMessage } from 'cloudflare:email';

export const VERSION='GNK_ASG_MEDIA_APPLICATION_ACCESS_V2_20260628';
const ADMIN_API='/api/media-command-center';
const PUBLIC_UI='/media-access';
const PUBLIC_API='/api/media-access';
const FROM_DEFAULT='media@gnk-asg.hr';
const COOKIE='gnk_asg_media_access';
const SESSION_SECONDS=12*60*60;
const enc=new TextEncoder();
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const dbOf=env=>env.GNK_ASG_D1||null;

function json(payload,status=200,sourceHeaders={}){
  const headers=new Headers(sourceHeaders);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-content-type-options','nosniff');
  headers.set('x-gnk-asg-media-access',VERSION);
  return new Response(JSON.stringify(payload,null,2),{status,headers});
}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));}
function validApplicationId(value){return /^GNK-APP-2026-[A-Z0-9]{8}$/.test(clean(value).toUpperCase());}
function validCode(value){return /^[A-Z2-9]{8}$/.test(clean(value).toUpperCase());}
function foldBase64(value){return value.replace(/.{1,76}/g,'$&\r\n').trimEnd();}
function bytesToBase64(bytes){let out='';const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);for(let i=0;i<view.length;i+=0x8000)out+=String.fromCharCode(...view.subarray(i,i+0x8000));return btoa(out);}
function base64Url(bytes){return bytesToBase64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');}
async function sha256(value){const digest=await crypto.subtle.digest('SHA-256',enc.encode(String(value||'')));return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function secureEqual(a,b){a=String(a||'');b=String(b||'');let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
function makeCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=crypto.getRandomValues(new Uint8Array(8));return [...bytes].map(value=>alphabet[value%alphabet.length]).join('');}
function makeSessionToken(){return base64Url(crypto.getRandomValues(new Uint8Array(32)));}
function cookieValue(request){for(const part of String(request.headers.get('cookie')||'').split(';')){const index=part.indexOf('=');if(index>0&&part.slice(0,index).trim()===COOKIE){try{return decodeURIComponent(part.slice(index+1).trim());}catch{return'';}}}return'';}
function sessionCookie(token,maxAge=SESSION_SECONDS){return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;}
function clearCookie(){return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;}
function sameOrigin(request){const origin=request.headers.get('origin');if(!origin)return true;try{return new URL(origin).origin===new URL(request.url).origin;}catch{return false;}}

async function ensureSchema(env){
  const db=dbOf(env);
  if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_outreach_events (
      id TEXT PRIMARY KEY,event_type TEXT NOT NULL,mail_code TEXT,application_id TEXT,outlet TEXT,email TEXT,detail_json TEXT,created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_application_access (
      application_id TEXT PRIMARY KEY, applicant_email TEXT NOT NULL, code_hash TEXT NOT NULL, code_last4 TEXT NOT NULL,
      issued_at TEXT NOT NULL, expires_at TEXT NOT NULL, sent_at TEXT, send_status TEXT NOT NULL DEFAULT 'PENDING',
      issue_count INTEGER NOT NULL DEFAULT 1, last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_application_access_sessions (
      session_hash TEXT PRIMARY KEY, application_id TEXT NOT NULL, created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_access_email ON media_application_access(applicant_email,expires_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_access_sessions_application ON media_application_access_sessions(application_id,expires_at)`)
  ]);
  return db;
}
async function record(env,type,data={}){
  const db=await ensureSchema(env);
  await db.prepare(`INSERT INTO media_outreach_events(id,event_type,mail_code,application_id,outlet,email,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(),type,clean(data.mailCode),clean(data.applicationId),clean(data.outlet),clean(data.email).toLowerCase(),JSON.stringify(data.detail||{}),now()).run();
}
async function assetResponse(request,env){
  if(!env.ASSETS?.fetch)return json({ok:false,error:'ui_asset_binding_missing'},503);
  const response=await env.ASSETS.fetch(new Request(new URL('/media-access/index.html',request.url),{method:'GET',headers:{accept:'text/html'}}));
  if(!response.ok)return json({ok:false,error:'ui_asset_missing'},404);
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-robots-tag','noindex,nofollow,noarchive');
  headers.set('x-content-type-options','nosniff');
  headers.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  headers.set('x-gnk-asg-media-access',VERSION);
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
}
async function sendAccessEmail(env,application,code,expiresAt){
  if(!env.EMAIL?.send)throw new Error('EMAIL binding is not configured');
  const to=clean(application.applicant_email).toLowerCase();
  if(!validEmail(to))throw new Error('Applicant email is invalid');
  const from=clean(env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT;
  const loginUrl=`https://gnk-asg.hr/media-access/?application=${encodeURIComponent(application.application_id)}`;
  const subject=`[${application.application_id}] GNK ASG login code / pristupni kod`;
  const text=[
    `Poštovani / Dear ${clean(application.applicant_name)||'Applicant'},`,'',
    `Prijava redakcije ${clean(application.outlet_name)||''} odobrena je za sljedeći korak.`,
    `The application submitted by ${clean(application.outlet_name)||'your newsroom'} has been approved for the next step.`,'',
    `LOGIN CODE / PRISTUPNI KOD: ${code}`,
    `APPLICATION ID / ŠIFRA PRIJAVE: ${application.application_id}`,
    `LOGIN / PRIJAVA: ${loginUrl}`,
    `Vrijedi do / Valid until: ${new Intl.DateTimeFormat('hr-HR',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Zagreb'}).format(new Date(expiresAt))}`,'',
    'Kod je osoban. Nemojte ga prosljeđivati. / This code is personal. Do not forward it.','',
    'GNK ASG Media Relations',from
  ].join('\n');
  const raw=[
    `From: GNK ASG Media Relations <${from}>`,`To: ${to}`,`Reply-To: ${from}`,
    `Subject: ${subject}`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${crypto.randomUUID()}@gnk-asg.hr>`,
    'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',foldBase64(bytesToBase64(enc.encode(text))),''].join('\r\n');
  await env.EMAIL.send(new EmailMessage(from,to,raw));
  return true;
}
async function issueCode(env,applicationId,{reason='APPROVED'}={}){
  const db=await ensureSchema(env);
  const application=await db.prepare(`SELECT application_id,invitation_code,outlet_name,applicant_name,applicant_email,human_decision FROM media_applications WHERE application_id=?`).bind(clean(applicationId)).first();
  if(!application)throw new Error('application_not_found');
  if(clean(application.human_decision)!=='APPROVED')throw new Error('application_not_approved');
  if(!validEmail(application.applicant_email))throw new Error('invalid_applicant_email');
  const code=makeCode();
  const issuedAt=now();
  const expiresAt=new Date(Date.now()+30*24*60*60*1000).toISOString();
  const hash=await sha256(`${application.application_id}:${code}`);
  const existing=await db.prepare(`SELECT issue_count FROM media_application_access WHERE application_id=?`).bind(application.application_id).first();
  const issueCount=Number(existing?.issue_count||0)+1;
  await db.prepare(`INSERT INTO media_application_access(application_id,applicant_email,code_hash,code_last4,issued_at,expires_at,sent_at,send_status,issue_count,last_error,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(application_id) DO UPDATE SET applicant_email=excluded.applicant_email,code_hash=excluded.code_hash,code_last4=excluded.code_last4,issued_at=excluded.issued_at,expires_at=excluded.expires_at,sent_at=NULL,send_status='PENDING',issue_count=excluded.issue_count,last_error='',updated_at=excluded.updated_at`)
    .bind(application.application_id,application.applicant_email.toLowerCase(),hash,code.slice(-4),issuedAt,expiresAt,null,'PENDING',issueCount,'',issuedAt,issuedAt).run();
  await db.prepare(`DELETE FROM media_application_access_sessions WHERE application_id=?`).bind(application.application_id).run();
  try{
    await sendAccessEmail(env,application,code,expiresAt);
    const sentAt=now();
    await db.prepare(`UPDATE media_application_access SET sent_at=?,send_status='SENT',last_error='',updated_at=? WHERE application_id=?`).bind(sentAt,sentAt,application.application_id).run();
    await record(env,'application_access_code_sent',{mailCode:application.invitation_code,applicationId:application.application_id,outlet:application.outlet_name,email:application.applicant_email,detail:{reason,expiresAt,last4:code.slice(-4),issueCount}});
    return{ok:true,applicationId:application.application_id,email:application.applicant_email,sendStatus:'SENT',issuedAt,expiresAt,last4:code.slice(-4),issueCount};
  }catch(error){
    const message=String(error?.message||error).slice(0,300);
    await db.prepare(`UPDATE media_application_access SET send_status='FAILED',last_error=?,updated_at=? WHERE application_id=?`).bind(message,now(),application.application_id).run();
    await record(env,'application_access_code_failed',{mailCode:application.invitation_code,applicationId:application.application_id,outlet:application.outlet_name,email:application.applicant_email,detail:{reason,error:message,issueCount}});
    return{ok:false,applicationId:application.application_id,email:application.applicant_email,sendStatus:'FAILED',issuedAt,expiresAt,last4:code.slice(-4),issueCount,error:message};
  }
}
function publicApplication(row){return{applicationId:row.application_id,outletName:row.outlet_name,applicantName:row.applicant_name,status:row.status,humanDecision:row.human_decision,decidedAt:row.decided_at};}
async function failedAttempts(env,applicationId){
  const db=await ensureSchema(env);
  return Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_outreach_events WHERE event_type='application_access_login_failed' AND application_id=? AND datetime(created_at)>=datetime('now','-15 minutes')`).bind(applicationId).first())?.count||0);
}
async function login(request,env){
  if(!sameOrigin(request))return json({ok:false,error:'origin_not_allowed'},403);
  let body={};try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const applicationId=clean(body.applicationId).toUpperCase();
  const code=clean(body.code).toUpperCase().replace(/\s+/g,'');
  if(!validApplicationId(applicationId)||!validCode(code))return json({ok:false,error:'invalid_credentials'},401);
  if(await failedAttempts(env,applicationId)>=5)return json({ok:false,error:'rate_limit'},429);
  const db=await ensureSchema(env);
  const row=await db.prepare(`SELECT a.application_id,a.outlet_name,a.applicant_name,a.applicant_email,a.status,a.human_decision,a.decided_at,x.code_hash,x.expires_at,x.send_status
    FROM media_applications a JOIN media_application_access x ON x.application_id=a.application_id WHERE a.application_id=?`).bind(applicationId).first();
  const candidate=await sha256(`${applicationId}:${code}`);
  if(!row||!secureEqual(row.code_hash,candidate)){
    await record(env,'application_access_login_failed',{applicationId,email:row?.applicant_email||'',outlet:row?.outlet_name||'',detail:{reason:'invalid_credentials'}});
    return json({ok:false,error:'invalid_credentials'},401);
  }
  if(clean(row.human_decision)!=='APPROVED')return json({ok:false,error:'application_not_approved'},403);
  if(Date.parse(row.expires_at)<=Date.now())return json({ok:false,error:'code_expired'},410);
  const token=makeSessionToken();
  const sessionHash=await sha256(token);
  const createdAt=now();
  const expiresAt=new Date(Date.now()+SESSION_SECONDS*1000).toISOString();
  await db.prepare(`INSERT INTO media_application_access_sessions(session_hash,application_id,created_at,expires_at,last_seen_at) VALUES(?,?,?,?,?)`).bind(sessionHash,applicationId,createdAt,expiresAt,createdAt).run();
  await record(env,'application_access_login_success',{applicationId,email:row.applicant_email,outlet:row.outlet_name,detail:{sessionExpiresAt:expiresAt}});
  return json({ok:true,application:publicApplication(row),sessionExpiresAt:expiresAt},200,{'set-cookie':sessionCookie(token)});
}
async function session(request,env){
  const token=cookieValue(request);
  if(!token)return json({ok:false,error:'no_session'},401);
  const db=await ensureSchema(env);
  const sessionHash=await sha256(token);
  const row=await db.prepare(`SELECT s.session_hash,s.expires_at,a.application_id,a.outlet_name,a.applicant_name,a.status,a.human_decision,a.decided_at
    FROM media_application_access_sessions s JOIN media_applications a ON a.application_id=s.application_id WHERE s.session_hash=?`).bind(sessionHash).first();
  if(!row||Date.parse(row.expires_at)<=Date.now()){
    if(row)await db.prepare(`DELETE FROM media_application_access_sessions WHERE session_hash=?`).bind(sessionHash).run();
    return json({ok:false,error:'session_expired'},401,{'set-cookie':clearCookie()});
  }
  await db.prepare(`UPDATE media_application_access_sessions SET last_seen_at=? WHERE session_hash=?`).bind(now(),sessionHash).run();
  return json({ok:true,application:publicApplication(row),sessionExpiresAt:row.expires_at});
}
async function logout(request,env){
  const token=cookieValue(request);
  if(token){const db=await ensureSchema(env);await db.prepare(`DELETE FROM media_application_access_sessions WHERE session_hash=?`).bind(await sha256(token)).run();}
  return json({ok:true},200,{'set-cookie':clearCookie()});
}
async function accessRows(env,ids=[]){
  const db=await ensureSchema(env);
  const output=new Map();
  for(const id of ids){
    const row=await db.prepare(`SELECT application_id,applicant_email,code_last4,issued_at,expires_at,sent_at,send_status,issue_count,last_error FROM media_application_access WHERE application_id=?`).bind(id).first();
    if(row)output.set(id,{email:row.applicant_email,last4:row.code_last4,issuedAt:row.issued_at,expiresAt:row.expires_at,sentAt:row.sent_at,sendStatus:row.send_status,issueCount:row.issue_count,lastError:row.last_error,expired:Date.parse(row.expires_at)<=Date.now()});
  }
  return output;
}
async function enrichApplications(response,env){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    if(!Array.isArray(payload.applications))return response;
    const rows=await accessRows(env,payload.applications.map(item=>item.applicationId).filter(Boolean));
    payload.applications=payload.applications.map(item=>({...item,access:rows.get(item.applicationId)||null}));
    payload.mediaAccessVersion=VERSION;
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('x-gnk-asg-media-access',VERSION);
    return new Response(JSON.stringify(payload,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}
async function enrichStatus(response,env){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();const db=await ensureSchema(env);
    const counts=await db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN send_status='SENT' THEN 1 ELSE 0 END) AS sent,SUM(CASE WHEN send_status='FAILED' THEN 1 ELSE 0 END) AS failed,SUM(CASE WHEN datetime(expires_at)<=datetime('now') THEN 1 ELSE 0 END) AS expired FROM media_application_access`).first();
    payload.accessCodes={total:Number(counts?.total||0),sent:Number(counts?.sent||0),failed:Number(counts?.failed||0),expired:Number(counts?.expired||0),version:VERSION};
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('x-gnk-asg-media-access',VERSION);
    return new Response(JSON.stringify(payload,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}
export async function applyMediaApplicationAccess(request,env,response){
  const path=pathOf(request);
  if(['GET','HEAD'].includes(request.method)&&path===PUBLIC_UI)return assetResponse(request,env);
  if(request.method==='POST'&&path===`${PUBLIC_API}/login`)return login(request,env);
  if(request.method==='GET'&&path===`${PUBLIC_API}/session`)return session(request,env);
  if(request.method==='POST'&&path===`${PUBLIC_API}/logout`)return logout(request,env);
  if(request.method==='GET'&&path===`${ADMIN_API}/applications`)return enrichApplications(response,env);
  if(request.method==='GET'&&path===`${ADMIN_API}/status`)return enrichStatus(response,env);
  if(request.method==='POST'&&path===`${ADMIN_API}/application-decision`&&response.ok){
    try{
      const body=await request.json();
      if(clean(body.decision).toUpperCase()!=='APPROVED')return response;
      const access=await issueCode(env,body.applicationId,{reason:'APPROVED'});
      const payload=await response.json().catch(()=>({ok:true}));
      return json({...payload,accessCode:access},response.status,response.headers);
    }catch(error){
      const payload=await response.json().catch(()=>({ok:true}));
      return json({...payload,accessCode:{ok:false,error:String(error?.message||error)}},response.status,response.headers);
    }
  }
  if(request.method==='POST'&&path===`${ADMIN_API}/resend-access-code`){
    if(response.status===401||response.status===403)return response;
    try{const body=await request.json();return json(await issueCode(env,body.applicationId,{reason:'ADMIN_RESEND'}));}
    catch(error){const message=String(error?.message||error);return json({ok:false,error:message},message==='application_not_found'?404:400);}
  }
  return response;
}
