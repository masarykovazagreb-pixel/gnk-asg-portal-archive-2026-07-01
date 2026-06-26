import app from './index-media-command-center-v20.js';
import {handleMediaCommandCenter as handleV2,VERSION as MEDIA_V2_VERSION} from './media-command-center-v2.js';

export const VERSION='GNK_ASG_MEDIA_COMMAND_CENTER_WRAPPER_V21_20260626';
const NEW_ENDPOINTS=new Set([
  '/api/media-command-center/import-preview',
  '/api/media-command-center/import-contacts',
  '/api/media-command-center/readiness-summary'
]);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-media-command-wrapper-v21',VERSION);
  headers.set('x-gnk-asg-media-command-v2',MEDIA_V2_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(NEW_ENDPOINTS.has(path)){
      const authProbe=await app.fetch(request.clone(),env,ctx);
      if(authProbe.status===401||authProbe.status===403)return stamp(authProbe);
      const response=await handleV2(request,env,ctx);
      if(response)return stamp(response);
      return stamp(authProbe);
    }
    const response=await app.fetch(request,env,ctx);
    if(path==='/data/portal-version.json'&&response.headers.get('content-type')?.includes('application/json')){
      try{
        const payload=await response.clone().json();
        return stamp(new Response(JSON.stringify({...payload,mediaCommandV2:MEDIA_V2_VERSION,mediaCommandWrapperV21:VERSION,contactImport:'CONTROLLED_V2'},null,2),{status:response.status,headers:response.headers}));
      }catch{}
    }
    return stamp(response);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
