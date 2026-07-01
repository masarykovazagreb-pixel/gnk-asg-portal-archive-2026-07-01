import {enforceRequiredSignature,MANDATORY_BCC,VERSION as SIGNATURE_VERSION} from './email-signature-contract-v1.js';

export const VERSION='GNK_ASG_MAIL_STUDIO_EXTENSION_V1_20260702_MULTILINGUAL_ROUTING';
export const UI_VERSION='GNK_ASG_MAIL_STUDIO_MULTILINGUAL_V25_20260702';
const ROUTE_TARGET='rht@gmx.com';
const SEND_PATHS=new Set(['/api/admin-mail-send','/api/studio-message/send']);
const STATUS_PATHS=new Set(['/api/mail-center/status','/api/mail-center/send-readiness','/api/studio-message/status','/api/studio-message/readiness']);
const UI_SCRIPT='/assets/mail-studio-multilingual-v25.js?v=20260702-1';
const MAX_SUBJECT=240;
const MAX_BODY=250000;
const MAX_RECIPIENTS=25;
const MAX_ATTACHMENTS=8;
const MAX_ATTACHMENT_BYTES=3200000;
const MAX_TOTAL_ATTACHMENT_BYTES=3400000;
const DEDUPE_SECONDS=90;

export const PROFILES={
  office:{id:'office',name:'GNK ASG Office',email:'office@gnk-asg.hr',unit:'Office'},
  legal:{id:'legal',name:'GNK ASG Legal & Compliance',email:'legal@gnk-asg.hr',unit:'Legal & Compliance'},
  media:{id:'media',name:'GNK DINAMO Ltd. Group | Media Relations & Accreditation Center',email:'media@gnk-asg.hr',unit:'Media Relations & Accreditation Center'},
  press:{id:'press',name:'GNK DINAMO Ltd. Group | Press Office',email:'press@gnk-asg.hr',unit:'Press Office'},
  it:{id:'it',name:'GNK ASG IT | Digital Assistant',email:'it@gnk-asg.hr',unit:'IT & Digital Support'},
  assistant:{id:'assistant',name:'GNK ASG | Executive Assistant',email:'assistant@gnk-asg.hr',unit:'Executive Assistant'},
  director:{id:'director',name:'Nermin Sefić | Managing Director',email:'nermin.sefic@gnk-asg.hr',unit:'Managing Director'},
  sefic:{id:'sefic',name:'Nermin Sefić | Executive Office',email:'sefic@gnk-asg.hr',unit:'Executive Office'},
  ubo:{id:'ubo',name:'GNK DINAMO Ltd. Group | UBO Office',email:'ubo@gnk-asg.hr',unit:'UBO Office'}
};

export const GLOBAL_CENTRES=[
  {id:'new-york',name:'New York',country:'United States'},
  {id:'london',name:'London',country:'United Kingdom'},
  {id:'paris',name:'Paris',country:'France'},
  {id:'frankfurt',name:'Frankfurt',country:'Germany'},
  {id:'dubai',name:'Dubai',country:'United Arab Emirates'},
  {id:'singapore',name:'Singapore',country:'Singapore'},
  {id:'tokyo',name:'Tokyo',country:'Japan'},
  {id:'sydney',name:'Sydney',country:'Australia'},
  {id:'toronto',name:'Toronto',country:'Canada'},
  {id:'zurich',name:'Zurich',country:'Switzerland'}
];

const clean=value=>String(value??'').trim();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const boolEnv=value=>/^(1|true|yes|on)$/i.test(clean(value));
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const now=()=>new Date().toISOString();
const dbOf=env=>env.GNK_ASG_D1||null;
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;

function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{
  'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0',
  'x-gnk-asg-mail-studio-extension':VERSION,'x-gnk-asg-email-signature-contract':SIGNATURE_VERSION
}});}
function parseEmails(value){
  const values=[];
  const add=item=>{
    if(Array.isArray(item)){item.forEach(add);return;}
    if(item&&typeof item==='object'){add(item.email||item.address||'');return;}
    String(item??'').split(/[;,\s]+/).forEach(part=>{const email=clean(part).toLowerCase();if(email)values.push(email);});
  };
  add(value);return[...new Set(values)];
}
function safeHeader(value){return clean(value).replace(/[\r\n]+/g,' ').slice(0,MAX_SUBJECT);}
function stripHtml(value){return String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>|<\/div>|<\/tr>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#0?39;/gi,"'").replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/[ \t]{2,}/g,' ').trim();}
function cleanHtml(value){return String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/\son\w+\s*=\s*(["']).*?\1/gi,'').replace(/^\s*<b>Predmet:<\/b>[\s\S]*?<br\s*\/?>\s*<br\s*\/?>/i,'').trim();}
function decodeBase64(value){const source=clean(value).replace(/^data:[^;]+;base64,/i,'').replace(/\s+/g,'');if(!source||!/^[A-Za-z0-9+/=]+$/.test(source))throw Object.assign(new Error('Invalid attachment encoding'),{code:'INVALID_ATTACHMENT_BASE64'});const binary=atob(source),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);return bytes;}
function normalizeAttachments(value){
  const list=Array.isArray(value)?value:[];if(list.length>MAX_ATTACHMENTS)throw Object.assign(new Error('Too many attachments'),{code:'TOO_MANY_ATTACHMENTS'});
  const items=[];let totalBytes=0;
  for(const item of list){
    const filename=safeHeader(item?.filename||item?.name||'document.pdf').replace(/[^A-Za-z0-9._ -]+/g,'_')||'document.pdf';
    const type=clean(item?.type||item?.contentType||item?.mimeType||'application/pdf').toLowerCase();
    if(type!=='application/pdf'&&!filename.toLowerCase().endsWith('.pdf'))throw Object.assign(new Error(`Unsupported attachment: ${filename}`),{code:'ATTACHMENT_TYPE_NOT_ALLOWED'});
    const bytes=decodeBase64(item?.base64||item?.content||'');
    if(bytes.length>MAX_ATTACHMENT_BYTES)throw Object.assign(new Error(`Attachment too large: ${filename}`),{code:'ATTACHMENT_TOO_LARGE'});
    if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Object.assign(new Error(`Invalid PDF signature: ${filename}`),{code:'INVALID_PDF_SIGNATURE'});
    totalBytes+=bytes.length;if(totalBytes>MAX_TOTAL_ATTACHMENT_BYTES)throw Object.assign(new Error('Total attachment size exceeded'),{code:'TOTAL_ATTACHMENT_SIZE_EXCEEDED'});
    items.push({content:bytes,filename,type:'application/pdf',disposition:'attachment'});
  }
  return{items,totalBytes};
}
async function sha256(value){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));return[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');}
function profileFor(body){const requested=clean(body.profile||body.signatureProfile).toLowerCase();if(PROFILES[requested])return PROFILES[requested];const raw=body.from&&typeof body.from==='object'?body.from.email:body.from;const email=clean(raw).toLowerCase();return Object.values(PROFILES).find(item=>item.email===email)||null;}
async function chooseCentre(env,scope='global'){
  const kv=kvOf(env),key=`mail-studio:centre-index:${scope}:v1`;let index=0;
  try{index=Number(await kv?.get?.(key))||0;}catch{}
  const centre=GLOBAL_CENTRES[((index%GLOBAL_CENTRES.length)+GLOBAL_CENTRES.length)%GLOBAL_CENTRES.length];
  try{await kv?.put?.(key,String((index+1)%GLOBAL_CENTRES.length));}catch{}
  return centre;
}
function signatureHtml(profile,centre){
  const location=`${centre.name}, ${centre.country}`;
  return `<table data-gnk-asg-signature="${VERSION}" role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;margin-top:24px;max-width:720px;width:100%;border-top:1px solid #d9d9d9"><tr><td width="170" valign="top" style="width:170px;padding:16px 22px 8px 0"><a href="https://gnk-asg.hr" style="text-decoration:none"><img src="https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png" width="150" alt="GNK ASG" style="display:block;width:150px;max-width:150px;height:auto;border:0"></a></td><td valign="top" style="padding:18px 0 8px;color:#111827;font-size:14px;line-height:1.48"><div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:6px">${escapeHtml(profile.name)}</div><div>${escapeHtml(profile.unit)}</div><div>Global Service Centre: <strong>${escapeHtml(location)}</strong></div><div><a href="mailto:${escapeHtml(profile.email)}" style="color:#111827">${escapeHtml(profile.email)}</a></div><div><a href="https://gnk-asg.hr" style="color:#111827">https://gnk-asg.hr</a></div></td></tr></table>`;
}
function signatureText(profile,centre){return[profile.name,profile.unit,`Global Service Centre: ${centre.name}, ${centre.country}`,profile.email,'https://gnk-asg.hr'].join('\n');}
async function ensureSchema(env){
  const db=dbOf(env);if(!db?.prepare)return null;
  await db.prepare(`CREATE TABLE IF NOT EXISTS manual_mail_messages(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,from_email TEXT NOT NULL,to_json TEXT NOT NULL,cc_json TEXT,bcc_json TEXT,subject TEXT NOT NULL,status TEXT NOT NULL,provider_json TEXT,error_code TEXT,error_message TEXT,attachment_count INTEGER NOT NULL DEFAULT 0,attachment_bytes INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,sent_at TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS manual_mail_inbox(id TEXT PRIMARY KEY,message_id TEXT,from_email TEXT,to_email TEXT,subject TEXT,received_at TEXT,status TEXT NOT NULL DEFAULT 'RECEIVED')`).run();
  return db;
}
async function auditSend(env,entry){try{const db=await ensureSchema(env);if(!db)return;await db.prepare(`INSERT OR REPLACE INTO manual_mail_messages(id,profile_id,from_email,to_json,cc_json,bcc_json,subject,status,provider_json,error_code,error_message,attachment_count,attachment_bytes,created_at,sent_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(entry.id,entry.profileId,entry.from,JSON.stringify(entry.to),JSON.stringify(entry.cc),JSON.stringify(entry.bcc),entry.subject,entry.status,JSON.stringify(entry.provider||[]),clean(entry.errorCode),clean(entry.errorMessage),entry.attachmentCount||0,entry.attachmentBytes||0,entry.createdAt,entry.sentAt||null).run();}catch(error){console.error('mail-studio-audit-send',error);}}
async function auditInbound(message,env,status){try{const db=await ensureSchema(env);if(!db)return;const messageId=header(message,'message-id')||crypto.randomUUID();const id=messageId.replace(/[<>]/g,'').slice(0,240)||crypto.randomUUID();await db.prepare(`INSERT OR IGNORE INTO manual_mail_inbox(id,message_id,from_email,to_email,subject,received_at,status) VALUES(?,?,?,?,?,?,?)`).bind(id,messageId,clean(message?.from||header(message,'from')).slice(0,500),clean(message?.to||header(message,'to')).slice(0,500),safeHeader(header(message,'subject')||'(no subject)'),now(),status).run();}catch(error){console.error('mail-studio-audit-inbound',error);}}
async function authorized(request,env,ctx,app){const url=new URL('/api/operator-auth-check',request.url);const headers=new Headers(request.headers);headers.set('accept','application/json');const response=await app.fetch(new Request(url,{method:'GET',headers,redirect:'manual'}),env,ctx);return response.ok;}
async function sendManual(request,env){
  let body={};try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  if(!boolEnv(env.MAIL_MANUAL_LIVE))return json({ok:false,error:'manual_mail_sending_locked'},423);
  if(!env.EMAIL?.send)return json({ok:false,error:'email_binding_missing'},503);
  const profile=profileFor(body);if(!profile)return json({ok:false,error:'sender_profile_not_allowed',profiles:Object.values(PROFILES)},403);
  const to=parseEmails(body.to),cc=parseEmails(body.cc),requestedBcc=parseEmails(body.bcc),bcc=[...new Set([...requestedBcc,MANDATORY_BCC.toLowerCase()])];
  if(!to.length||to.some(email=>!validEmail(email)))return json({ok:false,error:'invalid_to_recipient'},400);
  if([...cc,...bcc].some(email=>!validEmail(email)))return json({ok:false,error:'invalid_recipient'},400);
  if(new Set([...to,...cc,...bcc]).size>MAX_RECIPIENTS)return json({ok:false,error:'too_many_recipients',max:MAX_RECIPIENTS},400);
  const subject=safeHeader(body.subject);if(!subject)return json({ok:false,error:'missing_subject'},400);
  const rawText=clean(body.text||body.plainText||body.bodyText||(!/<[a-z][\s\S]*>/i.test(String(body.body||''))?body.body:''));
  const rawHtml=cleanHtml(body.html||body.bodyHtml||body.htmlBody||body.messageHtml||body.contentHtml||(/<[a-z][\s\S]*>/i.test(String(body.body||''))?body.body:''));
  const text=(rawText||stripHtml(rawHtml)).slice(0,MAX_BODY),html=rawHtml.slice(0,MAX_BODY);if(!text&&!html)return json({ok:false,error:'missing_message_body'},400);
  let attachmentState;try{attachmentState=normalizeAttachments(body.attachments);}catch(error){return json({ok:false,error:clean(error?.code)||'invalid_attachment',message:String(error?.message||error).slice(0,300)},400);}
  const centre=await chooseCentre(env,'outbound');
  const signedText=`${text}${text?'\n\n':''}${signatureText(profile,centre)}`;
  const signedHtml=`${html||`<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.6">${escapeHtml(text).replace(/\r?\n/g,'<br>')}</div>`}${signatureHtml(profile,centre)}`;
  const id=crypto.randomUUID(),createdAt=now();
  const fingerprint=await sha256(JSON.stringify({profile:profile.id,to,cc,bcc,subject,text,attachments:attachmentState.items.map(item=>item.filename)}));
  const kv=kvOf(env),dedupeKey=`mail:manual:dedupe:${fingerprint}`;
  try{const existing=await kv?.get?.(dedupeKey);if(existing)return json({ok:false,error:'duplicate_recent_send',existingId:existing,retryAfterSeconds:DEDUPE_SECONDS},409);await kv?.put?.(dedupeKey,id,{expirationTtl:DEDUPE_SECONDS});}catch{}
  const base={id,profileId:profile.id,from:profile.email,to,cc,bcc,subject,status:'SENDING',provider:[],attachmentCount:attachmentState.items.length,attachmentBytes:attachmentState.totalBytes,createdAt,sentAt:null};await auditSend(env,base);
  const results=[];
  for(let index=0;index<to.length;index+=1){
    const recipient=to[index],messageBcc=bcc.filter(email=>email!==recipient);
    const payload=enforceRequiredSignature({to:recipient,cc:index===0&&cc.length?cc.join(', '):undefined,bcc:messageBcc.length?messageBcc.join(', '):undefined,from:{email:profile.email,name:profile.name},replyTo:profile.email,subject,text:signedText,html:signedHtml,attachments:attachmentState.items,headers:{'X-GNK-ASG-Manual-Mail':VERSION,'X-GNK-ASG-Manual-Mail-Id':id,'X-GNK-ASG-Recipient-Index':String(index+1),'X-GNK-ASG-Global-Centre':`${centre.name}, ${centre.country}`}});
    try{const result=await env.EMAIL.send(payload);results.push({recipient,status:'SENT',messageId:clean(result?.messageId)});}catch(error){results.push({recipient,status:'FAILED',errorCode:clean(error?.code)||'EMAIL_SEND_FAILED',message:String(error?.message||error).slice(0,500)});}
  }
  const sent=results.filter(item=>item.status==='SENT').length,status=sent===to.length?'SENT':sent?'PARTIAL':'FAILED',firstFailure=results.find(item=>item.status==='FAILED');
  const entry={...base,status,provider:results,errorCode:firstFailure?.errorCode||'',errorMessage:firstFailure?.message||'',sentAt:sent?now():null};await auditSend(env,entry);
  if(!sent)try{await kv?.delete?.(dedupeKey);}catch{}
  return json({ok:status==='SENT',id,status,profile,globalCentre:centre,to,cc,bcc,mandatoryCopy:MANDATORY_BCC,subject,attachments:{count:attachmentState.items.length,totalBytes:attachmentState.totalBytes},sent,failed:to.length-sent,results,signatureVersion:SIGNATURE_VERSION},status==='SENT'?200:sent?207:502);
}

export async function handleMailStudioExtension(request,env,ctx,app){
  const path=pathOf(request);if(!SEND_PATHS.has(path)||request.method!=='POST')return null;
  if(!(await authorized(request,env,ctx,app)))return json({ok:false,error:'authentication_required'},401);
  return sendManual(request,env);
}

function isStudioPage(request){const url=new URL(request.url),path=pathOf(request);return path==='/mail-studio'||path.startsWith('/mail-studio/')||path==='/mail-studio-pro'||path.startsWith('/mail-studio-pro/')||(path==='/admin-center'&&url.searchParams.get('module')==='mail');}
export async function patchMailStudioResponse(request,response){
  const path=pathOf(request),type=String(response.headers.get('content-type')||'').toLowerCase();
  if(STATUS_PATHS.has(path)&&type.includes('application/json')){
    try{const data=await response.clone().json(),headers=new Headers(response.headers);headers.delete('content-length');headers.set('cache-control','no-store');headers.set('x-gnk-asg-mail-studio-extension',VERSION);return new Response(JSON.stringify({...data,profiles:Object.values(PROFILES),languagePolicy:'MULTILINGUAL',routingTarget:ROUTE_TARGET,globalCentres:GLOBAL_CENTRES},null,2),{status:response.status,headers});}catch{return response;}
  }
  if(!isStudioPage(request)||!type.includes('text/html'))return response;
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.delete('last-modified');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('x-gnk-asg-mail-studio-extension',VERSION);headers.set('x-gnk-asg-mail-language-policy','MULTILINGUAL');
  let html=await response.text();
  for(const name of ['studio-core-v21','mail-studio-controls-v18','mail-studio-click-feedback-v19','mail-studio-hotfix-v20','mail-studio-profile-test-v1','mail-studio-delivery-policy-v1','mail-studio-delivery-history-v2','delivery-history-dashboard-v3','mail-studio-english-v23','mail-studio-multilingual-v25'])html=html.replace(new RegExp(`<script[^>]+src=["'][^"']*${name}\\.js[^"']*["'][^>]*><\\/script>`,'gi'),'');
  html=html.replace(/English-only composing, preview, attachments and controlled individual delivery\./gi,'Multilingual composing, preview, attachments and controlled individual delivery.');
  html=html.replace(/English template/gi,'Template / Predložak').replace(/Subject — English only/gi,'Subject / Predmet — any language').replace(/Message body — English only/gi,'Message body / Tekst poruke — any language');
  html=html.replace(/Write or paste the English message here\. Full HTML is also supported\./gi,'Write or paste the message in any language. Full HTML is also supported.');
  html=html.replace(/The subject, sender name, body, HTML and technical metadata must be in English\.\s*/gi,'Messages may be written in any language. ');
  const script=`<script defer src="${UI_SCRIPT}"></script>`;html=html.includes('</body>')?html.replace('</body>',script+'</body>'):html+script;
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

function header(message,name){try{return clean(message?.headers?.get?.(name));}catch{return'';}}
function address(value){const raw=clean(value),match=raw.match(/<([^>]+)>/);return clean(match?.[1]||raw).toLowerCase();}
function automatedInbound(message,from){const auto=header(message,'auto-submitted').toLowerCase(),precedence=header(message,'precedence').toLowerCase(),subject=header(message,'subject').toLowerCase();return Boolean((auto&&auto!=='no')||/bulk|list|junk/.test(precedence)||/mailer-daemon|postmaster|no-?reply|donotreply/.test(from)||/automatic reply|auto reply|out of office|izvan ureda/.test(subject));}
function inboundProfile(message){const target=address(message?.to||header(message,'to'));return Object.values(PROFILES).find(profile=>profile.email===target)||null;}
function reference(profile){return`GNK-${profile.id.toUpperCase()}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;}
function autoReply(profile,centre,ref){
  const location=`${centre.name}, ${centre.country}`,subject=`Potvrda primitka / Message received — ${ref}`;
  const text=[
    'Poštovani,','',`potvrđujemo da je vaša poruka zaprimljena na adresi ${profile.email} (${profile.unit}).`,`Evidencijska oznaka: ${ref}`,`Globalni operativni centar: ${location}`,'','Poruka je proslijeđena nadležnoj osobi na pregled. Ova automatska potvrda ne predstavlja prihvat ponude, ugovornu obvezu, pravno mišljenje niti konačnu odluku.','',
    '--- ENGLISH ---','',`Dear Sir or Madam,`,'',`This confirms that your message has been received at ${profile.email} (${profile.unit}).`,`Reference: ${ref}`,`Global Service Centre: ${location}`,'','The message has been routed for human review. This automatic acknowledgement does not constitute acceptance of an offer, a contractual commitment, legal advice or a final decision.'
  ].join('\n');
  const html=`<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#111827"><div style="max-width:720px;margin:0 auto;padding:28px 18px"><div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px"><div style="border-left:5px solid #b88a2f;padding:14px 18px;background:#fbf8ef;margin-bottom:24px"><div style="font-size:12px;letter-spacing:.08em;color:#7c5d1c;font-weight:700">AUTOMATSKA POTVRDA / AUTOMATIC ACKNOWLEDGEMENT</div><div style="font-size:18px;font-weight:800;margin-top:5px">${escapeHtml(profile.unit)}</div><div style="font-size:13px;color:#6b7280;margin-top:8px">Globalni operativni centar / Global Service Centre: <strong>${escapeHtml(location)}</strong></div></div><p>Poštovani,</p><p>potvrđujemo da je vaša poruka zaprimljena na adresi <strong>${escapeHtml(profile.email)}</strong>.</p><p>Evidencijska oznaka: <strong>${escapeHtml(ref)}</strong></p><p>Poruka je proslijeđena nadležnoj osobi na pregled. Ova automatska potvrda ne predstavlja prihvat ponude, ugovornu obvezu, pravno mišljenje niti konačnu odluku.</p><hr style="border:0;border-top:1px solid #d1d5db;margin:28px 0"><p>Dear Sir or Madam,</p><p>This confirms that your message has been received at <strong>${escapeHtml(profile.email)}</strong>.</p><p>Reference: <strong>${escapeHtml(ref)}</strong></p><p>The message has been routed for human review. This automatic acknowledgement does not constitute acceptance of an offer, a contractual commitment, legal advice or a final decision.</p>${signatureHtml(profile,centre)}</div></div></body></html>`;
  return{subject,text:`${text}\n\n${signatureText(profile,centre)}`,html};
}
export async function handleMailStudioInbound(message,env){
  const profile=inboundProfile(message);if(!profile||profile.id==='media')return null;
  const from=address(message?.from||header(message,'from')),centre=await chooseCentre(env,'inbound'),ref=reference(profile),headers=new Headers();headers.set('X-GNK-ASG-Routing-Profile',profile.id);headers.set('X-GNK-ASG-Original-Recipient',profile.email);headers.set('X-GNK-ASG-Global-Centre',`${centre.name}, ${centre.country}`);
  let forwardResult='SKIPPED',replyResult='SKIPPED',error='';
  try{if(message.canBeForwarded!==false&&typeof message.forward==='function'){await message.forward(ROUTE_TARGET,headers);forwardResult='FORWARDED';}}catch(err){forwardResult='FAILED';error=String(err?.message||err).slice(0,300);}
  if(validEmail(from)&&from!==profile.email&&!automatedInbound(message,from)&&env.EMAIL?.send){
    const reply=autoReply(profile,centre,ref);
    try{await env.EMAIL.send(enforceRequiredSignature({to:from,bcc:MANDATORY_BCC,from:{email:profile.email,name:profile.name},replyTo:profile.email,subject:reply.subject,text:reply.text,html:reply.html,headers:{'Auto-Submitted':'auto-replied','X-Auto-Response-Suppress':'All','X-GNK-ASG-Mail-Studio-Auto-Reply':VERSION,'X-GNK-ASG-Reference':ref,'X-GNK-ASG-Global-Centre':`${centre.name}, ${centre.country}`}}));replyResult='SENT';}catch(err){replyResult='FAILED';error=error||String(err?.message||err).slice(0,300);}
  }
  await auditInbound(message,env,`${forwardResult}_${replyResult}`);
  return{handled:true,profile:profile.id,routedTo:ROUTE_TARGET,forward:forwardResult,autoReply:replyResult,reference:ref,globalCentre:centre,error};
}
