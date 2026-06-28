// Production activation R4: preserve the verified IQ200 index while fixing PDF and Admin navigation.
import app from './index-unified-auth-v15-final.js';
import indexApp from './index-portal-final-v13.js';

export const VERSION='GNK_ASG_FINAL_GATEWAY_IQ200_PDF_ADMIN_AUTH_V15_20260628_R4';
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
  headers.set('x-gnk-asg-production-entry','GNK_ASG_IQ200_INDEX_PDF_ADMIN_AUTH_V15');
  if(flow)headers.set('x-gnk-asg-production-flow',flow);
  return headers;
}

function patchIq200Navigation(html,english){
  html=html
    .replace(/href=["']\/operator-dashboard\/?["']/gi,'href="/admin-center/"')
    .replace(/href=["']\/operator-mobile\/?["']/gi,'href="/admin-center/"');

  if(english){
    html=html.replace(/<a\s+href=["']\/markets\/?["'][^>]*>[^<]*Markets<\/a>/i,'<a href="/en/downloads/">▣ PDF CENTRE</a>');
  }else{
    html=html.replace(/<a\s+href=["']\/trzista\/?["'][^>]*>[^<]*Tržišta<\/a>/i,'<a href="/downloads/">▣ PDF CENTAR</a>');
  }

  const lock=`<script id="gnk-iq200-pdf-admin-lock-r4">(()=>{'use strict';const english=location.pathname.startsWith('/en');const fix=()=>{const nav=document.querySelector('.top-nav');if(nav){nav.querySelectorAll('a').forEach(a=>{const href=(a.getAttribute('href')||'').toLowerCase();const text=(a.textContent||'').trim().toLowerCase();if(href.startsWith('/operator-dashboard')||href.startsWith('/operator-mobile')){a.href='/admin-center/';a.rel='nofollow'}if((english&&(href.startsWith('/markets')||text.includes('markets')))||(!english&&(href.startsWith('/trzista')||text.includes('tržišta')||text.includes('trzista')))){a.href=english?'/en/downloads/':'/downloads/';a.textContent=english?'▣ PDF CENTRE':'▣ PDF CENTAR'}}}document.querySelectorAll('.mega-grid a').forEach(a=>{const href=(a.getAttribute('href')||'').toLowerCase();if(href.startsWith('/operator-dashboard')||href.startsWith('/operator-mobile')){a.href='/admin-center/';a.rel='nofollow'}})};fix();document.addEventListener('DOMContentLoaded',fix,{once:true});new MutationObserver(fix).observe(document.documentElement,{childList:true,subtree:true});[50,150,400,900,1800,3500,7000].forEach(ms=>setTimeout(fix,ms))})();<\/script>`;
  if(!html.includes('gnk-iq200-pdf-admin-lock-r4'))html=html.replace('</body>',lock+'</body>');
  return html;
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(request.method==='GET'&&INDEX_PATHS.has(path)){
      const response=await indexApp.fetch(request,env,ctx);
      if(response.ok&&isHtml(response)){
        const html=patchIq200Navigation(await response.text(),path==='/en');
        return new Response(html,{status:response.status,statusText:response.statusText,headers:stamp(response,'IQ200_INDEX_PDF_ADMIN')});
      }
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers:stamp(response,'IQ200_INDEX_PDF_ADMIN')});
    }
    const response=await app.fetch(request,env,ctx);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers:stamp(response,'AUTH_V15_ADMIN_MAIL_MEDIA')});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
