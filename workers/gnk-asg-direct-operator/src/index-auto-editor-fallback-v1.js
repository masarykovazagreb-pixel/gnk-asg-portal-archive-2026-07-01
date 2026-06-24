import app from './index-logout-fallback-v1.js';

const ADMIN_ASSETS='<link rel="stylesheet" href="/assets/private-admin-menu-v1.css?v=20260624-4"><link rel="stylesheet" href="/assets/admin-auth-controls-v1.css?v=20260624-4"><script defer src="/assets/private-admin-menu-v1.js?v=20260624-4"></script><script defer src="/assets/admin-auth-controls-v1.js?v=20260624-4"></script>';

function htmlResponse(response,html){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  if(!html.includes('private-admin-menu-v1.js'))html=html.replace('</head>',ADMIN_ASSETS+'</head>');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname.replace(/\/+$/,'')||'/';
    const response=await app.fetch(request,env,ctx);
    if(path!=='/auto-editor'||request.method!=='GET'||response.status!==404||!env.ASSETS?.fetch)return response;
    const assetUrl=new URL('/auto-editor/index.html',request.url);
    const asset=await env.ASSETS.fetch(new Request(assetUrl.toString(),request));
    if(!asset.ok)return response;
    const type=asset.headers.get('content-type')||'';
    if(!type.includes('text/html'))return asset;
    return htmlResponse(asset,await asset.text());
  },
  scheduled:(event,env,ctx)=>app.scheduled?.(event,env,ctx),
  email:(message,env,ctx)=>app.email?.(message,env,ctx)
};
