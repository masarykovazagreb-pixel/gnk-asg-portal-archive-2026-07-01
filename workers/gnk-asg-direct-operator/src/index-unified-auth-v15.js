import app from './index-unified-auth-v14.js';

export const VERSION='GNK_ASG_UNIFIED_AUTH_V15_20260626_LOGIN_ISOLATION';

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-auth-isolation',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
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

  let html=await response.text();
  const isolation=`<style id="gnk-auth-page-isolation">html[data-gnk-auth-login="1"] #gnk-backend-shell,html[data-gnk-auth-login="1"] #gnk-admin-module-launcher-v7,html[data-gnk-auth-login="1"] #gnk-admin-lock-notice-v7,html[data-gnk-auth-login="1"] .gnk-admin-shell-lite,html[data-gnk-auth-login="1"] .gnk-shell-wrap,html[data-gnk-auth-login="1"] .gnk-shell-nav,html[data-gnk-auth-login="1"] body>header,html[data-gnk-auth-login="1"] body>nav{display:none!important;visibility:hidden!important;pointer-events:none!important}html[data-gnk-auth-login="1"] body{padding-top:0!important}</style><script id="gnk-auth-page-isolation-script">(()=>{const ids=['gnk-backend-shell','gnk-admin-module-launcher-v7','gnk-admin-lock-notice-v7'];const clean=()=>{ids.forEach(id=>document.getElementById(id)?.remove());document.querySelectorAll('.gnk-admin-shell-lite,.gnk-shell-wrap,.gnk-shell-nav').forEach(el=>el.remove())};clean();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true})})();</script>`;
  html=html.replace(/<html([^>]*)>/i,'<html$1 data-gnk-auth-login="1">');
  html=html.replace(/<body([^>]*)>/i,'<body$1 class="gnk-auth-login-page">');
  html=html.includes('</head>')?html.replace('</head>',`${isolation}</head>`):`${isolation}${html}`;
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){return isolateLogin(await app.fetch(request,env,ctx));},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
