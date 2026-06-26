import app from './index-admin-hub-v23-aktual.js';
import {
  handleMediaApplicationPortal,
  VERSION as MEDIA_APPLICATION_VERSION,
  UI_PATH as MEDIA_APPLICATION_UI,
  API_PREFIX as MEDIA_APPLICATION_API
} from './media-application-portal-v1.js';

const VERSION='GNK_ASG_ADMIN_HUB_V24_MEDIA_APPLICATION_20260627';
const MEDIA_UI='/media-command-center';
const STYLE='<link rel="stylesheet" href="/assets/media-notifications-v1.css?v=20260627">';
const SCRIPT='<script defer src="/assets/media-notifications-v1.js?v=20260627"></script>';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isApplication=path=>path===MEDIA_APPLICATION_UI||path.startsWith(`${MEDIA_APPLICATION_UI}/`)||path===MEDIA_APPLICATION_API||path.startsWith(`${MEDIA_APPLICATION_API}/`);

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-admin-hub-v24',VERSION);
  headers.set('x-gnk-asg-media-application',MEDIA_APPLICATION_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function injectNotifications(response,path){
  if(path!==MEDIA_UI||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  let html=await response.text();
  if(!html.includes('media-notifications-v1.css'))html=html.replace('</head>',`${STYLE}</head>`);
  if(!html.includes('media-notifications-v1.js'))html=html.replace('</body>',`${SCRIPT}</body>`);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function enrichVersion(response){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(JSON.stringify({...payload,adminHubV24:VERSION,mediaApplicationPortal:MEDIA_APPLICATION_VERSION,mediaApplicationRoute:'/media-application/',mediaApplicationSubmit:'/api/media-application/submit',mediaNotificationMinimum:10,mediaNotificationRefreshSeconds:1800},null,2),{status:response.status,headers});
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(isApplication(path)){
      const response=await handleMediaApplicationPortal(request,env,ctx);
      return stamp(response||new Response('Not found',{status:404}));
    }
    let response=await app.fetch(request,env,ctx);
    response=await injectNotifications(response,path);
    if(['/data/deployment-status.json','/data/portal-version.json'].includes(path))response=await enrichVersion(response);
    return stamp(response);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
