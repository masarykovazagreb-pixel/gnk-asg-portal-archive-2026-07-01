import { EmailMessage } from 'cloudflare:email';

export const VERSION='GNK_ASG_MEDIA_APPLICATION_ACCESS_V1_20260628';
const API='/api/media-command-center';
const FROM_DEFAULT='media@gnk-asg.hr';
const enc=new TextEncoder();
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const dbOf=env=>env.GNK_ASG_D1||null;

function json(payload,status=200,headers={}){
  return new Response(JSON.stringify(payload,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-gnk-asg-media-access':VERSION,...headers}});
}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));}
function foldBase64(value){return value.replace(/.{1,76}/g,'$&\r\n').trimEnd();}
function bytesToBase64(bytes){let out='';const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);for(let i=0;i<view.length;i+=0x8000)out+=String.fromCharCode(...view.subarray(i,i+0x8000));return btoa(out);}
async function sha256(value){const digest=await crypto.subtle.digest('SHA-256',enc.encode(String(value||'')));return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function makeCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=crypto.getRandomValues(new Uint8Array(8));return [...bytes].map(value=>alphabet[value%alphabet.length]).join('');}

async function ensureSchema(env){
  const db=dbOf(env);
  if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_application_access (
      application_id TEXT PRIMARY KEY, applicant_email TEXT NOT NULL, code_hash TEXT NOT NULL, code_last4 TEXT NOT NULL,
      issued_at TEXT NOT NULL, expires_at TEXT NOT NULL, sent_at TEXT, send_status TEXT NOT NULL DEFAULT 'PENDING',
      issue_count INTEGER NOT NULL DEFAULT 1, last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_access_email ON media_application_access(applicant_email,expires_at)`)
  ]);
  return db;
}
async function record(env,type,data={}){
  const db=await ensureSchema(env);
  await db.prepare(`INSERT INTO media_outreach_events(id,event_type,mail_code,application_id,outlet,email,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(),type,clean(data.mailCode),clean(data.applicationId),clean(data.outlet),clean(data.email).toLowerCase(),JSON.stringify(data.detail||{}),now()).run();
}
async function sendAccessEmail(env,application,code,expiresAt){
  if(!env.EMAIL?.send)throw new Error('EMAIL binding is not configured');
  const to=clean(application.applicant_email).toLowerCase();
  if(!validEmail(to))throw new Error('Applicant email is invalid');
  const from=clean(env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT;
  const subject=`[${application.application_id}] GNK ASG login code / pristupni kod`;
  const text=[
    `Poštovani / Dear ${clean(application.applicant_name)||'Applicant'},`,'',
    `Prijava redakcije ${clean(application.outlet_name)||''} odobrena je za sljedeći korak.`,
    `The application submitted by ${clean(application.outlet_name)||'your newsroom'} has been approved for the next step.`,'',
    `LOGIN CODE / PRISTUPNI KOD: ${code}`,
    `APPLICATION ID / ŠIFRA PRIJAVE: ${application.application_id}`,
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
async function issueCode(env,applicationId,{reason='APPROVED',force=false}={}){
  const db=await ensureSchema(env);
  const application=await db.prepare(`SELECT application_id,invitation_code,outlet_name,applicant_name,applicant_email,human_decision FROM media_applications WHERE application_id=?`).bind(clean(applicationId)).first();
  if(!application)throw new Error('application_not_found');
  if(!force&&clean(application.human_decision)!=='APPROVED')throw new Error('application_not_approved');
  if(!validEmail(application.applicant_email))throw new Error('invalid_applicant_email');
  const code=makeCode();
  const issuedAt=now();
  const expiresAt=new Date(Date.now()+30*24*60*60*1000).toISOString();
  const hash=await sha256(`${application.application_id}:${code}`);
  const existing=await db.prepare(`SELECT issue_count FROM media_application_access WHERE application_id=?`).bind(application.application_id).first();
  await db.prepare(`INSERT INTO media_application_access(application_id,applicant_email,code_hash,code_last4,issued_at,expires_at,sent_at,send_status,issue_count,last_error,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(application_id) DO UPDATE SET applicant_email=excluded.applicant_email,code_hash=excluded.code_hash,code_last4=excluded.code_last4,issued_at=excluded.issued_at,expires_at=excluded.expires_at,sent_at=NULL,send_status='PENDING',issue_count=?,last_error='',updated_at=excluded.updated_at`)
    .bind(application.application_id,application.applicant_email.toLowerCase(),hash,code.slice(-4),issuedAt,expiresAt,null,'PENDING',Number(existing?.issue_count||0)+1,'',issuedAt,issuedAt,Number(existing?.issue_count||0)+1).run();
  try{
    await sendAccessEmail(env,application,code,expiresAt);
    await db.prepare(`UPDATE media_application_access SET sent_at=?,send_status='SENT',last_error='',updated_at=? WHERE application_id=?`).bind(now(),now(),application.application_id).run();
    await record(env,'application_access_code_sent',{mailCode:application.invitation_code,applicationId:application.application_id,outlet:application.outlet_name,email:application.applicant_email,detail:{reason,expiresAt,last4:code.slice(-4)}});
    return{ok:true,applicationId:application.application_id,email:application.applicant_email,sendStatus:'SENT',issuedAt,expiresAt,last4:code.slice(-4)};
  }catch(error){
    const message=String(error?.message||error).slice(0,300);
    await db.prepare(`UPDATE media_application_access SET send_status='FAILED',last_error=?,updated_at=? WHERE application_id=?`).bind(message,now(),application.application_id).run();
    await record(env,'application_access_code_failed',{mailCode:application.invitation_code,applicationId:application.application_id,outlet:application.outlet_name,email:application.applicant_email,detail:{reason,error:message}});
    return{ok:false,applicationId:application.application_id,email:application.applicant_email,sendStatus:'FAILED',issuedAt,expiresAt,last4:code.slice(-4),error:message};
  }
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
  if(request.method==='GET'&&path===`${API}/applications`)return enrichApplications(response,env);
  if(request.method==='GET'&&path===`${API}/status`)return enrichStatus(response,env);
  if(request.method==='POST'&&path===`${API}/application-decision`&&response.ok){
    try{
      const body=await request.json();
      if(clean(body.decision).toUpperCase()!=='APPROVED')return response;
      const access=await issueCode(env,body.applicationId,{reason:'APPROVED',force:false});
      const payload=await response.json().catch(()=>({ok:true}));
      return json({...payload,accessCode:access},response.status,Object.fromEntries(response.headers));
    }catch(error){
      const payload=await response.json().catch(()=>({ok:true}));
      return json({...payload,accessCode:{ok:false,error:String(error?.message||error)}},response.status,Object.fromEntries(response.headers));
    }
  }
  if(request.method==='POST'&&path===`${API}/resend-access-code`){
    if(response.status===401||response.status===403)return response;
    try{const body=await request.json();return json(await issueCode(env,body.applicationId,{reason:'ADMIN_RESEND',force:true}));}
    catch(error){const message=String(error?.message||error);return json({ok:false,error:message},message==='application_not_found'?404:400);}
  }
  return response;
}
