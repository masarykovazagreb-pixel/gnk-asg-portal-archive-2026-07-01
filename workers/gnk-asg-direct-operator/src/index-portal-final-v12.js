import core from './index-portal-experience-v10.js';
import { patchPublicHtml, patchAdminHtml, isPrivatePath, transformHtml } from './public-shell-v11.js';

const VERSION = 'GNK_ASG_PORTAL_FINAL_V13_20260625';
const PUBLIC_VISUAL = 'GNK_ASG_PUBLIC_VISUAL_V16_20260625';
const ADMIN_VISUAL = 'GNK_ASG_ADMIN_UNIFIED_V8_20260625';
const FLOATING_HOME = 'GNK_ASG_FLOATING_HOME_V16';

function applyCommonHeaders(headers){
  headers.set('x-gnk-asg-portal-final',VERSION);
  headers.set('x-gnk-asg-public-visual',PUBLIC_VISUAL);
  headers.set('x-gnk-asg-admin-visual',ADMIN_VISUAL);
  headers.set('x-gnk-asg-floating-home',FLOATING_HOME);
  headers.set('x-content-type-options','nosniff');
  const type=String(headers.get('content-type')||'').toLowerCase();
  if(type.includes('text/html'))headers.set('content-type','text/html; charset=utf-8');
  else if(type.includes('application/json'))headers.set('content-type','application/json; charset=utf-8');
  else if(type.includes('javascript'))headers.set('content-type','application/javascript; charset=utf-8');
  else if(type.includes('text/css'))headers.set('content-type','text/css; charset=utf-8');
  return headers;
}

function applyPrivateHeaders(headers){
  applyCommonHeaders(headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('referrer-policy','no-referrer');
  headers.set('x-frame-options','DENY');
  headers.set('permissions-policy','camera=(self), microphone=(), geolocation=()');
  headers.set('content-security-policy',"default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:; form-action 'self'");
  return headers;
}

function json(data,status=200){
  const headers=applyCommonHeaders(new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store'}));
  return new Response(JSON.stringify(data,null,2),{status,headers});
}

function withVersionHeader(response,privatePath=false){
  const headers=new Headers(response.headers);
  if(privatePath)applyPrivateHeaders(headers);else applyCommonHeaders(headers);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function assetResponse(request,env,assetPath,contentType){
  if(!env.ASSETS?.fetch)return null;
  const response=await env.ASSETS.fetch(new Request(new URL(assetPath,request.url),request));
  if(response.status===404)return null;
  const headers=applyCommonHeaders(new Headers(response.headers));
  headers.set('content-type',contentType);
  headers.set('cache-control','public, max-age=86400, stale-while-revalidate=604800');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function statusAsset(request,env,english){
  if(!env.ASSETS?.fetch)return null;
  const publicPath=english?'/automation-status/':'/status-automatizacije/';
  const target=new URL(english?'/automation-status/index.html':'/status-automatizacije/index.html',request.url);
  const response=await env.ASSETS.fetch(new Request(target,{method:'GET',headers:request.headers}));
  if(response.status===404)return null;
  if(!response.headers.get('content-type')?.includes('text/html'))return withVersionHeader(response);
  return transformHtml(response,html=>patchPublicHtml(html,publicPath));
}

async function fetchHandler(request,env,ctx){
  const url=new URL(request.url);
  const path=url.pathname.replace(/\/+$/,'')||'/';

  if(request.method==='GET'&&path==='/data/portal-version.json'){
    return json({
      ok:true,version:VERSION,publicUx:'GNK_ASG_PUBLIC_UX_V12',publicVisual:PUBLIC_VISUAL,
      publicMenu:'GNK_ASG_PUBLIC_MENU_V15',floatingHome:FLOATING_HOME,adminVisual:ADMIN_VISUAL,
      favicon:'GNK_ASG_FAVICON_V1',indexClock:'GNK_ASG_INDEX_CLOCK_V2',
      automation:'GNK_ASG_PORTAL_EXPERIENCE_V11_20260625',security:'GNK_ASG_ADMIN_SECURITY_V2',
      encoding:'UTF-8',timeZone:'Europe/Zagreb',deployedEntryPoint:'src/index-portal-final-v12.js'
    });
  }

  if(request.method==='GET'&&(path==='/favicon.ico'||path==='/favicon.svg')){
    const response=await assetResponse(request,env,'/assets/gnk-asg-favicon.svg','image/svg+xml; charset=utf-8');
    if(response)return response;
  }

  if(request.method==='GET'&&path==='/status-automatizacije'){
    const response=await statusAsset(request,env,false);
    if(response)return response;
  }
  if(request.method==='GET'&&path==='/automation-status'){
    const response=await statusAsset(request,env,true);
    if(response)return response;
  }

  const response=await core.fetch(request,env,ctx);
  if(request.method!=='GET'||!response.headers.get('content-type')?.includes('text/html'))return withVersionHeader(response,isPrivatePath(path));

  if(isPrivatePath(path)){
    const patched=await transformHtml(response,html=>{
      let value=patchAdminHtml(html,path);
      if(path==='/operator-dashboard'){
        const pattern=/if\([a-zA-Z_$][\w$]*\(\)\)\{\s*document\.getElementById\("login"\)/;
        value=value.replace(pattern,'if(false){document.getElementById("login")');
      }
      return value;
    });
    return withVersionHeader(patched,true);
  }

  return withVersionHeader(response,false);
}

export default {
  fetch:fetchHandler,
  async scheduled(event,env,ctx){if(typeof core.scheduled==='function')return core.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof core.email==='function')return core.email(message,env,ctx);}
};
