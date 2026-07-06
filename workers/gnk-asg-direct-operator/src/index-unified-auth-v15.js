import app from './index-unified-auth-v14.js';
import {
  patchIndexContractResponse,
  VERSION as INDEX_CONTRACT_INJECTION_VERSION
} from './index-contract-injection-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V16_20260706_LOGIN_ISOLATION_INDEX_CONTRACT_${INDEX_CONTRACT_INJECTION_VERSION}`;

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-auth-isolation',VERSION);
  headers.set('x-gnk-index-contract-injection',INDEX_CONTRACT_INJECTION_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function patchVersionResponse(request,response){
  if(pathOf(request)!=='/data/portal-version.json'||response.status!==200)return response;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('application/json'))return response;
  try{
    const payload=await response.clone().json();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store');
    headers.set('x-gnk-asg-auth-isolation',VERSION);
    headers.set('x-gnk-index-contract-injection',INDEX_CONTRACT_INJECTION_VERSION);
    headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v15.js');
    return new Response(JSON.stringify({
      ...payload,
      deployedEntryPoint:'src/index-unified-auth-v15.js',
      wrapperEntryPoint:'src/index-unified-auth-v15.js',
      indexContractInjectionVersion:INDEX_CONTRACT_INJECTION_VERSION,
      authIsolationVersion:VERSION
    },null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

async function isolateLogin(response){
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html')||![401,403,503].includes(response.status))return stamp(response);

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('pragma','no-cache');
  headers.set('expires','0');
  headers.set('vary','cookie');
  headers.set('x-gnk-asg-auth-isolation',VERSION);
  headers.set('x-gnk-index-contract-injection',INDEX_CONTRACT_INJECTION_VERSION);

  let html=await response.text();
  const isolation=`<style id="gnk-auth-page-isolation">html[data-gnk-auth-login="1"] #gnk-backend-shell,html[data-gnk-auth-login="1"] #gnk-admin-module-launcher-v7,html[data-gnk-auth-login="1"] #gnk-admin-lock-notice-v7,html[data-gnk-auth-login="1"] .gnk-admin-shell-lite,html[data-gnk-auth-login="1"] .gnk-shell-wrap,html[data-gnk-auth-login="1"] .gnk-shell-nav,html[data-gnk-auth-login="1"] body>header,html[data-gnk-auth-login="1"] body>nav{display:none!important;visibility:hidden!important;pointer-events:none!important}html[data-gnk-auth-login="1"] body{padding-top:0!important}</style><script id="gnk-auth-page-isolation-script">(()=>{const ids=['gnk-backend-shell','gnk-admin-module-launcher-v7','gnk-admin-lock-notice-v7'];const clean=()=>{ids.forEach(id=>document.getElementById(id)?.remove());document.querySelectorAll('.gnk-admin-shell-lite,.gnk-shell-wrap,.gnk-shell-nav').forEach(el=>el.remove())};clean();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true})})();</script>`;
  html=html.replace(/<html([^>]*)>/i,'<html$1 data-gnk-auth-login="1">');
  html=html.replace(/<body([^>]*)>/i,'<body$1 class="gnk-auth-login-page">');
  html=html.includes('</head>')?html.replace('</head>',`${isolation}</head>`):`${isolation}${html}`;
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    const versionPatched=await patchVersionResponse(request,response);
    const patched=await patchIndexContractResponse(request,versionPatched);
    return isolateLogin(patched);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
