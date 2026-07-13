import {handleEmailLogo,VERSION as EMAIL_LOGO_ENDPOINT_VERSION} from './email-logo-endpoint-v1.js';

export const VERSION=`GNK_ASG_EMAIL_BRAND_MIME_V5_20260713_SAFE_HEADERS_${EMAIL_LOGO_ENDPOINT_VERSION}`;
export const EMAIL_LOGO_PATH='/assets/logo-gnk-asg-email.jpg';
export const EMAIL_LOGO_URL='https://gnk-asg.hr/assets/logo-gnk-asg-email.jpg?v=20260712';
export const EMAIL_LOGO_CID='gnk-asg-email-logo';
const MAX_ATTACHMENTS=10;
const MAX_ATTACHMENT_BYTES=12*1024*1024;

const enc=new TextEncoder();
const clean=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeHeaderValue=value=>clean(value).replace(/[\r\n]+/g,' ');
const safeEmail=value=>{const email=safeHeaderValue(value).toLowerCase();return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/i.test(email)?email:''};
const safeAddressList=value=>{const emails=String(value||'').split(/[;,\s]+/).map(safeEmail).filter(Boolean);return [...new Set(emails)].join(', ')};
const safeContentType=value=>{const type=safeHeaderValue(value).toLowerCase();return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?:\s*;\s*[a-z0-9!#$&^_.+-]+=[a-z0-9!#$&^_.+-]+)*$/i.test(type)?type:'application/octet-stream'};
const safeFilename=value=>safeHeaderValue(value).replace(/["\\/<>:|?*\x00-\x1F]+/g,'_').slice(0,180)||'document.bin';
function b64(bytes){let out='';const v=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);for(let i=0;i<v.length;i+=32768)out+=String.fromCharCode(...v.subarray(i,Math.min(i+32768,v.length)));return btoa(out);}
export function foldBase64(value){return String(value||'').replace(/.{1,76}/g,'$&\r\n').trimEnd();}
const encodeBody=value=>foldBase64(b64(enc.encode(String(value||''))));
const encodeHeader=value=>{const t=safeHeaderValue(value);return /^[\x20-\x7E]*$/.test(t)?t:`=?UTF-8?B?${b64(enc.encode(t))}?=`;};
async function logoFromResponse(response){if(!response?.ok)return null;const contentType=String(response.headers.get('content-type')||'').toLowerCase();if(!contentType.includes('image/jpeg')&&!contentType.includes('image/jpg')&&!contentType.includes('image/png'))return null;const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length<=100||bytes.length>=750000)return null;const jpeg=contentType.includes('jpeg')||contentType.includes('jpg');return{bytes,contentType:jpeg?'image/jpeg':'image/png',filename:jpeg?'gnk-asg-logo-email.jpg':'gnk-asg-logo-email.png'};}
export async function loadEmailLogo(env){
  try{const embedded=handleEmailLogo(new Request(`https://gnk-asg.hr${EMAIL_LOGO_PATH}`));const logo=await logoFromResponse(embedded);if(logo)return logo;}catch{}
  try{if(env?.ASSETS?.fetch){const local=await env.ASSETS.fetch(new Request(`https://gnk-asg.hr${EMAIL_LOGO_PATH}`));const logo=await logoFromResponse(local);if(logo)return logo;}}catch{}
  try{const remote=await fetch(EMAIL_LOGO_URL,{headers:{accept:'image/jpeg,image/png'},cf:{cacheTtl:86400,cacheEverything:true}});const logo=await logoFromResponse(remote);if(logo)return logo;}catch{}
  return null;
}
export function mediaSignatureText(){return['GNK DINAMO Ltd. Group','Media Relations & Accreditation Center','Organised by GNK ASG Media Center','media@gnk-asg.hr','https://gnk-asg.hr'].join('\n');}
export function mediaSignatureHtml(src=`cid:${EMAIL_LOGO_CID}`){const safeSrc=/^cid:[A-Za-z0-9._@+-]+$/i.test(clean(src))||/^https:\/\//i.test(clean(src))?clean(src):EMAIL_LOGO_URL;return `<table data-gnk-asg-signature="${VERSION}" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;margin-top:24px;max-width:620px;width:100%;border-top:1px solid #d9d9d9"><tr><td align="left" style="padding:18px 0 10px"><a href="https://gnk-asg.hr" style="text-decoration:none"><img src="${esc(safeSrc)}" width="180" alt="GNK ASG" style="display:block;width:180px;max-width:80%;height:auto;border:0;background:#fff"></a></td></tr><tr><td align="left" style="padding:0 0 12px;color:#111827;font-size:14px;line-height:1.48"><div style="font-size:20px;font-weight:700;margin-bottom:6px">GNK DINAMO Ltd. Group</div><div style="font-weight:700">Media Relations &amp; Accreditation Center</div><div>Organised by GNK ASG Media Center</div><div><a href="mailto:media@gnk-asg.hr" style="color:#111827">media@gnk-asg.hr</a></div><div><a href="https://gnk-asg.hr" style="color:#111827">https://gnk-asg.hr</a></div></td></tr></table>`;}
export function textToHtml(value){return clean(value).split(/\n{2,}/).filter(Boolean).map(p=>`<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g,'<br>')}</p>`).join('');}
export function ensureMediaText(value){const t=clean(value);return /gnk dinamo ltd\. group/i.test(t)&&/media relations & accreditation center/i.test(t)?t:`${t}${t?'\n\n':''}${mediaSignatureText()}`;}
export function ensureMediaHtml(value,text,src){const h=clean(value)||textToHtml(text);return /data-gnk-asg-signature=/i.test(h)?h:`${h}${mediaSignatureHtml(src)}`;}
function alternative(boundary,text,html){return[`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',encodeBody(text),`--${boundary}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',encodeBody(html),`--${boundary}--`].join('\r\n');}
export async function buildBrandedRawEmail({env,fromEmail='media@gnk-asg.hr',fromName='GNK DINAMO Ltd. Group | Media Relations & Accreditation Center',to,subject,text='',html='',replyTo='media@gnk-asg.hr',inReplyTo='',references='',autoSubmitted='',headers={},attachments=[]}={}){
  const from=safeEmail(fromEmail),recipients=safeAddressList(to),reply=safeEmail(replyTo||fromEmail);
  if(!from)throw new Error('invalid_from_email');
  if(!recipients)throw new Error('invalid_to_email');
  if(!reply)throw new Error('invalid_reply_to_email');
  const logo=await loadEmailLogo(env),src=logo?`cid:${EMAIL_LOGO_CID}`:EMAIL_LOGO_URL,signedText=ensureMediaText(text),signedHtml=ensureMediaHtml(html,signedText,src),alt=`gnk_alt_${crypto.randomUUID().replace(/-/g,'')}`,rel=`gnk_rel_${crypto.randomUUID().replace(/-/g,'')}`,mix=`gnk_mix_${crypto.randomUUID().replace(/-/g,'')}`;
  const head=[`From: ${encodeHeader(fromName)} <${from}>`,`To: ${recipients}`,`Reply-To: ${reply}`,`Subject: ${encodeHeader(subject)}`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${crypto.randomUUID()}@gnk-asg.hr>`,'MIME-Version: 1.0',`X-GNK-ASG-Email-Brand: ${VERSION}`,`Disposition-Notification-To: ${from}`,`Return-Receipt-To: ${from}`];
  if(inReplyTo)head.push(`In-Reply-To: ${safeHeaderValue(inReplyTo)}`);
  if(references)head.push(`References: ${safeHeaderValue(references)}`);
  if(autoSubmitted)head.push(`Auto-Submitted: ${safeHeaderValue(autoSubmitted)}`);
  for(const[k,v]of Object.entries(headers||{})){const key=clean(k).replace(/[^A-Za-z0-9-]+/g,''),val=safeHeaderValue(v);if(key&&val&&!/^(?:from|to|reply-to|subject|date|message-id|mime-version|content-type|content-transfer-encoding)$/i.test(key))head.push(`${key}: ${val}`);}
  const altBody=alternative(alt,signedText,signedHtml);
  let body=logo?[`Content-Type: multipart/related; boundary="${rel}"`,'',`--${rel}`,`Content-Type: multipart/alternative; boundary="${alt}"`,'',altBody,`--${rel}`,`Content-Type: ${logo.contentType}; name="${logo.filename}"`,`Content-Disposition: inline; filename="${logo.filename}"`,`Content-ID: <${EMAIL_LOGO_CID}>`,'Content-Transfer-Encoding: base64','',foldBase64(b64(logo.bytes)),`--${rel}--`].join('\r\n'):[`Content-Type: multipart/alternative; boundary="${alt}"`,'',altBody].join('\r\n');
  const files=(Array.isArray(attachments)?attachments:[]).filter(x=>x?.bytes?.length).slice(0,MAX_ATTACHMENTS);
  const totalBytes=files.reduce((sum,file)=>sum+Number(file.bytes?.length||0),0);
  if(totalBytes>MAX_ATTACHMENT_BYTES)throw new Error('attachment_size_limit_exceeded');
  if(files.length){const parts=[`Content-Type: multipart/mixed; boundary="${mix}"`,'',`--${mix}`,body];for(const file of files){const name=safeFilename(file.filename),type=safeContentType(file.contentType);parts.push(`--${mix}`,`Content-Type: ${type}; name="${name}"`,`Content-Disposition: attachment; filename="${name}"`,'Content-Transfer-Encoding: base64','',foldBase64(b64(file.bytes)));}parts.push(`--${mix}--`,'');body=parts.join('\r\n');}
  return[...head,body,''].join('\r\n');
}
