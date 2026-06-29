// Production activation R6: preserve the verified IQ200 index while routing all private modules through the active admin hub.
// Compatibility marker retained for the canonical production verifier:
// GNK_ASG_FINAL_GATEWAY_IQ200_20260625_WITH_ADMIN_HUB_V31_20260629
import app from './index-admin-hub-v28-news-no-fallback.js';
import indexApp from './index-portal-final-v13.js';
import { withRequiredEmailSignature } from './email-signature-contract-v1.js';
import { handleControlledTestOnce } from './media-registration-controlled-test-once-v1.js';

export const VERSION='GNK_ASG_FINAL_GATEWAY_IQ200_20260625_WITH_ADMIN_HUB_V31_20260629_COMPAT_V32';
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
  headers.set('x-gnk-asg-production-entry','GNK_ASG_IQ200_INDEX_ADMIN_HUB_V31_V32');
  if(flow)headers.set('x-gnk-asg-production-flow',flow);
  return headers;
}

function patchIq200Navigation(html,english){
  html=html
    .replace(/href=["']\/operator-dashboard\/?["']/gi,'href="/admin-center/"')
    .replace(/href=["']\/operator-mobile\/?["']/gi,'href="/admin-center/"');

  if(english){
    html=html
      .replace(/href=["']\/markets\/?["']/gi,'href="/en/downloads/"')
      .replace(/>Markets</g,'>PDF CENTRE<');
  }else{
    html=html
      .replace(/href=["']\/trzista\/?["']/gi,'href="/downloads/"')
      .replace(/>Tržišta</g,'>PDF CENTAR<');
  }

  const lock=`<script id="gnk-iq200-pdf-admin-lock-r6">(()=>{'use strict';const english=location.pathname.startsWith('/en');const fix=()=>{document.querySelectorAll('a').forEach(a=>{const href=(a.getAttribute('href')||'').toLowerCase();const text=(a.textContent||'').trim();if(href.startsWith('/operator-dashboard')||href.startsWith('/operator-mobile')){a.href='/admin-center/';a.rel='nofollow'}if(english&&href.startsWith('/markets')){a.href='/en/downloads/';if(text==='Markets')a.textContent='PDF CENTRE'}if(!english&&href.startsWith('/trzista')){a.href='/downloads/';if(text==='Tržišta'||text==='Trzista')a.textContent='PDF CENTAR'}})};fix();document.addEventListener('DOMContentLoaded',fix,{once:true});new MutationObserver(fix).observe(document.documentElement,{childList:true,subtree:true});[50,150,400,900,1800,3500,7000].forEach(ms=>setTimeout(fix,ms))})();<\/script>`;
  if(!html.includes('gnk-iq200-pdf-admin-lock-r6'))html=html.replace('</body>',lock+'</body>');
  return html;
}

export default{
  async fetch(request,env,ctx){
    const oneTimeResponse=await handleControlledTestOnce(request,withRequiredEmailSignature(env));
    if(oneTimeResponse)return oneTimeResponse;
    const path=pathOf(request);
    if(request.method==='GET'&&INDEX_PATHS.has(path)){
      const response=await indexApp.fetch(request,env,ctx);
      if(response.ok&&isHtml(response)){
        const html=patchIq200Navigation(await response.text(),path==='/en');
        return new Response(html,{status:response.status,statusText:response.statusText,headers:stamp(response,'IQ200_INDEX_ADMIN_HUB_V31_V32')});
      }
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers:stamp(response,'IQ200_INDEX_ADMIN_HUB_V31_V32')});
    }
    const response=await app.fetch(request,env,ctx);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers:stamp(response,'ADMIN_HUB_V33_MEDIA_PORTAL')});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
