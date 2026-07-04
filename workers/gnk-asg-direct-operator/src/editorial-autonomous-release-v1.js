import {readEditorialPlan} from './editorial-workflow-v1.js';
import {renderPublicationDocument} from './publication-document-v1.js';

export const VERSION='GNK_EDITORIAL_AUTONOMOUS_RELEASE_V1_20260704';
export const API_PREFIX='/api/editorial-operations/autonomous';
export const PUBLIC_PREFIXES=['/publications/live','/objave/live'];
export const TIMEZONE='Europe/Zagreb';
export const PACKAGE_HOUR=8;
export const DEADLINE_HOUR=9;

const clean=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const bool=value=>/^(1|true|yes|on)$/i.test(clean(value));
const kvOf=env=>env?.EDITORIAL_KV||env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||null;
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const packageKey=date=>`the-code:autonomy:review:${date}`;
const decisionKey=(date,id)=>`the-code:autonomy:decision:${date}:${id}`;
const publicationKey=slug=>`the-code:autonomy:published:${slug}`;
const publicationIndexKey='the-code:autonomy:published:index';
const notificationIndexKey='the-code:autonomy:notifications:index';
const auditIndexKey='the-code:autonomy:audit:index';
const runKey=(date,stage)=>`the-code:autonomy:run:${date}:${stage}`;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-editorial-autonomy':VERSION}});
const html=(body,status=200,cache='no-store')=>new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff','x-gnk-editorial-autonomy':VERSION}});

function ensureBinding(env){
 const binding=kvOf(env);
 if(!binding?.get||!binding?.put)throw new Error('editorial_kv_unavailable');
 return binding;
}
async function readJson(binding,key){
 const raw=await binding.get(key);
 if(!raw)return null;
 try{return JSON.parse(raw)}catch{throw new Error('editorial_kv_invalid_json')}
}
async function writeJson(binding,key,value,options){
 await binding.put(key,JSON.stringify(value),options);
 return value;
}
async function sha256(value){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));
 return[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
function localParts(value=new Date()){
 const date=value instanceof Date?value:new Date(value);
 if(Number.isNaN(date.getTime()))throw new Error('invalid_schedule_date');
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
 return{date:`${parts.year}-${parts.month}-${parts.day}`,hour:Number(parts.hour),minute:Number(parts.minute),second:Number(parts.second)};
}
function freezePayload(slot){
 const keys=['id','date','publicationType','title','slug','language','category','summary','body','canonical','image','imageAlt','primarySource','supportingSources','preparedByProfile','authorEntity','proposedAuthor','editor','project','editorialBrand','connectedEntity','automationAssisted','processDisclosure','factCheckComplete','sourceReviewComplete'];
 return Object.fromEntries(keys.map(key=>[key,slot?.[key]??null]));
}
function validUrl(value){try{return /^https?:$/i.test(new URL(clean(value)).protocol)}catch{return false}}
function prePackageErrors(slot={}){
 const errors=[];
 for(const field of ['id','title','slug','language','category','summary','body','canonical','image','imageAlt','primarySource'])if(!clean(slot[field]))errors.push(`required:${field}`);
 if(clean(slot.body).length<900)errors.push('body_too_short');
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(clean(slot.slug)))errors.push('slug_invalid');
 if(!validUrl(slot.canonical))errors.push('canonical_invalid');
 if(!validUrl(slot.image))errors.push('image_invalid');
 if(!validUrl(slot.primarySource))errors.push('primary_source_invalid');
 const supporting=Array.isArray(slot.supportingSources)?slot.supportingSources.map(clean).filter(Boolean):[];
 if(supporting.length<1)errors.push('supporting_source_required');
 if(supporting.some(source=>!validUrl(source)))errors.push('supporting_source_invalid');
 if(slot.factCheckComplete!==true)errors.push('fact_check_required');
 if(slot.sourceReviewComplete!==true)errors.push('source_review_required');
 if(!['desk-article','nermin-original','nermin-commentary'].includes(clean(slot.publicationType)))errors.push('publication_type_invalid');
 if(clean(slot.publicationType)==='desk-article'&&!clean(slot.preparedByProfile))errors.push('prepared_by_profile_required');
 if(['nermin-original','nermin-commentary'].includes(clean(slot.publicationType))&&clean(slot.authorEntity)!=='Nermin Sefić')errors.push('nermin_author_entity_required');
 return errors;
}
function attributionSummary(slot={}){
 return{
   author:clean(slot.authorEntity||slot.proposedAuthor||'GNK DINAMO Ltd. Group Editorial Desk'),
   editor:clean(slot.editor||'Nermin Sefić'),
   publisher:'GNK DINAMO Ltd.',
   provider:'GNK ASG d.o.o.'
 };
}
async function appendIndex(binding,key,item,max=500){
 const current=await readJson(binding,key);
 const values=Array.isArray(current)?current:[];
 const id=clean(item.id||item.slug||item.createdAt);
 const next=[item,...values.filter(entry=>clean(entry?.id||entry?.slug||entry?.createdAt)!==id)].slice(0,max);
 await writeJson(binding,key,next);
 return next;
}
async function audit(binding,event){
 const entry={id:crypto.randomUUID(),createdAt:new Date().toISOString(),version:VERSION,...event};
 await appendIndex(binding,auditIndexKey,entry,1000);
 return entry;
}
function packageDeadline(date){return`${date}T09:00:00[${TIMEZONE}]`;}
async function sendReviewNotice(env,reviewPackage){
 const notification={
   id:`review-${reviewPackage.date}`,
   date:reviewPackage.date,
   createdAt:new Date().toISOString(),
   type:'editorial-daily-review',
   title:`Dnevni paket objava · ${reviewPackage.date}`,
   body:`${reviewPackage.items.length} stavki dostavljeno u 08:00. Odbijanje ili hold evidentiraj do 09:00 Europe/Zagreb. Neodbijene nepromijenjene stavke smatraju se potvrđenima.`,
   reviewUrl:`/mobile-admin/?editorialDate=${encodeURIComponent(reviewPackage.date)}`,
   deadline:reviewPackage.deadline,
   status:'queued'
 };
 const binding=ensureBinding(env);
 await appendIndex(binding,notificationIndexKey,notification,200);
 if(!bool(env.EDITORIAL_AUTONOMY_LIVE))return{...notification,status:'review-mode-not-sent'};
 const recipient=clean(env.EDITORIAL_APPROVAL_RECIPIENT||'nermin.sefic@gnk-asg.hr');
 if(!env.EMAIL?.send||!recipient)return{...notification,status:'email-binding-or-recipient-missing'};
 const itemLines=reviewPackage.items.map((item,index)=>`${index+1}. ${item.title}\n   ${item.attribution.author} · editor ${item.attribution.editor}\n   ${item.reviewUrl}`).join('\n\n');
 const text=[notification.title,'',notification.body,'',itemLines,'',`Pregled: https://gnk-asg.hr${notification.reviewUrl}`].join('\n');
 const itemHtml=reviewPackage.items.map((item,index)=>`<li style="margin:0 0 14px"><strong>${index+1}. ${esc(item.title)}</strong><br><span>${esc(item.attribution.author)} · editor ${esc(item.attribution.editor)}</span><br><a href="https://gnk-asg.hr${esc(item.reviewUrl)}">Otvori stavku</a></li>`).join('');
 const message={to:recipient,from:{email:'assistant@gnk-asg.hr',name:'GNK ASG Executive Assistant'},replyTo:'assistant@gnk-asg.hr',subject:`Dnevni paket za pregled · ${reviewPackage.date} · rok 09:00`,text,html:`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111"><h1>${esc(notification.title)}</h1><p>${esc(notification.body)}</p><ol>${itemHtml}</ol><p><a href="https://gnk-asg.hr${esc(notification.reviewUrl)}">Otvori Approval Queue</a></p></body></html>`,headers:{'X-GNK-Editorial-Daily-Package':reviewPackage.date,'X-GNK-Editorial-Deadline':'09:00 Europe/Zagreb'}};
 try{await env.EMAIL.send(message);return{...notification,status:'sent',recipient,sentAt:new Date().toISOString()};}
 catch(error){return{...notification,status:'failed',recipient,error:String(error?.message||error).slice(0,500)};}
}
export async function createDailyReviewPackage(env,dateInput=new Date()){
 const binding=ensureBinding(env),date=typeof dateInput==='string'?dateInput:localParts(dateInput).date;
 if(!datePattern.test(date))throw new Error('invalid_editorial_date');
 const existing=await readJson(binding,packageKey(date));
 if(existing)return{ok:true,created:false,reviewPackage:existing,version:VERSION};
 const plan=await readEditorialPlan(env,date);
 const slots=Array.isArray(plan?.slots)?plan.slots:[];
 const eligible=[];
 for(const slot of slots){
   const errors=prePackageErrors(slot);
   if(errors.length)continue;
   const frozen=freezePayload(slot),contentHash=await sha256(JSON.stringify(frozen));
   eligible.push({
     id:slot.id,date,title:slot.title,slug:slot.slug,publicationType:slot.publicationType,
     state:'awaiting-rejection-window',contentHash,frozen,attribution:attributionSummary(slot),
     reviewUrl:`/mobile-admin/?editorialDate=${encodeURIComponent(date)}&slot=${encodeURIComponent(slot.id)}`,
     deliveredAt:null,deadline:packageDeadline(date)
   });
 }
 const reviewPackage={
   version:VERSION,date,timezone:TIMEZONE,packageTime:'08:00',deadline:packageDeadline(date),
   createdAt:new Date().toISOString(),state:'awaiting-rejection-window',items:eligible,
   silentConfirmationRule:'An unchanged item not rejected or held by 09:00 Europe/Zagreb is confirmed and released.',
   notification:null
 };
 const notification=await sendReviewNotice(env,reviewPackage);
 reviewPackage.notification=notification;
 reviewPackage.deliveredAt=notification.status==='sent'||notification.status==='review-mode-not-sent'?new Date().toISOString():null;
 reviewPackage.items=reviewPackage.items.map(item=>({...item,deliveredAt:reviewPackage.deliveredAt}));
 reviewPackage.silentConfirmationEligible=notification.status==='sent'||(!bool(env.EDITORIAL_AUTONOMY_LIVE)&&notification.status==='review-mode-not-sent');
 await writeJson(binding,packageKey(date),reviewPackage,{expirationTtl:60*60*24*120});
 await audit(binding,{type:'daily-package-created',date,itemCount:eligible.length,notificationStatus:notification.status,silentConfirmationEligible:reviewPackage.silentConfirmationEligible});
 return{ok:true,created:true,reviewPackage,version:VERSION};
}
async function getDecision(binding,date,id){return readJson(binding,decisionKey(date,id));}
function sameOriginDecision(request){
 const url=new URL(request.url),origin=clean(request.headers.get('origin')),site=clean(request.headers.get('sec-fetch-site')).toLowerCase();
 if(origin&&origin!==url.origin)return false;
 return !site||site==='same-origin'||site==='same-site'||site==='none';
}
export async function recordDecision(request,env){
 if(!sameOriginDecision(request)||clean(request.headers.get('x-gnk-editorial-decision'))!=='executive-review')return json({ok:false,error:'csrf_or_decision_header_invalid'},403);
 const body=await request.json().catch(()=>({})),date=clean(body.date),id=clean(body.id),decision=clean(body.decision).toLowerCase();
 if(!datePattern.test(date)||!id||!['reject','hold','restore'].includes(decision))return json({ok:false,error:'invalid_decision'},400);
 const binding=ensureBinding(env),reviewPackage=await readJson(binding,packageKey(date));
 if(!reviewPackage)return json({ok:false,error:'daily_package_not_found'},404);
 if(!reviewPackage.items.some(item=>item.id===id))return json({ok:false,error:'package_item_not_found'},404);
 const local=localParts();
 if(local.date!==date||local.hour>=DEADLINE_HOUR)return json({ok:false,error:'decision_window_closed',deadline:reviewPackage.deadline},409);
 const entry={id,date,decision,state:decision==='reject'?'rejected':decision==='hold'?'held-for-review':'awaiting-rejection-window',reason:clean(body.reason).slice(0,1000),decidedAt:new Date().toISOString(),decidedBy:'Nermin Sefić',version:VERSION};
 await writeJson(binding,decisionKey(date,id),entry,{expirationTtl:60*60*24*365});
 await audit(binding,{type:'executive-decision-recorded',date,itemId:id,decision:entry.decision,reason:entry.reason});
 return json({ok:true,decision:entry});
}
function finalisedSlot(slot,now){
 const type=clean(slot.publicationType);
 return{
   ...slot,
   authorshipConfirmed:type==='nermin-original'?true:slot.authorshipConfirmed===true,
   commentApprovedByNermin:type==='nermin-commentary'?true:slot.commentApprovedByNermin===true,
   finalApproval:true,
   automaticPublication:false,
   dateReviewed:now,
   datePublished:clean(slot.datePublished||now),
   dateModified:now,
   confirmedByDeadlineRule:true,
   confirmationRecord:'Delivered in the 08:00 Europe/Zagreb daily package and not rejected or held by 09:00.'
 };
}
function publishedHtml(slot){
 const preview=renderPublicationDocument(slot);
 return preview
   .replace('<meta name="robots" content="noindex,nofollow,noarchive">','<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">')
   .replace(/Controlled preview/g,'Published')
   .replace('<p class="approval">This preview is intentionally noindex. Public publication requires a separate controlled release action.</p>','<p class="approval">Published through the recorded Executive Office daily review rule.</p>');
}
async function publishItem(binding,slot,item,confirmation){
 const finalSlot=finalisedSlot(slot,confirmation.confirmedAt),document=publishedHtml(finalSlot);
 const record={
   id:item.id,slug:item.slug,title:item.title,date:item.date,publicationType:item.publicationType,
   state:'published',publishedAt:confirmation.confirmedAt,contentHash:item.contentHash,
   confirmation,attribution:item.attribution,canonical:finalSlot.canonical,document,version:VERSION
 };
 await writeJson(binding,publicationKey(item.slug),record);
 await appendIndex(binding,publicationIndexKey,{id:record.id,slug:record.slug,title:record.title,date:record.date,publicationType:record.publicationType,publishedAt:record.publishedAt,canonical:record.canonical,attribution:record.attribution,state:record.state},500);
 return record;
}
export async function releaseDailyPackage(env,dateInput=new Date()){
 const binding=ensureBinding(env),local=localParts(dateInput),date=typeof dateInput==='string'?dateInput:local.date;
 if(!datePattern.test(date))throw new Error('invalid_editorial_date');
 if(typeof dateInput!=='string'&&(local.date!==date||local.hour<DEADLINE_HOUR))return{ok:true,skipped:'deadline_not_reached',date,version:VERSION};
 const done=await readJson(binding,runKey(date,'release'));
 if(done)return{ok:true,created:false,result:done,version:VERSION};
 const reviewPackage=await readJson(binding,packageKey(date));
 if(!reviewPackage)return{ok:true,skipped:'daily_package_not_found',date,version:VERSION};
 if(!reviewPackage.silentConfirmationEligible||!reviewPackage.deliveredAt)return{ok:false,blocked:'package_not_delivered',date,notification:reviewPackage.notification,version:VERSION};
 const plan=await readEditorialPlan(env,date),slots=Array.isArray(plan?.slots)?plan.slots:[];
 const results=[];
 for(const item of reviewPackage.items){
   const decision=await getDecision(binding,date,item.id);
   if(decision?.decision==='reject'||decision?.decision==='hold'){
     results.push({id:item.id,slug:item.slug,state:decision.state,decision});continue;
   }
   const slot=slots.find(entry=>entry.id===item.id);
   if(!slot){results.push({id:item.id,slug:item.slug,state:'publication-failed',error:'editorial_slot_missing'});continue;}
   const currentHash=await sha256(JSON.stringify(freezePayload(slot)));
   if(currentHash!==item.contentHash){results.push({id:item.id,slug:item.slug,state:'held-for-review',error:'content_changed_after_package'});continue;}
   const confirmation={method:'not-rejected-by-deadline',confirmedBy:'Nermin Sefić',packageDeliveredAt:reviewPackage.deliveredAt,deadline:reviewPackage.deadline,confirmedAt:new Date().toISOString()};
   try{const record=await publishItem(binding,slot,item,confirmation);results.push({id:item.id,slug:item.slug,state:'published',publishedAt:record.publishedAt,confirmation});}
   catch(error){results.push({id:item.id,slug:item.slug,state:'publication-failed',error:String(error?.message||error).slice(0,500)});}
 }
 const result={date,completedAt:new Date().toISOString(),published:results.filter(item=>item.state==='published').length,rejected:results.filter(item=>item.state==='rejected').length,held:results.filter(item=>item.state==='held-for-review').length,failed:results.filter(item=>item.state==='publication-failed').length,results,version:VERSION};
 await writeJson(binding,runKey(date,'release'),result,{expirationTtl:60*60*24*365});
 await audit(binding,{type:'daily-package-released',...result});
 return{ok:result.failed===0,created:true,result,version:VERSION};
}
export async function runEditorialAutonomousRelease(env,dateInput=new Date()){
 const local=localParts(dateInput),binding=kvOf(env);
 if(!binding?.get||!binding?.put)return{ok:true,skipped:'editorial_kv_unavailable',version:VERSION};
 const tasks=[];
 if(local.hour===PACKAGE_HOUR)tasks.push(createDailyReviewPackage(env,dateInput));
 if(local.hour>=DEADLINE_HOUR)tasks.push(releaseDailyPackage(env,dateInput));
 if(!tasks.length)return{ok:true,skipped:'outside_review_or_release_window',local,version:VERSION};
 const settled=await Promise.allSettled(tasks);
 return{ok:settled.every(item=>item.status==='fulfilled'),local,results:settled.map(item=>item.status==='fulfilled'?item.value:{ok:false,error:String(item.reason?.message||item.reason)}),version:VERSION};
}
async function listPackage(env,date){
 const binding=ensureBinding(env),reviewPackage=await readJson(binding,packageKey(date));
 if(!reviewPackage)return json({ok:false,error:'daily_package_not_found',date},404);
 const items=[];
 for(const item of reviewPackage.items){items.push({...item,decision:await getDecision(binding,date,item.id)});}
 return json({ok:true,reviewPackage:{...reviewPackage,items},serverTime:new Date().toISOString(),timezone:TIMEZONE,version:VERSION});
}
export async function handleEditorialAutonomyApi(request,env){
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/',url=new URL(request.url);
 if(request.method==='GET'&&path===`${API_PREFIX}/package`){
   const date=clean(url.searchParams.get('date'))||localParts().date;
   if(!datePattern.test(date))return json({ok:false,error:'invalid_date'},400);
   return listPackage(env,date);
 }
 if(request.method==='GET'&&path===`${API_PREFIX}/status`){
   const binding=ensureBinding(env),date=clean(url.searchParams.get('date'))||localParts().date;
   return json({ok:true,date,reviewPackage:await readJson(binding,packageKey(date)),release:await readJson(binding,runKey(date,'release')),notifications:await readJson(binding,notificationIndexKey),version:VERSION});
 }
 if(request.method==='POST'&&path===`${API_PREFIX}/decision`)return recordDecision(request,env);
 if(request.method==='POST'&&path===`${API_PREFIX}/package/create`){
   const body=await request.json().catch(()=>({}));return json(await createDailyReviewPackage(env,clean(body.date)||new Date()));
 }
 if(request.method==='POST'&&path===`${API_PREFIX}/release`){
   const body=await request.json().catch(()=>({}));return json(await releaseDailyPackage(env,clean(body.date)||new Date()));
 }
 return null;
}
export const isEditorialAutonomyPublicPath=path=>PUBLIC_PREFIXES.some(prefix=>path===prefix||path.startsWith(`${prefix}/`));
export async function serveEditorialAutonomyPublic(request,env){
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/',prefix=PUBLIC_PREFIXES.find(value=>path===value||path.startsWith(`${value}/`));
 if(!prefix||!['GET','HEAD'].includes(request.method))return null;
 const binding=ensureBinding(env),slug=clean(path.slice(prefix.length).replace(/^\/+|\/+$/g,''));
 if(!slug){
   const index=await readJson(binding,publicationIndexKey),items=Array.isArray(index)?index:[];
   const cards=items.map(item=>`<article><h2><a href="${esc(prefix)}/${esc(item.slug)}/">${esc(item.title)}</a></h2><p>${esc(item.attribution?.author||'GNK DINAMO Ltd. Group Editorial Desk')} · ${esc(item.publishedAt)}</p></article>`).join('')||'<p>No publications are available.</p>';
   return html(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>THE CODE Intelligence Publications</title></head><body><main><h1>THE CODE Intelligence Publications</h1>${cards}</main></body></html>`,200,'public, max-age=60');
 }
 const record=await readJson(binding,publicationKey(slug));
 if(!record)return html('<!doctype html><html><body><h1>Publication not found</h1></body></html>',404);
 return html(request.method==='HEAD'?'':record.document,200,'public, max-age=300, stale-while-revalidate=3600');
}
export const __test={localParts,freezePayload,prePackageErrors,packageKey,decisionKey,publicationKey,runKey,finalisedSlot,publishedHtml};
