import app from './index-auto-editor-fallback-v1.js';
import { runScheduledRefresh } from './gnk-asg-refresh-backend-v1.js';
import {
  EDITORIAL_VERSION,
  json,
  editorialStatus,
  listDrafts,
  saveDraft,
  deleteDraft,
  generateAiDraft,
  generateScheduledDraft,
  publishDraft,
  refreshBusinessSources,
  monitorPublications,
  scheduleLock,
  writeScheduleResult
} from './editorial-core-v1.js';

const ROOT='/auto-editor/editorial';
const API='/auto-editor/editorial/api/';
const clean=value=>String(value??'').trim();
async function body(request){try{return await request.json();}catch{return{};}}

async function isNotFound(response){
  if(response.status===404)return true;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json'))return false;
  try{
    const data=await response.clone().json();
    return data?.error==='not_found'||data?.code==='not_found';
  }catch{return false;}
}

async function servePage(request,env){
  if(!env.ASSETS?.fetch)return json({ok:false,error:'assets_binding_missing'},503);
  const assetUrl=new URL('/auto-editor/index.html',request.url);
  const response=await env.ASSETS.fetch(new Request(assetUrl.toString(),request));
  if(!response.ok)return json({ok:false,error:'editorial_asset_not_found'},404);
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  return new Response(await response.text(),{status:200,headers});
}

async function api(request,env,path){
  if(path===`${API}status`&&request.method==='GET')return json(await editorialStatus(env));
  if(path===`${API}drafts`&&request.method==='GET')return json({ok:true,items:await listDrafts(env)});
  if(path===`${API}draft/save`&&request.method==='POST')return json(await saveDraft(env,await body(request)));
  if(path===`${API}draft/delete`&&request.method==='POST'){const data=await body(request);return json(await deleteDraft(env,clean(data.id)));}
  if(path===`${API}ai-draft`&&request.method==='POST'){
    try{return json(await generateAiDraft(env,await body(request)));}
    catch(error){return json({ok:false,error:clean(error?.message||error)},500);}
  }
  if(path===`${API}publish`&&request.method==='POST'){
    const data=await body(request);
    const result=await publishDraft(env,clean(data.id));
    return json(result,result.ok?200:400);
  }
  if(path===`${API}sources/refresh`&&request.method==='POST')return json(await refreshBusinessSources(env));
  if(path===`${API}draft/from-news`&&request.method==='POST'){
    try{return json(await generateScheduledDraft(env));}
    catch(error){return json({ok:false,error:clean(error?.message||error)},500);}
  }
  if(path===`${API}monitor/run`&&request.method==='POST')return json(await monitorPublications(env));
  return json({ok:false,error:'not_found'},404);
}

function localTime(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return{date:`${values.year}-${values.month}-${values.day}`,hour:Number(values.hour),minute:Number(values.minute)};
}

async function scheduledRun(event,env,ctx){
  const local=localTime();
  const monitorSlot=Math.floor(Date.now()/(2*60*60*1000));
  const result={ok:true,version:EDITORIAL_VERSION,cron:event?.cron||'',local,startedAt:new Date().toISOString(),market:null,monitor:null,sourceRefresh:null,draft:null};
  if(await scheduleLock(env,`editorial:lock:monitor:${monitorSlot}`,7100)){
    try{result.market=await runScheduledRefresh(env,ctx);}catch(error){result.market={ok:false,error:clean(error?.message||error)};}
    result.monitor=await monitorPublications(env);
  }
  if((local.hour===9||local.hour===16)&&await scheduleLock(env,`editorial:lock:source:${local.date}:${local.hour}`,21600)){
    result.sourceRefresh=await refreshBusinessSources(env);
    try{result.draft=await generateScheduledDraft(env);}catch(error){result.draft={ok:false,error:clean(error?.message||error)};}
  }
  result.finishedAt=new Date().toISOString();
  result.ok=[result.market,result.sourceRefresh,result.draft].filter(Boolean).every(item=>item.ok!==false);
  await writeScheduleResult(env,result);
  return result;
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    const response=await app.fetch(request,env,ctx);
    if(path!==ROOT&&!path.startsWith(API))return response;
    if(!(await isNotFound(response)))return response;
    if(path===ROOT&&(request.method==='GET'||request.method==='HEAD'))return servePage(request,env);
    if(path.startsWith(API))return api(request,env,path);
    return response;
  },
  async scheduled(event,env,ctx){
    const task=scheduledRun(event,env,ctx);
    if(ctx?.waitUntil){ctx.waitUntil(task);return;}
    return task;
  },
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
