export const VERSION='GNK_ASG_MEDIA_EMAIL_GOLD_SIGNATURE_V1_20260701';
export const MEDIA_EMAIL='media@gnk-asg.hr';
export const MEDIA_LOGO='https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png';
export const MEDIA_SIGNATURE_TEXT=[
  'GNK DINAMO Ltd. Group',
  'Media Relations & Accreditation Center',
  'Organised by GNK ASG Media Center',
  MEDIA_EMAIL,
  'https://gnk-asg.hr'
].join('\n');

const GOLD='#b88a2f';
const clean=value=>String(value??'').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);

function identity(from){
  if(from&&typeof from==='object')return clean(from.email||from.address).toLowerCase();
  const raw=clean(from),match=raw.match(/<([^>]+)>/);
  return clean(match?.[1]||raw).toLowerCase();
}

export function isMediaSender(from){return identity(from)===MEDIA_EMAIL;}

function hasSignature(value){
  const text=clean(value).toLowerCase();
  return text.includes('gnk dinamo ltd. group')&&text.includes('media relations & accreditation center')&&text.includes(MEDIA_EMAIL);
}

export function mediaSignatureHtml(){
  return `<table data-gnk-asg-media-signature="${VERSION}" role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;margin-top:26px;max-width:720px;width:100%;border-top:1px solid ${GOLD}"><tr><td width="170" valign="top" style="width:170px;padding:18px 22px 10px 0"><a href="https://gnk-asg.hr" style="text-decoration:none"><img src="${MEDIA_LOGO}" width="148" alt="GNK ASG" style="display:block;width:148px;max-width:148px;height:auto;border:0"></a></td><td valign="middle" style="padding:18px 0 10px;color:${GOLD};font-size:14px;line-height:1.52"><div style="font-size:20px;font-weight:700;color:${GOLD};margin-bottom:6px">GNK DINAMO Ltd. Group</div><div style="font-weight:700;color:${GOLD}">Media Relations &amp; Accreditation Center</div><div style="color:${GOLD}">Organised by GNK ASG Media Center</div><div><a href="mailto:${MEDIA_EMAIL}" style="color:${GOLD};text-decoration:none">${MEDIA_EMAIL}</a></div><div><a href="https://gnk-asg.hr" style="color:${GOLD};text-decoration:none">https://gnk-asg.hr</a></div></td></tr></table>`;
}

function removeExistingHtmlSignature(value){
  return String(value||'')
    .replace(/<table\b[^>]*data-gnk-asg-media-signature=["'][^"']*["'][^>]*>[\s\S]*?<\/table>/gi,'')
    .replace(/<table\b[^>]*data-gnk-asg-signature=["'][^"']*["'][^>]*>[\s\S]*?<\/table>/gi,'')
    .trim();
}

export function ensureMediaHtmlSignature(value,from=MEDIA_EMAIL){
  if(!isMediaSender(from))return String(value||'');
  const html=removeExistingHtmlSignature(value);
  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i,`${mediaSignatureHtml()}</body>`)
    : `${html}${mediaSignatureHtml()}`;
}

export function ensureMediaTextSignature(value,from=MEDIA_EMAIL){
  const text=clean(value);
  if(!isMediaSender(from)||hasSignature(text))return text;
  return `${text}${text?'\n\n':''}${MEDIA_SIGNATURE_TEXT}`;
}

export function enforceMediaGoldSignature(payload={}){
  if(!isMediaSender(payload.from))return payload;
  const textSource=payload.text??payload.plainText??payload.body??'';
  const htmlSource=payload.html??payload.bodyHtml??payload.htmlBody??'';
  return{
    ...payload,
    text:ensureMediaTextSignature(textSource,payload.from),
    html:ensureMediaHtmlSignature(htmlSource,payload.from),
    headers:{...(payload.headers||{}),'X-GNK-ASG-Media-Gold-Signature':VERSION}
  };
}

export function withMediaGoldSignature(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{send(payload){return binding.send.call(binding,enforceMediaGoldSignature(payload));}}
  });
  return wrapped;
}
