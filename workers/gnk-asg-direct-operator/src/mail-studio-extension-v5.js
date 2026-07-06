import * as base from './mail-studio-extension-v4.js';

export const VERSION=`GNK_ASG_MAIL_STUDIO_EXTENSION_V15_20260706_RECIPIENT_NORMALIZATION_${base.VERSION}`;
export const UI_VERSION=base.UI_VERSION;
export const PROFILES=base.PROFILES;
export const GLOBAL_CENTRES=base.GLOBAL_CENTRES;
export const normalizeMailStudioSignature=base.normalizeMailStudioSignature;

const clean=value=>String(value??'').trim();
const emailOf=value=>{
  if(!value)return'';
  if(Array.isArray(value))return emailOf(value[0]);
  if(typeof value==='object')return clean(value.email||value.address).toLowerCase();
  const raw=clean(value),match=raw.match(/<([^>]+)>/);
  return clean(match?.[1]||raw).toLowerCase();
};
const splitEmails=value=>{
  const out=[];
  const add=item=>{
    if(!item)return;
    if(Array.isArray(item)){item.forEach(add);return;}
    if(typeof item==='object'){add(item.email||item.address);return;}
    String(item).split(/[;,]+/).forEach(part=>{
      const email=emailOf(part);
      if(email&&!out.includes(email))out.push(email);
    });
  };
  add(value);
  return out;
};
const validEmail=email=>/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i.test(clean(email));
const recipientArray=value=>splitEmails(value).filter(validEmail);
function normalizePayload(payload={}){
  const next={...payload};
  const to=emailOf(next.to);
  if(to&&validEmail(to))next.to=to;
  const cc=recipientArray(next.cc);
  const bcc=recipientArray(next.bcc);
  if(cc.length)next.cc=cc;else delete next.cc;
  if(bcc.length)next.bcc=bcc;else delete next.bcc;
  next.headers={...(next.headers||{}),'X-GNK-ASG-Mail-Recipient-Normalization':VERSION};
  return next;
}
function withRecipientNormalization(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  return new Proxy(env||{}, {get(target,property,receiver){
    if(property==='EMAIL')return{send(payload){return binding.send.call(binding,normalizePayload(payload));}};
    return Reflect.get(target,property,receiver);
  }});
}
function stamp(response){
  if(!response)return response;
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-mail-studio-extension',VERSION);
  headers.set('x-gnk-asg-recipient-normalization','enabled');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export async function handleMailStudioExtension(request,env,ctx,app){return stamp(await base.handleMailStudioExtension(request,withRecipientNormalization(env),ctx,app));}
export async function patchMailStudioResponse(request,response){return stamp(await base.patchMailStudioResponse(request,response));}
export async function handleMailStudioInbound(message,env,ctx){return base.handleMailStudioInbound(message,withRecipientNormalization(env),ctx);}
export const __test={emailOf,splitEmails,validEmail,recipientArray,normalizePayload,withRecipientNormalization};
