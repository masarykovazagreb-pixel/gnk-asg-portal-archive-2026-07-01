import {enforceRequiredSignature,MANDATORY_BCC,VERSION as SIGNATURE_VERSION} from './email-signature-contract-v1.js';

export const VERSION='GNK_ASG_MEDIA_COMMAND_BRIDGE_V1_20260628';
export const PROCESS_PATH='/api/media-command-bridge/process';
export const STATUS_PATH='/api/media-command-bridge/status';

const MAX_COMMAND_AGE_MS=15*60*1000;
const MAX_ATTACHMENT_BYTES=3200000;
const PENDING_PREFIX='media-command:pending:';
const RESULT_PREFIX='media-command:result:';

const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const bucketOf=env=>env.GNK_ASG_MEDIA_ASSETS||null;
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
  'x-gnk-asg-media-command-bridge':VERSION,
  'x-gnk-asg-signature-contract':SIGNATURE_VERSION
}});

function secureEqual(a,b){
  const left=new TextEncoder().encode(String(a||'')),right=new TextEncoder().encode(String(b||''));
  let mismatch=left.length^right.length;
  const length=Math.max(left.length,right.length);
  for(let index=0;index<length;index++)mismatch|=(left[index%Math.max(left.length,1)]||0)^(right[index%Math.max(right.length,1)]||0);
  return mismatch===0&&left.length>=32;
}

function allowlist(env){
  const raw=clean(env.MEDIA_OUTREACH_TEST_RECIPIENTS||env.MAIL_PROFILE_TEST_RECIPIENTS);
  return new Set(raw.split(/[;,\s]+/).map(item=>item.toLowerCase()).filter(validEmail));
}

async function ensureSchema(env){
  const db=env.GNK_ASG_D1;
  if(!db?.prepare)return null;
  await db.prepare(`CREATE TABLE IF NOT EXISTS media_command_bridge_audit(
    command_id TEXT PRIMARY KEY,action TEXT NOT NULL,recipient TEXT,status TEXT NOT NULL,
    provider_message_id TEXT,error_code TEXT,error_message TEXT,attachment_bytes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,completed_at TEXT
  )`).run();
  return db;
}

async function audit(env,entry){
  try{
    const db=await ensureSchema(env);if(!db)return{logged:false,error:'D1_BINDING_MISSING'};
    await db.prepare(`INSERT OR REPLACE INTO media_command_bridge_audit(
      command_id,action,recipient,status,provider_message_id,error_code,error_message,attachment_bytes,created_at,completed_at
    ) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(
      clean(entry.commandId),clean(entry.action),clean(entry.recipient),clean(entry.status),clean(entry.messageId),
      clean(entry.errorCode),clean(entry.errorMessage),Number(entry.attachmentBytes||0),clean(entry.createdAt)||now(),clean(entry.completedAt)
    ).run();
    return{logged:true};
  }catch(error){return{logged:false,error:String(error?.message||error).slice(0,300)};}
}

async function attachment(env,key,filename){
  const bucket=bucketOf(env);
  if(!bucket?.get)throw Object.assign(new Error('R2 binding is not configured'),{code:'R2_BINDING_MISSING'});
  const object=await bucket.get(key);
  if(!object)throw Object.assign(new Error(`PDF not found in R2: ${key}`),{code:'PDF_NOT_FOUND'});
  const bytes=new Uint8Array(await object.arrayBuffer());
  if(bytes.length>MAX_ATTACHMENT_BYTES)throw Object.assign(new Error('PDF attachment exceeds 3.2 MB'),{code:'PDF_TOO_LARGE'});
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Object.assign(new Error('R2 object is not a valid PDF'),{code:'INVALID_PDF'});
  return{content:bytes,filename:clean(filename)||'GNK_DINAMO_THE_CODE_MEDIJSKI_MEMORANDUM.pdf',type:'application/pdf',disposition:'attachment'};
}

async function sendTest(env,command){
  const recipient=clean(command.recipient).toLowerCase();
  if(!validEmail(recipient))throw Object.assign(new Error('Invalid test recipient'),{code:'INVALID_RECIPIENT'});
  if(!allowlist(env).has(recipient))throw Object.assign(new Error('Recipient is not allowlisted for Media Center tests'),{code:'RECIPIENT_NOT_ALLOWLISTED'});
  if(clean(command.confirm)!=='SEND_TEST_MEDIA')throw Object.assign(new Error('Explicit test confirmation is missing'),{code:'CONFIRMATION_REQUIRED'});
  if(!env.EMAIL?.send)throw Object.assign(new Error('Cloudflare Email binding is not configured'),{code:'EMAIL_BINDING_MISSING'});
  const pdf=await attachment(env,clean(command.pdfR2Key),clean(command.pdfFilename));
  const payload=enforceRequiredSignature({
    to:recipient,
    from:{email:'media@gnk-asg.hr',name:'Nermin Sefic · GNK ASG Media Desk'},
    replyTo:'media@gnk-asg.hr',
    subject:clean(command.subject).slice(0,240),
    text:clean(command.text),
    html:clean(command.html),
    attachments:[pdf],
    headers:{
      'X-GNK-ASG-Media-Command':VERSION,
      'X-GNK-ASG-Media-Command-Id':clean(command.commandId),
      'X-GNK-ASG-Test-Message':'true'
    }
  });
  const result=await env.EMAIL.send(payload);
  return{messageId:clean(result?.messageId),attachmentBytes:pdf.content.byteLength,mandatoryBcc:MANDATORY_BCC};
}

async function processCommand(request,env){
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  const id=clean(request.headers.get('x-gnk-media-command-id'));
  const key=clean(request.headers.get('x-gnk-media-command-key'));
  if(!id||!key)return json({ok:false,error:'missing_command_credentials'},401);
  const kv=kvOf(env);
  if(!kv?.get)return json({ok:false,error:'kv_binding_missing'},503);
  const pendingKey=`${PENDING_PREFIX}${id}`;
  let command;
  try{command=await kv.get(pendingKey,{type:'json'});}catch{return json({ok:false,error:'command_read_failed'},500);}
  if(!command)return json({ok:false,error:'command_not_found'},404);
  if(!secureEqual(key,command.executionKey))return json({ok:false,error:'invalid_command_key'},403);
  const created=Date.parse(command.createdAt||'');
  if(!Number.isFinite(created)||Date.now()-created>MAX_COMMAND_AGE_MS||created-Date.now()>60000)return json({ok:false,error:'command_expired'},410);
  if(clean(command.commandId)!==id)return json({ok:false,error:'command_id_mismatch'},409);
  const resultKey=`${RESULT_PREFIX}${id}`;
  const existing=await kv.get(resultKey,{type:'json'}).catch(()=>null);
  if(existing)return json({ok:false,error:'command_already_processed',result:existing},409);
  const base={commandId:id,action:clean(command.action).toUpperCase(),recipient:clean(command.recipient),createdAt:clean(command.createdAt)};
  await audit(env,{...base,status:'PROCESSING'});
  try{
    if(base.action!=='SEND_TEST')throw Object.assign(new Error('Only SEND_TEST is enabled on the chat bridge'),{code:'ACTION_NOT_ALLOWED'});
    const delivery=await sendTest(env,command);
    const result={ok:true,...base,status:'SENT',...delivery,completedAt:now(),version:VERSION};
    await kv.put(resultKey,JSON.stringify(result),{expirationTtl:604800});
    await kv.delete(pendingKey);
    result.audit=await audit(env,result);
    return json(result,200);
  }catch(error){
    const result={ok:false,...base,status:'FAILED',errorCode:clean(error?.code)||'COMMAND_FAILED',errorMessage:String(error?.message||error).slice(0,500),completedAt:now(),version:VERSION};
    await kv.put(resultKey,JSON.stringify(result),{expirationTtl:604800});
    await kv.delete(pendingKey);
    result.audit=await audit(env,result);
    return json(result,502);
  }
}

export async function handleMediaCommandBridge(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===PROCESS_PATH)return processCommand(request,env);
  if(path===STATUS_PATH&&request.method==='GET')return json({ok:true,version:VERSION,testRecipients:allowlist(env).size,emailBindingConfigured:Boolean(env.EMAIL?.send),r2Configured:Boolean(bucketOf(env)?.get),kvConfigured:Boolean(kvOf(env)?.get),d1Configured:Boolean(env.GNK_ASG_D1?.prepare),productionActionsEnabled:false});
  return null;
}
