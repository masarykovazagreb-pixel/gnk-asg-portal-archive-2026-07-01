import app from './index-admin-hub-v26-clean-index.js';

export const VERSION='GNK_ASG_PUBLIC_V21_INDEX_PREVIEW_20260627';
const INDEX_PATHS=new Set(['/','/en']);
const STYLE='<link rel="stylesheet" href="/assets/public-unified-v21.css?v=20260627-v21"><link rel="stylesheet" href="/assets/public-index-v21.css?v=20260627-v21"><link rel="stylesheet" href="/assets/public-index-v21-controls.css?v=20260627-v21">';
const SCRIPT='<script defer src="/assets/public-shell-v21.js?v=20260627-v21"></script>';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function headersOf(response){const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.delete('last-modified');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('cdn-cache-control','no-store');headers.set('cloudflare-cdn-cache-control','no-store');return headers}
function addBodyClass(html){return html.replace(/<body([^>]*)>/i,(match,attrs)=>{const classMatch=String(attrs).match(/\sclass=(["'])([^"']*)\1/i);if(classMatch){const classes=[...new Set([...classMatch[2].split(/\s+/),'gnk-public-design-v21','gnk-public-route-home'].filter(Boolean))].join(' ');return `<body${attrs.replace(classMatch[0],` class=${classMatch[1]}${classes}${classMatch[1]}`)}>`}return `<body${attrs} class="gnk-public-design-v21 gnk-public-route-home">`})}
function patchIndexHtml(html){
  html=html.replace(/<link[^>]+(?:public-menu-v10|public-unified-v21|public-index-v21|public-index-v21-controls)\.css[^>]*>/gi,'');
  html=html.replace(/<script[^>]+(?:public-menu-v10|public-shell-v15|public-shell-v21)\.js[^>]*><\/script>/gi,'');
  html=html.replace(/<nav class=["']menu["']>[\s\S]*?<\/nav>/i,'');
  html=html.replace('</head>',STYLE+'</head>').replace('</body>',SCRIPT+'</body>');
  return addBodyClass(html);
}

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    const path=pathOf(request);
    if(request.method!=='GET'||!INDEX_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
    const headers=headersOf(response);
    headers.set('x-gnk-asg-index-design','EXECUTIVE_EDITORIAL_V21');
    headers.set('x-gnk-asg-index-menu','UNIFIED_PUBLIC_SHELL_V21');
    headers.set('x-gnk-asg-index-preview',VERSION);
    return new Response(patchIndexHtml(await response.text()),{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
