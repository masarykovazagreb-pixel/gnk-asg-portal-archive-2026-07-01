import app from './index-admin-hub-v23-aktual.js';
import {patchIndexActivation} from './index-activation-wrapper-v1.js';
import {patchOperations,VERSION as OPERATIONS_VERSION} from './operations-wrapper-v2.js';

export default {
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    if(path==='/media-kit')return Response.redirect(new URL('/media-kit-2026/',request.url),308);
    let response=await app.fetch(request,env,ctx);
    response=await patchIndexActivation(response,path,request,env);
    response=patchOperations(response,path);
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-operations-suite',OPERATIONS_VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(app.scheduled)return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(app.email)return app.email(message,env,ctx);}
};
