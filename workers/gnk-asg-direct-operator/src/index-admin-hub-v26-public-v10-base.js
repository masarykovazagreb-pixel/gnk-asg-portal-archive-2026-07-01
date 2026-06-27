import app from './index-admin-hub-v25-mail-smoke.js';
import {patchIndexActivation} from './index-activation-wrapper-v1.js';
import {handlePublicAi,API_PATH as PUBLIC_AI_PATH,VERSION as PUBLIC_AI_VERSION} from './public-ai-v10.js';
export const VERSION='GNK_ASG_ADMIN_HUB_V26_PUBLIC_SHELL_V21_20260627';
const MEDIA_STYLE='<link rel="stylesheet" href="/assets/media-application-code-v2.css?v=20260627-v2">';
const MEDIA_SCRIPT='<script defer src="/assets/media-application-code-v2.js?v=20260627-v2"></script>';
const UNIFIED_STYLE='<link rel="stylesheet" href="/assets/public-unified-v21.css?v=20260627-v21">';
const UNIFIED_SCRIPT='<script defer src="/assets/public-shell-v15.js?v=20260627-v21"></script>';
const DEBUG_PATH='/data/luxury-index-debug.json',MEDIA_PATH='/media-application';
const CODE_PATHS=new Set(['/the-code','/the-code/index.html']);
const INDEX_PATHS=new Set(['/','/en']);
const DIRECT_PUBLIC_ASSETS=new Map([
  ['/publications','/publications/index.html'],
  ['/en/contact','/en/contact/index.html'],
  ['/downloads','/downloads/index.html'],
  ['/en/downloads','/en/downloads/index.html'],
  ['/legal','/legal/index.html'],
  ['/en/legal','/en/legal/index.html'],
  ['/assistant','/assistant/index.html'],
  ['/en/assistant','/en/assistant/index.html']
]);
const PUBLIC_EXACT=new Set([
  '/assistant','/en/assistant','/trzista','/markets','/vijesti','/news','/objave','/publications',
  '/contact','/en/contact','/media-kit','/media-kit-2026','/media-application','/legal','/en/legal',
  '/visual-index','/downloads','/en/downloads','/app','/nermin-sefic','/en/nermin-sefic'
]);
const PUBLIC_PREFIXES=[
  '/objave/','/publications/','/vijesti/','/news/','/media-kit/','/media-kit-2026/','/downloads/',
  '/en/downloads/','/legal/','/en/legal/','/visual-index/','/nermin-sefic/','/en/nermin-sefic/'
];
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function aliasRequest(request,path){const url=new URL(request.url);url.pathname=path;return new Request(url.toString(),request)}
function isPublicPath(path){return PUBLIC_EXACT.has(path)||PUBLIC_PREFIXES.some(prefix=>path.startsWith(prefix))}
function noStore(headers){headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.delete('last-modified');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('cdn-cache-control','no-store');headers.set('cloudflare-cdn-cache-control','no-store');headers.set('pragma','no-cache');headers.set('expires','0');headers.set('vary','Accept-Encoding, Cookie');return headers}
function aliasResponse(response,alias){const headers=noStore(new Headers(response.headers));headers.set('x-gnk-asg-news-alias',alias);return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function removeLegacyShell(html){return html.replace(/<link[^>]+(?:public-menu-v10|public-unified-v21)\.css[^>]*>/gi,'').replace(/<script[^>]+(?:public-menu-v10|public-shell-v15)\.js[^>]*><\/script>/gi,'')}
function injectUnifiedShell(html,{script=true}={}){html=removeLegacyShell(html);if(!html.includes('public-unified-v21.css'))html=html.replace('</head>',UNIFIED_STYLE+'</head>');if(script&&!html.includes('public-shell-v15.js'))html=html.replace('</body>',UNIFIED_SCRIPT+'</body>');return html}
async function directCode(request,env){
  if(!env.ASSETS?.fetch)return new Response('THE CODE asset binding missing',{status:503});
  const response=await env.ASSETS.fetch(new Request(new URL('/the-code/index.html',request.url),{method:'GET'}));
  const headers=noStore(new Headers(response.headers));headers.set('content-type','text/html; charset=utf-8');headers.set('x-gnk-asg-the-code','CLEAN_STANDALONE_HTML_V21');headers.set('x-gnk-asg-public-design','UNIFIED_PUBLIC_DESIGN_V21_NO_INTERNAL_MENU');
  let html=await response.text();html=injectUnifiedShell(html,{script:false});html=html.replace(/<body([^>]*)>/i,(match,attrs)=>`<body${attrs} class="gnk-public-design-v21 gnk-public-route-code">`);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
async function fetchPublicBase(request,env,ctx,path){const assetPath=DIRECT_PUBLIC_ASSETS.get(path);if(request.method==='GET'&&assetPath&&env.ASSETS?.fetch){const response=await env.ASSETS.fetch(aliasRequest(request,assetPath));if(response.ok)return response}return app.fetch(request,env,ctx)}
async function diagnostic(request,env){const check=async path=>{try{if(!env.ASSETS?.fetch)return{path,status:0,ok:false,error:'ASSETS_BINDING_MISSING'};const response=await env.ASSETS.fetch(new Request(new URL(path,request.url)));const text=await response.text();return{path,status:response.status,ok:response.ok,contentType:response.headers.get('content-type')||'',bytes:text.length}}catch(error){return{path,status:0,ok:false,error:String(error?.message||error)}}};const paths=['/assistant/index.html','/en/assistant/index.html','/publications/index.html','/en/contact/index.html','/downloads/index.html','/en/downloads/index.html','/legal/index.html','/en/legal/index.html','/assets/public-unified-v21.css','/assets/public-shell-v15.js','/assets/editorial-v12.css','/assets/editorial-v12.js','/data/assistant-knowledge.json','/the-code/index.html','/index-white-static-preview-v2.html','/en/index-white-static-preview-v2.html'];return new Response(JSON.stringify({ok:true,version:VERSION,indexTemplate:'GNK_ASG_PUBLIC_INDEX_V9_HR_EN_20260627',indexMenu:'UNIFIED_PUBLIC_SHELL_V21',publicShell:'GNK_ASG_PUBLIC_SHELL_V21_20260627',publicDesign:'GNK_ASG_UNIFIED_PUBLIC_DESIGN_V21',publicAi:PUBLIC_AI_VERSION,assets:await Promise.all(paths.map(check))},null,2),{headers:noStore(new Headers({'content-type':'application/json; charset=utf-8'}))})}
async function patchIndex(response,path,request){if(request.method!=='GET'||!INDEX_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;const headers=noStore(new Headers(response.headers));headers.set('x-gnk-asg-index-clean-layout',VERSION);headers.set('x-gnk-asg-index-release','PUBLIC_V21_UNIFIED_DESIGN');headers.set('x-gnk-asg-index-menu','UNIFIED_PUBLIC_SHELL_V21');let html=injectUnifiedShell(await response.text());return new Response(html,{status:response.status,statusText:response.statusText,headers})}
async function patchPublicUi(response,path,request){if(request.method!=='GET'||INDEX_PATHS.has(path)||!isPublicPath(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;const headers=noStore(new Headers(response.headers));headers.set('x-gnk-asg-public-menu','UNIFIED_PUBLIC_SHELL_V21');headers.set('x-gnk-asg-public-design','GNK_ASG_UNIFIED_PUBLIC_DESIGN_V21');headers.set('x-gnk-asg-public-ai',PUBLIC_AI_VERSION);headers.set('x-gnk-asg-public-route-owner',VERSION);const html=injectUnifiedShell(await response.text());return new Response(html,{status:response.status,statusText:response.statusText,headers})}
async function patchMediaApplication(response,path,request){if(request.method!=='GET'||path!==MEDIA_PATH||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;const headers=noStore(new Headers(response.headers));headers.set('x-gnk-asg-media-layout','THE_CODE_NARROW_V2_UNIFIED_V21');let html=await response.text();if(!html.includes('media-application-code-v2.css'))html=html.replace('</head>',MEDIA_STYLE+'</head>');if(!html.includes('media-application-code-v2.js'))html=html.replace('</body>',MEDIA_SCRIPT+'</body>');return new Response(html,{status:response.status,statusText:response.statusText,headers})}
export default{async fetch(request,env,ctx){const path=pathOf(request);if(path===PUBLIC_AI_PATH)return handlePublicAi(request,env);if(request.method==='GET'&&CODE_PATHS.has(path))return directCode(request,env);if(request.method==='GET'&&path===DEBUG_PATH)return diagnostic(request,env);if(request.method==='GET'&&path==='/data/news-feed.json')return aliasResponse(await app.fetch(aliasRequest(request,'/data/news.json'),env,ctx),'news-feed-to-news-json');if(request.method==='GET'&&path==='/data/news_archive.json')return aliasResponse(await app.fetch(aliasRequest(request,'/data/news-archive.json'),env,ctx),'news-archive-underscore-to-hyphen');let response=await fetchPublicBase(request,env,ctx,path);response=await patchIndexActivation(response,path,request,env);response=await patchIndex(response,path,request);response=await patchMediaApplication(response,path,request);response=await patchPublicUi(response,path,request);return response},async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}};
