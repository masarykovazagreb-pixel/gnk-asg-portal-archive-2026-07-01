import * as base from './mail-studio-extension-v1.js';

export const VERSION='GNK_ASG_MAIL_STUDIO_EXTENSION_V4_20260702_MANUAL_SEND_GUARD';
export const UI_VERSION=base.UI_VERSION;
export const PROFILES=base.PROFILES;
export const GLOBAL_CENTRES=base.GLOBAL_CENTRES;

const clean=value=>String(value??'').trim();
const kvOf=env=>env?.GNK_ASG_KV||env?.GNK_ASG_CONFIG_KV||null;
const dbOf=env=>env?.GNK_ASG_D1||null;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const int=(value,fallback,min=0,max=2147483647)=>Math.min(max,Math.max(min,Number.isFinite(Number(value))?Math.trunc(Number(value)):fallback));
const SEND_PATHS=new Set(['/api/admin-mail-send','/api/studio-message/send']);

function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-mail-studio-extension':VERSION}});}
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}

async function manualSendGate(request,env){
  if(request.method!=='POST'||!SEND_PATHS.has(pathOf(request)))return null;
  const db=dbOf(env);if(!db?.prepare)return null;
  const dailyLimit=int(env.MAIL_MANUAL_MAX_PER_DAY,5,1,50);
  const minInterval=int(env.MAIL_MANUAL_MIN_INTERVAL_SECONDS,600,60,86400);
  try{
    const row=await db.prepare(`SELECT COUNT(*) AS used,MAX(sent_at) AS last_sent_at FROM manual_mail_messages WHERE status IN ('SENT','PARTIAL') AND sent_at IS NOT NULL AND strftime('%s',sent_at)>=strftime('%s','now','start of day')`).first();
    const used=Number(row?.used||0),lastSentAt=clean(row?.last_sent_at);
    if(used>=dailyLimit)return json({ok:false,error:'manual_daily_limit_reached',message:`Dosegnut je dnevni limit ručnog slanja (${used}/${dailyLimit}).`,used,limit:dailyLimit,resetsAt:'00:00 UTC'},429);
    if(lastSentAt){
      const elapsed=Math.floor((Date.now()-Date.parse(lastSentAt))/1000);
      if(Number.isFinite(elapsed)&&elapsed<minInterval){const retryAfterSeconds=minInterval-elapsed;return json({ok:false,error:'manual_send_interval_active',message:`Pričekajte još ${Math.ceil(retryAfterSeconds/60)} min prije sljedeće ručne poruke.`,retryAfterSeconds,minIntervalSeconds:minInterval,used,limit:dailyLimit},429);}
    }
    return null;
  }catch(error){console.error('mail-studio-manual-gate',error);return null;}
}

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

function senderEmail(payload){
  const from=payload?.from;
  return clean(from&&typeof from==='object'?from.email:from).toLowerCase();
}

function insertBeforeLast(source,needle,insertion){
  const index=source.toLowerCase().lastIndexOf(String(needle||'').toLowerCase());
  return index<0?`${source.trim()}\n${insertion}`:`${source.slice(0,index)}${insertion}\n${source.slice(index)}`;
}

function replaceText(value,city,email){
  let result=String(value||'')
    .replace(/^\s*(?:Global Service Centre|Globalni operativni centar|Globalni medijski ured|GLOBAL MEDIA DESK|GLOBALNI MEDIJSKI URED):\s*[^\r\n]*\r?\n?/gim,'')
    .replace(/^\s*rotates automatically through 10 cities\s*\r?\n?/gim,'')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
  const line=`Global Service Centre: ${city.name}`;
  return email?insertBeforeLast(result,email,line):`${result}\n${line}`;
}

function replaceHtml(value,city){
  const cityHtml=esc(city.name);
  let result=String(value||'')
    .replace(/<div[^>]*>\s*(?:Globalni operativni centar\s*\/\s*)?Global Service Centre:\s*(?:<strong>)?[^<]*(?:<\/strong>)?\s*<\/div>/gi,'')
    .replace(/<div[^>]*>\s*(?:Global Media Desk|Globalni medijski ured):\s*(?:<strong>)?[^<]*(?:<\/strong>)?\s*<\/div>/gi,'')
    .replace(/Global Service Centre:\s*rotates automatically through 10 cities/gi,'')
    .replace(/rotates automatically through 10 cities/gi,'');
  const line=`<div>Global Service Centre: <strong>${cityHtml}</strong></div>`;
  if(/<div><a href="mailto:/i.test(result))return result.replace(/<div><a href="mailto:/i,`${line}<div><a href="mailto:`);
  if(/<a href="mailto:/i.test(result))return result.replace(/<a href="mailto:/i,`${line}<a href="mailto:`);
  return `${result}${line}`;
}

function rewritePayload(payload,city){
  const next={...payload},email=senderEmail(payload);
  if('text'in next)next.text=replaceText(next.text,city,email);
  if('plainText'in next)next.plainText=replaceText(next.plainText,city,email);
  if('body'in next&&typeof next.body==='string'&&!/<[a-z][\s\S]*>/i.test(next.body))next.body=replaceText(next.body,city,email);
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
    const failure=Array.isArray(data?.results)?data.results.find(item=>item?.status==='FAILED'):null;
    const providerCode=clean(data?.errorCode||failure?.errorCode);
    const providerMessage=clean(data?.message||data?.errorMessage||failure?.message||data?.error);
    const enriched={...data,...(providerCode?{errorCode:providerCode}:{}),...(providerMessage?{error:providerMessage,message:providerMessage}:{}),globalCentre:{id:city.id,name:city.name},city:city.name};
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('x-gnk-asg-mail-studio-extension',VERSION);
    if(providerCode)headers.set('x-gnk-asg-email-error-code',providerCode);
    return new Response(JSON.stringify(enriched,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export async function handleMailStudioExtension(request,env,ctx,app){
  const blocked=await manualSendGate(request,env);if(blocked)return blocked;
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