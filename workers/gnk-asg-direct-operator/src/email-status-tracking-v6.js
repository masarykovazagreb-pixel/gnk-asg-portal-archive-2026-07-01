import * as base from './email-status-tracking-v5.js';

export const VERSION=`GNK_ASG_EMAIL_STATUS_TRACKING_V6_20260703_AUDIT_BACKFILL_${base.VERSION}`;
export const DASHBOARD_PATH=base.DASHBOARD_PATH;
export const API_PREFIX=base.API_PREFIX;
export const isEmailStatusPath=base.isEmailStatusPath;
export const withEmailStatusTracking=base.withEmailStatusTracking;
export const syncCloudflareEmailStatuses=base.syncCloudflareEmailStatuses;

const clean=value=>String(value??'').trim();
const dbOf=env=>env?.GNK_ASG_D1||null;
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-email-status':VERSION}});
const parse=(value,fallback)=>{try{return JSON.parse(value);}catch{return fallback;}};
const emailOf=value=>{if(!value)return'';if(typeof value==='object')return clean(value.email||value.address).toLowerCase();const raw=clean(value),match=raw.match(/<([^>]+)>/);return clean(match?.[1]||raw).toLowerCase();};

async function ensureStatusTable(db){
 await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS email_status_records(
   tracking_id TEXT PRIMARY KEY,
   source_system TEXT NOT NULL,
   source_id TEXT,
   recipient TEXT NOT NULL,
   sender TEXT,
   subject TEXT,
   provider_message_id TEXT,
   current_status TEXT NOT NULL DEFAULT 'SUBMITTING',
   provider_status TEXT,
   error_cause TEXT,
   error_detail TEXT,
   accepted_at TEXT,
   delivered_at TEXT,
   failed_at TEXT,
   first_opened_at TEXT,
   last_opened_at TEXT,
   open_count INTEGER NOT NULL DEFAULT 0,
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL
  )`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_status_source ON email_status_records(source_system,source_id)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_status_recipient ON email_status_records(recipient,created_at DESC)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_status_current ON email_status_records(current_status,updated_at DESC)`)
 ]);
}

function providerFor(row,recipient,index){
 const items=parse(row.provider_json,[]);if(!Array.isArray(items))return{};
 return items.find(item=>emailOf(item?.recipient||item?.to||item?.email)===recipient)||items[index]||{};
}
function auditStatus(row,item){
 const raw=clean(item?.status||row?.status).toUpperCase();
 if(['FAILED','BOUNCED','REJECTED'].includes(raw))return raw;
 if(['SENT','PARTIAL','ACCEPTED','DELIVERED','OPENED'].includes(raw))return raw==='SENT'||raw==='PARTIAL'?'ACCEPTED':raw;
 return row?.sent_at?'ACCEPTED':'FAILED';
}

export async function backfillManualMailStatus(env){
 const db=dbOf(env);if(!db?.prepare)return{ok:false,reason:'database_unavailable'};
 await ensureStatusTable(db);
 let rows=[];try{const result=await db.prepare(`SELECT id,from_email,to_json,subject,status,provider_json,error_code,error_message,created_at,sent_at FROM manual_mail_messages WHERE datetime(COALESCE(sent_at,created_at))>=datetime('now','-30 days') ORDER BY datetime(COALESCE(sent_at,created_at)) DESC LIMIT 1000`).all();rows=result.results||[];}catch(error){return{ok:false,reason:'manual_audit_unavailable',message:String(error?.message||error).slice(0,300)};}
 const statements=[];
 for(const row of rows){
  const recipients=parse(row.to_json,[]);const list=Array.isArray(recipients)?recipients.map(emailOf).filter(Boolean):[];
  for(let index=0;index<list.length;index+=1){
   const recipient=list[index],item=providerFor(row,recipient,index),status=auditStatus(row,item),stamp=clean(row.sent_at||row.created_at)||new Date().toISOString();
   const failed=['FAILED','BOUNCED','REJECTED'].includes(status),trackingId=`manual-audit:${clean(row.id)}:${index}`;
   const errorCause=clean(item?.errorCode||item?.code||row.error_code),errorDetail=clean(item?.message||item?.error||row.error_message||(clean(row.status).toUpperCase()==='PARTIAL'?'Djelomično slanje':''));
   statements.push(db.prepare(`INSERT INTO email_status_records(tracking_id,source_system,source_id,recipient,sender,subject,current_status,provider_status,error_cause,error_detail,accepted_at,failed_at,created_at,updated_at)
    SELECT ?,'mail-studio',?,?,?,?,?,?,?,?,?,?,?,?
    WHERE NOT EXISTS(SELECT 1 FROM email_status_records WHERE source_system='mail-studio' AND source_id=? AND LOWER(recipient)=LOWER(?))`).bind(
    trackingId,clean(row.id),recipient,emailOf(row.from_email),clean(row.subject).slice(0,500),status,status.toLowerCase(),errorCause,errorDetail,failed?null:stamp,failed?stamp:null,clean(row.created_at)||stamp,stamp,clean(row.id),recipient
   ));
  }
 }
 for(let index=0;index<statements.length;index+=50)await db.batch(statements.slice(index,index+50));
 return{ok:true,auditedRows:rows.length,candidateRecipients:statements.length};
}

async function completeSummary(request,env){
 const db=dbOf(env);if(!db?.prepare)return{};await ensureStatusTable(db);
 const params=new URL(request.url).searchParams,source=clean(params.get('source')).toLowerCase(),status=clean(params.get('status')).toUpperCase(),search=clean(params.get('search')).toLowerCase();
 const where=[],values=[];
 if(source&&source!=='all'){where.push('LOWER(source_system)=?');values.push(source);}
 if(status&&status!=='ALL'){where.push('UPPER(current_status)=?');values.push(status);}
 if(search){where.push(`(LOWER(recipient) LIKE ? OR LOWER(COALESCE(sender,'')) LIKE ? OR LOWER(COALESCE(subject,'')) LIKE ? OR LOWER(COALESCE(source_id,'')) LIKE ? OR LOWER(COALESCE(provider_message_id,'')) LIKE ?)`);const term=`%${search}%`;values.push(term,term,term,term,term);}
 const sql=`SELECT UPPER(COALESCE(current_status,'UNKNOWN')) status,COUNT(*) count FROM email_status_records${where.length?` WHERE ${where.join(' AND ')}`:''} GROUP BY UPPER(COALESCE(current_status,'UNKNOWN'))`;
 const statement=db.prepare(sql),result=values.length?await statement.bind(...values).all():await statement.all(),summary={};for(const row of result.results||[])summary[row.status]=Number(row.count||0);return summary;
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
 const backfill=protectedView?await backfillManualMailStatus(env).catch(error=>({ok:false,reason:'backfill_failed',message:String(error?.message||error)})):null;
 const response=await base.handleEmailStatusRequest(request,env);if(!response)return response;
 if((path===DASHBOARD_PATH||path===`${DASHBOARD_PATH}/`)&&request.method==='GET')return enhanceDashboard(response);
 if(path===`${API_PREFIX}/records`&&request.method==='GET'){
  if(!response.ok)return response;const payload=await response.json().catch(()=>null);if(!payload)return response;const summary=await completeSummary(request,env);return json({...payload,summary,manualAuditBackfill:backfill,version:VERSION},response.status);
 }
 if(path===`${API_PREFIX}/health`&&request.method==='GET'){
  const payload=await response.json().catch(()=>null);if(!payload)return response;return json({...payload,manualAuditBackfill:backfill,version:VERSION},response.status);
 }
 return response;
}
