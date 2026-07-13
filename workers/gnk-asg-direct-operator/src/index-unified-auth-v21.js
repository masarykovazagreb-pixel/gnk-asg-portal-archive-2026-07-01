import app,{VERSION as BASE_VERSION} from './index-unified-auth-v20.js';
import {handleContactStudio,handlesContactStudio,VERSION as CONTACT_STUDIO_VERSION} from './contact-studio-mail-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V31_MAIL_NEWS_CONTRAST_${CONTACT_STUDIO_VERSION}_${BASE_VERSION}`;
const MENU='<script defer src="/assets/public-unified-menu-v6.js?v=20260713-full-navigation"></script>';
const CONTRAST='<script defer src="/assets/public-contrast-hardening-v1.js?v=20260713-readable"></script>';
const EDITORIAL='<script defer src="/assets/index-editorial-order-v6.js?v=20260713-news-100"></script>';
const MAIL_STUDIO='<script defer src="/assets/mail-studio-ui-v28.js?v=20260713-large-composer"></script>';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isIndex=path=>path==='/'||path==='/en';
const isMailStudio=path=>path==='/mail-studio'||path==='/webmail';
const NEW_ARTICLES=new Map([
 ['/objave/transparentno-upravljanje-kao-operativni-standard','/objave/transparentno-upravljanje-kao-operativni-standard/'],
 ['/analize/ai-infrastruktura-kapital-energija','/analize/ai-infrastruktura-kapital-energija/'],
 ['/objave/kiberneticka-otpornost-i-kontinuitet','/objave/kiberneticka-otpornost-i-kontinuitet/'],
 ['/komentari/trzista-traze-jasne-informacije','/komentari/trzista-traze-jasne-informacije/'],
 ['/komentari/automatizacija-ne-ukida-odgovornost','/komentari/automatizacija-ne-ukida-odgovornost/']
]);
async function directArticle(request,env){if(!['GET','HEAD'].includes(request.method)||!env.ASSETS?.fetch)return null;const targetPath=NEW_ARTICLES.get(pathOf(request));if(!targetPath)return null;try{const response=await env.ASSETS.fetch(new Request(new URL(targetPath,'https://assets.local').toString(),{method:request.method,headers:request.headers,redirect:'manual'}));if(response.status!==200)return null;const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('location');headers.set('content-type','text/html; charset=utf-8');headers.set('cache-control','public, max-age=120, stale-while-revalidate=300');headers.set('x-gnk-explicit-html-route',`${targetPath}index.html`);headers.set('x-gnk-route-owner',VERSION);return new Response(request.method==='HEAD'?null:await response.text(),{status:200,headers})}catch{return null}}
async function enhance(request,response){if(request.method!=='GET'||![200,401,403,503].includes(response.status))return response;const type=String(response.headers.get('content-type')||'').toLowerCase();if(!type.includes('text/html'))return response;try{let html=await response.text();html=html.replace(/<script[^>]+public-unified-menu-v6\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+public-contrast-hardening-v1\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v6\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+mail-studio-ui-v28\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+public-unified-menu-v5\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v5\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v1\.js[^>]*><\/script>/gi,'');const route=pathOf(request),scripts=`${isIndex(route)?EDITORIAL:''}${isMailStudio(route)?MAIL_STUDIO:''}${CONTRAST}${MENU}`;html=html.includes('</body>')?html.replace('</body>',`${scripts}</body>`):`${html}${scripts}`;const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('location');headers.set('content-type','text/html; charset=utf-8');headers.set('x-gnk-public-runtime',VERSION);headers.set('x-gnk-unified-menu-current','full-v6-workers');headers.set('x-gnk-contrast','hardened-v1');headers.set('x-gnk-index-editorial',isIndex(route)?'v6-news-100':'not-applicable');headers.set('x-gnk-mail-transport',CONTACT_STUDIO_VERSION);if(isMailStudio(route))headers.set('x-gnk-mail-studio-ui','v28-large-composer');return new Response(html,{status:response.status,statusText:response.statusText,headers})}catch{return response}}
export default{
 async fetch(request,env,ctx){const path=pathOf(request);if(handlesContactStudio(path))return handleContactStudio(request,env,ctx,app);const article=await directArticle(request,env);return enhance(request,article||await app.fetch(request,env,ctx))},
 scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
 email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
