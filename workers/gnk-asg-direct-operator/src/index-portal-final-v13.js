import core from './index-portal-final-v12.js';
import {getLiveMarket,refreshLiveMarket,VERSION as MARKET_VERSION} from './market-live-v1.js';
import {verifiedGallery,rotateLatestArticleImage,VERSION as GALLERY_VERSION,RECENT_WINDOW as GALLERY_RECENT_WINDOW} from './gallery-rotation-v1.js';
import {handleIncomingEmail,VERSION as MAIL_AUTOREPLY_VERSION} from './mail-identity-autoreply-v1.js';

const VERSION='GNK_ASG_PORTAL_FINAL_V16_MAIL_AUTOREPLY_20260706';
const NEWS_ROTATION='GNK_ASG_INDEX_NEWS_ROTATION_V1';
const NEWS_SCHEDULE=['09:00','15:00','21:00'];
const FAVICON_VERSION='GNK_ASG_GOOGLE_FAVICON_V1';
const MARKET_CHART='GNK_ASG_LIVE_MARKET_CHART_V3';
const GROUP_NETWORK='GNK_ASG_GROUP_NETWORK_V2';
const MEDIA_APPLICATION_DESCRIPTION='Secure bilingual media registration and accreditation portal for GNK ASG d.o.o. and GNK DINAMO Ltd. Group. Newsrooms can create access, save a draft and submit official media application details.';
const INDEX_RESCUE='GNK_ASG_THE_CODE_INDEX_REDIRECT_V2_20260708';

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-portal-final':VERSION,
    'x-gnk-asg-news-rotation':NEWS_ROTATION,
    'x-gnk-asg-favicon':FAVICON_VERSION,
    'x-gnk-asg-market-live':MARKET_VERSION,
    'x-gnk-asg-group-network':GROUP_NETWORK,
    'x-gnk-asg-gallery':GALLERY_VERSION
  }
});

const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
async function readJson(env,key,fallback=null){
  const kv=store(env);
  if(!kv)return fallback;
  try{
    const raw=await kv.get(key);
    return raw?JSON.parse(raw):fallback;
  }catch{return fallback}
}

function withHeaders(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-portal-final',VERSION);
  headers.set('x-gnk-asg-news-rotation',NEWS_ROTATION);
  headers.set('x-gnk-asg-favicon',FAVICON_VERSION);
  headers.set('x-gnk-asg-market-live',MARKET_VERSION);
  headers.set('x-gnk-asg-group-network',GROUP_NETWORK);
  headers.set('x-gnk-asg-gallery',GALLERY_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function staticAsset(request,env,assetPath,contentType){
  if(!env.ASSETS?.fetch)return null;
  const target=new URL(assetPath,request.url);
  const response=await env.ASSETS.fetch(new Request(target,{method:request.method,headers:request.headers}));
  if(response.status===404)return null;
  const headers=new Headers(response.headers);
  headers.set('content-type',contentType);
  headers.set('cache-control','public, max-age=604800, stale-while-revalidate=2592000');
  headers.set('x-robots-tag','all');
  headers.set('x-gnk-asg-favicon',FAVICON_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function faviconResponse(request,env,path){
  if(path==='/favicon.ico'){
    return new Response(null,{status:301,headers:{location:new URL('/favicon.svg',request.url).toString(),'cache-control':'public, max-age=604800','x-robots-tag':'all','x-gnk-asg-favicon':FAVICON_VERSION}});
  }
  if(path==='/favicon.svg')return staticAsset(request,env,'/favicon.svg','image/svg+xml; charset=utf-8');
  if(path==='/site.webmanifest')return staticAsset(request,env,'/site.webmanifest','application/manifest+json; charset=utf-8');
  return null;
}

function isPublicationPath(path){
  return path==='/objave'||path==='/publications'||path.startsWith('/objave/')||path.startsWith('/publications/');
}

async function staticPublicationResponse(request,env){
  if(!env.ASSETS?.fetch)return null;
  const response=await env.ASSETS.fetch(request);
  if(response.status===404)return null;
  return withHeaders(response);
}

function staticIndexResponse(request){
  const target=new URL('/the-code/',request.url);
  return new Response(null,{
    status:302,
    headers:{
      location:target.toString(),
      'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
      'x-gnk-asg-index-rescue':INDEX_RESCUE,
      'x-gnk-asg-portal-final':VERSION,
      'x-robots-tag':'index, follow',
      link:'<https://gnk-asg.hr/the-code/>; rel="canonical"'
    }
  });
}

async function injectIndexModules(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-portal-final',VERSION);
  headers.set('x-gnk-asg-news-rotation',NEWS_ROTATION);
  headers.set('x-gnk-asg-favicon',FAVICON_VERSION);
  headers.set('x-gnk-asg-market-live',MARKET_VERSION);
  headers.set('x-gnk-asg-group-network',GROUP_NETWORK);
  headers.set('x-gnk-asg-gallery',GALLERY_VERSION);
  let body=await response.text();
  if(!body.includes('/assets/index-group-network-v2.css'))body=body.replace('</head>','<link rel="stylesheet" href="/assets/index-group-network-v2.css?v=20260625-v2"></head>');
  if(!body.includes('/assets/index-news-rotation-v1.js'))body=body.replace('</body>','<script src="/assets/index-news-rotation-v1.js?v=20260625-v1" defer></script></body>');
  if(!body.includes('/assets/index-live-market-chart-v3.js'))body=body.replace('</body>','<script src="/assets/index-live-market-chart-v3.js?v=20260625-v3" defer></script></body>');
  if(!body.includes('/assets/index-group-network-en-bridge-v1.js'))body=body.replace('</body>','<script src="/assets/index-group-network-en-bridge-v1.js?v=20260625-v1" defer></script></body>');
  if(!body.includes('/assets/index-group-network-v2.js'))body=body.replace('</body>','<script src="/assets/index-group-network-v2.js?v=20260625-v2" defer></script></body>');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function cleanMediaApplicationHtml(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-media-application-seo','clean-20260706');
  let body=await response.text();
  body=body
    .replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+MEDIA_APPLICATION_DESCRIPTION+'">')
    .replace(/<meta property="og:description" content="[^"]*">/,'<meta property="og:description" content="'+MEDIA_APPLICATION_DESCRIPTION+'">')
    .replace(/<meta name="twitter:description" content="[^"]*">/,'<meta name="twitter:description" content="'+MEDIA_APPLICATION_DESCRIPTION+'">')
    .replaceAll('https://gnk-asg.hr/assets/logo-gnk-asg.svg','https://gnk-asg.hr/assets/brand/official-gnk-asg-gold.svg')
    .replaceAll('https://gnkdinamo.eu/','https://gnk-asg.hr/')
    .replace('<a class="brand" href="/"><span class="brand-mark">G</span><span><strong>GNK ASG</strong><small>THE CODE · New York 2026</small></span></a>','<a class="brand" href="/"><img src="/assets/brand/official-gnk-asg-gold.svg" alt="GNK ASG d.o.o. official logo" style="width:42px;height:42px;object-fit:contain"><span><strong>GNK ASG</strong><small>Media Relations & Accreditation Center</small></span></a>');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function fetchHandler(request,env,ctx){
  const url=new URL(request.url);
  const path=url.pathname.replace(/\/+$/,'')||'/';

  if(request.method==='GET'&&path==='/data/portal-version.json'){
    return json({
      ok:true,
      version:VERSION,
      publicUx:'GNK_ASG_PUBLIC_UX_V12',
      publicVisual:'GNK_ASG_PUBLIC_VISUAL_V16_20260625',
      publicMenu:'GNK_ASG_PUBLIC_MENU_V15',
      floatingHome:'GNK_ASG_FLOATING_HOME_V16',
      adminVisual:'GNK_ASG_ADMIN_UNIFIED_V7_20260625',
      favicon:FAVICON_VERSION,
      indexClock:'GNK_ASG_INDEX_CLOCK_V2',
      automation:'GNK_ASG_PORTAL_EXPERIENCE_V10_20260625',
      newsRotation:NEWS_ROTATION,
      marketVersion:MARKET_VERSION,
      marketChart:MARKET_CHART,
      groupNetwork:GROUP_NETWORK,
      galleryVersion:GALLERY_VERSION,
      indexDesign:'the-code-homepage-redirect-v2',
      indexRescue:INDEX_RESCUE,
      publicationRouting:'static-assets-first-dynamic-kv-fallback',
      mediaApplicationSeo:'clean-20260706',
      mailAutoreply:MAIL_AUTOREPLY_VERSION,
      timeZone:'Europe/Zagreb',
      deployedEntryPoint:'src/index-portal-final-v13.js'
    });
  }

  if((request.method==='GET'||request.method==='HEAD')&&['/favicon.ico','/favicon.svg','/site.webmanifest'].includes(path)){
    const response=await faviconResponse(request,env,path);
    if(response)return response;
  }

  if((request.method==='GET'||request.method==='HEAD')&&['/','/en'].includes(path)){
    return staticIndexResponse(request);
  }

  if((request.method==='GET'||request.method==='HEAD')&&isPublicationPath(path)){
    const response=await staticPublicationResponse(request,env);
    if(response)return response;
  }

  if(request.method==='GET'&&['/api/market','/api/market-live','/data/market-live.json'].includes(path)){
    const market=await getLiveMarket(env);
    return json(market,market.ok?200:503);
  }

  if(request.method==='GET'&&path==='/data/visual_gallery.json'){
    const gallery=await verifiedGallery(env);
    return json({album:gallery.album,items:gallery.items,audit:{version:gallery.audit.version,checkedAt:gallery.audit.checkedAt,sourceCount:gallery.audit.sourceCount,verifiedCount:gallery.audit.verifiedCount,removedCount:gallery.audit.removedCount}});
  }

  if(request.method==='GET'&&path==='/data/visual_gallery-audit.json'){
    const gallery=await verifiedGallery(env);
    return json(gallery.audit);
  }

  if(request.method==='GET'&&path==='/data/news-automation-status.json'){
    const gallery=await verifiedGallery(env);
    return json({
      ok:true,
      version:VERSION,
      timeZone:'Europe/Zagreb',
      newsSchedule:NEWS_SCHEDULE,
      newsRefreshesPerDay:3,
      indexNewsPool:30,
      indexRotationSeconds:10,
      indexDataRefreshMinutes:15,
      autoEditorSchedule:'every 2 hours',
      marketSchedule:'every 5 minutes',
      marketEndpoint:'/api/market-live',
      marketVersion:MARKET_VERSION,
      marketChart:MARKET_CHART,
      groupNetwork:GROUP_NETWORK,
      galleryVersion:GALLERY_VERSION,
      galleryRecentWindow:GALLERY_RECENT_WINDOW,
      galleryVerifiedCount:gallery.audit.verifiedCount,
      galleryRemovedCount:gallery.audit.removedCount,
      lastImageUsage:(await readJson(env,'auto-editor:image-usage',[]))[0]||null,
      lastMarketLive:await readJson(env,'data:market:live:v1',null),
      favicon:{version:FAVICON_VERSION,url:'https://gnk-asg.hr/favicon.svg',icoRedirect:'https://gnk-asg.hr/favicon.ico'},
      lastNewsRefresh:await readJson(env,'automation:news-refresh:last',null),
      lastAutoEditor:await readJson(env,'auto-editor:last',null),
      lastScheduledRun:await readJson(env,'automation:v11:last',null)
    });
  }

  const response=await core.fetch(request,env,ctx);

  if(request.method==='POST'&&path==='/operator/auto-editor/run'&&response.ok){
    const assignment=await rotateLatestArticleImage(env,{force:true});
    try{
      const payload=await response.clone().json();
      return json({...payload,imageAssignment:assignment},response.status);
    }catch{
      return withHeaders(response);
    }
  }

  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(request.method==='GET'&&type.includes('text/html')&&['/','/en'].includes(path))return injectIndexModules(response);
  if(request.method==='GET'&&type.includes('text/html')&&path==='/media-application')return cleanMediaApplicationHtml(response);
  return withHeaders(response);
}

export default{
  fetch:fetchHandler,
  async scheduled(event,env,ctx){
    const marketTask=refreshLiveMarket(env).catch(error=>({ok:false,error:String(error?.message||error)}));
    const galleryTask=rotateLatestArticleImage(env).catch(error=>({ok:false,error:String(error?.message||error)}));
    if(ctx?.waitUntil){
      ctx.waitUntil(marketTask);
      ctx.waitUntil(galleryTask);
    }
    if(typeof core.scheduled==='function')return core.scheduled(event,env,ctx);
    return Promise.all([marketTask,galleryTask]);
  },
  async email(message,env,ctx){
    return handleIncomingEmail(message,env,ctx,core);
  }
};