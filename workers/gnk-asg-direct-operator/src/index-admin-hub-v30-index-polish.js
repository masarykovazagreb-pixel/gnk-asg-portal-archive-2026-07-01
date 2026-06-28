import app from './index-admin-hub-v29-index-visual-fix.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V30_MENU_CITY_FINANCE_POLISH_20260628';
const INDEX_PATHS=new Set(['/','/en']);
const STYLE='<link rel="stylesheet" href="/assets/index-polish-v30.css?v=20260628-v30">';
const SCRIPT='<script defer src="/assets/index-menu-v30.js?v=20260628-v30"></script>';

function pathOf(request){
  return new URL(request.url).pathname.replace(/\/+$/,'')||'/';
}

function headersFor(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');
  headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('x-gnk-asg-active-entrypoint','src/index-admin-hub-v30-index-polish.js');
  headers.set('x-gnk-asg-index-polish',VERSION);
  headers.set('x-gnk-asg-index-menu','NO_MARKETS_ADMIN_RETAINED');
  return headers;
}

function patchIndex(html){
  html=html
    .replace(/<a\b[^>]*href=["']\/(?:trzista|markets)\/?["'][^>]*>[\s\S]*?<\/a>/gi,'')
    .replace(/<a\b[^>]*>[\s]*(?:Tržišta|Trzista|Markets)[\s]*<\/a>/gi,'');
  if(!html.includes('index-polish-v30.css'))html=html.replace('</head>',`${STYLE}</head>`);
  if(!html.includes('index-menu-v30.js'))html=html.replace('</body>',`${SCRIPT}</body>`);
  return html;
}

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    const path=pathOf(request);
    if(request.method!=='GET'||!INDEX_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
    const html=patchIndex(await response.text());
    return new Response(html,{status:response.status,statusText:response.statusText,headers:headersFor(response)});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
