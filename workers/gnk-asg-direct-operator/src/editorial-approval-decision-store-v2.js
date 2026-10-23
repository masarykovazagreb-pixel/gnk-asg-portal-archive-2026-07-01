/**
 * Protected, server-persisted Infocentar decision ledger.
 * The session gate lives in index-unified-auth-v21.js and MUST execute before this handler.
 * This module records human operator decisions only. No outbound mail or public publication.
 */
export const VERSION='GNK_ASG_INFOCENTAR_DECISIONS_V2_20261022';
export const GET_PATH='/api/editorial-approval/decisions';
export const POST_PATH='/api/editorial-approval/decision';
const PREFIX='gnk-asg:editorial-approval:decision:v2:';
const SCHEMA='gnk-asg-source-gated-editorial-queue/v1';
const ALLOWED=new Set(['pending','approved','revision','rejected']);
const val=x=>String(x??'').trim();
const json=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0',
 'pragma':'no-cache','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow',
 'x-gnk-infocentar-decision-store':VERSION}
});
const validId=id=>/^[A-Za-z0-9_-]{3,110}$/.test(id);
const repoKV=env=>env?.GNK_ASG_CONFIG_KV||env?.GNK_ASG_KV||env?.EDITORIAL_KV||null;
async function readAsset(env,pathname){
 if(!env.ASSETS?.fetch)throw Error('portal_assets_binding_unavailable');
 const result=await env.ASSETS.fetch(new Request('https://assets.local'+pathname,{
  method:'GET',headers:{accept:'application/json'},redirect:'manual'
 }));
 if(result.status!==200)throw Error('editorial_queue_asset_unavailable');
 const data=await result.json();
 if(!data||typeof data!=='object')throw Error('invalid_queue_asset');
 return data;
}
async function queueItems(env){
 const queue=await readAsset(env,'/data/editorial-approval-queue.json');
 if(!Array.isArray(queue.items))throw Error('invalid_editorial_queue_items');
 const items=[...queue.items];
 const ids=new Set(items.map(x=>x.id));
 // Adapt source-gated review queues with the same user-facing mapping as
 // /assets/editorial-source-queue-v1.js. Never accept arbitrary client-supplied IDs.
 const manifest=await readAsset(env,'/data/editorial-plan/manifest.json');
 for(const entry of manifest.reviewQueues||[]){
  if(entry.schema!==SCHEMA||entry.publicationMode!=='review-only'
      ||!/^[a-zA-Z0-9-]+\.json$/.test(entry.file))throw Error('invalid_source_queue_manifest');
  const source=await readAsset(env,'/data/editorial-plan/'+entry.file);
  if(source.schema!==SCHEMA||!Array.isArray(source.items))throw Error('invalid_source_queue_file');
  for(const item of source.items){
   if(!validId(item.id)||ids.has(item.id)||!source.allowed_statuses?.includes(item.status))throw Error('invalid_or_duplicate_queue_item');
   ids.add(item.id);
   items.push({...item,sourceQueue:entry.file,queueStatus:item.status,sourceGate:item.source_gate||{},
    title:item.title||item.working_topic,topic:`${item.date} · ${item.slot}`,summary:item.summary||`Planirana jedinica · ${item.status}`,
    body:Array.isArray(item.paragraphs)?item.paragraphs:[],internalLinks:Array.isArray(item.links)?item.links:[],
    metaDescription:item.description||'',keywords:Array.isArray(item.keywords)?item.keywords:[]});
  }
 }
 return items;
}
async function hashItem(item){
 const data=new TextEncoder().encode(JSON.stringify(item));
 const raw=await crypto.subtle.digest('SHA-256',data);
 return Array.from(new Uint8Array(raw),x=>x.toString(16).padStart(2,'0')).join('');
}
function checkSourceItem(item){
 if(!item.sourceQueue)return [];
 const errors=[],g=item.sourceGate||{},s=x=>typeof x==='string'&&x.trim().length>0;
 const https=x=>{try{const u=new URL(val(x));return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
 if(!['draft','source-review','approved-for-own-site'].includes(item.queueStatus))errors.push('queue_not_reviewable');
 for(const k of ['title','seoTitle','metaDescription','summary','slug'])if(!s(item[k]))errors.push('missing_'+k);
 if(!Array.isArray(item.body)||!item.body.length||item.body.some(x=>!s(x)))errors.push('missing_original_body');
 if(!s(item.image)||!item.image.startsWith('/')||item.image.startsWith('//'))errors.push('missing_owned_image');
 for(const k of ['source_url','original_link'])if(!https(g[k]))errors.push('invalid_'+k);
 for(const k of ['publisher','source_title','source_date','attribution','verified_by','verified_at'])if(!s(g[k]))errors.push('missing_'+k);
 if(!Array.isArray(g.verified_facts)||!g.verified_facts.length||!g.verified_facts.every(s))errors.push('unverified_source_facts');
 return errors;
}
// Only a server-verified delivery receipt can start the low-risk internal timer.
// A browser/ledger boolean or a notification timestamp is not delivery evidence.
// This function NEVER authorizes public editorial publication or deployment.
const verifiedIsoTime=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(x)?Date.parse(x):Number.NaN;
export function eligibleAfter30Minutes({
 risk,actionKind,notifiedAt,deliveryEvidence,contentSha256,currentHash,rejectedAt,changedAt
},now=new Date(),{trustedReceipt=null}={}){
 if(risk!=='low'||actionKind!=='internal-operation')return {eligible:false,reason:'requires_affirmative_authorization'};
 const hashOk=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
 if(!hashOk(contentSha256)||contentSha256!==currentHash)return {eligible:false,reason:'verified_delivery_and_unchanged_content_required'};
 const evidence=deliveryEvidence||{},trusted=trustedReceipt||{};
 if(evidence.status!=='delivered'||evidence.verified!==true||!val(evidence.receiptId)
   ||evidence.contentSha256!==currentHash||trusted.status!=='delivered'||trusted.verified!==true
   ||trusted.receiptId!==evidence.receiptId||trusted.contentSha256!==contentSha256
   ||trusted.deliveredAt!==evidence.deliveredAt||trusted.verifiedAt!==evidence.verifiedAt){
  return {eligible:false,reason:'trusted_delivery_receipt_required'};
 }
 const notified=verifiedIsoTime(notifiedAt),delivered=verifiedIsoTime(evidence.deliveredAt);
 const verified=verifiedIsoTime(evidence.verifiedAt),current=now instanceof Date?now.getTime():Number.NaN;
 if(!Number.isFinite(notified)||!Number.isFinite(delivered)||!Number.isFinite(verified)
   ||!Number.isFinite(current)||notified>delivered||delivered>verified||verified>current){
  return {eligible:false,reason:'invalid_delivery_time'};
 }
 if(rejectedAt)return {eligible:false,reason:'rejected'};
 if(changedAt){
  const changed=verifiedIsoTime(changedAt);
  if(!Number.isFinite(changed)||changed>notified)return {eligible:false,reason:'changed_after_notification'};
 }
 const due=delivered+30*60*1000;
 return current<due?{eligible:false,reason:'review_window_open',deadline:new Date(due).toISOString()}
  :{eligible:true,reason:'low_risk_internal_no_objection',deadline:new Date(due).toISOString()};
}
function csrfOk(request){
 const requestUrl=new URL(request.url),origin=val(request.headers.get('origin'));
 const site=val(request.headers.get('sec-fetch-site')).toLowerCase();
 return Boolean(origin&&origin===requestUrl.origin)&&(!site||['same-origin','none'].includes(site))
   &&request.headers.get('x-gnk-editorial-decision')==='executive-review';
}
function storeReady(kv){return kv&&typeof kv.get==='function'&&typeof kv.put==='function'&&typeof kv.list==='function'}
async function readRecord(kv,id){
 const raw=await kv.get(PREFIX+id);
 if(!raw)return null;
 try{return JSON.parse(raw)}catch{throw Error('decision_store_invalid_json')}
}
export async function handleInfocentarDecisions(request,env){
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
 if(path!==GET_PATH&&path!==POST_PATH)return null;
 if((path===GET_PATH&&request.method!=='GET')||(path===POST_PATH&&request.method!=='POST'))return json({ok:false,error:'method_not_allowed'},405);
 const kv=repoKV(env);
 if(!storeReady(kv))return json({ok:false,error:'decision_store_unavailable_no_browser_fallback'},503);
 try{
  const items=await queueItems(env),byId=new Map(items.map(x=>[x.id,x]));
  if(path===GET_PATH){
   const list=await kv.list({prefix:PREFIX,limit:500});
   if(list.list_complete===false)return json({ok:false,error:'decision_ledger_pagination_required'},503);
   const decisions={};
   for(const key of list.keys||[]){
    const id=key.name.slice(PREFIX.length);
    if(!byId.has(id))continue;
    const record=await readRecord(kv,id);
    if(!record)continue;
    const hash=await hashItem(byId.get(id));
    decisions[id]={...record,status:record.status==='rejected'||record.status==='revision'?
      record.status:hash===record.sourceHash?record.status:'pending',
      stale:hash!==record.sourceHash};
   }
   return json({ok:true,decisions,items:items.length,storage:'server-kv',
    publicationAuthorized:false,automaticRelease:false,
    reviewMinutes:30,timerStartsOnlyAfterVerifiedDelivery:true,
    deliveryReceiptKnown:false,version:VERSION});
  }
  if(!csrfOk(request))return json({ok:false,error:'csrf_rejected'},403);
  if(Number(request.headers.get('content-length')||0)>5000)return json({ok:false,error:'request_too_large'},413);
  const data=await request.json().catch(()=>null);
  const id=val(data?.id),status=val(data?.status),comment=val(data?.comment).slice(0,2000);
  if(!validId(id)||!ALLOWED.has(status)||!byId.has(id))return json({ok:false,error:'invalid_item_or_status'},400);
  const item=byId.get(id);
  if(status==='approved'){
   const blockers=checkSourceItem(item);
   if(blockers.length)return json({ok:false,error:'source_review_incomplete',blockers},409);
  }
  const current=await readRecord(kv,id);
  if(current?.status==='rejected'&&status!=='rejected')return json({ok:false,error:'rejection_is_sticky_requires_separate_explicit_restore'},409);
  const sourceHash=await hashItem(item);
  const record={id,status,sourceHash,comment,decidedAt:new Date().toISOString(),
   decidedBy:'authenticated-operator-session',reviewScope:'record-only-no-publication',
   publicationAuthorized:false,autoApproved:false,version:VERSION};
  await kv.put(PREFIX+id,JSON.stringify(record),{expirationTtl:60*60*24*365});
  return json({ok:true,decision:record,publicationAuthorized:false,version:VERSION});
 }catch(error){
  return json({ok:false,error:'infocentar_operation_failed',detail:val(error?.message||error).slice(0,160)},503);
 }
}
