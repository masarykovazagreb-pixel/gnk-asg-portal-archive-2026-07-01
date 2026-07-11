import app,{VERSION as BASE_VERSION} from './index-unified-auth-v16.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V40_20260711_MODULAR_HOME_DASHBOARD_${BASE_VERSION}`;

const FLOATING_MENU_SCRIPT='/assets/public-floating-menu-v2.js?v=20260711-admin-first';
const COUNTDOWN_SCRIPT='/assets/the-code-countdown-v1.js?v=20260711-live';
const HOME_DASHBOARD_SCRIPT='/assets/home-dashboard-v1.js?v=20260711-v1';

function pathOf(request){
  return new URL(request.url).pathname.replace(/\/+$/,'')||'/';
}

function shouldInject(request,response){
  if(request.method!=='GET'&&request.method!=='HEAD')return false;
  if(response.status!==200)return false;
  const path=pathOf(request);
  if(path.startsWith('/api/'))return false;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  return type.includes('text/html');
}

async function injectPortalEnhancements(request,response){
  if(!shouldInject(request,response)||request.method==='HEAD')return response;
  try{
    const path=pathOf(request);
    let html=await response.text();
    html=html.replace(/<script[^>]+public-floating-menu-v1\.js[^>]*><\/script>/gi,'');
    const scripts=[];
    if(!html.includes('public-floating-menu-v2.js'))scripts.push(`<script defer src="${FLOATING_MENU_SCRIPT}"></script>`);
    if(!html.includes('the-code-countdown-v1.js'))scripts.push(`<script defer src="${COUNTDOWN_SCRIPT}"></script>`);
    if(path==='/'&&!html.includes('home-dashboard-v1.js'))scripts.push(`<script defer src="${HOME_DASHBOARD_SCRIPT}"></script>`);
    if(scripts.length){
      const bundle=scripts.join('');
      html=html.includes('</body>')?html.replace('</body>',`${bundle}</body>`):`${html}${bundle}`;
    }
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('x-gnk-global-floating-menu','admin-first-bilingual-countdown');
    if(path==='/')headers.set('x-gnk-home-dashboard','modular-v1');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v17.js');
  headers.set('x-gnk-global-menu-version',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    return stamp(await injectPortalEnhancements(request,response));
  },
  scheduled(event,env,ctx){
    if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);
  },
  async email(message,env,ctx){
    if(typeof app.email==='function')return app.email(message,env,ctx);
  }
};