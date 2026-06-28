import {prepareAccessCode,activateAccessCode,failAccessCode,VERSION as CODE_STORE_VERSION} from './media-access-code-store-v1.js';
import {mediaAccessDeliveryText,VERSION as ACCESS_TEXT_VERSION} from './media-access-delivery-text-v1.js';

export const VERSION='GNK_ASG_MEDIA_OUTREACH_ACCESS_DISPATCH_V1_1_ATOMIC_CLAIM_20260628';
const TEST_GATE_KEY='media-command-center:delivery-test:v1';
const CAMPAIGN_KEY='media-command-center:campaign:v1';
const MAX_PDF_BYTES=4*1024*1024;
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const boolEnv=value=>/^(1|true|yes|on)$/i.test(clean(value));
const intEnv=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const dbOf=env=>env.GNK_ASG_D1||null;
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const bucketOf=env=>env.GNK_ASG_MEDIA_ASSETS||null;

async function sha256(bytes){
  const value=bytes instanceof ArrayBuffer?bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const digest=await crypto.subtle.digest('SHA-256',value);
  return[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function emailError(error){return{code:clean(error?.code)||'EMAIL_SEND_FAILED',message:String(error?.message||error||'Email send failed').slice(0,500)}}
async function readKv(env,key,fallback=null){const kv=kvOf(env);if(!kv)return fallback;try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}

async function ensureQueueSchema(env){
  const db=dbOf(env);if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_delivery_queue(id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE NOT NULL,mail_code TEXT NOT NULL,email TEXT NOT NULL,outlet TEXT,subject TEXT NOT NULL,body_text TEXT NOT NULL,pdf_key TEXT,pdf_sha256 TEXT,status TEXT NOT NULL DEFAULT 'QUEUED',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,queued_at TEXT NOT NULL,updated_at TEXT NOT NULL,sent_at TEXT,provider_message_id TEXT,last_error_code TEXT)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_delivery_queue_status ON media_delivery_queue(status,queued_at)`)
  ]);
  const columns=(await db.prepare(`PRAGMA table_info(media_delivery_queue)`).all()).results||[];
  const names=new Set(columns.map(row=>clean(row.name)));
  if(!names.has('provider_message_id'))await db.prepare(`ALTER TABLE media_delivery_queue ADD COLUMN provider_message_id TEXT`).run();
  if(!names.has('last_error_code'))await db.prepare(`ALTER TABLE media_delivery_queue ADD COLUMN last_error_code TEXT`).run();
  return db;
}

async function pdfState(env){
  const campaign=await readKv(env,CAMPAIGN_KEY,{}),key=clean(campaign?.pdfR2Key||env.MEDIA_OUTREACH_PDF_KEY),bucket=bucketOf(env);
  if(!key)return{ok:false,error:'campaign_pdf_missing'};
  if(!bucket?.get)return{ok:false,error:'r2_binding_missing',key};
  const object=await bucket.get(key);
  if(!object)return{ok:false,error:'campaign_pdf_not_found',key};
  const size=Number(object.size||0);
  if(size>MAX_PDF_BYTES)return{ok:false,error:'campaign_pdf_too_large',key,sizeBytes:size};
  const bytes=new Uint8Array(await object.arrayBuffer());
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return{ok:false,error:'campaign_pdf_invalid_signature',key,sizeBytes:size};
  const actualSha=await sha256(bytes),configuredSha=clean(object.customMetadata?.sha256||campaign?.pdfSha256||env.MEDIA_OUTREACH_PDF_SHA256);
  if(configuredSha&&configuredSha!==actualSha)return{ok:false,error:'campaign_pdf_sha256_mismatch',key,actualSha256:actualSha,configuredSha256:configuredSha};
  return{ok:true,key,sha256:actualSha,sizeBytes:size,filename:clean(object.customMetadata?.filename||campaign?.pdfFilename||env.MEDIA_OUTREACH_PDF_FILENAME)||'GNK-ASG-media-information.pdf'};
}

async function rate(env){
  const db=await ensureQueueSchema(env),hourLimit=intEnv(env.MEDIA_OUTREACH_MAX_PER_HOUR,10),dayLimit=intEnv(env.MEDIA_OUTREACH_MAX_PER_DAY,50);
  const hour=Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_delivery_queue WHERE status='SENT' AND sent_at>=datetime('now','-1 hour')`).first())?.count||0);
  const day=Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_delivery_queue WHERE status='SENT' AND sent_at>=datetime('now','-1 day')`).first())?.count||0);
  return{ok:hour<hourLimit&&day<dayLimit,hour:{used:hour,limit:hourLimit},day:{used:day,limit:dayLimit}};
}

async function send(env,row,text,pdf){
  if(!env.EMAIL?.send)throw Object.assign(new Error('EMAIL binding is not configured'),{code:'EMAIL_BINDING_MISSING'});
  const object=await bucketOf(env)?.get(pdf.key);
  if(!object)throw Object.assign(new Error('Campaign PDF not found in R2'),{code:'CAMPAIGN_PDF_NOT_FOUND'});
  const bytes=new Uint8Array(await object.arrayBuffer());
  if(bytes.length>MAX_PDF_BYTES)throw Object.assign(new Error('Campaign PDF exceeds attachment limit'),{code:'CAMPAIGN_PDF_TOO_LARGE'});
  if(await sha256(bytes)!==pdf.sha256)throw Object.assign(new Error('Campaign PDF changed after verification'),{code:'CAMPAIGN_PDF_SHA256_CHANGED'});
  const from=clean(env.MEDIA_OUTREACH_FROM)||'media@gnk-asg.hr';
  const result=await env.EMAIL.send({
    to:row.email,
    from:{email:from,name:'GNK ASG Media Relations'},
    replyTo:from,
    subject:clean(row.subject).replace(/[\r\n]+/g,' '),
    text,
    attachments:[{content:bytes,filename:pdf.filename,type:'application/pdf',disposition:'attachment'}],
    headers:{'X-GNK-PDF-SHA256':pdf.sha256,'X-GNK-Access-Dispatch':VERSION}
  });
  return{messageId:clean(result?.messageId)};
}

export async function processAccessDeliveryQueue(env){
  if(!boolEnv(env.MEDIA_OUTREACH_LIVE))return{ok:true,skipped:'production_sending_locked',version:VERSION};
  const pdf=await pdfState(env),testGate=await readKv(env,TEST_GATE_KEY,null);
  if(!pdf.ok)return{ok:false,skipped:pdf.error,pdf};
  if(!testGate?.passed||testGate.pdfSha256!==pdf.sha256)return{ok:false,skipped:'valid_test_gate_required'};
  const rateState=await rate(env);if(!rateState.ok)return{ok:true,skipped:'rate_limit',rate:rateState};
  const db=await ensureQueueSchema(env),row=await db.prepare(`SELECT * FROM media_delivery_queue WHERE status IN ('QUEUED','RETRY') AND attempts<3 ORDER BY queued_at LIMIT 1`).first();
  if(!row)return{ok:true,skipped:'queue_empty',version:VERSION};
  if(row.pdf_sha256!==pdf.sha256)return{ok:false,skipped:'pdf_mismatch',mailCode:row.mail_code};
  const claim=await db.prepare(`UPDATE media_delivery_queue SET status='SENDING',attempts=attempts+1,updated_at=? WHERE id=? AND status IN ('QUEUED','RETRY') AND attempts<3`).bind(now(),row.id).run();
  if(Number(claim.meta?.changes||0)!==1)return{ok:true,skipped:'queue_claim_lost',mailCode:row.mail_code,version:VERSION};
  let prepared=null,delivery=null;
  try{
    prepared=await prepareAccessCode(env,{mailCode:row.mail_code,email:row.email,queueId:row.id,pdfSha256:row.pdf_sha256});
    const text=`${row.body_text}\n\n${mediaAccessDeliveryText(prepared)}`;
    delivery=await send(env,row,text,pdf);
    try{
      await activateAccessCode(env,prepared,{queueId:row.id,messageId:delivery.messageId});
    }catch(error){
      await failAccessCode(env,prepared,error,{queueId:row.id,messageId:delivery.messageId}).catch(()=>{});
      const detail=emailError(error);
      await db.prepare(`UPDATE media_delivery_queue SET status='SENT_ACCESS_FAILED',sent_at=?,updated_at=?,last_error=?,last_error_code=?,provider_message_id=? WHERE id=?`).bind(now(),now(),detail.message,detail.code,delivery.messageId,row.id).run();
      return{ok:false,delivered:true,error:'access_activation_failed',errorCode:detail.code,mailCode:row.mail_code,messageId:delivery.messageId,version:VERSION};
    }
    await db.prepare(`UPDATE media_delivery_queue SET status='SENT',sent_at=?,updated_at=?,last_error=NULL,last_error_code=NULL,provider_message_id=? WHERE id=?`).bind(now(),now(),delivery.messageId,row.id).run();
    await db.prepare(`UPDATE media_outreach_contacts SET sent_status='POSLANO',updated_at=? WHERE mail_code=?`).bind(now(),row.mail_code).run();
    return{ok:true,sent:{mailCode:row.mail_code,outlet:row.outlet,email:row.email,messageId:delivery.messageId,accessExpiresAt:prepared.expiresAt},rate:await rate(env),version:VERSION,codeStore:CODE_STORE_VERSION,accessText:ACCESS_TEXT_VERSION};
  }catch(error){
    if(prepared)await failAccessCode(env,prepared,error,{queueId:row.id,messageId:delivery?.messageId||''}).catch(()=>{});
    const detail=emailError(error),attempts=Number(row.attempts||0)+1,terminal=detail.code.startsWith('MEDIA_ACCESS_');
    const next=terminal?'BLOCKED':attempts>=3?'FAILED':'RETRY';
    await db.prepare(`UPDATE media_delivery_queue SET status=?,last_error=?,last_error_code=?,updated_at=? WHERE id=?`).bind(next,detail.message,detail.code,now(),row.id).run();
    return{ok:false,error:detail.message,errorCode:detail.code,mailCode:row.mail_code,status:next,version:VERSION};
  }
}
