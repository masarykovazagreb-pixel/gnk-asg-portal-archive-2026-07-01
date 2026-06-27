import app from './index-admin-hub-v26-public-v10-base.js';
import {patchIndexActivation} from './index-activation-wrapper-v1.js';

export const VERSION='GNK_ASG_PUBLIC_V15_BACKEND_FLOAT_DEDUPE_20260627';
// Deployment compatibility marker: GNK_ASG_PUBLIC_V11_MENU_AI_MARKETS_20260627
const INDEX_PATHS=new Set(['/','/en']);
const MARKET_PATHS=new Set(['/trzista','/markets']);
const PRIVATE_PREFIXES=['/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/media-command-center','/operator'];
const STYLE='<link rel="stylesheet" href="/assets/markets-v11.css?v=20260627-v11">';
const SCRIPT='<script defer src="/assets/markets-v11.js?v=20260627-v11"></script>';
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function isPrivate(path){return PRIVATE_PREFIXES.some(prefix=>path===prefix||path.startsWith(prefix+'/'))}
async function serveIndex(path,request,env){
  const fallback=new Response('GNK ASG index asset unavailable',{status:503,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  const response=await patchIndexActivation(fallback,path,request,env);
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-index-isolation','DEDICATED_INDEX_ENTRY_V15');
  headers.set('x-gnk-asg-index-menu','NATIVE_INDEX_MENU_ONLY');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function patchPrivateUi(response,path,request){
  if(request.method!=='GET'||!isPrivate(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  html=html
    .replace(/<script[^>]+src=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<link[^>]+href=["'][^"']*\/assets\/brand\/gnk-asg-global-layer\.css[^"']*["'][^>]*>/gi,'')
    .replace(/<script[^>]+src=["'][^"']*\/assets\/(?:public-floating-home-v16|public-ai-badge-guard-v17|public-menu-v13|index-public-v7)\.js[^"']*["'][^>]*><\/script>/gi,'')
    .replace(/<style[^>]+id=["']gnk-asg-single-ai-button-style["'][^>]*>[\s\S]*?<\/style>/gi,'')
    .replace(/<script[^>]+id=["']gnk-asg-single-ai-button-script["'][^>]*>[\s\S]*?<\/script>/gi,'');
  const url=new URL(request.url);
  const embedded=request.headers.get('sec-fetch-dest')==='iframe'||url.searchParams.get('embedded')==='1'||url.searchParams.get('standalone')==='1';
  if(embedded){
    html=html
      .replace(/<script[^>]+src=["'][^"']*\/assets\/public-menu-v10\.js[^"']*["'][^>]*><\/script>/gi,'')
      .replace(/<link[^>]+href=["'][^"']*\/assets\/public-menu-v10\.css[^"']*["'][^>]*>/gi,'');
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate,max-age=0');
  headers.set('x-gnk-asg-backend-floating-actions',embedded?'EMBEDDED_NONE_V1':'SINGLE_PAIR_V1');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
async function patchMarkets(response,path,request){
  if(request.method!=='GET'||!MARKET_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('markets-v11.css'))html=html.replace('</head>',STYLE+'</head>');
  if(!html.includes('markets-v11.js'))html=html.replace('</body>',SCRIPT+'</body>');
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate,max-age=0');headers.set('x-gnk-asg-markets-layout','UNIFIED_MARKETS_V11');headers.set('x-gnk-asg-public-release',VERSION);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(request.method==='GET'&&INDEX_PATHS.has(path))return serveIndex(path,request,env);
    let response=await app.fetch(request,env,ctx);
    response=await patchPrivateUi(response,path,request);
    return patchMarkets(response,path,request);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
