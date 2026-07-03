import * as transport from './email-status-tracking-v2.js';
import {ensureEmailStatusSchema} from './email-status-tracking-v1.js';

export const VERSION=`GNK_ASG_EMAIL_STATUS_TRACKING_V3_20260703_FINAL_EVENT_${transport.VERSION}`;
export const DASHBOARD_PATH=transport.DASHBOARD_PATH;
export const API_PREFIX=transport.API_PREFIX;
export const isEmailStatusPath=transport.isEmailStatusPath;
export const withEmailStatusTracking=transport.withEmailStatusTracking;

const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const errorText=error=>String(error?.message||error||'').slice(0,1000);
const clamp=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.trunc(n))):fallback;};
const FINAL_FAILURES=new Set(['BOUNCED','REJECTED','FAILED']);
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-email-status':VERSION}});
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function statusFromProvider(value){const status=clean(value).toLowerCase().replace(/[\s_-]+/g,'');if(status==='delivered')return'DELIVERED';if(status==='deliveryfailed'||status==='bounced'||status==='hardbounce'||status==='softbounce')return'BOUNCED';if(status==='rejected'||status==='suppressed')return'REJECTED';if(status==='failed')return'FAILED';if(status==='deferred'||status==='retry'||status==='queued')return'DEFERRED';if(status==='sent'||status==='accepted'||status==='submitted')return'ACCEPTED';return'';}
async function syncState(env,fields){const db=await ensureEmailStatusSchema(env),sets=[],values=[];for(const key of ['last_started_at','last_completed_at','last_error','last_event_count'])if(fields[key]!==undefined){sets.push(`${key}=?`);values.push(fields[key]);}sets.push('updated_at=?');values.push(now());await db.prepare(`UPDATE email_status_sync_state SET ${sets.join(',')} WHERE id=1`).bind(...values).run();}
function latestEvents(events){const latest=new Map();for(const event of events||[]){const id=clean(event?.messageId);if(!id)continue;const previous=latest.get(id),time=Date.parse(clean(event.datetime))||0,previousTime=Date.parse(clean(previous?.datetime))||0;if(!previous||Number(event.isLastEvent)===1&&Number(previous.isLastEvent)!==1||Number(event.isLastEvent)===Number(previous.isLastEvent)&&time>previousTime)latest.set(id,event);}return[...latest.values()];}

export async function syncCloudflareEmailStatuses(env){
 const token=clean(env.CLOUDFLARE_ANALYTICS_TOKEN||env.CF_ANALYTICS_TOKEN),zoneTag=clean(env.CLOUDFLARE_ZONE_ID||env.CF_ZONE_ID);
 if(!token||!zoneTag)return{ok:true,skipped:'analytics_credentials_missing',required:['CLOUDFLARE_ZONE_ID','CLOUDFLARE_ANALYTICS_TOKEN']};
 const db=await ensureEmailStatusSchema(env),previous=await db.prepare(`SELECT last_completed_at FROM email_status_sync_state WHERE id=1`).first();
 await syncState(env,{last_started_at:now(),last_error:''});
 const hours=clamp(env.EMAIL_STATUS_SYNC_LOOKBACK_HOURS,1,744,48),overlapMinutes=clamp(env.EMAIL_STATUS_SYNC_OVERLAP_MINUTES,1,120,15),limit=clamp(env.EMAIL_STATUS_SYNC_LIMIT,50,10000,5000),end=now(),floor=Date.now()-hours*3600000,previousTime=Date.parse(clean(previous?.last_completed_at))||0,start=new Date(previousTime?Math.max(floor,previousTime-overlapMinutes*60000):floor).toISOString();
 const query=`query RecentEmailEvents($zoneTag: string!, $start: Time!, $end: Time!, $limit: Int!) { viewer { zones(filter: { zoneTag: $zoneTag }) { emailSendingAdaptive(filter: { datetime_geq: $start, datetime_leq: $end }, limit: $limit, orderBy: [datetime_DESC]) { datetime from to subject status eventType sendingDomain messageId errorCause errorDetail isLastEvent } } } }`;
 try{
  const response=await fetch('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({query,variables:{zoneTag,start,end,limit}})}),payload=await response.json().catch(()=>({}));
  if(!response.ok||payload.errors?.length)throw new Error(payload.errors?.map(item=>item.message).join('; ')||`Cloudflare GraphQL HTTP ${response.status}`);
  const events=payload?.data?.viewer?.zones?.[0]?.emailSendingAdaptive||[],finalEvents=latestEvents(events);let matched=0,updated=0;
  for(const event of finalEvents){
   const messageId=clean(event.messageId),mapped=statusFromProvider(event.status);if(!mapped)continue;
   const stamp=clean(event.datetime)||now(),delivered=mapped==='DELIVERED'?stamp:null,failed=FINAL_FAILURES.has(mapped)?stamp:null;
   const result=await db.prepare(`UPDATE email_status_records SET current_status=CASE WHEN current_status='OPENED' AND ?='DELIVERED' THEN current_status ELSE ? END,provider_status=?,error_cause=?,error_detail=?,delivered_at=COALESCE(delivered_at,?),failed_at=COALESCE(failed_at,?),updated_at=? WHERE provider_message_id=?`).bind(mapped,mapped,clean(event.status),clean(event.errorCause),clean(event.errorDetail),delivered,failed,stamp,messageId).run(),changes=Number(result.meta?.changes||0);if(changes){matched++;updated+=changes;}
  }
  await syncState(env,{last_completed_at:now(),last_error:'',last_event_count:events.length});
  return{ok:true,queried:events.length,finalEvents:finalEvents.length,matched,updated,window:{start,end,hours,overlapMinutes,incremental:Boolean(previousTime)},retentionDays:31};
 }catch(error){await syncState(env,{last_completed_at:now(),last_error:errorText(error),last_event_count:0});return{ok:false,error:'cloudflare_analytics_sync_failed',message:errorText(error)};}
}

export async function handleEmailStatusRequest(request,env){
 if(pathOf(request)===`${API_PREFIX}/sync`&&request.method==='POST')return json(await syncCloudflareEmailStatuses(env));
 return transport.handleEmailStatusRequest(request,env);
}
