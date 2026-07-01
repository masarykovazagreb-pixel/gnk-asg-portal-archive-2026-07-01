import {EmailMessage} from 'cloudflare:email';
import {ensureSchema,stateRow,updateState,stats,logEvent,clean,validEmail,int,bucketOf,timestamp} from './campaign-mailer-db-v1.js';
import {ensureMediaHtmlSignature} from './media-email-gold-signature-v1.js';
import {serveTransparentMediaLogo} from './media-email-logo-transparent-v1.js';

export const VERSION='GNK_ASG_CAMPAIGN_MAILER_DELIVERY_V3_20260701_INLINE_CID_LOGO';
const enc=new TextEncoder();
const FROM_DEFAULT='media@gnk-asg.hr';
const SENDER_DEFAULT='GNK ASG Media Relations';
const LOGO_CID='gnk-asg-media-logo';

function merge(template,contact){
  const values={
    ime:contact.ime||'',prezime:contact.prezime||'',email:contact.email||'',
    personalizacija:contact.personalizacija||'',medij:contact.medij||'',
    kome_ide:contact.kome_ide||'',drzava:contact.drzava||'',regija:contact.regija||'',jezik:contact.jezik||''
  };
  return String(template||'').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi,(_,key)=>values[String(key).toLowerCase()]??'');
}

function inject(html,extra,contact){
  const value=merge(extra,contact).trim();
  if(!value)return html;
  const safe=value.replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char])).replace(/\r?\n/g,'<br>');
  const part=`<div style="margin-top:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222">${safe}</div>`;
  return /<\/body>/i.test(html)?html.replace(/<\/body>/i,part+'</body>'):html+part;
}

function text(html){
  return String(html||'')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/(?:p|div|tr|table|h[1-6]|li)>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/[ \t]+/g,' ')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}

function b64(bytes){
  let output='';
  const value=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  for(let index=0;index<value.length;index+=32768)output+=String.fromCharCode(...value.subarray(index,index+32768));
  return btoa(output);
}

const fold=value=>String(value).replace(/.{1,76}/g,'$&\r\n').trimEnd();
const u64=value=>fold(b64(enc.encode(String(value||''))));
const word=value=>`=?UTF-8?B?${b64(enc.encode(String(value||'')))}?=`;
const header=value=>clean(value).replace(/[\r\n]+/g,' ');

async function logoBytes(){
  const response=serveTransparentMediaLogo(new Request('https://gnk-asg.hr/assets/gnk-asg-email-logo-transparent.png'));
  if(!response.ok)throw new Error('Campaign Mailer logo is unavailable');
  return new Uint8Array(await response.arrayBuffer());
}

function cidHtml(value){
  return String(value||'').replace(/src=["']https:\/\/gnk-asg\.hr\/assets\/gnk-asg-email-logo-(?:transparent|final)\.png[^"']*["']/gi,`src="cid:${LOGO_CID}"`);
}

function relatedParts(boundary,alternative,html,plain,logo){
  return[
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${alternative}"`,
    '',
    `--${alternative}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    u64(plain),
    `--${alternative}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    u64(html),
    `--${alternative}--`,
    '',
    `--${boundary}`,
    'Content-Type: image/png; name="gnk-asg-logo.png"',
    'Content-Disposition: inline; filename="gnk-asg-logo.png"',
    `Content-ID: <${LOGO_CID}>`,
    `X-Attachment-Id: ${LOGO_CID}`,
    'Content-Transfer-Encoding: base64',
    '',
    fold(b64(logo)),
    `--${boundary}--`,
    ''
  ];
}

async function raw(env,to,subject,html,row){
  const from=clean(env.CAMPAIGN_MAILER_FROM||env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT;
  const name=clean(env.CAMPAIGN_MAILER_SENDER_NAME)||SENDER_DEFAULT;
  const related=`rel_${crypto.randomUUID().replace(/-/g,'')}`;
  const alternative=`alt_${crypto.randomUUID().replace(/-/g,'')}`;
  const mixed=`mix_${crypto.randomUUID().replace(/-/g,'')}`;
  const embeddedHtml=cidHtml(html);
  const plain=text(embeddedHtml);
  const logo=await logoBytes();
  const lines=[
    `From: ${word(name)} <${from}>`,
    `To: ${to}`,
    `Reply-To: ${from}`,
    `Subject: ${word(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@gnk-asg.hr>`,
    'MIME-Version: 1.0',
    `X-GNK-ASG-Campaign-Mailer: ${VERSION}`,
    `X-GNK-ASG-Inline-Logo: ${LOGO_CID}`
  ];

  const key=clean(row.attachment_r2_key);
  const bucket=bucketOf(env);
  let attachment=null;
  if(key&&bucket){
    const object=await bucket.get(key);
    if(object)attachment={
      bytes:new Uint8Array(await object.arrayBuffer()),
      filename:header(row.attachment_original_name||'attachment.pdf').replace(/"/g,''),
      mimeType:row.attachment_mime_type||'application/pdf'
    };
  }

  if(attachment){
    lines.push(`Content-Type: multipart/mixed; boundary="${mixed}"`,'',`--${mixed}`,`Content-Type: multipart/related; boundary="${related}"`,'');
    lines.push(...relatedParts(related,alternative,embeddedHtml,plain,logo));
    lines.push(
      `--${mixed}`,
      `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      fold(b64(attachment.bytes)),
      `--${mixed}--`,
      ''
    );
    return lines.join('\r\n');
  }

  lines.push(`Content-Type: multipart/related; boundary="${related}"`,'');
  lines.push(...relatedParts(related,alternative,embeddedHtml,plain,logo));
  return lines.join('\r\n');
}

async function rate(env){
  const db=await ensureSchema(env);
  const hour=int(env.CAMPAIGN_MAILER_MAX_PER_HOUR||env.MEDIA_OUTREACH_MAX_PER_HOUR,20,1,1000);
  const day=int(env.CAMPAIGN_MAILER_MAX_PER_DAY||env.MEDIA_OUTREACH_MAX_PER_DAY,400,1,10000);
  const h=Number((await db.prepare(`SELECT COUNT(*) c FROM campaign_mailer_events WHERE event_type='sent' AND strftime('%s',created_at)>=strftime('%s','now','-1 hour')`).first())?.c||0);
  const d=Number((await db.prepare(`SELECT COUNT(*) c FROM campaign_mailer_events WHERE event_type='sent' AND strftime('%s',created_at)>=strftime('%s','now','-1 day')`).first())?.c||0);
  return{ok:h<hour&&d<day,hour:{used:h,limit:hour},day:{used:d,limit:day}};
}

async function blocked(env,email){
  const db=await ensureSchema(env);
  try{return Boolean(await db.prepare(`SELECT email FROM media_suppressions WHERE LOWER(email)=LOWER(?)`).bind(email).first())}
  catch{return false}
}

async function deliver(env,contact,row){
  if(!validEmail(contact.email))throw new Error('Nevažeći format email adrese');
  if(await blocked(env,contact.email))throw new Error('Adresa je na suppression listi');
  const limit=await rate(env);
  if(!limit.ok)throw new Error('Dosegnut je sigurnosni limit slanja');
  if(!env.EMAIL?.send)throw new Error('Cloudflare EMAIL binding nije konfiguriran');
  const subject=header(merge(row.subject,contact));
  if(!subject)throw new Error('Predmet poruke je prazan');
  const from=clean(env.CAMPAIGN_MAILER_FROM||env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT;
  const body=merge(inject(row.body_html,row.extra_text,contact),contact);
  if(!text(body))throw new Error('Tijelo poruke je prazno');
  const html=ensureMediaHtmlSignature(body,FROM_DEFAULT);
  await env.EMAIL.send(new EmailMessage(from,contact.email,await raw(env,contact.email,subject,html,row)));
  const copy=clean(env.MAIL_MANDATORY_BCC);
  if(validEmail(copy)&&copy.toLowerCase()!==contact.email.toLowerCase()){
    await env.EMAIL.send(new EmailMessage(from,copy,await raw(env,copy,`[COPY] ${subject}`,html,row)));
  }
  return{subject};
}

const delay=row=>{
  const base=int(row.delay_seconds,240,60,86400);
  const jitter=int(row.jitter_seconds,30,0,3600);
  const offset=jitter?Math.floor(Math.random()*(jitter*2+1))-jitter:0;
  return Math.max(60,base+offset);
};

export async function runQueue(env,{force=false}={}){
  const db=await ensureSchema(env),row=await stateRow(env);
  if(row.status!=='running')return{ok:true,skipped:'not_running'};
  if(!force&&row.next_send_at&&Date.parse(row.next_send_at)>Date.now())return{ok:true,skipped:'not_due',nextSendAt:row.next_send_at};
  const contact=await db.prepare(`SELECT * FROM campaign_mailer_contacts WHERE status='pending' ORDER BY priority,id LIMIT 1`).first();
  if(!contact){await updateState(env,{status:'completed',next_send_at:null});await logEvent(env,'completed');return{ok:true,completed:true}}
  await db.prepare(`UPDATE campaign_mailer_contacts SET status='sending',updated_at=? WHERE id=?`).bind(timestamp(),contact.id).run();
  await updateState(env,{cursor_contact_id:contact.id});
  try{
    const result=await deliver(env,contact,row),stamp=timestamp();
    await db.prepare(`UPDATE campaign_mailer_contacts SET status='sent',error_reason='',attempts=attempts+1,sent_at=?,updated_at=? WHERE id=?`).bind(stamp,stamp,contact.id).run();
    await logEvent(env,'sent',{contactId:contact.id,email:contact.email,subject:result.subject});
  }catch(error){
    const attempts=Number(contact.attempts||0)+1,max=int(row.max_retries,3,1,10),final=attempts>=max;
    await db.prepare(`UPDATE campaign_mailer_contacts SET status=?,error_reason=?,attempts=?,updated_at=? WHERE id=?`).bind(final?'failed':'pending',String(error?.message||error).slice(0,500),attempts,timestamp(),contact.id).run();
    await logEvent(env,final?'failed':'retry',{contactId:contact.id,email:contact.email,error:String(error?.message||error),detail:{attempts,max}});
  }
  const remaining=Number((await db.prepare(`SELECT COUNT(*) c FROM campaign_mailer_contacts WHERE status='pending'`).first())?.c||0);
  if(!remaining){await updateState(env,{status:'completed',next_send_at:null});await logEvent(env,'completed');return{ok:true,completed:true}}
  const next=new Date(Date.now()+delay(row)*1000).toISOString();
  await updateState(env,{status:'running',next_send_at:next});
  return{ok:true,nextSendAt:next,remaining};
}

export async function start(env){
  const row=await stateRow(env),summary=await stats(env);
  if(!clean(row.subject)||!text(row.body_html))throw new Error('Kampanja nema naslov ili sadržaj');
  if(!summary.pending)throw new Error('Nema kontakata na čekanju');
  await updateState(env,{status:'running',started_at:timestamp(),next_send_at:timestamp()});
  await logEvent(env,'started');
  return runQueue(env,{force:true});
}

export async function pause(env){
  const row=await stateRow(env);
  if(row.status!=='running')throw new Error('Kampanja nije aktivna');
  const db=await ensureSchema(env);
  await updateState(env,{status:'paused'});
  await db.prepare(`UPDATE campaign_mailer_contacts SET status='pending',updated_at=? WHERE status='sending'`).bind(timestamp()).run();
  await logEvent(env,'paused');
  return{ok:true};
}

export async function resume(env){
  const row=await stateRow(env);
  if(!['paused','stopped'].includes(row.status))throw new Error('Kampanja nije pauzirana ili zaustavljena');
  await updateState(env,{status:'running',next_send_at:timestamp()});
  await logEvent(env,'resumed');
  return runQueue(env,{force:true});
}

export async function stop(env){
  const db=await ensureSchema(env);
  await updateState(env,{status:'stopped',next_send_at:null});
  await db.prepare(`UPDATE campaign_mailer_contacts SET status='pending',updated_at=? WHERE status='sending'`).bind(timestamp()).run();
  await logEvent(env,'stopped');
  return{ok:true};
}

export async function reset(env){
  const db=await ensureSchema(env);
  await stop(env);
  await db.prepare(`UPDATE campaign_mailer_contacts SET status='pending',error_reason='',attempts=0,sent_at=NULL,updated_at=?`).bind(timestamp()).run();
  await updateState(env,{status:'draft',cursor_contact_id:null,started_at:null,next_send_at:null});
  await logEvent(env,'reset');
  return{ok:true};
}
