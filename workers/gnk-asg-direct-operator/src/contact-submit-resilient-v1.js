import {handleContactStudio} from './contact-studio-mail-v1.js';
import {sendBrandedEmail} from './outbound-mail-transport-v1.js';
import {generateCaseId} from './contact-case-center-v1.js';

export const VERSION='GNK_ASG_CONTACT_RESILIENT_V1_20260718_D1_KV_FALLBACK';
const PATH='/api/contact-submit';
const INTERNAL='rht@gmx.com';
const clean=(value,max=12000)=>String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=value=>clean(value).split(/\n{2,}/).filter(Boolean).map(p=>`<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-contact-resilience':VERSION}});
const storeOf=env=>env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||null;
const validKey=value=>/^[A-Za-z0-9._:-]{16,160}$/.test(clean(value,160));
const validEmail=value=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/i.test(clean(value,240));
const consent=value=>value===true||['true','1','yes','on'].includes(clean(value,20).toLowerCase());

async function fallbackRecord(request,env){
 const store=storeOf(env);
 if(!store)return null;
 let body;
 try{body=await request.json()}catch{return null}
 const language=clean(body.language,5).toLowerCase()==='en'?'en':'hr';
 const name=clean(body.name,160),email=clean(body.email,200).toLowerCase(),phone=clean(body.phone,80),subject=clean(body.subject,220),message=clean(body.message,8000),department=clean(body.department||body.mailbox||'contact',40).toLowerCase();
 const idempotencyKey=clean(request.headers.get('x-idempotency-key')||body.idempotencyKey,160);
 if(!validKey(idempotencyKey)||!name||!validEmail(email)||!subject||!message||!consent(body.consent))return null;
 const dedupeKey=`contact:fallback:idempotency:${idempotencyKey}`;
 try{
  const existing=await store.get(dedupeKey);
  if(existing){const saved=JSON.parse(existing);return json({ok:true,accepted:true,stored:true,reused:true,storage:'kv-fallback',caseId:saved.caseId,receivedAt:saved.createdAt,mailAttempted:false,deliveryOk:false,message:language==='en'?'Message was already recorded under this reference.':'Upit je već evidentiran pod ovom referencom.'},200)}
 }catch{}
 const caseId=generateCaseId(),createdAt=new Date().toISOString();
 const record={caseId,createdAt,source:`public-contact:${department}`,department,name,email,phone,subject,message,language,idempotencyKey,storage:'kv-fallback'};
 try{
  await store.put(`contact:fallback:case:${caseId}`,JSON.stringify(record),{expirationTtl:60*60*24*120});
  await store.put(dedupeKey,JSON.stringify({caseId,createdAt}),{expirationTtl:60*60*24*120});
  await store.put('contact:fallback:last',JSON.stringify(record));
 }catch{return null}
 const internalText=`GNK ASG – novi upit putem kontakt forme\n\nEvidencijski broj: ${caseId}\nRezervna pohrana: KV fallback\nOdjel: ${department}\nVrijeme: ${createdAt}\nPodnositelj: ${name}\nE-mail: ${email}\nTelefon: ${phone||'-'}\nPredmet: ${subject}\nPoruka:\n${message}`;
 const ack=language==='en'?`Dear ${name},\n\nYour message was received under reference ${caseId}.\n\nSubject: ${subject}\nReceived: ${createdAt}\n\nThe message was recorded and routed for human review.\n\nKind regards,`:`Poštovani/Poštovana ${name},\n\nVaša poruka zaprimljena je pod referencom ${caseId}.\n\nPredmet: ${subject}\nVrijeme: ${createdAt}\n\nPoruka je evidentirana i proslijeđena na ljudski pregled.\n\nSrdačan pozdrav,`;
 let internal=false,acknowledgement=false;
 try{const sent=await sendBrandedEmail(env,{from:'contact@gnk-asg.hr',fromName:'GNK ASG Contact Desk',to:INTERNAL,replyTo:email,subject:`[${caseId}] ${subject}`,text:internalText,html:html(internalText)});internal=Boolean(sent?.sent)}catch{}
 try{const sent=await sendBrandedEmail(env,{from:'contact@gnk-asg.hr',fromName:'GNK ASG Contact Desk',to:email,replyTo:'contact@gnk-asg.hr',subject:language==='en'?`[${caseId}] Message received`:`[${caseId}] Potvrda zaprimanja upita`,text:ack,html:html(ack)});acknowledgement=Boolean(sent?.sent)}catch{}
 const deliveryOk=internal&&acknowledgement;
 return json({ok:true,accepted:true,stored:true,reused:false,storage:'kv-fallback',caseId,receivedAt:createdAt,mailAttempted:true,deliveryOk,delivery:{internal,acknowledgement},message:deliveryOk?(language==='en'?'Message recorded and confirmation sent.':'Upit je evidentiran i potvrda je poslana.'):(language==='en'?'Message recorded; email delivery is pending.':'Upit je evidentiran; dostava e-pošte je u obradi.')},deliveryOk?201:202);
}

export async function handleResilientContact(request,env,ctx,app){
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
 if(path!==PATH)return null;
 const retry=request.method==='POST'?request.clone():null;
 const response=await handleContactStudio(request,env,ctx,app);
 if(!retry||response.status!==503)return response;
 let payload=null;try{payload=await response.clone().json()}catch{}
 if(payload?.error!=='contact_storage_unavailable')return response;
 return await fallbackRecord(retry,env)||response;
}
