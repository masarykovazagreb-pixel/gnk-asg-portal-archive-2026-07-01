import {EmailMessage} from 'cloudflare:email';
import {EMAIL_LOGO_URL,loadEmailLogo,mediaSignatureHtml,ensureMediaText,textToHtml,foldBase64} from './email-brand-mime-v1.js';

export const VERSION='GNK_ASG_EMAIL_RAW_LOGO_V1_20260629';
const enc=new TextEncoder();
const dec=new TextDecoder();
const clean=value=>String(value??'').trim();
function b64(bytes){let out='';const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);for(let i=0;i<view.length;i+=32768)out+=String.fromCharCode(...view.subarray(i,Math.min(i+32768,view.length)));return btoa(out);}
function decode64(value){try{const binary=atob(String(value||'').replace(/\s+/g,'')),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return dec.decode(bytes);}catch{return'';}}
function split(raw){const m=String(raw||'').match(/\r?\n\r?\n/);if(!m)return{head:String(raw||''),body:''};return{head:raw.slice(0,m.index),body:raw.slice(m.index+m[0].length)};}
function header(head,name){const m=String(head||'').match(new RegExp(`^${name}:\\s*([^\\r\\n]*(?:\\r?\\n[ \\t]+[^\\r\\n]*)*)`,'im'));return clean(m?.[1]).replace(/\r?\n[ \t]+/g,' ');}
function address(value){const text=clean(value),m=text.match(/<([^>]+)>/);return clean(m?.[1]||text);}
function nameOf(value){const text=clean(value),m=text.match(/^(.*?)\s*<[^>]+>/);return clean(m?.[1]).replace(/^"|"$/g,'')||'GNK DINAMO Ltd. Group | Media Relations & Accreditation Center';}

export async function brandSimpleRawEmail(message,env){
  if(!message?.raw)return message;
  try{
    const raw=await new Response(message.raw).text();
    if(/multipart\/mixed/i.test(raw))return message;
    const parts=split(raw),encoding=header(parts.head,'Content-Transfer-Encoding'),plain=/base64/i.test(encoding)?decode64(parts.body):clean(parts.body);
    const signedText=ensureMediaText(plain),logo=await loadEmailLogo(env),src=logo?`data:${logo.contentType};base64,${b64(logo.bytes)}`:EMAIL_LOGO_URL;
    const html=`${textToHtml(signedText)}${mediaSignatureHtml(src)}`;
    const boundary=`gnk_alt_${crypto.randomUUID().replace(/-/g,'')}`;
    const kept=parts.head.split(/\r?\n/).filter(line=>!/^(Content-Type|Content-Transfer-Encoding|MIME-Version):/i.test(line));
    kept.push('MIME-Version: 1.0',`X-GNK-ASG-Raw-Logo: ${VERSION}`,`Content-Type: multipart/alternative; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',foldBase64(b64(enc.encode(signedText))),`--${boundary}`,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',foldBase64(b64(enc.encode(html))),`--${boundary}--`,'');
    const from=address(message.from||header(parts.head,'From')),to=address(message.to||header(parts.head,'To'));
    return from&&to?new EmailMessage(from,to,kept.join('\r\n')):message;
  }catch{return message;}
}

export function wrapInboundReply(message,env){
  if(!message||typeof message.reply!=='function')return message;
  return new Proxy(message,{get(target,property){if(property==='reply')return async outbound=>target.reply(await brandSimpleRawEmail(outbound,env));const value=Reflect.get(target,property,target);return typeof value==='function'?value.bind(target):value;}});
}
