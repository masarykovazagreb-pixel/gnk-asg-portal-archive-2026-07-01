import * as base from './mail-studio-extension-v2.js';
import {enforceMediaGoldSignature,isMediaSender,VERSION as MEDIA_SIGNATURE_VERSION} from './media-email-gold-signature-v2.js';
import {institutionalSignature,LOGO_URL,VERSION as BRAND_SIGNATURE_VERSION} from './email-brand-signature-v1.js';
import {prepareMailSyncInbound,recordMailSyncOutbound,VERSION as MAIL_SYNC_VERSION} from './mail-sync-center-v2.js';

export const VERSION=`GNK_ASG_MAIL_STUDIO_EXTENSION_V12_20260706_RAW_EMAILMESSAGE_MANUAL_SEND_${MAIL_SYNC_VERSION}`;
export const UI_VERSION=base.UI_VERSION;
export const PROFILES=base.PROFILES;
export const GLOBAL_CENTRES=base.GLOBAL_CENTRES;

const DUPLICATE_INSTITUTIONAL_TRAILER=/\n{2,}(?:Srdačan pozdrav,\n{2,})?[^\n]{1,220}\nGNK ASG d\.o\.o\.\nZagrebačka cesta 130, 10090 Zagreb\nOIB: 75227917632 · MBS: 081512375\nWeb: https:\/\/gnk-asg\.hr\nE-mail: [^\n]+\s*$/u;
const SIGNATURE_TABLE=/<table\b[^>]*data-gnk-asg-signature=["'][^"']*["'][^>]*>[\s\S]*?<\/table>/gi;
const CENTRE_INDEX_KEY=/^mail-studio:centre-index:(?:global|inbound|outbound):v1$/;

const clean=value=>String(value??'').trim();
const escapeRegExp=value=>String(value??'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const safeHeader=value=>clean(value).replace(/[\r\n]+/g,' ').slice(0,300);
const emailList=value=>{
  const values=[];
  const add=item=>{
    if(!item)return;
    if(Array.isArray(item)){item.forEach(add);return;}
    if(item&&typeof item==='object'){add(item.email||item.address||'');return;}
    String(item).split(/[;,\s]+/).forEach(part=>{const raw=clean(part),match=raw.match(/<([^>]+)>/);const email=clean(match?.[1]||raw).replace(/[<>"'()]/g,'').toLowerCase();if(email&&/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email))values.push(email);});
  };
  add(value);
  return[...new Set(values)];
};
function htmlToText(html){return clean(String(html||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>/gi,'\n\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'),120000)}
function boundary(){return 'gnk_asg_manual_'+Math.random().toString(16).slice(2)+Date.now().toString(16)}
function rawEmail(payload){
  const b=boundary();
  const from=senderEmail(payload.from)||'office@gnk-asg.hr';
  const fromName=payload.from&&typeof payload.from==='object'?clean(payload.from.name):'GNK ASG';
  const to=emailList(payload.to),cc=emailList(payload.cc),bcc=emailList(payload.bcc);
  const text=clean(payload.text||payload.plainText||payload.bodyText||htmlToText(payload.html||payload.bodyHtml||payload.htmlBody||payload.body),120000)||'GNK ASG message';
  const html=clean(payload.html||payload.bodyHtml||payload.htmlBody||payload.messageHtml||payload.contentHtml||text.replace(/\n/g,'<br>'),120000);
  const headers=[`From: "${safeHeader(fromName)}" <${safeHeader(from)}>`,to.length?`To: ${to.map(x=>`<${x}>`).join(', ')}`:null,cc.length?`Cc: ${cc.map(x=>`<${x}>`).join(', ')}`:null,bcc.length?`Bcc: ${bcc.map(x=>`<${x}>`).join(', ')}`:null,payload.replyTo?`Reply-To: <${safeHeader(payload.replyTo)}>`:null,`Subject: ${safeHeader(payload.subject||'GNK ASG message')}`,'MIME-Version: 1.0',`Content-Type: multipart/alternative; boundary="${b}"`,`X-GNK-ASG-Mail-Studio-Raw: ${VERSION}`].filter(Boolean);
  return{from,to,raw:`${headers.join('\r\n')}\r\n\r\n--${b}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${text}\r\n\r\n--${b}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${html}\r\n\r\n--${b}--`};
}
function toProviderMessage(payload){
  const normalized=normalizeMailStudioSignature(payload);
  if(typeof EmailMessage==='undefined')return normalized;
  const built=rawEmail(normalized);
  if(!built.to.length)return normalized;
  return new EmailMessage(built.from,built.to[0],built.raw);
}

function senderEmail(from){
  if(from&&typeof from==='object')return clean(from.email||from.address).toLowerCase();
  const raw=clean(from),match=raw.match(/<([^>]+)>/);
  return clean(match?.[1]||raw).toLowerCase();
}
function payloadHeader(payload,name){
  const headers=payload?.headers;
  if(headers instanceof Headers)return clean(headers.get(name));
  if(!headers||typeof headers!=='object')return'';
  const key=Object.keys(headers).find(item=>item.toLowerCase()===name.toLowerCase());
  return key?clean(headers[key]):'';
}
function profileFor(payload){
  const email=senderEmail(payload?.from);
  const known=Object.values(base.PROFILES||{}).find(profile=>profile.email===email);
  if(known)return known;
  const from=payload?.from;
  const name=from&&typeof from==='object'?clean(from.name):clean(from).replace(/\s*<[^>]+>\s*$/,'');
  return email?{name:name||'GNK ASG',unit:'GNK ASG',email}:null;
}
function centreFor(payload,text){
  const value=payloadHeader(payload,'X-GNK-ASG-Global-Centre')||clean(text).match(/Global Service Centre:\s*([^\n]+)/i)?.[1]||'';
  if(!value)return null;
  const parts=value.split(',').map(clean).filter(Boolean);
  return{name:parts.shift()||value,country:parts.join(', ')};
}
function dedupeInstitutionalText(value){
  const text=clean(value);
  if(!/Global Service Centre:/i.test(text))return text;
  return text.replace(DUPLICATE_INSTITUTIONAL_TRAILER,'').trim();
}
function replaceInstitutionalText(value,profile,signature){
  let text=dedupeInstitutionalText(value);
  const pattern=new RegExp(`\n{2,}(?:Srdačan pozdrav,\n{2,})?${escapeRegExp(profile.name)}\n${escapeRegExp(profile.unit)}\nGlobal Service Centre:[\s\S]*$`,'iu');
  text=text.replace(pattern,'').trim();
  return`${text}${text?'\n\n':''}${signature.text}`;
}
function replaceInstitutionalHtml(value,signature){
  const html=String(value||'').replace(SIGNATURE_TABLE,'').trim();
  if(/<\/body>/i.test(html))return html.replace(/<\/body>/i,`${signature.html}</body>`);
  return`${html}${signature.html}`;
}
function normalizeInstitutional(payload){
  const profile=profileFor(payload);
  if(!profile)return payload;
  const sourceText=clean(payload.text||payload.plainText||(!/<[a-z][\s\S]*>/i.test(String(payload.body||''))?payload.body:''));
  const centre=centreFor(payload,sourceText);
  const signature=institutionalSignature(profile,centre);
  const next={...payload};
  next.text=replaceInstitutionalText(sourceText,profile,signature);
  if('plainText'in payload)next.plainText=next.text;
  if('body'in payload&&typeof payload.body==='string'&&!/<[a-z][\s\S]*>/i.test(payload.body))next.body=next.text;
  const sourceHtml=String(payload.html||payload.bodyHtml||payload.htmlBody||'');
  if(sourceHtml){next.html=replaceInstitutionalHtml(sourceHtml,signature);if('bodyHtml'in payload)next.bodyHtml=next.html;if('htmlBody'in payload)next.htmlBody=next.html;}
  return next;
}
export function normalizeMailStudioSignature(payload={}){
  let next;
  if(isMediaSender(payload.from)){next=enforceMediaGoldSignature(payload);if('plainText'in payload)next.plainText=next.text;if('bodyHtml'in payload)next.bodyHtml=next.html;if('htmlBody'in payload)next.htmlBody=next.html;}
  else next=normalizeInstitutional(payload);
  next.headers={...(next.headers||{}),'X-GNK-ASG-Signature-Parity':VERSION,'X-GNK-ASG-Brand-Signature-Version':BRAND_SIGNATURE_VERSION,'X-GNK-ASG-Media-Signature-Version':MEDIA_SIGNATURE_VERSION,'X-GNK-ASG-Brand-Logo':LOGO_URL,'X-GNK-ASG-Centre-Selection':'RANDOM_10'};
  return next;
}
function randomCentreIndex(randomValue){
  const count=GLOBAL_CENTRES.length;if(!count)throw new Error('global_centres_missing');
  let value=randomValue;if(!Number.isInteger(value)){const random=new Uint32Array(1);crypto.getRandomValues(random);value=random[0];}
  return((value%count)+count)%count;
}
function randomCentreKv(binding){
  const target=binding&&typeof binding==='object'?binding:{};
  return new Proxy(target,{get(current,property,receiver){
    if(property==='get')return async(key,...args)=>{if(CENTRE_INDEX_KEY.test(String(key)))return String(randomCentreIndex());return typeof current.get==='function'?current.get.call(current,key,...args):null;};
    if(property==='put')return async(...args)=>typeof current.put==='function'?current.put.call(current,...args):undefined;
    if(property==='delete')return async(...args)=>typeof current.delete==='function'?current.delete.call(current,...args):undefined;
    const value=Reflect.get(current,property,receiver);return typeof value==='function'?value.bind(current):value;
  }});
}
function withNormalizedEmail(env){
  const binding=env?.EMAIL,kvCache=new Map();
  return new Proxy(env||{},{get(target,property,receiver){
    if(property==='EMAIL'&&binding&&typeof binding.send==='function')return{send(payload){return binding.send.call(binding,toProviderMessage(payload));}};
    if(property==='GNK_ASG_KV'||property==='GNK_ASG_CONFIG_KV'){if(!kvCache.has(property))kvCache.set(property,randomCentreKv(Reflect.get(target,property,receiver)));return kvCache.get(property);}
    return Reflect.get(target,property,receiver);
  }});
}
function stamp(response){
  if(!response)return response;const headers=new Headers(response.headers);headers.set('x-gnk-asg-mail-studio-extension',VERSION);headers.set('x-gnk-asg-signature-parity',VERSION);headers.set('x-gnk-asg-centre-selection','RANDOM_10');headers.set('x-gnk-asg-mail-sync',MAIL_SYNC_VERSION);headers.set('x-gnk-asg-manual-provider','raw-emailmessage');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function requestPayload(request){try{return await request.clone().json();}catch{return null;}}
async function indexOutbound(request,response,env,ctx){
  if(request.method!=='POST'||!response||![200,207].includes(response.status))return;
  const body=await requestPayload(request);if(!body)return;
  let result={};try{result=await response.clone().json();}catch{return;}
  const profile=result.profile||base.PROFILES?.[clean(body.profile||body.signatureProfile).toLowerCase()]||null;
  const providerMessageId=clean(result.results?.find(item=>item.messageId)?.messageId);
  const task=recordMailSyncOutbound(env,{id:result.id,sourceId:result.id,profileId:profile?.id||'',from:profile?{email:profile.email,name:profile.name}:body.from,to:result.to||body.to,cc:result.cc||body.cc,bcc:result.bcc||body.bcc,subject:result.subject||body.subject,text:body.text||body.plainText||body.bodyText||'',html:body.html||body.bodyHtml||body.htmlBody||body.messageHtml||'',attachmentCount:Number(result.attachments?.count||body.attachments?.length||0),status:result.status||'SENT',providerMessageId,createdAt:new Date().toISOString(),sentAt:new Date().toISOString(),sourceSystem:'mail-studio'}).catch(error=>console.error('mail-sync-outbound',error));
  if(ctx?.waitUntil)ctx.waitUntil(task);else await task;
}
export async function handleMailStudioExtension(request,env,ctx,app){
  const response=await base.handleMailStudioExtension(request,withNormalizedEmail(env),ctx,app);
  await indexOutbound(request,response,env,ctx);
  return stamp(response);
}
export async function patchMailStudioResponse(request,response){return stamp(await base.patchMailStudioResponse(request,response));}
export async function handleMailStudioInbound(message,env,ctx){
  const prepared=prepareMailSyncInbound(message,env);
  if(ctx?.waitUntil)ctx.waitUntil(Promise.resolve(prepared.capture).catch(error=>console.error('mail-sync-inbound',error)));
  else await prepared.capture.catch?.(error=>console.error('mail-sync-inbound',error));
  const result=await base.handleMailStudioInbound(prepared.message,withNormalizedEmail(env),ctx);
  if(result)return{...result,message:prepared.message,signatureParity:VERSION,centreSelection:'RANDOM_10',mailSync:MAIL_SYNC_VERSION};
  return{handled:false,message:prepared.message,signatureParity:VERSION,centreSelection:'RANDOM_10',mailSync:MAIL_SYNC_VERSION};
}
export const __test={dedupeInstitutionalText,normalizeMailStudioSignature,replaceInstitutionalText,replaceInstitutionalHtml,randomCentreIndex,randomCentreKv,withNormalizedEmail,toProviderMessage,emailList,rawEmail};
