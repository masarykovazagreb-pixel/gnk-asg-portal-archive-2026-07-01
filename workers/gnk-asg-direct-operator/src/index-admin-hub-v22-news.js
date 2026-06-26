import app from './index-admin-hub-v21.js';
import {
  handleMediaApplicationPortal,
  VERSION as MEDIA_APPLICATION_VERSION,
  UI_PATH as MEDIA_APPLICATION_UI,
  API_PREFIX as MEDIA_APPLICATION_API
} from './media-application-portal-v1.js';

const VERSION='GNK_ASG_ADMIN_HUB_V22_NEWS_V17_MEDIA_APPLICATION_20260627';
const NEWS_SCHEDULE=['09:00','16:00','21:00'];
const SOURCE_MIX={global:13,regional:9,croatian:4};
const MEDIA_UI='/media-command-center';
const NOTIFICATION_STYLE='<link rel="stylesheet" href="/assets/media-notifications-v1.css?v=20260627">';
const NOTIFICATION_SCRIPT='<script defer src="/assets/media-notifications-v1.js?v=20260627"></script>';

function normalize(path){return path.replace(/\/+$/,'')||'/';}
function isApplication(path){return path===MEDIA_APPLICATION_UI||path.startsWith(`${MEDIA_APPLICATION_UI}/`)||path===MEDIA_APPLICATION_API||path.startsWith(`${MEDIA_APPLICATION_API}/`);}

async function correctJson(response){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const corrected={...payload,timeZone:'Europe/Zagreb',newsSchedule:NEWS_SCHEDULE,newsRefreshesPerDay:3,configuredNewsSources:26,sourceMix:SOURCE_MIX,minimumVerifiedLinks:15,activeNewsLimit:100,archivePruneAt:900,archiveDeleteCount:450,archiveRetainAfterPrune:450,archiveHardLimit:1000,newsRuntime:'GNK_ASG_NEWS_LIFECYCLE_V16_VERIFIED_MEDIA_20260626',contentContract:{title:true,summaryMinCharacters:60,source:true,articleVerified:true,sourceImageVerified:true,fallbackImagesAllowed:false},mediaApplicationPortal:MEDIA_APPLICATION_VERSION,mediaApplicationRoute:'/media-application/',mediaNotificationMinimum:10,mediaNotificationRefreshSeconds:1800};
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-admin-hub-v22',VERSION);
    headers.set('x-gnk-asg-media-application',MEDIA_APPLICATION_VERSION);
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
  let body=await response.text();
  body=body.replace(/business-news(?:-v\d+)?\.js\?v=[^"']+/g,'business-news-v16.js?v=20260626-news-v16');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function patchMediaHtml(response,path){
  if(path!==MEDIA_UI||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-media-application',MEDIA_APPLICATION_VERSION);
  let body=await response.text();
  if(!body.includes('media-notifications-v1.css'))body=body.replace('</head>',`${NOTIFICATION_STYLE}</head>`);
  if(!body.includes('media-notifications-v1.js'))body=body.replace('</body>',`${NOTIFICATION_SCRIPT}</body>`);
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=normalize(new URL(request.url).pathname);
    if(isApplication(path)){
      const applicationResponse=await handleMediaApplicationPortal(request,env,ctx);
      if(applicationResponse)return applicationResponse;
    }
    let response=await app.fetch(request,env,ctx);
    if(request.method==='GET'&&['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json'].includes(path))response=await correctJson(response);
    if(request.method==='GET'&&['/vijesti','/news'].includes(path))response=await patchNewsHtml(response);
    response=await patchMediaHtml(response,path);
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-admin-hub-v22',VERSION);
    headers.set('x-gnk-asg-media-application',MEDIA_APPLICATION_VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
