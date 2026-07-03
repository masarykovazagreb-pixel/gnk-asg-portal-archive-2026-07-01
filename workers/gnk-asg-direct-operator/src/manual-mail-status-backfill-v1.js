import {ensureEmailStatusSchema} from './email-status-tracking-v1.js';

export const VERSION='GNK_ASG_MANUAL_MAIL_STATUS_BACKFILL_V1_20260703';
const clean=value=>String(value??'').trim();
const dbOf=env=>env?.GNK_ASG_D1||null;
const parse=(value,fallback)=>{try{return JSON.parse(value);}catch{return fallback;}};
const emailOf=value=>{if(!value)return'';if(typeof value==='object')return clean(value.email||value.address).toLowerCase();const raw=clean(value),match=raw.match(/<([^>]+)>/);return clean(match?.[1]||raw).toLowerCase();};
function providerFor(row,recipient,index){const items=parse(row.provider_json,[]);if(!Array.isArray(items))return{};return items.find(item=>emailOf(item?.recipient||item?.to||item?.email)===recipient)||items[index]||{};}
function auditStatus(row,item){const raw=clean(item?.status||row?.status).toUpperCase();if(['FAILED','BOUNCED','REJECTED'].includes(raw))return raw;if(['SENT','PARTIAL','ACCEPTED','DELIVERED','OPENED'].includes(raw))return raw==='SENT'||raw==='PARTIAL'?'ACCEPTED':raw;return row?.sent_at?'ACCEPTED':'FAILED';}
export async function backfillManualMailStatus(env){
 const db=dbOf(env);if(!db?.prepare)return{ok:false,reason:'database_unavailable',version:VERSION};
 await ensureEmailStatusSchema(env);
 let rows=[];try{const result=await db.prepare(`SELECT id,from_email,to_json,subject,status,provider_json,error_code,error_message,created_at,sent_at FROM manual_mail_messages WHERE datetime(COALESCE(sent_at,created_at))>=datetime('now','-30 days') ORDER BY datetime(COALESCE(sent_at,created_at)) DESC LIMIT 1000`).all();rows=result.results||[];}catch(error){return{ok:false,reason:'manual_audit_unavailable',message:String(error?.message||error).slice(0,300),version:VERSION};}
 const statements=[];
 for(const row of rows){const recipients=parse(row.to_json,[]),list=Array.isArray(recipients)?recipients.map(emailOf).filter(Boolean):[];for(let index=0;index<list.length;index+=1){const recipient=list[index],item=providerFor(row,recipient,index),status=auditStatus(row,item),stamp=clean(row.sent_at||row.created_at)||new Date().toISOString(),failed=['FAILED','BOUNCED','REJECTED'].includes(status),trackingId=`manual-audit:${clean(row.id)}:${index}`,errorCause=clean(item?.errorCode||item?.code||row.error_code),errorDetail=clean(item?.message||item?.error||row.error_message||(clean(row.status).toUpperCase()==='PARTIAL'?'Djelomično slanje':''));statements.push(db.prepare(`INSERT INTO email_status_records(tracking_id,source_system,source_id,recipient,sender,subject,current_status,provider_status,error_cause,error_detail,accepted_at,failed_at,created_at,updated_at) SELECT ?,'mail-studio',?,?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM email_status_records WHERE source_system='mail-studio' AND source_id=? AND LOWER(recipient)=LOWER(?))`).bind(trackingId,clean(row.id),recipient,emailOf(row.from_email),clean(row.subject).slice(0,500),status,status.toLowerCase(),errorCause,errorDetail,failed?null:stamp,failed?stamp:null,clean(row.created_at)||stamp,stamp,clean(row.id),recipient));}}
 for(let index=0;index<statements.length;index+=50)await db.batch(statements.slice(index,index+50));
 return{ok:true,auditedRows:rows.length,candidateRecipients:statements.length,version:VERSION};
}
