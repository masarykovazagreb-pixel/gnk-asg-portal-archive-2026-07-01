import core from './index-portal-final-v13.js';

export const VERSION='GNK_ASG_PORTAL_FINAL_V14_THE_CODE_MENU_ONLY_20260628';
const INDEX_PATHS=new Set(['/','/en']);

function indexPath(request){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  return INDEX_PATHS.has(path);
}

async function injectMenuScript(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-portal-final',VERSION);
  headers.set('x-gnk-asg-the-code','STANDALONE_PAGE_MENU_ONLY');
  let html=await response.text();
  const tag='<script src="/assets/index-featured-code-v1.js?v=20260628-menu-only" defer></script>';
  if(!html.includes(tag))html=html.replace('</body>',tag+'</body>');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await core.fetch(request,env,ctx);
    const type=String(response.headers.get('content-type')||'').toLowerCase();
    if(request.method==='GET'&&indexPath(request)&&response.ok&&type.includes('text/html'))return injectMenuScript(response);
    return response;
  },
  async scheduled(event,env,ctx){if(typeof core.scheduled==='function')return core.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof core.email==='function')return core.email(message,env,ctx);}
};