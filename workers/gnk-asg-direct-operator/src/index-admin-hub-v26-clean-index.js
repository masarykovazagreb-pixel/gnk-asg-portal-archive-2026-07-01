import app from './index-admin-hub-v26-public-v10-base.js';

export const VERSION='GNK_ASG_PUBLIC_V11_MENU_AI_MARKETS_20260627';
const MARKET_PATHS=new Set(['/trzista','/markets']);
const STYLE='<link rel="stylesheet" href="/assets/markets-v11.css?v=20260627-v11">';
const SCRIPT='<script defer src="/assets/markets-v11.js?v=20260627-v11"></script>';
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
async function patch(response,path,request){
  if(request.method!=='GET'||!MARKET_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('markets-v11.css'))html=html.replace('</head>',STYLE+'</head>');
  if(!html.includes('markets-v11.js'))html=html.replace('</body>',SCRIPT+'</body>');
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('x-gnk-asg-markets-layout','UNIFIED_MARKETS_V11');headers.set('x-gnk-asg-public-release',VERSION);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
export default{
  async fetch(request,env,ctx){return patch(await app.fetch(request,env,ctx),pathOf(request),request)},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
