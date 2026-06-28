import {enforceRequiredSignature,MANDATORY_BCC,VERSION as SIGNATURE_VERSION} from './email-signature-contract-v1.js';

export const VERSION='GNK_ASG_MANUAL_MAIL_SERVICE_V2_20260628';
export const SEND_PATH='/api/admin-mail-send';
export const PREFLIGHT_PATH='/api/mail-center/preflight';
export const STATUS_PATH='/api/mail-center/status';
export const SENT_PATH='/api/mail-center/sent';
export const OUTBOX_PATH='/api/mail-center/outbox';
export const INBOX_PATH='/api/mail-center/inbox';
export const READINESS_PATH='/api/mail-center/send-readiness';

const MAX_SUBJECT=240;
const MAX_BODY=250000;
const MAX_RECIPIENTS=25;
const MAX_ATTACHMENTS=8;
const MAX_ATTACHMENT_BYTES=3200000;
const MAX_TOTAL_ATTACHMENT_BYTES=3400000;
const DEDUPE_SECONDS=90;
const DEFAULT_HOURLY_LIMIT=10;
const DEFAULT_DAILY_LIMIT=50;

const PROFILES=new Map([
  ['office',{id:'office',name:'GNK ASG Office',email:'office@gnk-asg.hr'}],
  ['legal',{id:'legal',name:'GNK ASG Legal & Compliance',email:'legal@gnk-asg.hr'}],
  ['media',{id:'media',name:'GNK ASG Media Desk',email:'media@gnk-asg.hr'}],
  ['it',{id:'it',name:'IT – Osobni digitalni asistent',email:'it@gnk-asg.hr'}],
  ['director',{id:'director',name:'Nermin Sefić / Direktor',email:'nermin.sefic@gnk-asg.hr'}]
]);

const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const boolEnv=value=>/^(1|true|yes|on)$/i.test(clean(value));
const intEnv=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const dbOf=env=>env.GNK_ASG_D1||null;

function json(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-content-type-options':'nosniff',
    'x-gnk-asg-manual-mail-service':VERSION,
    'x-gnk-asg-email-signature-contract':SIGNATURE_VERSION,
    'x-gnk-asg-mandatory-copy':'ENFORCED'
  }});
}
function fail(error,status=400,extra={}){return json({ok:false,error,...extra},status);}
function parseEmails(value){
  const values=[];
  const add=item=>{
    if(Array.isArray(item)){item.forEach(add);return;}
    if(item&&typeof item==='object'){add(item.email||item.address||'');return;}
    String(item??'').split(/[;,\s]+/).forEach(part=>{const email=clean(part).toLowerCase();if(email)values.push(email);});
  };
  add(value);
  return [...new Set(values)];
}
function safeHeader(value){return clean(value).replace(/[\r\n]+/g,' ').slice(0,MAX_SUBJECT);}
function profileFor(body){
  const requested=clean(body.profile||body.signatureProfile).toLowerCase();
  if(PROFILES.has(requested))return PROFILES.get(requested);
  const raw=body.from&&typeof body.from==='object'?body.from.email:body.from;
  const email=clean(raw).toLowerCase();
  return [...PROFILES.values()].find(item=>item.email===email)||null;
}
function stripHtml(value){
  return String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>|<\/div>|<\/tr>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#0?39;/gi,"'").replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/[ \t]{2,}/g,' ').trim();
}
function cleanHtml(value){
  return String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/\son\w+\s*=\s*(["']).*?\1/gi,'').replace(/^\s*<b>Predmet:<\/b>[\s\S]*?<br\s*\/?>\s*<br\s*\/?>/i,'').trim();
}
function decodeBase64(value){
  const source=clean(value).replace(/^data:[^;]+;base64,/i,'').replace(/\s+/g,'');
  if(!source||!/^[A-Za-z0-9+/=]+$/.test(source))throw Object.assign(new Error('Invalid attachment encoding'),{code:'INVALID_ATTACHMENT_BASE64'});
  const binary=atob(source),bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index+=1)bytes[index]=binary.charCodeAt(index);
  return bytes;
}
function normalizeAttachments(value){
  const list=Array.isArray(value)?value:[];
  if(list.length>MAX_ATTACHMENTS)throw Object.assign(new Error('Too many attachments'),{code:'TOO_MANY_ATTACHMENTS'});
  const normalized=[];let total=0;
  for(const item of list){
    const filename=safeHeader(item?.filename||item?.name||'document.pdf').replace(/[^A-Za-z0-9._ -]+/g,'_')||'document.pdf';
    const type=clean(item?.type||item?.contentType||item?.mimeType||'application/pdf').toLowerCase();
    if(type!=='application/pdf'&&!filename.toLowerCase().endsWith('.pdf'))throw Object.assign(new Error(`Unsupported attachment: ${filename}`),{code:'ATTACHMENT_TYPE_NOT_ALLOWED'});
    const bytes=decodeBase64(item?.base64||item?.content||'');
    if(bytes.length>MAX_ATTACHMENT_BYTES)throw Object.assign(new Error(`Attachment too large: ${filename}`),{code:'ATTACHMENT_TOO_LARGE'});
    if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Object.assign(new Error(`Invalid PDF signature: ${filename}`),{code:'INVALID_PDF_SIGNATURE'});
    total+=bytes.length;
    if(total>MAX_TOTAL_ATTACHMENT_BYTES)throw Object.assign(new Error('Total attachment size exceeded'),{code:'TOTAL_ATTACHMENT_SIZE_EXCEEDED'});
    normalized.push({content:bytes,filename,type:'application/pdf',disposition:'attachment'});
  }
  return{items:normalized,totalBytes:total};
}
async function sha256(value){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function ensureSchema(env){
  const db=dbOf(env);if(!db)return null;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS manual_mail_messages(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,from_email TEXT NOT NULL,to_json TEXT NOT NULL,cc_json TEXT,bcc_json TEXT,subject TEXT NOT NULL,status TEXT NOT NULL,provider_json TEXT,error_code TEXT,error_message TEXT,attachment_count INTEGER NOT NULL DEFAULT 0,attachment_bytes INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,sent_at TEXT)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_manual_mail_status_created ON manual_mail_messages(status,created_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS manual_mail_suppressions(email TEXT PRIMARY KEY,reason TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_manual_mail_suppressions_active ON manual_mail_suppressions(active,email)`)
  ]);
  return db;
}
async function audit(env,entry){
  try{
    const db=await ensureSchema(env);if(!db)return{logged:false,error:'D1_BINDING_MISSING'};
    await db.prepare(`INSERT OR REPLACE INTO manual_mail_messages(id,profile_id,from_email,to_json,cc_json,bcc_json,subject,status,provider_json,error_code,error_message,attachment_count,attachment_bytes,created_at,sent_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(entry.id,entry.profileId,entry.from,JSON.stringify(entry.to),JSON.stringify(entry.cc),JSON.stringify(entry.bcc),entry.subject,entry.status,JSON.stringify(entry.provider||[]),clean(entry.errorCode),clean(entry.errorMessage),entry.attachmentCount||0,entry.attachmentBytes||0,entry.createdAt,entry.sentAt||null).run();
    return{logged:true};
  }catch(error){return{logged:false,error:String(error?.message||error).slice(0,300)};}
}
async function recent(env,statuses,limit=50){
  try{
    const db=await ensureSchema(env);if(!db)return[];
    const placeholders=statuses.map(()=>'?').join(',');
    const result=await db.prepare(`SELECT id,profile_id,from_email,to_json,cc_json,bcc_json,subject,status,provider_json,error_code,error_message,attachment_count,attachment_bytes,created_at,sent_at FROM manual_mail_messages WHERE status IN (${placeholders}) ORDER BY created_at DESC LIMIT ?`).bind(...statuses,limit).all();
    return(result.results||[]).map(row=>({...row,to:JSON.parse(row.to_json||'[]'),cc:JSON.parse(row.cc_json||'[]'),bcc:JSON.parse(row.bcc_json||'[]'),provider:JSON.parse(row.provider_json||'[]')}));
  }catch{return[];}
}
async function suppressionState(env,emails){
  const db=await ensureSchema(env);if(!db||!emails.length)return[];
  const placeholders=emails.map(()=>'?').join(',');
  const result=await db.prepare(`SELECT email,reason FROM manual_mail_suppressions WHERE active=1 AND LOWER(email) IN (${placeholders})`).bind(...emails.map(email=>email.toLowerCase())).all();
  return result.results||[];
}
async function rateState(env){
  const hourlyLimit=intEnv(env.MAIL_MANUAL_MAX_PER_HOUR,DEFAULT_HOURLY_LIMIT),dailyLimit=intEnv(env.MAIL_MANUAL_MAX_PER_DAY,DEFAULT_DAILY_LIMIT);
  const db=await ensureSchema(env);if(!db)return{ok:true,hour:{used:0,limit:hourlyLimit},day:{used:0,limit:dailyLimit},source:'NO_D1'};
  const hour=Number((await db.prepare(`SELECT COUNT(*) AS count FROM manual_mail_messages WHERE status IN ('SENT','PARTIAL') AND julianday(COALESCE(sent_at,created_at))>=julianday('now','-1 hour')`).first())?.count||0);
  const day=Number((await db.prepare(`SELECT COUNT(*) AS count FROM manual_mail_messages WHERE status IN ('SENT','PARTIAL') AND julianday(COALESCE(sent_at,created_at))>=julianday('now','-1 day')`).first())?.count||0);
  return{ok:hour<hourlyLimit&&day<dailyLimit,hour:{used:hour,limit:hourlyLimit},day:{used:day,limit:dailyLimit},source:'D1'};
}
async function prepare(body,env){
  const profile=profileFor(body);if(!profile)throw Object.assign(new Error('Sender profile not allowed'),{code:'sender_profile_not_allowed',status:403});
  const to=parseEmails(body.to),cc=parseEmails(body.cc),requestedBcc=parseEmails(body.bcc);
  if(!to.length||to.some(email=>!validEmail(email)))throw Object.assign(new Error('Invalid To recipient'),{code:'invalid_to_recipient'});
  if([...to,...cc,...requestedBcc].some(email=>!validEmail(email)))throw Object.assign(new Error('Invalid recipient'),{code:'invalid_recipient'});
  if(new Set([...to,...cc,...requestedBcc]).size>MAX_RECIPIENTS)throw Object.assign(new Error('Too many recipients'),{code:'too_many_recipients',max:MAX_RECIPIENTS});
  const subject=safeHeader(body.subject);if(!subject)throw Object.assign(new Error('Missing subject'),{code:'missing_subject'});
  const rawText=clean(body.text||body.plainText||body.bodyText||(!/<[a-z][\s\S]*>/i.test(String(body.body||''))?body.body:''));
  const rawHtml=cleanHtml(body.html||body.bodyHtml||body.htmlBody||body.messageHtml||body.contentHtml||(/<[a-z][\s\S]*>/i.test(String(body.body||''))?body.body:''));
  const text=(rawText||stripHtml(rawHtml)).slice(0,MAX_BODY),html=rawHtml.slice(0,MAX_BODY);
  if(!text&&!html)throw Object.assign(new Error('Missing message body'),{code:'missing_message_body'});
  const attachments=normalizeAttachments(body.attachments);
  const bcc=[...new Set([...requestedBcc,MANDATORY_BCC.toLowerCase()])];
  const suppressions=await suppressionState(env,[...new Set([...to,...cc,...requestedBcc])]);
  const rate=await rateState(env);
  const fingerprint=await sha256(JSON.stringify({profile:profile.id,to,cc,bcc,subject,text,attachmentNames:attachments.items.map(item=>item.filename)}));
  return{profile,to,cc,bcc,subject,text,html,attachments,suppressions,rate,fingerprint};
}
async function readiness(env){
  const rate=await rateState(env);
  return{ok:true,version:VERSION,live:boolEnv(env.MAIL_MANUAL_LIVE),emailBindingConfigured:Boolean(env.EMAIL?.send),d1Configured:Boolean(env.GNK_ASG_D1?.prepare),kvConfigured:Boolean(kvOf(env)?.get),mandatoryCopy:MANDATORY_BCC,signatureVersion:SIGNATURE_VERSION,preflight:PREFLIGHT_PATH,rate,profiles:[...PROFILES.values()],limits:{recipients:MAX_RECIPIENTS,attachments:MAX_ATTACHMENTS,attachmentBytes:MAX_ATTACHMENT_BYTES,totalAttachmentBytes:MAX_TOTAL_ATTACHMENT_BYTES,dedupeSeconds:DEDUPE_SECONDS}};
}
async function preflightManual(request,env){
  let body={};try{body=await request.json();}catch{return fail('invalid_json');}
  try{
    const prepared=await prepare(body,env);
    return json({ok:prepared.suppressions.length===0&&prepared.rate.ok,canSend:prepared.suppressions.length===0&&prepared.rate.ok,version:VERSION,profile:prepared.profile,to:prepared.to,cc:prepared.cc,bcc:prepared.bcc,mandatoryCopy:MANDATORY_BCC,subject:prepared.subject,bodyCharacters:prepared.text.length,attachments:{count:prepared.attachments.items.length,totalBytes:prepared.attachments.totalBytes,names:prepared.attachments.items.map(item=>item.filename)},suppressions:prepared.suppressions,rate:prepared.rate,requiresConfirmation:'SEND_MAIL'});
  }catch(error){return fail(clean(error.code)||'preflight_failed',Number(error.status)||400,{message:String(error.message||error),max:error.max});}
}
async function sendManual(request,env){
  let body={};try{body=await request.json();}catch{return fail('invalid_json');}
  if(clean(body.confirm)!=='SEND_MAIL')return fail('confirmation_required',409,{required:'SEND_MAIL'});
  if(!boolEnv(env.MAIL_MANUAL_LIVE))return fail('manual_mail_sending_locked',423);
  if(!env.EMAIL?.send)return fail('email_binding_missing',503);
  let prepared;try{prepared=await prepare(body,env);}catch(error){return fail(clean(error.code)||'invalid_mail',Number(error.status)||400,{message:String(error.message||error),max:error.max});}
  if(prepared.suppressions.length)return fail('suppressed_recipient',409,{suppressions:prepared.suppressions});
  if(!prepared.rate.ok)return fail('mail_rate_limit',429,{rate:prepared.rate});
  const id=crypto.randomUUID(),createdAt=now(),kv=kvOf(env),dedupeKey=`mail:manual:dedupe:${prepared.fingerprint}`;
  if(kv?.get){const existing=await kv.get(dedupeKey);if(existing)return fail('duplicate_recent_send',409,{existingId:existing,retryAfterSeconds:DEDUPE_SECONDS});await kv.put(dedupeKey,id,{expirationTtl:DEDUPE_SECONDS});}
  const base={id,profileId:prepared.profile.id,from:prepared.profile.email,to:prepared.to,cc:prepared.cc,bcc:prepared.bcc,subject:prepared.subject,status:'SENDING',provider:[],attachmentCount:prepared.attachments.items.length,attachmentBytes:prepared.attachments.totalBytes,createdAt,sentAt:null};
  await audit(env,base);
  const results=[];
  for(let index=0;index<prepared.to.length;index+=1){
    const recipient=prepared.to[index],messageBcc=prepared.bcc.filter(email=>email!==recipient);
    const payload=enforceRequiredSignature({to:recipient,cc:index===0&&prepared.cc.length?prepared.cc.join(', '):undefined,bcc:messageBcc.length?messageBcc.join(', '):undefined,from:{email:prepared.profile.email,name:prepared.profile.name},replyTo:prepared.profile.email,subject:prepared.subject,text:prepared.text,html:prepared.html,attachments:prepared.attachments.items,headers:{'X-GNK-ASG-Manual-Mail':VERSION,'X-GNK-ASG-Manual-Mail-Id':id,'X-GNK-ASG-Recipient-Index':String(index+1)}});
    try{const result=await env.EMAIL.send(payload);results.push({recipient,status:'SENT',messageId:clean(result?.messageId)});}
    catch(error){results.push({recipient,status:'FAILED',errorCode:clean(error?.code)||'EMAIL_SEND_FAILED',message:String(error?.message||error).slice(0,500)});}
  }
  const sent=results.filter(item=>item.status==='SENT').length,status=sent===prepared.to.length?'SENT':sent?'PARTIAL':'FAILED',firstFailure=results.find(item=>item.status==='FAILED');
  const entry={...base,status,provider:results,errorCode:firstFailure?.errorCode||'',errorMessage:firstFailure?.message||'',sentAt:sent?now():null};
  const auditResult=await audit(env,entry);if(!sent&&kv?.delete)await kv.delete(dedupeKey).catch(()=>{});
  return json({ok:status==='SENT',id,status,profile:prepared.profile,to:prepared.to,cc:prepared.cc,bcc:prepared.bcc,mandatoryCopy:MANDATORY_BCC,subject:prepared.subject,attachments:{count:prepared.attachments.items.length,totalBytes:prepared.attachments.totalBytes},sent,failed:prepared.to.length-sent,results,audit:auditResult,signatureVersion:SIGNATURE_VERSION},status==='SENT'?200:sent?207:502);
}

export async function handleManualMailService(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===SEND_PATH&&request.method==='POST')return sendManual(request,env);
  if(path===PREFLIGHT_PATH&&request.method==='POST')return preflightManual(request,env);
  if(path===READINESS_PATH&&request.method==='GET')return json(await readiness(env));
  if(path===STATUS_PATH&&request.method==='GET')return json({...await readiness(env),recent:await recent(env,['SENT','PARTIAL','FAILED'],20)});
  if(path===SENT_PATH&&request.method==='GET')return json({ok:true,version:VERSION,items:await recent(env,['SENT','PARTIAL'],50)});
  if(path===OUTBOX_PATH&&request.method==='GET')return json({ok:true,version:VERSION,items:await recent(env,['SENDING','FAILED','PARTIAL'],50)});
  if(path===INBOX_PATH&&request.method==='GET')return json({ok:true,version:VERSION,items:[],inboundConnected:false,message:'Inbound mailbox reading is handled by the connected inbox service.'});
  return null;
}
