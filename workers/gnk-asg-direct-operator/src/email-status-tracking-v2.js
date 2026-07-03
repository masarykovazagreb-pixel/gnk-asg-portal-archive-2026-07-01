import {EmailMessage} from 'cloudflare:email';
import * as base from './email-status-tracking-v1.js';

export const VERSION=`GNK_ASG_EMAIL_STATUS_TRACKING_V2_20260703_RAW_MIME_${base.VERSION}`;
export const DASHBOARD_PATH=base.DASHBOARD_PATH;
export const API_PREFIX=base.API_PREFIX;
export const handleEmailStatusRequest=base.handleEmailStatusRequest;
export const isEmailStatusPath=base.isEmailStatusPath;
export const syncCloudflareEmailStatuses=base.syncCloudflareEmailStatuses;
export const ensureEmailStatusSchema=base.ensureEmailStatusSchema;

const clean=value=>String(value??'').trim();
const errorText=error=>String(error?.message||error||'').slice(0,500);
function header(raw,name){const match=String(raw||'').match(new RegExp(`^${name}:\\s*([^\\r\\n]*(?:\\r?\\n[ \\t]+[^\\r\\n]*)*)`,'im'));return clean(match?.[1]).replace(/\r?\n[ \t]+/g,' ');}
function address(value){const raw=clean(value),match=raw.match(/<([^>]+)>/);return clean(match?.[1]||raw).toLowerCase();}
function bytesToBase64(bytes){let out='';for(let index=0;index<bytes.length;index+=32768)out+=String.fromCharCode(...bytes.subarray(index,index+32768));return btoa(out);}
function fold(value){return String(value||'').replace(/.{1,76}/g,'$&\r\n').trimEnd();}
function source(raw,hint){if(header(raw,'X-GNK-ASG-Campaign-Mailer'))return'campaign-mailer';if(header(raw,'X-GNK-ASG-Manual-Mail'))return'mail-studio';if(header(raw,'X-GNK-ASG-Idempotency-Key'))return'media-center';return clean(hint)||'system';}
function findPartEnd(raw,start){const crlf=raw.indexOf('\r\n--',start),lf=raw.indexOf('\n--',start);if(crlf<0)return lf<0?raw.length:lf;if(lf<0)return crlf;return Math.min(crlf,lf);}
function decodeHtmlPart(raw){
 const base64Header=/Content-Type:\s*text\/html[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*?Content-Transfer-Encoding:\s*base64\r?\n\r?\n/i.exec(raw);
 if(base64Header){
  const start=base64Header.index+base64Header[0].length,end=findPartEnd(raw,start),encoded=raw.slice(start,end).replace(/\s+/g,'');
  try{const binary=atob(encoded),bytes=Uint8Array.from(binary,char=>char.charCodeAt(0)),html=new TextDecoder().decode(bytes);return{html,replace(next){const encodedNext=fold(bytesToBase64(new TextEncoder().encode(next)));return`${raw.slice(0,start)}${encodedNext}${raw.slice(end)}`;}};}catch{}
 }
 const directHeader=/Content-Type:\s*text\/html[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*?\r?\n/i.exec(raw);
 if(directHeader){const start=directHeader.index+directHeader[0].length,end=findPartEnd(raw,start),html=raw.slice(start,end);return{html,replace(next){return`${raw.slice(0,start)}${next}${raw.slice(end)}`;}};}
 return null;
}
async function rawText(message){
 const value=message?.raw;if(typeof value==='string')return value;
 if(value instanceof ArrayBuffer)return new TextDecoder().decode(value);
 if(ArrayBuffer.isView(value))return new TextDecoder().decode(value);
 if(value&&typeof value.getReader==='function')return new Response(value).text();
 return'';
}

export function withEmailStatusTracking(env,sourceHint='system'){
 if(!env||env.__GNK_ASG_EMAIL_STATUS_TRACKED===VERSION)return env;
 const binding=env.EMAIL;if(!binding||typeof binding.send!=='function')return env;
 const structured=base.withEmailStatusTracking(env,sourceHint);
 return new Proxy(env,{get(target,property,receiver){
  if(property==='__GNK_ASG_EMAIL_STATUS_TRACKED')return VERSION;
  if(property==='EMAIL')return{send:async payload=>{
   const isStructured=payload&&typeof payload==='object'&&('subject'in payload||'html'in payload||'text'in payload);
   if(isStructured)return structured.EMAIL.send(payload);
   let raw='';try{raw=await rawText(payload);}catch(error){console.error('email-status-raw-read',error);}
   if(!raw)return binding.send.call(binding,payload);
   const recipient=address(payload?.to||header(raw,'To')),sender=address(payload?.from||header(raw,'From')),subject=header(raw,'Subject'),sourceSystem=source(raw,sourceHint),sourceId=header(raw,'X-GNK-ASG-Idempotency-Key')||header(raw,'X-GNK-ASG-Campaign-Contact-Id'),part=decodeHtmlPart(raw);
   let tracking={trackingId:'',html:part?.html||'',tracked:false};
   try{tracking=await base.createTrackedMessage(target,{sourceSystem,sourceId,recipient,sender,subject,html:part?.html||''});}catch(error){console.error('email-status-raw-create',error);}
   const nextRaw=tracking.tracked&&part?part.replace(tracking.html):raw,nextMessage=new EmailMessage(sender||payload?.from,recipient||payload?.to,nextRaw);
   try{const result=await binding.send.call(binding,nextMessage);await base.markEmailAccepted(target,tracking.trackingId,clean(result?.messageId)).catch(error=>console.error('email-status-raw-accepted',error));return result;}
   catch(error){await base.markEmailFailure(target,tracking.trackingId,error).catch(inner=>console.error('email-status-raw-failed',inner));console.error('email-status-raw-send',errorText(error));throw error;}
  }};
  return Reflect.get(target,property,receiver);
 }});
}
