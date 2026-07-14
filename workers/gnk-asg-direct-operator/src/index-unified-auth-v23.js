import app,{VERSION as BASE_VERSION} from './index-unified-auth-v22.js';
import {servePublicEditorialAsset,VERSION as EDITORIAL_ASSET_VERSION} from './public-editorial-asset-router-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V33_PUBLIC_EDITORIAL_ASSETS_${EDITORIAL_ASSET_VERSION}_${BASE_VERSION}`;

export default{
 async fetch(request,env,ctx){
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
