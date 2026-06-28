import publicApp from './index-admin-hub-v27-news-status.js';
import mailApp from './index-mail-studio-bridge-v15.js';
import mediaApp from './index-media-command-center-v21.js';
import {handleContactSubmit,PATH as CONTACT_PATH,VERSION as CONTACT_VERSION} from './contact-submit-v1.js';

export const VERSION='GNK_ASG_FINAL_FUNCTIONAL_CLEAN_V1_20260628';
const INDEX=new Set(['/','/en']);
const ADMIN_UI=['/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review'];
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isAdmin=path=>ADMIN_UI.some(prefix=>path===prefix||path.startsWith(prefix+'/'))||path==='/api/operator-auth-check'||path==='/api/operator-session/login'||path==='/operator/session/logout'||path==='/api/admin-mail-send'||path.startsWith('/api/mail-center/')||path==='/operator'||path.startsWith('/operator/')||path.startsWith('/api/operator-')||path.startsWith('/api/admin-');
const isMedia=path=>path==='/media-command-center'||path.startsWith('/media-command-center/')||path==='/api/media-command-center'||path.startsWith('/api/media-command-center/');
function stamp(response,extra={}){const headers=new Headers(response.headers);headers.set('x-gnk-asg-final-functional',VERSION);for(const [key,value] of Object.entries(extra))headers.set(key,value);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
async function patchIndex(response,path,request){
  if(request.method!=='GET'||!INDEX.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return stamp(response);
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('x-gnk-asg-final-functional',VERSION);headers.set('x-gnk-asg-index-cycle','FULL_AUTO_LOOP_WITH_COUNTDOWN');headers.set('x-gnk-asg-index-network','MAP_AND_CITY_DIRECTORY_RETAINED');
  let html=await response.text();
  if(!html.includes('index-priority-v1.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/index-priority-v1.css?v=20260628-v3"></head>');
  if(!html.includes('index-priority-v1.js'))html=html.replace('</body>','<script defer src="/assets/index-priority-v1.js?v=20260628-v3"></script></body>');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(path===CONTACT_PATH){const response=await handleContactSubmit(request,env);if(response)return stamp(response,{'x-gnk-asg-contact-service':CONTACT_VERSION});}
    if(isMedia(path))return stamp(await mediaApp.fetch(request,env,ctx));
    if(isAdmin(path))return stamp(await mailApp.fetch(request,env,ctx));
    return patchIndex(await publicApp.fetch(request,env,ctx),path,request);
  },
  async scheduled(event,env,ctx){if(typeof mediaApp.scheduled==='function')return mediaApp.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof mediaApp.email==='function')return mediaApp.email(message,env,ctx);}
};
