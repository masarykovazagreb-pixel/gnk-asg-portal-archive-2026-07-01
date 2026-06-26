import app from './index-admin-hub-v21.js';

const VERSION='GNK_ASG_ADMIN_HUB_V22_NEWS_V13_20260626';
const NEWS_SCHEDULE=['09:00','16:00','21:00'];
const SOURCE_MIX={global:10,regional:5,croatian:3};

function normalize(path){return path.replace(/\/+$/,'')||'/';}

async function correctJson(response){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const corrected={...payload,timeZone:'Europe/Zagreb',newsSchedule:NEWS_SCHEDULE,newsRefreshesPerDay:3,configuredNewsSources:18,sourceMix:SOURCE_MIX,activeNewsLimit:100,archivePruneAt:1000,archiveDeleteCount:500,archiveRetainAfterPrune:500,newsRuntime:'GNK_ASG_NEWS_LIFECYCLE_V13_20260626'};
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-admin-hub-v22',VERSION);
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

async function patchNewsHtml(response){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-admin-hub-v22',VERSION);
  const body=(await response.text()).replace(/business-news\.js\?v=[^"']+/g,'business-news.js?v=20260626-news-v13');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=normalize(new URL(request.url).pathname);
    const response=await app.fetch(request,env,ctx);
    if(request.method==='GET'&&['/data/news-automation-status.json','/data/deployment-status.json'].includes(path))return correctJson(response);
    if(request.method==='GET'&&['/vijesti','/news'].includes(path))return patchNewsHtml(response);
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-admin-hub-v22',VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
