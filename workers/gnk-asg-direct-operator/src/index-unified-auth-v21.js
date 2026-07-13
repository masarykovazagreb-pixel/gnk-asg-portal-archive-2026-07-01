import app,{VERSION as BASE_VERSION} from './index-unified-auth-v20.js';
import {handleContactStudio,handlesContactStudio,VERSION as CONTACT_STUDIO_VERSION} from './contact-studio-mail-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V31_ZERO_WARNING_NORMALIZED_${CONTACT_STUDIO_VERSION}_${BASE_VERSION}`;
const MENU='<script defer src="/assets/public-unified-menu-v6.js?v=20260713-full-navigation"></script>';
const CONTRAST='<script defer src="/assets/public-contrast-hardening-v1.js?v=20260713-readable"></script>';
const EDITORIAL='<script defer src="/assets/index-editorial-order-v6.js?v=20260713-news-100"></script><script defer src="/assets/index-editorial-cleanup-v1.js?v=20260713-v6-cleanup"></script>';
const MAIL_STUDIO='<script defer src="/assets/mail-studio-ui-v28.js?v=20260713-large-composer"></script>';
const CANONICAL_LOGO='/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64';
const CANONICAL_ROUTES=new Map([['/about','https://gnk-asg.hr/about/'],['/projects','https://gnk-asg.hr/projects/'],['/the-code/media-memorandum','https://gnk-asg.hr/the-code/media-memorandum/']]);
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
async function directArticle(request,env){if(!['GET','HEAD'].includes(request.method)||!env.ASSETS?.fetch)return null;const targetPath=NEW_ARTICLES.get(pathOf(request));if(!targetPath)return null;try{const response=await env.ASSETS.fetch(new Request(new URL(targetPath,'https://assets.local').toString(),{method:request.method,headers:request.headers,redirect:'manual'}));if(response.status!==200)return null;const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('location');headers.set('content-type','text/html; charset=utf-8');headers.set('cache-control','public, max-age=120, stale-while-revalidate=300');headers.set('x-gnk-explicit-html-route',`${targetPath}index.html`);headers.set('x-gnk-route-owner',VERSION);return new Response(request.method==='HEAD'?null:await response.text(),{status:200,headers})}catch{return null}}
async function enhance(request,response){if(request.method!=='GET'||![200,401,403,503].includes(response.status))return response;const type=String(response.headers.get('content-type')||'').toLowerCase();if(!type.includes('text/html'))return response;try{const route=pathOf(request);let html=normalizeHtml(await response.text(),route);html=html.replace(/<script[^>]+public-unified-menu-v6\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+public-contrast-hardening-v1\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v6\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-cleanup-v1\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+mail-studio-ui-v28\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+public-unified-menu-v5\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v5\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v1\.js[^>]*><\/script>/gi,'');const scripts=`${isIndex(route)?EDITORIAL:''}${isMailStudio(route)?MAIL_STUDIO:''}${CONTRAST}${MENU}`;html=html.includes('</body>')?html.replace('</body>',`${scripts}</body>`):`${html}${scripts}`;const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('location');headers.set('content-type','text/html; charset=utf-8');headers.set('x-gnk-public-runtime',VERSION);headers.set('x-gnk-unified-menu-current','full-v6-workers');headers.set('x-gnk-contrast','hardened-v1');headers.set('x-gnk-index-editorial',isIndex(route)?'v6-news-100':'not-applicable');headers.set('x-gnk-mail-transport',CONTACT_STUDIO_VERSION);headers.set('x-gnk-html-normalization','zero-warning-canonical-logo-a11y-news-v3');headers.set('x-gnk-logo-standard','64x66');if(isMailStudio(route))headers.set('x-gnk-mail-studio-ui','v28-large-composer');return new Response(html,{status:response.status,statusText:response.statusText,headers})}catch{return response}}
export default{
 async fetch(request,env,ctx){const path=pathOf(request);if(handlesContactStudio(path))return handleContactStudio(request,env,ctx,app);const article=await directArticle(request,env);return enhance(request,article||await app.fetch(request,env,ctx))},
 scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
 email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};