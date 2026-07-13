import app,{VERSION as BASE_VERSION} from './index-unified-auth-v16.js';
import {runScheduledNewsPublication,handlePublicNews,getPublishedNewsBySlug,VERSION as NEWS_AUTO_PUBLICATION_VERSION} from './news-auto-publication-v1.js';
import {handleIncomingEmail,VERSION as MAIL_AUTOREPLY_VERSION} from './mail-identity-autoreply-v2.js';
import {handleEmailLogo,VERSION as EMAIL_LOGO_VERSION} from './email-logo-endpoint-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V60_20260713_NEWSROOM_FALLBACK_${EMAIL_LOGO_VERSION}_${MAIL_AUTOREPLY_VERSION}_${NEWS_AUTO_PUBLICATION_VERSION}_${BASE_VERSION}`;

const COMPACT_MENU_SCRIPT='/assets/public-compact-menu-v1.js?v=20260713-compact-fit';
const COUNTDOWN_SCRIPT='/assets/the-code-countdown-v1.js?v=20260711-live';
const MEDIA_QA_SCRIPT='/assets/media-registration-qa-v1.js?v=20260711-deadline-a11y';
const INDEX_HUB_SCRIPT='/assets/index-live-hub-v1.js?v=20260712-live-feed';
const INDEX_HUB_STYLE='/assets/index-live-hub-v1.css?v=20260712-high-contrast';
const NEWSROOM_LIVE_SCRIPT='/assets/newsroom-live-v1.js?v=20260712-public-feed';
const MARKET_LIVE_SCRIPT='/assets/public-market-live-v1.js?v=20260712-markets-only';
const MARKET_LIVE_STYLE='/assets/public-market-live-v1.css?v=20260712-ecb-world-bank';
const PROTECTED_PREFIXES=['/admin','/admin-center','/mail-studio','/campaign-mailer','/email-status','/worker-ops','/operator-dashboard','/digital-headquarters','/media-registration-admin','/webmail'];
const PUBLIC_ASSET_ROUTES=new Map([['/newsroom','/newsroom/index.html'],['/en/newsroom','/en/newsroom/index.html']]);

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function isProtectedPath(request){const path=pathOf(request);return PROTECTED_PREFIXES.some(prefix=>path===prefix||path.startsWith(`${prefix}/`));}
function isPublicPage(path){return !PROTECTED_PREFIXES.some(prefix=>path===prefix||path.startsWith(`${prefix}/`))&&!path.startsWith('/api/')&&!path.startsWith('/assets/');}
function isTheCodePath(path){return path==='/the-code'||path.startsWith('/the-code/')||path==='/en/the-code'||path.startsWith('/en/the-code/');}
function isCountdownPath(path){return path==='/'||path==='/en'||isTheCodePath(path);}
function isIndexPath(path){return path==='/'||path==='/en';}
function isNewsroomLanding(path){return path==='/newsroom'||path==='/en/newsroom';}
function isMarketLivePath(path){return path==='/trzista'||path==='/en/markets';}
function shouldInject(request,response){if(request.method!=='GET'&&request.method!=='HEAD')return false;if(response.status!==200)return false;const path=pathOf(request);if(path.startsWith('/api/'))return false;return String(response.headers.get('content-type')||'').toLowerCase().includes('text/html');}
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function articleRoute(path){const match=path.match(/^\/(en\/)?newsroom\/([^/]+)$/);return match?{english:Boolean(match[1]),slug:decodeURIComponent(match[2])}:null;}

function newsroomFallback(request){
  const path=pathOf(request);if(!isNewsroomLanding(path))return null;
  const english=path==='/en/newsroom';
  const title=english?'GNK ASG Newsroom':'GNK ASG Newsroom';
  const intro=english?'Official corporate news, releases and media information.':'Službene korporativne vijesti, objave i medijske informacije.';
  const html=`<!doctype html><html lang="${english?'en':'hr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${title}</title><meta name="description" content="${intro}"><link rel="canonical" href="https://gnk-asg.hr${english?'/en':''}/newsroom/"><link rel="stylesheet" href="/assets/public-sections-v1.css?v=20260711"><meta name="robots" content="index,follow,max-image-preview:large"></head><body><main class="wrap"><section class="hero"><p class="eyebrow">${english?'Official media center':'Službeni medijski centar'}</p><h1>Newsroom</h1><p class="lead">${intro}</p></section><section id="newsroom-live-feed" class="card"><p>${english?'Loading latest published news…':'Učitavanje najnovijih objava…'}</p></section><section class="grid3"><article class="card"><h2>${english?'Latest news':'Aktualne vijesti'}</h2><p>${english?'Business, technology, project and group updates.':'Poslovne, tehnološke, projektne i grupne informacije.'}</p></article><article class="card"><h2>${english?'Official releases':'Službene objave'}</h2><p>${english?'Corporate releases, documents and statements.':'Korporativne objave, dokumenti i izjave.'}</p></article><article class="card"><h2>Media Center</h2><p><a class="btn gold" href="/media-application/">Media Application</a></p></article></section></main><script defer src="${NEWSROOM_LIVE_SCRIPT}"></script><script defer src="${COMPACT_MENU_SCRIPT}"></script></body></html>`;
  return new Response(request.method==='HEAD'?null:html,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=120, stale-while-revalidate=300','x-gnk-public-route-source':'worker-fallback'}});
}

async function articleResponse(request,env){
  if(request.method!=='GET'&&request.method!=='HEAD')return null;
  const route=articleRoute(pathOf(request));if(!route)return null;
  const post=await getPublishedNewsBySlug(env,route.slug);if(!post)return null;
  const english=route.english||post.language==='en';
  const canonical=`https://gnk-asg.hr${english?'/en':''}/newsroom/${encodeURIComponent(post.slug)}/`;
  const source=post.sourceUrl?`<p><a href="${esc(post.sourceUrl)}" rel="noopener noreferrer">${english?'Source':'Izvor'}: ${esc(post.sourceName||post.sourceUrl)}</a></p>`:'';
  const content=esc(post.content||post.summary).replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');
  const html=`<!doctype html><html lang="${english?'en':'hr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(post.title)} | GNK ASG Newsroom</title><meta name="description" content="${esc(post.summary)}"><link rel="canonical" href="${canonical}"><link rel="stylesheet" href="/assets/public-sections-v1.css?v=20260711"><meta name="robots" content="index,follow,max-image-preview:large"></head><body><main class="wrap"><section class="hero"><p class="eyebrow">${esc(post.category||'Newsroom')}</p><h1>${esc(post.title)}</h1><p class="lead">${esc(post.summary)}</p><p><small>${esc(post.publishedAt||post.createdAt)}</small></p></section><article class="card"><p>${content}</p>${source}<p><a class="btn gold" href="${english?'/en/newsroom/':'/newsroom/'}">${english?'Back to Newsroom':'Natrag na Newsroom'}</a></p></article></main><script defer src="${COMPACT_MENU_SCRIPT}"></script></body></html>`;
  return new Response(request.method==='HEAD'?null:html,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=120, stale-while-revalidate=600','x-gnk-public-news-article':NEWS_AUTO_PUBLICATION_VERSION}});
}

async function publicAssetResponse(request,env){
  if(request.method!=='GET'&&request.method!=='HEAD')return null;
  const assetPath=PUBLIC_ASSET_ROUTES.get(pathOf(request));if(!assetPath||!env.ASSETS?.fetch)return newsroomFallback(request);
  const target=new URL(assetPath,request.url);target.search='';
  const asset=await env.ASSETS.fetch(new Request(target.toString(),{method:request.method,headers:request.headers}));if(asset.status===404)return newsroomFallback(request);
  const headers=new Headers(asset.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('content-type','text/html; charset=utf-8');headers.set('cache-control','public, max-age=300');headers.set('x-gnk-public-route-source','static-asset');
  return new Response(request.method==='HEAD'?null:await asset.text(),{status:asset.status,statusText:asset.statusText,headers});
}

async function injectGlobalAssets(request,response){
  if(!shouldInject(request,response)||request.method==='HEAD')return response;
  try{
    let html=await response.text();const scripts=[],styles=[],path=pathOf(request),index=isIndexPath(path),publicPage=isPublicPage(path),marketLive=isMarketLivePath(path);
    html=html.replace(/<script[^>]+public-floating-menu-v1\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+public-floating-menu-v2\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+public-compact-menu-v1\.js[^>]*><\/script>/gi,'').replace(/<link[^>]+public-floating-menu-mobile-v2\.css[^>]*>/gi,'').replace(/<link[^>]+index-event-bar-theme-v1\.css[^>]*>/gi,'').replace(/<link[^>]+index-live-shell-v1\.css[^>]*>/gi,'');
    if(publicPage) scripts.push(`<script defer src="${COMPACT_MENU_SCRIPT}"></script>`);
    if(isCountdownPath(path)&&!html.includes('the-code-countdown-v1.js'))scripts.push(`<script defer src="${COUNTDOWN_SCRIPT}"></script>`);
    if(path==='/media-application'&&!html.includes('media-registration-qa-v1.js'))scripts.push(`<script defer src="${MEDIA_QA_SCRIPT}"></script>`);
    if(index){scripts.push(`<script defer src="${INDEX_HUB_SCRIPT}"></script>`);styles.push(`<link rel="stylesheet" href="${INDEX_HUB_STYLE}">`);}
    if(isNewsroomLanding(path)&&!html.includes('newsroom-live-v1.js'))scripts.push(`<script defer src="${NEWSROOM_LIVE_SCRIPT}"></script>`);
    if(marketLive&&!html.includes('public-market-live-v1.js'))scripts.push(`<script defer src="${MARKET_LIVE_SCRIPT}"></script>`);
    if(marketLive&&!html.includes('public-market-live-v1.css'))styles.push(`<link rel="stylesheet" href="${MARKET_LIVE_STYLE}">`);
    if(styles.length){const bundle=styles.join('');html=html.includes('</head>')?html.replace('</head>',`${bundle}</head>`):`${bundle}${html}`;}
    if(scripts.length){const bundle=scripts.join('');html=html.includes('</body>')?html.replace('</body>',`${bundle}</body>`):`${html}${bundle}`;}
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('content-type','text/html; charset=utf-8');headers.set('x-gnk-global-floating-menu',publicPage?'compact-top-three-button':'disabled');
    if(index)headers.set('x-gnk-public-index-hub','live-news-feed-v1');if(isNewsroomLanding(path))headers.set('x-gnk-newsroom-feed','public-kv-feed-v1');if(marketLive)headers.set('x-gnk-market-live','ecb-world-bank-v1');return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

function stamp(request,response){const headers=new Headers(response.headers);headers.set('x-content-type-options','nosniff');headers.set('x-frame-options','SAMEORIGIN');headers.set('referrer-policy','strict-origin-when-cross-origin');headers.set('permissions-policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');headers.set('cross-origin-resource-policy','same-site');if(isProtectedPath(request)){headers.set('x-robots-tag','noindex, nofollow, noarchive, nosnippet');headers.set('cache-control','no-store, private, max-age=0');headers.set('pragma','no-cache');}headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v17.js');headers.set('x-gnk-global-menu-version',VERSION);headers.set('x-gnk-news-auto-publication',NEWS_AUTO_PUBLICATION_VERSION);headers.set('x-gnk-mail-autoreply',MAIL_AUTOREPLY_VERSION);headers.set('x-gnk-email-logo',EMAIL_LOGO_VERSION);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}

export default{
  async fetch(request,env,ctx){const logo=handleEmailLogo(request);if(logo)return logo;const newsApi=await handlePublicNews(request,env);if(newsApi)return newsApi;const article=await articleResponse(request,env);if(article)return stamp(request,article);const publicAsset=await publicAssetResponse(request,env);const response=publicAsset||await app.fetch(request,env,ctx);return stamp(request,await injectGlobalAssets(request,response));},
  scheduled(event,env,ctx){const tasks=[];if(typeof app.scheduled==='function')tasks.push(Promise.resolve(app.scheduled(event,env,ctx)));tasks.push(Promise.resolve(runScheduledNewsPublication(env)));const combined=Promise.allSettled(tasks);if(ctx?.waitUntil){ctx.waitUntil(combined);return;}return combined;},
  async email(message,env,ctx){return handleIncomingEmail(message,env,ctx,app);}
};