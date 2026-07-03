import * as base from './email-status-tracking-v5.js';
import {ensureEmailStatusSchema} from './email-status-tracking-v1.js';
import {backfillManualMailStatus,VERSION as BACKFILL_VERSION} from './manual-mail-status-backfill-v1.js';
import {emailStatusDayWindow,DEFAULT_TIME_ZONE,VERSION as DATE_WINDOW_VERSION} from './email-status-date-window-v1.js';

export const VERSION=`GNK_ASG_EMAIL_STATUS_TRACKING_V6_20260703_${BACKFILL_VERSION}_${DATE_WINDOW_VERSION}_${base.VERSION}`;
export const DASHBOARD_PATH=base.DASHBOARD_PATH;
export const API_PREFIX=base.API_PREFIX;
export const isEmailStatusPath=base.isEmailStatusPath;
export const withEmailStatusTracking=base.withEmailStatusTracking;
export const syncCloudflareEmailStatuses=base.syncCloudflareEmailStatuses;
export {backfillManualMailStatus};

const clean=value=>String(value??'').trim();
const clamp=(value,min,max,fallback)=>{const number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,Math.trunc(number))):fallback;};
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-email-status':VERSION}});

async function listRecords(request,env,backfill){
 const db=await ensureEmailStatusSchema(env),url=new URL(request.url),limit=clamp(url.searchParams.get('limit'),1,500,200),offset=clamp(url.searchParams.get('offset'),0,100000,0);
 const status=clean(url.searchParams.get('status')).toUpperCase(),source=clean(url.searchParams.get('source')).toLowerCase(),search=clean(url.searchParams.get('search')).toLowerCase().slice(0,150),date=clean(url.searchParams.get('date')).toLowerCase();
 const clauses=[],binds=[];
 if(status&&status!=='ALL'){clauses.push('UPPER(current_status)=?');binds.push(status);}
 if(source&&source!=='all'){clauses.push('LOWER(source_system)=?');binds.push(source);}
 if(search){const term=`%${search}%`;clauses.push(`(LOWER(COALESCE(recipient,'')) LIKE ? OR LOWER(COALESCE(sender,'')) LIKE ? OR LOWER(COALESCE(subject,'')) LIKE ? OR LOWER(COALESCE(provider_message_id,'')) LIKE ? OR LOWER(COALESCE(source_id,'')) LIKE ?)`);binds.push(term,term,term,term,term);}
 let dateWindow=null;if(date==='today'){dateWindow=emailStatusDayWindow(new Date(),DEFAULT_TIME_ZONE);clauses.push(`datetime(COALESCE(accepted_at,created_at,updated_at))>=datetime(?) AND datetime(COALESCE(accepted_at,created_at,updated_at))<datetime(?)`);binds.push(dateWindow.start,dateWindow.end);}
 const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
 const rowsStatement=db.prepare(`SELECT * FROM email_status_records ${where} ORDER BY datetime(COALESCE(updated_at,created_at)) DESC LIMIT ? OFFSET ?`).bind(...binds,limit,offset);
 const totalStatement=db.prepare(`SELECT COUNT(*) count FROM email_status_records ${where}`).bind(...binds);
 const summaryStatement=db.prepare(`SELECT UPPER(COALESCE(current_status,'UNKNOWN')) status,COUNT(*) count FROM email_status_records ${where} GROUP BY UPPER(COALESCE(current_status,'UNKNOWN'))`).bind(...binds);
 const [rows,total,summary,sync]=await Promise.all([rowsStatement.all(),totalStatement.first(),summaryStatement.all(),db.prepare(`SELECT * FROM email_status_sync_state WHERE id=1`).first()]);
 return{ok:true,version:VERSION,total:Number(total?.count||0),limit,offset,summary:Object.fromEntries((summary.results||[]).map(row=>[row.status,Number(row.count||0)])),sync,items:rows.results||[],filters:{source:source||'all',status:status||'ALL',search,date:dateWindow?.key||'all'},dateWindow,manualAuditBackfill:backfill};
}
async function enhanceDashboard(response){
 const type=String(response.headers.get('content-type')||'').toLowerCase();if(!type.includes('text/html'))return response;
 let html=await response.text();const tag='<script id="gnk-email-status-dashboard-v2" src="/assets/email-status-dashboard-v2.js?v=20260703-2" defer></script>';
 if(!html.includes('gnk-email-status-dashboard-v2'))html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,`${tag}</body>`):`${html}${tag}`;
 const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('x-gnk-asg-email-status',VERSION);
 return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
export async function handleEmailStatusRequest(request,env){
 const path=pathOf(request),protectedView=path===DASHBOARD_PATH||path===`${DASHBOARD_PATH}/`||path===`${API_PREFIX}/records`||path===`${API_PREFIX}/health`;
 const backfill=protectedView?await backfillManualMailStatus(env).catch(error=>({ok:false,reason:'backfill_failed',message:String(error?.message||error),version:BACKFILL_VERSION})):null;
 if(path===`${API_PREFIX}/records`&&request.method==='GET')return json(await listRecords(request,env,backfill));
 const response=await base.handleEmailStatusRequest(request,env);if(!response)return response;
 if((path===DASHBOARD_PATH||path===`${DASHBOARD_PATH}/`)&&request.method==='GET')return enhanceDashboard(response);
 if(path===`${API_PREFIX}/health`&&request.method==='GET'){const payload=await response.json().catch(()=>null);if(!payload)return response;return json({...payload,manualAuditBackfill:backfill,version:VERSION},response.status);}
 return response;
}
