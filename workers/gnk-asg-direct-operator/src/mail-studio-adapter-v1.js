// ⚠️ ZAŠTIĆEN SUSTAV — dio 5-slojnog mail sustava (vidi
// docs/qa/ACCESS-LIMITATIONS-AND-VERIFICATION-LEVELS.md sekcija 9).
// Ovaj adapter presreće SVE /api/mail-sync/* pozive (health, folders,
// messages) PRIJE nego stignu do mail-sync-center-v1.js -- otkriveno
// 27.7.2026. nakon duge istrage. Za "folder=sent/inbox" interno
// proxira na manual-mail-service-v1.js (stvaran izvor podataka).
import {handleManualMailService,VERSION as MANUAL_MAIL_VERSION} from './manual-mail-service-v1.js';

export const VERSION='GNK_ASG_MAIL_STUDIO_ADAPTER_V1_20260706';

const DRAFT_PREFIX='mail:studio:draft:v1:';
const DRAFT_LIMIT=80;
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;

function json(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-mail-studio-adapter':VERSION,
    'x-gnk-asg-manual-mail-service':MANUAL_MAIL_VERSION
  }});
}
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function endpoint(request,path,search=''){
  const url=new URL(request.url);
  url.pathname=path;
  url.search=search;
  return url.toString();
}
async function manualResponse(request,env,path,{method='GET',body=null,search=''}={}){
  const headers=new Headers(request.headers);
  headers.set('accept','application/json');
  if(body!==null)headers.set('content-type','application/json');
  return handleManualMailService(new Request(endpoint(request,path,search),{method,headers,body}),env);
}
async function manualJson(request,env,path,options={}){
  const response=await manualResponse(request,env,path,options);
  if(!response)return{ok:false,items:[],error:'manual_mail_route_missing'};
  try{return await response.clone().json();}catch{return{ok:false,items:[],error:'manual_mail_invalid_json',status:response.status};}
}
function normalizeAddressList(value){
  if(Array.isArray(value))return value.map(item=>typeof item==='string'?{email:item,name:''}:{email:clean(item?.email||item?.address||''),name:clean(item?.name||'')}).filter(item=>item.email);
  return String(value||'').split(/[;,]+/).map(item=>clean(item)).filter(Boolean).map(email=>({email,name:''}));
}
function preview(row){
  const bits=[];
  if(row.error_message)bits.push(row.error_message);
  if(row.provider?.length)bits.push(`${row.provider.filter(item=>item.status==='SENT').length}/${row.provider.length} delivered`);
  if(row.attachment_count)bits.push(`${row.attachment_count} PDF attachment(s)`);
  return bits.join(' · ')||'Manual mail audit record.';
}
function mapManual(row,folder){
  return{
    id:row.id,
    folder,
    direction:'OUTBOUND',
    profileId:row.profile_id||row.profileId||'',
    fromEmail:row.from_email||row.from||'',
    fromName:row.profile_id||row.profileId||'GNK ASG',
    to:normalizeAddressList(row.to),
    cc:normalizeAddressList(row.cc),
    bcc:normalizeAddressList(row.bcc),
    subject:row.subject||'(no subject)',
    status:row.status||'READY',
    textPreview:preview(row),
    textBody:preview(row),
    createdAt:row.created_at||row.createdAt||'',
    sentAt:row.sent_at||row.sentAt||'',
    attachmentCount:Number(row.attachment_count||row.attachmentCount||0),
    attachmentBytes:Number(row.attachment_bytes||row.attachmentBytes||0),
    provider:row.provider||[]
  };
}
async function manualItems(request,env,folder){
  const path=folder==='outbox'?'/api/mail-center/outbox':folder==='inbox'?'/api/mail-center/inbox':'/api/mail-center/sent';
  const payload=await manualJson(request,env,path);
  const items=(payload.items||[]).map(row=>mapManual(row,folder));
  return{payload,items};
}
async function listDrafts(env,limit=DRAFT_LIMIT){
  const kv=kvOf(env);
  if(!kv?.list)return{ok:false,items:[],total:0,error:'draft_store_not_configured'};
  const listed=await kv.list({prefix:DRAFT_PREFIX,limit:Math.min(Number(limit)||DRAFT_LIMIT,DRAFT_LIMIT)});
  const items=[];
  for(const key of listed.keys||[]){
    const raw=await kv.get(key.name);
    if(!raw)continue;
    try{items.push(JSON.parse(raw));}catch{}
  }
  items.sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  return{ok:true,items,total:items.length};
}
async function readDraft(env,id){
  const kv=kvOf(env);
  if(!kv?.get||!id)return null;
  const raw=await kv.get(DRAFT_PREFIX+id);
  if(!raw)return null;
  try{return JSON.parse(raw);}catch{return null;}
}
async function saveDraft(env,body){
  const kv=kvOf(env);
  if(!kv?.put)return json({ok:false,error:'draft_store_not_configured',message:'Worker draft storage is not configured; local browser draft remains the fallback.'},503);
  const id=clean(body.id)||crypto.randomUUID();
  const draft={
    id,
    folder:'drafts',
    direction:'DRAFT',
    profileId:clean(body.profileId||body.profile||body.signatureProfile||'office'),
    fromEmail:clean(body.from?.email||body.from||''),
    fromName:clean(body.fromName||body.from?.name||''),
    to:normalizeAddressList(body.to),
    cc:normalizeAddressList(body.cc),
    bcc:normalizeAddressList(body.bcc),
    subject:clean(body.subject)||'(no subject)',
    textPreview:clean(body.textBody||body.text||body.plainText||'').slice(0,600),
    textBody:clean(body.textBody||body.text||body.plainText||''),
    htmlBody:String(body.htmlBody||body.html||body.bodyHtml||body.body||''),
    attachments:Array.isArray(body.attachments)?body.attachments.map(item=>({filename:clean(item.filename||item.name||'document.pdf'),type:clean(item.type||'application/pdf'),sizeBytes:Number(item.sizeBytes||item.size||0)})):[],
    status:'DRAFT',
    createdAt:clean(body.createdAt)||now(),
    updatedAt:now()
  };
  await kv.put(DRAFT_PREFIX+id,JSON.stringify(draft),{expirationTtl:60*60*24*45});
  return json({ok:true,draft,folders:await folderCounts(env,null)});
}
async function folderCounts(env,request){
  let sent=0,outbox=0,inbox=0;
  if(request){
    sent=(await manualItems(request,env,'sent')).items.length;
    outbox=(await manualItems(request,env,'outbox')).items.length;
    inbox=(await manualItems(request,env,'inbox')).items.length;
  }
  const drafts=(await listDrafts(env,20)).items.length;
  return{inbox,sent,outbox,drafts,starred:0,archive:0,spam:0,trash:0};
}
async function messages(request,env){
  const url=new URL(request.url);
  const folder=clean(url.searchParams.get('folder')||'inbox').toLowerCase();
  if(folder==='drafts'){
    const drafts=await listDrafts(env,Number(url.searchParams.get('limit')||DRAFT_LIMIT));
    return json({ok:drafts.ok,version:VERSION,folder,total:drafts.total,items:drafts.items,folders:await folderCounts(env,request),warning:drafts.error||undefined},drafts.ok?200:503);
  }
  if(!['sent','outbox','inbox'].includes(folder))return json({ok:true,version:VERSION,folder,total:0,items:[],folders:await folderCounts(env,request),message:'Folder is review-safe and not connected to an external mailbox.'});
  const {payload,items}=await manualItems(request,env,folder);
  return json({ok:true,version:VERSION,folder,total:items.length,items,folders:await folderCounts(env,request),inboundConnected:folder==='inbox'?Boolean(payload.inboundConnected):undefined,message:payload.message});
}
async function messageDetail(request,env){
  const id=clean(new URL(request.url).searchParams.get('id'));
  if(!id)return json({ok:false,error:'missing_message_id'},400);
  for(const folder of ['sent','outbox','inbox']){
    const {items}=await manualItems(request,env,folder);
    const found=items.find(item=>item.id===id);
    if(found)return json({ok:true,version:VERSION,message:found,attachments:[],thread:[found]});
  }
  const draft=await readDraft(env,id);
  if(draft)return json({ok:true,version:VERSION,message:draft,draft,attachments:draft.attachments||[],thread:[draft]});
  return json({ok:false,error:'message_not_found'},404);
}
async function handleStudioSend(request,env){
  let payload={};
  try{payload=await request.clone().json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const response=await manualResponse(request,env,'/api/admin-mail-send',{method:'POST',body:JSON.stringify(payload)});
  if(!response)return json({ok:false,error:'manual_mail_service_unavailable'},503);
  let data={};
  try{data=await response.clone().json();}catch{data={raw:await response.text()};}
  return json({...data,adapterVersion:VERSION,manualMailVersion:MANUAL_MAIL_VERSION,endpoint:'/api/studio-message/send',routedTo:'/api/admin-mail-send'},response.status);
}

export async function handleMailStudioAdapter(request,env){
  const path=pathOf(request);
  if(path==='/api/admin-mail-send'||path.startsWith('/api/mail-center/'))return handleManualMailService(request,env);
  if(path==='/api/studio-message/send'&&request.method==='POST')return handleStudioSend(request,env);
  if(path==='/api/mail-sync/health'&&request.method==='GET')return json({ok:true,version:VERSION,manualMailVersion:MANUAL_MAIL_VERSION,readiness:await manualJson(request,env,'/api/mail-center/send-readiness'),folders:await folderCounts(env,request),inboxConnected:false,bulkMailLocked:true});
  if(path==='/api/mail-sync/folders'&&request.method==='GET')return json({ok:true,version:VERSION,folders:await folderCounts(env,request),inboxConnected:false});
  if(path==='/api/mail-sync/messages'&&request.method==='GET')return messages(request,env);
  if(path==='/api/mail-sync/message'&&request.method==='GET')return messageDetail(request,env);
  if(path==='/api/mail-sync/drafts'&&request.method==='GET'){
    const id=clean(new URL(request.url).searchParams.get('id'));
    if(id){const draft=await readDraft(env,id);return draft?json({ok:true,draft,folders:await folderCounts(env,request)}):json({ok:false,error:'draft_not_found'},404);}
    const drafts=await listDrafts(env,DRAFT_LIMIT);
    return json({ok:drafts.ok,version:VERSION,total:drafts.total,items:drafts.items,folders:await folderCounts(env,request),warning:drafts.error||undefined},drafts.ok?200:503);
  }
  if(path==='/api/mail-sync/drafts'&&request.method==='POST'){
    let body={};
    try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
    return saveDraft(env,body);
  }
  if(path==='/api/mail-sync/state'&&request.method==='POST'){
    let body={};
    try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
    return json({ok:true,version:VERSION,id:clean(body.id),action:clean(body.action),persisted:false,message:'Review-safe state action acknowledged; no external mailbox state was changed.',folders:await folderCounts(env,request)});
  }
  return null;
}
