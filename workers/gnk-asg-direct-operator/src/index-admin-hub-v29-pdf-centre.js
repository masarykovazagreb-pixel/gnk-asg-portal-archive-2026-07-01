import app from './index-admin-hub-v28-core.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V29_PDF_CENTRE_20260628';
const INDEX_PATHS=new Set(['/','/en']);
const DOWNLOAD_PATHS=new Set(['/downloads','/en/downloads']);
const CONTACT_PATHS=new Set(['/contact','/en/contact']);

function pathOf(request){
  return new URL(request.url).pathname.replace(/\/+$/,'')||'/';
}

function htmlHeaders(response,extra={}){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');
  headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('x-gnk-asg-active-entrypoint','src/index-admin-hub-v29-pdf-centre.js');
  headers.set('x-gnk-asg-pdf-centre-version',VERSION);
  for(const [key,value] of Object.entries(extra))headers.set(key,value);
  return headers;
}

function indexMenu(english){
  return english
    ? '<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financials">Financials</a><a href="#network">Network</a><a href="/en/downloads/">PDF CENTRE</a><a href="/operator-dashboard/">Admin</a><a href="/en/contact/">Contact</a><a class="lang" href="/">HR</a></nav>'
    : '<nav class="menu"><a href="#the-code">THE CODE</a><a href="#financije">Financije</a><a href="#mreza">Mreža</a><a href="/downloads/">PDF CENTAR</a><a href="/operator-dashboard/">Admin</a><a href="/contact/">Kontakt</a><a class="lang" href="/en/">EN</a></nav>';
}

function patchIndex(html,path){
  html=html.replace(/<nav class=["']menu["']>[\s\S]*?<\/nav>/i,indexMenu(path==='/en'));
  html=html.replace(/\['Markets','\/markets\/'\]/g,"['PDF CENTRE','/en/downloads/']");
  html=html.replace(/\['Tržišta','\/trzista\/'\]/g,"['PDF CENTAR','/downloads/']");
  return html;
}

function patchDownloads(html){
  html=html.replace(/<style id=["']gnk-reduced-public-menu-v1-style["']>[\s\S]*?<\/style>/gi,'');
  html=html.replace(/<script id=["']gnk-reduced-public-menu-v1-script["']>[\s\S]*?<\/script>/gi,'');
  html=html.replace(/<link[^>]+gnk-asg-global-layer[^>]*>/gi,'');
  html=html.replace(/<script[^>]+gnk-asg-global-layer[^>]*><\/script>/gi,'');
  const cleanStyle='<style id="gnk-pdf-centre-clean-v29">html,body{padding-top:0!important}body>header,body>nav,#gnkReducedPublicNav,#gnk-asg-premium-header,#gnk-asg-overlay,#gnk-asg-drawer,#gnk-asg-float-home,#gnk-asg-float-ai,#gnk-asg-ai-panel,.gnk-global-float-home,.gnk-global-float-ai,.public-float,.public-float--home,.public-float--ai,.gnk-asg-floating-actions{display:none!important;visibility:hidden!important;pointer-events:none!important}</style>';
  if(!html.includes('gnk-pdf-centre-clean-v29'))html=html.replace('</head>',cleanStyle+'</head>');
  return html;
}

function patchContact(html){
  html=html.replace(/\['Markets','\/markets\/'\]/g,"['PDF CENTRE','/en/downloads/']");
  html=html.replace(/\['Tržišta','\/trzista\/'\]/g,"['PDF CENTAR','/downloads/']");
  return html;
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    const response=await app.fetch(request,env,ctx);
    if(request.method!=='GET'||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
    let html=await response.text();
    let extra={};
    if(INDEX_PATHS.has(path)){
      html=patchIndex(html,path);
      extra={'x-gnk-asg-index-menu':'PDF_CENTRE_NO_MARKETS'};
    }else if(DOWNLOAD_PATHS.has(path)){
      html=patchDownloads(html);
      extra={'x-gnk-asg-downloads-ui':'CLEAN_NO_MENU_NO_FLOATS'};
    }else if(CONTACT_PATHS.has(path)){
      html=patchContact(html);
      extra={'x-gnk-asg-contact-menu':'PDF_CENTRE'};
    }else return response;
    return new Response(html,{status:response.status,statusText:response.statusText,headers:htmlHeaders(response,extra)});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};
