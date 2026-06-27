import app from './index-admin-hub-v26-clean-index.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V27_NEWS_STATUS_20260627_R6_LOCKED_INDEX_MENU';
const ENTRYPOINT='src/index-admin-hub-v27-news-status.js';
const PREVIOUS_ENTRYPOINT='src/index-admin-hub-v26-clean-index.js';
const NEWS_RUNTIME='GNK_ASG_NEWS_LIFECYCLE_V16_VERIFIED_MEDIA_20260626';
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);
const INDEX_PATHS=new Set(['/','/en']);
const ADMIN_MODULES=new Set(['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/media-command-center','/memorandum-studio']);
const MODULE_LOADER_SCRIPT='<script defer src="/assets/admin-module-loader-v3.js?v=20260627-v4"></script>';
const HERO_SCALE_STYLE='<link rel="stylesheet" href="/assets/index-hero-scale-v13.css?v=20260627-v13">';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function noStore(headers){headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.delete('last-modified');headers.set('content-type','application/json; charset=utf-8');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');return headers}
function sameOriginCsp(value){
  const directives=String(value||'').split(';').map(item=>item.trim()).filter(Boolean).filter(item=>!/^frame-ancestors\b/i.test(item));
  directives.push("frame-ancestors 'self'");
  return directives.join('; ');
}
function lockedIndexMenu(english){
  return english
    ? '<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financials">Financials</a><a href="#network">Network</a><a href="/news/">News</a><a href="/publications/">Publications</a><a href="/markets/">Markets</a><a href="/visual-index/">Gallery</a><a href="/en/assistant/">AI</a><a href="/operator-dashboard/">Admin</a><a href="/contact/">Contact</a><a class="lang" href="/">HR</a></nav>'
    : '<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financije">Financije</a><a href="#mreza">Mreža</a><a href="/vijesti/">Vijesti</a><a href="/objave/">Objave</a><a href="/trzista/">Tržišta</a><a href="/visual-index/">Galerija</a><a href="/assistant/">AI</a><a href="/operator-dashboard/">Admin</a><a href="/contact/">Kontakt</a><a class="lang" href="/en/">EN</a></nav>';
}
async function patchStatus(response,path){
  if(!STATUS_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=noStore(new Headers(response.headers));
    headers.set('x-gnk-asg-active-entrypoint',ENTRYPOINT);
    headers.set('x-gnk-asg-news-runtime',NEWS_RUNTIME);
    const corrected={...payload,entryPoint:ENTRYPOINT,deployedEntryPoint:ENTRYPOINT,previousEntryPoint:PREVIOUS_ENTRYPOINT,newsRuntime:NEWS_RUNTIME,workerMain:`workers/gnk-asg-direct-operator/wrangler.toml → ${ENTRYPOINT}`,timeZone:'Europe/Zagreb',newsSchedule:['09:00','16:00','21:00'],newsRefreshesPerDay:3,activeNewsLimit:100,archivePruneAt:1000,archiveDeleteCount:500,archiveRetainAfterPrune:500,archiveHardLimit:1000,contentContract:{title:true,summaryMinCharacters:60,source:true,articleVerified:true,sourceImageVerified:true,fallbackImagesAllowed:false},indexHeroScale:'50_PERCENT_V13',indexMenu:'LOCKED_INDEX_MENU',adminEmbed:'SAME_ORIGIN_ALLOWED',adminLoader:'RESILIENT_ROUTE_VALIDATION_V4',adminAudit:'ALL_MODULES_WITH_10_SECOND_TIMEOUT',statusWrapper:VERSION,checkedAt:new Date().toISOString()};
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response}
}
async function patchIndexHtml(response,path,request){
  if(request.method!=='GET'||!INDEX_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-hero-scale','50_PERCENT_V13');
  headers.set('x-gnk-asg-index-menu','LOCKED_INDEX_MENU');
  headers.set('x-gnk-asg-gallery-primary-menu','INCLUDED');
  let html=await response.text();
  html=html.replace(/<nav class=["']menu["']>[\s\S]*?<\/nav>/i,lockedIndexMenu(path==='/en'));
  if(!html.includes('index-hero-scale-v13.css'))html=html.replace('</head>',`${HERO_SCALE_STYLE}</head>`);
  html=html.replace(/index-code-cleanup-v8\.js\?v=[^"']+/i,'index-code-cleanup-v8.js?v=20260627-v13');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
async function patchAdminHtml(response,path,request){
  if(request.method!=='GET'||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const url=new URL(request.url);
  const embedded=url.searchParams.get('embedded')==='1';
  const adminCenter=path==='/admin-center';
  if(!adminCenter&&!(embedded&&ADMIN_MODULES.has(path)))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('x-frame-options');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('content-security-policy',sameOriginCsp(headers.get('content-security-policy')));
  headers.set('x-gnk-asg-admin-embed',embedded?'SAME_ORIGIN_ALLOWED':'ADMIN_CENTER');
  let html=await response.text();
  if(adminCenter){
    html=html.replace(/admin-center-health-v1\.js\?v=[^"']+/i,'admin-center-health-v1.js?v=20260627-v2');
    if(!html.includes('admin-module-loader-v3.js'))html=html.replace('</body>',`${MODULE_LOADER_SCRIPT}</body>`);
  }
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){const path=pathOf(request);let response=await app.fetch(request,env,ctx);response=await patchStatus(response,path);response=await patchIndexHtml(response,path,request);return patchAdminHtml(response,path,request)},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
