import app from './index-admin-hub-v28-news-no-fallback.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V29_INDEX_CITY_CODE_LAYOUT_20260628';

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-active-entrypoint','src/index-admin-hub-v29-index-visual-fix.js');
  headers.set('x-gnk-asg-index-visual-fix',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){return stamp(await app.fetch(request,env,ctx));},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
