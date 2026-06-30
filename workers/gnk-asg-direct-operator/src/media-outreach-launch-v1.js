import {handleMediaDelivery,processDeliveryQueue} from './media-outreach-delivery-v5.js';
import {VERSION as MESSAGE_VERSION} from './media-outreach-final-message-v1.js';

export const VERSION='GNK_ASG_MEDIA_OUTREACH_LAUNCH_V1_20260630';
const API='https://gnk-asg.hr/api/media-command-center';
const CONTRACT_KEY='media-command-center:strict-english-launch:v1';
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const boolEnv=value=>/^(1|true|yes|on)$/i.test(clean(value));
const dbOf=env=>env.GNK_ASG_D1||null;
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;

const CORRECTIONS=[
  {mailCode:'GNK-MEDIA-20260630-US-BI-RESEND',priority:'A',country:'United States',outlet:'Business Insider',title:'Editor-in-Chief / Business Desk',name:'Jamie Heller',email:'eic@businessinsider.com',note:'Corrective delivery: previous message was sent from the wrong address without the attachment.'},
  {mailCode:'GNK-MEDIA-20260630-HR-LIDER-MIODRAG-RESEND',priority:'A',country:'Croatia',outlet:'Lider — Miodrag Šajatović',title:'Editor-in-Chief',name:'Miodrag Šajatović',email:'miodrag.sajatovic@lidermedia.hr',note:'Corrective delivery: previous message was sent from the wrong address without the attachment.'},
  {mailCode:'GNK-MEDIA-20260630-US-TIME-RESEND',priority:'A',country:'United States',outlet:'TIME',title:'Editor-in-Chief',name:'Sam Jacobs',email:'sam.jacobs@time.com',note:'Corrective delivery: previous message was sent from the wrong address without the attachment.'},
  {mailCode:'GNK-MEDIA-20260630-US-WP-RESEND',priority:'A',country:'United States',outlet:'The Washington Post',title:'Editor / Newsroom',name:'Matt Murray',email:'matt.murray@washpost.com',note:'Corrective delivery: previous message was sent from the wrong address without the attachment.'}
];
const CORRECTION_CODES=CORRECTIONS.map(item=>item.mailCode);

async function ensureSchema(env){
  const db=dbOf(env);
  if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_outreach_contacts(id INTEGER PRIMARY KEY AUTOINCREMENT,mail_code TEXT UNIQUE NOT NULL,priority TEXT,country TEXT,outlet TEXT NOT NULL,recipient_title TEXT,recipient_name TEXT,role TEXT,secondary_desk TEXT,attention_line TEXT,email TEXT,channel TEXT,language TEXT,salutation TEXT,person_status TEXT,channel_status TEXT,automation_allowed INTEGER NOT NULL DEFAULT 0,approved INTEGER NOT NULL DEFAULT 0,sent_status TEXT NOT NULL DEFAULT 'NIJE POSLANO',response_status TEXT NOT NULL DEFAULT 'NEMA ODGOVORA',source TEXT,note TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_outreach_contact_controls(mail_code TEXT PRIMARY KEY,source_version TEXT,verification_checked_at TEXT,approval_expires_at TEXT,to_email TEXT,cc_email TEXT,requires_personalization INTEGER NOT NULL DEFAULT 0,blocked_reason TEXT,operational_status TEXT NOT NULL DEFAULT 'UNASSESSED',updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_delivery_queue(id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE NOT NULL,mail_code TEXT NOT NULL,email TEXT NOT NULL,outlet TEXT,subject TEXT NOT NULL,body_text TEXT NOT NULL,html_key TEXT,html_sha256 TEXT,pdf_key TEXT,pdf_sha256 TEXT,status TEXT NOT NULL DEFAULT 'QUEUED',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,queued_at TEXT NOT NULL,updated_at TEXT NOT NULL,sent_at TEXT,provider_message_id TEXT,last_error_code TEXT)`)
  ]);
  return db;
}

async function jsonOf(response){
  try{return await response.json();}
  catch{return{ok:false,error:`HTTP_${response?.status||0}`};}
}

async function readState(env){
  const kv=kvOf(env);
  if(!kv?.get)return{};
  try{const raw=await kv.get(CONTRACT_KEY);return raw?JSON.parse(raw):{};}
  catch{return{};}
}

async function writeState(env,value){
  const kv=kvOf(env);
  if(kv?.put)await kv.put(CONTRACT_KEY,JSON.stringify(value,null,2));
  return value;
}

async function scrubExcludedContacts(db){
  const excluded=`LOWER(COALESCE(outlet,''))='nacional' OR LOWER(COALESCE(outlet,'')) LIKE 'nacional —%' OR ((LOWER(COALESCE(country,'')) IN ('srbija','serbia','rs') OR LOWER(COALESCE(country,'')) LIKE '%serb%') AND LOWER(COALESCE(outlet,'')) NOT LIKE '%nedeljnik%' AND LOWER(COALESCE(outlet,'')) NOT LIKE '%tanjug%')`;
  await db.prepare(`DELETE FROM media_delivery_queue WHERE status<>'SENT' AND mail_code IN (SELECT mail_code FROM media_outreach_contacts WHERE ${excluded})`).run();
  await db.prepare(`DELETE FROM media_outreach_contact_controls WHERE mail_code IN (SELECT mail_code FROM media_outreach_contacts WHERE ${excluded})`).run();
  await db.prepare(`DELETE FROM media_outreach_contacts WHERE ${excluded}`).run();
}

async function ensureCorrections(db){
  const stamp=now();
  for(const item of CORRECTIONS){
    const attention=`For the attention of ${item.name||item.title}, ${item.outlet}`;
    const salutation=item.name?`Dear ${item.name},`:`Dear ${item.outlet} Editorial Team,`;
    await db.prepare(`INSERT INTO media_outreach_contacts(mail_code,priority,country,outlet,recipient_title,recipient_name,attention_line,email,channel,language,salutation,person_status,channel_status,automation_allowed,approved,sent_status,response_status,source,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'English',?,'CONFIRMED','VERIFIED',1,1,'NIJE POSLANO','NEMA ODGOVORA',?,?,?,?) ON CONFLICT(mail_code) DO UPDATE SET priority=excluded.priority,country=excluded.country,outlet=excluded.outlet,recipient_title=excluded.recipient_title,recipient_name=excluded.recipient_name,attention_line=excluded.attention_line,email=excluded.email,channel=excluded.channel,language='English',salutation=excluded.salutation,person_status='CONFIRMED',channel_status='VERIFIED',automation_allowed=1,approved=1,source=excluded.source,note=excluded.note,updated_at=excluded.updated_at`).bind(item.mailCode,item.priority,item.country,item.outlet,item.title,item.name,attention,item.email,item.email,salutation,VERSION,item.note,stamp,stamp).run();
    await db.prepare(`INSERT INTO media_outreach_contact_controls(mail_code,source_version,verification_checked_at,approval_expires_at,to_email,cc_email,requires_personalization,blocked_reason,operational_status,updated_at) VALUES(?,?,?,?,?,'',1,'','READY',?) ON CONFLICT(mail_code) DO UPDATE SET source_version=excluded.source_version,verification_checked_at=excluded.verification_checked_at,approval_expires_at=excluded.approval_expires_at,to_email=excluded.to_email,requires_personalization=1,blocked_reason='',operational_status='READY',updated_at=excluded.updated_at`).bind(item.mailCode,VERSION,stamp,'2026-07-20T21:59:00Z',item.email,stamp).run();
  }
}

async function plan(env){
  return jsonOf(await handleMediaDelivery(new Request(`${API}/delivery-plan`,{method:'GET'}),env));
}

async function sendControlTest(env,recipient){
  return jsonOf(await handleMediaDelivery(new Request(`${API}/test-email`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({confirm:'SEND_TEST_EMAIL',recipient})
  }),env));
}

async function queue(env,mailCodes){
  const body={confirm:'QUEUE_APPROVED_MEDIA'};
  if(Array.isArray(mailCodes))body.mailCodes=mailCodes;
  return jsonOf(await handleMediaDelivery(new Request(`${API}/queue-approved`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(body)
  }),env));
}

async function correctionState(db){
  const placeholders=CORRECTION_CODES.map(()=>'?').join(',');
  const rows=(await db.prepare(`SELECT mail_code,status,last_error_code FROM media_delivery_queue WHERE mail_code IN (${placeholders})`).bind(...CORRECTION_CODES).all()).results||[];
  const map=new Map(rows.map(row=>[clean(row.mail_code),row]));
  return CORRECTION_CODES.map(mailCode=>({mailCode,status:clean(map.get(mailCode)?.status)||'NOT_QUEUED',errorCode:clean(map.get(mailCode)?.last_error_code)}));
}

async function prioritizeCorrections(db){
  const placeholders=CORRECTION_CODES.map(()=>'?').join(',');
  await db.prepare(`UPDATE media_delivery_queue SET queued_at='2000-01-01T00:00:00.000Z' WHERE mail_code IN (${placeholders}) AND status IN ('QUEUED','RETRY')`).bind(...CORRECTION_CODES).run();
}

export async function runScheduledOutreachLaunch(env){
  if(!boolEnv(env.MEDIA_OUTREACH_SCHEDULED_LIVE))return{ok:true,skipped:'scheduled_launch_locked',version:VERSION};
  const db=await ensureSchema(env);
  await scrubExcludedContacts(db);
  await ensureCorrections(db);

  const currentPlan=await plan(env);
  if(!currentPlan.ok)return{ok:false,blocked:'delivery_plan_unavailable',detail:currentPlan,version:VERSION};
  if(!currentPlan.html?.ok)return{ok:false,blocked:'campaign_html_not_ready',detail:currentPlan.html,version:VERSION};
  if(!currentPlan.pdf?.ok)return{ok:false,blocked:'campaign_pdf_not_ready',detail:currentPlan.pdf,version:VERSION};

  const recipient=clean(env.MEDIA_OUTREACH_AUTO_TEST_RECIPIENT||'rht@gmx.com').toLowerCase();
  const state=await readState(env);
  const contractCurrent=state.messageVersion===MESSAGE_VERSION&&state.htmlSha256===currentPlan.html.sha256&&state.pdfSha256===currentPlan.pdf.sha256&&state.testPassed===true;
  let controlTest={ok:true,skipped:'current'};
  if(!contractCurrent){
    controlTest=await sendControlTest(env,recipient);
    if(!controlTest.ok)return{ok:false,blocked:'strict_english_control_test_failed',controlTest,version:VERSION,messageVersion:MESSAGE_VERSION};
    await writeState(env,{messageVersion:MESSAGE_VERSION,htmlSha256:currentPlan.html.sha256,pdfSha256:currentPlan.pdf.sha256,testPassed:true,testRecipient:recipient,testMessageId:clean(controlTest.testGate?.messageId),testedAt:now()});
  }

  const correctiveQueue=await queue(env,CORRECTION_CODES);
  if(!correctiveQueue.ok)return{ok:false,blocked:'corrective_queue_failed',correctiveQueue,version:VERSION};
  await prioritizeCorrections(db);

  const before=await correctionState(db);
  const correctionsComplete=before.every(item=>item.status==='SENT');
  let generalQueue={ok:true,skipped:'waiting_for_corrective_deliveries'};
  if(correctionsComplete)generalQueue=await queue(env);
  if(!generalQueue.ok)return{ok:false,blocked:'general_queue_failed',generalQueue,corrections:before,version:VERSION};

  const delivery=await processDeliveryQueue(env);
  const after=await correctionState(db);
  return{
    ok:true,
    version:VERSION,
    messageVersion:MESSAGE_VERSION,
    controlTest,
    correctiveQueue,
    correctionsBefore:before,
    correctionsAfter:after,
    generalQueue,
    delivery,
    nextRun:'Cloudflare cron continues with one queued email every three minutes.'
  };
}
