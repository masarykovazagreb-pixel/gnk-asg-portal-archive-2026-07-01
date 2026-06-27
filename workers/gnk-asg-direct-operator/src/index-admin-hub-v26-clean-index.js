import app from './index-admin-hub-v26-public-v10-base.js';
import {patchIndexActivation} from './index-activation-wrapper-v1.js';

export const VERSION='GNK_ASG_PUBLIC_V14_INDEX_NATIVE_MENU_HR_EN_20260627';
// Deployment compatibility marker: GNK_ASG_PUBLIC_V11_MENU_AI_MARKETS_20260627
const INDEX_PATHS=new Set(['/','/en']);
const MARKET_PATHS=new Set(['/trzista','/markets']);
const STYLE='<link rel="stylesheet" href="/assets/markets-v11.css?v=20260627-v11">';
const SCRIPT='<script defer src="/assets/markets-v11.js?v=20260627-v11"></script>';
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
async function serveIndex(path,request,env){
  const fallback=new Response('GNK ASG index asset unavailable',{status:503,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  const response=await patchIndexActivation(fallback,path,request,env);
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-index-isolation','DEDICATED_INDEX_ENTRY_V14');
  headers.set('x-gnk-asg-index-menu','NATIVE_INDEX_MENU_ONLY');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function patch(response,path,request){
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
    return patch(await app.fetch(request,env,ctx),path,request);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
