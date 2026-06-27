import app from './index-admin-hub-v26-clean-index.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V27_NEWS_STATUS_20260627';
const ENTRYPOINT='src/index-admin-hub-v27-news-status.js';
const PREVIOUS_ENTRYPOINT='src/index-admin-hub-v26-clean-index.js';
const NEWS_RUNTIME='GNK_ASG_NEWS_LIFECYCLE_V16_VERIFIED_MEDIA_20260626';
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function noStore(headers){headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.delete('last-modified');headers.set('content-type','application/json; charset=utf-8');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');return headers}
async function patchStatus(response,path){
  if(!STATUS_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=noStore(new Headers(response.headers));
    headers.set('x-gnk-asg-active-entrypoint',ENTRYPOINT);
    headers.set('x-gnk-asg-news-runtime',NEWS_RUNTIME);
    const corrected={
      ...payload,
      entryPoint:ENTRYPOINT,
      deployedEntryPoint:ENTRYPOINT,
      previousEntryPoint:PREVIOUS_ENTRYPOINT,
      newsRuntime:NEWS_RUNTIME,
      workerMain:`workers/gnk-asg-direct-operator/wrangler.toml → ${ENTRYPOINT}`,
      timeZone:'Europe/Zagreb',
      newsSchedule:['09:00','16:00','21:00'],
      newsRefreshesPerDay:3,
      activeNewsLimit:100,
      archivePruneAt:1000,
      archiveDeleteCount:500,
      archiveRetainAfterPrune:500,
      archiveHardLimit:1000,
      contentContract:{title:true,summaryMinCharacters:60,source:true,articleVerified:true,sourceImageVerified:true,fallbackImagesAllowed:false},
      statusWrapper:VERSION,
      checkedAt:new Date().toISOString()
    };
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response}
}

export default{
  async fetch(request,env,ctx){const path=pathOf(request);return patchStatus(await app.fetch(request,env,ctx),path)},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
