import app from './index-media-command-center-v20.js';
import {handleMediaCommandCenter as handleV2,VERSION as CONTROL_SYNC_VERSION} from './media-command-control-sync-v3.js';
import {handleMediaDelivery,processDeliveryQueue,VERSION as DELIVERY_VERSION} from './media-outreach-delivery-v3.js';
import {enrichContactItems,getReadinessSummary,VERSION as READINESS_VERSION} from './media-command-readiness-v2.js';

export const VERSION='GNK_ASG_MEDIA_COMMAND_CENTER_WRAPPER_V21_20260626_R5_CONTROL_SYNC';
const CONTROL_ENDPOINTS=new Set([
  '/api/media-command-center/handoff-manifest',
  '/api/media-command-center/import-preview',
  '/api/media-command-center/import-contacts',
  '/api/media-command-center/readiness-summary',
  '/api/media-command-center/contact-approval'
]);
const DELIVERY_ENDPOINTS=new Set([
  '/api/media-command-center/campaign-pdf',
  '/api/media-command-center/delivery-plan',
  '/api/media-command-center/delivery-status',
  '/api/media-command-center/test-email',
  '/api/media-command-center/queue-approved',
  '/api/media-command-center/dispatch-queue'
]);
const CONTACTS='/api/media-command-center/contacts';
const STATUS='/api/media-command-center/status';
const MEDIA_UI='/media-command-center';
const HANDOFF_CSS='<link rel="stylesheet" href="/assets/media-command-handoff-ui-v3.css?v=20260626-1">';
const HANDOFF_JS='<script src="/assets/media-command-handoff-ui-v3.js?v=20260626-1" defer></script>';
const DELIVERY_CSS='<link rel="stylesheet" href="/assets/media-outreach-delivery-ui-v3.css?v=20260626-1">';
const DELIVERY_JS='<script src="/assets/media-outreach-delivery-ui-v3.js?v=20260626-1" defer></script>';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const jsonResponse=(payload,response)=>new Response(JSON.stringify(payload,null,2),{status:response.status,headers:response.headers});

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-media-command-wrapper-v21',VERSION);
  headers.set('x-gnk-asg-media-control-sync',CONTROL_SYNC_VERSION);
  headers.set('x-gnk-asg-media-readiness',READINESS_VERSION);
  headers.set('x-gnk-asg-media-delivery',DELIVERY_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function injectAdminModules(response,path){
  if(path!==MEDIA_UI||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  let html=await response.text();
  if(!html.includes('media-command-handoff-ui-v3.css'))html=html.replace('</head>',`${HANDOFF_CSS}</head>`);
  if(!html.includes('media-outreach-delivery-ui-v3.css'))html=html.replace('</head>',`${DELIVERY_CSS}</head>`);
  if(!html.includes('media-command-handoff-ui-v3.js'))html=html.replace('</body>',`${HANDOFF_JS}</body>`);
  if(!html.includes('media-outreach-delivery-ui-v3.js'))html=html.replace('</body>',`${DELIVERY_JS}</body>`);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function protectedEndpoint(request,env,ctx,handler){
  const authProbe=await app.fetch(request.clone(),env,ctx);
  if(authProbe.status===401||authProbe.status===403)return stamp(authProbe);
  const response=await handler(request,env,ctx);
  if(response)return stamp(response);
  return stamp(authProbe);
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(CONTROL_ENDPOINTS.has(path))return protectedEndpoint(request,env,ctx,handleV2);
    if(DELIVERY_ENDPOINTS.has(path))return protectedEndpoint(request,env,ctx,handleMediaDelivery);
    let response=await app.fetch(request,env,ctx);
    response=await injectAdminModules(response,path);
    const isJson=response.headers.get('content-type')?.includes('application/json');
    if(request.method==='GET'&&isJson&&response.ok&&path===CONTACTS){
      try{
        const payload=await response.clone().json();
        if(Array.isArray(payload.items))payload.items=await enrichContactItems(env,payload.items);
        payload.controlSyncVersion=CONTROL_SYNC_VERSION;
        payload.readinessVersion=READINESS_VERSION;
        payload.deliveryVersion=DELIVERY_VERSION;
        return stamp(jsonResponse(payload,response));
      }catch{}
    }
    if(request.method==='GET'&&isJson&&response.ok&&path===STATUS){
      try{
        const payload=await response.clone().json();
        payload.mediaCommandWrapperV21=VERSION;
        payload.controlSync=CONTROL_SYNC_VERSION;
        payload.contactImport='HASH_LOCKED_V3';
        payload.delivery=DELIVERY_VERSION;
        payload.readiness=await getReadinessSummary(env);
        return stamp(jsonResponse(payload,response));
      }catch{}
    }
    if(path==='/data/portal-version.json'&&isJson){
      try{
        const payload=await response.clone().json();
        return stamp(jsonResponse({...payload,mediaCommandWrapperV21:VERSION,mediaControlSync:CONTROL_SYNC_VERSION,mediaReadiness:READINESS_VERSION,contactImport:'HASH_LOCKED_V3',mediaDelivery:DELIVERY_VERSION},response));
      }catch{}
    }
    return stamp(response);
  },
  async scheduled(event,env,ctx){
    const task=(async()=>{
      const upstream=typeof app.scheduled==='function'?await app.scheduled(event,env,ctx):null;
      const delivery=await processDeliveryQueue(env).catch(error=>({ok:false,error:String(error?.message||error)}));
      return{upstream,delivery};
    })();
    if(ctx?.waitUntil){ctx.waitUntil(task);return;}
    return task;
  },
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
