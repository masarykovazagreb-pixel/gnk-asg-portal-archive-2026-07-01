import {handleMediaDelivery as handleV3,processDeliveryQueue as processV3,VERSION as CORE_VERSION,SEND_API} from './media-outreach-delivery-html-v1.js';
import {ensureMediaControlRows,VERSION as CONTROL_SYNC_VERSION} from './media-command-control-sync-v3.js';

export const VERSION='GNK_ASG_MEDIA_OUTREACH_DELIVERY_V7_20260630_FULL_HISTORY';
export{SEND_API};
const API='/api/media-command-center';
export const INTERNAL_TEST_PATH=`${API}/internal-test-email`;
const HISTORY_PATH=`${API}/delivery-history`;
const HISTORY_CSV_PATH=`${API}/delivery-history.csv`;
const ALLOWED_STATUSES=new Set(['SENT','QUEUED','SENDING','RETRY','FAILED','REVIEW']);
const SYNC_PATHS=new Set([
  `${API}/delivery-plan`,
  `${API}/delivery-status`,
  `${API}/queue-approved`,
  `${API}/dispatch-queue`
]);

const clean=value=>String(value??'').trim();
const clamp=(value,min,max,fallback)=>{const number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,Math.trunc(number))):fallback;};
const dbOf=env=>env.GNK_ASG_D1||null;

function stamp(response,sync=null){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-media-delivery',VERSION);
  headers.set('x-gnk-asg-media-delivery-core',CORE_VERSION);
  headers.set('x-gnk-asg-media-control-sync',CONTROL_SYNC_VERSION);
  if(sync)headers.set('x-gnk-asg-media-control-sync-count',String(sync.processed||0));
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

function json(data,status=200){
  return new Response(JSON.stringify(data,null,2),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0'
  }});
}

function secureEqual(a,b){
  const left=new TextEncoder().encode(String(a||'')),right=new TextEncoder().encode(String(b||''));
  let mismatch=left.length^right.length;
  const length=Math.max(left.length,right.length);
  for(let i=0;i<length;i++)mismatch|=(left[i%Math.max(left.length,1)]||0)^(right[i%Math.max(right.length,1)]||0);
  return mismatch===0&&left.length>31;
}

function internalTestEnv(env){
  return new Proxy(env,{
    get(target,property,receiver){
      if(String(property)==='MEDIA_OUTREACH_TEST_LIVE')return'true';
      return Reflect.get(target,property,receiver);
    }
  });
}

async function handleInternalTest(request,env){
  if(request.method!=='POST')return new Response('Not found',{status:404});
  const supplied=request.headers.get('x-gnk-test-nonce')||'';
  const configured=env.MEDIA_OUTREACH_TEST_NONCE||'';
  if(!secureEqual(supplied,configured))return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const url=new URL(request.url);
  url.pathname=`${API}/test-email`;
  const forwarded=new Request(url.toString(),request);
  const response=await handleV3(forwarded,internalTestEnv(env));
  return response?stamp(response):new Response('Not found',{status:404});
}

function historyFilters(request,{csv=false}={}){
  const url=new URL(request.url);
  const rawStatus=clean(url.searchParams.get('status')).toUpperCase();
  const status=ALLOWED_STATUSES.has(rawStatus)?rawStatus:'';
  const search=clean(url.searchParams.get('search')).slice(0,120);
  const limit=csv?2000:clamp(url.searchParams.get('limit'),1,1000,500);
  const offset=csv?0:clamp(url.searchParams.get('offset'),0,100000,0);
  return{status,search,limit,offset};
}

function historyWhere(filters){
  const clauses=[],binds=[];
  if(filters.status){clauses.push('q.status=?');binds.push(filters.status);}
  if(filters.search){
    const term=`%${filters.search}%`;
    clauses.push(`(q.mail_code LIKE ? OR q.outlet LIKE ? OR q.email LIKE ? OR q.subject LIKE ? OR q.provider_message_id LIKE ? OR c.recipient_name LIKE ?)`);
    binds.push(term,term,term,term,term,term);
  }
  return{sql:clauses.length?`WHERE ${clauses.join(' AND ')}`:'',binds};
}

async function deliveryHistoryData(request,env,{csv=false}={}){
  const db=dbOf(env);
  if(!db?.prepare)throw Object.assign(new Error('GNK_ASG_D1 binding is not configured'),{code:'D1_BINDING_MISSING'});
  const filters=historyFilters(request,{csv}),where=historyWhere(filters);
  const baseFrom=`FROM media_delivery_queue q LEFT JOIN media_outreach_contacts c ON c.mail_code=q.mail_code`;
  const countQuery=db.prepare(`SELECT COUNT(*) AS count ${baseFrom} ${where.sql}`);
  const rowsQuery=db.prepare(`SELECT q.mail_code,q.outlet,q.email,q.subject,q.status,q.attempts,q.provider_message_id,q.last_error_code,q.last_error,q.queued_at,q.updated_at,q.sent_at,c.priority,c.country,c.recipient_name ${baseFrom} ${where.sql} ORDER BY COALESCE(q.sent_at,q.updated_at,q.queued_at) DESC LIMIT ? OFFSET ?`);
  const countBound=where.binds.length?countQuery.bind(...where.binds):countQuery;
  const rowsBound=rowsQuery.bind(...where.binds,filters.limit,filters.offset);
  const [countResult,rowsResult,summaryResult]=await Promise.all([
    countBound.first(),
    rowsBound.all(),
    db.prepare(`SELECT status,COUNT(*) AS count FROM media_delivery_queue GROUP BY status`).all()
  ]);
  const items=(rowsResult.results||[]).map(row=>({
    mailCode:clean(row.mail_code),
    priority:clean(row.priority),
    country:clean(row.country),
    outlet:clean(row.outlet),
    recipient:clean(row.recipient_name),
    email:clean(row.email),
    subject:clean(row.subject),
    status:clean(row.status),
    attempts:Number(row.attempts||0),
    providerMessageId:clean(row.provider_message_id),
    lastErrorCode:clean(row.last_error_code),
    lastError:clean(row.last_error),
    queuedAt:clean(row.queued_at),
    updatedAt:clean(row.updated_at),
    sentAt:clean(row.sent_at)
  }));
  return{
    ok:true,
    version:VERSION,
    readOnly:true,
    generatedAt:new Date().toISOString(),
    filters:{status:filters.status||'ALL',search:filters.search,limit:filters.limit,offset:filters.offset},
    total:Number(countResult?.count||0),
    summary:Object.fromEntries((summaryResult.results||[]).map(row=>[clean(row.status),Number(row.count||0)])),
    items
  };
}

function csvEscape(value){
  const text=String(value??'');
  return/[",\r\n;]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
}

async function handleDeliveryHistory(request,env){
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  try{return json(await deliveryHistoryData(request,env));}
  catch(error){return json({ok:false,error:clean(error?.code)||'DELIVERY_HISTORY_FAILED',message:String(error?.message||error).slice(0,500)},503);}
}

async function handleDeliveryHistoryCsv(request,env){
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  try{
    const data=await deliveryHistoryData(request,env,{csv:true});
    const headers=['Mail code','Priority','Country','Outlet','Recipient','Email','Subject','Status','Attempts','Provider message ID','Error code','Error','Queued at','Updated at','Sent at'];
    const rows=data.items.map(item=>[
      item.mailCode,item.priority,item.country,item.outlet,item.recipient,item.email,item.subject,item.status,item.attempts,item.providerMessageId,item.lastErrorCode,item.lastError,item.queuedAt,item.updatedAt,item.sentAt
    ]);
    const csv='\ufeff'+[headers,...rows].map(row=>row.map(csvEscape).join(';')).join('\r\n');
    const date=new Date().toISOString().slice(0,10);
    return new Response(csv,{status:200,headers:{
      'content-type':'text/csv; charset=utf-8',
      'content-disposition':`attachment; filename="GNK-ASG-media-delivery-history-${date}.csv"`,
      'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
      'x-content-type-options':'nosniff'
    }});
  }catch(error){return json({ok:false,error:clean(error?.code)||'DELIVERY_HISTORY_CSV_FAILED',message:String(error?.message||error).slice(0,500)},503);}
}

export async function handleMediaDelivery(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===INTERNAL_TEST_PATH)return handleInternalTest(request,env);
  if(path===HISTORY_PATH)return stamp(await handleDeliveryHistory(request,env));
  if(path===HISTORY_CSV_PATH)return stamp(await handleDeliveryHistoryCsv(request,env));
  let sync=null;
  if(SYNC_PATHS.has(path))sync=await ensureMediaControlRows(env);
  const response=await handleV3(request,env);
  return response?stamp(response,sync):null;
}

export async function processDeliveryQueue(env){
  const sync=await ensureMediaControlRows(env);
  const result=await processV3(env);
  return{...result,deliveryVersion:VERSION,deliveryCore:CORE_VERSION,controlSync:{version:CONTROL_SYNC_VERSION,processed:sync.processed,created:sync.created,updated:sync.updated}};
}
