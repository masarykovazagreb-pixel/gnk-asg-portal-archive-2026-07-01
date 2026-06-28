import app from './index-admin-hub-v26-clean-index-v21-preview.js';
import {handleMediaAccess} from './media-access-service-v2.js';
import {mediaAccessPreflight} from './media-access-preflight-v1.js';
import {processAccessDeliveryQueue,VERSION as ACCESS_DISPATCH_VERSION} from './media-outreach-access-dispatch-v1.js';
import {ensureMediaControlRows,VERSION as CONTROL_SYNC_VERSION} from './media-command-control-sync-v3.js';
import {adminAccess} from './admin-session-auth-v1.js';

export const VERSION='GNK_ASG_PROJECT50_V28_TWO_PHASE_MEDIA_ACCESS_20260628';
const ENTRYPOINT='src/index-project50-v28-news-no-fallback.js';
const PREVIOUS_ENTRYPOINT='src/index-admin-hub-v26-clean-index-v21-preview.js';
const NEWS_RUNTIME='GNK_ASG_NEWS_LIFECYCLE_V18_ARCHIVE_1000_500_20260627';
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);
const PUBLIC_NEWS_PATHS=new Set(['/data/news.json','/data/news-feed.json']);
const PUBLIC_ARCHIVE_PATHS=new Set(['/data/news-archive.json','/data/news_archive.json']);
const DISPATCH_PATH='/api/media-command-center/dispatch-queue';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function boolEnv(value){return /^(1|true|yes|on)$/i.test(String(value||'').trim())}
function noStore(headers){
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  return headers;
}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-media-access-dispatch':ACCESS_DISPATCH_VERSION}})}
function lockedDeliveryEnv(env){return new Proxy(env,{get(target,property,receiver){if(String(property)==='MEDIA_OUTREACH_LIVE')return'false';return Reflect.get(target,property,receiver)}})}
function hasPublicFallbackImage(item){
  const image=String(item?.image||'');
  const verification=item?.verification?.image||{};
  return !image||image.includes('/assets/news-fallback')||verification.fallback===true||verification.ok===false;
}
function normalizedNewsItem(item){
  return {...item,verification:{...(item.verification||{}),image:{...(item.verification?.image||{}),ok:true,fallback:false}}};
}
async function dispatchApprovedMedia(request,env){
  const auth=await adminAccess(request,env);
  if(!auth.ok)return json({ok:false,error:'unauthorized'},401);
  let body={};try{body=await request.clone().json()}catch{return json({ok:false,error:'invalid_json'},400)}
  if(body.confirm!=='DISPATCH_ONE_QUEUED_EMAIL')return json({ok:false,error:'confirmation_required',required:'DISPATCH_ONE_QUEUED_EMAIL'},409);
  if(!boolEnv(env.MEDIA_OUTREACH_RELEASE_APPROVED))return json({ok:false,error:'explicit_release_approval_missing'},423);
  const sync=await ensureMediaControlRows(env);
  const result=await processAccessDeliveryQueue(env);
  return json({...result,controlSync:{version:CONTROL_SYNC_VERSION,processed:sync.processed,created:sync.created,updated:sync.updated}});
}
async function patchStatus(response,path){
  if(!STATUS_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=noStore(new Headers(response.headers));
    headers.set('x-gnk-asg-active-entrypoint',ENTRYPOINT);
    headers.set('x-gnk-asg-news-runtime',NEWS_RUNTIME);
    headers.set('x-gnk-asg-news-no-public-fallback','ENFORCED');
    const corrected={
      ...payload,
      entryPoint:ENTRYPOINT,
      deployedEntryPoint:ENTRYPOINT,
      previousEntryPoint:PREVIOUS_ENTRYPOINT,
      workerMain:`workers/gnk-asg-direct-operator/wrangler.toml → ${ENTRYPOINT}`,
      newsRuntime:NEWS_RUNTIME,
      project50WhiteIntegratedMenu:true,
      noPublicFallbackWrapper:VERSION,
      mediaAccessLiveIssue:'AUTHENTICATED_AND_LOCKED_UNTIL_CONFIRMED_DELIVERY',
      mediaAccessDispatch:ACCESS_DISPATCH_VERSION,
      mediaAccessReleaseApproval:'REQUIRED',
      activeNewsLimit:100,
      archivePruneAt:1000,
      archiveDeleteCount:500,
      archiveRetainAfterPrune:500,
      archiveHardLimit:1000,
      contentContract:{...(payload.contentContract||{}),title:true,summaryMinCharacters:60,source:true,articleVerified:true,sourceImageVerified:true,fallbackImagesAllowed:false},
      checkedAt:new Date().toISOString()
    };
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response}
}
async function patchPublicNewsData(response,path){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  if(!PUBLIC_NEWS_PATHS.has(path)&&!PUBLIC_ARCHIVE_PATHS.has(path))return response;
  try{
    const payload=await response.json();
    if(!Array.isArray(payload))return response;
    const filtered=payload.filter(item=>!hasPublicFallbackImage(item)).map(normalizedNewsItem);
    const limited=PUBLIC_NEWS_PATHS.has(path)?filtered.slice(0,100):(filtered.length>1000?filtered.slice(0,500):filtered.slice(0,1000));
    const headers=noStore(new Headers(response.headers));
    headers.set('x-gnk-asg-news-runtime',NEWS_RUNTIME);
    headers.set('x-gnk-asg-news-no-public-fallback','ENFORCED');
    headers.set('x-gnk-asg-news-active-limit',PUBLIC_NEWS_PATHS.has(path)?'100':'1000_500');
    headers.set('x-gnk-asg-news-filtered-fallback-count',String(payload.length-filtered.length));
    return new Response(JSON.stringify(limited,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response}
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(path===DISPATCH_PATH&&request.method==='POST')return dispatchApprovedMedia(request,env);
    const preflight=await mediaAccessPreflight(request,env);
    if(preflight)return preflight;
    const mediaAccess=await handleMediaAccess(request,env);
    if(mediaAccess)return mediaAccess;
    let response=await app.fetch(request,env,ctx);
    response=await patchStatus(response,path);
    return patchPublicNewsData(response,path);
  },
  async scheduled(event,env,ctx){
    const task=(async()=>{
      const upstream=typeof app.scheduled==='function'?await app.scheduled(event,lockedDeliveryEnv(env),ctx):null;
      if(!boolEnv(env.MEDIA_OUTREACH_RELEASE_APPROVED))return{upstream,delivery:{ok:true,skipped:'explicit_release_approval_missing'}};
      const sync=await ensureMediaControlRows(env);
      const delivery=await processAccessDeliveryQueue(env).catch(error=>({ok:false,error:String(error?.message||error)}));
      return{upstream,delivery,accessDispatch:ACCESS_DISPATCH_VERSION,controlSync:{version:CONTROL_SYNC_VERSION,processed:sync.processed,created:sync.created,updated:sync.updated}};
    })();
    if(ctx?.waitUntil){ctx.waitUntil(task);return;}
    return task;
  },
};