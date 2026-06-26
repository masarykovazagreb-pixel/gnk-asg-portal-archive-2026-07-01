export const VERSION='GNK_ASG_MEDIA_OUTREACH_DELIVERY_V3_20260626';
export const SEND_API='CLOUDFLARE_STRUCTURED_SEND_V1';
const API='/api/media-command-center';
const CAMPAIGN_KEY='media-command-center:campaign:v1';
const TEST_GATE_KEY='media-command-center:delivery-test:v1';
const MAX_PDF_BYTES=4*1024*1024;
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const dbOf=env=>env.GNK_ASG_D1||null;
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const bucketOf=env=>env.GNK_ASG_MEDIA_ASSETS||null;
const boolEnv=value=>/^(1|true|yes|on)$/i.test(clean(value));
const intEnv=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-gnk-asg-media-delivery':VERSION,'x-gnk-asg-email-send-api':SEND_API}});

async function sha256(bytes){
  const value=bytes instanceof ArrayBuffer?bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const digest=await crypto.subtle.digest('SHA-256',value);
  return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function escapeHeader(value){return clean(value).replace(/[\r\n]+/g,' ');}
function emailError(error){return{code:clean(error?.code)||'EMAIL_SEND_FAILED',message:String(error?.message||error||'Email send failed').slice(0,500)};}

async function ensureSchema(env){
  const db=dbOf(env);if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_delivery_queue(
      id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE NOT NULL,mail_code TEXT NOT NULL,email TEXT NOT NULL,outlet TEXT,
      subject TEXT NOT NULL,body_text TEXT NOT NULL,pdf_key TEXT,pdf_sha256 TEXT,status TEXT NOT NULL DEFAULT 'QUEUED',
      attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,queued_at TEXT NOT NULL,updated_at TEXT NOT NULL,sent_at TEXT,
      provider_message_id TEXT,last_error_code TEXT)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_delivery_queue_status ON media_delivery_queue(status,queued_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_delivery_tests(
      id TEXT PRIMARY KEY,recipient TEXT NOT NULL,subject TEXT,pdf_key TEXT,pdf_sha256 TEXT,status TEXT NOT NULL,
      detail_json TEXT,created_at TEXT NOT NULL)`)
  ]);
  const columns=(await db.prepare(`PRAGMA table_info(media_delivery_queue)`).all()).results||[];
  const names=new Set(columns.map(row=>clean(row.name)));
  if(!names.has('provider_message_id'))await db.prepare(`ALTER TABLE media_delivery_queue ADD COLUMN provider_message_id TEXT`).run();
  if(!names.has('last_error_code'))await db.prepare(`ALTER TABLE media_delivery_queue ADD COLUMN last_error_code TEXT`).run();
  return db;
}
async function readKv(env,key,fallback={}){const kv=kvOf(env);if(!kv)return fallback;try{const raw=await kv.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
async function writeKv(env,key,value){const kv=kvOf(env);if(!kv)throw new Error('KV binding is not configured');await kv.put(key,JSON.stringify(value,null,2));return value;}
async function campaign(env){return{titleHr:'Poziv redakciji za sudjelovanje i medijsko praćenje programa u New Yorku',titleEn:'Invitation to participate in and cover the New York programme',deadline:'20 July 2026 at 23:59 CEST',applicationEmail:clean(env.MEDIA_OUTREACH_FROM)||'media@gnk-asg.hr',...(await readKv(env,CAMPAIGN_KEY,{}))};}

function compose(row,cfg){
  const hr=/hrvat|croat|serb|srps/i.test(clean(row.language));
  const title=hr?cfg.titleHr:cfg.titleEn;
  const salutation=clean(row.salutation)||(hr?'Poštovani,':'Dear Editor,');
  const attention=clean(row.attention_line)||(hr?`Na ruke: ${clean(row.recipient_name)||clean(row.recipient_title)||'glavnom uredniku'}, ${row.outlet}`:`For the attention of ${clean(row.recipient_name)||clean(row.recipient_title)||'the Editor-in-Chief'}, ${row.outlet}`);
  const intro=hr?
    `Pozivamo redakciju ${row.outlet} da najkasnije do ${cfg.deadline} na ${cfg.applicationEmail} dostavi prijavu svojeg predstavnika za sudjelovanje i medijsko praćenje programa u New Yorku.`:
    `We invite the newsroom of ${row.outlet} to submit its nominated representative no later than ${cfg.deadline}, by email to ${cfg.applicationEmail}, for participation in and media coverage of the programme in New York.`;
  const costs=hr?
    'Troškove putovanja, smještaja i ostale razumne, dokumentirane i unaprijed pisano odobrene troškove neposredno povezane sa sudjelovanjem i izvještavanjem snosi organizator. Smještaj u New Yorku već je rezerviran i plaćen.':
    'Travel, accommodation and other reasonable, documented and pre-approved costs directly related to attendance and reporting are covered by the organizer. Accommodation in New York has already been reserved and paid.';
  const application=hr?
    `Detaljni uvjeti i predložak prijave nalaze se u priloženom PDF-u. U predmetu i tekstu prijave obvezno navedite šifru ${row.mail_code}. U početnoj fazi nemojte običnim e-mailom slati presliku putovnice.`:
    `Detailed requirements and the application template are provided in the attached PDF. Please quote reference code ${row.mail_code} in the subject and body. Do not send a passport copy by ordinary email at the initial stage.`;
  const decision=hr?'Zaprimanje potpune prijave ne znači automatsko odobrenje. Konačnu odluku donosi ovlaštena osoba nakon ljudske provjere.':'Receipt of a complete application does not constitute automatic approval. The final decision is made by an authorized person after human verification.';
  const sign=hr?'S poštovanjem,':'Kind regards,';
  const text=[salutation,'',attention,'',intro,'',costs,'',application,'',decision,'',sign,'GNK ASG Media Relations',cfg.applicationEmail].join('\n');
  return{subject:`[${row.mail_code}] ${title} - ${row.outlet}`,text};
}

async function pdfState(env){
  const cfg=await campaign(env),key=clean(cfg.pdfR2Key||env.MEDIA_OUTREACH_PDF_KEY),bucket=bucketOf(env);
  if(!key)return{ok:false,error:'campaign_pdf_missing'};
  if(!bucket?.get)return{ok:false,error:'r2_binding_missing',key};
  const object=await bucket.get(key);
  if(!object)return{ok:false,error:'campaign_pdf_not_found',key};
  const size=Number(object.size||0);
  const filename=clean(object.customMetadata?.filename||cfg.pdfFilename||env.MEDIA_OUTREACH_PDF_FILENAME)||'GNK-ASG-media-information.pdf';
  if(size>MAX_PDF_BYTES)return{ok:false,error:'campaign_pdf_too_large',key,sizeBytes:size,maxBytes:MAX_PDF_BYTES};
  const bytes=new Uint8Array(await object.arrayBuffer());
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return{ok:false,error:'campaign_pdf_invalid_signature',key,sizeBytes:size};
  const actualSha=await sha256(bytes);
  const configuredSha=clean(object.customMetadata?.sha256||cfg.pdfSha256||env.MEDIA_OUTREACH_PDF_SHA256);
  if(configuredSha&&configuredSha!==actualSha)return{ok:false,error:'campaign_pdf_sha256_mismatch',key,sizeBytes:size,configuredSha256:configuredSha,actualSha256:actualSha};
  return{ok:true,key,sha256:actualSha,sizeBytes:size,filename,contentType:object.httpMetadata?.contentType||'application/pdf',uploadedAt:object.customMetadata?.uploadedAt||cfg.pdfUploadedAt||''};
}
async function uploadPdf(request,env){
  const bytes=new Uint8Array(await request.arrayBuffer());
  if(bytes.length<100||bytes.length>MAX_PDF_BYTES)return json({ok:false,error:'invalid_pdf_size',sizeBytes:bytes.length,maxBytes:MAX_PDF_BYTES},400);
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({ok:false,error:'invalid_pdf_signature'},400);
  const bucket=bucketOf(env);if(!bucket?.put)return json({ok:false,error:'r2_binding_missing'},503);
  const hash=await sha256(bytes),filename=escapeHeader(request.headers.get('x-file-name')||'GNK-ASG-media-information.pdf');
  const key=`media-outreach/campaigns/new-york-2026/${hash}.pdf`,uploadedAt=now();
  await bucket.put(key,bytes,{httpMetadata:{contentType:'application/pdf'},customMetadata:{sha256:hash,filename,uploadedAt,version:VERSION}});
  const cfg=await campaign(env);
  const next=await writeKv(env,CAMPAIGN_KEY,{...cfg,pdfR2Key:key,pdfSha256:hash,pdfFilename:filename,pdfSizeBytes:bytes.length,pdfUploadedAt:uploadedAt,updatedAt:uploadedAt});
  return json({ok:true,pdf:{key,sha256:hash,filename,sizeBytes:bytes.length,uploadedAt},campaign:{pdfR2Key:next.pdfR2Key,pdfSha256:next.pdfSha256}});
}

function allowlist(env){return new Set(clean(env.MEDIA_OUTREACH_TEST_RECIPIENTS).split(/[;,\s]+/).map(v=>v.toLowerCase()).filter(validEmail));}
async function send(env,to,subject,text,pdf){
  if(!env.EMAIL?.send)throw Object.assign(new Error('EMAIL binding is not configured'),{code:'EMAIL_BINDING_MISSING'});
  const bucket=bucketOf(env),object=await bucket?.get(pdf.key);
  if(!object)throw Object.assign(new Error('Campaign PDF not found in R2'),{code:'CAMPAIGN_PDF_NOT_FOUND'});
  const bytes=new Uint8Array(await object.arrayBuffer());
  if(bytes.length>MAX_PDF_BYTES)throw Object.assign(new Error('Campaign PDF exceeds safe email attachment limit'),{code:'CAMPAIGN_PDF_TOO_LARGE'});
  const actualSha=await sha256(bytes);
  if(actualSha!==pdf.sha256)throw Object.assign(new Error('Campaign PDF changed after verification'),{code:'CAMPAIGN_PDF_SHA256_CHANGED'});
  const from=clean(env.MEDIA_OUTREACH_FROM)||'media@gnk-asg.hr';
  const result=await env.EMAIL.send({
    to,
    from:{email:from,name:'GNK ASG Media Relations'},
    replyTo:from,
    subject:escapeHeader(subject),
    text,
    attachments:[{content:bytes,filename:escapeHeader(pdf.filename),type:'application/pdf',disposition:'attachment'}],
    headers:{'X-GNK-PDF-SHA256':pdf.sha256,'X-GNK-Delivery-Version':VERSION}
  });
  return{messageId:clean(result?.messageId),sendApi:SEND_API};
}

async function rate(env){
  const db=await ensureSchema(env),hourLimit=intEnv(env.MEDIA_OUTREACH_MAX_PER_HOUR,10),dayLimit=intEnv(env.MEDIA_OUTREACH_MAX_PER_DAY,50);
  const hour=Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_delivery_queue WHERE status='SENT' AND sent_at>=datetime('now','-1 hour')`).first())?.count||0);
  const day=Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_delivery_queue WHERE status='SENT' AND sent_at>=datetime('now','-1 day')`).first())?.count||0);
  return{ok:hour<hourLimit&&day<dayLimit,hour:{used:hour,limit:hourLimit},day:{used:day,limit:dayLimit}};
}
async function deliveryPlan(env){
  const db=await ensureSchema(env),pdf=await pdfState(env),testGate=await readKv(env,TEST_GATE_KEY,null),cfg=await campaign(env);
  const rows=(await db.prepare(`SELECT c.*,ctrl.operational_status,ctrl.blocked_reason,s.email AS suppressed_email
    FROM media_outreach_contacts c
    LEFT JOIN media_outreach_contact_controls ctrl ON ctrl.mail_code=c.mail_code
    LEFT JOIN media_suppressions s ON LOWER(s.email)=LOWER(c.email)
    ORDER BY CASE c.priority WHEN 'A' THEN 0 WHEN 'B' THEN 1 ELSE 2 END,c.country,c.outlet`).all()).results||[];
  const items=rows.map(row=>{
    const reasons=[];
    if(!validEmail(row.email))reasons.push('email_missing_or_invalid');
    if(!row.automation_allowed)reasons.push('automation_not_allowed');
    if(!row.approved)reasons.push('not_approved');
    if(row.suppressed_email)reasons.push('suppressed');
    if(clean(row.operational_status)!=='READY')reasons.push(`operational_${clean(row.operational_status)||'UNASSESSED'}`);
    return{mailCode:row.mail_code,outlet:row.outlet,email:row.email,priority:row.priority,country:row.country,ready:reasons.length===0,reasons};
  });
  const gateOk=Boolean(testGate?.passed&&pdf.ok&&testGate.pdfSha256===pdf.sha256);
  return{ok:true,version:VERSION,sendApi:SEND_API,live:boolEnv(env.MEDIA_OUTREACH_LIVE),testLive:boolEnv(env.MEDIA_OUTREACH_TEST_LIVE),pdf,testGate:{...testGate,valid:gateOk},rate:await rate(env),campaign:{deadline:cfg.deadline,applicationEmail:cfg.applicationEmail},summary:{total:items.length,ready:items.filter(i=>i.ready).length,blocked:items.filter(i=>!i.ready).length},items};
}

async function testEmail(request,env){
  let body={};try{body=await request.json();}catch{}
  const recipient=clean(body.recipient).toLowerCase(),allowed=allowlist(env),pdf=await pdfState(env),db=await ensureSchema(env);
  if(body.confirm!=='SEND_TEST_EMAIL')return json({ok:false,error:'confirmation_required',required:'SEND_TEST_EMAIL'},409);
  if(!boolEnv(env.MEDIA_OUTREACH_TEST_LIVE))return json({ok:false,error:'test_sending_locked'},423);
  if(!validEmail(recipient)||!allowed.has(recipient))return json({ok:false,error:'recipient_not_allowlisted',configuredCount:allowed.size},403);
  if(!pdf.ok)return json({ok:false,error:pdf.error,pdf},409);
  const cfg=await campaign(env),subject=`[GNK-ASG-TEST] ${cfg.titleEn||'Media invitation'} - PDF ${pdf.sha256.slice(0,12)}`;
  const text=['TEST DELIVERY - NOT FOR EXTERNAL DISTRIBUTION','',`Recipient: ${recipient}`,`PDF SHA-256: ${pdf.sha256}`,'',cfg.bodyEn||'GNK ASG media invitation delivery test.','',`Application mailbox: ${cfg.applicationEmail}`].join('\n');
  const id=crypto.randomUUID();
  try{
    const delivery=await send(env,recipient,subject,text,pdf);
    const gate={passed:true,recipient,pdfSha256:pdf.sha256,pdfKey:pdf.key,messageId:delivery.messageId,passedAt:now(),version:VERSION,sendApi:SEND_API};
    await writeKv(env,TEST_GATE_KEY,gate);
    await db.prepare(`INSERT INTO media_delivery_tests(id,recipient,subject,pdf_key,pdf_sha256,status,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(id,recipient,subject,pdf.key,pdf.sha256,'SENT',JSON.stringify({version:VERSION,...delivery}),now()).run();
    return json({ok:true,live:true,testGate:gate,delivery});
  }catch(error){
    const detail=emailError(error);
    await db.prepare(`INSERT INTO media_delivery_tests(id,recipient,subject,pdf_key,pdf_sha256,status,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(id,recipient,subject,pdf.key,pdf.sha256,'FAILED',JSON.stringify(detail),now()).run();
    return json({ok:false,error:'test_send_failed',...detail},502);
  }
}

async function queueApproved(request,env){
  let body={};try{body=await request.json();}catch{}
  if(body.confirm!=='QUEUE_APPROVED_MEDIA')return json({ok:false,error:'confirmation_required',required:'QUEUE_APPROVED_MEDIA'},409);
  const plan=await deliveryPlan(env),pdf=plan.pdf;
  if(!plan.testGate.valid)return json({ok:false,error:'valid_test_gate_required',testGate:plan.testGate},409);
  const db=await ensureSchema(env),cfg=await campaign(env),rows=(await db.prepare(`SELECT c.* FROM media_outreach_contacts c LEFT JOIN media_suppressions s ON LOWER(s.email)=LOWER(c.email) LEFT JOIN media_outreach_contact_controls ctrl ON ctrl.mail_code=c.mail_code WHERE c.approved=1 AND c.automation_allowed=1 AND c.email<>'' AND s.email IS NULL AND ctrl.operational_status='READY' ORDER BY CASE c.priority WHEN 'A' THEN 0 WHEN 'B' THEN 1 ELSE 2 END,c.country,c.outlet`).all()).results||[];
  const allowedCodes=new Set(Array.isArray(body.mailCodes)?body.mailCodes.map(clean).filter(Boolean):[]);
  const selected=allowedCodes.size?rows.filter(row=>allowedCodes.has(row.mail_code)):rows;
  let queued=0,existing=0;
  for(const row of selected){
    const message=compose(row,cfg),idempotency=await sha256(new TextEncoder().encode(`${row.mail_code}|${pdf.sha256}|${cfg.updatedAt||cfg.deadline}`));
    const result=await db.prepare(`INSERT OR IGNORE INTO media_delivery_queue(id,idempotency_key,mail_code,email,outlet,subject,body_text,pdf_key,pdf_sha256,status,attempts,queued_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'QUEUED',0,?,?)`).bind(crypto.randomUUID(),idempotency,row.mail_code,row.email,row.outlet,message.subject,message.text,pdf.key,pdf.sha256,now(),now()).run();
    if(Number(result.meta?.changes||0)>0)queued++;else existing++;
  }
  return json({ok:true,queued,existing,selected:selected.length,live:plan.live,productionSending:plan.live?'ENABLED_BY_ENV':'LOCKED'});
}

export async function processDeliveryQueue(env){
  if(!boolEnv(env.MEDIA_OUTREACH_LIVE))return{ok:true,skipped:'production_sending_locked'};
  const plan=await deliveryPlan(env);if(!plan.testGate.valid)return{ok:false,skipped:'valid_test_gate_required'};
  if(!plan.rate.ok)return{ok:true,skipped:'rate_limit',rate:plan.rate};
  const db=await ensureSchema(env),row=await db.prepare(`SELECT * FROM media_delivery_queue WHERE status IN ('QUEUED','RETRY') AND attempts<3 ORDER BY queued_at LIMIT 1`).first();
  if(!row)return{ok:true,skipped:'queue_empty'};
  const pdf=await pdfState(env);if(!pdf.ok||pdf.sha256!==row.pdf_sha256)return{ok:false,skipped:'pdf_mismatch'};
  await db.prepare(`UPDATE media_delivery_queue SET status='SENDING',attempts=attempts+1,updated_at=? WHERE id=?`).bind(now(),row.id).run();
  try{
    const delivery=await send(env,row.email,row.subject,row.body_text,pdf);
    await db.prepare(`UPDATE media_delivery_queue SET status='SENT',sent_at=?,updated_at=?,last_error=NULL,last_error_code=NULL,provider_message_id=? WHERE id=?`).bind(now(),now(),delivery.messageId,row.id).run();
    await db.prepare(`UPDATE media_outreach_contacts SET sent_status='POSLANO',updated_at=? WHERE mail_code=?`).bind(now(),row.mail_code).run();
    return{ok:true,sent:{mailCode:row.mail_code,outlet:row.outlet,email:row.email,messageId:delivery.messageId},sendApi:SEND_API,rate:await rate(env)};
  }catch(error){
    const detail=emailError(error);
    await db.prepare(`UPDATE media_delivery_queue SET status=CASE WHEN attempts>=3 THEN 'FAILED' ELSE 'RETRY' END,last_error=?,last_error_code=?,updated_at=? WHERE id=?`).bind(detail.message,detail.code,now(),row.id).run();
    return{ok:false,error:detail.message,errorCode:detail.code,mailCode:row.mail_code};
  }
}

async function queueStatus(env){
  const db=await ensureSchema(env),rows=(await db.prepare(`SELECT status,COUNT(*) AS count FROM media_delivery_queue GROUP BY status`).all()).results||[];
  const recent=(await db.prepare(`SELECT mail_code,outlet,email,status,provider_message_id,last_error_code,updated_at,sent_at FROM media_delivery_queue ORDER BY updated_at DESC LIMIT 20`).all()).results||[];
  return{ok:true,version:VERSION,sendApi:SEND_API,pdf:await pdfState(env),testGate:await readKv(env,TEST_GATE_KEY,null),live:boolEnv(env.MEDIA_OUTREACH_LIVE),testLive:boolEnv(env.MEDIA_OUTREACH_TEST_LIVE),rate:await rate(env),queue:Object.fromEntries(rows.map(row=>[row.status,Number(row.count)])),recent};
}

export async function handleMediaDelivery(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===`${API}/campaign-pdf`&&request.method==='GET')return json({ok:true,pdf:await pdfState(env)});
  if(path===`${API}/campaign-pdf`&&request.method==='POST')return uploadPdf(request,env);
  if(path===`${API}/delivery-plan`&&request.method==='GET')return json(await deliveryPlan(env));
  if(path===`${API}/delivery-status`&&request.method==='GET')return json(await queueStatus(env));
  if(path===`${API}/test-email`&&request.method==='POST')return testEmail(request,env);
  if(path===`${API}/queue-approved`&&request.method==='POST')return queueApproved(request,env);
  if(path===`${API}/dispatch-queue`&&request.method==='POST'){
    let body={};try{body=await request.json();}catch{}
    if(body.confirm!=='DISPATCH_ONE_QUEUED_EMAIL')return json({ok:false,error:'confirmation_required',required:'DISPATCH_ONE_QUEUED_EMAIL'},409);
    return json(await processDeliveryQueue(env));
  }
  return null;
}
