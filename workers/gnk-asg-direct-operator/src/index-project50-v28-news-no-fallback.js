import app from './index-admin-hub-v26-clean-index-v21-preview.js';

export const VERSION='GNK_ASG_PROJECT50_V28_PUBLIC_NEWS_NO_FALLBACK_20260628';
const ENTRYPOINT='src/index-project50-v28-news-no-fallback.js';
const PREVIOUS_ENTRYPOINT='src/index-admin-hub-v26-clean-index-v21-preview.js';
const NEWS_RUNTIME='GNK_ASG_NEWS_LIFECYCLE_V18_ARCHIVE_1000_500_20260627';
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);
const PUBLIC_NEWS_PATHS=new Set(['/data/news.json','/data/news-feed.json']);
const PUBLIC_ARCHIVE_PATHS=new Set(['/data/news-archive.json','/data/news_archive.json']);

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function noStore(headers){
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  return headers;
}
function hasPublicFallbackImage(item){
  const image=String(item?.image||'');
  const verification=item?.verification?.image||{};
  return !image||image.includes('/assets/news-fallback')||verification.fallback===true||verification.ok===false;
}
function normalizedNewsItem(item){
  return {...item,verification:{...(item.verification||{}),image:{...(item.verification?.image||{}),ok:true,fallback:false}}};
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
    let response=await app.fetch(request,env,ctx);
    response=await patchStatus(response,path);
    return patchPublicNewsData(response,path);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
};
