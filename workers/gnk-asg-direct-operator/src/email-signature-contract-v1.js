export const VERSION='GNK_ASG_EMAIL_SIGNATURE_CONTRACT_V1_20260627_R8_SAFE_BCC';
export const MANDATORY_BCC='rht@gmx.com';

const COMPANY={
  name:'GNK ASG d.o.o.',
  address:'Zagrebačka cesta 130, 10090 Zagreb',
  oib:'75227917632',
  mbs:'081512375',
  web:'https://gnk-asg.hr',
  logo:'https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png'
};

const clean=value=>String(value??'').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);
const phonePattern=/(?:\+?385\s*\(?0?\)?\s*91\s*610\s*4398|\+?385\s*91\s*535\s*8365|0?91\s*535\s*8365)/gi;
const whatsAppPattern=/(?:https?:\/\/)?(?:www\.)?wa\.me\/\d+\/?/gi;

function parseEmails(value){
  const result=[];
  const add=item=>{
    if(Array.isArray(item)){item.forEach(add);return;}
    if(item&&typeof item==='object'){add(item.email||item.address||'');return;}
    String(item??'').split(/[;,\s]+/).forEach(part=>{const email=clean(part).toLowerCase();if(email)result.push(email);});
  };
  add(value);
  return [...new Set(result)];
}
function mandatoryBcc(value,to,cc){
  const visible=new Set([...parseEmails(to),...parseEmails(cc)]);
  const list=parseEmails(value).filter(email=>!visible.has(email));
  if(!visible.has(MANDATORY_BCC)&&!list.includes(MANDATORY_BCC))list.push(MANDATORY_BCC);
  return list.join(', ');
}
function sender(payload={}){
  const from=payload.from;
  if(from&&typeof from==='object'){
    return{
      name:clean(from.name)||'GNK ASG Info Desk',
      email:clean(from.email)||'info@gnk-asg.hr'
    };
  }
  const raw=clean(from);
  const match=raw.match(/^(.*?)\s*<([^>]+)>$/);
  if(match)return{name:clean(match[1])||'GNK ASG Info Desk',email:clean(match[2])||'info@gnk-asg.hr'};
  return{name:'GNK ASG Info Desk',email:raw||'info@gnk-asg.hr'};
}

function normalizeTextContact(value){
  return String(value||'')
    .split(/\r?\n/)
    .filter(line=>{
      const text=String(line||'');
      if(phonePattern.test(text)){phonePattern.lastIndex=0;return false;}
      phonePattern.lastIndex=0;
      if(whatsAppPattern.test(text)){whatsAppPattern.lastIndex=0;return false;}
      whatsAppPattern.lastIndex=0;
      return !/^\s*(?:telefon|kontakt|phone|tel\.?|mobile|mobitel|whatsapp)\s*:\s*$/i.test(text);
    })
    .join('\n')
    .replace(phonePattern,'')
    .replace(whatsAppPattern,'')
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}
function normalizeHtmlContact(value){
  let html=String(value||'');
  html=html
    .replace(/<div\b[^>]*data-gnk-asg-contact=["'][^"']*["'][^>]*>[\s\S]*?<\/div>/gi,'')
    .replace(/<div\b[^>]*>\s*(?:<strong[^>]*>\s*)?(?:Telefon|Kontakt|Phone|Tel\.?|Mobile|Mobitel|WhatsApp)\s*:?\s*(?:<\/strong>\s*)?(?:<[^>]+>\s*)*(?:(?:https?:\/\/)?(?:www\.)?wa\.me\/\d+\/?|(?:\+?385\s*\(?0?\)?\s*91\s*610\s*4398|\+?385\s*91\s*535\s*8365|0?91\s*535\s*8365))[\s\S]*?<\/div>/gi,'')
    .replace(/<a\b[^>]*href=["'][^"']*wa\.me[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,'')
    .replace(phonePattern,'')
    .replace(whatsAppPattern,'')
    .replace(/<div\b[^>]*>\s*(?:<strong[^>]*>\s*)?(?:Telefon|Kontakt|Phone|Tel\.?|Mobile|Mobitel|WhatsApp)\s*:?\s*(?:<\/strong>\s*)?<\/div>/gi,'')
    .replace(/<div\b[^>]*>\s*<\/div>/gi,'');
  return html;
}
function signatureText(identity){
  return[
    identity.name,
    COMPANY.name,
    COMPANY.address,
    `OIB: ${COMPANY.oib} · MBS: ${COMPANY.mbs}`,
    `Web: ${COMPANY.web}`,
    `E-mail: ${identity.email}`
  ].join('\n');
}

function hasTextSignature(value){
  const text=clean(value).toLowerCase();
  return text.includes('gnk asg d.o.o.')&&text.includes(COMPANY.oib)&&text.includes('gnk-asg.hr');
}
function hasHtmlSignature(value){
  const html=clean(value).toLowerCase();
  return html.includes('data-gnk-asg-signature=')||html.includes('gnk-asg-email-logo-final.png')||(html.includes('gnk asg d.o.o.')&&html.includes(COMPANY.oib));
}
function closing(text){
  const closings=/(srdačan pozdrav|s poštovanjem|lijep pozdrav|lep pozdrav|kind regards|best regards|regards|mit freundlichen grüßen|freundliche grüße|cordialement|bien cordialement|cordiali saluti|saluti cordiali|saludos cordiales|atentamente|cumprimentos|med vänliga hälsningar|venlig hilsen|pozdrawiam|s úctou|с уважением)[,!]?\s*$/iu;
  return closings.test(clean(text))?'':'Srdačan pozdrav,\n\n';
}
function appendText(value,identity){
  const text=normalizeTextContact(clean(value));
  if(hasTextSignature(text))return text;
  return `${text}${text?'\n\n':''}${closing(text)}${signatureText(identity)}`;
}
function paragraphs(value){
  return clean(value).split(/\n{2,}/).filter(Boolean).map(part=>`<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(part).replace(/\n/g,'<br>')}</p>`).join('');
}
function signatureHtml(identity){
  return `<table data-gnk-asg-signature="${VERSION}" role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;margin-top:24px;max-width:720px;width:100%;border-top:1px solid #d9d9d9"><tr><td width="170" valign="top" style="width:170px;padding:16px 22px 8px 0"><a href="${COMPANY.web}" style="text-decoration:none"><img src="${COMPANY.logo}" width="150" alt="GNK ASG" style="display:block;width:150px;max-width:150px;height:auto;border:0"></a></td><td valign="top" style="padding:18px 0 8px;color:#111827;font-size:14px;line-height:1.48"><div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:6px">${escapeHtml(identity.name)}</div><div>${escapeHtml(COMPANY.name)}</div><div>${escapeHtml(COMPANY.address)}</div><div>OIB: ${COMPANY.oib} · MBS: ${COMPANY.mbs}</div><div>Web: <a href="${COMPANY.web}" style="color:#111827">${COMPANY.web}</a></div><div>E-mail: <a href="mailto:${escapeHtml(identity.email)}" style="color:#111827">${escapeHtml(identity.email)}</a></div></td></tr></table>`;
}
function appendHtml(value,text,identity){
  const html=normalizeHtmlContact(clean(value)||paragraphs(text));
  if(hasHtmlSignature(html))return html;
  return `${html}${signatureHtml(identity)}`;
}

export function enforceRequiredSignature(payload={}){
  const identity=sender(payload);
  const originalText=normalizeTextContact(clean(payload.text||payload.body||payload.plainText));
  const originalHtml=normalizeHtmlContact(clean(payload.html||payload.bodyHtml||payload.htmlBody));
  const next={
    ...payload,
    text:appendText(originalText,identity),
    html:appendHtml(originalHtml,originalText,identity),
    headers:{...(payload.headers||{}),'X-GNK-ASG-Signature-Contract':VERSION,'X-GNK-ASG-Mandatory-Copy':'ENFORCED'}
  };
  const bcc=mandatoryBcc(payload.bcc,payload.to,payload.cc);
  if(bcc)next.bcc=bcc;
  else delete next.bcc;
  return next;
}

export function withRequiredEmailSignature(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{send(payload){return binding.send.call(binding,enforceRequiredSignature(payload));}}
  });
  return wrapped;
}
