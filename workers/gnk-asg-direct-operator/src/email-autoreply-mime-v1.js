import {loadEmailLogo,EMAIL_LOGO_CID,EMAIL_LOGO_URL,foldBase64,VERSION as BRAND_MIME_VERSION} from './email-brand-mime-v1.js';

export const VERSION=`GNK_ASG_AUTOREPLY_MIME_V2_REMOTE_LOGO_FALLBACK_${BRAND_MIME_VERSION}`;
const enc=new TextEncoder();
const clean=value=>String(value??'').trim();
const safeHeader=value=>clean(value).replace(/[\r\n]+/g,' ').slice(0,998);
const safeEmail=value=>{const email=safeHeader(value).toLowerCase();return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/i.test(email)?email:''};
const encodeHeader=value=>{const text=safeHeader(value);if(/^[\x20-\x7E]*$/.test(text))return text;let raw='';for(const byte of enc.encode(text))raw+=String.fromCharCode(byte);return `=?UTF-8?B?${btoa(raw)}?=`};
function b64(bytes){let out='';const value=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);for(let i=0;i<value.length;i+=32768)out+=String.fromCharCode(...value.subarray(i,Math.min(i+32768,value.length)));return btoa(out)}
const encodeBody=value=>foldBase64(b64(enc.encode(String(value||''))));
const remoteLogoHtml=value=>String(value||'').replace(new RegExp(`cid:${EMAIL_LOGO_CID}`,'gi'),EMAIL_LOGO_URL);

export async function buildAutoreplyRawEmail({env,fromEmail,fromName,to,subject,text,html,inReplyTo='',reference='',headers={}}={}){
 const from=safeEmail(fromEmail),recipient=safeEmail(to);
 if(!from)throw new Error('invalid_from_email');
 if(!recipient)throw new Error('invalid_to_email');
 const logo=await loadEmailLogo(env),alt=`gnk_alt_${crypto.randomUUID().replace(/-/g,'')}`,rel=`gnk_rel_${crypto.randomUUID().replace(/-/g,'')}`;
 const renderedHtml=logo?String(html||''):remoteLogoHtml(html);
 const head=[`From: ${encodeHeader(fromName)} <${from}>`,`To: <${recipient}>`,`Subject: ${encodeHeader(subject)}`,'Date: '+new Date().toUTCString(),`Message-ID: <${crypto.randomUUID()}@gnk-asg.hr>`,'MIME-Version: 1.0','Auto-Submitted: auto-replied','Precedence: bulk','X-Auto-Response-Suppress: All',`X-GNK-ASG-Autoreply-Mime: ${VERSION}`,`X-GNK-ASG-Signature-Logo: ${logo?'cid-inline':'remote-png'}`];
 if(reference)head.push(`X-GNK-ASG-Reference: ${safeHeader(reference)}`);
 if(inReplyTo){const thread=safeHeader(inReplyTo);head.push(`In-Reply-To: ${thread}`,`References: ${thread}`)}
 for(const[key,value]of Object.entries(headers||{})){const name=clean(key).replace(/[^A-Za-z0-9-]+/g,''),headerValue=safeHeader(value);if(name&&headerValue&&!/^(?:from|to|subject|date|message-id|mime-version|content-type|content-transfer-encoding)$/i.test(name))head.push(`${name}: ${headerValue}`)}
 const alternative=[`--${alt}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',encodeBody(text),`--${alt}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',encodeBody(renderedHtml),`--${alt}--`].join('\r\n');
 if(!logo)return[...head,`Content-Type: multipart/alternative; boundary="${alt}"`,'',alternative,''].join('\r\n');
 const related=[`Content-Type: multipart/related; type="multipart/alternative"; boundary="${rel}"`,'',`--${rel}`,`Content-Type: multipart/alternative; boundary="${alt}"`,'',alternative,`--${rel}`,`Content-Type: ${logo.contentType}; name="${logo.filename}"`,`Content-Disposition: inline; filename="${logo.filename}"`,`Content-ID: <${EMAIL_LOGO_CID}>`,`Content-Location: ${EMAIL_LOGO_URL}`,`X-Attachment-Id: ${EMAIL_LOGO_CID}`,'Content-Transfer-Encoding: base64','',foldBase64(b64(logo.bytes)),`--${rel}--`,''].join('\r\n');
 return[...head,related].join('\r\n');
}
