export const VERSION='GNK_ASG_EMAIL_BRAND_MIME_V1_20260629_R1_INLINE_LOGO';
export const EMAIL_LOGO_PATH='/assets/gnk-asg-email-logo-final.png';
export const EMAIL_LOGO_URL='https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png';
export const EMAIL_LOGO_CID='gnk-asg-email-logo';

const enc=new TextEncoder();
const clean=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function b64(bytes){let out='';const v=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);for(let i=0;i<v.length;i+=32768)out+=String.fromCharCode(...v.subarray(i,Math.min(i+32768,v.length)));return btoa(out);}
export function foldBase64(value){return String(value||'').replace(/.{1,76}/g,'$&\r\n').trimEnd();}
const encodeBody=value=>foldBase64(b64(enc.encode(String(value||''))));
const encodeHeader=value=>{const t=clean(value).replace(/[\r\n]+/g,' ');return /^[\x20-\x7E]*$/.test(t)?t:`=?UTF-8?B?${b64(enc.encode(t))}?=`;};

export async function loadEmailLogo(env){
  try{
    if(env?.ASSETS?.fetch){
      const response=await env.ASSETS.fetch(new Request(`https://gnk-asg.hr${EMAIL_LOGO_PATH}`));
      if(response.ok){
        const bytes=new Uint8Array(await response.arrayBuffer());
        if(bytes.length>100&&bytes.length<750000)return{bytes,contentType:response.headers.get('content-type')||'image/png',filename:'gnk-asg-logo.png'};
      }
    }
  }catch{}
  return null;
}

export function mediaSignatureText(){return['GNK DINAMO Ltd. Group','Media Relations & Accreditation Center','Organised by GNK ASG Media Center','media@gnk-asg.hr','https://gnk-asg.hr'].join('\n');}
export function mediaSignatureHtml(src=`cid:${EMAIL_LOGO_CID}`){return `<table data-gnk-asg-signature="${VERSION}" role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;margin-top:24px;max-width:720px;width:100%;border-top:1px solid #d9d9d9"><tr><td width="170" valign="top" style="width:170px;padding:16px 22px 8px 0"><a href="https://gnk-asg.hr"><img src="${src}" width="150" alt="GNK ASG" style="display:block;width:150px;max-width:150px;height:auto;border:0"></a></td><td valign="top" style="padding:18px 0 8px;color:#111827;font-size:14px;line-height:1.48"><div style="font-size:20px;font-weight:700;margin-bottom:6px">GNK DINAMO Ltd. Group</div><div style="font-weight:700">Media Relations &amp; Accreditation Center</div><div>Organised by GNK ASG Media Center</div><div><a href="mailto:media@gnk-asg.hr" style="color:#111827">media@gnk-asg.hr</a></div><div><a href="https://gnk-asg.hr" style="color:#111827">https://gnk-asg.hr</a></div></td></tr></table>`;}
export function textToHtml(value){return clean(value).split(/\n{2,}/).filter(Boolean).map(p=>`<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g,'<br>')}</p>`).join('');}
export function ensureMediaText(value){const t=clean(value);return /gnk dinamo ltd\. group/i.test(t)&&/media relations & accreditation center/i.test(t)?t:`${t}${t?'\n\n':''}${mediaSignatureText()}`;}
export function ensureMediaHtml(value,text,src){const h=clean(value)||textToHtml(text);return /data-gnk-asg-signature=/i.test(h)?h:`${h}${mediaSignatureHtml(src)}`;}

function alternative(boundary,text,html){return [`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',encodeBody(text),`--${boundary}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',encodeBody(html),`--${boundary}--`].join('\r\n');}
export async function buildBrandedRawEmail({env,fromEmail='media@gnk-asg.hr',fromName='GNK DINAMO Ltd. Group | Media Relations & Accreditation Center',to,subject,text='',html='',replyTo='media@gnk-asg.hr',inReplyTo='',references='',autoSubmitted='',headers={},attachments=[]}={}){
  const logo=await loadEmailLogo(env),src=logo?`cid:${EMAIL_LOGO_CID}`:EMAIL_LOGO_URL;
  const signedText=ensureMediaText(text),signedHtml=ensureMediaHtml(html,signedText,src);
  const alt=`gnk_alt_${crypto.randomUUID().replace(/-/g,'')}`,rel=`gnk_rel_${crypto.randomUUID().replace(/-/g,'')}`,mix=`gnk_mix_${crypto.randomUUID().replace(/-/g,'')}`;
  const head=[`From: ${encodeHeader(fromName)} <${clean(fromEmail)}>` ,`To: ${clean(to)}`,`Reply-To: ${clean(replyTo||fromEmail)}`,`Subject: ${encodeHeader(subject)}`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${crypto.randomUUID()}@gnk-asg.hr>`,'MIME-Version: 1.0',`X-GNK-ASG-Email-Brand: ${VERSION}`];
  if(inReplyTo)head.push(`In-Reply-To: ${clean(inReplyTo).replace(/[\r\n]+/g,' ')}`);if(references)head.push(`References: ${clean(references).replace(/[\r\n]+/g,' ')}`);if(autoSubmitted)head.push(`Auto-Submitted: ${clean(autoSubmitted)}`);
  for(const [k,v] of Object.entries(headers||{})){const key=clean(k).replace(/[^A-Za-z0-9-]+/g,''),val=clean(v).replace(/[\r\n]+/g,' ');if(key&&val)head.push(`${key}: ${val}`);}
  const altBody=alternative(alt,signedText,signedHtml);
  let body=logo?[`Content-Type: multipart/related; boundary="${rel}"`,'',`--${rel}`,`Content-Type: multipart/alternative; boundary="${alt}"`,'',altBody,`--${rel}`,`Content-Type: ${logo.contentType}; name="${logo.filename}"`,`Content-Disposition: inline; filename="${logo.filename}"`,`Content-ID: <${EMAIL_LOGO_CID}>`,'Content-Transfer-Encoding: base64','',foldBase64(b64(logo.bytes)),`--${rel}--`].join('\r\n'):[`Content-Type: multipart/alternative; boundary="${alt}"`,'',altBody].join('\r\n');
  const files=(Array.isArray(attachments)?attachments:[]).filter(x=>x?.bytes?.length);
  if(files.length){const parts=[`Content-Type: multipart/mixed; boundary="${mix}"`,'',`--${mix}`,body];for(const f of files){const name=clean(f.filename).replace(/[\r\n"\\]+/g,'_')||'document.bin';parts.push(`--${mix}`,`Content-Type: ${clean(f.contentType)||'application/octet-stream'}; name="${name}"`,`Content-Disposition: attachment; filename="${name}"`,'Content-Transfer-Encoding: base64','',foldBase64(b64(f.bytes)));}parts.push(`--${mix}--`,'');body=parts.join('\r\n');}
  return [...head,body,''].join('\r\n');
}
