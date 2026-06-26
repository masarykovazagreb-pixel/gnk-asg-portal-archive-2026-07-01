import core from './index-portal-experience-v10.js';
import {VERSION,NEWS_MINIMUM,ACTIVE_NEWS_LIMIT,ARCHIVE_PRUNE_AT,ARCHIVE_DELETE_COUNT,ARCHIVE_RETAIN_AFTER_PRUNE,ARCHIVE_HARD_LIMIT,NEWS_SCHEDULE,FEEDS,refreshCuratedNews} from './news-curation-v10.js';

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-news-lifecycle':VERSION}});
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
async function read(env,key,fallback){const kv=store(env);if(!kv)return fallback;try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
async function write(env,key,value,options){const kv=store(env);if(!kv)return false;if(options)await kv.put(key,JSON.stringify(value,null,2),options);else await kv.put(key,JSON.stringify(value,null,2));return true}
function withHeader(response){const headers=new Headers(response.headers);headers.set('x-gnk-asg-news-lifecycle',VERSION);return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
function validHttp(value){try{const url=new URL(String(value||''));return /^https?:$/.test(url.protocol)?url.href:''}catch{return''}}
function isFallbackImage(value){const image=String(value||'').trim().toLowerCase();return !image||image.includes('/assets/news-fallback.svg')||image.startsWith('data:image/')}
function publicItem(item){
  const url=validHttp(item?.url||item?.link||item?.articleUrl||item?.sourceUrl),image=validHttp(item?.image||item?.imageUrl||item?.image_url),title=String(item?.title||'').trim(),summary=String(item?.summary||item?.description||item?.text||item?.excerpt||'').replace(/\s+/g,' ').trim(),source=String(item?.source||item?.sourceTitle||'').trim();
  const articleVerified=item?.verified===true&&item?.verification?.article?.ok===true;
  const imageVerified=item?.verified===true&&item?.verification?.image?.ok===true;
  if(!url||!image||isFallbackImage(image)||!title||summary.length<60||!source||!articleVerified||!imageVerified)return null;
  const publishedAt=item?.publishedAt||item?.published_at||item?.pubDate||'';
  return{...item,url,link:item?.link||url,summary,source,publishedAt,published_at:item?.published_at||publishedAt,image,imageUrl:image,imageFallback:false,hasSourceImage:true,imageAlt:item?.imageAlt||title,imageCredit:item?.imageCredit||source,verified:true};
}
function publicPayload(payload){
  const input=Array.isArray(payload)?payload:(Array.isArray(payload?.items)?payload.items:[]),items=input.map(publicItem).filter(Boolean).slice(0,ACTIVE_NEWS_LIMIT);
  const base=Array.isArray(payload)?{}:payload||{};
  return{...base,ok:items.length>=NEWS_MINIMUM,version:VERSION,count:items.length,verifiedCount:items.length,withSourceImageCount:items.length,minimumLinks:NEWS_MINIMUM,activeLimit:ACTIVE_NEWS_LIMIT,contentContract:{title:true,summaryMinCharacters:60,source:true,articleVerified:true,sourceImageVerified:true,fallbackImagesAllowed:false},items};
}
function usable(payload){return payload?.version===VERSION&&publicPayload(payload).items.length>=NEWS_MINIMUM}
function context(env){return{read:(key,fallback)=>read(env,key,fallback),write:(key,value,options)=>write(env,key,value,options)}}
async function warm(env){
  const kv=store(env),lockKey='automation:news:v16:warm-lock';
  if(kv){if(await kv.get(lockKey))return read(env,'data:news:external',{items:[]});await kv.put(lockKey,new Date().toISOString(),{expirationTtl:180})}
  return refreshCuratedNews(context(env));
}

async function fetchHandler(request,env,ctx){
  const url=new URL(request.url),path=url.pathname.replace(/\/+$/,'')||'/';
  if(request.method==='GET'&&path==='/data/news.json'){
    let payload=await read(env,'data:news:external',null);
    const forceWarm=url.searchParams.get('warm')==='1';
    if(forceWarm&&!usable(payload))payload=await warm(env);
    else if(!usable(payload)&&ctx?.waitUntil)ctx.waitUntil(warm(env));
    if(payload)return json(publicPayload(payload));
    const response=await core.fetch(request,env,ctx);
    if(!response.ok)return withHeader(response);
    try{return json(publicPayload(await response.json()))}catch{return withHeader(response)}
  }
  if(request.method==='GET'&&path==='/data/news-archive.json'){
    const archive=await read(env,'data:news:archive',{ok:true,version:VERSION,count:0,items:[]});
    return json({...archive,version:VERSION,pruneAt:ARCHIVE_PRUNE_AT,deleteCount:ARCHIVE_DELETE_COUNT,retainAfterPrune:ARCHIVE_RETAIN_AFTER_PRUNE,hardLimit:ARCHIVE_HARD_LIMIT});
  }
  if(request.method==='GET'&&path==='/data/news-automation-status.json'){
    const archive=await read(env,'data:news:archive',{items:[]}),active=publicPayload(await read(env,'data:news:external',{items:[]}));
    return json({ok:true,version:VERSION,timeZone:'Europe/Zagreb',newsSchedule:NEWS_SCHEDULE,newsRefreshesPerDay:3,configuredNewsSources:FEEDS.length,sourceMix:{global:13,regional:9,croatian:4},minimumVerifiedLinks:NEWS_MINIMUM,activeNewsLimit:ACTIVE_NEWS_LIMIT,activeVerifiedCount:active.items.length,archiveCount:Array.isArray(archive?.items)?archive.items.length:0,archivePruneAt:ARCHIVE_PRUNE_AT,archiveDeleteCount:ARCHIVE_DELETE_COUNT,archiveRetainAfterPrune:ARCHIVE_RETAIN_AFTER_PRUNE,archiveHardLimit:ARCHIVE_HARD_LIMIT,contentContract:active.contentContract,autoEditorSchedule:'every 2 hours',lastNewsRefresh:await read(env,'automation:news-refresh:last',null),lastAutoEditor:await read(env,'auto-editor:last',null),lastScheduledRun:await read(env,'automation:v11:last',null)});
  }
  if(path==='/api/news-refresh'){
    if(request.method==='GET')return json({ok:true,method:'scheduled-or-authorized',authorizationRequired:true,schedule:NEWS_SCHEDULE,timeZone:'Europe/Zagreb'});
    return json({ok:false,error:'authorization_required',use:'/operator/news-refresh'},401);
  }
  return withHeader(await core.fetch(request,env,ctx));
}

export default{fetch:fetchHandler,async scheduled(event,env,ctx){if(typeof core.scheduled==='function')return core.scheduled(event,env,ctx)},async email(message,env,ctx){if(typeof core.email==='function')return core.email(message,env,ctx)}};
