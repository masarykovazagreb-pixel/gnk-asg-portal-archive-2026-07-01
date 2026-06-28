import publicApp from './index-admin-hub-v27-news-status.js';
import adminApp from './index-media-command-center-v21.js';
import {applyMediaApplicationAccess,VERSION as MEDIA_ACCESS_VERSION} from './media-application-access-v1.js';
import {handleContactSubmit,PATH as CONTACT_PATH,VERSION as CONTACT_VERSION} from './contact-submit-v1.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V28_PUBLIC_NEWS_NO_FALLBACK_MEDIA_ACCESS_20260628';
const ENTRYPOINT='src/index-admin-hub-v28-news-no-fallback.js';
const PREVIOUS_ENTRYPOINT='src/index-admin-hub-v27-news-status.js';
const NEWS_RUNTIME='GNK_ASG_NEWS_LIFECYCLE_V18_ARCHIVE_1000_500_20260627';
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);
const PUBLIC_NEWS_PATHS=new Set(['/data/news.json','/data/news-feed.json']);
const PUBLIC_ARCHIVE_PATHS=new Set(['/data/news-archive.json','/data/news_archive.json']);
const MEDIA_COMMAND_STATUS='/api/media-command-center/status';
const INDEX_PATHS=new Set(['/','/en']);
const ADMIN_UI=['/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/media-command-center','/media-access-admin','/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review'];
const INDEX_STYLE='<link rel="stylesheet" href="/assets/index-priority-v1.css?v=20260628-v3">';
const INDEX_SCRIPT='<script defer src="/assets/index-priority-v1.js?v=20260628-v3"></script>';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function isAdminPath(path){return ADMIN_UI.some(prefix=>path===prefix||path.startsWith(prefix+'/'))||path==='/api/operator-auth-check'||path==='/api/operator-session/login'||path==='/operator/session/logout'||path==='/api/admin-mail-send'||path.startsWith('/api/mail-center/')||path.startsWith('/api/media-command-center')||path.startsWith('/api/media-access/admin')||path==='/operator'||path.startsWith('/operator/')||path.startsWith('/api/operator-')||path.startsWith('/api/admin-')}
function noStore(headers){headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.delete('last-modified');headers.set('content-type','application/json; charset=utf-8');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');return headers}
function stamp(response,extra={}){const headers=new Headers(response.headers);headers.set('x-gnk-asg-active-entrypoint',ENTRYPOINT);headers.set('x-gnk-asg-final-functional','INDEX_CONTACT_MAIL_MEDIA_ADMIN_TOKEN');for(const [key,value] of Object.entries(extra))headers.set(key,value);return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function hasPublicFallbackImage(item){const image=String(item?.image||'');const verification=item?.verification?.image||{};return !image||image.includes('/assets/news-fallback')||verification.fallback===true||verification.ok===false}
function normalizedNewsItem(item){return {...item,verification:{...(item.verification||{}),image:{...(item.verification?.image||{}),ok:true,fallback:false}}}}
async function patchStatus(response,path){
  if(!STATUS_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=noStore(new Headers(response.headers));
    headers.set('x-gnk-asg-active-entrypoint',ENTRYPOINT);headers.set('x-gnk-asg-news-runtime',NEWS_RUNTIME);headers.set('x-gnk-asg-news-no-public-fallback','ENFORCED');headers.set('x-gnk-asg-media-access',MEDIA_ACCESS_VERSION);headers.set('x-gnk-asg-final-functional','INDEX_CONTACT_MAIL_MEDIA_ADMIN_TOKEN');
    const corrected={...payload,entryPoint:ENTRYPOINT,deployedEntryPoint:ENTRYPOINT,previousEntryPoint:PREVIOUS_ENTRYPOINT,workerMain:`workers/gnk-asg-direct-operator/wrangler.toml → ${ENTRYPOINT}`,newsRuntime:NEWS_RUNTIME,noPublicFallbackWrapper:VERSION,fallback_image:null,fallbackImage:null,openGraphFallbackEnabled:false,publicFallbackImage:null,mediaApplicationAccess:MEDIA_ACCESS_VERSION,mediaApprovalLoginCode:'AUTO_ISSUE_AND_EMAIL_ON_APPROVAL',mediaCommandSending:'LOCKED_UNTIL_EXPLICIT_RELEASE',mediaCommandMailbox:'media@gnk-asg.hr',contactSubmit:CONTACT_VERSION,indexCycle:'FULL_AUTO_LOOP_WITH_COUNTDOWN',indexNetwork:'MAP_AND_CITY_DIRECTORY_RETAINED',adminAuth:'ONE_TOKEN_12_HOUR_SESSION',mailStudio:'AUTHENTICATED_LIVE',activeNewsLimit:100,archivePruneAt:1000,archiveDeleteCount:500,archiveRetainAfterPrune:500,archiveHardLimit:1000,contentContract:{...(payload.contentContract||{}),title:true,summaryMinCharacters:60,source:true,articleVerified:true,sourceImageVerified:true,fallbackImagesAllowed:false},checkedAt:new Date().toISOString()};
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response}
}
async function patchPublicNewsData(response,path){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  if(!PUBLIC_NEWS_PATHS.has(path)&&!PUBLIC_ARCHIVE_PATHS.has(path))return response;
  try{
    const payload=await response.json();if(!Array.isArray(payload))return response;
    const filtered=payload.filter(item=>!hasPublicFallbackImage(item)).map(normalizedNewsItem);
    const limited=PUBLIC_NEWS_PATHS.has(path)?filtered.slice(0,100):(filtered.length>1000?filtered.slice(0,500):filtered.slice(0,1000));
    const headers=noStore(new Headers(response.headers));headers.set('x-gnk-asg-news-runtime',NEWS_RUNTIME);headers.set('x-gnk-asg-news-no-public-fallback','ENFORCED');headers.set('x-gnk-asg-news-active-limit',PUBLIC_NEWS_PATHS.has(path)?'100':'1000_500');headers.set('x-gnk-asg-news-filtered-fallback-count',String(payload.length-filtered.length));
    return new Response(JSON.stringify(limited,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response}
}
async function patchMediaCommandStatus(response,path){
  if(path!==MEDIA_COMMAND_STATUS||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();const headers=noStore(new Headers(response.headers));headers.set('x-gnk-asg-media-command-sending','LOCKED');headers.set('x-gnk-asg-email-routing-verification','UNVERIFIED_EXTERNAL_CONFIGURATION');headers.set('x-gnk-asg-contact-seed','INCOMPLETE_22_OF_42');
    const corrected={...payload,outboundSending:{locked:true,httpStatus:423,error:'production_sending_locked',routes:['/api/media-command-center/send-one','/api/media-command-center/send-batch'],unlockPolicy:'EXPLICIT_TESTED_PRODUCTION_APPROVAL_ONLY'},inboundMailbox:{address:'media@gnk-asg.hr',workerHandler:'IMPLEMENTED',cloudflareEmailRouting:'UNVERIFIED_EXTERNAL_CONFIGURATION'},applicationPolicy:{deadline:'2026-07-20T23:59:59+02:00',finalDecision:'HUMAN_ONLY',passportInitialEmailCopy:'PROHIBITED',documents:'R2_WITH_SHA256'},mediaApplicationAccess:MEDIA_ACCESS_VERSION};
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response}
}
async function patchIndex(response,path,request){
  if(request.method!=='GET'||!INDEX_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('x-gnk-asg-index-cycle','FULL_AUTO_LOOP_WITH_COUNTDOWN');headers.set('x-gnk-asg-index-network','MAP_AND_CITY_DIRECTORY_RETAINED');headers.set('x-gnk-asg-final-functional','INDEX_CONTACT_MAIL_MEDIA_ADMIN_TOKEN');
  let html=await response.text();if(!html.includes('index-priority-v1.css'))html=html.replace('</head>',`${INDEX_STYLE}</head>`);if(!html.includes('index-priority-v1.js'))html=html.replace('</body>',`${INDEX_SCRIPT}</body>`);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(path===CONTACT_PATH){const contact=await handleContactSubmit(request,env);if(contact)return stamp(contact,{'x-gnk-asg-contact-service':CONTACT_VERSION});}
    if(isAdminPath(path))return stamp(await adminApp.fetch(request,env,ctx));
    const accessRequest=request.clone();let response=await publicApp.fetch(request,env,ctx);response=await patchStatus(response,path);response=await patchPublicNewsData(response,path);response=await patchIndex(response,path,request);response=await applyMediaApplicationAccess(accessRequest,env,response);return stamp(await patchMediaCommandStatus(response,path));
  },
  async scheduled(event,env,ctx){if(typeof adminApp.scheduled==='function')return adminApp.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof adminApp.email==='function')return adminApp.email(message,env,ctx)}
};
