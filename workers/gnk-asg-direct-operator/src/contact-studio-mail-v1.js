import {createContactCase,generateCaseId} from './contact-case-center-v1.js';
import {sendBrandedEmail,VERSION as TRANSPORT_VERSION} from './outbound-mail-transport-v1.js';

export const VERSION=`GNK_ASG_CONTACT_STUDIO_MAIL_V5_20260717_EXPLICIT_AUTH_SAME_ORIGIN_${TRANSPORT_VERSION}`;
const CONTACT_PATH='/api/contact-submit',STUDIO_PATH='/api/studio-message/send',CONTACT_INTERNAL='rht@gmx.com';
const CONTACT_RATE_WINDOW_SECONDS=900,CONTACT_RATE_LIMIT=5,CONTACT_JSON_MAX_BYTES=32_000,MAX_ATTACHMENTS=3,MAX_ATTACHMENT_BYTES=3_200_000,MAX_TOTAL_ATTACHMENT_BYTES=6_400_000;
const CONTACT_ORIGINS=new Set(['https://gnk-asg.hr','https://www.gnk-asg.hr']);
const MAILBOXES={info:{email:'info@gnk-asg.hr',name:'GNK ASG Info Desk'},contact:{email:'contact@gnk-asg.hr',name:'GNK ASG Contact Desk'},office:{email:'office@gnk-asg.hr',name:'GNK ASG Office'},media:{email:'media@gnk-asg.hr',name:'GNK ASG Media Desk'},press:{email:'press@gnk-asg.hr',name:'GNK ASG Press Desk'},legal:{email:'legal@gnk-asg.hr',name:'GNK ASG Legal & Compliance'},privacy:{email:'privacy@gnk-asg.hr',name:'GNK ASG Privacy Desk'},it:{email:'it@gnk-asg.hr',name:'GNK ASG IT'},ubo:{email:'ubo@gnk-asg.hr',name:'GNK ASG UBO Office'},sefic:{email:'sefic@gnk-asg.hr',name:'Nermin Sefić'},assistant:{email:'assistant@gnk-asg.hr',name:'GNK ASG Digital Assistant'}};
const ALLOWED_FROM=new Set(Object.values(MAILBOXES).map(x=>x.email).concat(['nermin.sefic@gnk-asg.hr']));
const clean=(value,max=12000)=>String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
const validEmail=value=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/i.test(clean(value,240));
const consent=value=>value===true||['true','1','yes','on'].includes(clean(value,20).toLowerCase());
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=value=>clean(value).split(/\n{2,}/).filter(Boolean).map(p=>`<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
const json=(data,status=200,extraHeaders={})=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-contact-studio-mail':VERSION,'x-gnk-outbound-transport':TRANSPORT_VERSION,'vary':'Origin','cross-origin-resource-policy':'same-site',...extraHeaders}});
const clientIp=request=>clean(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown',80);
function contactOriginAllowed(request){const value=clean(request.headers.get('origin'),240);if(!value)return false;try{const origin=new URL(value);return origin.origin===value&&CONTACT_ORIGINS.has(origin.origin)}catch{return false}}
function sameOrigin(request){const value=clean(request.headers.get('origin'),240);if(!value)return false;try{return new URL(value).origin===new URL(request.url).origin}catch{return false}}
async function sha256(value){const bytes=new TextEncoder().encode(value),digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}
async function enforceContactRateLimit(request,env){const store=env.GNK_ASG_CONFIG_KV||env.GNK_ASG_KV;if(!store)return{ok:false,error:'CONTACT_RATE_LIMIT_STORAGE_UNAVAILABLE'};const bucket=Math.floor(Date.now()/(CONTACT_RATE_WINDOW_SECONDS*1000)),ipHash=await sha256(clientIp(request)),key=`contact:rate:${bucket}:${ipHash}`;let count=0;try{count=Number(await store.get(key)||0);if(!Number.isFinite(count)||count<0)count=0;if(count>=CONTACT_RATE_LIMIT)return{ok:false,error:'rate_limited',retryAfter:CONTACT_RATE_WINDOW_SECONDS};await store.put(key,String(count+1),{expirationTtl:CONTACT_RATE_WINDOW_SECONDS+60});return{ok:true,remaining:Math.max(0,CONTACT_RATE_LIMIT-count-1)}}catch{return{ok:false,error:'CONTACT_RATE_LIMIT_STORAGE_FAILED'}}}
async function parseContact(request){
 const declaredLength=Number(request.headers.get('content-length')||0);
 if(Number.isFinite(declaredLength)&&declaredLength>MAX_TOTAL_ATTACHMENT_BYTES+100_000)throw new Error('request_too_large');
 const type=String(request.headers.get('content-type')||'').toLowerCase();
 if(type.includes('application/json')){
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>CONTACT_JSON_MAX_BYTES)throw new Error('request_too_large');
  let fields;try{fields=JSON.parse(raw)}catch{throw new Error('invalid_json')}
  if(!fields||typeof fields!=='object'||Array.isArray(fields))throw new Error('invalid_json');
  return{fields,attachments:[]};
 }
 if(type.includes('multipart/form-data')||type.includes('application/x-www-form-urlencoded')){
  const form=await request.formData(),fields={},attachments=[];let totalBytes=0,fieldBytes=0;
  for(const[key,value]of form.entries()){
   if(typeof value==='string'){
    fieldBytes+=new TextEncoder().encode(value).byteLength;
    if(fieldBytes>CONTACT_JSON_MAX_BYTES)throw new Error('request_too_large');
    fields[key]=value;
   }else if(value&&typeof value.arrayBuffer==='function'&&value.size){
    if(attachments.length>=MAX_ATTACHMENTS)throw new Error('too_many_attachments');
    if(value.size>MAX_ATTACHMENT_BYTES)throw new Error('attachment_too_large');
    totalBytes+=value.size;if(totalBytes>MAX_TOTAL_ATTACHMENT_BYTES)throw new Error('attachments_total_too_large');
    const name=clean(value.name,180),type=clean(value.type,120).toLowerCase();
    if(type!=='application/pdf'&&!/\.pdf$/i.test(name))throw new Error('only_pdf_allowed');
    attachments.push({filename:name||'document.pdf',contentType:'application/pdf',bytes:new Uint8Array(await value.arrayBuffer())});
   }
  }
  return{fields,attachments};
 }
 throw new Error('unsupported_content_type');
}
async function recordAudit(env,key,item){const store=env.GNK_ASG_CONFIG_KV||env.GNK_ASG_KV;if(!store)return;try{const list=JSON.parse(await store.get(key)||'[]'),next=[item,...(Array.isArray(list)?list:[])].slice(0,500);await store.put(key,JSON.stringify(next,null,2));await store.put(`${key}:last`,JSON.stringify(item,null,2))}catch{}}
async function contact(request,env){
 if(request.method==='GET')return json({ok:true,ready:true,endpoint:CONTACT_PATH});
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405,{'allow':'GET, POST'});
 if(!contactOriginAllowed(request))return json({ok:false,error:'origin_not_allowed',message:'Request origin is not allowed.'},403);
 const limited=await enforceContactRateLimit(request,env);
 if(!limited.ok){const status=limited.error==='rate_limited'?429:503;return json({ok:false,error:limited.error},status,limited.retryAfter?{'retry-after':String(limited.retryAfter)}:{})}
 let parsed;try{parsed=await parseContact(request)}catch(error){return json({ok:false,error:clean(error?.message||error,120)},400)}
 const body=parsed.fields||{};
 if(clean(body.website||body.company_website,200))return json({ok:true,accepted:true,spamFiltered:true},202);
 const language=clean(body.language,5).toLowerCase()==='en'?'en':'hr',name=clean(body.name,160),email=clean(body.email,200).toLowerCase(),phone=clean(body.phone,80),subject=clean(body.subject,220),message=clean(body.message,8000),key=clean(body.department||body.mailbox||body.departmentKey,40).toLowerCase(),mailbox=MAILBOXES[key]||MAILBOXES.contact;
 if(!name||!validEmail(email)||!subject||!message||!consent(body.consent))return json({ok:false,error:'missing_or_invalid_fields',message:language==='en'?'Check the required fields, email and consent.':'Provjerite obvezna polja, e-mail adresu i privolu.'},400);
 let caseId=generateCaseId(),createdAt=new Date().toISOString(),stored=false,storageError='CONTACT_STORAGE_UNAVAILABLE';
 if(env.GNK_ASG_D1){try{const saved=await createContactCase(env,{source:`public-contact:${key||'contact'}`,name,email,subject,message:`${phone?`Telefon: ${phone}\n\n`:''}${message}`,language});caseId=saved.caseId;createdAt=saved.createdAt;stored=true}catch(error){storageError=clean(error?.message||'CONTACT_STORAGE_FAILED',180)}}
 if(!stored){
  await recordAudit(env,'contact:mail:audit',{createdAt,stored:false,mailAttempted:false,storageError});
  return json({ok:false,accepted:false,stored:false,mailAttempted:false,error:'contact_storage_unavailable',message:language==='en'?'The contact service is temporarily unavailable. Please try again later.':'Kontakt usluga trenutačno nije dostupna. Pokušajte ponovno kasnije.'},503);
 }
 const internalText=`GNK ASG – novi upit putem kontakt forme\n\nEvidencijski broj: ${caseId}\nOdjel: ${mailbox.name}\nVrijeme: ${createdAt}\nPodnositelj: ${name}\nE-mail: ${email}\nTelefon: ${phone||'-'}\nPredmet: ${subject}\nPoruka:\n${message}`;
 const ack=language==='en'?`Dear ${name},\n\nYour message was received under reference ${caseId}.\n\nSubject: ${subject}\nDepartment: ${mailbox.name}\nReceived: ${createdAt}\n\nThe message was recorded and routed for human review.\n\nKind regards,`:`Poštovani/Poštovana ${name},\n\nVaša poruka zaprimljena je pod referencom ${caseId}.\n\nPredmet: ${subject}\nOdjel: ${mailbox.name}\nVrijeme: ${createdAt}\n\nPoruka je evidentirana i proslijeđena na ljudski pregled.\n\nSrdačan pozdrav,`;
 let internalMail=null,autoReply=null;
 try{internalMail=await sendBrandedEmail(env,{from:mailbox.email,fromName:mailbox.name,to:CONTACT_INTERNAL,replyTo:email,subject:`[${caseId}] ${subject}`,text:internalText,html:html(internalText),attachments:parsed.attachments})}catch(error){internalMail={ok:false,error:clean(error?.message||error,180)}}
 try{autoReply=await sendBrandedEmail(env,{from:mailbox.email,fromName:mailbox.name,to:email,replyTo:mailbox.email,subject:language==='en'?`[${caseId}] Message received`:`[${caseId}] Potvrda zaprimanja upita`,text:ack,html:html(ack)})}catch(error){autoReply={ok:false,error:clean(error?.message||error,180)}}
 const internalSent=Boolean(internalMail?.sent),acknowledgementSent=Boolean(autoReply?.sent),deliveryOk=internalSent&&acknowledgementSent;
 await recordAudit(env,'contact:mail:audit',{caseId,createdAt,mailbox:mailbox.email,stored:true,internal:internalMail,autoReply});
 return json({ok:true,accepted:true,caseId,receivedAt:createdAt,selectedMailbox:mailbox.email,stored:true,mailAttempted:true,deliveryOk,delivery:{internal:internalSent,acknowledgement:acknowledgementSent},message:deliveryOk?(language==='en'?'Message recorded and confirmation sent.':'Upit je evidentiran i potvrda je poslana.'):(language==='en'?'Message recorded; email delivery is pending.':'Upit je evidentiran; dostava e-pošte je u obradi.')},deliveryOk?201:202);
}
async function authorised(request,env,ctx,app){const url=new URL('/api/operator-auth-check',request.url),headers=new Headers(request.headers);headers.delete('content-length');headers.delete('content-type');let response;try{response=await app.fetch(new Request(url.toString(),{method:'GET',headers,redirect:'manual'}),env,ctx)}catch{return json({ok:false,error:'auth_probe_failed'},503)}if(!response.ok)return response;let payload;try{payload=await response.json()}catch{return json({ok:false,error:'auth_probe_invalid'},503)}return payload?.authenticated===true?null:json({ok:false,error:'unauthorized',message:'Operator/admin session required.'},401,{'www-authenticate':'Session'})}
async function studio(request,env,ctx,app){if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405,{'allow':'POST'});if(!sameOrigin(request))return json({ok:false,error:'origin_not_allowed'},403);const denied=await authorised(request,env,ctx,app);if(denied)return denied;let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_json'},400)}if(clean(body.confirm,40)!=='SEND_MAIL')return json({ok:false,error:'confirmation_required'},400);const from=clean(body.from,240).toLowerCase(),to=clean(body.to,3000),subject=clean(body.subject,240),text=clean(body.text||body.plainText,30000),messageHtml=clean(body.html||body.bodyHtml||body.body,60000);if(!ALLOWED_FROM.has(from))return json({ok:false,error:'from_not_allowed'},400);if(!to||!subject||(!text&&!messageHtml))return json({ok:false,error:'missing_required_fields'},400);try{const result=await sendBrandedEmail(env,{from,fromName:clean(body.fromName,180)||from,to,cc:body.cc,bcc:body.bcc,replyTo:body.replyTo||from,subject,text,html:messageHtml||html(text),attachments:body.attachments});const id=`GNK-MAIL-${Date.now()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;await recordAudit(env,'mail:studio:outbound',{id,createdAt:new Date().toISOString(),from,to,cc:body.cc||'',subject,result});const complete=result.ok===true&&result.failed===0;return json({ok:complete,status:result.status,delivered:result.sent>0,complete,sent:result.sent,failed:result.failed,failures:result.failures||[],id,transport:result.transport,logo:result.logo,signature:result.signature},complete?200:207)}catch{return json({ok:false,status:'FAILED',delivered:false,complete:false,error:'mail_transport_failed'},502)}}
export function handlesContactStudio(path){return path===CONTACT_PATH||path===STUDIO_PATH}
export async function handleContactStudio(request,env,ctx,app){const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';if(path===CONTACT_PATH)return contact(request,env);if(path===STUDIO_PATH)return studio(request,env,ctx,app);return null}
