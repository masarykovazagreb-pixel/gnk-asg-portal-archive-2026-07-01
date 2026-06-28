import app from './index-admin-hub-v28-news-no-fallback.js';

export const VERSION='GNK_ASG_MINIMUM_LIVE_V29_20260628';
const ENTRYPOINT='src/index-minimum-live-v29.js';
const DIRECT_HTML=new Map([
  ['/','/index.html'],
  ['/en','/en/index.html'],
  ['/contact','/contact/index.html'],
  ['/en/contact','/en/contact/index.html']
]);
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function stripEntityHeaders(headers){
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  return headers;
}
async function directHtml(request,env,path){
  if(request.method!=='GET'||!DIRECT_HTML.has(path)||!env.ASSETS?.fetch)return null;
  const assetPath=DIRECT_HTML.get(path);
  const assetUrl=new URL(assetPath,request.url);
  const response=await env.ASSETS.fetch(new Request(assetUrl.toString(),{method:'GET',headers:{accept:'text/html'}}));
  if(!response.ok)return null;
  const headers=stripEntityHeaders(new Headers(response.headers));
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-live-entrypoint',ENTRYPOINT);
  headers.set('x-gnk-asg-static-source',assetPath);
  if(path==='/'||path==='/en')headers.set('x-gnk-asg-index-menu','MINIMUM_INDEX_CONTACT_ADMIN_V1');
  if(path==='/contact'||path==='/en/contact')headers.set('x-gnk-asg-contact-ui','INDEX_ALIGNED_V5');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function patchStatus(response,path){
  if(!STATUS_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=stripEntityHeaders(new Headers(response.headers));
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-live-entrypoint',ENTRYPOINT);
    return new Response(JSON.stringify({...payload,entryPoint:ENTRYPOINT,deployedEntryPoint:ENTRYPOINT,minimumRelease:'INDEX_CONTACT_ADMIN_V1',indexMenu:'MINIMUM_INDEX_CONTACT_ADMIN_V1',contactUi:'INDEX_ALIGNED_V5',adminEntry:'ADMIN_CENTER',mediaCommandSending:'LOCKED',checkedAt:new Date().toISOString()},null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response}
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    const direct=await directHtml(request,env,path);
    if(direct)return direct;
    const response=await app.fetch(request,env,ctx);
    return patchStatus(response,path);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
