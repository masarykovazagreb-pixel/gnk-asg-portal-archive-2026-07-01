import app from './index-admin-hub-v21.js';
import {
  handleMediaApplicationPortal,
  VERSION as MEDIA_APPLICATION_VERSION,
  UI_PATH as MEDIA_APPLICATION_UI,
  API_PREFIX as MEDIA_APPLICATION_API
} from './media-application-portal-v1.js';

const VERSION='GNK_ASG_ADMIN_HUB_V22_NEWS_V19_CODE_SHOWCASE_20260627';
const NEWS_SCHEDULE=['09:00','16:00','21:00'];
const SOURCE_MIX={global:13,regional:9,croatian:4};
const MEDIA_UI='/media-command-center';
const NOTIFICATION_STYLE='<link rel="stylesheet" href="/assets/media-notifications-v1.css?v=20260627">';
const NOTIFICATION_SCRIPT='<script defer src="/assets/media-notifications-v1.js?v=20260627"></script>';
const CODE_SHOWCASE_STYLE='<link rel="stylesheet" href="/assets/the-code-index-slot.css?v=20260627-static-v2">';
const CODE_SHOWCASE_VERSION='GNK_ASG_INDEX_CODE_SHOWCASE_STATIC_V2_20260627';
let showcaseAssetsPromise=null;

function normalize(path){return path.replace(/\/+$/,'')||'/';}
function isApplication(path){return path===MEDIA_APPLICATION_UI||path.startsWith(`${MEDIA_APPLICATION_UI}/`)||path===MEDIA_APPLICATION_API||path.startsWith(`${MEDIA_APPLICATION_API}/`);}
function safeBase64(value){
  const encoded=String(value||'').replace(/\s+/g,'');
  return encoded&&/^[A-Za-z0-9+/=]+$/.test(encoded)?encoded:'';
}

async function loadShowcaseAssets(request,env){
  if(showcaseAssetsPromise)return showcaseAssetsPromise;
  showcaseAssetsPromise=(async()=>{
    if(!env.ASSETS?.fetch)throw new Error('ASSETS_BINDING_MISSING');
    const urls=['/assets/the-code-visual-01.b64','/assets/the-code-visual-02.b64'].map(path=>new URL(path,request.url).toString());
    const responses=await Promise.all(urls.map(url=>env.ASSETS.fetch(new Request(url,{headers:{accept:'text/plain'}}))));
    if(responses.some(response=>!response.ok))throw new Error(`VISUAL_ASSET_HTTP_${responses.map(response=>response.status).join('_')}`);
    const encoded=await Promise.all(responses.map(response=>response.text()));
    const images=encoded.map(safeBase64);
    if(images.some(value=>!value))throw new Error('VISUAL_ASSET_INVALID_BASE64');
    return images;
  })().catch(error=>{
    showcaseAssetsPromise=null;
    throw error;
  });
  return showcaseAssetsPromise;
}

function showcaseMarkup(images,english){
  const altOne=english
    ?'GNK ASG global network, advanced sport, technology and governance'
    :'GNK ASG globalna mreža, napredni sport, tehnologija i upravljanje';
  const altTwo=english
    ?'GNK DINAMO Ltd. Group New York activation on October 7, 2026'
    :'GNK DINAMO Ltd. Group aktivacija u New Yorku 7. listopada 2026.';
  const visualLabel=english?'Two campaign visuals rotating every ten seconds':'Dva kampanjska vizuala koji se izmjenjuju svakih deset sekundi';
  return `<section class="section gnk-code-slot" id="the-code-index" aria-label="GNK DINAMO Ltd. — THE CODE and campaign visuals" data-gnk-code-showcase="${CODE_SHOWCASE_VERSION}"><div class="gnk-code-slot__grid"><article class="gnk-code-slot__visual" aria-label="${visualLabel}"><div class="gnk-code-slot__slides"><figure class="gnk-code-slot__slide"><img src="data:image/webp;base64,${images[0]}" alt="${altOne}" width="1080" height="1080" loading="eager" decoding="async"></figure><figure class="gnk-code-slot__slide"><img src="data:image/webp;base64,${images[1]}" alt="${altTwo}" width="1080" height="1080" loading="eager" decoding="async"></figure></div></article><aside class="gnk-code-slot__code" aria-label="THE CODE interactive presentation"><iframe title="THE CODE — GNK DINAMO Ltd." src="/the-code/?v=20260627-static-v2" loading="eager" sandbox="allow-scripts" allow="autoplay" scrolling="no"></iframe><span class="gnk-code-slot__badge">THE CODE · HTML</span></aside></div></section>`;
}

async function correctJson(response){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const corrected={...payload,timeZone:'Europe/Zagreb',newsSchedule:NEWS_SCHEDULE,newsRefreshesPerDay:3,configuredNewsSources:26,sourceMix:SOURCE_MIX,minimumVerifiedLinks:15,activeNewsLimit:100,archivePruneAt:1000,archiveDeleteCount:500,archiveRetainAfterPrune:500,archiveHardLimit:1000,newsRuntime:'GNK_ASG_NEWS_LIFECYCLE_V18_ARCHIVE_1000_500_20260627',contentContract:{title:true,summaryMinCharacters:60,source:true,articleVerified:true,sourceImageVerified:true,fallbackImagesAllowed:false},mediaApplicationPortal:MEDIA_APPLICATION_VERSION,mediaApplicationRoute:'/media-application/',mediaNotificationMinimum:10,mediaNotificationRefreshSeconds:1800,indexCodeShowcase:CODE_SHOWCASE_VERSION,indexCodeShowcasePosition:'BEFORE_FOOTER',indexCodeVisualRotationSeconds:10,indexCodeHtmlRoute:'/the-code/'};
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-admin-hub-v22',VERSION);
    headers.set('x-gnk-asg-media-application',MEDIA_APPLICATION_VERSION);
    headers.set('x-gnk-asg-index-code-showcase',CODE_SHOWCASE_VERSION);
    return new Response(JSON.stringify(corrected,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

async function patchNewsHtml(response){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-admin-hub-v22',VERSION);
  let body=await response.text();
  body=body.replace(/business-news(?:-v\d+)?\.js\?v=[^"']+/g,'business-news-v16.js?v=20260626-news-v16');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function patchMediaHtml(response,path){
  if(path!==MEDIA_UI||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-media-application',MEDIA_APPLICATION_VERSION);
  let body=await response.text();
  if(!body.includes('media-notifications-v1.css'))body=body.replace('</head>',`${NOTIFICATION_STYLE}</head>`);
  if(!body.includes('media-notifications-v1.js'))body=body.replace('</body>',`${NOTIFICATION_SCRIPT}</body>`);
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function patchIndexShowcase(response,path,request,env){
  if(!['/','/en'].includes(path)||request.method!=='GET'||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-code-showcase',CODE_SHOWCASE_VERSION);
  let body=await response.text();
  if(body.includes('data-gnk-code-showcase='))return new Response(body,{status:response.status,statusText:response.statusText,headers});
  try{
    const images=await loadShowcaseAssets(request,env);
    if(!body.includes('the-code-index-slot.css'))body=body.replace('</head>',`${CODE_SHOWCASE_STYLE}</head>`);
    const markup=showcaseMarkup(images,path==='/en');
    body=body.includes('</main>')?body.replace('</main>',`${markup}</main>`):body;
  }catch(error){
    headers.set('x-gnk-asg-index-code-showcase-error',String(error?.message||error).slice(0,120));
  }
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
    if(request.method==='GET'&&['/vijesti','/news'].includes(path))response=await patchNewsHtml(response);
    response=await patchIndexShowcase(response,path,request,env);
    response=await patchMediaHtml(response,path);
    const headers=new Headers(response.headers);
    headers.set('x-gnk-asg-admin-hub-v22',VERSION);
    headers.set('x-gnk-asg-media-application',MEDIA_APPLICATION_VERSION);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};