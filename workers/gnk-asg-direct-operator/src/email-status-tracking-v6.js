import * as base from './email-status-tracking-v5-core.js';
import {backfillManualMailStatus,VERSION as BACKFILL_VERSION} from './manual-mail-status-backfill-v1.js';
import {emailStatusDayWindow,DEFAULT_TIME_ZONE,VERSION as DATE_WINDOW_VERSION} from './email-status-date-window-v1.js';
import {ensureEmailStatusOperationalSchema,listAutoReplyAudit,autoReplyHealth,VERSION as OPERATIONS_VERSION} from './email-status-operations-v1.js';

export const VERSION=`GNK_ASG_EMAIL_STATUS_TRACKING_V8_20260714_OPERATIONS_${OPERATIONS_VERSION}_${BACKFILL_VERSION}_${DATE_WINDOW_VERSION}_${base.VERSION}`;
export const DASHBOARD_PATH=base.DASHBOARD_PATH;
export const API_PREFIX=base.API_PREFIX;
export const isEmailStatusPath=base.isEmailStatusPath;
export const withEmailStatusTracking=base.withEmailStatusTracking;
export const syncCloudflareEmailStatuses=base.syncCloudflareEmailStatuses;
export {backfillManualMailStatus};

const clean=value=>String(value??'').trim();
const clamp=(value,min,max,fallback)=>{const number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,Math.trunc(number))):fallback;};
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-asg-email-status':VERSION}});
const isoDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(clean(value))?clean(value):'';
function yesNoClause(value,yes,no){const v=clean(value).toLowerCase();if(v==='yes')return yes;if(v==='no')return no;return'';}

async function listRecords(request,env,backfill){
 const db=await ensureEmailStatusOperationalSchema(env),url=new URL(request.url),limit=clamp(url.searchParams.get('limit'),1,500,100),offset=clamp(url.searchParams.get('offset'),0,100000,0);
 const status=clean(url.searchParams.get('status')).toUpperCase(),source=clean(url.searchParams.get('source')).toLowerCase(),search=clean(url.searchParams.get('search')).toLowerCase().slice(0,150),date=clean(url.searchParams.get('date')).toLowerCase();
 const dateFrom=isoDate(url.searchParams.get('date_from')),dateTo=isoDate(url.searchParams.get('date_to')),opened=clean(url.searchParams.get('opened')),confirmed=clean(url.searchParams.get('confirmed')),failure=clean(url.searchParams.get('failure')),mode=clean(url.searchParams.get('mode')).toLowerCase(),center=clean(url.searchParams.get('center')).toLowerCase().slice(0,100),logo=clean(url.searchParams.get('logo')).toLowerCase(),profile=clean(url.searchParams.get('profile')).toLowerCase();
 const clauses=[],binds=[];
 if(status&&status!=='ALL'){clauses.push('UPPER(r.current_status)=?');binds.push(status);}
 if(source&&source!=='all'){clauses.push('LOWER(r.source_system)=?');binds.push(source);}
 if(search){const term=`%${search}%`;clauses.push(`(LOWER(COALESCE(r.recipient,'')) LIKE ? OR LOWER(COALESCE(r.sender,'')) LIKE ? OR LOWER(COALESCE(r.subject,'')) LIKE ? OR LOWER(COALESCE(r.provider_message_id,'')) LIKE ? OR LOWER(COALESCE(r.source_id,'')) LIKE ? OR LOWER(COALESCE(r.auto_reply_reference,'')) LIKE ?)`);binds.push(term,term,term,term,term,term);}
 let dateWindow=null;
 if(date==='today'){dateWindow=emailStatusDayWindow(new Date(),DEFAULT_TIME_ZONE);clauses.push(`datetime(COALESCE(r.accepted_at,r.created_at,r.updated_at))>=datetime(?) AND datetime(COALESCE(r.accepted_at,r.created_at,r.updated_at))<datetime(?)`);binds.push(dateWindow.start,dateWindow.end);}
 if(dateFrom){clauses.push(`date(COALESCE(r.accepted_at,r.created_at,r.updated_at))>=date(?)`);binds.push(dateFrom);}
 if(dateTo){clauses.push(`date(COALESCE(r.accepted_at,r.created_at,r.updated_at))<=date(?)`);binds.push(dateTo);}
 const openedClause=yesNoClause(opened,'COALESCE(r.open_count,0)>0','COALESCE(r.open_count,0)=0');if(openedClause)clauses.push(openedClause);
 const confirmedClause=yesNoClause(confirmed,"r.receipt_confirmed_at IS NOT NULL AND r.receipt_confirmed_at<>''","r.receipt_confirmed_at IS NULL OR r.receipt_confirmed_at=''");if(confirmedClause)clauses.push(confirmedClause);
 const failureClause=yesNoClause(failure,"UPPER(COALESCE(r.current_status,'')) IN ('BOUNCED','REJECTED','FAILED') OR COALESCE(r.error_detail,'')<>''","UPPER(COALESCE(r.current_status,'')) NOT IN ('BOUNCED','REJECTED','FAILED') AND COALESCE(r.error_detail,'')=''");if(failureClause)clauses.push(failureClause);
 if(mode&&mode!=='all'){clauses.push('LOWER(COALESCE(r.auto_reply_mode,\'\'))=?');binds.push(mode);}
 if(center){clauses.push('LOWER(COALESCE(r.auto_reply_center,\'\')) LIKE ?');binds.push(`%${center}%`);}
 if(logo&&logo!=='all'){clauses.push('LOWER(COALESCE(r.auto_reply_logo_mode,\'\'))=?');binds.push(logo);}
 if(profile&&profile!=='all'){clauses.push('LOWER(COALESCE(r.auto_reply_profile,\'\'))=?');binds.push(profile);}
 const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
 const rowsSql=`SELECT r.*,
  (SELECT COUNT(*) FROM email_status_events e WHERE e.tracking_id=r.tracking_id) event_count,
  (SELECT COUNT(DISTINCT COALESCE(NULLIF(e.ip,''),'unknown')||'|'||COALESCE(NULLIF(e.device,''),'unknown')) FROM email_status_events e WHERE e.tracking_id=r.tracking_id AND e.event_type='OPENED') distinct_open_environments,
  (SELECT COUNT(DISTINCT COALESCE(NULLIF(e.ip,''),'unknown')) FROM email_status_events e WHERE e.tracking_id=r.tracking_id AND e.event_type='OPENED') distinct_open_ips,
  (SELECT COUNT(DISTINCT COALESCE(NULLIF(e.device,''),'unknown')) FROM email_status_events e WHERE e.tracking_id=r.tracking_id AND e.event_type='OPENED') distinct_open_devices
  FROM email_status_records r ${where} ORDER BY datetime(COALESCE(r.last_event_at,r.updated_at,r.created_at)) DESC LIMIT ? OFFSET ?`;
 const [rows,total,summary,sources,centers,modes,sync]=await Promise.all([
  db.prepare(rowsSql).bind(...binds,limit,offset).all(),
  db.prepare(`SELECT COUNT(*) count FROM email_status_records r ${where}`).bind(...binds).first(),
  db.prepare(`SELECT UPPER(COALESCE(r.current_status,'UNKNOWN')) status,COUNT(*) count FROM email_status_records r ${where} GROUP BY UPPER(COALESCE(r.current_status,'UNKNOWN'))`).bind(...binds).all(),
  db.prepare(`SELECT LOWER(COALESCE(r.source_system,'unknown')) value,COUNT(*) count FROM email_status_records r ${where} GROUP BY value ORDER BY count DESC`).bind(...binds).all(),
  db.prepare(`SELECT COALESCE(NULLIF(r.auto_reply_center,''),'—') value,COUNT(*) count FROM email_status_records r ${where} AND 1=1 GROUP BY value ORDER BY count DESC LIMIT 20`.replace(`${where} AND 1=1`,where||'WHERE 1=1')).bind(...binds).all(),
  db.prepare(`SELECT COALESCE(NULLIF(LOWER(r.auto_reply_mode),''),'—') value,COUNT(*) count FROM email_status_records r ${where} AND 1=1 GROUP BY value ORDER BY count DESC`.replace(`${where} AND 1=1`,where||'WHERE 1=1')).bind(...binds).all(),
  db.prepare(`SELECT * FROM email_status_sync_state WHERE id=1`).first()
 ]);
 const items=(rows.results||[]).map(item=>({...item,possible_forwarding_signal:Number(item.distinct_open_environments||0)>1,forwarding_detectable:false,forwarding_explanation:'Različite IP adrese ili uređaji mogu biti proxy, više uređaja ili prosljeđivanje; nisu dokaz prosljeđivanja.'}));
 return{ok:true,version:VERSION,total:Number(total?.count||0),limit,offset,page:Math.floor(offset/limit)+1,pages:Math.max(1,Math.ceil(Number(total?.count||0)/limit)),summary:Object.fromEntries((summary.results||[]).map(row=>[row.status,Number(row.count||0)])),breakdown:{sources:sources.results||[],centers:centers.results||[],modes:modes.results||[]},sync,items,filters:{source:source||'all',status:status||'ALL',search,date:dateWindow?.key||date||'all',dateFrom,dateTo,opened:opened||'all',confirmed:confirmed||'all',failure:failure||'all',mode:mode||'all',center,logo:logo||'all',profile:profile||'all'},dateWindow,manualAuditBackfill:backfill,capabilities:{delivery:true,rejection:true,openEvents:true,ipAndDevice:true,explicitReceiptConfirmation:true,forwardingReliable:false,pagination:true,csvExport:true,autoReplyOperations:true,aiMode:true,globalCentre:true,inlineLogoAudit:true}};
}

async function enhanceDashboard(response){
 const type=String(response.headers.get('content-type')||'').toLowerCase();if(!type.includes('text/html'))return response;
 let html=await response.text();const tag='<script id="gnk-email-status-dashboard-v5" src="/assets/email-status-dashboard-v2.js?v=20260714-operations-v5" defer></script>';
 html=html.replace(/<script[^>]+email-status-dashboard-v2\.js[^>]*><\/script>/gi,'');
 if(!html.includes('gnk-email-status-dashboard-v5'))html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,`${tag}</body>`):`${html}${tag}`;
 const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('x-gnk-asg-email-status',VERSION);headers.set('x-gnk-email-status-dashboard','v5-operations');
 return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export async function handleEmailStatusRequest(request,env){
 const path=pathOf(request),protectedView=path===DASHBOARD_PATH||path===`${DASHBOARD_PATH}/`||path===`${API_PREFIX}/records`||path===`${API_PREFIX}/health`||path===`${API_PREFIX}/autoreply-audit`||/^\/api\/email-status\/records\/[A-Za-z0-9-]{20,80}\/events$/.test(path);
 const backfill=protectedView?await backfillManualMailStatus(env).catch(error=>({ok:false,reason:'backfill_failed',message:String(error?.message||error),version:BACKFILL_VERSION})):null;
 if(path===`${API_PREFIX}/records`&&request.method==='GET')return json(await listRecords(request,env,backfill));
 if(path===`${API_PREFIX}/autoreply-audit`&&request.method==='GET')return json(await listAutoReplyAudit(request,env));
 const response=await base.handleEmailStatusRequest(request,env);if(!response)return response;
 if((path===DASHBOARD_PATH||path===`${DASHBOARD_PATH}/`)&&request.method==='GET')return enhanceDashboard(response);
 if(path===`${API_PREFIX}/health`&&request.method==='GET'){const payload=await response.json().catch(()=>null);if(!payload)return response;const operations=await autoReplyHealth(env).catch(error=>({error:String(error?.message||error)}));return json({...payload,manualAuditBackfill:backfill,version:VERSION,operationsVersion:OPERATIONS_VERSION,autoReplyLive:/^(1|true|yes|on)$/i.test(clean(env.MAIL_AUTO_REPLY_LIVE)),autoReplyAiEnabled:/^(1|true|yes|on)$/i.test(clean(env.MAIL_AUTO_REPLY_AI_LIVE||'true')),autoReplyAiAvailable:Boolean(env?.AI?.run),autoReplyModel:clean(env.MAIL_AUTO_REPLY_AI_MODEL||env.AUTO_EDITOR_MODEL)||null,inlineLogoRequired:true,globalCentres:10,autoReplyOperations:operations},response.status);}
 return response;
}
