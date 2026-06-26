import {withRequiredEmailSignature,VERSION as SIGNATURE_VERSION} from './email-signature-contract-v1.js';

export const VERSION='GNK_ASG_MAIL_PROFILE_DELIVERY_TEST_V1_20260626_R4_SHARED_EPHEMERAL_GATE';
export const STATUS_PATH='/api/mail-center/profile-test-status';
export const SEND_PATH='/api/mail-center/profile-test';
export const INTERNAL_TEST_PATH='/api/mail-center/internal-profile-test';

const PROFILES=[
  {id:'office',label:'GNK ASG Office',email:'office@gnk-asg.hr'},
  {id:'legal',label:'GNK ASG Legal',email:'legal@gnk-asg.hr'},
  {id:'media',label:'GNK ASG Media Relations',email:'media@gnk-asg.hr'},
  {id:'it',label:'GNK ASG IT',email:'it@gnk-asg.hr'},
  {id:'director',label:'Nermin Sefić · Direktor',email:'nermin.sefic@gnk-asg.hr'}
];
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const boolEnv=value=>/^(1|true|yes|on)$/i.test(clean(value));
const dbOf=env=>env.GNK_ASG_D1||null;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-gnk-asg-mail-profile-delivery-test':VERSION}});

function allowlist(env){
  const raw=clean(env.MAIL_PROFILE_TEST_RECIPIENTS||env.MEDIA_OUTREACH_TEST_RECIPIENTS);
  return new Set(raw.split(/[;,\s]+/).map(item=>item.toLowerCase()).filter(validEmail));
}
function testLive(env){
  const explicit=clean(env.MAIL_PROFILE_TEST_LIVE);
  return explicit?boolEnv(explicit):boolEnv(env.MEDIA_OUTREACH_TEST_LIVE);
}
function secureEqual(a,b){
  const left=new TextEncoder().encode(String(a||'')),right=new TextEncoder().encode(String(b||''));
  let mismatch=left.length^right.length;
  const length=Math.max(left.length,right.length);
  for(let index=0;index<length;index++)mismatch|=(left[index%Math.max(left.length,1)]||0)^(right[index%Math.max(right.length,1)]||0);
  return mismatch===0&&left.length>31;
}
function internalTestEnv(env){
  return new Proxy(env,{get(target,property,receiver){if(String(property)==='MAIL_PROFILE_TEST_LIVE')return'true';return Reflect.get(target,property,receiver);}});
}
async function ensureSchema(env){
  const db=dbOf(env);if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.prepare(`CREATE TABLE IF NOT EXISTS mail_profile_delivery_tests(
    id TEXT PRIMARY KEY, batch_id TEXT NOT NULL, profile_id TEXT NOT NULL, sender_email TEXT NOT NULL,
    recipient TEXT NOT NULL, status TEXT NOT NULL, provider_message_id TEXT, error_code TEXT,
    detail_json TEXT, created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_mail_profile_tests_batch ON mail_profile_delivery_tests(batch_id,created_at)`).run();
  return db;
}
async function record(env,batchId,profile,recipient,status,detail={}){
  const db=await ensureSchema(env);
  await db.prepare(`INSERT INTO mail_profile_delivery_tests(id,batch_id,profile_id,sender_email,recipient,status,provider_message_id,error_code,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(),batchId,profile.id,profile.email,recipient,status,clean(detail.messageId),clean(detail.errorCode),JSON.stringify(detail),now()).run();
}
async function recent(env){
  try{
    const db=await ensureSchema(env);
    return (await db.prepare(`SELECT batch_id,profile_id,sender_email,recipient,status,provider_message_id,error_code,created_at FROM mail_profile_delivery_tests ORDER BY created_at DESC LIMIT 25`).all()).results||[];
  }catch{return[];}
}
function status(env){
  return{ok:true,version:VERSION,signatureVersion:SIGNATURE_VERSION,testLive:testLive(env),allowlistedRecipients:allowlist(env).size,emailBindingConfigured:Boolean(env.EMAIL?.send),profiles:PROFILES.map(profile=>({id:profile.id,label:profile.label,email:profile.email}))};
}
function message(profile,recipient,batchId){
  const text=[
    'INTERNI GNK ASG TEST POŠILJATELJSKOG PROFILA',
    '',
    `Profil: ${profile.label}`,
    `Pošiljatelj: ${profile.email}`,
    `Primatelj: ${recipient}`,
    `Batch: ${batchId}`,
    '',
    'Ova poruka služi isključivo za provjeru isporuke, identiteta pošiljatelja i službenog potpisa. Nije namijenjena vanjskoj distribuciji.'
  ].join('\n');
  return{
    to:recipient,
    from:{email:profile.email,name:profile.label},
    replyTo:profile.email,
    subject:`[GNK-ASG-PROFILE-TEST] ${profile.label}`,
    text,
    headers:{'X-GNK-ASG-Profile-Test':VERSION,'X-GNK-ASG-Profile-Id':profile.id,'X-GNK-ASG-Test-Batch':batchId}
  };
}
async function safeRecord(env,batchId,profile,recipient,status,detail){
  try{await record(env,batchId,profile,recipient,status,detail);return{logged:true};}
  catch(error){return{logged:false,logError:String(error?.message||error).slice(0,300)};}
}
async function sendBatch(request,env){
  let body={};try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const recipient=clean(body.recipient).toLowerCase();
  if(clean(body.confirm)!=='SEND_PROFILE_TESTS')return json({ok:false,error:'confirmation_required',required:'SEND_PROFILE_TESTS'},409);
  if(!testLive(env))return json({ok:false,error:'profile_test_sending_locked'},423);
  const allowed=allowlist(env);
  if(!validEmail(recipient)||!allowed.has(recipient))return json({ok:false,error:'recipient_not_allowlisted',configuredCount:allowed.size},403);
  if(!env.EMAIL?.send)return json({ok:false,error:'email_binding_missing'},503);

  const signedEnv=withRequiredEmailSignature(env);
  const batchId=crypto.randomUUID();
  const results=[];
  for(const profile of PROFILES){
    let sent;
    try{sent=await signedEnv.EMAIL.send(message(profile,recipient,batchId));}
    catch(error){
      const detail={errorCode:clean(error?.code)||'EMAIL_SEND_FAILED',message:String(error?.message||error).slice(0,500)};
      const audit=await safeRecord(env,batchId,profile,recipient,'FAILED',detail);
      results.push({profile:profile.id,from:profile.email,status:'FAILED',...detail,audit});
      continue;
    }
    const detail={messageId:clean(sent?.messageId),signatureVersion:SIGNATURE_VERSION};
    const audit=await safeRecord(env,batchId,profile,recipient,'SENT',detail);
    results.push({profile:profile.id,from:profile.email,status:'SENT',messageId:detail.messageId,audit});
  }
  const sentCount=results.filter(item=>item.status==='SENT').length;
  const auditWarnings=results.filter(item=>item.audit?.logged===false).length;
  return json({ok:sentCount===PROFILES.length,batchId,recipient,sent:sentCount,failed:PROFILES.length-sentCount,auditWarnings,results,signatureVersion:SIGNATURE_VERSION},sentCount===PROFILES.length?200:207);
}
async function handleInternalTest(request,env){
  if(request.method!=='POST')return new Response('Not found',{status:404});
  const supplied=request.headers.get('x-gnk-mail-test-nonce')||'';
  const configured=env.MAIL_PROFILE_TEST_NONCE||env.MEDIA_OUTREACH_TEST_NONCE||'';
  if(!secureEqual(supplied,configured))return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  return sendBatch(request,internalTestEnv(env));
}

export async function handleMailProfileDeliveryTest(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===INTERNAL_TEST_PATH)return handleInternalTest(request,env);
  if(path===STATUS_PATH&&request.method==='GET')return json({...status(env),recent:await recent(env)});
  if(path===SEND_PATH&&request.method==='POST')return sendBatch(request,env);
  return null;
}
