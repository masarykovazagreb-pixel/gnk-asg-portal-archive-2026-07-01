import app from './index-unified-auth-v15-final.js';
import indexApp from './index-portal-final-v13.js';

export const VERSION='GNK_ASG_FINAL_GATEWAY_IQ200_20260625_WITH_AUTH_V15_20260628';
const INDEX_PATHS=new Set(['/','/en']);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isHtml=response=>String(response.headers.get('content-type')||'').toLowerCase().includes('text/html');

function stamp(response,flow){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');
  headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('x-gnk-asg-final-admin-gateway',VERSION);
  headers.set('x-gnk-asg-production-entry','GNK_ASG_IQ200_INDEX_20260625_AUTH_V15');
  if(flow)headers.set('x-gnk-asg-production-flow',flow);
  return headers;
}

function preserveCurrentAdmin(html){
  return html
    .replace(/href=["']\/operator-dashboard\/?["']/gi,'href="/admin-center/"')
    .replace(/href=["']\/operator-mobile\/?["']/gi,'href="/admin-center/"');
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(request.method==='GET'&&INDEX_PATHS.has(path)){
      const response=await indexApp.fetch(request,env,ctx);
      if(response.ok&&isHtml(response)){
        const html=preserveCurrentAdmin(await response.text());
        return new Response(html,{status:response.status,statusText:response.statusText,headers:stamp(response,'IQ200_INDEX_20260625')});
      }
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers:stamp(response,'IQ200_INDEX_20260625')});
    }
    const response=await app.fetch(request,env,ctx);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers:stamp(response,'AUTH_V15_ADMIN_MAIL_MEDIA')});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
