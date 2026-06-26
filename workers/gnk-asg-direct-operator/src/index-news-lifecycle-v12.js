import core from './index-portal-experience-v10.js';
import {VERSION,ACTIVE_NEWS_LIMIT,ARCHIVE_PRUNE_AT,ARCHIVE_DELETE_COUNT,FEEDS} from './news-curation-v10.js';

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-news-lifecycle':VERSION}});
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
async function read(env,key,fallback){const kv=store(env);if(!kv)return fallback;try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function withHeader(response){const headers=new Headers(response.headers);headers.set('x-gnk-asg-news-lifecycle',VERSION);return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}

async function fetchHandler(request,env,ctx){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(request.method==='GET'&&path==='/data/news-archive.json')return json(await read(env,'data:news:archive',{ok:true,version:VERSION,count:0,items:[]}));
  if(request.method==='GET'&&path==='/data/news-automation-status.json'){
    const archive=await read(env,'data:news:archive',{items:[]});
    return json({
      ok:true,
      version:VERSION,
      timeZone:'Europe/Zagreb',
      newsSchedule:['08:00','16:00','20:00'],
      newsRefreshesPerDay:3,
      configuredNewsSources:FEEDS.length,
      activeNewsLimit:ACTIVE_NEWS_LIMIT,
      archiveCount:Array.isArray(archive?.items)?archive.items.length:0,
      archivePruneAt:ARCHIVE_PRUNE_AT,
      archiveDeleteCount:ARCHIVE_DELETE_COUNT,
      autoEditorSchedule:'every 2 hours',
      lastNewsRefresh:await read(env,'automation:news-refresh:last',null),
      lastAutoEditor:await read(env,'auto-editor:last',null),
      lastScheduledRun:await read(env,'automation:v11:last',null)
    });
  }
  if(path==='/api/news-refresh'){
    if(request.method==='GET')return json({ok:true,method:'POST',authorizationRequired:true,schedule:['08:00','16:00','20:00'],timeZone:'Europe/Zagreb'});
    return json({ok:false,error:'authorization_required',use:'/operator/news-refresh'},401);
  }
  return withHeader(await core.fetch(request,env,ctx));
}

export default{
  fetch:fetchHandler,
  async scheduled(event,env,ctx){if(typeof core.scheduled==='function')return core.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof core.email==='function')return core.email(message,env,ctx)}
};
