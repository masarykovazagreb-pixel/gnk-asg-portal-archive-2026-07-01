import {
  handleMediaRegistrationPublic as legacyPublic,
  handleMediaRegistrationAdmin as legacyAdmin
} from './media-registration-v1.js';
import {
  handleMediaRegistrationReviewAdmin,
  patchMediaRegistrationAdminPage,
  VERSION as REVIEW_VERSION
} from './media-registration-review-admin-v1.js';
import {
  handleMediaRegistrationReviewDecision,
  patchMediaRegistrationDecisionGuard,
  VERSION as DECISION_VERSION
} from './media-registration-review-decision-v1.js';

export const VERSION=`GNK_ASG_MEDIA_REGISTRATION_POST_CODE_V9_20260704_${REVIEW_VERSION}_${DECISION_VERSION}`;
export const PUBLIC_UI='/media-application';
export const ADMIN_UI='/media-registration-admin';

const PUBLIC_API='/api/media-registration';
const ADMIN_API='/api/media-registration-admin';
const DEADLINE='2026-07-20T21:59:59.000Z';
const ACCESS_EXPIRES='2026-10-10T23:59:59.000Z';
const REGISTRATION_URL='https://gnk-asg.hr/media-application/?lang=en';
const THE_CODE_URL='https://gnk-asg.hr/the-code/';
const PDF_DOWNLOAD_URL='https://gnk-asg.hr/api/media-registration/memorandum.pdf';
const VERIFIED_MEMORANDUM_KEY='media-outreach/campaigns/new-york-2026/5c33f1dea158ff8938122c024e857997eb2f156a039c4b76c0cca133f1e0aa95.pdf';
const VERIFIED_MEMORANDUM_SHA256='5c33f1dea158ff8938122c024e857997eb2f156a039c4b76c0cca133f1e0aa95';
const VERIFIED_MEMORANDUM_SIZE=208207;
const FREE_DOMAINS=new Set(['gmail.com','googlemail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','aol.com','proton.me','protonmail.com','gmx.com','mail.com','yandex.com','yandex.ru']);
const enc=new TextEncoder();
const clean=v=>String(v??'').trim();
const now=()=>new Date().toISOString();
const pathOf=r=>new URL(r.url).pathname.replace(/\/+$/,'')||'/';
const dbOf=e=>e.GNK_ASG_D1||null;
const kvOf=e=>e.GNK_ASG_KV||e.GNK_ASG_CONFIG_KV||null;
const bucketOf=e=>e.GNK_ASG_MEDIA_ASSETS||null;
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(v));
const officialEmail=v=>validEmail(v)&&!FREE_DOMAINS.has(clean(v).toLowerCase().split('@')[1]||'');

function json(data,status=200,extra={}){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-content-type-options':'nosniff','x-gnk-asg-media-registration-post-code':VERSION,...extra}});}
async function sha(v){const d=await crypto.subtle.digest('SHA-256',enc.encode(String(v||'')));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function makePin(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',b=crypto.getRandomValues(new Uint8Array(10));return[...b].map(x=>a[x%a.length]).join('');}
function makeCode(){const d=new Date().toISOString().slice(0,10).replace(/-/g,''),t=crypto.randomUUID().replace(/-/g,'').slice(0,6).toUpperCase(),n=String(crypto.getRandomValues(new Uint16Array(1))[0]%1000).padStart(3,'0');return`GNK-MEDIA-${d}-XX-OPEN${t}-${n}`;}
function sameOrigin(r){const o=r.headers.get('origin');if(!o)return true;try{return new URL(o).origin===new URL(r.url).origin}catch{return false}}

async function schema(env){const db=dbOf(env);if(!db)throw new Error('GNK_ASG_D1 binding missing');await db.batch([
 db.prepare(`CREATE TABLE IF NOT EXISTS media_invitation_access(mail_code TEXT PRIMARY KEY,outlet TEXT NOT NULL,email TEXT NOT NULL,recipient_name TEXT,recipient_title TEXT,country TEXT,language TEXT,pin_hash TEXT NOT NULL,pin_cipher TEXT,pin_iv TEXT,issued_at TEXT NOT NULL,expires_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE',mail_status TEXT NOT NULL DEFAULT 'QUEUED',queued_at TEXT NOT NULL,start_after TEXT,sent_at TEXT,provider_message_id TEXT,last_error TEXT,updated_at TEXT NOT NULL)`),
 db.prepare(`CREATE TABLE IF NOT EXISTS media_registration_audit(id TEXT PRIMARY KEY,event_type TEXT NOT NULL,mail_code TEXT,detail_json TEXT,created_at TEXT NOT NULL)`),
 db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_invitation_email ON media_invitation_access(email,updated_at)`)
]);return db;}
async function audit(env,type,code,detail={}){const db=await schema(env);await db.prepare(`INSERT INTO media_registration_audit(id,event_type,mail_code,detail_json,created_at) VALUES(?,?,?,?,?)`).bind(crypto.randomUUID(),type,clean(code),JSON.stringify(detail),now()).run();}

async function startRegistration(r,env){
 if(!sameOrigin(r))return json({ok:false,error:'origin_not_allowed'},403);
 let b={};try{b=await r.json()}catch{return json({ok:false,error:'invalid_json'},400)}
 const outlet=clean(b.outlet),email=clean(b.officialEmail).toLowerCase(),contactName=clean(b.contactName),country=clean(b.country),website=clean(b.website);
 if(outlet.length<2||!officialEmail(email)||contactName.length<2||country.length<2||!/^https?:\/\//i.test(website))return json({ok:false,error:'initial_registration_invalid'},400);
 const db=await schema(env);
 const recent=await db.prepare(`SELECT mail_code FROM media_invitation_access WHERE LOWER(email)=? AND datetime(updated_at)>=datetime('now','-5 minutes') LIMIT 1`).bind(email).first();
 if(recent)return json({ok:false,error:'registration_rate_limited',message:'A code was issued recently. Use the code already shown or try again later.'},429);
 let code=makeCode();while(await db.prepare(`SELECT mail_code FROM media_invitation_access WHERE mail_code=?`).bind(code).first())code=makeCode();
 const pin=makePin(),t=now(),pinHash=await sha(`${code}:${pin}`);
 await db.prepare(`INSERT INTO media_invitation_access(mail_code,outlet,email,recipient_name,recipient_title,country,language,pin_hash,pin_cipher,pin_iv,issued_at,expires_at,status,mail_status,queued_at,start_after,sent_at,provider_message_id,last_error,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(code,outlet,email,contactName,'Newsroom representative',country,'English',pinHash,'','',t,ACCESS_EXPIRES,'ACTIVE','SELF_REGISTERED',t,'',t,null,'',t).run();
 await audit(env,'initial_registration_completed',code,{outlet,email,country,website});
 return json({ok:true,status:'ACCESS_ISSUED',invitationReference:code,personalAccessCode:pin,registrationUrl:REGISTRATION_URL,theCodeUrl:THE_CODE_URL,pdfDownloadUrl:PDF_DOWNLOAD_URL,deadline:DEADLINE,message:'Initial registration received. Save both access codes and continue to the full application.'},201);
}

async function campaign(env){const kv=kvOf(env);if(!kv)return{};try{const raw=await kv.get('media-command-center:campaign:v1');return raw?JSON.parse(raw):{}}catch{return{}}}
async function memorandum(r,env){
 const c=await campaign(env),bucket=bucketOf(env);
 const keys=[c.pdfR2Key,env.MEDIA_OUTREACH_PDF_KEY,VERIFIED_MEMORANDUM_KEY].map(clean).filter(Boolean);
 if(bucket?.get){for(const key of [...new Set(keys)]){const object=await bucket.get(key);if(!object)continue;const size=Number(object.size||0);if(key===VERIFIED_MEMORANDUM_KEY&&size&&size!==VERIFIED_MEMORANDUM_SIZE)continue;const h=new Headers({'content-type':'application/pdf','content-disposition':'attachment; filename="GNK_DINAMO_Ltd_Group_THE_CODE_EN_MEMORANDUM_CORRECT.pdf"','content-length':String(size||VERIFIED_MEMORANDUM_SIZE),'cache-control':'public, max-age=300, must-revalidate','etag':`"sha256-${VERIFIED_MEMORANDUM_SHA256}"`,'x-content-type-options':'nosniff','x-gnk-asg-media-registration-post-code':VERSION,'x-gnk-asg-memorandum-sha256':VERIFIED_MEMORANDUM_SHA256});return new Response(r.method==='HEAD'?null:object.body,{status:200,headers:h});}}
 return json({ok:false,error:'memorandum_not_published',expectedSha256:VERIFIED_MEMORANDUM_SHA256,expectedSize:VERIFIED_MEMORANDUM_SIZE},404);
}

async function patchPage(r,env){const response=await legacyPublic(r,env);if(!response||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;const html=await response.text(),tag='<script defer src="/assets/media-registration-post-code-v2.js?v=20260701-5"></script>',body=html.includes(tag)?html:html.replace('</body>',`${tag}</body>`),h=new Headers(response.headers);h.delete('content-length');h.delete('content-encoding');h.delete('etag');h.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');h.set('x-gnk-asg-media-registration-post-code',VERSION);return new Response(r.method==='HEAD'?null:body,{status:response.status,statusText:response.statusText,headers:h});}

export async function handleMediaRegistrationPublic(r,env){const p=pathOf(r);if(['GET','HEAD'].includes(r.method)&&(p===PUBLIC_UI||p===`${PUBLIC_UI}/`))return patchPage(r,env);if(r.method==='POST'&&p===`${PUBLIC_API}/start`)return startRegistration(r,env);if(['GET','HEAD'].includes(r.method)&&p===`${PUBLIC_API}/memorandum.pdf`)return memorandum(r,env);if(r.method==='GET'&&p===`${PUBLIC_API}/config`){const x=await legacyPublic(r,env);if(!x?.ok)return x;const d=await x.json();return json({...d,ok:true,links:{registration:REGISTRATION_URL,theCode:THE_CODE_URL,pdfDownload:PDF_DOWNLOAD_URL},codePolicy:'ISSUED_AFTER_INITIAL_REGISTRATION'});}return legacyPublic(r,env);}
export async function handleMediaRegistrationAdmin(r,env){
 const p=pathOf(r);
 if(['GET','HEAD'].includes(r.method)&&(p===ADMIN_UI||p===`${ADMIN_UI}/`)){
  const reviewed=await patchMediaRegistrationAdminPage(await legacyAdmin(r,env));
  return patchMediaRegistrationDecisionGuard(reviewed);
 }
 const decision=await handleMediaRegistrationReviewDecision(r,env);if(decision)return decision;
 const review=await handleMediaRegistrationReviewAdmin(r,env);if(review)return review;
 if(r.method==='POST'&&[`${ADMIN_API}/queue`,`${ADMIN_API}/send-test`,`${ADMIN_API}/dispatch-one`].includes(p))return json({ok:false,error:'legacy_code_before_registration_blocked',message:'Initial invitations may not contain access codes. Codes are issued only after initial registration.'},409);
 return legacyAdmin(r,env);
}
export async function processMediaInvitationQueue(){return{ok:true,skipped:'post_registration_code_policy'};}
