import app from './index-admin-hub-v21.js';
import {
  handleMediaApplicationPortal,
  VERSION as MEDIA_APPLICATION_VERSION,
  UI_PATH as MEDIA_APPLICATION_UI,
  API_PREFIX as MEDIA_APPLICATION_API
} from './media-application-portal-v1.js';

const VERSION='GNK_ASG_ADMIN_HUB_V22_NEWS_V22_PUBLIC_NEWS_RUNTIME_20260627';
const NEWS_SCHEDULE=['09:00','16:00','21:00'];
const SOURCE_MIX={global:13,regional:9,croatian:4};
const MEDIA_UI='/media-command-center';
const NOTIFICATION_STYLE='<link rel="stylesheet" href="/assets/media-notifications-v1.css?v=20260627">';
const NOTIFICATION_SCRIPT='<script defer src="/assets/media-notifications-v1.js?v=20260627"></script>';
const EXISTING_FIELDS_STYLE='<link rel="stylesheet" href="/assets/index-existing-media-slots-v2.css?v=20260627-existing-v2">';
const EXISTING_FIELDS_VERSION='GNK_ASG_INDEX_EXISTING_FIELDS_V2_20260627';
let visualAssetsPromise=null;

function normalize(path){return path.replace(/\/+$/,'')||'/';}
function isApplication(path){return path===MEDIA_APPLICATION_UI||path.startsWith(`${MEDIA_APPLICATION_UI}/`)||path===MEDIA_APPLICATION_API||path.startsWith(`${MEDIA_APPLICATION_API}/`);}
function safeBase64(value){const encoded=String(value||'').replace(/\s+/g,'');return encoded&&/^[A-Za-z0-9+/=]+$/.test(encoded)?encoded:'';}

async function loadVisualAssets(request,env){
  if(visualAssetsPromise)return visualAssetsPromise;
  visualAssetsPromise=(async()=>{
    if(!env.ASSETS?.fetch)throw new Error('ASSETS_BINDING_MISSING');
    const paths=['/assets/the-code-visual-01.b64','/assets/the-code-visual-02.b64'];
    const responses=await Promise.all(paths.map(path=>env.ASSETS.fetch(new Request(new URL(path,request.url)))));
    if(responses.some(response=>!response.ok))throw new Error('VISUAL_ASSET_MISSING');
    const images=(await Promise.all(responses.map(response=>response.text()))).map(safeBase64);
    if(images.some(image=>!image))throw new Error('VISUAL_ASSET_INVALID');
    return images;
  })().catch(error=>{visualAssetsPromise=null;throw error;});
  return visualAssetsPromise;
}

function existingFieldMarkup(images,english){
  const first=english?'GNK ASG global network, technology, data and governance':'GNK ASG globalna mreža, tehnologija, podaci i upravljanje';
  const second=english?'GNK DINAMO Ltd. Group New York activation':'GNK DINAMO Ltd. Group aktivacija u New Yorku';
  const visuals=`<div id="gnk-existing-visual-stage" data-gnk-existing-field="visuals" aria-label="${english?'Two campaign visuals rotating every ten seconds':'Dva kampanjska vizuala koji se izmjenjuju svakih deset sekundi'}"><div class="gnk-existing-slides"><figure class="gnk-existing-slide"><img src="data:image/webp;base64,${images[0]}" alt="${first}" width="1080" height="1080" loading="eager" decoding="async"></figure><figure class="gnk-existing-slide"><img src="data:image/webp;base64,${images[1]}" alt="${second}" width="1080" height="1080" loading="eager" decoding="async"></figure></div></div>`;
  const code='<div id="gnk-existing-code-stage" data-gnk-existing-field="the-code" aria-label="THE CODE"><div class="gnk-existing-code-shell"><iframe title="THE CODE — GNK DINAMO Ltd." src="/the-code/?v=20260627-existing-v2" loading="eager" sandbox="allow-scripts" allow="autoplay" scrolling="no"></iframe><span class="gnk-existing-code-badge">THE CODE</span></div></div>';
  return{visuals,code};
}

async function correctJson(response){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const corrected={...payload,timeZone:'Europe/Zagreb',newsSchedule:NEWS_SCHEDULE,newsRefreshesPerDay:3,configuredNewsSources:26,sourceMix:SOURCE_MIX,minimumVerifiedLinks:15,activeNewsLimit:100,archivePruneAt:1000,archiveDeleteCount:500,archiveRetainAfterPrune:500,archiveHardLimit:1000,newsRuntime:'GNK_ASG_NEWS_LIFECYCLE_V18_ARCHIVE_1000_500_20260627',contentContract:{title:true,summaryMinCharacters:60,source:true,articleVerified:true,sourceImageVerified:true,fallbackImagesAllowed:false},mediaApplicationPortal:MEDIA_APPLICATION_VERSION,mediaApplicationRoute:'/media-application/',mediaNotificationMinimum:10,mediaNotificationRefreshSeconds:1800,indexExistingMediaFields:EXISTING_FIELDS_VERSION,indexVisualRotationSeconds:10,indexCodeRoute:'/the-code/'};
    const headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-admin-hub-v22',VERSION);
    headers.set('x-gnk-asg-media-application',MEDIA_APPLICATION_VERSION);
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

function ensureTag(body,tag,closeTag){return body.includes(tag)?body:body.replace(closeTag,`${tag}${closeTag}`);}

async function patchNewsHtml(response,path){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-admin-hub-v22',VERSION);
  headers.set('x-gnk-asg-news-runtime','PUBLIC_NEWS_V22_VERIFIED_100_ARCHIVE_500');
  let body=await response.text();
  const english=path==='/news';
  const title=english?'Verified business news | GNK ASG':'Provjerene poslovne vijesti | GNK ASG';
  const heading=english?'Verified business news':'Provjerene poslovne vijesti';
  const lead=english?'Up to 100 verified business, technology, market and economic news items with source link, image and summary. The system refreshes at 09:00, 16:00 and 21:00 Europe/Zagreb.':'Do 100 provjerenih poslovnih, tehnoloških, tržišnih i gospodarskih vijesti sa slikom, sažetkom, izvorom i provjerenom poveznicom. Sustav se osvježava u 09:00, 16:00 i 21:00 po vremenu Europe/Zagreb.';
  const loading=english?'Loading verified news…':'Učitavanje provjerenih vijesti…';
  body=body.replace(/<title>[\s\S]*?<\/title>/i,`<title>${title}</title>`);
  body=body.replace(/<meta name="description" content="[^"]*">/i,`<meta name="description" content="${lead}">`);
  body=body.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i,`<h1>${heading}</h1>`);
  body=body.replace(/<p>Aktualni vanjski poslovni[\s\S]*?<\/p>/i,`<p>${lead}</p>`);
  body=body.replace(/Učitavanje(?: poslovnih vijesti| provjerenih vijesti|…|\.\.\.)?/g,loading);
  body=body.replace(/business-news(?:-v\d+)?\.js\?v=[^"']+/g,'business-news-v16.js?v=20260627-news-v22');
  if(!/business-news-v16\.js/i.test(body))body=body.replace('</body>','<script defer src="/assets/business-news-v16.js?v=20260627-news-v22"></script></body>');
  body=ensureTag(body,'<link rel="stylesheet" href="/assets/business-news.css?v=20260627-news-v22">','</head>');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function patchIndexExistingFields(response,path,request,env){
  if(request.method!=='GET'||!['/','/en'].includes(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-existing-fields',EXISTING_FIELDS_VERSION);
  let body=await response.text();
  body=body.replace(/<script[^>]+src=["'][^"']*\/assets\/(?:gallery-bootstrap|index-activation-v1)\.js[^"']*["'][^>]*><\/script>/gi,'');
  body=body.replace(/<section[^>]+(?:id=["']the-code-index["']|class=["'][^"']*(?:gnk-code-slot|gnk-activation)[^"']*["'])[^>]*>[\s\S]*?<\/section>/gi,'');
  try{
    const images=await loadVisualAssets(request,env);
    const markup=existingFieldMarkup(images,path==='/en');
    if(!body.includes('index-existing-media-slots-v2.css'))body=body.replace('</head>',`${EXISTING_FIELDS_STYLE}</head>`);
    if(!body.includes('data-gnk-existing-field="visuals"'))body=body.replace(/(<article class="map-card"[^>]*>[\s\S]*?)(<\/article><article class="locations")/,`$1${markup.visuals}$2`);
    if(!body.includes('data-gnk-existing-field="the-code"'))body=body.replace(/(<article class="locations"[^>]*>[\s\S]*?)(<\/article><aside class="expansion")/,`$1${markup.code}$2`);
  }catch(error){headers.set('x-gnk-asg-index-existing-fields-error',String(error?.message||error).slice(0,100));}
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function patchMediaHtml(response,path){
  if(path!==MEDIA_UI||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-media-application',MEDIA_APPLICATION_VERSION);
  let body=await response.text();
  if(!body.includes('media-notifications-v1.css'))body=body.replace('</head>',`${NOTIFICATION_STYLE}</head>`);
  if(!body.includes('media-notifications-v1.js'))body=body.replace('</body>',`${NOTIFICATION_SCRIPT}</body>`);
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=normalize(new URL(request.url).pathname);
    if(isApplication(path)){
      const applicationResponse=await handleMediaApplicationPortal(request,env,ctx);
      if(applicationResponse)return applicationResponse;
    }
    let response=await app.fetch(request,env,ctx);
    if(request.method==='GET'&&['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json'].includes(path))response=await correctJson(response);
    if(request.method==='GET'&&['/vijesti','/news'].includes(path))response=await patchNewsHtml(response,path);
    response=await patchIndexExistingFields(response,path,request,env);
    response=await patchMediaHtml(response,path);
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-admin-hub-v22',VERSION);
    headers.set('x-gnk-asg-media-application',MEDIA_APPLICATION_VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};