import app from './index-final-admin-gateway-v1.js';
import {handleMediaCommandCenter,handleMediaCommandCenterEmail,VERSION as MEDIA_CENTER_VERSION} from './media-command-center-v1.js';
import {handleMediaCommandBridge,PROCESS_PATH as MEDIA_BRIDGE_PROCESS,STATUS_PATH as MEDIA_BRIDGE_STATUS,VERSION as MEDIA_BRIDGE_VERSION} from './media-command-bridge-v1.js';

export const VERSION='GNK_ASG_MEDIA_COMMAND_GATEWAY_V1_20260628';
const MEDIA_UI='/media-command-center';
const MEDIA_API='/api/media-command-center';
const TOKEN_NAMES=new Set(['OPERATOR_TOKEN','GNK_ASG_OPERATOR_TOKEN','ADMIN_TOKEN','GNK_ASG_ADMIN_TOKEN','NEWS_PUBLISH_TOKEN','SECRET_TOKEN']);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isMedia=path=>path===MEDIA_UI||path.startsWith(`${MEDIA_UI}/`)||path===MEDIA_API||path.startsWith(`${MEDIA_API}/`);
const isBridge=path=>path===MEDIA_BRIDGE_PROCESS||path===MEDIA_BRIDGE_STATUS;

function stamp(response,flow=''){
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-media-command-gateway',VERSION);
  headers.set('x-gnk-asg-media-command-center',MEDIA_CENTER_VERSION);
  headers.set('x-gnk-asg-media-command-bridge',MEDIA_BRIDGE_VERSION);
  if(flow)headers.set('x-gnk-asg-media-command-flow',flow);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
function json(data,status=200,flow=''){return stamp(new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8'}}),flow);}
async function adminAuthorized(request,env,ctx){
  const probe=new Request(new URL('/api/operator-auth-check',request.url),{method:'GET',headers:request.headers});
  try{return (await app.fetch(probe,env,ctx)).ok;}catch{return false;}
}
function patchedEnv(env,token){return new Proxy(env,{get(target,property,receiver){if(TOKEN_NAMES.has(String(property)))return token;return Reflect.get(target,property,receiver);}});}
function patchedRequest(request,token){
  const headers=new Headers(request.headers);
  headers.set('authorization',`Bearer ${token}`);
  headers.set('x-operator-token',token);
  headers.set('x-admin-token',token);
  headers.set('x-gnk-asg-token',token);
  return new Request(request,{headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(isBridge(path)){
      const response=await handleMediaCommandBridge(request,env);
      return stamp(response||json({ok:false,error:'media_command_bridge_not_handled'},404),'MEDIA_COMMAND_BRIDGE');
    }
    if(isMedia(path)){
      if(!(await adminAuthorized(request,env,ctx))){
        return path.startsWith('/api/')
          ? json({ok:false,error:'unauthorized'},401,'MEDIA_COMMAND_CENTER')
          : new Response(null,{status:303,headers:{location:'/admin-center/?next=/media-command-center/','cache-control':'no-store','x-gnk-asg-media-command-gateway':VERSION}});
      }
      if(path===`${MEDIA_API}/send-one`||path===`${MEDIA_API}/send-batch`){
        return json({ok:false,error:'production_sending_locked',message:'Produkcijsko masovno slanje ostaje zaključano. Testne poruke izvršavaju se samo kroz sigurni Media Command bridge.'},423,'MEDIA_COMMAND_CENTER');
      }
      const token=`gnk-media-session-${crypto.randomUUID()}`;
      const response=await handleMediaCommandCenter(patchedRequest(request,token),patchedEnv(env,token),ctx);
      return stamp(response||json({ok:false,error:'media_command_center_not_handled'},404),'MEDIA_COMMAND_CENTER');
    }
    return stamp(await app.fetch(request,env,ctx),'CORE');
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){
    try{if(await handleMediaCommandCenterEmail(message,env,ctx))return;}catch(error){console.error('media-command-center-email',error);}
    if(typeof app.email==='function')return app.email(message,env,ctx);
  }
};
