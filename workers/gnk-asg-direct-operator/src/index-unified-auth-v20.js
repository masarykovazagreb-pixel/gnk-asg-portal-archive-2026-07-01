import app,{VERSION as BASE_VERSION} from './index-unified-auth-v19.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V30_VISIBLE_MENU_STANDARD_LOGO_${BASE_VERSION}`;
const SHELL='<script defer src="/assets/public-unified-design-v3.js?v=20260713-standard-logo"></script><script defer src="/assets/public-unified-menu-v5.js?v=20260720-fix2"></script>';
const EDITORIAL='<script defer src="/assets/index-editorial-order-v5.js?v=20260713-visible-content"></script>';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isIndex=path=>path==='/'||path==='/en';
async function enhance(request,response){
 if(request.method!=='GET'||![200,401,403,503].includes(response.status))return response;
 const type=String(response.headers.get('content-type')||'').toLowerCase();if(!type.includes('text/html'))return response;
 try{
  let html=await response.text();
  html=html.replace(/<script[^>]+public-unified-design-v3\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+public-unified-menu-v5\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v5\.js[^>]*><\/script>/gi,'');
  const route=pathOf(request),scripts=`${isIndex(route)?EDITORIAL:''}${SHELL}`;
  html=html.includes('</body>')?html.replace('</body>',`${scripts}</body>`):`${html}${scripts}`;
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('location');headers.set('content-type','text/html; charset=utf-8');
  if(isIndex(route)&&!headers.has('x-gnk-explicit-html-route'))headers.set('x-gnk-explicit-html-route',route==='/'?'/index.html':'/en/index.html');
  headers.set('x-gnk-public-runtime',VERSION);
  headers.set('x-gnk-public-design','v2-unified');
  headers.set('x-gnk-public-design-current','v3-logo-standard');
  headers.set('x-gnk-unified-menu','public-and-protected');
  headers.set('x-gnk-unified-menu-current','visible-v5');
  headers.set('x-gnk-logo-standard','64x66');
  headers.set('x-gnk-index-editorial',isIndex(route)?'v5-guaranteed':'not-applicable');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
 }catch{return response}
}
export default{
 async fetch(request,env,ctx){return enhance(request,await app.fetch(request,env,ctx))},
 scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
 email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};