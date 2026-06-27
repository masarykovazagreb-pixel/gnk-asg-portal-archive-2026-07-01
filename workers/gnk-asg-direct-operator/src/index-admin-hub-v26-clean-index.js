import app from './index-admin-hub-v25-mail-smoke.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V26_PUBLIC_V8_20260627';
const MEDIA_STYLE='<link rel="stylesheet" href="/assets/media-application-code-v2.css?v=20260627-v2">';
const MEDIA_SCRIPT='<script defer src="/assets/media-application-code-v2.js?v=20260627-v2"></script>';
const DEBUG_PATH='/data/luxury-index-debug.json';
const MEDIA_PATH='/media-application';
const CODE_PATHS=new Set(['/the-code','/the-code/index.html']);

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function aliasRequest(request,path){const url=new URL(request.url);url.pathname=path;return new Request(url.toString(),request);}
function noStore(headers){
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');
  headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('pragma','no-cache');
  headers.set('expires','0');
  headers.set('vary','Accept-Encoding, Cookie');
  return headers;
}
function aliasResponse(response,alias){const headers=noStore(new Headers(response.headers));headers.set('x-gnk-asg-news-alias',alias);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}

async function directCode(request,env){
  if(!env.ASSETS?.fetch)return new Response('THE CODE asset binding missing',{status:503});
  const assetUrl=new URL('/the-code/index.html',request.url);
  const response=await env.ASSETS.fetch(new Request(assetUrl,{method:'GET'}));
  const headers=noStore(new Headers(response.headers));
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('x-gnk-asg-the-code','CLEAN_STANDALONE_HTML_V8');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function diagnostic(request,env){
  const check=async path=>{
    try{
      if(!env.ASSETS?.fetch)return {path,status:0,ok:false,error:'ASSETS_BINDING_MISSING'};
      const response=await env.ASSETS.fetch(new Request(new URL(path,request.url)));
      const text=await response.text();
      return {path,status:response.status,ok:response.ok,contentType:response.headers.get('content-type')||'',bytes:text.length,cleanCode:text.includes('gnk-code-start')};
    }catch(error){return {path,status:0,ok:false,error:String(error?.message||error)};}
  };
  const payload={ok:true,version:VERSION,entryPoint:'src/index-admin-hub-v26-clean-index.js',assets:[await check('/index-white-static-preview-v2.html'),await check('/en/index-white-static-preview-v2.html'),await check('/assets/index-public-v7.css'),await check('/assets/index-public-v7.js'),await check('/the-code/index.html'),await check('/assets/media-application-code-v2.css'),await check('/assets/media-application-code-v2.js')]};
  return new Response(JSON.stringify(payload,null,2),{headers:noStore(new Headers({'content-type':'application/json; charset=utf-8'}))});
}

async function patchIndex(response,path,request){
  if(request.method!=='GET'||!['/','/en'].includes(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=noStore(new Headers(response.headers));
  headers.set('x-gnk-asg-index-clean-layout',VERSION);
  headers.set('x-gnk-asg-index-release','PUBLIC_V8_CLEAN_CODE');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function patchMediaApplication(response,path,request){
  if(request.method!=='GET'||path!==MEDIA_PATH||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=noStore(new Headers(response.headers));
  headers.set('x-gnk-asg-media-layout','THE_CODE_NARROW_V2');
  let html=await response.text();
  if(!html.includes('media-application-code-v2.css'))html=html.replace('</head>',`${MEDIA_STYLE}</head>`);
  if(!html.includes('media-application-code-v2.js'))html=html.replace('</body>',`${MEDIA_SCRIPT}</body>`);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(request.method==='GET'&&CODE_PATHS.has(path))return directCode(request,env);
    if(request.method==='GET'&&path===DEBUG_PATH)return diagnostic(request,env);
    if(request.method==='GET'&&path==='/data/news-feed.json')return aliasResponse(await app.fetch(aliasRequest(request,'/data/news.json'),env,ctx),'news-feed-to-news-json');
    if(request.method==='GET'&&path==='/data/news_archive.json')return aliasResponse(await app.fetch(aliasRequest(request,'/data/news-archive.json'),env,ctx),'news-archive-underscore-to-hyphen');
    let response=await app.fetch(request,env,ctx);
    response=await patchIndex(response,path,request);
    response=await patchMediaApplication(response,path,request);
    return response;
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
