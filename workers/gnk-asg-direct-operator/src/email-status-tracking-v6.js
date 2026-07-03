import * as base from './email-status-tracking-v5.js';
import {ensureEmailStatusSchema} from './email-status-tracking-v1.js';
import {backfillManualMailStatus,VERSION as BACKFILL_VERSION} from './manual-mail-status-backfill-v1.js';

export const VERSION=`GNK_ASG_EMAIL_STATUS_TRACKING_V6_20260703_AUDIT_BACKFILL_${BACKFILL_VERSION}_${base.VERSION}`;
export const DASHBOARD_PATH=base.DASHBOARD_PATH;
export const API_PREFIX=base.API_PREFIX;
export const isEmailStatusPath=base.isEmailStatusPath;
export const withEmailStatusTracking=base.withEmailStatusTracking;
export const syncCloudflareEmailStatuses=base.syncCloudflareEmailStatuses;
export {backfillManualMailStatus};

const clean=value=>String(value??'').trim();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-email-status':VERSION}});

async function completeSummary(request,env){
 const db=await ensureEmailStatusSchema(env);
 const params=new URL(request.url).searchParams,source=clean(params.get('source')).toLowerCase(),status=clean(params.get('status')).toUpperCase(),search=clean(params.get('search')).toLowerCase();
 const where=[],values=[];
 if(source&&source!=='all'){where.push('LOWER(source_system)=?');values.push(source);}
 if(status&&status!=='ALL'){where.push('UPPER(current_status)=?');values.push(status);}
 if(search){where.push(`(LOWER(recipient) LIKE ? OR LOWER(COALESCE(sender,'')) LIKE ? OR LOWER(COALESCE(subject,'')) LIKE ? OR LOWER(COALESCE(source_id,'')) LIKE ? OR LOWER(COALESCE(provider_message_id,'')) LIKE ?)`);const term=`%${search}%`;values.push(term,term,term,term,term);}
 const sql=`SELECT UPPER(COALESCE(current_status,'UNKNOWN')) status,COUNT(*) count FROM email_status_records${where.length?` WHERE ${where.join(' AND ')}`:''} GROUP BY UPPER(COALESCE(current_status,'UNKNOWN'))`;
 const statement=db.prepare(sql),result=values.length?await statement.bind(...values).all():await statement.all(),summary={};
 for(const row of result.results||[])summary[row.status]=Number(row.count||0);
 return summary;
}

async function enhanceDashboard(response){
 const type=String(response.headers.get('content-type')||'').toLowerCase();if(!type.includes('text/html'))return response;
 let html=await response.text();const tag='<script id="gnk-email-status-dashboard-v2" src="/assets/email-status-dashboard-v2.js?v=20260703-1" defer></script>';
 if(!html.includes('gnk-email-status-dashboard-v2'))html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,`${tag}</body>`):`${html}${tag}`;
 const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('x-gnk-asg-email-status',VERSION);
 return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export async function handleEmailStatusRequest(request,env){
 const path=pathOf(request),protectedView=path===DASHBOARD_PATH||path===`${DASHBOARD_PATH}/`||path===`${API_PREFIX}/records`||path===`${API_PREFIX}/health`;
 const backfill=protectedView?await backfillManualMailStatus(env).catch(error=>({ok:false,reason:'backfill_failed',message:String(error?.message||error),version:BACKFILL_VERSION})):null;
 const response=await base.handleEmailStatusRequest(request,env);if(!response)return response;
 if((path===DASHBOARD_PATH||path===`${DASHBOARD_PATH}/`)&&request.method==='GET')return enhanceDashboard(response);
 if(path===`${API_PREFIX}/records`&&request.method==='GET'){
  if(!response.ok)return response;
  const payload=await response.json().catch(()=>null);if(!payload)return response;
  const summary=await completeSummary(request,env);
  return json({...payload,summary,manualAuditBackfill:backfill,version:VERSION},response.status);
 }
 if(path===`${API_PREFIX}/health`&&request.method==='GET'){
  const payload=await response.json().catch(()=>null);if(!payload)return response;
  return json({...payload,manualAuditBackfill:backfill,version:VERSION},response.status);
 }
 return response;
}
