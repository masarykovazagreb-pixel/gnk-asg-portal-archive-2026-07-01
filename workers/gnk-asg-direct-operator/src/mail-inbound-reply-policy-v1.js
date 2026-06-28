export const VERSION='GNK_ASG_MAIL_INBOUND_REPLY_POLICY_V1_20260628';

const clean=(value,max=4000)=>String(value??'').replace(/[\r\n\u0000]+/g,' ').trim().slice(0,max);
const header=(message,name)=>clean(message?.headers?.get?.(name)||message?.headers?.get?.(name.toLowerCase())||'',4000);
const localPart=address=>clean(address,320).toLowerCase().split('@')[0]||'';
const domainPart=address=>clean(address,320).toLowerCase().split('@')[1]||'';

export function autoReplyEligibility(message,{mode='media-only'}={}){
  const from=clean(message?.from,320).toLowerCase();
  const to=clean(message?.to,320).toLowerCase();
  const subject=header(message,'subject').toLowerCase();
  const senderLocal=localPart(from);
  const recipientLocal=localPart(to);
  const senderDomain=domainPart(from);
  const recipientDomain=domainPart(to);
  if(!from.includes('@')||!to.includes('@'))return{eligible:false,reason:'invalid_address'};
  if(senderDomain===recipientDomain)return{eligible:false,reason:'same_domain_sender'};
  if(recipientDomain!=='gnk-asg.hr')return{eligible:false,reason:'recipient_domain_not_allowed'};
  if(/^(no-?reply|mailer-daemon|postmaster|bounce|bounces|daemon|notifications?)($|[+._-])/.test(senderLocal))return{eligible:false,reason:'automated_sender'};
  const autoSubmitted=header(message,'auto-submitted').toLowerCase();
  if(autoSubmitted&&autoSubmitted!=='no')return{eligible:false,reason:'auto_submitted'};
  if(header(message,'list-id'))return{eligible:false,reason:'mailing_list'};
  if(header(message,'x-auto-response-suppress'))return{eligible:false,reason:'auto_response_suppressed'};
  const precedence=header(message,'precedence').toLowerCase();
  if(/bulk|list|junk|auto_reply/.test(precedence))return{eligible:false,reason:'bulk_or_list'};
  if(/out of office|automatic reply|auto.?reply|autoreply|delivery status|delivery failure|undeliverable|returned mail|failure notice|mail delivery subsystem|odsutan|automatski odgovor|neisporučiv/.test(subject))return{eligible:false,reason:'automated_subject'};
  const references=header(message,'references').split(/\s+/).filter(Boolean);
  if(references.length>100)return{eligible:false,reason:'too_many_references'};
  const allowed=mode==='all'
    ? new Set(['info','contact','media','press','legal','privacy','it','ubo','sefic','assistant'])
    : new Set(['media','press']);
  if(!allowed.has(recipientLocal))return{eligible:false,reason:'mailbox_not_enabled'};
  return{eligible:true,reason:'eligible',from,to,recipientLocal};
}

function utf8Base64(value){
  const bytes=new TextEncoder().encode(String(value));
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output='';
  for(let index=0;index<bytes.length;index+=3){
    const a=bytes[index],b=bytes[index+1],c=bytes[index+2];
    output+=alphabet[a>>2];
    output+=alphabet[((a&3)<<4)|((b??0)>>4)];
    output+=b===undefined?'=':alphabet[((b&15)<<2)|((c??0)>>6)];
    output+=c===undefined?'=':alphabet[c&63];
  }
  return output;
}

function quotedSubject(value){
  return`=?UTF-8?B?${utf8Base64(clean(value,500))}?=`;
}

function htmlEscape(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

export function buildAutoReplyContent(record,message){
  const subject=header(message,'subject')||'(bez predmeta)';
  const messageId=header(message,'message-id');
  const existingReferences=header(message,'references');
  const center=record?.receivingCenter||{};
  const centerHr=center.labelHr||[center.cityHr,center.countryHr,center.code].filter(Boolean).join(' · ');
  const centerEn=center.labelEn||[center.cityEn,center.countryEn,center.code].filter(Boolean).join(' · ');
  const caseId=clean(record?.caseId,120);
  const sender=clean(message?.to,320).toLowerCase();
  const recipient=clean(message?.from,320).toLowerCase();
  const boundary=`gnk-asg-${caseId.replace(/[^A-Za-z0-9]/g,'').slice(-24)}`;
  const text=[
    'Poštovani,',
    '',
    'potvrđujemo da je Vaša poruka zaprimljena i evidentirana u komunikacijskom sustavu GNK ASG.',
    `Evidencijski broj: ${caseId}`,
    `Digitalni centar zaprimanja: ${centerHr}`,
    '',
    'Ovo je automatska potvrda primitka i ne predstavlja sadržajni odgovor, prihvat obveze niti potvrdu navoda iz poruke.',
    '',
    'Dear Sender,',
    '',
    'Your message has been received and registered in the GNK ASG communications system.',
    `Reference number: ${caseId}`,
    `Digital communications intake center: ${centerEn}`,
    '',
    'This is an automated receipt confirmation only. It is not a substantive response, acceptance of an obligation, or confirmation of statements contained in the message.',
    '',
    'GNK ASG Media Desk'
  ].join('\r\n');
  const html=`<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#17202b;line-height:1.55"><p>Poštovani,</p><p>potvrđujemo da je Vaša poruka zaprimljena i evidentirana u komunikacijskom sustavu GNK ASG.</p><p><b>Evidencijski broj:</b> ${htmlEscape(caseId)}<br><b>Digitalni centar zaprimanja:</b> ${htmlEscape(centerHr)}</p><p style="color:#5b6470">Ovo je automatska potvrda primitka i ne predstavlja sadržajni odgovor, prihvat obveze niti potvrdu navoda iz poruke.</p><hr><p>Dear Sender,</p><p>Your message has been received and registered in the GNK ASG communications system.</p><p><b>Reference number:</b> ${htmlEscape(caseId)}<br><b>Digital communications intake center:</b> ${htmlEscape(centerEn)}</p><p style="color:#5b6470">This is an automated receipt confirmation only. It is not a substantive response, acceptance of an obligation, or confirmation of statements contained in the message.</p><p><b>GNK ASG Media Desk</b></p></body></html>`;
  const references=[existingReferences,messageId].filter(Boolean).join(' ').trim();
  const headers=[
    `From: GNK ASG Media Desk <${sender}>`,
    `To: ${recipient}`,
    `Subject: ${quotedSubject(`Re: ${subject}`)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${caseId.toLowerCase()}@gnk-asg.hr>`,
    messageId?`In-Reply-To: ${messageId}`:'',
    references?`References: ${references}`:'',
    'Auto-Submitted: auto-replied',
    'X-Auto-Response-Suppress: All',
    'Precedence: bulk',
    `X-GNK-ASG-Case-Id: ${caseId}`,
    `X-GNK-ASG-Receiving-Center: ${clean(center.code,20)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean);
  const raw=[
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    `--${boundary}--`,
    ''
  ].join('\r\n');
  return{sender,recipient,subject:`Re: ${subject}`,text,html,raw};
}
