export const VERSION='GNK_ASG_EMAIL_STATUS_TRACKING_V2_20260714_DETAILED_RECEIPT';
export const DASHBOARD_PATH='/email-status';
export const API_PREFIX='/api/email-status';
const PIXEL_PREFIX=`${API_PREFIX}/open/`;
const RECEIPT_PREFIX=`${API_PREFIX}/receipt/`;
const CANONICAL_ORIGIN='https://gnk-asg.hr';
const GIF=Uint8Array.from([71,73,70,56,57,97,1,0,1,0,128,0,0,0,0,0,255,255,255,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59]);
const FINAL_FAILURES=new Set(['BOUNCED','REJECTED','FAILED']);
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const dbOf=env=>env?.GNK_ASG_D1||null;
const clamp=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.trunc(n))):fallback;};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const errorText=error=>String(error?.message||error||'').slice(0,1000);
const errorCode=error=>clean(error?.code)||'EMAIL_SEND_FAILED';

function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-asg-email-status':VERSION}});}
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function emailOf(value){if(!value)return'';if(Array.isArray(value))return emailOf(value[0]);if(typeof value==='object')return clean(value.email||value.address).toLowerCase();const raw=clean(value),match=raw.match(/<([^>]+)>/);return clean(match?.[1]||raw).toLowerCase();}
function headerOf(payload,name){const entries=payload?.headers;if(!entries)return'';if(entries instanceof Headers)return clean(entries.get(name));const key=Object.keys(entries).find(item=>item.toLowerCase()===name.toLowerCase());return key?clean(entries[key]):'';}
function sourceOf(payload,hint='system'){
 const headers=[
  ['X-GNK-ASG-Manual-Mail','mail-studio'],
  ['X-GNK-ASG-Campaign-Mailer','campaign-mailer'],
  ['X-GNK-ASG-Idempotency-Key','media-center'],
  ['X-GNK-ASG-Mail-Studio-Auto-Reply','auto-reply'],
  ['X-GNK-ASG-Media-Auto-Reply','auto-reply'],
  ['X-GNK-ASG-Reference','auto-reply']
 ];
 for(const [name,source] of headers)if(headerOf(payload,name))return source;
 return clean(hint)||'system';
}
function sourceIdOf(payload){return headerOf(payload,'X-GNK-ASG-Manual-Mail-Id')||headerOf(payload,'X-GNK-ASG-Campaign-Contact-Id')||headerOf(payload,'X-GNK-ASG-Idempotency-Key')||headerOf(payload,'X-GNK-ASG-Reference')||'';}
function trackingEnabled(env){return !/^(0|false|off|no)$/i.test(clean(env?.EMAIL_OPEN_TRACKING_ENABLED||'true'));}
function receiptEnabled(env){return !/^(0|false|off|no)$/i.test(clean(env?.EMAIL_RECEIPT_CONFIRMATION_ENABLED||'true'));}
function originOf(env){const value=clean(env?.EMAIL_STATUS_PUBLIC_ORIGIN||CANONICAL_ORIGIN).replace(/\/+$/,'');return /^https:\/\//i.test(value)?value:CANONICAL_ORIGIN;}
function pixelUrl(env,id){return`${originOf(env)}${PIXEL_PREFIX}${encodeURIComponent(id)}.gif`;}
function receiptUrl(env,id,token){return`${originOf(env)}${RECEIPT_PREFIX}${encodeURIComponent(id)}/${encodeURIComponent(token)}`;}
async function sha256(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value||'')));return[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function injectPixel(html,url){
 const source=String(html||'');
 if(!source||source.includes('data-gnk-email-status-pixel'))return source;
 const pixel=`<img data-gnk-email-status-pixel="${VERSION}" src="${esc(url)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;overflow:hidden" aria-hidden="true">`;
 return /<\/body>/i.test(source)?source.replace(/<\/body>/i,`${pixel}</body>`):`${source}${pixel}`;
}
function injectReceiptAction(html,url){
 const source=String(html||'');
 if(!source||source.includes('data-gnk-email-receipt-confirmation'))return source;
 const block=`<table role="presentation" data-gnk-email-receipt-confirmation="${VERSION}" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-collapse:collapse"><tr><td style="padding:16px;border:1px solid #d7aa3c;border-radius:12px;background:#07172a;color:#f8fafc;font-family:Arial,sans-serif"><p style="margin:0 0 12px;color:#f8fafc;font-size:14px;line-height:1.5">Molimo potvrdite primitak ove poruke. Potvrda je dobrovoljna i evidentira datum, vrijeme te tehničke podatke zahtjeva.</p><a href="${esc(url)}" style="display:inline-block;padding:11px 16px;border-radius:9px;background:#e6bd57;color:#07101d;text-decoration:none;font-weight:800">Potvrđujem primitak</a><p style="margin:10px 0 0;color:#dbe4ef;font-size:11px;line-height:1.45">Otvaranje poruke i potvrda primitka nisu isto. Prosljeđivanje poruke nije moguće pouzdano dokazati standardnim e-mail protokolom.</p></td></tr></table>`;
 return /<\/body>/i.test(source)?source.replace(/<\/body>/i,`${block}</body>`):`${source}${block}`;
}
function statusFromProvider(value){
 const status=clean(value).toLowerCase().replace(/[\s_-]+/g,'');
 if(status==='delivered')return'DELIVERED';
 if(status==='deliveryfailed'||status==='bounced'||status==='hardbounce'||status==='softbounce')return'BOUNCED';
 if(status==='rejected'||status==='suppressed')return'REJECTED';
 if(status==='failed')return'FAILED';
 if(status==='deferred'||status==='retry'||status==='queued')return'DEFERRED';
 if(status==='sent'||status==='accepted'||status==='submitted')return'ACCEPTED';
 return'';
}
function failureStatus(error){
 const code=errorCode(error).toUpperCase(),message=errorText(error).toLowerCase();
 if(/SUPPRESS|RECIPIENT_NOT_ALLOWED/.test(code)||/suppression|suppressed/.test(message))return'REJECTED';
 if(/DELIVERY_FAILED|VALIDATION|FIELD_MISSING|RECIPIENT/.test(code)||/recipient rejected|user unknown|mailbox.*(?:does not exist|unavailable)/.test(message))return'BOUNCED';
 return'FAILED';
}
function deviceLabel(ua){
 const u=String(ua||'').toLowerCase();
 if(!u)return'unknown';
 if(/googleimageproxy|ggpht|gmailimageproxy/.test(u))return'proxy (Gmail image proxy)';
 if(/applemailprivacyprotection|icloudprivaterelay/.test(u))return'proxy (Apple Mail Privacy Protection)';
 if(/outlook|microsoft office|msoffice/.test(u))return'Outlook / Microsoft';
 if(/ipad|tablet/.test(u))return'tablet';
 if(/iphone|android.*mobile|mobile safari/.test(u))return'mobile';
 return'desktop';
}
function requestMeta(request){
 const headers=request?.headers;
 const ip=clean(headers?.get?.('CF-Connecting-IP'))||null;
 const ua=clean(headers?.get?.('User-Agent'))||null;
 return{ip,userAgent:ua,device:deviceLabel(ua)};
}

export async function ensureEmailStatusSchema(env){
 const db=dbOf(env);if(!db?.prepare)throw new Error('GNK_ASG_D1 binding is not configured');
 await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS email_status_records(
   tracking_id TEXT PRIMARY KEY,
   source_system TEXT NOT NULL,
   source_id TEXT,
   recipient TEXT NOT NULL,
   sender TEXT,
   subject TEXT,
   provider_message_id TEXT,
   current_status TEXT NOT NULL DEFAULT 'SUBMITTING',
   provider_status TEXT,
   error_cause TEXT,
   error_detail TEXT,
   accepted_at TEXT,
   delivered_at TEXT,
   failed_at TEXT,
   first_opened_at TEXT,
   last_opened_at TEXT,
   open_count INTEGER NOT NULL DEFAULT 0,
   last_open_ip TEXT,
   last_open_user_agent TEXT,
   last_open_device TEXT,
   receipt_token_hash TEXT,
   receipt_confirmed_at TEXT,
   receipt_confirmation_count INTEGER NOT NULL DEFAULT 0,
   receipt_confirm_ip TEXT,
   receipt_confirm_user_agent TEXT,
   receipt_confirm_device TEXT,
   last_event_at TEXT,
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL
  )`),
  db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_email_status_provider_message ON email_status_records(provider_message_id) WHERE provider_message_id IS NOT NULL AND provider_message_id<>''`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_status_source ON email_status_records(source_system,source_id)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_status_recipient ON email_status_records(recipient,created_at DESC)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_status_current ON email_status_records(current_status,updated_at DESC)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS email_status_events(
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   tracking_id TEXT NOT NULL,
   event_key TEXT,
   event_type TEXT NOT NULL,
   event_at TEXT NOT NULL,
   status TEXT,
   ip TEXT,
   user_agent TEXT,
   device TEXT,
   provider_status TEXT,
   detail TEXT
  )`),
  db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_email_status_event_key ON email_status_events(event_key) WHERE event_key IS NOT NULL AND event_key<>''`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_status_event_tracking ON email_status_events(tracking_id,event_at DESC)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS email_status_sync_state(id INTEGER PRIMARY KEY CHECK(id=1),last_started_at TEXT,last_completed_at TEXT,last_error TEXT,last_event_count INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)`),
  db.prepare(`INSERT OR IGNORE INTO email_status_sync_state(id,last_event_count,updated_at) VALUES(1,0,datetime('now'))`)
 ]);
 for(const col of [
  'last_open_ip TEXT','last_open_user_agent TEXT','last_open_device TEXT',
  'receipt_token_hash TEXT','receipt_confirmed_at TEXT',
  'receipt_confirmation_count INTEGER NOT NULL DEFAULT 0',
  'receipt_confirm_ip TEXT','receipt_confirm_user_agent TEXT','receipt_confirm_device TEXT',
  'last_event_at TEXT'
 ]){
  try{await db.prepare(`ALTER TABLE email_status_records ADD COLUMN ${col}`).run();}catch{}
 }
 return db;
}
async function addEvent(db,trackingId,eventType,{eventKey='',stamp=now(),status='',ip=null,userAgent=null,device=null,providerStatus='',detail=''}={}){
 if(!trackingId)return;
 await db.prepare(`INSERT OR IGNORE INTO email_status_events(tracking_id,event_key,event_type,event_at,status,ip,user_agent,device,provider_status,detail) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(trackingId,clean(eventKey)||null,clean(eventType),stamp,clean(status),ip,userAgent,device,clean(providerStatus),clean(detail).slice(0,2000)).run();
 await db.prepare(`UPDATE email_status_records SET last_event_at=?,updated_at=CASE WHEN datetime(updated_at)<datetime(?) THEN ? ELSE updated_at END WHERE tracking_id=?`).bind(stamp,stamp,stamp,trackingId).run();
}

export async function createTrackedMessage(env,{sourceSystem='system',sourceId='',recipient='',sender='',subject='',html=''}={}){
 const trackingId=crypto.randomUUID(),receiptToken=`${crypto.randomUUID().replace(/-/g,'')}${crypto.randomUUID().replace(/-/g,'')}`,stamp=now(),to=emailOf(recipient),from=emailOf(sender);
 if(!to)return{trackingId:'',html:String(html||''),tracked:false};
 const db=await ensureEmailStatusSchema(env),receiptHash=await sha256(receiptToken);
 await db.prepare(`INSERT INTO email_status_records(tracking_id,source_system,source_id,recipient,sender,subject,current_status,receipt_token_hash,last_event_at,created_at,updated_at) VALUES(?,?,?,?,?,?,'SUBMITTING',?,?,?,?)`).bind(trackingId,clean(sourceSystem)||'system',clean(sourceId),to,from,clean(subject).slice(0,500),receiptHash,stamp,stamp,stamp).run();
 await addEvent(db,trackingId,'SUBMITTING',{eventKey:`internal:${trackingId}:submitting`,stamp,status:'SUBMITTING'});
 let nextHtml=String(html||'');
 const confirmationUrl=receiptUrl(env,trackingId,receiptToken);
 if(receiptEnabled(env)&&nextHtml)nextHtml=injectReceiptAction(nextHtml,confirmationUrl);
 if(trackingEnabled(env)&&nextHtml)nextHtml=injectPixel(nextHtml,pixelUrl(env,trackingId));
 return{trackingId,html:nextHtml,tracked:true,pixelUrl:pixelUrl(env,trackingId),receiptUrl:confirmationUrl};
}

export async function markEmailAccepted(env,trackingId,providerMessageId=''){
 if(!trackingId)return;
 const db=await ensureEmailStatusSchema(env),stamp=now(),messageId=clean(providerMessageId);
 await db.prepare(`UPDATE email_status_records SET provider_message_id=COALESCE(NULLIF(?,''),provider_message_id),current_status='ACCEPTED',provider_status='accepted',accepted_at=COALESCE(accepted_at,?),last_event_at=?,updated_at=? WHERE tracking_id=?`).bind(messageId,stamp,stamp,stamp,trackingId).run();
 await addEvent(db,trackingId,'ACCEPTED',{eventKey:`internal:${trackingId}:accepted`,stamp,status:'ACCEPTED',providerStatus:'accepted',detail:messageId});
}
export async function markEmailFailure(env,trackingId,error){
 if(!trackingId)return;
 const db=await ensureEmailStatusSchema(env),stamp=now(),status=failureStatus(error),detail=errorText(error),cause=errorCode(error);
 await db.prepare(`UPDATE email_status_records SET current_status=?,provider_status=?,error_cause=?,error_detail=?,failed_at=COALESCE(failed_at,?),last_event_at=?,updated_at=? WHERE tracking_id=?`).bind(status,status.toLowerCase(),cause,detail,stamp,stamp,stamp,trackingId).run();
 await addEvent(db,trackingId,status,{eventKey:`internal:${trackingId}:failure:${status}`,stamp,status,providerStatus:status.toLowerCase(),detail:`${cause}: ${detail}`});
}

export function withEmailStatusTracking(env,sourceHint='system'){
 if(!env||env.__GNK_ASG_EMAIL_STATUS_TRACKED===VERSION)return env;
 const binding=env.EMAIL;if(!binding||typeof binding.send!=='function')return env;
 return new Proxy(env,{get(target,property,receiver){
  if(property==='__GNK_ASG_EMAIL_STATUS_TRACKED')return VERSION;
  if(property==='EMAIL')return{send:async payload=>{
   const structured=payload&&typeof payload==='object'&&('subject'in payload||'html'in payload||'text'in payload);
   const sourceSystem=sourceOf(payload,sourceHint),sourceId=sourceIdOf(payload),recipient=emailOf(payload?.to),sender=emailOf(payload?.from),subject=structured?clean(payload?.subject):'',originalHtml=structured?String(payload?.html||''):'';
   let tracking={trackingId:'',html:originalHtml,tracked:false};
   try{tracking=await createTrackedMessage(target,{sourceSystem,sourceId,recipient,sender,subject,html:originalHtml});}catch(error){console.error('email-status-create',error);}
   let outbound=payload;
   if(structured&&tracking.tracked){
    const headers={...(payload.headers||{}),'X-GNK-ASG-Tracking-Id':tracking.trackingId,'X-GNK-ASG-Tracking-Version':VERSION,'Disposition-Notification-To':sender||undefined,'Return-Receipt-To':sender||undefined};
    Object.keys(headers).forEach(key=>headers[key]===undefined&&delete headers[key]);
    outbound={...payload,html:tracking.html,headers};
   }
   try{const result=await binding.send.call(binding,outbound);await markEmailAccepted(target,tracking.trackingId,clean(result?.messageId)).catch(error=>console.error('email-status-accepted',error));return result;}
   catch(error){await markEmailFailure(target,tracking.trackingId,error).catch(inner=>console.error('email-status-failed',inner));throw error;}
  }};
  return Reflect.get(target,property,receiver);
 }});
}

async function recordOpen(env,id,request){
 const db=await ensureEmailStatusSchema(env),stamp=now(),meta=requestMeta(request);
 const row=await db.prepare(`SELECT current_status FROM email_status_records WHERE tracking_id=?`).bind(id).first();
 if(!row)return false;
 const current=clean(row.current_status).toUpperCase(),next=FINAL_FAILURES.has(current)||current==='CONFIRMED'?current:'OPENED';
 await db.prepare(`UPDATE email_status_records SET current_status=?,first_opened_at=COALESCE(first_opened_at,?),last_opened_at=?,open_count=open_count+1,last_open_ip=?,last_open_user_agent=?,last_open_device=?,last_event_at=?,updated_at=? WHERE tracking_id=?`).bind(next,stamp,stamp,meta.ip,meta.userAgent,meta.device,stamp,stamp,id).run();
 await addEvent(db,id,'OPENED',{stamp,status:next,ip:meta.ip,userAgent:meta.userAgent,device:meta.device,detail:meta.device.includes('proxy')?'Proxy otvaranje; IP nije nužno adresa primatelja.':'Tracking signal slike.'});
 return true;
}
function pixelResponse(){return new Response(GIF,{status:200,headers:{'content-type':'image/gif','content-length':String(GIF.byteLength),'cache-control':'private, no-store, no-cache, must-revalidate, max-age=0','pragma':'no-cache','expires':'0','x-content-type-options':'nosniff','cross-origin-resource-policy':'cross-origin','x-gnk-asg-email-status':VERSION}});}
function receiptPage(id,action,confirmed=false,error=''){
 const heading=confirmed?'Primitak je evidentiran':'Potvrda primitka';
 const message=confirmed?'Hvala. Datum i vrijeme potvrde spremljeni su u internu evidenciju pošiljatelja.':error||'Klikom na gumb dobrovoljno potvrđujete da je poruka zaprimljena. Otvaranje poruke samo po sebi nije potvrda.';
 return`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>${esc(heading)} · GNK ASG</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 20% 0,#24466f,#07111f 48%,#02050b);color:#f8fafc;font-family:Arial,sans-serif}.card{width:min(620px,100%);padding:30px;border:2px solid #d7aa3c;border-radius:20px;background:#08182c;box-shadow:0 28px 80px rgba(0,0,0,.55)}h1{margin:0 0 14px;color:#ffe08a;font-size:clamp(30px,7vw,48px)}p{color:#e6edf7;font-size:17px;line-height:1.65}.ref{color:#bdc9db;font-size:12px;word-break:break-all}button{width:100%;padding:15px;border:0;border-radius:11px;background:#f0ca68;color:#07101d;font-weight:900;font-size:16px;cursor:pointer}.note{font-size:12px;color:#cbd5e1}</style></head><body><main class="card"><h1>${esc(heading)}</h1><p>${esc(message)}</p>${confirmed?'':`<form method="post" action="${esc(action)}"><button type="submit">Potvrđujem primitak poruke</button></form>`}<p class="ref">Referenca: ${esc(id)}</p><p class="note">Tehnički podaci zahtjeva mogu sadržavati IP adresu, korisnički agent i vrstu uređaja. Prosljeđivanje poruke nije moguće pouzdano utvrditi standardnim e-mail protokolom.</p></main></body></html>`;
}
async function handleReceipt(request,env,id,token){
 const db=await ensureEmailStatusSchema(env),tokenHash=await sha256(token);
 const row=await db.prepare(`SELECT tracking_id,receipt_token_hash,receipt_confirmed_at FROM email_status_records WHERE tracking_id=?`).bind(id).first();
 const headers={'content-type':'text/html; charset=utf-8','cache-control':'private, no-store, no-cache, must-revalidate, max-age=0','pragma':'no-cache','x-content-type-options':'nosniff','x-frame-options':'DENY','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",'referrer-policy':'no-referrer','x-gnk-asg-email-status':VERSION};
 if(!row||!row.receipt_token_hash||row.receipt_token_hash!==tokenHash)return new Response(receiptPage(id,request.url,false,'Poveznica nije valjana ili je istekla.'),{status:404,headers});
 if(request.method==='GET')return new Response(receiptPage(id,request.url,Boolean(row.receipt_confirmed_at)),{status:200,headers});
 if(request.method!=='POST')return new Response(receiptPage(id,request.url,false,'Metoda nije dopuštena.'),{status:405,headers:{...headers,allow:'GET, POST'}});
 const stamp=now(),meta=requestMeta(request);
 await db.prepare(`UPDATE email_status_records SET current_status=CASE WHEN current_status IN ('BOUNCED','REJECTED','FAILED') THEN current_status ELSE 'CONFIRMED' END,receipt_confirmed_at=COALESCE(receipt_confirmed_at,?),receipt_confirmation_count=receipt_confirmation_count+1,receipt_confirm_ip=?,receipt_confirm_user_agent=?,receipt_confirm_device=?,last_event_at=?,updated_at=? WHERE tracking_id=?`).bind(stamp,meta.ip,meta.userAgent,meta.device,stamp,stamp,id).run();
 await addEvent(db,id,'CONFIRMED',{stamp,status:'CONFIRMED',ip:meta.ip,userAgent:meta.userAgent,device:meta.device,detail:'Primatelj je aktivno potvrdio primitak putem potvrđujućeg POST zahtjeva.'});
 return new Response(receiptPage(id,request.url,true),{status:200,headers});
}
async function listEvents(env,id){
 const db=await ensureEmailStatusSchema(env),record=await db.prepare(`SELECT tracking_id,recipient,sender,subject,current_status,provider_status,provider_message_id,accepted_at,delivered_at,failed_at,first_opened_at,last_opened_at,open_count,receipt_confirmed_at,receipt_confirmation_count FROM email_status_records WHERE tracking_id=?`).bind(id).first();
 if(!record)return json({ok:false,error:'not_found'},404);
 const rows=await db.prepare(`SELECT id,event_type,event_at,status,ip,user_agent,device,provider_status,detail FROM email_status_events WHERE tracking_id=? ORDER BY datetime(event_at) DESC,id DESC LIMIT 500`).bind(id).all();
 const events=rows.results||[],openEnvironments=new Set(events.filter(x=>x.event_type==='OPENED').map(x=>`${x.ip||'unknown'}|${x.device||'unknown'}`));
 return json({ok:true,version:VERSION,record,events,forwarding:{detectable:false,possibleSignal:openEnvironments.size>1,distinctOpenEnvironments:openEnvironments.size,explanation:'Različite IP adrese ili uređaji mogu nastati zbog proxyja, više uređaja ili prosljeđivanja; to nije dokaz prosljeđivanja.'}});
}

async function syncState(env,fields){
 const db=await ensureEmailStatusSchema(env),sets=[],values=[];
 for(const key of ['last_started_at','last_completed_at','last_error','last_event_count'])if(fields[key]!==undefined){sets.push(`${key}=?`);values.push(fields[key]);}
 sets.push('updated_at=?');values.push(now());
 await db.prepare(`UPDATE email_status_sync_state SET ${sets.join(',')} WHERE id=1`).bind(...values).run();
}

export async function syncCloudflareEmailStatuses(env){
 const token=clean(env.CLOUDFLARE_ANALYTICS_TOKEN||env.CF_ANALYTICS_TOKEN),zoneTag=clean(env.CLOUDFLARE_ZONE_ID||env.CF_ZONE_ID);
 if(!token||!zoneTag)return{ok:true,skipped:'analytics_credentials_missing',required:['CLOUDFLARE_ZONE_ID','CLOUDFLARE_ANALYTICS_TOKEN']};
 const started=now();await syncState(env,{last_started_at:started,last_error:''});
 const hours=clamp(env.EMAIL_STATUS_SYNC_LOOKBACK_HOURS,1,744,48),limit=clamp(env.EMAIL_STATUS_SYNC_LIMIT,50,10000,5000),end=now(),start=new Date(Date.now()-hours*3600000).toISOString();
 const query=`query RecentEmailEvents($zoneTag: string!, $start: Time!, $end: Time!, $limit: Int!) { viewer { zones(filter: { zoneTag: $zoneTag }) { emailSendingAdaptive(filter: { datetime_geq: $start, datetime_leq: $end }, limit: $limit, orderBy: [datetime_DESC]) { datetime from to subject status eventType sendingDomain messageId errorCause errorDetail isLastEvent } } } }`;
 try{
  const response=await fetch('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({query,variables:{zoneTag,start,end,limit}})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||payload.errors?.length)throw new Error(payload.errors?.map(item=>item.message).join('; ')||`Cloudflare GraphQL HTTP ${response.status}`);
  const events=payload?.data?.viewer?.zones?.[0]?.emailSendingAdaptive||[],db=await ensureEmailStatusSchema(env);let matched=0,updated=0;
  for(const event of events){
   const messageId=clean(event.messageId),mapped=statusFromProvider(event.status);if(!messageId||!mapped)continue;
   const row=await db.prepare(`SELECT tracking_id FROM email_status_records WHERE provider_message_id=?`).bind(messageId).first();if(!row?.tracking_id)continue;
   const stamp=clean(event.datetime)||now(),delivered=mapped==='DELIVERED'?stamp:null,failed=FINAL_FAILURES.has(mapped)?stamp:null;
   const result=await db.prepare(`UPDATE email_status_records SET current_status=CASE WHEN current_status IN ('OPENED','CONFIRMED') AND ?='DELIVERED' THEN current_status ELSE ? END,provider_status=?,error_cause=?,error_detail=?,delivered_at=COALESCE(delivered_at,?),failed_at=COALESCE(failed_at,?),last_event_at=?,updated_at=? WHERE provider_message_id=?`).bind(mapped,mapped,clean(event.status),clean(event.errorCause),clean(event.errorDetail),delivered,failed,stamp,stamp,messageId).run();
   const changes=Number(result.meta?.changes||0);if(changes){matched++;updated+=changes;await addEvent(db,row.tracking_id,mapped,{eventKey:`provider:${messageId}:${stamp}:${mapped}:${clean(event.eventType)}`,stamp,status:mapped,providerStatus:clean(event.status),detail:[clean(event.eventType),clean(event.errorCause),clean(event.errorDetail)].filter(Boolean).join(' · ')});}
  }
  const retention=clamp(env.EMAIL_STATUS_EVENT_RETENTION_DAYS,1,365,31);
  await db.prepare(`DELETE FROM email_status_events WHERE datetime(event_at)<datetime('now',?)`).bind(`-${retention} days`).run().catch(()=>{});
  await syncState(env,{last_completed_at:now(),last_error:'',last_event_count:events.length});
  return{ok:true,queried:events.length,matched,updated,window:{start,end,hours},retentionDays:retention};
 }catch(error){await syncState(env,{last_completed_at:now(),last_error:errorText(error),last_event_count:0});return{ok:false,error:'cloudflare_analytics_sync_failed',message:errorText(error)};}
}

async function listRecords(request,env){
 const db=await ensureEmailStatusSchema(env),url=new URL(request.url),limit=clamp(url.searchParams.get('limit'),1,500,200),offset=clamp(url.searchParams.get('offset'),0,100000,0),status=clean(url.searchParams.get('status')).toUpperCase(),source=clean(url.searchParams.get('source')).toLowerCase(),search=clean(url.searchParams.get('search')).slice(0,150),clauses=[],binds=[];
 if(status&&status!=='ALL'){clauses.push('current_status=?');binds.push(status);}
 if(source&&source!=='all'){clauses.push('LOWER(source_system)=?');binds.push(source);}
 if(search){const term=`%${search}%`;clauses.push('(recipient LIKE ? OR sender LIKE ? OR subject LIKE ? OR provider_message_id LIKE ? OR source_id LIKE ?)');binds.push(term,term,term,term,term);}
 const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
 const [rows,total,summary,sync]=await Promise.all([
  db.prepare(`SELECT r.*,(SELECT COUNT(DISTINCT COALESCE(NULLIF(e.ip,''),'unknown')||'|'||COALESCE(NULLIF(e.device,''),'unknown')) FROM email_status_events e WHERE e.tracking_id=r.tracking_id AND e.event_type='OPENED') distinct_open_environments FROM email_status_records r ${where} ORDER BY datetime(COALESCE(r.last_event_at,r.updated_at,r.created_at)) DESC LIMIT ? OFFSET ?`).bind(...binds,limit,offset).all(),
  db.prepare(`SELECT COUNT(*) count FROM email_status_records ${where}`).bind(...binds).first(),
  db.prepare(`SELECT current_status status,COUNT(*) count FROM email_status_records GROUP BY current_status`).all(),
  db.prepare(`SELECT * FROM email_status_sync_state WHERE id=1`).first()
 ]);
 const items=(rows.results||[]).map(item=>({...item,possible_forwarding_signal:Number(item.distinct_open_environments||0)>1,forwarding_detectable:false}));
 return{ok:true,version:VERSION,total:Number(total?.count||0),limit,offset,summary:Object.fromEntries((summary.results||[]).map(row=>[row.status,Number(row.count||0)])),sync,items};
}

function dashboardHtml(){return`<!doctype html><html lang="hr" data-gnk-email-status-dashboard="base"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Status svih email poruka | GNK ASG</title><style>
:root{font-family:Inter,Arial,sans-serif;color:#f8fafc;background:#02050b;color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#02050b;color:#f8fafc}.wrap{max-width:1800px;margin:auto;padding:24px}.top{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}.card{background:#08182c;border:1px solid #b9923f;border-radius:16px;padding:18px;box-shadow:0 8px 30px rgba(0,0,0,.28);color:#f8fafc}h1{margin:0 0 6px;font-size:28px;color:#ffe08a}.muted{color:#d5dfed}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}.stat b{display:block;font-size:26px;color:#fff}.controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}input,select,button{font:inherit;border:1px solid #b9923f;border-radius:10px;padding:10px 12px;background:#fff;color:#07101d}button{cursor:pointer;background:#e6bd57;color:#07101d;border-color:#e6bd57;font-weight:800}.table{overflow:auto;border:1px solid #344765;border-radius:12px}table{width:100%;border-collapse:collapse;min-width:1500px}th,td{text-align:left;padding:11px 10px;border-bottom:1px solid #344765;vertical-align:top;color:#f8fafc}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#ffe08a;background:#0e2340}.badge{display:inline-block;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:900;background:#e5e7eb;color:#111827}.DELIVERED{background:#bbf7d0;color:#14532d}.OPENED{background:#bfdbfe;color:#1e3a8a}.CONFIRMED{background:#fde68a;color:#713f12}.ACCEPTED{background:#fef3c7;color:#78350f}.DEFERRED{background:#fed7aa;color:#7c2d12}.BOUNCED,.REJECTED,.FAILED{background:#fecaca;color:#7f1d1d}.SUBMITTING{background:#c7d2fe;color:#312e81}.small{font-size:12px}.error{color:#fecaca}@media(max-width:700px){.wrap{padding:14px}h1{font-size:22px}}</style></head><body><main class="wrap"><div class="top"><div><h1>Status svih email poruka</h1><div class="muted">Detaljna interna evidencija slanja, isporuke, otvaranja, odbijanja i potvrde primitka</div></div><button id="sync">Sinkroniziraj Cloudflare</button></div><section id="stats" class="stats"></section><section class="card"><div class="controls"><input id="search" placeholder="Primatelj, predmet, ID…"><select id="status"><option>ALL</option><option>CONFIRMED</option><option>OPENED</option><option>DELIVERED</option><option>ACCEPTED</option><option>DEFERRED</option><option>BOUNCED</option><option>REJECTED</option><option>FAILED</option></select><select id="source"><option value="all">Svi sustavi</option><option value="mail-studio">Mail Studio</option><option value="campaign-mailer">Campaign Mailer</option><option value="media-center">Media Center</option><option value="auto-reply">Automatski odgovori</option></select><button id="load">Osvježi</button></div><p class="muted small">Otvaranje je tehnički signal slike i nije dokaz da je osoba pročitala poruku. Gmail i Apple često koriste proxy IP. Prosljeđivanje se ne može pouzdano utvrditi; različiti uređaji ili IP adrese samo su signal za provjeru. Aktivna potvrda primitka zaseban je događaj.</p><div id="message" class="small"></div><div class="table"><table><thead><tr><th>Status</th><th>Primatelj / pošiljatelj</th><th>Predmet</th><th>Sustav</th><th>Poslano</th><th>Isporučeno</th><th>Potvrđeno</th><th>Prvo / zadnje otvaranje</th><th>Otvaranja</th><th>Uređaj / IP</th><th>Greška / Message ID</th></tr></thead><tbody id="rows"></tbody></table></div></section></main><script>
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const fmt=v=>v?new Date(v).toLocaleString('hr-HR'):'—';const labels={SUBMITTING:'PRIPREMA',ACCEPTED:'POSLANO',DELIVERED:'ISPORUČENO',OPENED:'OTVORENO / VIĐENO',CONFIRMED:'POTVRĐEN PRIMITAK',DEFERRED:'ODGOĐENO',BOUNCED:'ODBIJENO',REJECTED:'BLOKIRANO',FAILED:'NEUSPJEŠNO'};
async function api(url,opt){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));return d}async function load(){const q=new URLSearchParams({limit:'300',status:document.querySelector('#status').value,source:document.querySelector('#source').value,search:document.querySelector('#search').value});const d=await api('${API_PREFIX}/records?'+q);document.querySelector('#stats').innerHTML=Object.entries(d.summary||{}).map(([s,n])=>'<div class="card stat"><span class="badge '+esc(s)+'">'+esc(labels[s]||s)+'</span><b>'+n+'</b></div>').join('');document.querySelector('#rows').innerHTML=(d.items||[]).map(x=>'<tr><td><span class="badge '+esc(x.current_status)+'">'+esc(labels[x.current_status]||x.current_status)+'</span></td><td><b>'+esc(x.recipient)+'</b><div class="muted small">Od: '+esc(x.sender||'—')+'</div></td><td>'+esc(x.subject||'—')+'</td><td>'+esc(x.source_system)+'</td><td>'+fmt(x.accepted_at)+'</td><td>'+fmt(x.delivered_at)+'</td><td>'+fmt(x.receipt_confirmed_at)+'</td><td>'+fmt(x.first_opened_at)+'<div class="muted small">'+fmt(x.last_opened_at)+'</div></td><td>'+Number(x.open_count||0)+'</td><td class="small">'+esc(x.last_open_device||'—')+'<div class="muted small">'+esc(x.last_open_ip||'')+'</div></td><td class="small '+(x.error_detail?'error':'')+'">'+esc(x.error_detail||x.provider_message_id||'—')+'</td></tr>').join('')||'<tr><td colspan="11">Nema zapisa.</td></tr>';document.querySelector('#message').textContent='Ukupno: '+d.total+(d.sync?.last_completed_at?' · zadnja sinkronizacija: '+fmt(d.sync.last_completed_at):'')}
document.querySelector('#load').onclick=load;document.querySelector('#sync').onclick=async e=>{e.currentTarget.disabled=true;document.querySelector('#message').textContent='Sinkronizacija…';try{const d=await api('${API_PREFIX}/sync',{method:'POST'});document.querySelector('#message').textContent=d.skipped==='analytics_credentials_missing'?'Nedostaju Cloudflare Analytics vjerodajnice.':'Sinkronizirano: '+(d.matched||0)+' poruka.';await load()}catch(err){document.querySelector('#message').textContent=err.message}finally{e.currentTarget.disabled=false}};document.querySelector('#search').addEventListener('keydown',e=>{if(e.key==='Enter')load()});load();
</script></body></html>`;}

export async function handleEmailStatusRequest(request,env){
 const path=pathOf(request);
 if(path.startsWith(PIXEL_PREFIX)&&request.method==='GET'){
  const match=path.match(/^\/api\/email-status\/open\/([A-Za-z0-9-]{20,80})\.gif$/);if(match)await recordOpen(env,match[1],request).catch(error=>console.error('email-status-open',error));return pixelResponse();
 }
 const receipt=path.match(/^\/api\/email-status\/receipt\/([A-Za-z0-9-]{20,80})\/([A-Za-z0-9_-]{40,200})$/);
 if(receipt&&['GET','POST'].includes(request.method))return handleReceipt(request,env,receipt[1],receipt[2]);
 const events=path.match(/^\/api\/email-status\/records\/([A-Za-z0-9-]{20,80})\/events$/);
 if(events&&request.method==='GET')return listEvents(env,events[1]);
 if((path===DASHBOARD_PATH||path===`${DASHBOARD_PATH}/`)&&request.method==='GET')return new Response(dashboardHtml(),{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-frame-options':'SAMEORIGIN','x-content-type-options':'nosniff','x-gnk-asg-email-status':VERSION}});
 if(path===`${API_PREFIX}/records`&&request.method==='GET')return json(await listRecords(request,env));
 if(path===`${API_PREFIX}/sync`&&request.method==='POST')return json(await syncCloudflareEmailStatuses(env));
 if(path===`${API_PREFIX}/health`&&request.method==='GET')return json({ok:true,version:VERSION,d1:Boolean(dbOf(env)?.prepare),analyticsConfigured:Boolean(clean(env.CLOUDFLARE_ANALYTICS_TOKEN||env.CF_ANALYTICS_TOKEN)&&clean(env.CLOUDFLARE_ZONE_ID||env.CF_ZONE_ID)),openTrackingEnabled:trackingEnabled(env),receiptConfirmationEnabled:receiptEnabled(env),ipAndDeviceAudit:true,eventTimeline:true,forwardingDetection:'not-reliably-detectable',dashboard:DASHBOARD_PATH});
 return null;
}

export function isEmailStatusPath(path){return path===DASHBOARD_PATH||path.startsWith(`${DASHBOARD_PATH}/`)||path===API_PREFIX||path.startsWith(`${API_PREFIX}/`);}
