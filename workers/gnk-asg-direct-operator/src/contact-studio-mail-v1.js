import {createContactCase,generateCaseId} from './contact-case-center-v1.js';
import {sendBrandedEmail,VERSION as TRANSPORT_VERSION} from './outbound-mail-transport-v1.js';
import {createContactAcknowledgement,VERSION as CONTACT_AI_VERSION} from './contact-ai-reply-v1.js';

export const VERSION=`GNK_ASG_CONTACT_STUDIO_MAIL_V2_20260716_${TRANSPORT_VERSION}_${CONTACT_AI_VERSION}`;
const CONTACT_PATH='/api/contact-submit',STUDIO_PATH='/api/studio-message/send',CONTACT_INTERNAL='rht@gmx.com';
const MAILBOXES={info:{email:'info@gnk-asg.hr',name:'GNK ASG Info Desk'},contact:{email:'contact@gnk-asg.hr',name:'GNK ASG Contact Desk'},office:{email:'office@gnk-asg.hr',name:'GNK ASG Office'},media:{email:'media@gnk-asg.hr',name:'GNK ASG Media Desk'},press:{email:'press@gnk-asg.hr',name:'GNK ASG Press Desk'},legal:{email:'legal@gnk-asg.hr',name:'GNK ASG Legal & Compliance'},privacy:{email:'privacy@gnk-asg.hr',name:'GNK ASG Privacy Desk'},it:{email:'it@gnk-asg.hr',name:'GNK ASG IT'},ubo:{email:'ubo@gnk-asg.hr',name:'GNK ASG UBO Office'},sefic:{email:'sefic@gnk-asg.hr',name:'Nermin Sefić'},assistant:{email:'assistant@gnk-asg.hr',name:'GNK ASG Digital Assistant'}};
const ALLOWED_FROM=new Set(Object.values(MAILBOXES).map(x=>x.email).concat(['nermin.sefic@gnk-asg.hr']));
const clean=(value,max=12000)=>String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
const validEmail=value=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/i.test(clean(value,240));
const consent=value=>value===true||['true','1','yes','on'].includes(clean(value,20).toLowerCase());
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=value=>clean(value).split(/\n{2,}/).filter(Boolean).map(p=>`<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-contact-studio-mail':VERSION,'x-gnk-outbound-transport':TRANSPORT_VERSION,'x-gnk-contact-ai':CONTACT_AI_VERSION}});

async function parseContact(request){
  const type=String(request.headers.get('content-type')||'').toLowerCase();
  if(type.includes('application/json'))return{fields:await request.json(),attachments:[]};
  if(type.includes('multipart/form-data')||type.includes('application/x-www-form-urlencoded')){
    const form=await request.formData(),fields={},attachments=[];
    for(const[key,value]of form.entries()){
      if(typeof value==='string')fields[key]=value;
      else if(value&&typeof value.arrayBuffer==='function'&&value.size){
        if(value.size>3_200_000)throw new Error('attachment_too_large');
        const name=clean(value.name,180),type=clean(value.type,120).toLowerCase();
        if(type!=='application/pdf'&&!/\.pdf$/i.test(name))throw new Error('only_pdf_allowed');
        attachments.push({filename:name||'document.pdf',contentType:'application/pdf',bytes:new Uint8Array(await value.arrayBuffer())});
      }
    }
    if(attachments.length>3)throw new Error('too_many_attachments');
    return{fields,attachments};
  }
  throw new Error('unsupported_content_type');
}

async function recordAudit(env,key,item){
  const store=env.GNK_ASG_CONFIG_KV||env.GNK_ASG_KV;
  if(!store)return;
  try{
    const list=JSON.parse(await store.get(key)||'[]'),next=[item,...(Array.isArray(list)?list:[])].slice(0,500);
    await store.put(key,JSON.stringify(next,null,2));
    await store.put(`${key}:last`,JSON.stringify(item,null,2));
  }catch{}
}

async function digest(value){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value||'')));
  return[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,32);
}

async function enforceContactRateLimit(request,env,email){
  const store=env.GNK_ASG_CONFIG_KV||env.GNK_ASG_KV;
  if(!store)return{allowed:true,enforced:false};
  const ip=clean(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')||'unknown',100).split(',')[0];
  const hour=Math.floor(Date.now()/3_600_000),keys=[
    {key:`contact:limit:ip:${await digest(ip)}:${hour}`,limit:5},
    {key:`contact:limit:email:${await digest(email)}:${hour}`,limit:3}
  ];
  try{
    const current=await Promise.all(keys.map(item=>store.get(item.key)));
    if(keys.some((item,index)=>Number(current[index]||0)>=item.limit))return{allowed:false,enforced:true,retryAfter:3600};
    await Promise.all(keys.map((item,index)=>store.put(item.key,String(Number(current[index]||0)+1),{expirationTtl:3700})));
    return{allowed:true,enforced:true};
  }catch(error){
    await recordAudit(env,'contact:rate-limit:error',{createdAt:new Date().toISOString(),error:clean(error?.message||error,180)});
    return{allowed:true,enforced:false};
  }
}

async function contact(request,env){
  if(request.method==='GET')return json({ok:true,ready:true,endpoint:CONTACT_PATH,storage:Boolean(env.GNK_ASG_D1),mail:Boolean(env.EMAIL?.send),ai:Boolean(env.AI?.run),transport:TRANSPORT_VERSION,aiVersion:CONTACT_AI_VERSION});
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  let parsed;
  try{parsed=await parseContact(request)}catch(error){return json({ok:false,error:clean(error?.message||error,120)},400)}
  const body=parsed.fields||{};
  if(clean(body.website||body.company_website,200))return json({ok:true,accepted:true,spamFiltered:true},202);
  const language=clean(body.language,5).toLowerCase()==='en'?'en':'hr',name=clean(body.name,160),email=clean(body.email,240).toLowerCase(),phone=clean(body.phone,80),subject=clean(body.subject,240),message=clean(body.message,10000),key=clean(body.department||body.mailbox||body.departmentKey,40).toLowerCase(),mailbox=MAILBOXES[key]||MAILBOXES.contact;
  if(!name||!validEmail(email)||!subject||!message||!consent(body.consent))return json({ok:false,error:'missing_or_invalid_fields',message:language==='en'?'Check the required fields, email and consent.':'Provjerite obvezna polja, e-mail adresu i privolu.'},400);
  const rate=await enforceContactRateLimit(request,env,email);
  if(!rate.allowed)return new Response(JSON.stringify({ok:false,error:'rate_limit_exceeded',message:language==='en'?'Too many requests. Please try again later.':'Previše zahtjeva. Pokušajte ponovno kasnije.'},null,2),{status:429,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','retry-after':String(rate.retryAfter||3600),'x-content-type-options':'nosniff'}});
  let caseId=generateCaseId(),createdAt=new Date().toISOString(),stored=false,storageError=null;
  if(env.GNK_ASG_D1){
    try{const saved=await createContactCase(env,{source:`public-contact:${key||'contact'}`,name,email,subject,message:`${phone?`Telefon: ${phone}\n\n`:''}${message}`,language});caseId=saved.caseId;createdAt=saved.createdAt;stored=true}catch(error){storageError=clean(error?.message||'CONTACT_STORAGE_FAILED',180)}
  }else storageError='CONTACT_STORAGE_UNAVAILABLE';
  const internalText=`GNK ASG – novi upit putem kontakt forme\n\nEvidencijski broj: ${caseId}\nOdjel: ${mailbox.name}\nVrijeme: ${createdAt}\nPodnositelj: ${name}\nE-mail: ${email}\nTelefon: ${phone||'-'}\nPredmet: ${subject}\nPoruka:\n${message}`;
  const acknowledgement=await createContactAcknowledgement(env,{language,name,caseId,subject,message,department:mailbox.name});
  let internalMail=null,autoReply=null;
  try{internalMail=await sendBrandedEmail(env,{from:mailbox.email,fromName:mailbox.name,to:CONTACT_INTERNAL,replyTo:email,subject:`[${caseId}] ${subject}`,text:internalText,html:html(internalText),attachments:parsed.attachments})}catch(error){internalMail={ok:false,error:clean(error?.message||error,180)}}
  try{autoReply=await sendBrandedEmail(env,{from:mailbox.email,fromName:mailbox.name,to:email,replyTo:mailbox.email,subject:language==='en'?`[${caseId}] Message received`:`[${caseId}] Potvrda zaprimanja upita`,text:acknowledgement.text,html:html(acknowledgement.text),headers:{'Auto-Submitted':'auto-replied','X-GNK-ASG-Contact-Acknowledgement':CONTACT_AI_VERSION,'X-GNK-ASG-AI-Mode':acknowledgement.aiUsed?'model':'deterministic'}})}catch(error){autoReply={ok:false,error:clean(error?.message||error,180)}}
  const deliveryOk=Boolean(internalMail?.sent)&&Boolean(autoReply?.sent),accepted=stored||Boolean(internalMail?.sent);
  await recordAudit(env,'contact:mail:audit',{caseId,createdAt,mailbox:mailbox.email,stored,rateLimitEnforced:rate.enforced,acknowledgement:{aiUsed:acknowledgement.aiUsed,model:acknowledgement.model,version:acknowledgement.version},internal:internalMail,autoReply});
  return json({ok:accepted,accepted,caseId,receivedAt:createdAt,selectedMailbox:mailbox.email,stored,storageError:stored?null:storageError,mailAttempted:true,deliveryOk,acknowledgementMode:acknowledgement.aiUsed?'ai':'deterministic',internalMail,autoReply,message:deliveryOk?(language==='en'?'Message recorded and confirmation sent.':'Upit je evidentiran i potvrda je poslana.'):(language==='en'?'Message recorded; email delivery is pending.':'Upit je evidentiran; dostava e-pošte je u obradi.')},deliveryOk?201:accepted?202:503);
}

async function authorised(request,env,ctx,app){const url=new URL('/api/mail-sync/health',request.url),headers=new Headers(request.headers);headers.delete('content-length');headers.delete('content-type');const response=await app.fetch(new Request(url.toString(),{method:'GET',headers,credentials:'same-origin'}),env,ctx);return response.status===401||response.status===403?response:null}

async function studio(request,env,ctx,app){
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  const denied=await authorised(request,env,ctx,app);if(denied)return denied;
  let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_json'},400)}
  if(clean(body.confirm,40)!=='SEND_MAIL')return json({ok:false,error:'confirmation_required'},400);
  const from=clean(body.from,240).toLowerCase(),to=clean(body.to,3000),subject=clean(body.subject,240),text=clean(body.text||body.plainText,30000),messageHtml=clean(body.html||body.bodyHtml||body.body,60000);
  if(!ALLOWED_FROM.has(from))return json({ok:false,error:'from_not_allowed'},400);
  if(!to||!subject||(!text&&!messageHtml))return json({ok:false,error:'missing_required_fields'},400);
  try{
    const result=await sendBrandedEmail(env,{from,fromName:clean(body.fromName,180)||from,to,cc:body.cc,bcc:body.bcc,replyTo:body.replyTo||from,subject,text,html:messageHtml||html(text),attachments:body.attachments});
    const id=`GNK-MAIL-${Date.now()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    await recordAudit(env,'mail:studio:outbound',{id,createdAt:new Date().toISOString(),from,to,cc:body.cc||'',subject,result});
    return json({ok:true,status:result.status,delivered:result.sent>0,sent:result.sent,failed:result.failed,id,transport:result.transport,logo:result.logo,signature:result.signature});
  }catch(error){return json({ok:false,status:'FAILED',delivered:false,error:clean(error?.message||error,220)},502)}
}

export function handlesContactStudio(path){return path===CONTACT_PATH||path===STUDIO_PATH}
export async function handleContactStudio(request,env,ctx,app){const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';if(path===CONTACT_PATH)return contact(request,env);if(path===STUDIO_PATH)return studio(request,env,ctx,app);return null}
