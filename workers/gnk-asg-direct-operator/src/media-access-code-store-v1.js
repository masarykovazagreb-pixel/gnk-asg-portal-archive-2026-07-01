export const VERSION='GNK_ASG_MEDIA_ACCESS_CODE_STORE_V1_20260628';
const enc=new TextEncoder();
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));

function dbOf(env){return env.GNK_ASG_D1||null}
function secretOf(env){return clean(env.MEDIA_ACCESS_SECRET||env.OPERATOR_TOKEN||env.GNK_ASG_OPERATOR_TOKEN||env.ADMIN_TOKEN||env.SECRET_TOKEN)}
async function digest(value){const out=await crypto.subtle.digest('SHA-256',enc.encode(value));return[...new Uint8Array(out)].map(v=>v.toString(16).padStart(2,'0')).join('')}
async function codeHash(env,mailCode,email,code){const secret=secretOf(env);if(!secret)throw Object.assign(new Error('Media access key missing'),{code:'MEDIA_ACCESS_KEY_MISSING'});return digest(`${secret}|media-code|${mailCode}|${email}|${code}`)}
function randomCode(){let out='';const bytes=new Uint8Array(16);while(out.length<6){crypto.getRandomValues(bytes);for(const value of bytes)if(value<250&&out.length<6)out+=String(value%10)}return out}

async function schema(env){
  const db=dbOf(env);if(!db)throw Object.assign(new Error('D1 unavailable'),{code:'MEDIA_ACCESS_D1_MISSING'});
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_access_codes (id TEXT PRIMARY KEY,mail_code TEXT NOT NULL,email TEXT NOT NULL,code_hash TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE',expires_at TEXT NOT NULL,used_at TEXT,attempts INTEGER NOT NULL DEFAULT 0,sent_at TEXT,revoked_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_access_audit (id TEXT PRIMARY KEY,event_type TEXT NOT NULL,mail_code TEXT,email TEXT,detail_json TEXT,created_at TEXT NOT NULL)`)
  ]);
  return db;
}
async function audit(env,eventType,prepared,detail={}){const db=await schema(env);await db.prepare(`INSERT INTO media_access_audit(id,event_type,mail_code,email,detail_json,created_at) VALUES(?,?,?,?,?,?)`).bind(crypto.randomUUID(),eventType,prepared.mailCode,prepared.email,JSON.stringify(detail),now()).run()}

export async function prepareAccessCode(env,{mailCode:rawCode,email:rawEmail,queueId='',pdfSha256=''}){
  const db=await schema(env),mailCode=clean(rawCode).toUpperCase();
  const contact=await db.prepare(`SELECT c.mail_code,c.outlet,c.email,c.language,c.approved,c.automation_allowed,ctrl.operational_status,s.email AS suppressed_email FROM media_outreach_contacts c LEFT JOIN media_outreach_contact_controls ctrl ON ctrl.mail_code=c.mail_code LEFT JOIN media_suppressions s ON LOWER(s.email)=LOWER(c.email) WHERE c.mail_code=? LIMIT 1`).bind(mailCode).first();
  if(!contact)throw Object.assign(new Error('Contact missing'),{code:'MEDIA_ACCESS_CONTACT_MISSING'});
  const email=clean(rawEmail).toLowerCase();
  if(!validEmail(email)||email!==clean(contact.email).toLowerCase())throw Object.assign(new Error('Email mismatch'),{code:'MEDIA_ACCESS_EMAIL_MISMATCH'});
  if(!contact.approved||!contact.automation_allowed)throw Object.assign(new Error('Invitation not approved'),{code:'MEDIA_ACCESS_NOT_APPROVED'});
  if(clean(contact.operational_status)!=='READY'||contact.suppressed_email)throw Object.assign(new Error('Contact blocked'),{code:'MEDIA_ACCESS_CONTACT_BLOCKED'});
  const id=crypto.randomUUID(),code=randomCode(),stamp=now(),expiresAt=new Date(Date.now()+20*60000).toISOString();
  await db.prepare(`UPDATE media_access_codes SET status='REPLACED',revoked_at=?,updated_at=? WHERE mail_code=? AND status='DELIVERY_PENDING'`).bind(stamp,stamp,mailCode).run();
  await db.prepare(`INSERT INTO media_access_codes(id,mail_code,email,code_hash,status,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`).bind(id,mailCode,email,await codeHash(env,mailCode,email,code),'DELIVERY_PENDING',expiresAt,stamp,stamp).run();
  const prepared={id,mailCode,email,code,expiresAt,outlet:clean(contact.outlet),language:clean(contact.language)};
  await audit(env,'access_code_delivery_pending',prepared,{queueId,pdfSha256,version:VERSION});
  return prepared;
}

export async function activateAccessCode(env,prepared,{queueId='',messageId=''}={}){
  const db=await schema(env),stamp=now();
  const result=await db.prepare(`UPDATE media_access_codes SET status='ACTIVE',sent_at=?,updated_at=? WHERE id=? AND status='DELIVERY_PENDING'`).bind(stamp,stamp,prepared.id).run();
  if(Number(result.meta?.changes||0)!==1)throw Object.assign(new Error('Activation failed'),{code:'MEDIA_ACCESS_ACTIVATION_FAILED'});
  await db.prepare(`UPDATE media_access_codes SET status='REPLACED',revoked_at=?,updated_at=? WHERE mail_code=? AND id<>? AND status IN ('ACTIVE','DRY_RUN_READY')`).bind(stamp,stamp,prepared.mailCode,prepared.id).run();
  await audit(env,'access_code_invitation_sent',prepared,{queueId,messageId,expiresAt:prepared.expiresAt,version:VERSION});
}

export async function failAccessCode(env,prepared,error,{queueId='',messageId=''}={}){
  if(!prepared?.id)return;
  const db=await schema(env),stamp=now();
  await db.prepare(`UPDATE media_access_codes SET status='DELIVERY_FAILED',revoked_at=?,updated_at=? WHERE id=? AND status='DELIVERY_PENDING'`).bind(stamp,stamp,prepared.id).run();
  await audit(env,'access_code_delivery_failed',prepared,{queueId,messageId,errorCode:clean(error?.code),error:String(error?.message||error).slice(0,240),version:VERSION});
}
