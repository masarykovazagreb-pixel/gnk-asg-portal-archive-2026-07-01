import app from './index-admin-hub-v28-news-no-fallback.js';
import indexApp from './index-portal-final-v13.js';
import {handleControlledTestOnce} from './media-registration-controlled-test-once-v1.js';

export const VERSION='GNK_ASG_FINAL_GATEWAY_CORE_V2_20260629';
const INDEX_PATHS=new Set(['/','/en']);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isHtml=response=>String(response.headers.get('content-type')||'').toLowerCase().includes('text/html');

function headersOf(response,flow){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');
  headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('x-gnk-asg-final-admin-gateway-core',VERSION);
  headers.set('x-gnk-asg-production-entry','GNK_ASG_IQ200_INDEX_ADMIN_HUB_V31_V32');
  if(flow)headers.set('x-gnk-asg-production-flow',flow);
  return headers;
}

function patchIndex(html,english){
  let body=html
    .replace(/href=["']\/operator-dashboard\/?["']/gi,'href="/admin-center/"')
    .replace(/href=["']\/operator-mobile\/?["']/gi,'href="/admin-center/"');
  if(english){
    body=body.replace(/href=["']\/markets\/?["']/gi,'href="/en/downloads/"').replace(/>Markets</g,'>PDF CENTRE<');
  }else{
    body=body.replace(/href=["']\/trzista\/?["']/gi,'href="/downloads/"').replace(/>Tržišta</g,'>PDF CENTAR<');
  }
  return body;
}

export default{
  async fetch(request,env,ctx){
    const controlled=await handleControlledTestOnce(request,env);
    if(controlled)return controlled;
    const path=pathOf(request);
    if(request.method==='GET'&&INDEX_PATHS.has(path)){
      const response=await indexApp.fetch(request,env,ctx);
      if(response.ok&&isHtml(response)){
        return new Response(patchIndex(await response.text(),path==='/en'),{status:response.status,statusText:response.statusText,headers:headersOf(response,'IQ200_INDEX')});
      }
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers:headersOf(response,'IQ200_INDEX')});
    }
    const response=await app.fetch(request,env,ctx);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers:headersOf(response,'ADMIN_HUB_MEDIA_PORTAL')});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
