export const VERSION='GNK_PUBLIC_EDITORIAL_ASSETS_V1_20260714';
export const EDITORIAL_ROOTS=Object.freeze([
 '/objave','/komentari','/analize',
 '/en/publications','/en/commentary','/en/analyses'
]);

const pathOf=request=>new URL(request.url).pathname.replace(/\/{2,}/g,'/').replace(/\/+$/,'')||'/';
const safeSegment=value=>/^[a-z0-9-]+$/i.test(value);

export function editorialAssetPath(path){
 for(const root of EDITORIAL_ROOTS){
  if(path===root||path===`${root}/index.html`)return `${root}/index.html`;
  if(!path.startsWith(`${root}/`))continue;
  const rest=path.slice(root.length+1);
  if(safeSegment(rest))return `${root}/${rest}/index.html`;
  if(rest.endsWith('/index.html')&&safeSegment(rest.slice(0,-'/index.html'.length)))return `${root}/${rest}`;
 }
 return '';
}

export async function servePublicEditorialAsset(request,env,ownerVersion){
 if(!['GET','HEAD'].includes(request.method)||!env.ASSETS?.fetch)return null;
 const assetPath=editorialAssetPath(pathOf(request));
 if(!assetPath)return null;
 try{
  const response=await env.ASSETS.fetch(new Request(new URL(assetPath,'https://assets.local'),{
   method:request.method,
   headers:{accept:'text/html,application/xhtml+xml'},
   redirect:'manual'
  }));
  if(response.status!==200)return null;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html'))return null;
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','location','etag','last-modified'])headers.delete(name);
  const collectionIndex=EDITORIAL_ROOTS.some(root=>assetPath===`${root}/index.html`);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control',collectionIndex?'no-store, max-age=0':'public, max-age=120, stale-while-revalidate=300');
  headers.set('x-content-type-options','nosniff');
  headers.set('x-gnk-explicit-html-route',assetPath);
  headers.set('x-gnk-route-owner',ownerVersion);
  headers.set('x-gnk-editorial-assets',VERSION);
  return new Response(request.method==='HEAD'?null:response.body,{status:200,headers});
 }catch{return null}
}
