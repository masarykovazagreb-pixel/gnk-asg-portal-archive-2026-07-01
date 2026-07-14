import app,{VERSION as BASE_VERSION} from './index-unified-auth-v22.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V33_PUBLIC_EDITORIAL_ASSETS_${BASE_VERSION}`;
export const EDITORIAL_ASSET_RUNTIME='GNK_PUBLIC_EDITORIAL_ASSETS_V1_20260714';

const ROOTS=[
 '/objave','/komentari','/analize',
 '/en/publications','/en/commentary','/en/analyses'
];
const pathOf=request=>new URL(request.url).pathname.replace(/\/{2,}/g,'/').replace(/\/+$/,'')||'/';
const safeSegment=value=>/^[a-z0-9-]+$/i.test(value);

function editorialAssetPath(path){
 for(const root of ROOTS){
  if(path===root)return `${root}/index.html`;
  if(path===`${root}/index.html`)return `${root}/index.html`;
  if(path.startsWith(`${root}/`)){
   const rest=path.slice(root.length+1);
   if(safeSegment(rest))return `${root}/${rest}/index.html`;
   if(rest.endsWith('/index.html')&&safeSegment(rest.slice(0,-'/index.html'.length)))return `${root}/${rest}`;
  }
 }
 return '';
}

async function directEditorialAsset(request,env){
 if(!['GET','HEAD'].includes(request.method)||!env.ASSETS?.fetch)return null;
 const path=pathOf(request),assetPath=editorialAssetPath(path);
 if(!assetPath)return null;
 try{
  const target=new URL(assetPath,'https://assets.local');
  const response=await env.ASSETS.fetch(new Request(target.toString(),{
   method:request.method,
   headers:{accept:'text/html,application/xhtml+xml'},
   redirect:'manual'
  }));
  if(response.status!==200)return null;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html'))return null;
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','location','etag','last-modified'])headers.delete(name);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control',assetPath.split('/').filter(Boolean).length===2?'no-store, max-age=0':'public, max-age=120, stale-while-revalidate=300');
  headers.set('x-content-type-options','nosniff');
  headers.set('x-gnk-explicit-html-route',assetPath);
  headers.set('x-gnk-route-owner',VERSION);
  headers.set('x-gnk-editorial-assets',EDITORIAL_ASSET_RUNTIME);
  return new Response(request.method==='HEAD'?null:response.body,{status:200,headers});
 }catch{return null}
}

export default{
 async fetch(request,env,ctx){
  const editorial=await directEditorialAsset(request,env);
  if(editorial)return editorial;
  const response=await app.fetch(request,env,ctx);
  const headers=new Headers(response.headers);
  headers.set('x-gnk-active-release',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 },
 scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
 email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
