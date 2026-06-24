import app from './index-editorial-final-v1.js';

const ADMIN_ASSETS='<link rel="stylesheet" href="/assets/private-admin-menu-v1.css?v=20260624-editorial-2"><link rel="stylesheet" href="/assets/admin-auth-controls-v1.css?v=20260624-editorial-2"><script defer src="/assets/private-admin-menu-v1.js?v=20260624-editorial-2"></script><script defer src="/assets/admin-auth-controls-v1.js?v=20260624-editorial-2"></script>';

function pathOf(request){
  return new URL(request.url).pathname.replace(/\/+$/,'')||'/';
}

function loopsToSamePath(response,path){
  if(response.status!==301&&response.status!==302&&response.status!==303&&response.status!==307&&response.status!==308)return false;
  const location=response.headers.get('location')||'';
  try{
    const target=new URL(location,'https://gnk-asg.hr').pathname.replace(/\/+$/,'')||'/';
    return target===path;
  }catch{return false;}
}

async function serveEditorAsset(request,env){
  if(!env.ASSETS?.fetch)return null;
  const assetUrl=new URL('/auto-editor/',request.url);
  const asset=await env.ASSETS.fetch(new Request(assetUrl.toString(),request));
  if(!asset.ok)return null;
  const type=asset.headers.get('content-type')||'';
  if(!type.includes('text/html'))return asset;
  let html=await asset.text();
  if(!html.includes('private-admin-menu-v1.js'))html=html.replace('</head>',ADMIN_ASSETS+'</head>');
  const headers=new Headers(asset.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  return new Response(html,{status:200,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    const response=await app.fetch(request,env,ctx);
    if(path!=='/auto-editor'||request.method!=='GET'||!loopsToSamePath(response,path))return response;
    return await serveEditorAsset(request,env)||response;
  },
  scheduled:(event,env,ctx)=>app.scheduled?.(event,env,ctx),
  email:(message,env,ctx)=>app.email?.(message,env,ctx)
};
