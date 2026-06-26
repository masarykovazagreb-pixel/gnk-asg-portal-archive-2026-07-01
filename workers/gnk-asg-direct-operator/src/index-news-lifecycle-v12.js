import core from './index-portal-experience-v10.js';
import {VERSION,ACTIVE_NEWS_LIMIT,ARCHIVE_PRUNE_AT,ARCHIVE_DELETE_COUNT,ARCHIVE_RETAIN_AFTER_PRUNE,NEWS_SCHEDULE,FALLBACK_IMAGE,FEEDS} from './news-curation-v10.js';

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-news-lifecycle':VERSION}});
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
async function read(env,key,fallback){const kv=store(env);if(!kv)return fallback;try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function withHeader(response){const headers=new Headers(response.headers);headers.set('x-gnk-asg-news-lifecycle',VERSION);return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function isFallbackImage(value){
  const image=String(value||'').trim().toLowerCase();
  return !image||image.includes('/assets/news-fallback.svg')||image.startsWith('data:image/svg+xml');
}
function normalizePublicItem(item){
  const articleUrl=item?.url||item?.link||item?.articleUrl||item?.sourceUrl||'';
  const imageCandidates=[item?.image,item?.imageUrl,item?.image_url].filter(Boolean);
  const sourceImage=imageCandidates.find(value=>!isFallbackImage(value))||imageCandidates[0]||'';
  const imageFallback=isFallbackImage(sourceImage);
  const image=imageFallback?FALLBACK_IMAGE:sourceImage;
  const publishedAt=item?.publishedAt||item?.published_at||item?.pubDate||'';
  const source=item?.source||item?.sourceTitle||item?.region||item?.category||'GNK ASG';
  return{
    ...item,
    url:articleUrl,
    link:item?.link||articleUrl,
    summary:item?.summary||item?.description||item?.text||item?.excerpt||'',
    source,
    publishedAt,
    published_at:item?.published_at||publishedAt,
    image,
    imageUrl:image,
    imageFallback,
    imageAlt:item?.imageAlt||item?.title||'GNK ASG Business News',
    imageCredit:item?.imageCredit||source||'Izvor'
  };
}

async function fetchHandler(request,env,ctx){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(request.method==='GET'&&path==='/data/news.json'){
    const response=await core.fetch(request,env,ctx);
    if(!response.ok)return withHeader(response);
    try{
      const payload=await response.json();
      const input=Array.isArray(payload)?payload:(Array.isArray(payload?.items)?payload.items:[]);
      const items=input.slice(0,ACTIVE_NEWS_LIMIT).map(normalizePublicItem);
      return json(Array.isArray(payload)?items:{...payload,count:items.length,activeLimit:ACTIVE_NEWS_LIMIT,items});
    }catch{return withHeader(response)}
  }
  if(request.method==='GET'&&path==='/data/news-archive.json')return json(await read(env,'data:news:archive',{ok:true,version:VERSION,count:0,items:[]}));
  if(request.method==='GET'&&path==='/data/news-automation-status.json'){
    const archive=await read(env,'data:news:archive',{items:[]});
    return json({
      ok:true,
      version:VERSION,
      timeZone:'Europe/Zagreb',
      newsSchedule:NEWS_SCHEDULE,
      newsRefreshesPerDay:3,
      configuredNewsSources:FEEDS.length,
      sourceMix:{global:13,regional:9,croatian:4},
      activeNewsLimit:ACTIVE_NEWS_LIMIT,
      archiveCount:Array.isArray(archive?.items)?archive.items.length:0,
      archivePruneAt:ARCHIVE_PRUNE_AT,
      archiveDeleteCount:ARCHIVE_DELETE_COUNT,
      archiveRetainAfterPrune:ARCHIVE_RETAIN_AFTER_PRUNE,
      autoEditorSchedule:'every 2 hours',
      lastNewsRefresh:await read(env,'automation:news-refresh:last',null),
      lastAutoEditor:await read(env,'auto-editor:last',null),
      lastScheduledRun:await read(env,'automation:v11:last',null)
    });
  }
  if(path==='/api/news-refresh'){
    if(request.method==='GET')return json({ok:true,method:'POST',authorizationRequired:true,schedule:NEWS_SCHEDULE,timeZone:'Europe/Zagreb'});
    return json({ok:false,error:'authorization_required',use:'/operator/news-refresh'},401);
  }
  return withHeader(await core.fetch(request,env,ctx));
}

export default{
  fetch:fetchHandler,
  async scheduled(event,env,ctx){if(typeof core.scheduled==='function')return core.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof core.email==='function')return core.email(message,env,ctx)}
};
