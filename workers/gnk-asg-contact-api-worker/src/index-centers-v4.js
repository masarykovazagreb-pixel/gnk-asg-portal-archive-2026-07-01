import app from './index-signature-v3.js';
import {assignReceivingCenter,centerLabel,VERSION as CENTERS_VERSION} from '../../gnk-asg-direct-operator/src/mail-receiving-centers-v1.js';

export const VERSION='GNK_ASG_CONTACT_CENTERS_WRAPPER_V4_20260628';
const CASE_PATTERN=/\[(GNK-ASG-[^\]]+)\]/i;
const clean=value=>String(value??'').trim();

function caseIdFrom(payload={}){
  return clean(payload.subject).match(CASE_PATTERN)?.[1]||clean(payload.headers?.['X-GNK-ASG-Case-Id']);
}

function insertText(text,line){
  const source=String(text||'');
  if(source.includes(line))return source;
  const marker='Sačuvajte evidencijski broj radi buduće komunikacije.';
  if(source.includes(marker))return source.replace(marker,`${line}\n\n${marker}`);
  const closing='Srdačan pozdrav,';
  if(source.includes(closing))return source.replace(closing,`${line}\n\n${closing}`);
  return `${source}\n\n${line}`.trim();
}

function insertHtml(html,line){
  const source=String(html||'');
  if(source.includes(line))return source;
  const block=`<p><b>Digitalni centar zaprimanja:</b> ${line}</p>`;
  const marker='<p>Sačuvajte evidencijski broj radi buduće komunikacije.</p>';
  if(source.includes(marker))return source.replace(marker,`${block}${marker}`);
  const signature='<table data-gnk-asg-signature=';
  const position=source.indexOf(signature);
  if(position>=0)return `${source.slice(0,position)}${block}${source.slice(position)}`;
  return `${source}${block}`;
}

export function applyReceivingCenterToPayload(payload={}){
  const caseId=caseIdFrom(payload);
  if(!caseId)return payload;
  const center=assignReceivingCenter(caseId);
  const label=centerLabel(center,'hr');
  const autoReply=/Potvrda zaprimanja upita/i.test(clean(payload.subject));
  const textLine=autoReply
    ? `Vašu poruku evidentirao je GNK ASG digitalni centar zaprimanja: ${label}.`
    : `Dodijeljeni GNK ASG digitalni centar zaprimanja: ${label}.`;
  return{
    ...payload,
    text:insertText(payload.text,textLine),
    html:insertHtml(payload.html,label),
    headers:{...(payload.headers||{}),'X-GNK-ASG-Receiving-Center':center.code,'X-GNK-ASG-Receiving-Centers-Version':CENTERS_VERSION,'X-GNK-ASG-Case-Id':caseId}
  };
}

function centeredEnv(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{send(payload){return binding.send.call(binding,applyReceivingCenterToPayload(payload));}}
  });
  return wrapped;
}

async function patchResponse(response){
  if(!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.clone().json();
    if(!payload?.caseId)return response;
    const center=assignReceivingCenter(payload.caseId);
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('x-gnk-asg-contact-centers',VERSION);
    return new Response(JSON.stringify({...payload,receivingCenter:{...center,labelHr:centerLabel(center,'hr'),labelEn:centerLabel(center,'en')},receivingCentersVersion:CENTERS_VERSION},null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-contact-centers',VERSION);
  headers.set('x-gnk-asg-receiving-centers',CENTERS_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,centeredEnv(env),ctx);
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    if(path==='/api/contact-submit'&&request.method==='POST')return stamp(await patchResponse(response));
    return stamp(response);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,centeredEnv(env),ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,centeredEnv(env),ctx);}
};
