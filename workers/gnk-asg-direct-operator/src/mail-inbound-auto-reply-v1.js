import {EmailMessage} from 'cloudflare:email';
import {autoReplyEligibility,buildAutoReplyContent,VERSION as POLICY_VERSION} from './mail-inbound-reply-policy-v1.js';
import {INDEX_KEY,VERSION as INBOUND_VERSION} from './mail-inbound-service-v1.js';

export const VERSION='GNK_ASG_MAIL_INBOUND_AUTO_REPLY_V2_ATOMIC_D1_20260628';

const clean=(value,max=1000)=>String(value??'').replace(/[\r\n\u0000]+/g,' ').trim().slice(0,max);
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const database=env=>env.GNK_ASG_D1||null;
const enabled=env=>String(env.MAIL_INBOUND_AUTO_REPLY||'false').toLowerCase()==='true';
const mode=env=>clean(env.MAIL_INBOUND_AUTO_REPLY_MODE||'media-only',40)||'media-only';

async function readJson(kv,key,fallback){
  try{
    const raw=await kv.get(key);
    return raw?JSON.parse(raw):fallback;
  }catch{return fallback;}
}

async function writeJson(kv,key,value,options){
  if(!kv?.put)return;
  const body=JSON.stringify(value);
  if(options)await kv.put(key,body,options);
  else await kv.put(key,body);
}

async function updateRecord(kv,record,autoReply,status){
  if(!kv||!record?.caseId)return;
  const updated={...record,status,autoReply:{...autoReply,version:VERSION,policyVersion:POLICY_VERSION,updatedAt:new Date().toISOString()}};
  await writeJson(kv,`mail:inbound:${record.caseId}`,updated,{expirationTtl:60*60*24*365});
  const current=await readJson(kv,INDEX_KEY,[]);
  if(Array.isArray(current)){
    const index=current.map(item=>item?.caseId===record.caseId?{...item,status,autoReply:updated.autoReply}:item);
    await writeJson(kv,INDEX_KEY,index);
  }
}

async function ensureClaimTable(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS mail_inbound_auto_reply_claims (
    case_id TEXT PRIMARY KEY,
    state TEXT NOT NULL CHECK (state IN ('pending','sent','failed')),
    sender TEXT NOT NULL DEFAULT '',
    recipient TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sent_at TEXT,
    failed_at TEXT,
    error TEXT NOT NULL DEFAULT ''
  )`).run();
}

async function atomicClaim(env,record,message){
  const db=database(env);
  const kv=store(env);
  const replyKey=`mail:inbound:reply:${record.caseId}`;
  const now=new Date().toISOString();
  if(db?.prepare){
    await ensureClaimTable(db);
    const sender=clean(message?.to,320).toLowerCase();
    const recipient=clean(message?.from,320).toLowerCase();
    const result=await db.prepare(`INSERT OR IGNORE INTO mail_inbound_auto_reply_claims
      (case_id,state,sender,recipient,created_at,updated_at,error)
      VALUES (?1,'pending',?2,?3,?4,?4,'')`)
      .bind(record.caseId,sender,recipient,now).run();
    const changes=Number(result?.meta?.changes||0);
    if(changes===1){
      const pending={state:'pending',sent:false,caseId:record.caseId,createdAt:now,version:VERSION,claimStore:'D1'};
      await writeJson(kv,replyKey,pending,{expirationTtl:60*60*24*30});
      return{claimed:true,pending,replyKey,claimStore:'D1'};
    }
    const previous=await db.prepare('SELECT case_id,state,sender,recipient,created_at,updated_at,sent_at,failed_at,error FROM mail_inbound_auto_reply_claims WHERE case_id=?1')
      .bind(record.caseId).first();
    return{claimed:false,previous:previous||{state:'unknown'},replyKey,claimStore:'D1'};
  }
  const previous=await readJson(kv,replyKey,null);
  if(previous?.sent||previous?.state==='pending'||previous?.state==='failed')return{claimed:false,previous,replyKey,claimStore:'KV_FALLBACK'};
  const pending={state:'pending',sent:false,caseId:record.caseId,createdAt:now,version:VERSION,claimStore:'KV_FALLBACK'};
  await writeJson(kv,replyKey,pending,{expirationTtl:60*60*24*30});
  return{claimed:true,pending,replyKey,claimStore:'KV_FALLBACK'};
}

async function completeClaim(env,record,state,details={}){
  const db=database(env);
  const now=new Date().toISOString();
  if(db?.prepare){
    const sentAt=state==='sent'?now:null;
    const failedAt=state==='failed'?now:null;
    await db.prepare(`UPDATE mail_inbound_auto_reply_claims
      SET state=?2,updated_at=?3,sent_at=?4,failed_at=?5,error=?6
      WHERE case_id=?1`)
      .bind(record.caseId,state,now,sentAt,failedAt,clean(details.error||'',500)).run();
  }
}

export async function maybeSendInboundAutoReply(message,env,record){
  const kv=store(env);
  if(!record?.caseId)return{ok:false,sent:false,reason:'record_missing'};
  if(!enabled(env)){
    const result={eligible:false,attempted:false,sent:false,reason:'disabled'};
    await updateRecord(kv,record,result,record.status||'received-metadata');
    return{ok:true,...result};
  }
  const eligibility=autoReplyEligibility(message,{mode:mode(env)});
  if(!eligibility.eligible){
    const result={...eligibility,attempted:false,sent:false};
    await updateRecord(kv,record,result,'received-no-auto-reply');
    return{ok:true,...result};
  }
  if(!kv?.get||!kv?.put){
    return{ok:false,eligible:true,attempted:false,sent:false,reason:'kv_binding_missing'};
  }
  let claim;
  try{
    claim=await atomicClaim(env,record,message);
  }catch(error){
    return{ok:false,eligible:true,attempted:false,sent:false,reason:'claim_failed',error:clean(error?.message||error,500)};
  }
  if(!claim.claimed){
    return{ok:true,eligible:true,attempted:false,sent:claim.previous?.state==='sent'||Boolean(claim.previous?.sent),reason:'already_processed',previous:claim.previous,claimStore:claim.claimStore};
  }
  const content=buildAutoReplyContent(record,message);
  try{
    const result=await message.reply(new EmailMessage(content.sender,content.recipient,content.raw));
    const completed={state:'sent',eligible:true,attempted:true,sent:true,reason:'sent',caseId:record.caseId,sender:content.sender,recipient:content.recipient,providerResult:result||null,sentAt:new Date().toISOString(),version:VERSION,inboundVersion:INBOUND_VERSION,claimStore:claim.claimStore};
    await completeClaim(env,record,'sent');
    await writeJson(kv,claim.replyKey,completed,{expirationTtl:60*60*24*365});
    await updateRecord(kv,record,completed,'received-auto-replied');
    return{ok:true,...completed};
  }catch(error){
    const failed={state:'failed',eligible:true,attempted:true,sent:false,reason:'reply_failed',caseId:record.caseId,error:clean(error?.message||error,500),failedAt:new Date().toISOString(),version:VERSION,claimStore:claim.claimStore};
    await completeClaim(env,record,'failed',{error:failed.error});
    await writeJson(kv,claim.replyKey,failed,{expirationTtl:60*60*24*365});
    await updateRecord(kv,record,failed,'received-auto-reply-failed');
    return{ok:false,...failed};
  }
}
