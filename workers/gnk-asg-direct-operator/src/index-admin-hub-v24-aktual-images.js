import app from './index-admin-hub-v23-aktual.js';

const VERSION='GNK_ASG_ADMIN_HUB_V24_AKTUAL_IMAGES_20260626';
const AKTUAL_IMAGE=/^\/assets\/objave\/aktual\/[^/]+\.png$/i;

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname;
    const response=await app.fetch(request,env,ctx);
    const headers=new Headers(response.headers);
    if(request.method==='GET'&&response.ok&&AKTUAL_IMAGE.test(path)){
      headers.set('content-type','image/webp');
      headers.set('cache-control','public, max-age=31536000, immutable');
      headers.set('x-gnk-asg-aktual-image',VERSION);
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }
    headers.set('x-gnk-asg-admin-hub-v24',VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
