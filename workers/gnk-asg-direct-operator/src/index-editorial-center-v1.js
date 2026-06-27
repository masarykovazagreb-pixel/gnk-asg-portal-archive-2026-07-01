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
import {runAutomatedPublication,AUTO_PUBLISH_VERSION} from './editorial-auto-publish-v2.js';
import {ensureEditorialBootstrap,EDITORIAL_BOOTSTRAP_VERSION} from './editorial-bootstrap-v2.js';

const ROOT='/auto-editor/editorial';
const API='/auto-editor/editorial/api/';
const BURST_START=Date.parse('2026-06-27T20:00:00+02:00');
const BURST_END=Date.parse('2026-06-29T23:59:59+02:00');
const BURST_TARGET=10;
const clean=value=>String(value??'').trim();
async function body(request){try{return await request.json();}catch{return{};}}
function burstState(){const current=Date.now();return{active:current>=BURST_START&&current<=BURST_END,start:new Date(BURST_START).toISOString(),end:new Date(BURST_END).toISOString(),target:BURST_TARGET,cadence:'every 2 hours',afterBurst:'monitor and manual approval'}}

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
  if(path===`${API}status`&&request.method==='GET'){
    const status=await editorialStatus(env);
    return json({...status,autoPublishVersion:AUTO_PUBLISH_VERSION,bootstrapVersion:EDITORIAL_BOOTSTRAP_VERSION,burst:burstState(),publicationMode:burstState().active?'validated automatic publication every 2 hours during temporary fill':'draft, monitor and manual approval'});
  }
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
  if(path===`${API}bootstrap/run`&&request.method==='POST'){
    try{const data=await body(request);const result=await ensureEditorialBootstrap(env,{minimum:Number(data.minimum||BURST_TARGET)});return json(result,result.ok?200:500)}
    catch(error){return json({ok:false,error:clean(error?.message||error)},500)}
  }
  if(path===`${API}auto-publish/run`&&request.method==='POST'){
    try{
      const data=await body(request);
      const result=await runAutomatedPublication(env,{forceSourceRefresh:data.forceSourceRefresh!==false});
      return json(result,result.ok?200:500);
    }catch(error){return json({ok:false,error:clean(error?.message||error)},500);}
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
  const burst=burstState();
  const monitorSlot=Math.floor(Date.now()/(2*60*60*1000));
  const result={ok:true,version:EDITORIAL_VERSION,autoPublishVersion:AUTO_PUBLISH_VERSION,bootstrapVersion:EDITORIAL_BOOTSTRAP_VERSION,cron:event?.cron||'',local,burst,startedAt:new Date().toISOString(),bootstrap:null,market:null,monitor:null,sourceRefresh:null,publication:null};
  result.bootstrap=await ensureEditorialBootstrap(env,{minimum:BURST_TARGET});
  if((local.hour===9||local.hour===16)&&await scheduleLock(env,`editorial:lock:source:${local.date}:${local.hour}`,21600)){
    result.sourceRefresh=await refreshBusinessSources(env);
  }
  if(await scheduleLock(env,`editorial:lock:auto-publish:${monitorSlot}`,7100)){
    try{result.market=await runScheduledRefresh(env,ctx);}catch(error){result.market={ok:false,error:clean(error?.message||error)};}
    if(burst.active){
      result.publication=await runAutomatedPublication(env,{forceSourceRefresh:false});
      result.monitor=result.publication?.monitor||await monitorPublications(env);
    }else{
      result.publication={ok:true,status:'TEMPORARY_BURST_COMPLETE',automaticPublication:false,mode:'monitor_and_manual_approval',checkedAt:new Date().toISOString()};
      result.monitor=await monitorPublications(env);
    }
  }
  result.finishedAt=new Date().toISOString();
  result.ok=[result.bootstrap,result.market,result.sourceRefresh,result.publication].filter(Boolean).every(item=>item.ok!==false);
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
