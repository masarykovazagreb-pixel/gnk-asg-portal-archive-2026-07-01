import app from './index-project50-v28-news-no-fallback.js';

export const VERSION='GNK_ASG_PROJECT50_V30_UNIFIED_PUBLIC_ADMIN_MENUS_20260628';
const INDEX_PATHS=new Set(['/','/en']);
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);
const MENU_STYLE='<link rel="stylesheet" href="/assets/public-menu-v10.css?v=20260628-v16">';
const INDEX_MENU_SCRIPT='<script defer src="/assets/index-menu-unified-v16.js?v=20260628-v16"></script>';
const ADMIN_EXTENSION_SCRIPT='<script defer src="/assets/admin-center-extensions-v2.js?v=20260628-v2"></script>';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function mutableHeaders(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  return headers;
}
function canonicalMenu(english){
  return english
    ? '<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financials">Financials</a><a href="#network">Network</a><a href="/news/">News</a><a href="/publications/">Publications</a><a href="/markets/">Markets</a><a href="/visual-index/">Gallery</a><a href="/en/assistant/">AI</a><a href="/admin-center/" rel="nofollow">Admin</a><a href="/en/contact/">Contact</a><a class="lang" href="/">HR</a></nav>'
    : '<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financije">Financije</a><a href="#mreza">Mreža</a><a href="/vijesti/">Vijesti</a><a href="/objave/">Objave</a><a href="/trzista/">Tržišta</a><a href="/visual-index/">Galerija</a><a href="/assistant/">AI</a><a href="/admin-center/" rel="nofollow">Admin</a><a href="/contact/">Kontakt</a><a class="lang" href="/en/">EN</a></nav>';
}
function injectOnce(html,marker,content,position='head'){
  if(html.includes(marker))return html;
  return html.replace(position==='head'?'</head>':'</body>',`${content}${position==='head'?'</head>':'</body>'}`);
}
async function patchHtml(response,path,request){
  if(request.method!=='GET'||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  const headers=mutableHeaders(response);
  if(INDEX_PATHS.has(path)){
    html=html.replace(/<nav class=["']menu["']>[\s\S]*?<\/nav>/i,canonicalMenu(path==='/en'));
    html=injectOnce(html,'public-menu-v10.css',MENU_STYLE,'head');
    html=injectOnce(html,'index-menu-unified-v16.js',INDEX_MENU_SCRIPT,'body');
    headers.set('x-gnk-asg-index-menu','UNIFIED_PUBLIC_MENU_V16');
    headers.set('x-gnk-asg-index-menu-items','11');
  }
  if(path==='/admin-center'){
    html=html.replace(/<script[^>]+admin-center-memorandum-v1\.js[^>]*><\/script>/gi,'');
    html=injectOnce(html,'admin-center-extensions-v2.js',ADMIN_EXTENSION_SCRIPT,'body');
    headers.set('x-gnk-asg-admin-menu','UNIFIED_ADMIN_EXTENSIONS_V2');
    headers.set('x-gnk-asg-admin-menu-modules','11');
  }
  if(!INDEX_PATHS.has(path)&&html.includes('public-shell-v15.js')){
    html=html.replace(/public-menu-v10\.css\?v=[^"']+/gi,'public-menu-v10.css?v=20260628-v16');
    html=html.replace(/public-shell-v15\.js\?v=[^"']+/gi,'public-shell-v15.js?v=20260628-v16');
    headers.set('x-gnk-asg-public-menu','UNIFIED_PUBLIC_MENU_V16');
  }
  headers.set('x-gnk-asg-menu-release',VERSION);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
async function patchStatus(response,path){
  if(!STATUS_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=mutableHeaders(response);headers.set('content-type','application/json; charset=utf-8');headers.set('x-gnk-asg-menu-release',VERSION);
    return new Response(JSON.stringify({...payload,entryPoint:'src/index-project50-v30-unified-menu.js',deployedEntryPoint:'src/index-project50-v30-unified-menu.js',menuRelease:VERSION,publicMenu:'UNIFIED_PUBLIC_MENU_V16',publicMenuItems:11,adminMenu:'UNIFIED_ADMIN_EXTENSIONS_V2',adminMenuModules:11,checkedAt:new Date().toISOString()},null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    let response=await app.fetch(request,env,ctx);
    response=await patchStatus(response,path);
    return patchHtml(response,path,request);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
