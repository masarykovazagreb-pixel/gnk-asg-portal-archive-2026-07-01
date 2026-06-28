// Production redeploy trigger: 2026-06-28 INDEX visibility recovery
import app from './index-admin-hub-v28-news-no-fallback.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V29_INDEX_MENU_DOWNLOAD_CENTRE_20260628';
const INDEX_PATHS=new Set(['/','/en']);

function pathOf(request){
  return new URL(request.url).pathname.replace(/\/+$/,'')||'/';
}

function stamp(response,extra={}){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-active-entrypoint','src/index-admin-hub-v29-index-visual-fix.js');
  headers.set('x-gnk-asg-index-visual-fix',VERSION);
  for(const [key,value] of Object.entries(extra))headers.set(key,value);
  return headers;
}

function patchIndexMenu(html,english){
  html=html.replace(/<a\b([^>]*?)href=["']\/(?:en\/)?downloads\/?["']([^>]*)>[\s\S]*?<\/a>/i,`<a$1href="/downloads/"$2>${english?'Download Centre':'Download centar'}</a>`);
  html=html.replace(/<a\b[^>]*href=["']\/(?:trzista|markets)\/?["'][^>]*>[\s\S]*?<\/a>/gi,'');
  html=html.replace(/<a\b([^>]*?)href=["']\/(?:operator-dashboard|admin-center|mail-studio)\/?["']([^>]*)>[\s\S]*?<\/a>/i,'<a$1href="/mail-studio/"$2>ADMIN</a>');
  return html;
}

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    const path=pathOf(request);
    if(request.method!=='GET'||!INDEX_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html')){
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers:stamp(response)});
    }
    const html=patchIndexMenu(await response.text(),path==='/en');
    const headers=stamp(response,{'x-gnk-asg-index-menu':'DOWNLOAD_CENTRE_SHARED_ADMIN_MAIL_STUDIO'});
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
