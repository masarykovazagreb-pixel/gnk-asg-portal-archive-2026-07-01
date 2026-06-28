import publicApp from './index-admin-hub-v28-news-no-fallback.js';
import adminApp from './index-media-command-center-v21.js';
import {handleContactSubmit,PATH as CONTACT_PATH,VERSION as CONTACT_VERSION} from './contact-submit-v1.js';

export const VERSION='GNK_ASG_FINAL_FUNCTIONAL_V4_20260628';
const INDEX_PATHS=new Set(['/','/en']);
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);
const ADMIN_UI=['/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/media-command-center','/media-access-admin','/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review'];
const INDEX_STYLE='<link rel="stylesheet" href="/assets/index-priority-v1.css?v=20260628-v3">';
const INDEX_SCRIPT='<script defer src="/assets/index-priority-v1.js?v=20260628-v3"></script>';

const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isAdminPath=path=>ADMIN_UI.some(prefix=>path===prefix||path.startsWith(prefix+'/'))||path==='/api/operator-auth-check'||path==='/api/operator-session/login'||path==='/operator/session/logout'||path==='/api/admin-mail-send'||path.startsWith('/api/mail-center/')||path.startsWith('/api/media-command-center')||path.startsWith('/api/media-access/admin')||path==='/operator'||path.startsWith('/operator/')||path.startsWith('/api/operator-')||path.startsWith('/api/admin-');
function stamp(response,extra={}){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-final-functional',VERSION);
  for(const [key,value] of Object.entries(extra))headers.set(key,value);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function patchIndex(response,path,request){
  if(request.method!=='GET'||!INDEX_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-cycle','FULL_AUTO_LOOP_WITH_COUNTDOWN');
  headers.set('x-gnk-asg-index-network','MAP_AND_CITY_DIRECTORY_RETAINED');
  let html=await response.text();
  if(!html.includes('index-priority-v1.css'))html=html.replace('</head>',`${INDEX_STYLE}</head>`);
  if(!html.includes('index-priority-v1.js'))html=html.replace('</body>',`${INDEX_SCRIPT}</body>`);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
async function patchStatus(response,path){
  if(!STATUS_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('content-type','application/json; charset=utf-8');headers.set('cache-control','no-store');
    return new Response(JSON.stringify({...payload,deployedEntryPoint:'src/index-final-functional-v4.js',finalFunctional:VERSION,indexCycle:'FULL_AUTO_LOOP_WITH_COUNTDOWN',indexNetwork:'MAP_AND_CITY_DIRECTORY_RETAINED',contactSubmit:CONTACT_VERSION,adminAuth:'ONE_TOKEN_12_HOUR_SESSION',mailStudio:'AUTHENTICATED_LIVE',mediaSender:'AUTHENTICATED_RELEASE_CONTROLLED',checkedAt:new Date().toISOString()},null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(path===CONTACT_PATH){const contact=await handleContactSubmit(request,env);if(contact)return stamp(contact,{'x-gnk-asg-contact-service':CONTACT_VERSION});}
    if(isAdminPath(path))return stamp(await adminApp.fetch(request,env,ctx));
    let response=await publicApp.fetch(request,env,ctx);
    response=await patchIndex(response,path,request);
    response=await patchStatus(response,path);
    return stamp(response);
  },
  async scheduled(event,env,ctx){if(typeof adminApp.scheduled==='function')return adminApp.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof adminApp.email==='function')return adminApp.email(message,env,ctx);}
};
