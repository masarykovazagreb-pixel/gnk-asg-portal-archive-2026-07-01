import {enforceRequiredSignature,MANDATORY_BCC,INTERNAL_COPY_ADDRESS,VERSION as SIGNATURE_VERSION} from './email-signature-contract-v1.js';
import {buildAutoReplyCase,lookupAutoReplyCase,saveAutoReplyCase,VERSION as AUTO_REPLY_VERSION,CENTERS as AUTO_REPLY_CENTERS} from './auto-reply-case-center-v1.js';

export const VERSION='GNK_ASG_MANUAL_MAIL_SERVICE_V3_20260709_AUTO_REPLY_CASE_CENTERS';
export const SEND_PATH='/api/admin-mail-send';
export const STATUS_PATH='/api/mail-center/status';
export const SENT_PATH='/api/mail-center/sent';
export const OUTBOX_PATH='/api/mail-center/outbox';
export const INBOX_PATH='/api/mail-center/inbox';
export const READINESS_PATH='/api/mail-center/send-readiness';
export const AUTO_REPLY_PREVIEW_PATH='/api/mail-center/auto-reply-preview';
export const CASE_LOOKUP_PATH='/api/mail-center/case-lookup';

const MAX_SUBJECT=240;
const MAX_BODY=250000;
const MAX_RECIPIENTS=25;
const MAX_ATTACHMENTS=8;
const MAX_ATTACHMENT_BYTES=3200000;
const MAX_TOTAL_ATTACHMENT_BYTES=3400000;
const DEDUPE_SECONDS=90;
const ALLOWED_ATTACHMENT_TYPES=new Map([
  ['pdf','application/pdf'],
  ['doc','application/msword'],
  ['docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['xls','application/vnd.ms-excel'],
  ['xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['ppt','application/vnd.ms-powerpoint'],
  ['pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['zip','application/zip'],
  ['csv','text/csv'],
  ['txt','text/plain'],
  ['png','image/png'],
  ['jpg','image/jpeg'],
  ['jpeg','image/jpeg'],
  ['webp','image/webp']
]);
const BLOCKED_ATTACHMENT_EXTENSIONS=new Set(['exe','dll','js','mjs','cjs','html','htm','xhtml','svg','bat','cmd','scr','ps1','vbs','jar','com','msi','apk','app','sh','php','py','rb','pl']);

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
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
  'x-gnk-asg-manual-mail-service':VERSION,
  'x-gnk-asg-email-signature-contract':SIGNATURE_VERSION,
  'x-gnk-asg-auto-reply-case-center':AUTO_REPLY_VERSION,
  'x-gnk-asg-mandatory-copy':'ENFORCED'
}});

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
  return String(value||'')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/p>|<\/div>|<\/tr>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/&#0?39;/gi,"'")
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .replace(/[ \t]{2,}/g,' ')
    .trim();
}
function cleanHtml(value){
  return String(value||'')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi,'')
    .replace(/^\s*<b>Predmet:<\/b>[\s\S]*?<br\s*\/?>\s*<br\s*\/?>/i,'')
    .trim();
}
function decodeBase64(value){
  const source=clean(value).replace(/^data:[^;]+;base64,/i,'').replace(/\s+/g,'');
  if(!source||!/^[A-Za-z0-9+/=]+$/.test(source))throw Object.assign(new Error('Invalid attachment encoding'),{code:'INVALID_ATTACHMENT_BASE64'});
  const binary=atob(source),bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index+=1)bytes[index]=binary.charCodeAt(index);
  return bytes;
}
function extensionOf(filename){
  const match=String(filename||'').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?match[1]:'';
}
function starts(bytes,values){return values.every((value,index)=>bytes[index]===value);}
function hasZipSignature(bytes){return starts(bytes,[0x50,0x4b,0x03,0x04])||starts(bytes,[0x50,0x4b,0x05,0x06])||starts(bytes,[0x50,0x4b,0x07,0x08]);}
function hasCfbSignature(bytes){return starts(bytes,[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]);}
function hasPngSignature(bytes){return starts(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);}
function hasJpegSignature(bytes){return starts(bytes,[0xff,0xd8,0xff]);}
function hasWebpSignature(bytes){return starts(bytes,[0x52,0x49,0x46,0x46])&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';}
function assertAttachmentSignature(ext,bytes,filename){
  if(ext==='pdf'&&String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Object.assign(new Error(`Invalid PDF signature: ${filename}`),{code:'INVALID_PDF_SIGNATURE'});
  if(['zip','docx','xlsx','pptx'].includes(ext)&&!hasZipSignature(bytes))throw Object.assign(new Error(`Invalid ZIP/OpenXML signature: ${filename}`),{code:'INVALID_ARCHIVE_SIGNATURE'});
  if(['doc','xls','ppt'].includes(ext)&&!hasCfbSignature(bytes))throw Object.assign(new Error(`Invalid legacy Office signature: ${filename}`),{code:'INVALID_OFFICE_SIGNATURE'});
  if(ext==='png'&&!hasPngSignature(bytes))throw Object.assign(new Error(`Invalid PNG signature: ${filename}`),{code:'INVALID_IMAGE_SIGNATURE'});
  if(['jpg','jpeg'].includes(ext)&&!hasJpegSignature(bytes))throw Object.assign(new Error(`Invalid JPEG signature: ${filename}`),{code:'INVALID_IMAGE_SIGNATURE'});
  if(ext==='webp'&&!hasWebpSignature(bytes))throw Object.assign(new Error(`Invalid WEBP signature: ${filename}`),{code:'INVALID_IMAGE_SIGNATURE'});
  if(['txt','csv'].includes(ext)&&bytes.slice(0,512).some(byte=>byte===0))throw Object.assign(new Error(`Text attachment contains binary data: ${filename}`),{code:'INVALID_TEXT_ATTACHMENT'});
}
function normalizeAttachments(value){
  const list=Array.isArray(value)?value:[];
  if(list.length>MAX_ATTACHMENTS)throw Object.assign(new Error('Too many attachments'),{code:'TOO_MANY_ATTACHMENTS'});
  const normalized=[];
  let total=0;
  for(const item of list){
    const filename=safeHeader(item?.filename||item?.name||'document.pdf').replace(/[^A-Za-z0-9._ -]+/g,'_')||'document.pdf';
    const ext=extensionOf(filename);
    if(!ext||BLOCKED_ATTACHMENT_EXTENSIONS.has(ext)||!ALLOWED_ATTACHMENT_TYPES.has(ext))throw Object.assign(new Error(`Unsupported attachment: ${filename}`),{code:'ATTACHMENT_TYPE_NOT_ALLOWED'});
    const bytes=decodeBase64(item?.base64||item?.content||'');
    if(bytes.length>MAX_ATTACHMENT_BYTES)throw Object.assign(new Error(`Attachment too large: ${filename}`),{code:'ATTACHMENT_TOO_LARGE'});
    assertAttachmentSignature(ext,bytes,filename);
    total+=bytes.length;
    if(total>MAX_TOTAL_ATTACHMENT_BYTES)throw Object.assign(new Error('Total attachment size exceeded'),{code:'TOTAL_ATTACHMENT_SIZE_EXCEEDED'});
    const declared=clean(item?.type||item?.contentType||item?.mimeType||'').toLowerCase();
    const type=declared&&declared!=='application/octet-stream'?declared:ALLOWED_ATTACHMENT_TYPES.get(ext);
    normalized.push({content:bytes,filename,type,disposition:'attachment'});
  }
  return{items:normalized,totalBytes:total};
}
async function sha256(value){
  const bytes=new TextEncoder().encode(String(value));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
function kvOf(env){return env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;}
function dbOf(env){return env.GNK_ASG_D1||null;}
async function ensureSchema(env){
  const db=dbOf(env);if(!db)return null;
  await db.prepare(`CREATE TABLE IF NOT EXISTS manual_mail_messages(
    id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,from_email TEXT NOT NULL,to_json TEXT NOT NULL,cc_json TEXT,bcc_json TEXT,
    subject TEXT NOT NULL,status TEXT NOT NULL,provider_json TEXT,error_code TEXT,error_message TEXT,
    attachment_count INTEGER NOT NULL DEFAULT 0,attachment_bytes INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,sent_at TEXT
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_manual_mail_status_created ON manual_mail_messages(status,created_at)`).run();
  return db;
}
async function audit(env,entry){
  try{
    const db=await ensureSchema(env);if(!db)return{logged:false,error:'D1_BINDING_MISSING'};
    await db.prepare(`INSERT OR REPLACE INTO manual_mail_messages(id,profile_id,from_email,to_json,cc_json,bcc_json,subject,status,provider_json,error_code,error_message,attachment_count,attachment_bytes,created_at,sent_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(entry.id,entry.profileId,entry.from,JSON.stringify(entry.to),JSON.stringify(entry.cc),JSON.stringify(entry.bcc),entry.subject,entry.status,JSON.stringify(entry.provider||[]),clean(entry.errorCode),clean(entry.errorMessage),entry.attachmentCount||0,entry.attachmentBytes||0,entry.createdAt,entry.sentAt||null).run();
    return{logged:true};
  }catch(error){return{logged:false,error:String(error?.message||error).slice(0,300)};}
}
async function recent(env,statuses,limit=50){
  try{
    const db=await ensureSchema(env);if(!db)return[];
    const placeholders=statuses.map(()=>'?').join(',');
    const result=await db.prepare(`SELECT id,profile_id,from_email,to_json,cc_json,bcc_json,subject,status,provider_json,error_code,error_message,attachment_count,attachment_bytes,created_at,sent_at FROM manual_mail_messages WHERE status IN (${placeholders}) ORDER BY created_at DESC LIMIT ?`).bind(...statuses,limit).all();
    return (result.results||[]).map(row=>({...row,to:JSON.parse(row.to_json||'[]'),cc:JSON.parse(row.cc_json||'[]'),bcc:JSON.parse(row.bcc_json||'[]'),provider:JSON.parse(row.provider_json||'[]')}));
  }catch{return[];}
}
function readiness(env){
  return{
    ok:true,
    version:VERSION,
    live:boolEnv(env.MAIL_MANUAL_LIVE),
    emailBindingConfigured:Boolean(env.EMAIL?.send),
    d1Configured:Boolean(env.GNK_ASG_D1?.prepare),
    kvConfigured:Boolean(kvOf(env)?.get),
    mandatoryCopy:MANDATORY_BCC,
    signatureVersion:SIGNATURE_VERSION,
    signatureLogo:'gold',
    autoReply:{version:AUTO_REPLY_VERSION,mode:'personalized_case_center',live:boolEnv(env.MAIL_AUTO_REPLY_LIVE),centers:AUTO_REPLY_CENTERS},
    profiles:[...PROFILES.values()],
    limits:{recipients:MAX_RECIPIENTS,attachments:MAX_ATTACHMENTS,attachmentBytes:MAX_ATTACHMENT_BYTES,totalAttachmentBytes:MAX_TOTAL_ATTACHMENT_BYTES,dedupeSeconds:DEDUPE_SECONDS},
    attachments:{allowedExtensions:[...ALLOWED_ATTACHMENT_TYPES.keys()],blockedExtensions:[...BLOCKED_ATTACHMENT_EXTENSIONS]}
  };
}
async function autoReplyPreview(request,env){
  let body={};try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const entry=await buildAutoReplyCase(body,env);
  const saved=body.persist===true?await saveAutoReplyCase(env,entry):{saved:false,reason:'preview_only'};
  const signed=enforceRequiredSignature({from:{email:'office@gnk-asg.hr',name:'GNK ASG Office'},to:entry.senderEmail||'recipient@example.com',subject:`Re: ${entry.subject||entry.caseNumber}`,text:entry.text,html:entry.html});
  return json({ok:true,entry,saved,signedPreview:{subject:signed.subject,text:signed.text,html:signed.html,signatureVersion:SIGNATURE_VERSION,mandatoryCopy:MANDATORY_BCC}});
}
async function caseLookup(request,env){
  const url=new URL(request.url);
  const caseNumber=clean(url.searchParams.get('case')||url.searchParams.get('id')||url.searchParams.get('number'));
  if(!caseNumber)return json({ok:false,error:'case_number_required'},400);
  const result=await lookupAutoReplyCase(env,caseNumber);
  return json(result,result.ok?200:404);
}
async function sendManual(request,env){
  let body={};try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  if(clean(body.confirm)!=='SEND_MAIL')return json({ok:false,error:'confirmation_required',required:'SEND_MAIL'},409);
  if(!boolEnv(env.MAIL_MANUAL_LIVE))return json({ok:false,error:'manual_mail_sending_locked'},423);
  if(!env.EMAIL?.send)return json({ok:false,error:'email_binding_missing'},503);

  const profile=profileFor(body);
  if(!profile)return json({ok:false,error:'sender_profile_not_allowed'},403);
  const to=parseEmails(body.to),cc=parseEmails(body.cc),requestedBcc=parseEmails(body.bcc);
  if(!to.length||to.some(email=>!validEmail(email)))return json({ok:false,error:'invalid_to_recipient'},400);
  if([...to,...cc,...requestedBcc].some(email=>!validEmail(email)))return json({ok:false,error:'invalid_recipient'},400);
  if(new Set([...to,...cc,...requestedBcc]).size>MAX_RECIPIENTS)return json({ok:false,error:'too_many_recipients',max:MAX_RECIPIENTS},400);
  const subject=safeHeader(body.subject);
  if(!subject)return json({ok:false,error:'missing_subject'},400);

  const rawText=clean(body.text||body.plainText||body.bodyText||(!/<[a-z][\s\S]*>/i.test(String(body.body||''))?body.body:''));
  const rawHtml=cleanHtml(body.html||body.bodyHtml||body.htmlBody||body.messageHtml||body.contentHtml||(/<[a-z][\s\S]*>/i.test(String(body.body||''))?body.body:''));
  const text=(rawText||stripHtml(rawHtml)).slice(0,MAX_BODY);
  const html=rawHtml.slice(0,MAX_BODY);
  if(!text&&!html)return json({ok:false,error:'missing_message_body'},400);

  let attachmentState;
  try{attachmentState=normalizeAttachments(body.attachments);}catch(error){return json({ok:false,error:clean(error?.code)||'invalid_attachment',message:String(error?.message||error).slice(0,300)},400);}

  const bcc=[...new Set([...requestedBcc,MANDATORY_BCC.toLowerCase()])];
  const id=crypto.randomUUID(),createdAt=now();
  const fingerprint=await sha256(JSON.stringify({profile:profile.id,to,cc,bcc,subject,text,attachmentNames:attachmentState.items.map(item=>item.filename)}));
  const kv=kvOf(env),dedupeKey=`mail:manual:dedupe:${fingerprint}`;
  if(kv?.get){
    const existing=await kv.get(dedupeKey);
    if(existing)return json({ok:false,error:'duplicate_recent_send',existingId:existing,retryAfterSeconds:DEDUPE_SECONDS},409);
    await kv.put(dedupeKey,id,{expirationTtl:DEDUPE_SECONDS});
  }

  const base={id,profileId:profile.id,from:profile.email,to,cc,bcc,subject,status:'SENDING',provider:[],attachmentCount:attachmentState.items.length,attachmentBytes:attachmentState.totalBytes,createdAt,sentAt:null};
  await audit(env,base);
  const results=[];
  for(let index=0;index<to.length;index+=1){
    const recipient=to[index];
    const messageBcc=bcc.filter(email=>email!==recipient);
    const payload=enforceRequiredSignature({
      to:recipient,
      cc:index===0&&cc.length?cc.join(', '):undefined,
      bcc:messageBcc.length?messageBcc.join(', '):undefined,
      from:{email:profile.email,name:profile.name},
      replyTo:profile.email,
      subject,
      text,
      html,
      attachments:attachmentState.items,
      headers:{
        'X-GNK-ASG-Manual-Mail':VERSION,
        'X-GNK-ASG-Manual-Mail-Id':id,
        'X-GNK-ASG-Recipient-Index':String(index+1),
        'X-GNK-ASG-Signature-Logo':'gold'
      }
    });
    try{
      const result=await env.EMAIL.send(payload);
      results.push({recipient,status:'SENT',messageId:clean(result?.messageId)});
    }catch(error){
      results.push({recipient,status:'FAILED',errorCode:clean(error?.code)||'EMAIL_SEND_FAILED',message:String(error?.message||error).slice(0,500)});
    }
  }
  const sent=results.filter(item=>item.status==='SENT').length;
  const status=sent===to.length?'SENT':sent?'PARTIAL':'FAILED';
  const firstFailure=results.find(item=>item.status==='FAILED');
  const entry={...base,status,provider:results,errorCode:firstFailure?.errorCode||'',errorMessage:firstFailure?.message||'',sentAt:sent?now():null};
  const auditResult=await audit(env,entry);
  // Interna kopija (odvojeno od BCC) - salje se kao zaseban mail na INTERNAL_COPY_ADDRESS,
  // ne kao BCC na primarnoj poruci. Ne blokira glavni rezultat ako ne uspije.
  if(sent){
    try{
      await env.EMAIL.send(enforceRequiredSignature({
        to:INTERNAL_COPY_ADDRESS,
        from:{email:profile.email,name:profile.name},
        replyTo:profile.email,
        subject:`[Interna kopija] ${subject}`,
        text:`Interna kopija poruke ${id} poslane na: ${to.join(', ')}\n\n${text}`,
        html:`<p style="color:#666;font-size:12px;">Interna kopija poruke ${id} poslane na: ${to.join(', ')}</p>${html}`,
        headers:{'X-GNK-ASG-Internal-Copy-Of':id}
      }));
    }catch(error){
      console.error('internal-copy-send-failed',id,error);
    }
  }
  if(!sent&&kv?.delete)await kv.delete(dedupeKey).catch(()=>{});
  return json({ok:status==='SENT',id,status,profile:{id:profile.id,name:profile.name,email:profile.email},to,cc,bcc,mandatoryCopy:MANDATORY_BCC,subject,attachments:{count:attachmentState.items.length,totalBytes:attachmentState.totalBytes,files:attachmentState.items.map(item=>({filename:item.filename,type:item.type}))},sent,failed:to.length-sent,results,audit:auditResult,signatureVersion:SIGNATURE_VERSION,signatureLogo:'gold'},status==='SENT'?200:sent?207:502);
}

export async function handleManualMailService(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===AUTO_REPLY_PREVIEW_PATH&&request.method==='POST')return autoReplyPreview(request,env);
  if(path===CASE_LOOKUP_PATH&&request.method==='GET')return caseLookup(request,env);
  if(path===SEND_PATH&&request.method==='POST')return sendManual(request,env);
  if(path===READINESS_PATH&&request.method==='GET')return json(readiness(env));
  if(path===STATUS_PATH&&request.method==='GET')return json({...readiness(env),recent:await recent(env,['SENT','PARTIAL','FAILED'],20)});
  if(path===SENT_PATH&&request.method==='GET')return json({ok:true,version:VERSION,items:await recent(env,['SENT','PARTIAL'],50)});
  if(path===OUTBOX_PATH&&request.method==='GET')return json({ok:true,version:VERSION,items:await recent(env,['SENDING','FAILED','PARTIAL'],50)});
  if(path===INBOX_PATH&&request.method==='GET')return json({ok:true,version:VERSION,items:[],inboundConnected:false,message:'Inbound mailbox reading is not connected to this sending service.'});
  return null;
}
