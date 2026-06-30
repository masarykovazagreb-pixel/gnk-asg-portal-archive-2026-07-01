export const VERSION='GNK_ASG_MEDIA_OUTREACH_REPORTING_V1_20260630';
const STATE_KEY='media-command-center:outreach-report:v1';
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const dbOf=env=>env.GNK_ASG_D1||null;
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const csvCell=value=>`"${String(value??'').replace(/"/g,'""')}"`;

async function readState(env){const kv=kvOf(env);if(!kv)return{};try{const raw=await kv.get(STATE_KEY);return raw?JSON.parse(raw):{};}catch{return{};}}
async function writeState(env,value){const kv=kvOf(env);if(kv)await kv.put(STATE_KEY,JSON.stringify(value,null,2));return value;}
function recipients(env){return clean(env.MEDIA_OUTREACH_REPORT_RECIPIENTS||'beckuphome@gmail.com').split(/[;,\s]+/).map(v=>v.toLowerCase()).filter(validEmail);}

async function snapshot(env){
  const db=dbOf(env);if(!db)return null;
  const rows=(await db.prepare(`SELECT status,COUNT(*) AS count FROM media_delivery_queue GROUP BY status`).all()).results||[];
  const counts=Object.fromEntries(rows.map(row=>[clean(row.status),Number(row.count||0)]));
  const meta=await db.prepare(`SELECT COUNT(*) AS total,MIN(queued_at) AS first_queued_at,MAX(queued_at) AS last_queued_at,MIN(html_sha256) AS html_sha256,MIN(pdf_sha256) AS pdf_sha256 FROM media_delivery_queue`).first();
  const total=Number(meta?.total||0);
  if(!total)return{total:0,counts,active:0,processed:0,queueId:''};
  const active=Number(counts.QUEUED||0)+Number(counts.RETRY||0)+Number(counts.SENDING||0);
  const processed=total-active;
  const queueId=[clean(meta.first_queued_at),total,clean(meta.html_sha256).slice(0,12),clean(meta.pdf_sha256).slice(0,12)].join('|');
  return{total,counts,active,processed,queueId,firstQueuedAt:clean(meta.first_queued_at),lastQueuedAt:clean(meta.last_queued_at)};
}

async function rowsSince(env,since){const db=dbOf(env);if(!db)return[];return(await db.prepare(`SELECT mail_code,outlet,email,status,attempts,provider_message_id,last_error_code,last_error,queued_at,updated_at,sent_at FROM media_delivery_queue WHERE datetime(COALESCE(sent_at,updated_at))>datetime(?) ORDER BY datetime(COALESCE(sent_at,updated_at)),outlet`).bind(since).all()).results||[];}
async function allRows(env){const db=dbOf(env);if(!db)return[];return(await db.prepare(`SELECT mail_code,outlet,email,status,attempts,provider_message_id,last_error_code,last_error,queued_at,updated_at,sent_at FROM media_delivery_queue ORDER BY queued_at,outlet`).all()).results||[];}
function countsLine(counts){return['SENT','QUEUED','SENDING','RETRY','FAILED','REVIEW'].map(status=>`${status}: ${Number(counts[status]||0)}`).join(' | ');}
function rowText(row){const time=clean(row.sent_at||row.updated_at||row.queued_at),error=[clean(row.last_error_code),clean(row.last_error)].filter(Boolean).join(' — ');return`[${clean(row.status)||'UNKNOWN'}] ${clean(row.outlet)||'-'} | ${clean(row.email)||'-'} | ${clean(row.mail_code)||'-'} | ${time||'-'}${error?` | ${error}`:''}`;}
function rowsHtml(rows){if(!rows.length)return'<p>Nema novih promjena u ovom razdoblju.</p>';return`<table style="border-collapse:collapse;width:100%;font:13px Arial"><thead><tr><th>Status</th><th>Medij</th><th>E-mail</th><th>Kod</th><th>Vrijeme</th><th>Greška</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.outlet)}</td><td>${escapeHtml(row.email)}</td><td>${escapeHtml(row.mail_code)}</td><td>${escapeHtml(row.sent_at||row.updated_at||row.queued_at)}</td><td>${escapeHtml([row.last_error_code,row.last_error].filter(Boolean).join(' — '))}</td></tr>`).join('')}</tbody></table>`.replace(/<(td|th)>/g,'<$1 style="border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left">');}
function csv(rows){const header=['status','outlet','email','mail_code','attempts','provider_message_id','last_error_code','last_error','queued_at','updated_at','sent_at'];return'\uFEFF'+[header.map(csvCell).join(','),...rows.map(row=>header.map(key=>csvCell(row[key])).join(','))].join('\r\n');}

async function sendReport(env,{final,snap,rows,periodStart,periodEnd}){
  const to=recipients(env);if(!to.length||!env.EMAIL?.send)throw new Error('Report recipient or EMAIL binding is not configured');
  const sent=Number(snap.counts.SENT||0),failed=Number(snap.counts.FAILED||0),review=Number(snap.counts.REVIEW||0);
  const subject=final?`[GNK-ASG MEDIA OUTREACH][FINAL] ${sent}/${snap.total} sent — failed ${failed}, review ${review}`:`[GNK-ASG MEDIA OUTREACH][HOURLY] ${sent}/${snap.total} sent — active ${snap.active}`;
  const title=final?'ZAVRŠNI KOMPLETNI IZVJEŠTAJ':'SATNI IZVJEŠTAJ SLANJA';
  const text=[title,`Razdoblje: ${periodStart} — ${periodEnd}`,`Ukupno u redu: ${snap.total}`,`Obrađeno: ${snap.processed}`,`Aktivno: ${snap.active}`,countsLine(snap.counts),'',final?'KOMPLETAN POPIS:':'PROMJENE U PROTEKLOM SATU:',...rows.map(rowText),'',`Reporting version: ${VERSION}`].join('\n');
  const html=`<!doctype html><html><body style="font-family:Arial;color:#10233f"><h1>${title}</h1><p><strong>Razdoblje:</strong> ${escapeHtml(periodStart)} — ${escapeHtml(periodEnd)}</p><p><strong>Ukupno:</strong> ${snap.total} &nbsp; <strong>Obrađeno:</strong> ${snap.processed} &nbsp; <strong>Aktivno:</strong> ${snap.active}</p><p>${escapeHtml(countsLine(snap.counts))}</p>${rowsHtml(rows)}<p style="font-size:11px;color:#666">${VERSION}</p></body></html>`;
  const message={to,from:{email:clean(env.MEDIA_OUTREACH_FROM)||'media@gnk-asg.hr',name:'GNK DINAMO Ltd. Group | Media Outreach Reporting'},replyTo:clean(env.MEDIA_OUTREACH_FROM)||'media@gnk-asg.hr',subject,text,html,headers:{'X-GNK-ASG-Report-Version':VERSION,'X-GNK-ASG-Report-Type':final?'FINAL':'HOURLY'}};
  if(final)message.attachments=[{content:new TextEncoder().encode(csv(rows)),filename:`GNK-ASG-media-outreach-final-${periodEnd.slice(0,10)}.csv`,type:'text/csv; charset=utf-8',disposition:'attachment'}];
  const result=await env.EMAIL.send(message);return{messageId:clean(result?.messageId),subject,to};
}

export async function maybeSendOutreachReport(env){
  const snap=await snapshot(env);if(!snap||!snap.total)return{ok:true,skipped:'queue_empty'};
  const state=await readState(env),currentHour=now().slice(0,13),queueChanged=state.queueId!==snap.queueId;
  const base=queueChanged?{queueId:snap.queueId,startedAt:snap.firstQueuedAt,lastReportAt:snap.firstQueuedAt,lastHour:'',finalSent:false}:state;
  if(snap.active===0){
    if(base.finalSent)return{ok:true,skipped:'final_already_sent'};
    const rows=await allRows(env),periodEnd=now(),delivery=await sendReport(env,{final:true,snap,rows,periodStart:base.startedAt||snap.firstQueuedAt,periodEnd});
    await writeState(env,{...base,lastReportAt:periodEnd,lastHour:currentHour,finalSent:true,finalSentAt:periodEnd,finalMessageId:delivery.messageId});
    return{ok:true,type:'FINAL',rows:rows.length,delivery};
  }
  if(base.lastHour===currentHour)return{ok:true,skipped:'hour_already_reported'};
  const periodStart=base.lastReportAt||snap.firstQueuedAt,periodEnd=now(),rows=await rowsSince(env,periodStart),delivery=await sendReport(env,{final:false,snap,rows,periodStart,periodEnd});
  await writeState(env,{...base,lastReportAt:periodEnd,lastHour:currentHour,finalSent:false,lastMessageId:delivery.messageId});
  return{ok:true,type:'HOURLY',rows:rows.length,delivery};
}
