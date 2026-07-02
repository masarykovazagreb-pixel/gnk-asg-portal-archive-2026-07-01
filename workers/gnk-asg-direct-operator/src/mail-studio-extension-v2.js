import * as base from './mail-studio-extension-v1.js';

export const VERSION='GNK_ASG_MAIL_STUDIO_EXTENSION_V2_20260702_RANDOM_CITY_ONLY';
export const UI_VERSION=base.UI_VERSION;
export const PROFILES=base.PROFILES;
export const GLOBAL_CENTRES=base.GLOBAL_CENTRES;

const clean=value=>String(value??'').trim();
const kvOf=env=>env?.GNK_ASG_KV||env?.GNK_ASG_CONFIG_KV||null;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function randomIndex(length){
  const bytes=new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0]%length;
}

async function chooseRandomCity(env,scope){
  const kv=kvOf(env),key=`mail-studio:last-random-city:${scope}:v2`;
  let last='';
  try{last=clean(await kv?.get?.(key));}catch{}
  const available=GLOBAL_CENTRES.filter(city=>city.id!==last);
  const pool=available.length?available:GLOBAL_CENTRES;
  const city=pool[randomIndex(pool.length)]||GLOBAL_CENTRES[0];
  try{await kv?.put?.(key,city.id);}catch{}
  return city;
}

function replaceText(value,city){
  return String(value||'')
    .replace(/^Global Service Centre:\s*[^\r\n]+$/gim,city.name)
    .replace(/^Globalni operativni centar:\s*[^\r\n]+$/gim,city.name)
    .replace(/^Globalni medijski ured:\s*[^\r\n]+$/gim,city.name)
    .replace(/^GLOBAL MEDIA DESK:\s*[^\r\n]+$/gim,city.name)
    .replace(/^GLOBALNI MEDIJSKI URED:\s*[^\r\n]+$/gim,city.name)
    .replace(/^Global Service Centre:\s*rotates automatically through 10 cities$/gim,city.name);
}

function replaceHtml(value,city){
  const cityHtml=esc(city.name);
  return String(value||'')
    .replace(/Globalni operativni centar\s*\/\s*Global Service Centre:\s*<strong>[^<]*<\/strong>/gi,`<strong>${cityHtml}</strong>`)
    .replace(/Global Service Centre:\s*<strong>[^<]*<\/strong>/gi,`<strong>${cityHtml}</strong>`)
    .replace(/Global Media Desk:\s*<strong>[^<]*<\/strong>/gi,`<strong>${cityHtml}</strong>`)
    .replace(/Globalni medijski ured:\s*<strong>[^<]*<\/strong>/gi,`<strong>${cityHtml}</strong>`)
    .replace(/Global Service Centre:\s*rotates automatically through 10 cities/gi,cityHtml)
    .replace(/Global Service Centre:\s*[^<\r\n]+/gi,cityHtml)
    .replace(/Globalni operativni centar:\s*[^<\r\n]+/gi,cityHtml);
}

function rewritePayload(payload,city){
  const next={...payload};
  if('text'in next)next.text=replaceText(next.text,city);
  if('plainText'in next)next.plainText=replaceText(next.plainText,city);
  if('body'in next&&typeof next.body==='string'&&!/<[a-z][\s\S]*>/i.test(next.body))next.body=replaceText(next.body,city);
  for(const key of ['html','bodyHtml','htmlBody','messageHtml','contentHtml'])if(key in next)next[key]=replaceHtml(next[key],city);
  next.headers={...(next.headers||{}),'X-GNK-ASG-City':city.name,'X-GNK-ASG-Global-Centre':city.name,'X-GNK-ASG-Mail-Studio-Extension':VERSION};
  return next;
}

function withCityEmail(env,city){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  return new Proxy(env,{get(target,property,receiver){
    if(property==='EMAIL')return{send(payload){return binding.send.call(binding,rewritePayload(payload,city));}};
    return Reflect.get(target,property,receiver);
  }});
}

function withCityForward(message,city){
  if(!message||typeof message.forward!=='function')return message;
  return new Proxy(message,{get(target,property,receiver){
    if(property==='forward')return async(destination,headers)=>{
      const next=new Headers(headers||{});
      next.set('X-GNK-ASG-City',city.name);
      next.set('X-GNK-ASG-Global-Centre',city.name);
      return target.forward(destination,next);
    };
    return Reflect.get(target,property,receiver);
  }});
}

async function patchJsonResponse(response,city){
  if(!response||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const data=await response.clone().json();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('x-gnk-asg-mail-studio-extension',VERSION);
    return new Response(JSON.stringify({...data,globalCentre:{id:city.id,name:city.name},city:city.name},null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export async function handleMailStudioExtension(request,env,ctx,app){
  const city=await chooseRandomCity(env,'outbound');
  const response=await base.handleMailStudioExtension(request,withCityEmail(env,city),ctx,app);
  return response?patchJsonResponse(response,city):null;
}

export async function patchMailStudioResponse(request,response){
  const patched=await base.patchMailStudioResponse(request,response);
  const headers=new Headers(patched.headers);
  headers.set('x-gnk-asg-mail-studio-extension',VERSION);
  return new Response(patched.body,{status:patched.status,statusText:patched.statusText,headers});
}

export async function handleMailStudioInbound(message,env,ctx){
  const city=await chooseRandomCity(env,'inbound');
  const result=await base.handleMailStudioInbound(withCityForward(message,city),withCityEmail(env,city),ctx);
  return result?{...result,globalCentre:{id:city.id,name:city.name},city:city.name}:result;
}
