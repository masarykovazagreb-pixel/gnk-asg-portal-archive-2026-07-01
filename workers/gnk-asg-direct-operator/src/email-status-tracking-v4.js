import * as rawTracking from './email-status-tracking-v2.js';
import * as status from './email-status-tracking-v3.js';
import {createTrackedMessage,markEmailAccepted,markEmailFailure} from './email-status-tracking-v1.js';

export const VERSION=`GNK_ASG_EMAIL_STATUS_TRACKING_V4_20260703_HEADERS_${status.VERSION}`;
export const DASHBOARD_PATH=status.DASHBOARD_PATH;
export const API_PREFIX=status.API_PREFIX;
export const isEmailStatusPath=status.isEmailStatusPath;
export const handleEmailStatusRequest=status.handleEmailStatusRequest;
export const syncCloudflareEmailStatuses=status.syncCloudflareEmailStatuses;

const clean=value=>String(value??'').trim();
function emailOf(value){if(!value)return'';if(Array.isArray(value))return emailOf(value[0]);if(typeof value==='object')return clean(value.email||value.address).toLowerCase();const raw=clean(value),match=raw.match(/<([^>]+)>/);return clean(match?.[1]||raw).toLowerCase();}
function headersOf(value){const out={};if(value instanceof Headers)value.forEach((item,key)=>{out[key]=item;});else if(value&&typeof value==='object')Object.assign(out,value);return out;}
function headerOf(headers,name){const key=Object.keys(headers).find(item=>item.toLowerCase()===name.toLowerCase());return key?clean(headers[key]):'';}
function sourceOf(headers,hint){if(headerOf(headers,'X-GNK-ASG-Mail-Studio-Auto-Reply')||headerOf(headers,'X-GNK-ASG-Media-Auto-Reply')||headerOf(headers,'X-GNK-ASG-Reference'))return'auto-reply';if(headerOf(headers,'X-GNK-ASG-Manual-Mail'))return'mail-studio';if(headerOf(headers,'X-GNK-ASG-Campaign-Mailer'))return'campaign-mailer';if(headerOf(headers,'X-GNK-ASG-Idempotency-Key'))return'media-center';return clean(hint)||'system';}
function sourceIdOf(headers){return headerOf(headers,'X-GNK-ASG-Manual-Mail-Id')||headerOf(headers,'X-GNK-ASG-Campaign-Contact-Id')||headerOf(headers,'X-GNK-ASG-Idempotency-Key')||headerOf(headers,'X-GNK-ASG-Reference')||'';}

export function withEmailStatusTracking(env,sourceHint='system'){
 if(!env||env.__GNK_ASG_EMAIL_STATUS_TRACKED===VERSION)return env;
 const binding=env.EMAIL;if(!binding||typeof binding.send!=='function')return env;
 const raw=rawTracking.withEmailStatusTracking(env,sourceHint);
 return new Proxy(env,{get(target,property,receiver){
  if(property==='__GNK_ASG_EMAIL_STATUS_TRACKED')return VERSION;
  if(property==='EMAIL')return{send:async payload=>{
   const structured=payload&&typeof payload==='object'&&('subject'in payload||'html'in payload||'text'in payload);
   if(!structured)return raw.EMAIL.send(payload);
   const existingHeaders=headersOf(payload.headers),sourceSystem=sourceOf(existingHeaders,sourceHint),sourceId=sourceIdOf(existingHeaders),recipient=emailOf(payload.to),sender=emailOf(payload.from),subject=clean(payload.subject),originalHtml=String(payload.html||'');
   let tracking={trackingId:'',html:originalHtml,tracked:false};
   try{tracking=await createTrackedMessage(target,{sourceSystem,sourceId,recipient,sender,subject,html:originalHtml});}catch(error){console.error('email-status-structured-create',error);}
   const headers={...existingHeaders};if(tracking.tracked){headers['X-GNK-ASG-Tracking-Id']=tracking.trackingId;headers['X-GNK-ASG-Tracking-Version']=VERSION;}
   const outbound={...payload,headers};if(tracking.tracked&&originalHtml)outbound.html=tracking.html;
   try{const result=await binding.send.call(binding,outbound);await markEmailAccepted(target,tracking.trackingId,clean(result?.messageId)).catch(error=>console.error('email-status-structured-accepted',error));return result;}
   catch(error){await markEmailFailure(target,tracking.trackingId,error).catch(inner=>console.error('email-status-structured-failed',inner));throw error;}
  }};
  return Reflect.get(target,property,receiver);
 }});
}
