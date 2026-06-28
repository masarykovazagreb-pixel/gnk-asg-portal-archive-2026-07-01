export const VERSION='GNK_ASG_MAIL_INBOX_CONTACT_V1_20260628';
export const INBOX_PATH='/api/mail-center/inbox';

const clean=value=>String(value??'').trim();
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
  'x-gnk-asg-mail-inbox':VERSION
}});
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;

async function readJson(kv,key,fallback){
  try{
    const raw=await kv.get(key);
    return raw?JSON.parse(raw):fallback;
  }catch{return fallback;}
}

function normalize(record,index){
  const source=record&&typeof record==='object'?record:{};
  const summary=index&&typeof index==='object'?index:{};
  const caseId=clean(source.caseId||summary.caseId);
  return{
    id:caseId,
    caseId,
    receivedAt:clean(source.receivedAt||summary.receivedAt),
    mailboxKey:clean(source.mailboxKey),
    mailboxAddress:clean(source.mailboxAddress),
    mailboxLabel:clean(source.mailboxLabel),
    from:{name:clean(source.name||summary.name),email:clean(source.email||summary.email)},
    phone:clean(source.phone),
    subject:clean(source.subject||summary.subject),
    message:clean(source.message),
    snippet:clean(source.message).slice(0,320),
    status:clean(source.status||summary.status||'received'),
    attachment:{
      filename:clean(source.attachmentName),
      size:Number(source.attachmentSize||0),
      stored:Boolean(source.r2Saved),
      key:clean(source.attachmentKey)
    },
    source:clean(source.source||'public-contact-form'),
    autoReply:source.autoReply||null,
    internalMail:source.internalMail||null
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
  const index=await readJson(kv,'contact:index',[]);
  const selected=(Array.isArray(index)?index:[]).slice(0,limit);
  const items=await Promise.all(selected.map(async summary=>{
    const caseId=clean(summary?.caseId);
    const record=caseId?await readJson(kv,`contact:${caseId}`,{}):{};
    return normalize(record,summary);
  }));
  return json({
    ok:true,
    version:VERSION,
    inboundConnected:true,
    source:'contact-form',
    count:items.length,
    items,
    note:'Inbox currently includes contact-form submissions. Direct mailbox ingestion will be added as a separate verified step.'
  });
}
