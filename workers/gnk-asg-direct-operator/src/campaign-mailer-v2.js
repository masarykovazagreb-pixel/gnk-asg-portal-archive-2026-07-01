import {handleCampaignMailer as baseHandle,runQueue as baseRunQueue,recordInbound,API_PREFIX} from './campaign-mailer-v1.js';
import {ensureSchema,stateRow,stats,updateState,logEvent,timestamp,clean,int} from './campaign-mailer-db-v1.js';

export const VERSION='GNK_ASG_CAMPAIGN_MAILER_SAFETY_V2_20260701';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-campaign-mailer-safety':VERSION}});
const visible=value=>String(value||'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').trim();

function auditSafeEnv(env){const binding=env?.EMAIL,bcc=clean(env.MAIL_MANDATORY_BCC).toLowerCase();if(!binding||typeof binding.send!=='function'||!bcc)return env;const wrapped=Object.create(env);Object.defineProperty(wrapped,'EMAIL',{enumerable:true,configurable:true,value:{async send(message){try{return await binding.send.call(binding,message)}catch(error){const target=clean(message?.to).toLowerCase();if(target===bcc){console.error('campaign-mailer-audit-copy',error);return{auditCopyFailed:true}}throw error}}}});return wrapped}

async function acquire(env){const db=await ensureSchema(env);await db.prepare(`CREATE TABLE IF NOT EXISTS campaign_mailer_runner_lock(id INTEGER PRIMARY KEY CHECK(id=1),lease_until TEXT)`).run();await db.prepare(`INSERT OR IGNORE INTO campaign_mailer_runner_lock(id,lease_until) VALUES(1,NULL)`).run();const stamp=timestamp(),until=new Date(Date.now()+120000).toISOString();const row=await db.prepare(`UPDATE campaign_mailer_runner_lock SET lease_until=? WHERE id=1 AND (lease_until IS NULL OR lease_until<?) RETURNING id`).bind(until,stamp).first();return row?{db,until}:null}
async function release(lock){if(lock?.db)await lock.db.prepare(`UPDATE campaign_mailer_runner_lock SET lease_until=NULL WHERE id=1 AND lease_until=?`).bind(lock.until).run()}

async function rateGate(env){const db=await ensureSchema(env),hour=int(env.CAMPAIGN_MAILER_MAX_PER_HOUR||env.MEDIA_OUTREACH_MAX_PER_HOUR,20,1,1000),day=int(env.CAMPAIGN_MAILER_MAX_PER_DAY||env.MEDIA_OUTREACH_MAX_PER_DAY,400,1,10000);const h=Number((await db.prepare(`SELECT COUNT(*) c FROM campaign_mailer_events WHERE event_type='sent' AND strftime('%s',created_at)>=strftime('%s','now','-1 hour')`).first())?.c||0),d=Number((await db.prepare(`SELECT COUNT(*) c FROM campaign_mailer_events WHERE event_type='sent' AND strftime('%s',created_at)>=strftime('%s','now','-1 day')`).first())?.c||0);if(h<hour&&d<day)return null;const seconds=d>=day?86400:3600,next=new Date(Date.now()+seconds*1000).toISOString();await updateState(env,{status:'running',next_send_at:next});await logEvent(env,'rate_limited',{detail:{hour:{used:h,limit:hour},day:{used:d,limit:day},nextSendAt:next}});return{ok:true,rateLimited:true,nextSendAt:next}}

export async function runQueue(env,options={}){const lock=await acquire(env);if(!lock)return{ok:true,skipped:'runner_locked'};try{const limited=await rateGate(env);if(limited)return limited;return await baseRunQueue(auditSafeEnv(env),options)}finally{await release(lock)}}

async function scheduleStart(env){const state=await stateRow(env),counts=await stats(env);if(!clean(state.subject)||!visible(state.body_html))throw new Error('Kampanja nema naslov ili sadržaj');if(!counts.pending)throw new Error('Nema kontakata na čekanju');await updateState(env,{status:'running',started_at:timestamp(),next_send_at:timestamp()});await logEvent(env,'started');return{ok:true,status:'running',scheduled:true}}
async function scheduleResume(env){const state=await stateRow(env);if(!['paused','stopped'].includes(state.status))throw new Error('Kampanja nije pauzirana ili zaustavljena');await updateState(env,{status:'running',next_send_at:timestamp()});await logEvent(env,'resumed');return{ok:true,status:'running',scheduled:true}}

export async function handleCampaignMailer(request,env,ctx){const path=pathOf(request);try{if(request.method==='POST'&&path===`${API_PREFIX}/campaign/start`)return json(await scheduleStart(env));if(request.method==='POST'&&path===`${API_PREFIX}/campaign/resume`)return json(await scheduleResume(env));if(request.method==='POST'&&path===`${API_PREFIX}/dispatch`)return json(await runQueue(env,{force:true}));return baseHandle(request,env,ctx)}catch(error){return json({ok:false,error:String(error?.message||error),version:VERSION},400)}}

export {recordInbound};
