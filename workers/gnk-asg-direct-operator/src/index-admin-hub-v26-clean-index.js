import app from './index-admin-hub-v26-public-v10-base.js';
import {patchIndexActivation} from './index-activation-wrapper-v1.js';

export const VERSION='GNK_ASG_PUBLIC_V21_INDEX_PREVIEW_20260627';
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
const V21_STYLE='<link rel="stylesheet" href="/assets/public-unified-v21.css?v=20260627-index-preview-1">';
const V21_SCRIPT='<script defer src="/assets/public-shell-v21.js?v=20260627-index-preview-1"></script>';
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function isEditorial(path){return EDITORIAL_PATHS.has(path)||path.startsWith('/vijesti/')||path.startsWith('/news/')||path.startsWith('/objave/')||path.startsWith('/publications/')}
function patchHeaders(response){const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');return headers}
function addBodyClasses(html,...classes){return html.replace(/<body([^>]*)>/i,(match,attrs)=>{const classMatch=String(attrs).match(/\sclass=(["'])([^"']*)\1/i);if(classMatch){const merged=[...new Set([...classMatch[2].split(/\s+/),...classes].filter(Boolean))].join(' ');return `<body${attrs.replace(classMatch[0],` class=${classMatch[1]}${merged}${classMatch[1]}`)}>`}return `<body${attrs} class="${classes.join(' ')}">`})}
function mobileAdminRedirect(){return new Response(null,{status:303,headers:{location:'/app/?mode=admin','cache-control':'no-store','x-gnk-asg-mobile-app':'STANDARD_ADMIN_V2'}})}
function injectIndexV21(html){
  html=html.replace(/<link[^>]+(?:public-menu-v10|public-unified-v21)\.css[^>]*>/gi,'').replace(/<script[^>]+(?:public-menu-v10|public-shell-v15|public-shell-v21)\.js[^>]*><\/script>/gi,'');
  html=html.replace(/<nav class=["']menu["']>[\s\S]*?<\/nav>/i,'');
  if(!html.includes('public-unified-v21.css'))html=html.replace('</head>',V21_STYLE+'</head>');
  if(!html.includes('public-shell-v21.js'))html=html.replace('</body>',V21_SCRIPT+'</body>');
  return addBodyClasses(html,'gnk-public-design-v21','gnk-public-route-home');
}
async function serveIndex(path,request,env){
  const fallback=new Response('GNK ASG index asset unavailable',{status:503,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  const response=await patchIndexActivation(fallback,path,request,env);
  const headers=patchHeaders(response);
  headers.set('x-gnk-asg-index-isolation','DEDICATED_INDEX_ENTRY_V21');
  headers.set('x-gnk-asg-index-menu','UNIFIED_PUBLIC_SHELL_V21');
  headers.set('x-gnk-asg-index-design','EXECUTIVE_EDITORIAL_V21');
  headers.set('x-gnk-asg-gallery-primary-menu','REMOVED');
  headers.set('x-gnk-asg-index-language-links',path==='/en'?'EN_UNIFIED_V21':'HR_UNIFIED_V21');
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  const html=injectIndexV21(await response.text());
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
async function patchStatusJson(response,path){
  if(!STATUS_JSON_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();const headers=patchHeaders(response);headers.set('content-type','application/json; charset=utf-8');headers.set('x-gnk-asg-active-entrypoint','src/index-admin-hub-v26-clean-index.js');headers.set('x-gnk-asg-public-release',VERSION);
    const corrected={...payload,entryPoint:'src/index-admin-hub-v26-clean-index.js',deployedEntryPoint:'src/index-admin-hub-v26-clean-index.js',publicRelease:VERSION,indexDesign:'EXECUTIVE_EDITORIAL_V21',indexMenu:'UNIFIED_PUBLIC_SHELL_V21',galleryInPrimaryNavigation:false,checkedAt:new Date().toISOString()};
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}
async function patch(response,path,request){
  response=await patchStatusJson(response,path);const htmlResponse=request.method==='GET'&&response.ok&&String(response.headers.get('content-type')||'').includes('text/html');if(!htmlResponse)return response;
  const market=MARKET_PATHS.has(path),editorial=isEditorial(path),contact=CONTACT_PATHS.has(path),docs=DOC_PATHS.has(path),media=path==='/media-kit',application=path==='/media-application',admin=path==='/admin-center',studio=path==='/memorandum-studio',mobile=path==='/app';if(!market&&!editorial&&!contact&&!docs&&!media&&!application&&!admin&&!studio&&!mobile)return response;
  let html=await response.text();const headers=patchHeaders(response);
  if(market){if(!html.includes('markets-v11.css'))html=html.replace('</head>',MARKET_STYLE+'</head>');if(!html.includes('markets-v11.js'))html=html.replace('</body>',MARKET_SCRIPT+'</body>');headers.set('x-gnk-asg-markets-layout','UNIFIED_MARKETS_V11')}
  if(editorial){if(!html.includes('editorial-v12.css'))html=html.replace('</head>',EDITORIAL_STYLE+'</head>');if(!html.includes('editorial-v12.js'))html=html.replace('</body>',EDITORIAL_SCRIPT+'</body>');headers.set('x-gnk-asg-editorial-layout','UNIFIED_EDITORIAL_V12')}
  if(contact){if(!html.includes('contact-v13.css'))html=html.replace('</head>',CONTACT_STYLE+'</head>');if(!html.includes('contact-v13.js'))html=html.replace('</body>',CONTACT_SCRIPT+'</body>');headers.set('x-gnk-asg-contact-layout','UNIFIED_CONTACT_V13')}
  if(docs){if(!html.includes('public-docs-v20.css'))html=html.replace('</head>',DOC_STYLE+'</head>');const kind=path.includes('downloads')?'downloads':'legal';html=addBodyClasses(html,'gnk-docs-v20',`gnk-docs-${kind}`);headers.set('x-gnk-asg-docs-layout',`UNIFIED_${kind.toUpperCase()}_V20`)}
  if(media){if(!html.includes('media-kit-v13.css'))html=html.replace('</head>',MEDIA_STYLE+'</head>');if(!html.includes('media-kit-v13.js'))html=html.replace('</body>',MEDIA_SCRIPT+'</body>')}
  if(application){if(!html.includes('media-application-v14.css'))html=html.replace('</head>',APPLICATION_STYLE+'</head>');if(!html.includes('media-application-v14.js'))html=html.replace('</body>',APPLICATION_SCRIPT+'</body>')}
  if(admin){if(!html.includes('admin-dashboard-v3.css'))html=html.replace('</head>',DASHBOARD_STYLE+'</head>');if(!html.includes('admin-center-memorandum-v1.js'))html=html.replace('</head>',ADMIN_SCRIPT+'</head>');if(!html.includes('admin-dashboard-v3.js'))html=html.replace('</body>',DASHBOARD_SCRIPT+'</body>')}
  if(studio)headers.set('x-gnk-asg-memorandum-studio-page','GNK_ASG_MEMORANDUM_STUDIO_V1_20260627');if(mobile)headers.set('x-gnk-asg-mobile-app','STANDARD_ADMIN_V2');headers.set('x-gnk-asg-public-release',VERSION);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
export default{async fetch(request,env,ctx){const path=pathOf(request);if(request.method==='GET'&&path==='/operator-mobile')return mobileAdminRedirect();if(request.method==='GET'&&INDEX_PATHS.has(path))return serveIndex(path,request,env);return patch(await app.fetch(request,env,ctx),path,request)},async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}};
