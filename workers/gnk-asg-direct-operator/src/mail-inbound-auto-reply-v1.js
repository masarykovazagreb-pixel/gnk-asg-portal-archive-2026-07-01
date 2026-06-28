import {EmailMessage} from 'cloudflare:email';
import {autoReplyEligibility,buildAutoReplyContent,VERSION as POLICY_VERSION} from './mail-inbound-reply-policy-v1.js';
import {INDEX_KEY,VERSION as INBOUND_VERSION} from './mail-inbound-service-v1.js';

export const VERSION='GNK_ASG_MAIL_INBOUND_AUTO_REPLY_V1_20260628';

const clean=(value,max=1000)=>String(value??'').replace(/[\r\n\u0000]+/g,' ').trim().slice(0,max);
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
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
  const replyKey=`mail:inbound:reply:${record.caseId}`;
  const previous=await readJson(kv,replyKey,null);
  if(previous?.sent||previous?.state==='pending'){
    return{ok:true,eligible:true,attempted:false,sent:Boolean(previous.sent),reason:'already_processed',previous};
  }
  const pending={state:'pending',sent:false,caseId:record.caseId,createdAt:new Date().toISOString(),version:VERSION};
  await writeJson(kv,replyKey,pending,{expirationTtl:60*60*24*30});
  const content=buildAutoReplyContent(record,message);
  try{
    const result=await message.reply(new EmailMessage(content.sender,content.recipient,content.raw));
    const completed={state:'sent',eligible:true,attempted:true,sent:true,reason:'sent',caseId:record.caseId,sender:content.sender,recipient:content.recipient,providerResult:result||null,sentAt:new Date().toISOString(),version:VERSION,inboundVersion:INBOUND_VERSION};
    await writeJson(kv,replyKey,completed,{expirationTtl:60*60*24*365});
    await updateRecord(kv,record,completed,'received-auto-replied');
    return{ok:true,...completed};
  }catch(error){
    const failed={state:'failed',eligible:true,attempted:true,sent:false,reason:'reply_failed',caseId:record.caseId,error:clean(error?.message||error,500),failedAt:new Date().toISOString(),version:VERSION};
    await writeJson(kv,replyKey,failed,{expirationTtl:60*10});
    await updateRecord(kv,record,failed,'received-auto-reply-failed');
    return{ok:false,...failed};
  }
}
