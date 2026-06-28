import {handleMediaDelivery as handleV3,processDeliveryQueue as processV3,VERSION as CORE_VERSION,SEND_API} from './media-outreach-delivery-v3.js';
import {ensureMediaControlRows,VERSION as CONTROL_SYNC_VERSION} from './media-command-control-sync-v3.js';
import {processAccessDeliveryQueue,VERSION as ACCESS_DISPATCH_VERSION} from './media-outreach-access-dispatch-v1.js';

export const VERSION='GNK_ASG_MEDIA_OUTREACH_DELIVERY_V6_ACCESS_CODES_20260628';
export{SEND_API};
const API='/api/media-command-center';
export const INTERNAL_TEST_PATH=`${API}/internal-test-email`;
const DISPATCH_PATH=`${API}/dispatch-queue`;
const SYNC_PATHS=new Set([
  `${API}/delivery-plan`,
  `${API}/delivery-status`,
  `${API}/queue-approved`,
  DISPATCH_PATH
]);

function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-media-delivery':VERSION,'x-gnk-asg-media-access-dispatch':ACCESS_DISPATCH_VERSION}});}
function stamp(response,sync=null){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-media-delivery',VERSION);
  headers.set('x-gnk-asg-media-delivery-core',CORE_VERSION);
  headers.set('x-gnk-asg-media-control-sync',CONTROL_SYNC_VERSION);
  headers.set('x-gnk-asg-media-access-dispatch',ACCESS_DISPATCH_VERSION);
  if(sync)headers.set('x-gnk-asg-media-control-sync-count',String(sync.processed||0));
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

function secureEqual(a,b){
  const left=new TextEncoder().encode(String(a||'')),right=new TextEncoder().encode(String(b||''));
  let mismatch=left.length^right.length;
  const length=Math.max(left.length,right.length);
  for(let i=0;i<length;i++)mismatch|=(left[i%Math.max(left.length,1)]||0)^(right[i%Math.max(right.length,1)]||0);
  return mismatch===0&&left.length>31;
}

function internalTestEnv(env){
  return new Proxy(env,{get(target,property,receiver){if(String(property)==='MEDIA_OUTREACH_TEST_LIVE')return'true';return Reflect.get(target,property,receiver);}});
}

async function handleInternalTest(request,env){
  if(request.method!=='POST')return new Response('Not found',{status:404});
  const supplied=request.headers.get('x-gnk-test-nonce')||'';
  const configured=env.MEDIA_OUTREACH_TEST_NONCE||'';
  if(!secureEqual(supplied,configured))return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const url=new URL(request.url);url.pathname=`${API}/test-email`;
  const forwarded=new Request(url.toString(),request);
  const response=await handleV3(forwarded,internalTestEnv(env));
  return response?stamp(response):new Response('Not found',{status:404});
}

async function dispatchOne(request,env,sync){
  let body={};try{body=await request.json();}catch{}
  if(body.confirm!=='DISPATCH_ONE_QUEUED_EMAIL')return stamp(json({ok:false,error:'confirmation_required',required:'DISPATCH_ONE_QUEUED_EMAIL'},409),sync);
  const result=await processAccessDeliveryQueue(env);
  return stamp(json({...result,deliveryVersion:VERSION,deliveryCore:CORE_VERSION,accessDispatch:ACCESS_DISPATCH_VERSION,controlSync:{version:CONTROL_SYNC_VERSION,processed:sync?.processed||0,created:sync?.created||0,updated:sync?.updated||0}},result.ok===false?409:200),sync);
}

export async function handleMediaDelivery(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===INTERNAL_TEST_PATH)return handleInternalTest(request,env);
  let sync=null;if(SYNC_PATHS.has(path))sync=await ensureMediaControlRows(env);
  if(path===DISPATCH_PATH&&request.method==='POST')return dispatchOne(request,env,sync);
  const response=await handleV3(request,env);
  return response?stamp(response,sync):null;
}

export async function processDeliveryQueue(env){
  const sync=await ensureMediaControlRows(env);
  const result=await processAccessDeliveryQueue(env);
  return{...result,deliveryVersion:VERSION,deliveryCore:CORE_VERSION,legacyCoreAvailable:Boolean(processV3),accessDispatch:ACCESS_DISPATCH_VERSION,controlSync:{version:CONTROL_SYNC_VERSION,processed:sync.processed,created:sync.created,updated:sync.updated}};
}
