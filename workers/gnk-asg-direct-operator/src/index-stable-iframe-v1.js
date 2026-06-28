import app from './index-admin-hub-v27-news-status.js';

export const VERSION='GNK_ASG_INDEX_STABLE_IFRAME_V1_20260628';
const INDEX=new Set(['/','/en']);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    const response=await app.fetch(request,env,ctx);
    if(request.method!=='GET'||!INDEX.has(path)||!response.ok)return response;
    let html=await response.text();
    html=html.replaceAll('<script src="/assets/index-code-cleanup-v8.js?v=20260627-v9" defer></script>','');
    html=html.replaceAll('<script src="/assets/index-code-cleanup-v8.js?v=20260627-v13" defer></script>','');
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-the-code-player','STABLE_IFRAME');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};