import {assignReceivingCenter,centerLabel,VERSION as CENTERS_VERSION} from './mail-receiving-centers-v1.js';
import {INDEX_KEY as DIRECT_INDEX_KEY,VERSION as DIRECT_INBOUND_VERSION} from './mail-inbound-service-v1.js';

export const VERSION='GNK_ASG_MAIL_INBOX_UNIFIED_V3_20260628';
export const INBOX_PATH='/api/mail-center/inbox';

const clean=value=>String(value??'').trim();
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
  'x-gnk-asg-mail-inbox':VERSION,
  'x-gnk-asg-direct-inbound':DIRECT_INBOUND_VERSION,
  'x-gnk-asg-receiving-centers':CENTERS_VERSION
}});
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;

async function readJson(kv,key,fallback){
  try{
    const raw=await kv.get(key);
    return raw?JSON.parse(raw):fallback;
  }catch{return fallback;}
}

function centerValue(source,caseId,seed){
  const center=source?.receivingCenter||assignReceivingCenter(caseId||seed);
  return{...center,labelHr:center.labelHr||centerLabel(center,'hr'),labelEn:center.labelEn||centerLabel(center,'en')};
}

function normalizeContact(record,index){
  const source=record&&typeof record==='object'?record:{};
  const summary=index&&typeof index==='object'?index:{};
  const caseId=clean(source.caseId||summary.caseId);
  const email=clean(source.email||summary.email);
  return{
    id:caseId,
    caseId,
    receivedAt:clean(source.receivedAt||summary.receivedAt),
    mailboxKey:clean(source.mailboxKey),
    mailboxAddress:clean(source.mailboxAddress),
    mailboxLabel:clean(source.mailboxLabel),
    receivingCenter:centerValue(source,caseId,email),
    from:{name:clean(source.name||summary.name),email},
    phone:clean(source.phone),
    subject:clean(source.subject||summary.subject),
    message:clean(source.message),
    snippet:clean(source.message).slice(0,320),
    status:clean(source.status||summary.status||'received'),
    attachment:{filename:clean(source.attachmentName),size:Number(source.attachmentSize||0),stored:Boolean(source.r2Saved),key:clean(source.attachmentKey)},
    source:clean(source.source||'public-contact-form'),
    contentParsed:true,
    autoReply:source.autoReply||null,
    internalMail:source.internalMail||null,
    directEmail:null
  };
}

function normalizeDirect(record,index){
  const source=record&&typeof record==='object'?record:{};
  const summary=index&&typeof index==='object'?index:{};
  const caseId=clean(source.caseId||summary.caseId);
  const from=clean(source.from||summary.from);
  return{
    id:caseId,
    caseId,
    receivedAt:clean(source.receivedAt||summary.receivedAt),
    mailboxKey:clean(source.mailboxKey||summary.mailboxKey),
    mailboxAddress:clean(source.mailboxAddress||source.to||summary.to),
    mailboxLabel:clean(source.mailboxLabel||source.mailboxKey||summary.mailboxKey).toUpperCase(),
    receivingCenter:centerValue(source,caseId,from),
    from:{name:'',email:from},
    phone:'',
    subject:clean(source.subject||summary.subject||'(bez predmeta)'),
    message:clean(source.message||''),
    snippet:clean(source.message||'Sadržaj poruke još nije parsiran.').slice(0,320),
    status:clean(source.status||summary.status||'received-metadata'),
    attachment:{filename:'',size:0,stored:false,key:''},
    source:'direct-email-routing',
    contentParsed:Boolean(source.contentParsed),
    autoReply:source.autoReply||{eligible:false,attempted:false,sent:false},
    internalMail:null,
    directEmail:{messageId:clean(source.messageId),inReplyTo:clean(source.inReplyTo),rawSize:Number(source.rawSize||0),canBeForwarded:Boolean(source.canBeForwarded),dateHeader:clean(source.dateHeader)}
  };
}

export async function handleMailInbox(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path!==INBOX_PATH)return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  const kv=store(env);
  if(!kv?.get)return json({ok:false,error:'kv_binding_missing',inboundConnected:false,items:[]},503);
  const url=new URL(request.url);
  const limit=Math.max(1,Math.min(100,Number(url.searchParams.get('limit')||50)));
  const [contactIndex,directIndex]=await Promise.all([
    readJson(kv,'contact:index',[]),
    readJson(kv,DIRECT_INDEX_KEY,[])
  ]);
  const contacts=await Promise.all((Array.isArray(contactIndex)?contactIndex:[]).slice(0,limit).map(async summary=>{
    const caseId=clean(summary?.caseId);
    return normalizeContact(caseId?await readJson(kv,`contact:${caseId}`,{}):{},summary);
  }));
  const direct=await Promise.all((Array.isArray(directIndex)?directIndex:[]).slice(0,limit).map(async summary=>{
    const caseId=clean(summary?.caseId);
    return normalizeDirect(caseId?await readJson(kv,`mail:inbound:${caseId}`,{}):{},summary);
  }));
  const items=[...contacts,...direct]
    .sort((a,b)=>Date.parse(b.receivedAt||0)-Date.parse(a.receivedAt||0))
    .slice(0,limit);
  return json({
    ok:true,
    version:VERSION,
    directInboundVersion:DIRECT_INBOUND_VERSION,
    receivingCentersVersion:CENTERS_VERSION,
    inboundConnected:true,
    sources:{contactForm:contacts.length,directEmail:direct.length},
    count:items.length,
    items,
    note:'Inbox combines contact-form submissions and metadata-only direct email intake. MIME content parsing and automatic replies remain separate verified steps.'
  });
}
