import {enforceRequiredSignature,MANDATORY_BCC,VERSION as SIGNATURE_VERSION} from './email-signature-contract-v1.js';

export const VERSION='GNK_ASG_MAIL_DELIVERY_SMOKE_V1_20260627_R2';
export const PUBLIC_PATH='/data/mail-delivery-health.json';
const KEY='mail:delivery:smoke:v1';
const MAX_ATTEMPTS=3;
const LOCK_STALE_MS=120000;
const clean=value=>String(value??'').trim();
const boolEnv=value=>/^(1|true|yes|on)$/i.test(clean(value));
const now=()=>new Date().toISOString();
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;

async function read(env){
  const kv=kvOf(env);if(!kv?.get)return null;
  try{const raw=await kv.get(KEY);return raw?JSON.parse(raw):null;}catch{return null;}
}
async function write(env,value){
  const kv=kvOf(env);if(!kv?.put)return false;
  await kv.put(KEY,JSON.stringify(value,null,2));
  return true;
}
function publicState(env,state){
  return{
    ok:Boolean(state?.status==='SENT'),
    version:VERSION,
    enabled:boolEnv(env.MAIL_BOOTSTRAP_SMOKE_TEST),
    manualLive:boolEnv(env.MAIL_MANUAL_LIVE),
    emailBindingConfigured:Boolean(env.EMAIL?.send),
    mandatoryCopyEnforced:true,
    signatureVersion:SIGNATURE_VERSION,
    status:state?.status||'PENDING',
    attempts:Number(state?.attempts||0),
    startedAt:state?.startedAt||null,
    sentAt:state?.sentAt||null,
    checkedAt:now(),
    messageIdPresent:Boolean(state?.messageId),
    errorCode:state?.errorCode||null,
    errorMessage:state?.errorMessage||null
  };
}
function activeLock(state){
  if(state?.status!=='SENDING')return false;
  const updated=Date.parse(state.updatedAt||state.startedAt||'');
  return Number.isFinite(updated)&&Date.now()-updated<LOCK_STALE_MS;
}

export async function runMailDeliverySmoke(env){
  const enabled=boolEnv(env.MAIL_BOOTSTRAP_SMOKE_TEST);
  const existing=await read(env);
  if(!enabled)return publicState(env,existing||{status:'DISABLED'});
  if(existing?.status==='SENT'||activeLock(existing))return publicState(env,existing);
  const attempts=Number(existing?.attempts||0);
  if(attempts>=MAX_ATTEMPTS)return publicState(env,existing);
  if(!env.EMAIL?.send){
    const failed={status:'FAILED',attempts:attempts+1,startedAt:existing?.startedAt||now(),errorCode:'EMAIL_BINDING_MISSING',errorMessage:'EMAIL binding is not configured',updatedAt:now()};
    await write(env,failed);
    return publicState(env,failed);
  }

  const state={status:'SENDING',attempts:attempts+1,startedAt:existing?.startedAt||now(),updatedAt:now()};
  await write(env,state);
  const payload=enforceRequiredSignature({
    to:MANDATORY_BCC,
    from:{email:'it@gnk-asg.hr',name:'IT – Osobni digitalni asistent'},
    replyTo:'it@gnk-asg.hr',
    subject:'[GNK-ASG-MAIL-TEST] Kanal za slanje aktivan',
    text:[
      'Poštovani,',
      '',
      'ovo je jednokratna interna provjera produkcijskog kanala za slanje e-mailova GNK ASG.',
      'Poruka potvrđuje da su EMAIL binding, službeni profil pošiljatelja, potpis bez telefona i WhatsAppa te obvezna interna kopija aktivni.',
      '',
      `Vrijeme provjere: ${now()}`
    ].join('\n'),
    headers:{'X-GNK-ASG-Mail-Smoke-Test':VERSION}
  });
  try{
    const result=await env.EMAIL.send(payload);
    const sent={status:'SENT',attempts:state.attempts,startedAt:state.startedAt,sentAt:now(),updatedAt:now(),messageId:clean(result?.messageId)};
    await write(env,sent);
    return publicState(env,sent);
  }catch(error){
    const failed={status:'FAILED',attempts:state.attempts,startedAt:state.startedAt,updatedAt:now(),errorCode:clean(error?.code)||'EMAIL_SEND_FAILED',errorMessage:String(error?.message||error).slice(0,300)};
    await write(env,failed);
    return publicState(env,failed);
  }
}

export async function handleMailDeliverySmoke(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path!==PUBLIC_PATH||!['GET','HEAD'].includes(request.method))return null;
  const state=publicState(env,await read(env));
  const body=request.method==='HEAD'?null:JSON.stringify(state,null,2);
  return new Response(body,{status:state.ok?200:503,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-mail-delivery-smoke':VERSION,
    'x-gnk-asg-mail-delivery-status':state.status
  }});
}
