export const VERSION='GNK_ASG_MEDIA_EMAIL_GOLD_SIGNATURE_V3_20260701_MOBILE_TWO_COLUMN';
export const MEDIA_EMAIL='media@gnk-asg.hr';
export const MEDIA_LOGO='https://gnk-asg.hr/assets/gnk-asg-email-logo-transparent.png';
export const MEDIA_SIGNATURE_TEXT=[
  'GNK DINAMO Ltd. Group',
  'Media Relations & Accreditation Center',
  'Organised by GNK ASG Media Center',
  MEDIA_EMAIL,
  'https://gnk-asg.hr'
].join('\n');

const GOLD='#b88a2f';
const clean=value=>String(value??'').trim();

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
  return `<table data-gnk-asg-media-signature="${VERSION}" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:640px;table-layout:fixed;border-collapse:collapse;margin-top:26px;border-top:1px solid ${GOLD};font-family:Arial,Helvetica,sans-serif"><tr><td width="46%" valign="top" style="width:46%;padding:20px 18px 12px 0;vertical-align:top"><a href="https://gnk-asg.hr" style="display:block;text-decoration:none"><img src="${MEDIA_LOGO}" width="220" alt="" style="display:block;width:100%;max-width:220px;height:auto;border:0;outline:none;text-decoration:none;background:transparent"></a></td><td width="54%" valign="top" style="width:54%;padding:20px 0 12px 8px;vertical-align:top;color:${GOLD};font-size:13px;line-height:1.48;word-break:normal;overflow-wrap:normal;hyphens:none"><div style="font-size:18px;line-height:1.38;font-weight:800;color:${GOLD};margin:0 0 12px 0">GNK<br>DINAMO<br>Ltd.<br>Group</div><div style="font-size:14px;line-height:1.46;font-weight:700;color:${GOLD};margin:0 0 10px 0">Media Relations &amp;<br>Accreditation Center</div><div style="font-size:13px;line-height:1.5;color:${GOLD};margin:0 0 10px 0">Organised by GNK ASG<br>Media Center</div><div style="font-size:13px;line-height:1.5;margin:0 0 3px 0;word-break:break-word"><a href="mailto:${MEDIA_EMAIL}" style="color:${GOLD};text-decoration:none;word-break:break-word">${MEDIA_EMAIL}</a></div><div style="font-size:13px;line-height:1.5;margin:0;word-break:break-word"><a href="https://gnk-asg.hr" style="color:${GOLD};text-decoration:none;word-break:break-word">https://gnk-asg.hr</a></div></td></tr></table>`;
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
