import { EmailMessage } from 'cloudflare:email';
import { sendExternalMail, providerStatus } from './outbound-provider.js';

const MAILBOXES = {
  info:{label:'Info',address:'info@gnk-asg.hr'},
  contact:{label:'Kontakt',address:'contact@gnk-asg.hr'},
  it:{label:'IT podrška',address:'it@gnk-asg.hr'},
  legal:{label:'Legal',address:'legal@gnk-asg.hr'},
  privacy:{label:'Privatnost / GDPR',address:'privacy@gnk-asg.hr'},
  media:{label:'Media',address:'media@gnk-asg.hr'},
  press:{label:'Press',address:'press@gnk-asg.hr'},
  ubo:{label:'UBO / korporativni podatci',address:'ubo@gnk-asg.hr'},
  sefic:{label:'Ured Nermina Sefića',address:'sefic@gnk-asg.hr'},
  assistant:{label:'IT – Osobni digitalni asistent',address:'assistant@gnk-asg.hr'}
};

function headers(origin='https://gnk-asg.hr') {
  return {
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, max-age=0',
    'access-control-allow-origin':origin === 'https://www.gnk-asg.hr' ? origin : 'https://gnk-asg.hr',
    'access-control-allow-methods':'GET,POST,OPTIONS',
    'access-control-allow-headers':'content-type',
    vary:'Origin'
  };
}

function json(request,data,status=200) {
  return new Response(JSON.stringify(data,null,2),{status,headers:headers(request.headers.get('origin') || '')});
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function mailboxKey(value) {
  const key = String(value || 'info').trim().toLowerCase();
  return MAILBOXES[key] ? key : 'info';
}

function caseId() {
  return `GNK-ASG-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
}

function cleanHeader(value) {
  return String(value || '').replace(/[\r\n]+/g,' ').trim().slice(0,240);
}

function base64(bytes) {
  let binary='';
  for(let index=0;index<bytes.length;index+=0x8000) binary+=String.fromCharCode(...bytes.subarray(index,Math.min(index+0x8000,bytes.length)));
  return btoa(binary);
}

function fold(value) {
  return String(value || '').replace(/(.{76})/g,'$1\r\n');
}

function internalMime({from,to,replyTo,subject,text,pdfBytes,pdfName}) {
  const boundary=`gnk_${crypto.randomUUID().replace(/-/g,'')}`;
  const lines=[
    `From: GNK ASG Contact <${from}>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${cleanHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    ''
  ];
  if(pdfBytes?.length){
    lines.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="${cleanHeader(pdfName || 'attachment.pdf')}"`,
      `Content-Disposition: attachment; filename="${cleanHeader(pdfName || 'attachment.pdf')}"`,
      'Content-Transfer-Encoding: base64',
      '',
      fold(base64(pdfBytes)),
      ''
    );
  }
  lines.push(`--${boundary}--`,'');
  return lines.join('\r\n');
}

async function rateLimit(request,env) {
  if(!env.GNK_ASG_KV) return true;
  const ip=request.headers.get('cf-connecting-ip') || 'unknown';
  const key=`contact-rate:${ip}:${new Date().toISOString().slice(0,13)}`;
  const count=Number(await env.GNK_ASG_KV.get(key) || 0);
  if(count>=8) return false;
  await env.GNK_ASG_KV.put(key,String(count+1),{expirationTtl:7200});
  return true;
}

async function saveRecord(env,record) {
  const result={kvSaved:false,d1Saved:false,kvError:null,d1Error:null};
  try{
    if(env.GNK_ASG_KV){
      await env.GNK_ASG_KV.put(`contact:${record.caseId}`,JSON.stringify(record));
      const raw=await env.GNK_ASG_KV.get('contact:inbox');
      const current=raw ? JSON.parse(raw) : [];
      await env.GNK_ASG_KV.put('contact:inbox',JSON.stringify([record,...(Array.isArray(current)?current:[])].slice(0,500)));
      result.kvSaved=true;
    }
  }catch(error){result.kvError=String(error?.message || error)}
  try{
    if(env.GNK_ASG_D1){
      await env.GNK_ASG_D1.prepare('CREATE TABLE IF NOT EXISTS contact_messages (case_id TEXT PRIMARY KEY, received_at TEXT, name TEXT, email TEXT, phone TEXT, mailbox_key TEXT, recipient_email TEXT, subject TEXT, message TEXT, attachment_key TEXT, internal_mail_sent INTEGER, auto_reply_sent INTEGER, raw_json TEXT)').run();
      await env.GNK_ASG_D1.prepare('INSERT OR REPLACE INTO contact_messages (case_id,received_at,name,email,phone,mailbox_key,recipient_email,subject,message,attachment_key,internal_mail_sent,auto_reply_sent,raw_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(record.caseId,record.receivedAt,record.name,record.email,record.phone,record.mailboxKey,record.recipientEmail,record.subject,record.message,record.attachmentKey,record.internalMail.sent?1:0,record.autoReply.sent?1:0,JSON.stringify(record)).run();
      result.d1Saved=true;
    }
  }catch(error){result.d1Error=String(error?.message || error)}
  return result;
}

async function parsePayload(request) {
  const type=String(request.headers.get('content-type') || '').toLowerCase();
  if(type.includes('application/json')){
    const data=await request.json();
    return {data,pdf:null};
  }
  const form=await request.formData();
  return {data:Object.fromEntries([...form.entries()].filter(([,value])=>typeof value === 'string')),pdf:form.get('pdf')};
}

async function submit(request,env) {
  if(!await rateLimit(request,env)) return json(request,{ok:false,error:'rate_limited',message:'Previše pokušaja. Pokušajte ponovno kasnije.'},429);
  let parsed;
  try{parsed=await parsePayload(request)}catch{return json(request,{ok:false,error:'invalid_payload',message:'Forma nije pravilno poslana.'},400)}
  const data=parsed.data || {};
  if(String(data.website || '').trim()) return json(request,{ok:true,accepted:true});

  const key=mailboxKey(data.mailbox || data.department);
  const mailbox=MAILBOXES[key];
  const name=String(data.name || data.fullName || '').trim();
  const email=String(data.email || data.senderEmail || '').trim().toLowerCase();
  const phone=String(data.phone || '').trim();
  const subject=String(data.subject || '').trim();
  const message=String(data.message || data.body || '').trim();
  const consent=String(data.consent || data.consentValue || '').toLowerCase();
  if(!name || !validEmail(email) || !subject || !message || !['yes','true','1'].includes(consent)) return json(request,{ok:false,error:'missing_fields',message:'Ispunite sva obvezna polja i potvrdite privolu.'},400);

  const id=caseId();
  const receivedAt=new Date().toISOString();
  let pdfBytes=null;
  let attachmentName='';
  let attachmentKey='';
  let r2Saved=false;
  let r2Error=null;
  const pdf=parsed.pdf;
  if(pdf && typeof pdf.arrayBuffer === 'function' && Number(pdf.size || 0)>0){
    attachmentName=String(pdf.name || 'attachment.pdf');
    if(Number(pdf.size || 0)>10*1024*1024) return json(request,{ok:false,error:'attachment_too_large',message:'PDF može imati najviše 10 MB.'},413);
    if(!attachmentName.toLowerCase().endsWith('.pdf') && String(pdf.type || '').toLowerCase()!=='application/pdf') return json(request,{ok:false,error:'invalid_attachment',message:'Dopušten je samo PDF.'},400);
    pdfBytes=new Uint8Array(await pdf.arrayBuffer());
    attachmentKey=`contact-pdf/${id}/${attachmentName.replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,140)}`;
    try{
      if(env.GNK_ASG_MEDIA_ASSETS){
        await env.GNK_ASG_MEDIA_ASSETS.put(attachmentKey,pdfBytes,{httpMetadata:{contentType:'application/pdf'},customMetadata:{caseId:id,originalName:attachmentName,uploadedAt:receivedAt}});
        r2Saved=true;
      }
    }catch(error){r2Error=String(error?.message || error)}
  }

  const internalTo=env.CONTACT_TO_EMAIL || 'rht@gmx.com';
  const internalText=[
    'Zaprimljen je novi upit putem GNK ASG kontakt forme.','',
    `Evidencijski broj: ${id}`,
    `Vrijeme: ${receivedAt}`,
    `Odjel: ${mailbox.label}`,
    `Odabrana adresa: ${mailbox.address}`,
    `Ime / naziv: ${name}`,
    `E-mail: ${email}`,
    `Telefon: ${phone || 'nije naveden'}`,
    `Predmet: ${subject}`,
    `PDF: ${attachmentName || 'nije priložen'}`,'','Poruka:',message
  ].join('\n');

  const confirmation=[
    `Poštovani ${name},`,'',
    `primili smo Vaš upit upućen odjelu ${mailbox.label} (${mailbox.address}).`,
    `Evidencijski broj Vašeg upita je ${id}.`,'',
    'Vaša poruka je evidentirana i proslijeđena odgovarajućem odjelu. Odgovorit ćemo Vam čim upit bude obrađen.','',
    'Srdačan pozdrav,',mailbox.label,'GNK ASG d.o.o.','https://gnk-asg.hr'
  ].join('\n');

  const internalMail={attempted:false,sent:false,error:null,messageId:null};
  try{
    internalMail.attempted=true;
    const raw=internalMime({from:mailbox.address,to:internalTo,replyTo:email,subject:`[${id}] ${subject}`,text:internalText,pdfBytes,pdfName:attachmentName});
    const response=await env.EMAIL.send(new EmailMessage(mailbox.address,internalTo,raw));
    internalMail.sent=true;
    internalMail.messageId=response?.messageId || null;
  }catch(error){internalMail.error=String(error?.message || error)}

  const autoReply={attempted:true,sent:false,error:null,messageId:null,provider:null};
  try{
    const response=await sendExternalMail(env,{
      from:mailbox.address,
      fromName:`GNK ASG · ${mailbox.label}`,
      to:email,
      replyTo:mailbox.address,
      subject:`Potvrda zaprimanja upita ${id}`,
      text:confirmation,
      html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">${esc(confirmation).replace(/\n/g,'<br>')}</div>`,
      caseId:id,
      source:'contact-auto-reply'
    });
    autoReply.sent=true;
    autoReply.messageId=response?.messageId || null;
    autoReply.provider=response?.provider || null;
  }catch(error){autoReply.error=String(error?.message || error)}

  const record={caseId:id,receivedAt,mailboxKey:key,recipientEmail:mailbox.address,name,email,phone,subject,message,attachmentKey,attachmentName,r2Saved,r2Error,internalMail,autoReply,outboundProvider:providerStatus(env),status:'received',source:'gnk-asg-contact-api-v4'};
  const storage=await saveRecord(env,record);

  return json(request,{
    ok:true,
    worker:'gnk-asg-contact-api',
    caseId:id,
    receivedAt,
    selectedMailbox:mailbox.address,
    selectedMailboxLabel:mailbox.label,
    internalForward:internalTo,
    message:'Upit je zaprimljen.',
    confirmation,
    attachmentStatus:attachmentName || 'nije priložen',
    attachmentKey:attachmentKey || null,
    r2Saved,
    internalMail,
    autoReply,
    storage
  });
}

function page(language='hr') {
  const en=language==='en';
  const options=Object.entries(MAILBOXES).map(([key,item])=>`<option value="${esc(key)}">${esc(item.label)} — ${esc(item.address)}</option>`).join('');
  return `<!doctype html><html lang="${en?'en':'hr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${en?'Contact':'Kontakt'} | GNK ASG</title><meta name="robots" content="index,follow"><style>*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0,#15305a,#07101f 36%,#03060d);color:#f8fafc;font-family:Arial,sans-serif;min-height:100vh}.wrap{max-width:1180px;margin:auto;padding:30px 18px}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.top a{color:#f1d37a;text-decoration:none;font-weight:800}.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:18px}.card{background:#0b1424;border:1px solid rgba(212,175,55,.34);border-radius:24px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.35)}h1,h2{font-family:Georgia,serif;color:#f1d37a}label{display:block;margin:10px 0 6px;font-weight:800;color:#d8e0ec}input,select,textarea{width:100%;padding:12px;border:1px solid rgba(212,175,55,.35);border-radius:13px;background:#fff;color:#07101f;font:inherit}textarea{min-height:150px}.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.consent{display:flex;gap:10px;font-size:13px;color:#c5d0de}.consent input{width:auto}.actions{display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap}button{border:0;border-radius:999px;padding:12px 18px;background:linear-gradient(135deg,#b98b2d,#f1d37a);font-weight:900;color:#07101f;cursor:pointer}.status{white-space:pre-wrap;background:rgba(255,255,255,.06);border-radius:16px;padding:16px;min-height:180px;line-height:1.55;color:#dbe4ef}.status.ok{border:1px solid rgba(34,197,94,.48)}.status.bad{border:1px solid rgba(249,112,102,.55)}.case{color:#f1d37a;font-weight:900}@media(max-width:800px){.grid,.two{grid-template-columns:1fr}}</style></head><body><main class="wrap"><div class="top"><strong style="font-size:24px;color:#f1d37a">GNK ASG</strong><a href="${en?'/en/':'/'}">${en?'Home':'Početna'}</a></div><h1>${en?'Contact GNK ASG':'Kontaktirajte GNK ASG'}</h1><p>${en?'Select a department and send your inquiry.':'Odaberite odjel i pošaljite upit.'}</p><div class="grid"><section class="card"><form id="contactForm"><label>${en?'Department':'Odjel'}</label><select name="mailbox">${options}</select><div class="two"><div><label>${en?'Name / company':'Ime i prezime / naziv'}</label><input name="name" required></div><div><label>E-mail</label><input name="email" type="email" required></div></div><div class="two"><div><label>${en?'Phone':'Telefon'}</label><input name="phone"></div><div><label>${en?'Subject':'Predmet'}</label><input name="subject" value="${en?'Inquiry via GNK ASG portal':'Upit putem GNK ASG portala'}" required></div></div><label>${en?'Message':'Poruka'}</label><textarea name="message" required></textarea><label>${en?'PDF attachment, optional':'PDF prilog, neobvezno'}</label><input name="pdf" type="file" accept="application/pdf,.pdf"><label class="consent"><input name="consent" type="checkbox" value="yes" required><span>${en?'I consent to processing the submitted data for responding to this inquiry.':'Suglasan/suglasna sam s obradom dostavljenih podataka radi odgovora na upit.'}</span></label><div class="actions"><button type="submit">${en?'Send inquiry':'Pošalji upit'}</button></div></form></section><aside class="card"><h2>${en?'Confirmation':'Potvrda zaprimanja'}</h2><div id="status" class="status">${en?'Ready.':'Spremno za slanje.'}</div></aside></div></main><script>const en=${en?'true':'false'};const form=document.getElementById('contactForm');const status=document.getElementById('status');form.addEventListener('submit',async event=>{event.preventDefault();status.className='status';status.textContent=en?'Sending…':'Slanje…';const button=form.querySelector('button');button.disabled=true;try{const payload=new FormData(form);payload.set('consent',form.querySelector('[name=consent]').checked?'yes':'no');const response=await fetch('/api/contact-submit?cb='+Date.now(),{method:'POST',body:payload,cache:'no-store'});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.message||data.error||('HTTP '+response.status));status.className='status ok';status.innerHTML=(en?'Inquiry received. Case number: ':'Upit je zaprimljen. Evidencijski broj: ')+'<span class="case">'+data.caseId+'</span><br><br>'+(data.autoReply?.sent?(en?'Confirmation e-mail sent.':'Potvrda je poslana na Vaš e-mail.'):(en?'Inquiry was saved, but e-mail confirmation is temporarily unavailable.':'Upit je spremljen, ali potvrda e-mailom trenutačno nije dostupna.'))+'<br>'+(data.internalMail?.sent?(en?'Internal notification sent.':'Interna obavijest je poslana.'):'');form.reset()}catch(error){status.className='status bad';status.textContent=error.message||String(error)}finally{button.disabled=false}});</script></body></html>`;
}

export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    const path=url.pathname.replace(/\/+$/,'') || '/';
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:headers(request.headers.get('origin') || '')});
    if(request.method==='GET' && path==='/api/contact-mailboxes') return json(request,{ok:true,mailboxes:Object.entries(MAILBOXES).map(([key,value])=>({key,...value})),outboundProvider:providerStatus(env)});
    if(request.method==='GET' && path==='/api/contact-submit') return json(request,{ok:true,service:'GNK ASG Contact API V4',mailboxes:Object.entries(MAILBOXES).map(([key,value])=>({key,...value})),outboundProvider:providerStatus(env),updatedAt:new Date().toISOString()});
    if(request.method==='POST' && path==='/api/contact-submit') return submit(request,env);
    if(request.method==='GET' && (path==='/contact' || path==='/en/contact')) return new Response(page(path.startsWith('/en/')?'en':'hr'),{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0','x-gnk-asg-contact':'v4'}});
    return json(request,{ok:false,error:'not_found',path},404);
  }
};
