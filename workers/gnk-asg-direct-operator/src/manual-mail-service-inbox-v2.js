import {
  handleManualMailService as handleV1,
  SEND_PATH,STATUS_PATH,SENT_PATH,OUTBOX_PATH,INBOX_PATH,READINESS_PATH,
  VERSION as BASE_VERSION
} from './manual-mail-service-v1.js';

export const VERSION='GNK_ASG_MANUAL_MAIL_INBOX_V2_20260629';
export{SEND_PATH,STATUS_PATH,SENT_PATH,OUTBOX_PATH,INBOX_PATH,READINESS_PATH};
const clean=value=>String(value??'').trim();
const dbOf=env=>env.GNK_ASG_D1||null;
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-manual-mail-inbox':VERSION,'x-gnk-asg-manual-mail-service':BASE_VERSION}});

async function query(db,sql){try{return (await db.prepare(sql).all()).results||[];}catch{return[];}}
async function inbox(env){
  const db=dbOf(env),items=[];
  if(db?.prepare){
    const applications=await query(db,`SELECT application_id,received_at,source_from,source_subject,outlet_name,status,score,human_decision,updated_at FROM media_applications ORDER BY received_at DESC LIMIT 100`);
    for(const row of applications)items.push({id:row.application_id,source:'media_application',receivedAt:row.received_at,from:row.source_from,to:'media@gnk-asg.hr',subject:row.source_subject,outlet:row.outlet_name,status:row.status,score:Number(row.score||0),humanDecision:row.human_decision,updatedAt:row.updated_at});
    const contacts=await query(db,`SELECT case_id,received_at,name,email,department,subject,message,attachment_name,status FROM contact_messages ORDER BY received_at DESC LIMIT 100`);
    for(const row of contacts)items.push({id:row.case_id,source:'contact_form',receivedAt:row.received_at,from:row.email,to:row.department||'GNK ASG',subject:row.subject,name:row.name,message:row.message,attachment:row.attachment_name,status:row.status});
  }
  try{
    const kv=kvOf(env),raw=await kv?.get?.('mail:center:inbox'),legacy=raw?JSON.parse(raw):[];
    if(Array.isArray(legacy))for(const row of legacy)items.push({...row,source:row.source||'legacy_inbox'});
  }catch{}
  const seen=new Set(),unique=items.filter(item=>{const key=clean(item.id)||`${clean(item.source)}|${clean(item.from)}|${clean(item.subject)}|${clean(item.receivedAt)}`;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>Date.parse(b.receivedAt||b.updatedAt||0)-Date.parse(a.receivedAt||a.updatedAt||0)).slice(0,150);
  return{ok:true,version:VERSION,inboundConnected:true,items:unique,count:unique.length,sources:{mediaApplications:unique.filter(x=>x.source==='media_application').length,contactForm:unique.filter(x=>x.source==='contact_form').length,legacy:unique.filter(x=>x.source==='legacy_inbox').length}};
}

export async function handleManualMailService(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===INBOX_PATH&&request.method==='GET')return json(await inbox(env));
  return handleV1(request,env);
}
