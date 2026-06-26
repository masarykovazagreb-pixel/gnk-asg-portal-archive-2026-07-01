import {handleMediaDelivery as handleV3,processDeliveryQueue as processV3,VERSION as CORE_VERSION,SEND_API} from './media-outreach-delivery-v3.js';
import {ensureMediaControlRows,VERSION as CONTROL_SYNC_VERSION} from './media-command-control-sync-v3.js';

export const VERSION='GNK_ASG_MEDIA_OUTREACH_DELIVERY_V4_20260626_CONTROL_SYNC';
export{SEND_API};
const API='/api/media-command-center';
const SYNC_PATHS=new Set([
  `${API}/delivery-plan`,
  `${API}/delivery-status`,
  `${API}/queue-approved`,
  `${API}/dispatch-queue`
]);

function stamp(response,sync=null){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-media-delivery',VERSION);
  headers.set('x-gnk-asg-media-delivery-core',CORE_VERSION);
  headers.set('x-gnk-asg-media-control-sync',CONTROL_SYNC_VERSION);
  if(sync)headers.set('x-gnk-asg-media-control-sync-count',String(sync.processed||0));
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export async function handleMediaDelivery(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
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
