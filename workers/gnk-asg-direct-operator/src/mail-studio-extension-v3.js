import * as base from './mail-studio-extension-v2.js';
import {enforceMediaGoldSignature,isMediaSender,VERSION as MEDIA_SIGNATURE_VERSION} from './media-email-gold-signature-v2.js';
import {institutionalSignature,LOGO_URL,VERSION as BRAND_SIGNATURE_VERSION} from './email-brand-signature-v1.js';

export const VERSION='GNK_ASG_MAIL_STUDIO_EXTENSION_V7_20260704_CANONICAL_SIGNATURES';
export const UI_VERSION=base.UI_VERSION;
export const PROFILES=base.PROFILES;
export const GLOBAL_CENTRES=base.GLOBAL_CENTRES;

const DUPLICATE_INSTITUTIONAL_TRAILER=/\n{2,}(?:Srdačan pozdrav,\n{2,})?[^\n]{1,220}\nGNK ASG d\.o\.o\.\nZagrebačka cesta 130, 10090 Zagreb\nOIB: 75227917632 · MBS: 081512375\nWeb: https:\/\/gnk-asg\.hr\nE-mail: [^\n]+\s*$/u;
const SIGNATURE_TABLE=/<table\b[^>]*data-gnk-asg-signature=["'][^"']*["'][^>]*>[\s\S]*?<\/table>/gi;

const clean=value=>String(value??'').trim();
const escapeRegExp=value=>String(value??'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

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
  const pattern=new RegExp(`\\n{2,}(?:Srdačan pozdrav,\\n{2,})?${escapeRegExp(profile.name)}\\n${escapeRegExp(profile.unit)}\\nGlobal Service Centre:[\\s\\S]*$`,'iu');
  text=text.replace(pattern,'').trim();
  return `${text}${text?'\n\n':''}${signature.text}`;
}

function replaceInstitutionalHtml(value,signature){
  const html=String(value||'').replace(SIGNATURE_TABLE,'').trim();
  if(/<\/body>/i.test(html))return html.replace(/<\/body>/i,`${signature.html}</body>`);
  return `${html}${signature.html}`;
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
  if(sourceHtml){
    next.html=replaceInstitutionalHtml(sourceHtml,signature);
    if('bodyHtml'in payload)next.bodyHtml=next.html;
    if('htmlBody'in payload)next.htmlBody=next.html;
  }
  return next;
}

export function normalizeMailStudioSignature(payload={}){
  let next;
  if(isMediaSender(payload.from)){
    next=enforceMediaGoldSignature(payload);
    if('plainText'in payload)next.plainText=next.text;
    if('bodyHtml'in payload)next.bodyHtml=next.html;
    if('htmlBody'in payload)next.htmlBody=next.html;
  }else{
    next=normalizeInstitutional(payload);
  }
  next.headers={
    ...(next.headers||{}),
    'X-GNK-ASG-Signature-Parity':VERSION,
    'X-GNK-ASG-Brand-Signature-Version':BRAND_SIGNATURE_VERSION,
    'X-GNK-ASG-Media-Signature-Version':MEDIA_SIGNATURE_VERSION,
    'X-GNK-ASG-Brand-Logo':LOGO_URL
  };
  return next;
}

function withNormalizedEmail(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  return new Proxy(env,{get(target,property,receiver){
    if(property==='EMAIL')return{send(payload){return binding.send.call(binding,normalizeMailStudioSignature(payload));}};
    return Reflect.get(target,property,receiver);
  }});
}

function stamp(response){
  if(!response)return response;
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-mail-studio-extension',VERSION);
  headers.set('x-gnk-asg-signature-parity',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export async function handleMailStudioExtension(request,env,ctx,app){
  return stamp(await base.handleMailStudioExtension(request,withNormalizedEmail(env),ctx,app));
}

export async function patchMailStudioResponse(request,response){
  return stamp(await base.patchMailStudioResponse(request,response));
}

export async function handleMailStudioInbound(message,env,ctx){
  const result=await base.handleMailStudioInbound(message,withNormalizedEmail(env),ctx);
  return result?{...result,signatureParity:VERSION}:result;
}

export const __test={dedupeInstitutionalText,normalizeMailStudioSignature,replaceInstitutionalText,replaceInstitutionalHtml};