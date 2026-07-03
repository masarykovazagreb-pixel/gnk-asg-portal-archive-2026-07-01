export const VERSION='GNK_ASG_EMAIL_PING_TEST_V1_20260703';
export const PING_PATH='/api/email-ping';

const SOURCES=new Set(['mail-studio','campaign-mailer','media-center']);
const MAX_PER_HOUR=10;
const MAX_PER_ADDRESS_PER_HOUR=3;
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const safeSource=value=>SOURCES.has(clean(value).toLowerCase())?clean(value).toLowerCase():'mail-studio';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-gnk-asg-email-ping':VERSION}});
const dbOf=env=>env?.GNK_ASG_D1||null;

async function ensureSchema(env){
 const db=dbOf(env);if(!db?.prepare)throw new Error('GNK_ASG_D1 binding is not configured');
 await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS email_ping_tests(
   ping_id TEXT PRIMARY KEY,
   source_system TEXT NOT NULL,
   recipient TEXT NOT NULL,
   domain TEXT NOT NULL,
   dns_status TEXT NOT NULL,
   send_status TEXT NOT NULL,
   provider_message_id TEXT,
   error_code TEXT,
   error_message TEXT,
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL
  )`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_ping_created ON email_ping_tests(created_at DESC)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_ping_recipient ON email_ping_tests(recipient,created_at DESC)`)
 ]);
 return db;
}

async function dnsQuery(name,type){
 const url=new URL('https://cloudflare-dns.com/dns-query');url.searchParams.set('name',name);url.searchParams.set('type',type);
 const response=await fetch(url,{headers:{accept:'application/dns-json'},cf:{cacheTtl:60,cacheEverything:true}});
 if(!response.ok)throw new Error(`DNS HTTP ${response.status}`);
 return response.json();
}

async function checkMailDomain(domain){
 try{
  const mx=await dnsQuery(domain,'MX');
  if(Number(mx.Status)===3)return{ok:false,status:'NXDOMAIN',records:[]};
  const mxRecords=(mx.Answer||[]).filter(item=>Number(item.type)===15).map(item=>clean(item.data));
  if(mxRecords.length)return{ok:true,status:'MX_OK',records:mxRecords.slice(0,10)};
  const [a,aaaa]=await Promise.all([dnsQuery(domain,'A'),dnsQuery(domain,'AAAA')]);
  const fallback=[...(a.Answer||[]),...(aaaa.Answer||[])].filter(item=>[1,28].includes(Number(item.type))).map(item=>clean(item.data));
  if(fallback.length)return{ok:true,status:'ADDRESS_FALLBACK_OK',records:fallback.slice(0,10)};
  return{ok:false,status:'NO_MAIL_ROUTE',records:[]};
 }catch(error){return{ok:null,status:'DNS_CHECK_UNAVAILABLE',records:[],message:String(error?.message||error).slice(0,300)};}
}

async function enforceRateLimit(db,email){
 const [total,address]=await Promise.all([
  db.prepare(`SELECT COUNT(*) count FROM email_ping_tests WHERE strftime('%s',created_at)>=strftime('%s','now','-1 hour')`).first(),
  db.prepare(`SELECT COUNT(*) count FROM email_ping_tests WHERE LOWER(recipient)=LOWER(?) AND strftime('%s',created_at)>=strftime('%s','now','-1 hour')`).bind(email).first()
 ]);
 const totalCount=Number(total?.count||0),addressCount=Number(address?.count||0);
 if(totalCount>=MAX_PER_HOUR)return{ok:false,error:'hourly_ping_limit',limit:MAX_PER_HOUR};
 if(addressCount>=MAX_PER_ADDRESS_PER_HOUR)return{ok:false,error:'address_ping_limit',limit:MAX_PER_ADDRESS_PER_HOUR};
 return{ok:true,totalCount,addressCount};
}

function headersFor(source,pingId){
 const common={'X-GNK-ASG-Email-Ping':VERSION,'X-GNK-ASG-Email-Ping-Id':pingId};
 if(source==='campaign-mailer')return{...common,'X-GNK-ASG-Campaign-Mailer':VERSION,'X-GNK-ASG-Campaign-Contact-Id':pingId};
 if(source==='media-center')return{...common,'X-GNK-ASG-Idempotency-Key':`email-ping:${pingId}`};
 return{...common,'X-GNK-ASG-Manual-Mail':VERSION,'X-GNK-ASG-Manual-Mail-Id':pingId};
}

function messageContent(pingId){
 const subject='GNK ASG email delivery test — no action required';
 const text=`This is an automated email delivery test from GNK ASG.\n\nNo action is required.\nTest ID: ${pingId}\n\nIf this message reached your mailbox, the address accepted email delivery.`;
 const html=`<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#111827"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:28px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px"><tr><td style="padding:28px"><div style="font-size:12px;font-weight:800;letter-spacing:.12em;color:#8a6a16">GNK ASG · EMAIL PING</div><h1 style="font-size:24px;margin:10px 0 12px">Email delivery test</h1><p style="font-size:16px;line-height:1.6;margin:0 0 16px">This is an automated delivery test. No action is required.</p><p style="font-size:14px;line-height:1.6;color:#475569;margin:0">Test ID: <strong>${pingId}</strong></p></td></tr></table></td></tr></table></body></html>`;
 return{subject,text,html};
}

async function sendPing(request,env){
 let body={};try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
 const email=clean(body.email).toLowerCase(),source=safeSource(body.source);
 if(!validEmail(email))return json({ok:false,error:'invalid_email_format',stage:'format',message:'Email address format is not valid.'},400);
 if(!env.EMAIL?.send)return json({ok:false,error:'email_binding_missing'},503);
 const domain=email.split('@').pop();
 const dns=await checkMailDomain(domain);
 if(dns.ok===false)return json({ok:false,error:'mail_domain_not_configured',stage:'domain',email,domain,dns,message:'The domain has no usable email delivery route.'},422);
 const db=await ensureSchema(env).catch(()=>null);if(!db)return json({ok:false,error:'database_unavailable'},503);
 const rate=await enforceRateLimit(db,email);if(!rate.ok)return json({ok:false,...rate},429);
 const pingId=crypto.randomUUID(),stamp=now(),content=messageContent(pingId);
 await db.prepare(`INSERT INTO email_ping_tests(ping_id,source_system,recipient,domain,dns_status,send_status,created_at,updated_at) VALUES(?,?,?,?,?,'SENDING',?,?)`).bind(pingId,source,email,domain,dns.status,stamp,stamp).run();
 const payload={
  to:email,
  from:{email:'it@gnk-asg.hr',name:'GNK ASG Email Verification'},
  replyTo:'it@gnk-asg.hr',
  subject:content.subject,
  text:content.text,
  html:content.html,
  headers:headersFor(source,pingId)
 };
 try{
  const result=await env.EMAIL.send(payload),messageId=clean(result?.messageId),sentAt=now();
  await db.prepare(`UPDATE email_ping_tests SET send_status='ACCEPTED',provider_message_id=?,updated_at=? WHERE ping_id=?`).bind(messageId,sentAt,pingId).run();
  return json({ok:true,pingId,email,domain,source,format:{ok:true,status:'FORMAT_OK'},dns,send:{status:'ACCEPTED',messageId},statusUrl:`/email-status?source=${encodeURIComponent(source)}&search=${encodeURIComponent(pingId)}`,message:'Ping accepted for sending. Delivery confirmation can arrive later.'});
 }catch(error){
  const code=clean(error?.code)||'EMAIL_SEND_FAILED',message=String(error?.message||error).slice(0,500),failedAt=now();
  await db.prepare(`UPDATE email_ping_tests SET send_status='FAILED',error_code=?,error_message=?,updated_at=? WHERE ping_id=?`).bind(code,message,failedAt,pingId).run();
  return json({ok:false,pingId,email,domain,source,format:{ok:true,status:'FORMAT_OK'},dns,send:{status:'FAILED',errorCode:code,message},message:'The ping could not be accepted for sending.'},502);
 }
}

export async function handleEmailPingTest(request,env){
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
 if(path===PING_PATH&&request.method==='POST')return sendPing(request,env);
 if(path===PING_PATH&&request.method==='GET')return json({ok:true,version:VERSION,path:PING_PATH,sources:[...SOURCES],limits:{perHour:MAX_PER_HOUR,perAddressPerHour:MAX_PER_ADDRESS_PER_HOUR}});
 return null;
}

export const isEmailPingPath=path=>path===PING_PATH||path.startsWith(`${PING_PATH}/`);
