import app,{VERSION as BASE_VERSION} from './index-unified-auth-v16.js';
import {runScheduledNewsPublication,VERSION as NEWS_AUTO_PUBLICATION_VERSION} from './news-auto-publication-v1.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V46_20260712_INDEX_HUB_${NEWS_AUTO_PUBLICATION_VERSION}_${BASE_VERSION}`;

const FLOATING_MENU_SCRIPT='/assets/public-floating-menu-v2.js?v=20260711-admin-first';
const COUNTDOWN_SCRIPT='/assets/the-code-countdown-v1.js?v=20260711-live';
const MEDIA_QA_SCRIPT='/assets/media-registration-qa-v1.js?v=20260711-deadline-a11y';
const INDEX_HUB_SCRIPT='/assets/index-live-hub-v1.js?v=20260712-dynamic-init';
const INDEX_HUB_STYLE='/assets/index-live-hub-v1.css?v=20260712-public-hub';
const PROTECTED_PREFIXES=[
  '/admin',
  '/admin-center',
  '/mail-studio',
  '/campaign-mailer',
  '/email-status',
  '/worker-ops',
  '/operator-dashboard',
  '/digital-headquarters',
  '/media-registration-admin',
  '/webmail'
];

function pathOf(request){
  return new URL(request.url).pathname.replace(/\/+$/,'')||'/';
}

function isProtectedPath(request){
  const path=pathOf(request);
  return PROTECTED_PREFIXES.some(prefix=>path===prefix||path.startsWith(`${prefix}/`));
}

function isTheCodePath(path){
  return path==='/the-code'||path.startsWith('/the-code/')||path==='/en/the-code'||path.startsWith('/en/the-code/');
}

function isCountdownPath(path){
  return path==='/'||path==='/en'||isTheCodePath(path);
}

function isIndexPath(path){
  return path==='/'||path==='/en';
}

function shouldInject(request,response){
  if(request.method!=='GET'&&request.method!=='HEAD')return false;
  if(response.status!==200)return false;
  const path=pathOf(request);
  if(path.startsWith('/api/'))return false;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  return type.includes('text/html');
}

async function injectGlobalAssets(request,response){
  if(!shouldInject(request,response)||request.method==='HEAD')return response;
  try{
    let html=await response.text();
    html=html.replace(/<script[^>]+public-floating-menu-v1\.js[^>]*><\/script>/gi,'');
    const scripts=[];
    const path=pathOf(request);

    if(!html.includes('public-floating-menu-v2.js'))scripts.push(`<script defer src="${FLOATING_MENU_SCRIPT}"></script>`);
    if(isCountdownPath(path)&&!html.includes('the-code-countdown-v1.js'))scripts.push(`<script defer src="${COUNTDOWN_SCRIPT}"></script>`);
    if(path==='/media-application'&&!html.includes('media-registration-qa-v1.js'))scripts.push(`<script defer src="${MEDIA_QA_SCRIPT}"></script>`);
    if(isIndexPath(path)&&!html.includes('index-live-hub-v1.js'))scripts.push(`<script defer src="${INDEX_HUB_SCRIPT}"></script>`);

    if(isIndexPath(path)&&!html.includes('index-live-hub-v1.css')){
      const style=`<link rel="stylesheet" href="${INDEX_HUB_STYLE}">`;
      html=html.includes('</head>')?html.replace('</head>',`${style}</head>`):`${style}${html}`;
    }

    if(scripts.length){
      const bundle=scripts.join('');
      html=html.includes('</body>')?html.replace('</body>',`${bundle}</body>`):`${html}${bundle}`;
    }

    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('x-gnk-global-floating-menu','admin-first-bilingual');
    if(isCountdownPath(path))headers.set('x-gnk-the-code-countdown','enabled');
    if(isIndexPath(path))headers.set('x-gnk-public-index-hub','dynamic-init-v1');
    if(path==='/media-application')headers.set('x-gnk-media-qa','deadline-a11y-v1');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

function stamp(request,response){
  const headers=new Headers(response.headers);
  headers.set('x-content-type-options','nosniff');
  headers.set('x-frame-options','SAMEORIGIN');
  headers.set('referrer-policy','strict-origin-when-cross-origin');
  headers.set('permissions-policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  headers.set('cross-origin-resource-policy','same-site');
  if(isProtectedPath(request)){
    headers.set('x-robots-tag','noindex, nofollow, noarchive, nosnippet');
    headers.set('cache-control','no-store, private, max-age=0');
    headers.set('pragma','no-cache');
  }
  headers.set('x-gnk-active-entrypoint','src/index-unified-auth-v17.js');
  headers.set('x-gnk-global-menu-version',VERSION);
  headers.set('x-gnk-news-auto-publication',NEWS_AUTO_PUBLICATION_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    return stamp(request,await injectGlobalAssets(request,response));
  },
  scheduled(event,env,ctx){
    const tasks=[];
    if(typeof app.scheduled==='function')tasks.push(Promise.resolve(app.scheduled(event,env,ctx)));
    tasks.push(Promise.resolve(runScheduledNewsPublication(env)));
    const combined=Promise.allSettled(tasks);
    if(ctx?.waitUntil){ctx.waitUntil(combined);return;}
    return combined;
  },
  async email(message,env,ctx){
    if(typeof app.email==='function')return app.email(message,env,ctx);
  }
};
