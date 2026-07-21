import app,{VERSION as BASE_VERSION} from './index-unified-auth-v20.js';
import {handleContactStudio,handlesContactStudio,VERSION as CONTACT_STUDIO_VERSION} from './contact-studio-mail-v1.js';
import {withEmailStatusTracking} from './email-status-tracking-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V31_MAIL_NEWS_CONTRAST_ZERO_WARNING_NORMALIZED_PROTECTED_EDITORIAL_APPROVAL_${CONTACT_STUDIO_VERSION}_${BASE_VERSION}`;
const MENU='<script defer src="/assets/public-unified-menu-v6.js?v=20260720-fix2"></script>';
const CONTRAST='<script defer src="/assets/public-contrast-hardening-v1.js?v=20260721-transparency42-v2"></script>';
const EDITORIAL='<script defer src="/assets/index-editorial-order-v6.js?v=20260715-source-links-v2"></script><script defer src="/assets/index-editorial-cleanup-v1.js?v=20260713-v6-cleanup"></script>';
const MAIL_STUDIO='<script defer src="/assets/mail-studio-ui-v28.js?v=20260713-large-composer"></script>';
const CANONICAL_LOGO='/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64';
const CANONICAL_ROUTES=new Map([['/about','https://gnk-asg.hr/about/'],['/projects','https://gnk-asg.hr/projects/'],['/the-code/media-memorandum','https://gnk-asg.hr/the-code/media-memorandum/']]);
const APPROVAL_API_ROUTES=new Map([
 ['/api/editorial-approval/queue','/data/editorial-approval-queue.json'],
 ['/api/editorial-approval/mail-audit','/data/mail-audit-20260713.json']
]);
const PRIVATE_APPROVAL_ASSET_PATHS=new Set([...APPROVAL_API_ROUTES.values()]);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isIndex=path=>path==='/'||path==='/en';
const isMailStudio=path=>path==='/mail-studio'||path==='/webmail';
const json=(request,data,status=200,extraHeaders={})=>new Response(request.method==='HEAD'?null:JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extraHeaders}});
async function authenticated(request,env,ctx){const target=new URL('/api/operator-auth-check',request.url),check=new Request(target,{method:'GET',headers:request.headers,redirect:'manual'});return (await app.fetch(check,env,ctx)).ok}
async function approvalData(request,env,ctx){
 const path=pathOf(request);
 if(PRIVATE_APPROVAL_ASSET_PATHS.has(path))return json(request,{ok:false,error:'not_found'},404,{'x-gnk-private-asset':'blocked'});
 const assetPath=APPROVAL_API_ROUTES.get(path);
 if(!assetPath)return null;
 if(!['GET','HEAD'].includes(request.method))return json(request,{ok:false,error:'method_not_allowed'},405,{'allow':'GET, HEAD'});
 if(!await authenticated(request,env,ctx))return json(request,{ok:false,error:'unauthorized',message:'Operator/admin session required.'},401,{'www-authenticate':'Session'});
 if(!env.ASSETS?.fetch)return json(request,{ok:false,error:'asset_binding_missing'},503);
 try{
  const target=new URL(assetPath,'https://assets.local');
  const response=await env.ASSETS.fetch(new Request(target.toString(),{method:request.method,headers:{accept:'application/json'},redirect:'manual'}));
  if(response.status!==200)return json(request,{ok:false,error:'protected_asset_unavailable',status:response.status},502);
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('location');
  headers.set('content-type','application/json; charset=utf-8');headers.set('cache-control','private, no-store, max-age=0');headers.set('pragma','no-cache');headers.set('x-content-type-options','nosniff');headers.set('x-gnk-editorial-approval-protected','v1-session-required');
  return new Response(request.method==='HEAD'?null:await response.text(),{status:200,headers});
 }catch(error){return json(request,{ok:false,error:'protected_asset_fetch_failed',message:String(error?.message||error).slice(0,160)},502)}
}
const NEW_ARTICLES=new Map([
 ['/objave/transparentno-upravljanje-kao-operativni-standard','/objave/transparentno-upravljanje-kao-operativni-standard/'],
 ['/analize/ai-infrastruktura-kapital-energija','/analize/ai-infrastruktura-kapital-energija/'],
 ['/objave/kiberneticka-otpornost-i-kontinuitet','/objave/kiberneticka-otpornost-i-kontinuitet/'],
 ['/komentari/trzista-traze-jasne-informacije','/komentari/trzista-traze-jasne-informacije/'],
 ['/komentari/automatizacija-ne-ukida-odgovornost','/komentari/automatizacija-ne-ukida-odgovornost/']
]);
function normalizeHtml(html,route){
 let out=String(html||'');
 out=out.replace(/<script\b[^>]+(?:public-floating-menu-v[12]|index-live-hub-v1)\.js[^>]*><\/script>/gi,'');
 out=out.replace(/\b(href|src)=(['"])assets\//gi,(_m,attr,q)=>`${attr}=${q}/assets/`);
 out=out.replace(/\bhref=(['"])manifest\.webmanifest\1/gi,'href="/manifest.webmanifest"');
 out=out.replace(/(<img\b[^>]*\bsrc=['"])([^'"]*(?:logo-gnk-asg|logo-gnk-dinamo|logo-gnk-asg-gold|gnk-gold-logo|GNK_ASG_logo_gold_transparent)[^'"]*)(['"][^>]*>)/gi,(_m,a,_src,c)=>`${a}${CANONICAL_LOGO}${c}`);
 out=out.replace(/"logo"\s*:\s*"https:\/\/gnk-asg\.hr\/assets\/(?:logo-gnk-asg|logo-gnk-dinamo|logo-gnk-asg-gold|gnk-gold-logo)[^"]*"/gi,`"logo":"https://gnk-asg.hr/assets/logo-gnk-asg-canonical.svg"`);
 if(/<input\b[^>]*\bid=['"]chatInput['"]/i.test(out)&&!/<input\b[^>]*\bid=['"]chatInput['"][^>]*\baria-label=/i.test(out))out=out.replace(/<input\b([^>]*\bid=['"]chatInput['"][^>]*)>/i,`<input $1 aria-label="${route==='/en'?'Ask the GNK ASG Intelligence Desk':'Postavite pitanje GNK ASG Intelligence Desku'}">`);
 if(/<select\b[^>]*\bid=['"]documentCategory['"]/i.test(out)&&!/<select\b[^>]*\bid=['"]documentCategory['"][^>]*\baria-label=/i.test(out))out=out.replace(/<select\b([^>]*\bid=['"]documentCategory['"][^>]*)>/i,'<select $1 aria-label="Kategorija dokumenta / Document category">');
 out=out.replace(/1\.536 digitalnih funkcija/gi,'1.573 digitalne funkcije').replace(/1,536 digital functions/gi,'1,573 digital functions');
 out=out.replace(/do 500 najnovijih/gi,'do 100 najnovijih').replace(/najnovijih 500/gi,'najnovijih 100').replace(/up to 500 latest/gi,'up to 100 latest').replace(/latest 500/gi,'latest 100');
 out=out.replace(/Stariji višak ostaje spremljen u arhivi\./gi,'Arhiva se čuva do 2.000 zapisa; na granici se uklanja najstarijih 1.000.');
 out=out.replace(/Older overflow remains stored in the archive\./gi,'The archive is retained up to 2,000 items; at the limit, the oldest 1,000 are removed.');
 const canonical=CANONICAL_ROUTES.get(route);
 if(canonical&&!/<link\b[^>]*rel=['"]canonical['"]/i.test(out)){const tag=`<link rel="canonical" href="${canonical}">`;out=out.includes('</head>')?out.replace('</head>',`${tag}</head>`):`${tag}${out}`}
 return out;
}
async function directArticle(request,env){if(!['GET','HEAD'].includes(request.method)||!env.ASSETS?.fetch)return null;const targetPath=NEW_ARTICLES.get(pathOf(request));if(!targetPath)return null;try{const response=await env.ASSETS.fetch(new Request(new URL(targetPath,'https://assets.local').toString(),{method:request.method,headers:request.headers,redirect:'follow'}));if(response.status!==200)return null;const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('location');headers.set('content-type','text/html; charset=utf-8');headers.set('cache-control','public, max-age=120, stale-while-revalidate=300');headers.set('x-gnk-explicit-html-route',`${targetPath}index.html`);headers.set('x-gnk-route-owner',VERSION);return new Response(request.method==='HEAD'?null:await response.text(),{status:200,headers})}catch{return null}}
async function enhance(request,response){if(request.method!=='GET'||![200,401,403,503].includes(response.status))return response;const type=String(response.headers.get('content-type')||'').toLowerCase();if(!type.includes('text/html'))return response;try{const route=pathOf(request);let html=normalizeHtml(await response.text(),route);html=html.replace(/<script[^>]+public-unified-menu-v6\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+public-contrast-hardening-v1\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v6\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-cleanup-v1\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+mail-studio-ui-v28\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+public-unified-menu-v5\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v5\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v1\.js[^>]*><\/script>/gi,'');const scripts=`${isIndex(route)?EDITORIAL:''}${isMailStudio(route)?MAIL_STUDIO:''}${CONTRAST}`;html=html.includes('</body>')?html.replace('</body>',`${scripts}</body>`):`${html}${scripts}`;const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('location');headers.set('content-type','text/html; charset=utf-8');headers.set('x-gnk-public-runtime',VERSION);headers.set('x-gnk-unified-menu-current','disabled-standard-header-in-use');headers.set('x-gnk-contrast','hardened-v1');headers.set('x-gnk-index-editorial',isIndex(route)?'v6-news-100':'not-applicable');headers.set('x-gnk-mail-transport',CONTACT_STUDIO_VERSION);headers.set('x-gnk-html-normalization','legacy-assets-canonical-logo-a11y-news-v2');headers.set('x-gnk-zero-warning-normalization','zero-warning-canonical-logo-a11y-news-v3');headers.set('x-gnk-logo-standard','64x66');if(isMailStudio(route))headers.set('x-gnk-mail-studio-ui','v28-large-composer');return new Response(html,{status:response.status,statusText:response.statusText,headers})}catch{return response}}
export default{
 async fetch(request,env,ctx){const protectedData=await approvalData(request,env,ctx);if(protectedData)return protectedData;const path=pathOf(request);if(handlesContactStudio(path))return handleContactStudio(request,withEmailStatusTracking(env,'contact-form'),ctx,app);const article=await directArticle(request,env);return enhance(request,article||await app.fetch(request,env,ctx))},
 scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
 email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};