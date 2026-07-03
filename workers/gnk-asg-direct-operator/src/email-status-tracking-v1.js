export const VERSION='GNK_ASG_EMAIL_STATUS_TRACKING_V1_20260703';
export const DASHBOARD_PATH='/email-status';
export const API_PREFIX='/api/email-status';
const PIXEL_PREFIX=`${API_PREFIX}/open/`;
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

function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-email-status':VERSION}});}
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
function sourceIdOf(payload){return headerOf(payload,'X-GNK-ASG-Manual-Mail-Id')||headerOf(payload,'X-GNK-ASG-Idempotency-Key')||headerOf(payload,'X-GNK-ASG-Reference')||'';}
function trackingEnabled(env){return !/^(0|false|off|no)$/i.test(clean(env?.EMAIL_OPEN_TRACKING_ENABLED||'true'));}
function originOf(env){const value=clean(env?.EMAIL_STATUS_PUBLIC_ORIGIN||CANONICAL_ORIGIN).replace(/\/+$/,'');return /^https:\/\//i.test(value)?value:CANONICAL_ORIGIN;}
function pixelUrl(env,id){return`${originOf(env)}${PIXEL_PREFIX}${encodeURIComponent(id)}.gif`;}
function injectPixel(html,url){
 const source=String(html||'');
 if(!source||source.includes('data-gnk-email-status-pixel'))return source;
 const pixel=`<img data-gnk-email-status-pixel="${VERSION}" src="${esc(url)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;overflow:hidden" aria-hidden="true">`;
 return /<\/body>/i.test(source)?source.replace(/<\/body>/i,`${pixel}</body>`):`${source}${pixel}`;
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
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL
  )`),
  db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_email_status_provider_message ON email_status_records(provider_message_id) WHERE provider_message_id IS NOT NULL AND provider_message_id<>''`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_status_source ON email_status_records(source_system,source_id)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_status_recipient ON email_status_records(recipient,created_at DESC)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_status_current ON email_status_records(current_status,updated_at DESC)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS email_status_sync_state(id INTEGER PRIMARY KEY CHECK(id=1),last_started_at TEXT,last_completed_at TEXT,last_error TEXT,last_event_count INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)`),
  db.prepare(`INSERT OR IGNORE INTO email_status_sync_state(id,last_event_count,updated_at) VALUES(1,0,datetime('now'))`)
 ]);
 return db;
}

export async function createTrackedMessage(env,{sourceSystem='system',sourceId='',recipient='',sender='',subject='',html=''}={}){
 const trackingId=crypto.randomUUID(),stamp=now(),to=emailOf(recipient),from=emailOf(sender);
 if(!to)return{trackingId:'',html:String(html||''),tracked:false};
 const db=await ensureEmailStatusSchema(env);
 await db.prepare(`INSERT INTO email_status_records(tracking_id,source_system,source_id,recipient,sender,subject,current_status,created_at,updated_at) VALUES(?,?,?,?,?,?,'SUBMITTING',?,?)`).bind(trackingId,clean(sourceSystem)||'system',clean(sourceId),to,from,clean(subject).slice(0,500),stamp,stamp).run();
 const nextHtml=trackingEnabled(env)&&html?injectPixel(html,pixelUrl(env,trackingId)):String(html||'');
 return{trackingId,html:nextHtml,tracked:true,pixelUrl:pixelUrl(env,trackingId)};
}

export async function markEmailAccepted(env,trackingId,providerMessageId=''){
 if(!trackingId)return;
 const db=await ensureEmailStatusSchema(env),stamp=now();
 await db.prepare(`UPDATE email_status_records SET provider_message_id=COALESCE(NULLIF(?,''),provider_message_id),current_status='ACCEPTED',provider_status='accepted',accepted_at=COALESCE(accepted_at,?),updated_at=? WHERE tracking_id=?`).bind(clean(providerMessageId),stamp,stamp,trackingId).run();
}
export async function markEmailFailure(env,trackingId,error){
 if(!trackingId)return;
 const db=await ensureEmailStatusSchema(env),stamp=now(),status=failureStatus(error);
 await db.prepare(`UPDATE email_status_records SET current_status=?,provider_status=?,error_cause=?,error_detail=?,failed_at=COALESCE(failed_at,?),updated_at=? WHERE tracking_id=?`).bind(status,status.toLowerCase(),errorCode(error),errorText(error),stamp,stamp,trackingId).run();
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
   if(structured&&tracking.tracked&&originalHtml)outbound={...payload,html:tracking.html,headers:{...(payload.headers||{}),'X-GNK-ASG-Tracking-Id':tracking.trackingId,'X-GNK-ASG-Tracking-Version':VERSION}};
   try{const result=await binding.send.call(binding,outbound);await markEmailAccepted(target,tracking.trackingId,clean(result?.messageId)).catch(error=>console.error('email-status-accepted',error));return result;}
   catch(error){await markEmailFailure(target,tracking.trackingId,error).catch(inner=>console.error('email-status-failed',inner));throw error;}
  }};
  return Reflect.get(target,property,receiver);
 }});
}

async function recordOpen(env,id){
 const db=await ensureEmailStatusSchema(env),stamp=now();
 const row=await db.prepare(`SELECT current_status FROM email_status_records WHERE tracking_id=?`).bind(id).first();
 if(!row)return false;
 const next=FINAL_FAILURES.has(clean(row.current_status).toUpperCase())?clean(row.current_status).toUpperCase():'OPENED';
 await db.prepare(`UPDATE email_status_records SET current_status=?,first_opened_at=COALESCE(first_opened_at,?),last_opened_at=?,open_count=open_count+1,updated_at=? WHERE tracking_id=?`).bind(next,stamp,stamp,stamp,id).run();
 return true;
}
function pixelResponse(){return new Response(GIF,{status:200,headers:{'content-type':'image/gif','content-length':String(GIF.byteLength),'cache-control':'private, no-store, no-cache, must-revalidate, max-age=0','pragma':'no-cache','expires':'0','x-content-type-options':'nosniff','cross-origin-resource-policy':'cross-origin','x-gnk-asg-email-status':VERSION}});}

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
   const stamp=clean(event.datetime)||now(),delivered=mapped==='DELIVERED'?stamp:null,failed=FINAL_FAILURES.has(mapped)?stamp:null;
   const result=await db.prepare(`UPDATE email_status_records SET current_status=CASE WHEN current_status='OPENED' AND ?='DELIVERED' THEN current_status ELSE ? END,provider_status=?,error_cause=?,error_detail=?,delivered_at=COALESCE(delivered_at,?),failed_at=COALESCE(failed_at,?),updated_at=? WHERE provider_message_id=?`).bind(mapped,mapped,clean(event.status),clean(event.errorCause),clean(event.errorDetail),delivered,failed,stamp,messageId).run();
   const changes=Number(result.meta?.changes||0);if(changes){matched++;updated+=changes;}
  }
  await syncState(env,{last_completed_at:now(),last_error:'',last_event_count:events.length});
  return{ok:true,queried:events.length,matched,updated,window:{start,end,hours},retentionDays:31};
 }catch(error){await syncState(env,{last_completed_at:now(),last_error:errorText(error),last_event_count:0});return{ok:false,error:'cloudflare_analytics_sync_failed',message:errorText(error)};}
}

async function listRecords(request,env){
 const db=await ensureEmailStatusSchema(env),url=new URL(request.url),limit=clamp(url.searchParams.get('limit'),1,500,200),offset=clamp(url.searchParams.get('offset'),0,100000,0),status=clean(url.searchParams.get('status')).toUpperCase(),source=clean(url.searchParams.get('source')).toLowerCase(),search=clean(url.searchParams.get('search')).slice(0,150),clauses=[],binds=[];
 if(status&&status!=='ALL'){clauses.push('current_status=?');binds.push(status);}
 if(source&&source!=='all'){clauses.push('LOWER(source_system)=?');binds.push(source);}
 if(search){const term=`%${search}%`;clauses.push('(recipient LIKE ? OR sender LIKE ? OR subject LIKE ? OR provider_message_id LIKE ? OR source_id LIKE ?)');binds.push(term,term,term,term,term);}
 const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
 const [rows,total,summary,sync]=await Promise.all([
  db.prepare(`SELECT * FROM email_status_records ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).bind(...binds,limit,offset).all(),
  db.prepare(`SELECT COUNT(*) count FROM email_status_records ${where}`).bind(...binds).first(),
  db.prepare(`SELECT current_status status,COUNT(*) count FROM email_status_records GROUP BY current_status`).all(),
  db.prepare(`SELECT * FROM email_status_sync_state WHERE id=1`).first()
 ]);
 return{ok:true,version:VERSION,total:Number(total?.count||0),limit,offset,summary:Object.fromEntries((summary.results||[]).map(row=>[row.status,Number(row.count||0)])),sync,items:rows.results||[]};
}

function dashboardHtml(){return`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Status svih email poruka | GNK ASG</title><style>
:root{font-family:Inter,Arial,sans-serif;color:#111827;background:#f3f4f6}*{box-sizing:border-box}body{margin:0}.wrap{max-width:1500px;margin:auto;padding:24px}.top{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}.card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:18px;box-shadow:0 8px 30px rgba(15,23,42,.06)}h1{margin:0 0 6px;font-size:28px}.muted{color:#64748b}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}.stat b{display:block;font-size:26px}.controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}input,select,button{font:inherit;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:#fff}button{cursor:pointer;background:#111827;color:#fff;border-color:#111827}.table{overflow:auto}table{width:100%;border-collapse:collapse;min-width:1150px}th,td{text-align:left;padding:11px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#64748b}.badge{display:inline-block;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:800;background:#e5e7eb}.DELIVERED{background:#dcfce7;color:#166534}.OPENED{background:#dbeafe;color:#1d4ed8}.ACCEPTED{background:#fef3c7;color:#92400e}.DEFERRED{background:#ffedd5;color:#9a3412}.BOUNCED,.REJECTED,.FAILED{background:#fee2e2;color:#991b1b}.SUBMITTING{background:#e0e7ff;color:#3730a3}.small{font-size:12px}.error{color:#b91c1c}@media(max-width:700px){.wrap{padding:14px}h1{font-size:22px}}</style></head><body><main class="wrap"><div class="top"><div><h1>Status svih email poruka</h1><div class="muted">Mail Studio · Campaign Mailer · Media Center · automatski odgovori</div></div><button id="sync">Sinkroniziraj Cloudflare</button></div><section id="stats" class="stats"></section><section class="card"><div class="controls"><input id="search" placeholder="Primatelj, predmet, ID…"><select id="status"><option>ALL</option><option>OPENED</option><option>DELIVERED</option><option>ACCEPTED</option><option>DEFERRED</option><option>BOUNCED</option><option>REJECTED</option><option>FAILED</option></select><select id="source"><option value="all">Svi sustavi</option><option value="mail-studio">Mail Studio</option><option value="campaign-mailer">Campaign Mailer</option><option value="media-center">Media Center</option><option value="auto-reply">Automatski odgovori</option></select><button id="load">Osvježi</button></div><p class="muted small">„Otvoreno” znači da je učitan nevidljivi signal u HTML poruci. To nije pravni dokaz da je osoba pročitala sadržaj.</p><div id="message" class="small"></div><div class="table"><table><thead><tr><th>Status</th><th>Primatelj</th><th>Predmet</th><th>Sustav</th><th>Poslano</th><th>Isporučeno</th><th>Otvoreno</th><th>Otvaranja</th><th>Greška / Message ID</th></tr></thead><tbody id="rows"></tbody></table></div></section></main><script>
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const fmt=v=>v?new Date(v).toLocaleString('hr-HR'):'—';const labels={SUBMITTING:'PRIPREMA',ACCEPTED:'POSLANO',DELIVERED:'ISPORUČENO',OPENED:'OTVORENO / VIĐENO',DEFERRED:'ODGOĐENO',BOUNCED:'ODBIJENO',REJECTED:'BLOKIRANO',FAILED:'NEUSPJEŠNO'};
async function api(url,opt){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||('HTTP '+r.status));return d}async function load(){const q=new URLSearchParams({limit:'300',status:document.querySelector('#status').value,source:document.querySelector('#source').value,search:document.querySelector('#search').value});const d=await api('${API_PREFIX}/records?'+q);document.querySelector('#stats').innerHTML=Object.entries(d.summary||{}).map(([s,n])=>'<div class="card stat"><span class="badge '+esc(s)+'">'+esc(labels[s]||s)+'</span><b>'+n+'</b></div>').join('');document.querySelector('#rows').innerHTML=(d.items||[]).map(x=>'<tr><td><span class="badge '+esc(x.current_status)+'">'+esc(labels[x.current_status]||x.current_status)+'</span></td><td><b>'+esc(x.recipient)+'</b><div class="muted small">'+esc(x.sender||'')+'</div></td><td>'+esc(x.subject||'—')+'</td><td>'+esc(x.source_system)+'</td><td>'+fmt(x.accepted_at)+'</td><td>'+fmt(x.delivered_at)+'</td><td>'+fmt(x.first_opened_at)+'</td><td>'+Number(x.open_count||0)+'</td><td class="small '+(x.error_detail?'error':'')+'">'+esc(x.error_detail||x.provider_message_id||'—')+'</td></tr>').join('')||'<tr><td colspan="9">Nema zapisa.</td></tr>';document.querySelector('#message').textContent='Ukupno: '+d.total+(d.sync?.last_completed_at?' · zadnja sinkronizacija: '+fmt(d.sync.last_completed_at):'')}
document.querySelector('#load').onclick=load;document.querySelector('#sync').onclick=async e=>{e.currentTarget.disabled=true;document.querySelector('#message').textContent='Sinkronizacija…';try{const d=await api('${API_PREFIX}/sync',{method:'POST'});document.querySelector('#message').textContent=d.skipped==='analytics_credentials_missing'?'Nedostaju Cloudflare Analytics vjerodajnice.':'Sinkronizirano: '+(d.matched||0)+' poruka.';await load()}catch(err){document.querySelector('#message').textContent=err.message}finally{e.currentTarget.disabled=false}};document.querySelector('#search').addEventListener('keydown',e=>{if(e.key==='Enter')load()});load();
</script></body></html>`;}

export async function handleEmailStatusRequest(request,env){
 const path=pathOf(request);
 if(path.startsWith(PIXEL_PREFIX)&&request.method==='GET'){
  const match=path.match(/^\/api\/email-status\/open\/([A-Za-z0-9-]{20,80})\.gif$/);if(match)await recordOpen(env,match[1]).catch(error=>console.error('email-status-open',error));return pixelResponse();
 }
 if((path===DASHBOARD_PATH||path===`${DASHBOARD_PATH}/`)&&request.method==='GET')return new Response(dashboardHtml(),{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-frame-options':'SAMEORIGIN','x-content-type-options':'nosniff','x-gnk-asg-email-status':VERSION}});
 if(path===`${API_PREFIX}/records`&&request.method==='GET')return json(await listRecords(request,env));
 if(path===`${API_PREFIX}/sync`&&request.method==='POST')return json(await syncCloudflareEmailStatuses(env));
 if(path===`${API_PREFIX}/health`&&request.method==='GET')return json({ok:true,version:VERSION,d1:Boolean(dbOf(env)?.prepare),analyticsConfigured:Boolean(clean(env.CLOUDFLARE_ANALYTICS_TOKEN||env.CF_ANALYTICS_TOKEN)&&clean(env.CLOUDFLARE_ZONE_ID||env.CF_ZONE_ID)),openTrackingEnabled:trackingEnabled(env),dashboard:DASHBOARD_PATH});
 return null;
}

export function isEmailStatusPath(path){return path===DASHBOARD_PATH||path.startsWith(`${DASHBOARD_PATH}/`)||path===API_PREFIX||path.startsWith(`${API_PREFIX}/`);}
