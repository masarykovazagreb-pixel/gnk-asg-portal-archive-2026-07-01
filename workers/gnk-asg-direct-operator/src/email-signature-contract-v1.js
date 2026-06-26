export const VERSION='GNK_ASG_EMAIL_SIGNATURE_CONTRACT_V1_20260626';

const COMPANY={
  name:'GNK ASG d.o.o.',
  address:'Zagrebačka cesta 130, 10090 Zagreb',
  oib:'75227917632',
  mbs:'081512375',
  phone:'+385 91 535 8365',
  web:'https://gnk-asg.hr',
  logo:'https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png'
};

const clean=value=>String(value??'').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);

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

function signatureText(identity){
  return[
    identity.name,
    COMPANY.name,
    COMPANY.address,
    `OIB: ${COMPANY.oib} · MBS: ${COMPANY.mbs}`,
    `Telefon: ${COMPANY.phone}`,
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
  return /(srdačan pozdrav|s poštovanjem|kind regards|best regards)[,!]?\s*$/i.test(clean(text))?'':'Srdačan pozdrav,\n\n';
}

function appendText(value,identity){
  const text=clean(value);
  if(hasTextSignature(text))return text;
  return `${text}${text?'\n\n':''}${closing(text)}${signatureText(identity)}`;
}

function paragraphs(value){
  return clean(value).split(/\n{2,}/).filter(Boolean).map(part=>`<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(part).replace(/\n/g,'<br>')}</p>`).join('');
}

function signatureHtml(identity){
  return `<table data-gnk-asg-signature="${VERSION}" role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;margin-top:24px;max-width:720px;width:100%;border-top:1px solid #d9d9d9"><tr><td width="170" valign="top" style="width:170px;padding:16px 22px 8px 0"><a href="${COMPANY.web}" style="text-decoration:none"><img src="${COMPANY.logo}" width="150" alt="GNK ASG" style="display:block;width:150px;max-width:150px;height:auto;border:0"></a></td><td valign="top" style="padding:18px 0 8px;color:#111827;font-size:14px;line-height:1.48"><div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:6px">${escapeHtml(identity.name)}</div><div>${escapeHtml(COMPANY.name)}</div><div>${escapeHtml(COMPANY.address)}</div><div>OIB: ${COMPANY.oib} · MBS: ${COMPANY.mbs}</div><div>Telefon: ${escapeHtml(COMPANY.phone)}</div><div>Web: <a href="${COMPANY.web}" style="color:#111827">${COMPANY.web}</a></div><div>E-mail: <a href="mailto:${escapeHtml(identity.email)}" style="color:#111827">${escapeHtml(identity.email)}</a></div></td></tr></table>`;
}

function appendHtml(value,text,identity){
  const html=clean(value)||paragraphs(text);
  if(hasHtmlSignature(html))return html;
  return `${html}${signatureHtml(identity)}`;
}

export function enforceRequiredSignature(payload={}){
  const identity=sender(payload);
  const originalText=clean(payload.text||payload.body||payload.plainText);
  const originalHtml=clean(payload.html||payload.bodyHtml||payload.htmlBody);
  return{
    ...payload,
    text:appendText(originalText,identity),
    html:appendHtml(originalHtml,originalText,identity),
    headers:{...(payload.headers||{}),'X-GNK-ASG-Signature-Contract':VERSION}
  };
}

export function withRequiredEmailSignature(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{
      send(payload){return binding.send.call(binding,enforceRequiredSignature(payload));}
    }
  });
  return wrapped;
}
