export const MEDIA_ACCESS_VERSION='GNK_ASG_MEDIA_ACCESS_SERVICE_V1_20260628';
const API_PREFIX='/api/media-access';
const CODE_TTL_MINUTES=20;
const SESSION_TTL_HOURS=12;
const enc=new TextEncoder();
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const dbOf=env=>env.GNK_ASG_D1||null;
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';

function json(data,status=200,extra={}){
  return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-gnk-asg-media-access':MEDIA_ACCESS_VERSION,...extra}});
}
function tokens(env){return [env.OPERATOR_TOKEN,env.GNK_ASG_OPERATOR_TOKEN,env.ADMIN_TOKEN,env.GNK_ASG_ADMIN_TOKEN,env.NEWS_PUBLISH_TOKEN,env.SECRET_TOKEN].map(clean).filter(Boolean);}
function authorized(request,env){
  const authorization=request.headers.get('authorization')||'';
  const token=clean(authorization.replace(/^Bearer\s+/i,'')||request.headers.get('x-operator-token')||request.headers.get('x-admin-token')||request.headers.get('x-gnk-asg-token'));
  return Boolean(token&&tokens(env).includes(token));
}
async function hexHash(value){
  const digest=await crypto.subtle.digest('SHA-256',enc.encode(value));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function secretOf(env){return clean(env.MEDIA_ACCESS_SECRET||env.OPERATOR_TOKEN||env.GNK_ASG_OPERATOR_TOKEN||env.ADMIN_TOKEN||env.SECRET_TOKEN);}
async function hashCode(env,mailCode,email,code){const secret=secretOf(env);if(!secret)throw new Error('MEDIA_ACCESS_SECRET missing');return hexHash(`${secret}|media-code|${mailCode}|${email.toLowerCase()}|${code}`);}
async function hashSession(env,token){const secret=secretOf(env);if(!secret)throw new Error('MEDIA_ACCESS_SECRET missing');return hexHash(`${secret}|media-session|${token}`);}
function randomDigits(){const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);return [...bytes].map(x=>String(x%10)).join('');}
function randomToken(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');}
function cookieValue(request,name){
  const raw=request.headers.get('cookie')||'';
  for(const part of raw.split(';')){const index=part.indexOf('=');if(index<0)continue;if(part.slice(0,index).trim()===name)return decodeURIComponent(part.slice(index+1).trim());}
  return '';
}
async function ensureAccessSchema(env){
  const db=dbOf(env);if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_access_codes (id TEXT PRIMARY KEY,mail_code TEXT NOT NULL,email TEXT NOT NULL,code_hash TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE',expires_at TEXT NOT NULL,used_at TEXT,attempts INTEGER NOT NULL DEFAULT 0,sent_at TEXT,revoked_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_access_code_lookup ON media_access_codes(mail_code,email,status,expires_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_access_sessions (id TEXT PRIMARY KEY,mail_code TEXT NOT NULL,email TEXT NOT NULL,session_hash TEXT UNIQUE NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,revoked_at TEXT)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_access_session_lookup ON media_access_sessions(session_hash,expires_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_access_audit (id TEXT PRIMARY KEY,event_type TEXT NOT NULL,mail_code TEXT,email TEXT,detail_json TEXT,created_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_access_audit_created ON media_access_audit(created_at,event_type)`)
  ]);
  return db;
}
async function accessEvent(env,eventType,data={}){
  const db=await ensureAccessSchema(env);
  await db.prepare(`INSERT INTO media_access_audit(id,event_type,mail_code,email,detail_json,created_at) VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(),eventType,clean(data.mailCode),clean(data.email).toLowerCase(),JSON.stringify(data.detail||{}),now()).run();
}
async function adminList(request,env){
  if(!authorized(request,env))return json({ok:false,error:'unauthorized'},401);
  const db=await ensureAccessSchema(env),url=new URL(request.url),q=`%${clean(url.searchParams.get('q')).toLowerCase()}%`;
  const rows=(await db.prepare(`SELECT c.mail_code,c.priority,c.country,c.outlet,c.recipient_title,c.recipient_name,c.role,c.email,c.language,c.approved,c.automation_allowed,c.sent_status,c.response_status,a.status AS access_status,a.expires_at AS access_expires_at,a.sent_at AS access_sent_at,a.used_at AS access_used_at,a.revoked_at AS access_revoked_at,a.attempts AS access_attempts,p.application_id,p.received_at,p.outlet_name,p.applicant_name,p.applicant_email,p.editor_name,p.editor_email,p.status AS application_status,p.human_decision FROM media_outreach_contacts c LEFT JOIN media_access_codes a ON a.id=(SELECT id FROM media_access_codes x WHERE x.mail_code=c.mail_code ORDER BY x.created_at DESC LIMIT 1) LEFT JOIN media_applications p ON p.application_id=(SELECT application_id FROM media_applications y WHERE y.invitation_code=c.mail_code ORDER BY y.received_at DESC LIMIT 1) WHERE (?='%%' OR LOWER(c.mail_code) LIKE ? OR LOWER(c.outlet) LIKE ? OR LOWER(c.recipient_name) LIKE ? OR LOWER(c.email) LIKE ?) ORDER BY CASE c.priority WHEN 'A' THEN 0 WHEN 'B' THEN 1 ELSE 2 END,c.country,c.outlet LIMIT 250`).bind(q,q,q,q,q).all()).results||[];
  return json({ok:true,version:MEDIA_ACCESS_VERSION,count:rows.length,items:rows});
}
async function issueCode(request,env){
  if(!authorized(request,env))return json({ok:false,error:'unauthorized'},401);
  let body={};try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const db=await ensureAccessSchema(env),mailCode=clean(body.mailCode).toUpperCase();
  const contact=await db.prepare(`SELECT mail_code,outlet,email,approved,automation_allowed FROM media_outreach_contacts WHERE mail_code=?`).bind(mailCode).first();
  if(!contact)return json({ok:false,error:'contact_not_found'},404);
  const email=clean(body.email||contact.email).toLowerCase();
  if(!validEmail(email))return json({ok:false,error:'verified_email_missing'},409);
  if(!contact.approved||!contact.automation_allowed)return json({ok:false,error:'invitation_not_approved'},409);
  const live=body.live===true;
  const code=randomDigits(),stamp=now(),expiresAt=new Date(Date.now()+CODE_TTL_MINUTES*60000).toISOString();
  await db.prepare(`UPDATE media_access_codes SET status='REPLACED',revoked_at=?,updated_at=? WHERE mail_code=? AND status='ACTIVE'`).bind(stamp,stamp,mailCode).run();
  await db.prepare(`INSERT INTO media_access_codes(id,mail_code,email,code_hash,status,expires_at,sent_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),mailCode,email,await hashCode(env,mailCode,email,code),live?'ACTIVE':'DRY_RUN_READY',expiresAt,live?stamp:null,stamp,stamp).run();
  await accessEvent(env,live?'access_code_issued':'access_code_dry_run',{mailCode,email,detail:{expiresAt,live}});
  return json({ok:true,live,mailCode,email,outlet:contact.outlet,expiresAt,delivery:live?'READY_FOR_DELIVERY':'DRY_RUN_ONLY',codePreview:live?undefined:code},201);
}
async function verifyCode(request,env){
  let body={};try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const mailCode=clean(body.mailCode).toUpperCase(),email=clean(body.email).toLowerCase(),code=clean(body.code).replace(/\D/g,'');
  if(!mailCode||!validEmail(email)||!/^[0-9]{6}$/.test(code))return json({ok:false,error:'invalid_credentials'},400);
  const db=await ensureAccessSchema(env);
  const row=await db.prepare(`SELECT * FROM media_access_codes WHERE mail_code=? AND LOWER(email)=LOWER(?) AND status='ACTIVE' ORDER BY created_at DESC LIMIT 1`).bind(mailCode,email).first();
  if(!row)return json({ok:false,error:'code_not_found'},404);
  if(Date.parse(row.expires_at)<=Date.now())return json({ok:false,error:'code_expired'},410);
  if(Number(row.attempts||0)>=5)return json({ok:false,error:'code_locked'},429);
  if(await hashCode(env,mailCode,email,code)!==row.code_hash){await db.prepare(`UPDATE media_access_codes SET attempts=attempts+1,updated_at=? WHERE id=?`).bind(now(),row.id).run();await accessEvent(env,'access_code_rejected',{mailCode,email});return json({ok:false,error:'invalid_code'},401);}
  const token=randomToken(),stamp=now(),expiresAt=new Date(Date.now()+SESSION_TTL_HOURS*3600000).toISOString();
  await db.prepare(`UPDATE media_access_codes SET status='USED',used_at=?,updated_at=? WHERE id=?`).bind(stamp,stamp,row.id).run();
  await db.prepare(`INSERT INTO media_access_sessions(id,mail_code,email,session_hash,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),mailCode,email,await hashSession(env,token),expiresAt,stamp,stamp).run();
  await accessEvent(env,'access_login',{mailCode,email,detail:{expiresAt}});
  return json({ok:true,mailCode,email,expiresAt,applicationUrl:`/media-application/?invitationCode=${encodeURIComponent(mailCode)}`},200,{'set-cookie':`gnk_media_access=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_HOURS*3600}; HttpOnly; Secure; SameSite=Lax`});
}
async function sessionInfo(request,env){
  const token=cookieValue(request,'gnk_media_access');if(!token)return json({ok:false,authenticated:false},401);
  const db=await ensureAccessSchema(env),digest=await hashSession(env,token);
  const session=await db.prepare(`SELECT * FROM media_access_sessions WHERE session_hash=? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`).bind(digest).first();
  if(!session||Date.parse(session.expires_at)<=Date.now())return json({ok:false,authenticated:false,error:'session_expired'},401);
  await db.prepare(`UPDATE media_access_sessions SET last_seen_at=? WHERE id=?`).bind(now(),session.id).run();
  return json({ok:true,authenticated:true,mailCode:session.mail_code,email:session.email,expiresAt:session.expires_at,applicationUrl:`/media-application/?invitationCode=${encodeURIComponent(session.mail_code)}`});
}
async function logout(request,env){
  const token=cookieValue(request,'gnk_media_access');
  if(token){const db=await ensureAccessSchema(env);await db.prepare(`UPDATE media_access_sessions SET revoked_at=? WHERE session_hash=?`).bind(now(),await hashSession(env,token)).run();}
  return json({ok:true},200,{'set-cookie':'gnk_media_access=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'});
}

export async function handleMediaAccess(request,env){
  const path=pathOf(request);
  if(path===`${API_PREFIX}/admin/list`&&request.method==='GET')return adminList(request,env);
  if(path===`${API_PREFIX}/admin/issue`&&request.method==='POST')return issueCode(request,env);
  if(path===`${API_PREFIX}/verify`&&request.method==='POST')return verifyCode(request,env);
  if(path===`${API_PREFIX}/session`&&request.method==='GET')return sessionInfo(request,env);
  if(path===`${API_PREFIX}/logout`&&request.method==='POST')return logout(request,env);
  if(path===API_PREFIX||path.startsWith(`${API_PREFIX}/`))return json({ok:false,error:'not_found'},404);
  return null;
}
