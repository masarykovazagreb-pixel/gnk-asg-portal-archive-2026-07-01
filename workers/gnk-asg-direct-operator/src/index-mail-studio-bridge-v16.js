import app from './index-mail-studio-bridge-v15.js';

export const VERSION='GNK_ASG_MAIL_STUDIO_BRIDGE_V16_20260630_DELIVERY_HISTORY_V3';
const CORE_SRC='/assets/studio-core-v21.js?v=20260630-mail-history-v3';
const HISTORY_SRC='/assets/delivery-history-dashboard-v3.js?v=20260630-1';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isMail=path=>path==='/mail-studio'||path.startsWith('/mail-studio/')||path==='/mail-studio-pro'||path.startsWith('/mail-studio-pro/');
const isHtml=response=>String(response.headers.get('content-type')||'').toLowerCase().includes('text/html');

async function patch(response,path){
  if(!isMail(path)||!response.ok||!isHtml(response))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');
  headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('x-gnk-asg-mail-studio-bridge-v16',VERSION);
  let html=await response.text();
  html=html.replace(/<script[^>]+src=["'][^"']*studio-core-v21\.js[^"']*["'][^>]*><\/script>/gi,'');
  html=html.replace(/<script[^>]+src=["'][^"']*delivery-history-dashboard-v3\.js[^"']*["'][^>]*><\/script>/gi,'');
  const scripts=`<script defer src="${CORE_SRC}"></script><script defer src="${HISTORY_SRC}"></script>`;
  html=html.includes('</body>')?html.replace('</body>',scripts+'</body>'):html+scripts;
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    return patch(response,pathOf(request));
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
