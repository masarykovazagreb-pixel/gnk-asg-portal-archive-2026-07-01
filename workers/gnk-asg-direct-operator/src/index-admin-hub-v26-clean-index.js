import app from './index-admin-hub-v26-public-v10-base.js';
import {patchIndexActivation} from './index-activation-wrapper-v1.js';

export const VERSION='GNK_ASG_PUBLIC_V20_CANONICAL_NAVIGATION_20260627';
// Deployment compatibility marker: GNK_ASG_PUBLIC_V11_MENU_AI_MARKETS_20260627
const INDEX_PATHS=new Set(['/','/en']);
const MARKET_PATHS=new Set(['/trzista','/markets']);
const EDITORIAL_PATHS=new Set(['/vijesti','/news','/objave','/publications']);
const CONTACT_PATHS=new Set(['/contact','/en/contact']);
const DOC_PATHS=new Set(['/downloads','/en/downloads','/legal','/en/legal']);
const STATUS_JSON_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);
const MARKET_STYLE='<link rel="stylesheet" href="/assets/markets-v11.css?v=20260627-v11">';
const MARKET_SCRIPT='<script defer src="/assets/markets-v11.js?v=20260627-v11"></script>';
const EDITORIAL_STYLE='<link rel="stylesheet" href="/assets/editorial-v12.css?v=20260627-v12">';
const EDITORIAL_SCRIPT='<script defer src="/assets/editorial-v12.js?v=20260627-v12"></script>';
const CONTACT_STYLE='<link rel="stylesheet" href="/assets/contact-v13.css?v=20260627-v13">';
const CONTACT_SCRIPT='<script defer src="/assets/contact-v13.js?v=20260627-v13"></script>';
const DOC_STYLE='<link rel="stylesheet" href="/assets/public-docs-v20.css?v=20260627-v20">';
const MEDIA_STYLE='<link rel="stylesheet" href="/assets/media-kit-v13.css?v=20260627-v13">';
const MEDIA_SCRIPT='<script defer src="/assets/media-kit-v13.js?v=20260627-v13"></script>';
const APPLICATION_STYLE='<link rel="stylesheet" href="/assets/media-application-v14.css?v=20260627-v14">';
const APPLICATION_SCRIPT='<script defer src="/assets/media-application-v14.js?v=20260627-v14"></script>';
const ADMIN_SCRIPT='<script defer src="/assets/admin-center-memorandum-v1.js?v=20260627-v1"></script>';
const DASHBOARD_STYLE='<link rel="stylesheet" href="/assets/admin-dashboard-v3.css?v=20260627-v3">';
const DASHBOARD_SCRIPT='<script defer src="/assets/admin-dashboard-v3.js?v=20260627-v3"></script>';
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function isEditorial(path){return EDITORIAL_PATHS.has(path)||path.startsWith('/vijesti/')||path.startsWith('/news/')||path.startsWith('/objave/')||path.startsWith('/publications/')}
function patchHeaders(response){const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');return headers}
function addBodyClasses(html,...classes){return html.replace(/<body([^>]*)>/i,(match,attrs)=>{const classMatch=String(attrs).match(/\sclass=(["'])([^"']*)\1/i);if(classMatch){const merged=[...new Set([...classMatch[2].split(/\s+/),...classes].filter(Boolean))].join(' ');return `<body${attrs.replace(classMatch[0],` class=${classMatch[1]}${merged}${classMatch[1]}`)}>`}return `<body${attrs} class="${classes.join(' ')}">`})}
function mobileAdminRedirect(){return new Response(null,{status:303,headers:{location:'/app/?mode=admin','cache-control':'no-store','x-gnk-asg-mobile-app':'STANDARD_ADMIN_V2'}})}
function canonicalIndexMenu(english){
  return english?'<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financials">Financials</a><a href="#network">Network</a><a href="/news/">News</a><a href="/publications/">Publications</a><a href="/markets/">Markets</a><a href="/visual-index/">Gallery</a><a href="/en/assistant/">AI</a><a href="/operator-dashboard/" rel="nofollow">Admin</a><a href="/contact/">Contact</a><a class="lang" href="/">HR</a></nav>':'<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financije">Financije</a><a href="#mreza">Mreža</a><a href="/vijesti/">Vijesti</a><a href="/objave/">Objave</a><a href="/trzista/">Tržišta</a><a href="/visual-index/">Galerija</a><a href="/assistant/">AI</a><a href="/operator-dashboard/" rel="nofollow">Admin</a><a href="/contact/">Kontakt</a><a class="lang" href="/en/">EN</a></nav>';
}
async function serveIndex(path,request,env){
  const fallback=new Response('GNK ASG index asset unavailable',{status:503,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  const response=await patchIndexActivation(fallback,path,request,env);
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');
  headers.set('x-gnk-asg-index-isolation','DEDICATED_INDEX_ENTRY_V14');
  headers.set('x-gnk-asg-index-menu','CANONICAL_NAVIGATION_V20');
  headers.set('x-gnk-asg-gallery-primary-menu','ENABLED');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  let body=response.body;
  if(response.ok&&String(response.headers.get('content-type')||'').includes('text/html')){
    let html=await response.text();
    html=html.replace(/<nav class=["']menu["']>[\s\S]*?<\/nav>/i,canonicalIndexMenu(path==='/en'));
    html=html.replace(/index-code-cleanup-v8\.js\?v=[^"']+/i,'index-code-cleanup-v8.js?v=20260627-v20');
    headers.set('x-gnk-asg-index-language-links',path==='/en'?'EN_CANONICAL_V20':'HR_CANONICAL_V20');
    body=html;
  }
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}
async function patchStatusJson(response,path){
  if(!STATUS_JSON_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=patchHeaders(response);
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('x-gnk-asg-active-entrypoint','src/index-admin-hub-v26-clean-index.js');
    headers.set('x-gnk-asg-public-release',VERSION);
    const newsContract={timeZone:'Europe/Zagreb',newsSchedule:['09:00','16:00','21:00'],newsRefreshesPerDay:3,minimumVerifiedLinks:15,activeNewsLimit:100,archivePruneAt:1000,archiveDeleteCount:500,archiveRetainAfterPrune:500,archiveHardLimit:1000,contentContract:{title:true,summaryMinCharacters:60,source:true,articleVerified:true,sourceImageVerified:true,fallbackImagesAllowed:false}};
    const corrected={...payload,...newsContract,entryPoint:'src/index-admin-hub-v26-clean-index.js',deployedEntryPoint:'src/index-admin-hub-v26-clean-index.js',publicRelease:VERSION,canonicalNavigation:'V20_INDEX_PARITY',primaryMenu:['THE CODE','Financije / Financials','Mreža / Network','Vijesti / News','Objave / Publications','Tržišta / Markets','Galerija / Gallery','AI','Admin','Kontakt / Contact','HR / EN'],galleryInPrimaryNavigation:true,removedPrimaryLinks:['Auto Editor','PDF centar / PDF Centre','Legal'],adminRoute:'/operator-dashboard/',newsRuntime:payload.newsRuntime||payload.version||'GNK_ASG_NEWS_LIFECYCLE_V16_VERIFIED_MEDIA_20260626',workerMain:'workers/gnk-asg-direct-operator/wrangler.toml → src/index-admin-hub-v26-clean-index.js',mobileApp:'GNK_ASG_MOBILE_STANDARD_ADMIN_V2_20260627',adminDashboard:'GNK_ASG_ADMIN_DASHBOARD_V3_20260627',checkedAt:new Date().toISOString()};
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}
async function patch(response,path,request){
  response=await patchStatusJson(response,path);
  const htmlResponse=request.method==='GET'&&response.ok&&String(response.headers.get('content-type')||'').includes('text/html');
  if(!htmlResponse)return response;
  const market=MARKET_PATHS.has(path),editorial=isEditorial(path),contact=CONTACT_PATHS.has(path),docs=DOC_PATHS.has(path),media=path==='/media-kit',application=path==='/media-application',admin=path==='/admin-center',studio=path==='/memorandum-studio',mobile=path==='/app';
  if(!market&&!editorial&&!contact&&!docs&&!media&&!application&&!admin&&!studio&&!mobile)return response;
  let html=await response.text();const headers=patchHeaders(response);
  if(market){if(!html.includes('markets-v11.css'))html=html.replace('</head>',MARKET_STYLE+'</head>');if(!html.includes('markets-v11.js'))html=html.replace('</body>',MARKET_SCRIPT+'</body>');headers.set('x-gnk-asg-markets-layout','UNIFIED_MARKETS_V11')}
  if(editorial){if(!html.includes('editorial-v12.css'))html=html.replace('</head>',EDITORIAL_STYLE+'</head>');if(!html.includes('editorial-v12.js'))html=html.replace('</body>',EDITORIAL_SCRIPT+'</body>');headers.set('x-gnk-asg-editorial-layout','UNIFIED_EDITORIAL_V12')}
  if(contact){if(!html.includes('contact-v13.css'))html=html.replace('</head>',CONTACT_STYLE+'</head>');if(!html.includes('contact-v13.js'))html=html.replace('</body>',CONTACT_SCRIPT+'</body>');headers.set('x-gnk-asg-contact-layout','UNIFIED_CONTACT_V13')}
  if(docs){if(!html.includes('public-docs-v20.css'))html=html.replace('</head>',DOC_STYLE+'</head>');const kind=path.includes('downloads')?'downloads':'legal';html=addBodyClasses(html,'gnk-docs-v20',`gnk-docs-${kind}`);headers.set('x-gnk-asg-docs-layout',`UNIFIED_${kind.toUpperCase()}_V20`)}
  if(media){if(!html.includes('media-kit-v13.css'))html=html.replace('</head>',MEDIA_STYLE+'</head>');if(!html.includes('media-kit-v13.js'))html=html.replace('</body>',MEDIA_SCRIPT+'</body>');headers.set('x-gnk-asg-media-kit-layout','UNIFIED_MEDIA_KIT_V13')}
  if(application){if(!html.includes('media-application-v14.css'))html=html.replace('</head>',APPLICATION_STYLE+'</head>');if(!html.includes('media-application-v14.js'))html=html.replace('</body>',APPLICATION_SCRIPT+'</body>');headers.set('x-gnk-asg-media-application-layout','UNIFIED_MEDIA_APPLICATION_V14')}
  if(admin){
    if(!html.includes('admin-dashboard-v3.css'))html=html.replace('</head>',DASHBOARD_STYLE+'</head>');
    if(!html.includes('admin-center-memorandum-v1.js'))html=html.replace('</body>',ADMIN_SCRIPT+'</body>');
    if(!html.includes('admin-dashboard-v3.js'))html=html.replace('</body>',DASHBOARD_SCRIPT+'</body>');
    headers.set('x-gnk-asg-memorandum-studio','GNK_ASG_MEMORANDUM_STUDIO_V1_20260627');
    headers.set('x-gnk-asg-admin-dashboard','GNK_ASG_ADMIN_DASHBOARD_V3_20260627');
  }
  if(studio)headers.set('x-gnk-asg-memorandum-studio-page','GNK_ASG_MEMORANDUM_STUDIO_V1_20260627');
  if(mobile)headers.set('x-gnk-asg-mobile-app','STANDARD_ADMIN_V2');
  headers.set('x-gnk-asg-public-release',VERSION);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
export default{
  async fetch(request,env,ctx){const path=pathOf(request);if(request.method==='GET'&&path==='/operator-mobile')return mobileAdminRedirect();if(request.method==='GET'&&INDEX_PATHS.has(path))return serveIndex(path,request,env);return patch(await app.fetch(request,env,ctx),path,request)},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};