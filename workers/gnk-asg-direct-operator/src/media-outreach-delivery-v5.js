import {handleMediaDelivery as handleV3,processDeliveryQueue as processV3,VERSION as CORE_VERSION,SEND_API} from './media-outreach-delivery-v3.js';
import {ensureMediaControlRows,VERSION as CONTROL_SYNC_VERSION} from './media-command-control-sync-v3.js';
import {processAccessDeliveryQueue,VERSION as ACCESS_DISPATCH_VERSION} from './media-outreach-access-dispatch-v1.js';

export const VERSION='GNK_ASG_MEDIA_OUTREACH_DELIVERY_V7_RELEASE_GATE_ACCESS_CODES_20260628';
export{SEND_API};
const API='/api/media-command-center';
export const INTERNAL_TEST_PATH=`${API}/internal-test-email`;
const DISPATCH_PATH=`${API}/dispatch-queue`;
const STATUS_PATH=`${API}/delivery-status`;
const PLAN_PATH=`${API}/delivery-plan`;
const SYNC_PATHS=new Set([PLAN_PATH,STATUS_PATH,`${API}/queue-approved`,DISPATCH_PATH]);
const clean=value=>String(value??'').trim();
const boolEnv=value=>/^(1|true|yes|on)$/i.test(clean(value));

function releaseState(env){
  const live=boolEnv(env.MEDIA_OUTREACH_LIVE),approved=boolEnv(env.MEDIA_OUTREACH_RELEASE_APPROVED);
  return{live,approved,ready:live&&approved,mode:live&&approved?'PRODUCTION_RELEASED':live?'LIVE_WITHOUT_RELEASE_APPROVAL':'PRODUCTION_LOCKED',requiredEnv:['MEDIA_OUTREACH_LIVE=true','MEDIA_OUTREACH_RELEASE_APPROVED=true']};
}
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
async function patchDeliveryJson(response,path,env,sync){
  if(![STATUS_PATH,PLAN_PATH].includes(path)||!response?.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json(),release=releaseState(env),headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.set('content-type','application/json; charset=utf-8');headers.set('cache-control','no-store');
    return new Response(JSON.stringify({...payload,live:release.live,releaseApproved:release.approved,releaseGate:release,accessDispatch:ACCESS_DISPATCH_VERSION,deliveryVersion:VERSION,controlSync:{version:CONTROL_SYNC_VERSION,processed:sync?.processed||0,created:sync?.created||0,updated:sync?.updated||0}},null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}
function secureEqual(a,b){
  const left=new TextEncoder().encode(String(a||'')),right=new TextEncoder().encode(String(b||''));
  let mismatch=left.length^right.length;const length=Math.max(left.length,right.length);
  for(let i=0;i<length;i++)mismatch|=(left[i%Math.max(left.length,1)]||0)^(right[i%Math.max(right.length,1)]||0);
  return mismatch===0&&left.length>31;
}
function internalTestEnv(env){return new Proxy(env,{get(target,property,receiver){if(String(property)==='MEDIA_OUTREACH_TEST_LIVE')return'true';return Reflect.get(target,property,receiver);}});}
async function handleInternalTest(request,env){
  if(request.method!=='POST')return new Response('Not found',{status:404});
  const supplied=request.headers.get('x-gnk-test-nonce')||'',configured=env.MEDIA_OUTREACH_TEST_NONCE||'';
  if(!secureEqual(supplied,configured))return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  const url=new URL(request.url);url.pathname=`${API}/test-email`;
  const response=await handleV3(new Request(url.toString(),request),internalTestEnv(env));
  return response?stamp(response):new Response('Not found',{status:404});
}
async function dispatchOne(request,env,sync){
  let body={};try{body=await request.json();}catch{}
  if(body.confirm!=='DISPATCH_ONE_QUEUED_EMAIL')return stamp(json({ok:false,error:'confirmation_required',required:'DISPATCH_ONE_QUEUED_EMAIL'},409),sync);
  const release=releaseState(env);
  if(!release.ready)return stamp(json({ok:false,error:'media_release_locked',releaseGate:release},423),sync);
  const result=await processAccessDeliveryQueue(env);
  return stamp(json({...result,releaseGate:release,deliveryVersion:VERSION,deliveryCore:CORE_VERSION,accessDispatch:ACCESS_DISPATCH_VERSION,controlSync:{version:CONTROL_SYNC_VERSION,processed:sync?.processed||0,created:sync?.created||0,updated:sync?.updated||0}},result.ok===false?409:200),sync);
}
export async function handleMediaDelivery(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===INTERNAL_TEST_PATH)return handleInternalTest(request,env);
  let sync=null;if(SYNC_PATHS.has(path))sync=await ensureMediaControlRows(env);
  if(path===DISPATCH_PATH&&request.method==='POST')return dispatchOne(request,env,sync);
  let response=await handleV3(request,env);
  response=await patchDeliveryJson(response,path,env,sync);
  return response?stamp(response,sync):null;
}
export async function processDeliveryQueue(env){
  const sync=await ensureMediaControlRows(env),release=releaseState(env);
  if(!release.ready)return{ok:true,skipped:'media_release_locked',releaseGate:release,deliveryVersion:VERSION,deliveryCore:CORE_VERSION,accessDispatch:ACCESS_DISPATCH_VERSION,controlSync:{version:CONTROL_SYNC_VERSION,processed:sync.processed,created:sync.created,updated:sync.updated}};
  const result=await processAccessDeliveryQueue(env);
  return{...result,releaseGate:release,deliveryVersion:VERSION,deliveryCore:CORE_VERSION,legacyCoreAvailable:Boolean(processV3),accessDispatch:ACCESS_DISPATCH_VERSION,controlSync:{version:CONTROL_SYNC_VERSION,processed:sync.processed,created:sync.created,updated:sync.updated}};
}
