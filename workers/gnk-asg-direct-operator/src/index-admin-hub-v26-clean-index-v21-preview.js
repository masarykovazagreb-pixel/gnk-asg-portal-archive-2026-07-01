import app from './index-admin-hub-v27-news-status.js';

export const VERSION='GNK_ASG_PUBLIC_INDEX_INLINE_WHITE_CODE_V24_20260627';
const INDEX_PATHS=new Set(['/','/en']);
const CODE_STYLE='<link rel="stylesheet" href="/assets/index-code-inline-v10.css?v=20260627-v24">';
const CODE_SCRIPT='<script defer src="/assets/index-code-inline-v10.js?v=20260627-v24"></script>';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function headersOf(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');
  headers.set('cloudflare-cdn-cache-control','no-store');
  return headers;
}

function patchIndexHtml(html){
  html=html.replace(/<link[^>]+(?:public-unified-v21|public-index-v21|public-index-v21-controls|index-wow-v4|index-hero-scale-v13)\.css[^>]*>/gi,'');
  html=html.replace(/<script[^>]+(?:public-shell-v21|the-code-stable-v22|index-wow-v4)\.js[^>]*><\/script>/gi,'');
  html=html.replace(/<script[^>]+index-code-cleanup-v8\.js[^>]*><\/script>/gi,'');
  html=html.replace(/<section class=["']code-stage["']/i,'<section class="code-stage code-stage--inline"');
  html=html.replace(
    /<div class=["']code-frame["'] id=["']codeFrame["']>\s*<iframe[\s\S]*?<\/iframe>\s*<\/div>/i,
    '<div class="code-inline-host" id="codeFrame"><div id="codeInlineMount" class="code-inline-mount"></div></div>'
  );
  if(!html.includes('index-code-inline-v10.css'))html=html.replace('</head>',CODE_STYLE+'</head>');
  if(!html.includes('index-code-inline-v10.js'))html=html.replace('</body>',CODE_SCRIPT+'</body>');
  return html;
}

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    const path=pathOf(request);
    if(request.method!=='GET'||!INDEX_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
    const headers=headersOf(response);
    headers.set('x-gnk-asg-index-design','LOCKED_CLEAN_WHITE_INDEX');
    headers.set('x-gnk-asg-index-menu','PRESERVED');
    headers.set('x-gnk-asg-index-hero','BASE_CLEAN_NO_WOW_NO_SCALE');
    headers.set('x-gnk-asg-the-code-player','INLINE_WHITE_GOLD_V10');
    headers.set('x-gnk-asg-index-preview',VERSION);
    return new Response(patchIndexHtml(await response.text()),{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
