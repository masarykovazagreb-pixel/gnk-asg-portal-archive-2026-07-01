import app from './index-admin-hub-v26-public-v10-base.js';

export const VERSION='GNK_ASG_PUBLIC_V12_MENU_AI_MARKETS_EDITORIAL_20260627';
const MARKET_PATHS=new Set(['/trzista','/markets']);
const EDITORIAL_PATHS=new Set(['/vijesti','/news','/objave']);
const MARKET_STYLE='<link rel="stylesheet" href="/assets/markets-v11.css?v=20260627-v11">';
const MARKET_SCRIPT='<script defer src="/assets/markets-v11.js?v=20260627-v11"></script>';
const EDITORIAL_STYLE='<link rel="stylesheet" href="/assets/editorial-v12.css?v=20260627-v12">';
const EDITORIAL_SCRIPT='<script defer src="/assets/editorial-v12.js?v=20260627-v12"></script>';
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function isEditorial(path){return EDITORIAL_PATHS.has(path)||path.startsWith('/vijesti/')||path.startsWith('/news/')||path.startsWith('/objave/')}
function patchHeaders(response){const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');return headers}
async function patch(response,path,request){
  const htmlResponse=request.method==='GET'&&response.ok&&String(response.headers.get('content-type')||'').includes('text/html');
  if(!htmlResponse)return response;
  const market=MARKET_PATHS.has(path),editorial=isEditorial(path);
  if(!market&&!editorial)return response;
  let html=await response.text();
  const headers=patchHeaders(response);
  if(market){if(!html.includes('markets-v11.css'))html=html.replace('</head>',MARKET_STYLE+'</head>');if(!html.includes('markets-v11.js'))html=html.replace('</body>',MARKET_SCRIPT+'</body>');headers.set('x-gnk-asg-markets-layout','UNIFIED_MARKETS_V11')}
  if(editorial){if(!html.includes('editorial-v12.css'))html=html.replace('</head>',EDITORIAL_STYLE+'</head>');if(!html.includes('editorial-v12.js'))html=html.replace('</body>',EDITORIAL_SCRIPT+'</body>');headers.set('x-gnk-asg-editorial-layout','UNIFIED_EDITORIAL_V12')}
  headers.set('x-gnk-asg-public-release',VERSION);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
export default{
  async fetch(request,env,ctx){return patch(await app.fetch(request,env,ctx),pathOf(request),request)},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
