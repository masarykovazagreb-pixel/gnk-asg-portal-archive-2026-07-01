import app,{VERSION as BASE_VERSION} from './index-unified-auth-v22.js';
import {servePublicEditorialAsset,VERSION as EDITORIAL_ASSET_VERSION} from './public-editorial-asset-router-v1.js';

export const PREVIOUS_PUBLIC_EDITORIAL_VERSION='GNK_ASG_UNIFIED_AUTH_V34_PUBLIC_EDITORIAL_ASSETS';
export const VERSION=`GNK_ASG_UNIFIED_AUTH_V35_HOME_AND_EDITORIAL_INDEX_${EDITORIAL_ASSET_VERSION}_${BASE_VERSION}`;
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
async function serveHomeAsset(request,env){if(!['GET','HEAD'].includes(request.method)||!env.ASSETS?.fetch)return null;const path=pathOf(request);const targetPath=path==='/'?'/index.html':path==='/en'?'/en/index.html':'';if(!targetPath)return null;try{const response=await env.ASSETS.fetch(new Request(new URL(targetPath,'https://assets.local'),{method:request.method,headers:request.headers,redirect:'follow'}));if(response.status!==200)return null;const headers=new Headers(response.headers);for(const name of ['content-length','content-encoding','location','etag','last-modified'])headers.delete(name);headers.set('content-type','text/html; charset=utf-8');headers.set('cache-control','no-store, max-age=0');headers.set('x-gnk-home-direct-asset',targetPath);headers.set('x-gnk-route-owner',VERSION);return new Response(request.method==='HEAD'?null:response.body,{status:200,headers})}catch{return null}}

export default{
 async fetch(request,env,ctx){
  const home=await serveHomeAsset(request,env);
  if(home)return home;
  const editorial=await servePublicEditorialAsset(request,env,VERSION);
  if(editorial)return editorial;
  const response=await app.fetch(request,env,ctx);
  const headers=new Headers(response.headers);
  headers.set('x-gnk-active-release',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
 },
 scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
 email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};