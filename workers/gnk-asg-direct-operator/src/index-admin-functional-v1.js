import app from './index-mail-studio-bridge-v15.js';
import {handleMediaDelivery,VERSION as MEDIA_VERSION} from './media-outreach-delivery-v5.js';

export const VERSION='GNK_ASG_ADMIN_FUNCTIONAL_V1_20260628';
const MEDIA_UI=new Set(['/media-command-center','/media-access-admin']);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-admin-functional',VERSION);
  headers.set('x-gnk-asg-media-service',MEDIA_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function authCheck(request,env,ctx){
  const target=new URL('/api/operator-auth-check',request.url);
  const headers=new Headers(request.headers);
  headers.set('accept','application/json');
  return app.fetch(new Request(target,{method:'GET',headers,redirect:'manual'}),env,ctx);
}
export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(MEDIA_UI.has(path)){
      const auth=await authCheck(request,env,ctx);
      if(!auth.ok)return new Response(null,{status:303,headers:{location:'/admin-center/?module=media','cache-control':'no-store','x-gnk-asg-admin-functional':VERSION}});
      return stamp(await app.fetch(request,env,ctx));
    }
    if(path.startsWith('/api/media-command-center')){
      const auth=await authCheck(request,env,ctx);
      if(!auth.ok)return stamp(auth);
      const response=await handleMediaDelivery(request,env);
      if(response)return stamp(response);
    }
    return stamp(await app.fetch(request,env,ctx));
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
