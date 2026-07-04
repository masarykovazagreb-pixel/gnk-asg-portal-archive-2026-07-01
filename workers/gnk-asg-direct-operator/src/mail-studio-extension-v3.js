import * as base from './mail-studio-extension-v2.js';
import {enforceMediaGoldSignature,isMediaSender,VERSION as MEDIA_SIGNATURE_VERSION} from './media-email-gold-signature-v2.js';

export const VERSION='GNK_ASG_MAIL_STUDIO_EXTENSION_V6_20260704_SIGNATURE_PARITY';
export const UI_VERSION=base.UI_VERSION;
export const PROFILES=base.PROFILES;
export const GLOBAL_CENTRES=base.GLOBAL_CENTRES;

const DUPLICATE_INSTITUTIONAL_TRAILER=/\n{2,}(?:Srdačan pozdrav,\n{2,})?[^\n]{1,220}\nGNK ASG d\.o\.o\.\nZagrebačka cesta 130, 10090 Zagreb\nOIB: 75227917632 · MBS: 081512375\nWeb: https:\/\/gnk-asg\.hr\nE-mail: [^\n]+\s*$/u;

function dedupeInstitutionalText(value){
  const text=String(value??'').trim();
  if(!/Global Service Centre:/i.test(text))return text;
  return text.replace(DUPLICATE_INSTITUTIONAL_TRAILER,'').trim();
}

function normalizeTextFields(payload){
  const next={...payload};
  for(const key of ['text','plainText'])if(key in next)next[key]=dedupeInstitutionalText(next[key]);
  if('body'in next&&typeof next.body==='string'&&!/<[a-z][\s\S]*>/i.test(next.body))next.body=dedupeInstitutionalText(next.body);
  return next;
}

export function normalizeMailStudioSignature(payload={}){
  let next=normalizeTextFields(payload);
  if(isMediaSender(next.from)){
    next=enforceMediaGoldSignature(next);
    if('plainText'in payload)next.plainText=next.text;
    if('bodyHtml'in payload)next.bodyHtml=next.html;
    if('htmlBody'in payload)next.htmlBody=next.html;
  }
  next.headers={...(next.headers||{}),'X-GNK-ASG-Signature-Parity':VERSION,'X-GNK-ASG-Media-Signature-Version':MEDIA_SIGNATURE_VERSION};
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

export const __test={dedupeInstitutionalText,normalizeMailStudioSignature};