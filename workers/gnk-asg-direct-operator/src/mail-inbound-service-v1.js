import {assignReceivingCenter,centerLabel,VERSION as CENTERS_VERSION} from './mail-receiving-centers-v1.js';

export const VERSION='GNK_ASG_MAIL_INBOUND_SERVICE_V1_METADATA_20260628';
export const INDEX_KEY='mail:inbound:index';

const clean=(value,max=4000)=>String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;

function hash(value){
  let result=2166136261;
  for(const char of String(value||'')){
    result^=char.codePointAt(0);
    result=Math.imul(result,16777619);
  }
  return(result>>>0).toString(16).padStart(8,'0').toUpperCase();
}

function datePart(date=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit'}).format(date).replace(/-/g,'');
}

function header(message,name){
  return clean(message?.headers?.get?.(name)||message?.headers?.get?.(name.toLowerCase())||'',4000);
}

function mailboxKey(address){
  const local=clean(address,320).toLowerCase().split('@')[0].replace(/[^a-z0-9._+-]/g,'');
  const known=new Set(['info','contact','media','press','legal','privacy','it','ubo','sefic','assistant','office']);
  return known.has(local)?local:'contact';
}

function caseIdentifier(message,receivedAt){
  const messageId=header(message,'message-id');
  const seed=[messageId,message?.from,message?.to,header(message,'subject'),receivedAt.slice(0,16)].join('|');
  return`GNK-ASG-${datePart(new Date(receivedAt))}-${hash(seed)}`;
}

async function readJson(kv,key,fallback){
  try{
    const raw=await kv.get(key);
    return raw?JSON.parse(raw):fallback;
  }catch{return fallback;}
}

async function writeJson(kv,key,value,options){
  const body=JSON.stringify(value);
  if(options)await kv.put(key,body,options);
  else await kv.put(key,body);
}

function recordFrom(message,receivedAt){
  const caseId=caseIdentifier(message,receivedAt);
  const center=assignReceivingCenter(caseId);
  const mailbox=mailboxKey(message?.to);
  return{
    id:caseId,
    caseId,
    receivedAt,
    source:'direct-email-routing',
    status:'received-metadata',
    from:clean(message?.from,320).toLowerCase(),
    to:clean(message?.to,320).toLowerCase(),
    mailboxKey:mailbox,
    mailboxAddress:clean(message?.to,320).toLowerCase(),
    mailboxLabel:mailbox.toUpperCase(),
    subject:header(message,'subject')||'(bez predmeta)',
    messageId:header(message,'message-id'),
    inReplyTo:header(message,'in-reply-to'),
    references:header(message,'references'),
    dateHeader:header(message,'date'),
    autoSubmitted:header(message,'auto-submitted'),
    precedence:header(message,'precedence'),
    listId:header(message,'list-id'),
    rawSize:Number(message?.rawSize||0),
    canBeForwarded:Boolean(message?.canBeForwarded),
    receivingCenter:{...center,labelHr:centerLabel(center,'hr'),labelEn:centerLabel(center,'en')},
    centersVersion:CENTERS_VERSION,
    contentParsed:false,
    autoReply:{eligible:false,attempted:false,sent:false,reason:'metadata_only_phase'},
    forward:{attempted:false,sent:false}
  };
}

export async function storeInboundMetadata(message,env,{receivedAt=new Date().toISOString()}={}){
  const kv=store(env);
  if(!kv?.get||!kv?.put)return{ok:false,error:'kv_binding_missing',record:null};
  const record=recordFrom(message,receivedAt);
  const recordKey=`mail:inbound:${record.caseId}`;
  const existing=await readJson(kv,recordKey,null);
  if(existing)return{ok:true,duplicate:true,record:existing};
  await writeJson(kv,recordKey,record,{expirationTtl:60*60*24*365});
  const current=await readJson(kv,INDEX_KEY,[]);
  const index=[{
    caseId:record.caseId,
    receivedAt:record.receivedAt,
    from:record.from,
    to:record.to,
    mailboxKey:record.mailboxKey,
    subject:record.subject,
    status:record.status,
    receivingCenter:record.receivingCenter
  },...(Array.isArray(current)?current:[]).filter(item=>item?.caseId!==record.caseId)].slice(0,1000);
  await writeJson(kv,INDEX_KEY,index);
  await writeJson(kv,'mail:inbound:last',record);
  return{ok:true,duplicate:false,record};
}
