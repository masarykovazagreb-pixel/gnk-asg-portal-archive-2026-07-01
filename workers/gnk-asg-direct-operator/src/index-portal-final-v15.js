import core from './index-portal-final-v13.js';

export const VERSION='GNK_ASG_PORTAL_FINAL_V15_FEATURED_CODE_20260628';
const INDEX_PATHS=new Set(['/','/en']);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isHtml=response=>String(response.headers.get('content-type')||'').toLowerCase().includes('text/html');

function headersFor(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-portal-final',VERSION);
  headers.set('x-gnk-asg-featured-code','THE_CODE_FEATURED_V2');
  return headers;
}

function featuredSection(english){
  const title=english?'Key news, information or video':'Ključna vijest, informacija ili video';
  const copy=english?'THE CODE interactive HTML presentation is placed directly in this premium index area.':'THE CODE interaktivna HTML prezentacija ugrađena je izravno u ovaj premium prostor indexa.';
  const fullscreen=english?'Full screen':'Cijeli zaslon';
  const date=english?'7 October 2026':'7. listopada 2026.';
  const ready=english?'Ready':'Spremno';
  return `<section class="section" id="featured-code"><div class="section-head"><div><p class="eyebrow">Featured Intelligence · THE CODE</p><h2>${title}</h2></div><p>${copy}</p></div><div class="the-code-grid the-code-feature-grid"><article class="the-code-window"><div class="the-code-toolbar"><div class="the-code-lights" aria-hidden="true"><i></i><i></i><i></i></div><strong>THE CODE · LIVE HTML</strong><div class="the-code-actions"><button type="button" data-code-fullscreen>${fullscreen}</button></div></div><div class="the-code-viewport"><iframe id="featured-code-frame" src="/assets/the-code-activation-2026-10-07.html?v=20260628-featured3" title="THE CODE — GNK DINAMO Ltd." loading="eager" allow="autoplay; fullscreen" allowfullscreen></iframe></div></article><aside class="the-code-status"><p class="eyebrow">THE CODE</p><h3>New York</h3><div><small>${english?'Activation date':'Datum aktivacije'}</small><strong>${date}</strong></div><div><small>${english?'Activation time':'Vrijeme aktivacije'}</small><strong>11:30 ET</strong></div><div><small>Status</small><strong class="code-live"><i></i>${ready}</strong></div></aside></div></section>`;
}

function replaceFeatured(html,english){
  const startNeedle='<section class="section"><div class="section-head"><div><p class="eyebrow">Featured Intelligence</p>';
  const endNeedle=english?'<section class="section" id="profile">':'<section class="section" id="profil">';
  const start=html.indexOf(startNeedle);
  const end=start>=0?html.indexOf(endNeedle,start):-1;
  if(start>=0&&end>start)return html.slice(0,start)+featuredSection(english)+html.slice(end);
  return html;
}

function injectAssets(html){
  if(!html.includes('/assets/index-premium-map-code-v2.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/index-premium-map-code-v2.css?v=20260628-featured3"></head>');
  if(!html.includes('/assets/index-featured-code-controls-v2.js'))html=html.replace('</body>','<script src="/assets/index-featured-code-controls-v2.js?v=20260628-featured3" defer></script></body>');
  return html;
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    const response=await core.fetch(request,env,ctx);
    if(request.method==='GET'&&INDEX_PATHS.has(path)&&response.ok&&isHtml(response)){
      const english=path==='/en';
      const html=injectAssets(replaceFeatured(await response.text(),english));
      return new Response(html,{status:response.status,statusText:response.statusText,headers:headersFor(response)});
    }
    return response;
  },
  async scheduled(event,env,ctx){if(typeof core.scheduled==='function')return core.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof core.email==='function')return core.email(message,env,ctx);}
};