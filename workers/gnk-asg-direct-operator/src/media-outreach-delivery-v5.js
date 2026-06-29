import {handleMediaDelivery as handleV3,processDeliveryQueue as processV3,VERSION as CORE_VERSION,SEND_API} from './media-outreach-delivery-v3.js';
import {ensureMediaControlRows,VERSION as CONTROL_SYNC_VERSION} from './media-command-control-sync-v3.js';
import {validateFinalCampaignPdf,VERSION as PDF_SAFETY_VERSION} from './media-registration-safety-v2.js';

export const VERSION='GNK_ASG_MEDIA_OUTREACH_DELIVERY_V6_20260629_FINAL_PDF_GATE';
export{SEND_API};
const API='/api/media-command-center';
export const INTERNAL_TEST_PATH=`${API}/internal-test-email`;
const SYNC_PATHS=new Set([
  `${API}/delivery-plan`,
  `${API}/delivery-status`,
  `${API}/queue-approved`,
  `${API}/dispatch-queue`
]);
const LIVE_SEND_PATHS=new Set([`${API}/queue-approved`,`${API}/dispatch-queue`]);
const STATUS_PATHS=new Set([`${API}/delivery-plan`,`${API}/delivery-status`]);

function stamp(response,sync=null){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-media-delivery',VERSION);
  headers.set('x-gnk-asg-media-delivery-core',CORE_VERSION);
  headers.set('x-gnk-asg-media-control-sync',CONTROL_SYNC_VERSION);
  headers.set('x-gnk-asg-final-pdf-safety',PDF_SAFETY_VERSION);
  if(sync)headers.set('x-gnk-asg-media-control-sync-count',String(sync.processed||0));
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-media-delivery':VERSION,'x-gnk-asg-media-delivery-core':CORE_VERSION,'x-gnk-asg-final-pdf-safety':PDF_SAFETY_VERSION}});}

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

async function attachSafety(response,safety){
  if(!response)return response;
  try{
    const payload=await response.clone().json();
    const headers=new Headers(response.headers);headers.delete('content-length');headers.set('x-gnk-asg-final-pdf-safety',PDF_SAFETY_VERSION);
    return new Response(JSON.stringify({...payload,finalPdfSafety:{ok:safety.ok,issues:safety.issues,key:safety.key||'',filename:safety.filename||'',sizeBytes:safety.sizeBytes||0,sha256:safety.actualSha256||'',version:PDF_SAFETY_VERSION}},null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export async function handleMediaDelivery(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===INTERNAL_TEST_PATH)return handleInternalTest(request,env);
  let sync=null;
  if(SYNC_PATHS.has(path))sync=await ensureMediaControlRows(env);
  if(LIVE_SEND_PATHS.has(path)){
    const safety=await validateFinalCampaignPdf(env);
    if(!safety.ok)return json({ok:false,error:'final_campaign_pdf_not_approved',message:'Produkcijsko slanje je zaključano dok završni generički PDF bez testnih kodova i placeholdera nije izričito odobren.',issues:safety.issues,pdf:{key:safety.key||'',filename:safety.filename||'',sizeBytes:safety.sizeBytes||0,sha256:safety.actualSha256||''},safetyVersion:PDF_SAFETY_VERSION},423);
  }
  let response=await handleV3(request,env);
  if(STATUS_PATHS.has(path))response=await attachSafety(response,await validateFinalCampaignPdf(env));
  return response?stamp(response,sync):null;
}

export async function processDeliveryQueue(env){
  const sync=await ensureMediaControlRows(env);
  const safety=await validateFinalCampaignPdf(env);
  if(!safety.ok)return{ok:false,skipped:'final_campaign_pdf_not_approved',issues:safety.issues,deliveryVersion:VERSION,deliveryCore:CORE_VERSION,pdfSafetyVersion:PDF_SAFETY_VERSION,controlSync:{version:CONTROL_SYNC_VERSION,processed:sync.processed,created:sync.created,updated:sync.updated}};
  const result=await processV3(env);
  return{...result,deliveryVersion:VERSION,deliveryCore:CORE_VERSION,pdfSafetyVersion:PDF_SAFETY_VERSION,finalPdfSafety:{ok:true,sha256:safety.actualSha256,templateMode:'GENERIC_NO_PLACEHOLDER'},controlSync:{version:CONTROL_SYNC_VERSION,processed:sync.processed,created:sync.created,updated:sync.updated}};
}
