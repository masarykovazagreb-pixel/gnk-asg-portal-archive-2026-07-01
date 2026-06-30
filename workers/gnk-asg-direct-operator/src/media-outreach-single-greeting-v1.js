import {validateEnglishOnlyContent} from './media-outreach-final-message-v1.js';

export const VERSION='GNK_ASG_MEDIA_OUTREACH_SINGLE_GREETING_V1_20260630';

const clean=value=>String(value??'').trim();

function header(payload,name){
  const headers=payload?.headers||{};
  return clean(headers[name]??headers[name.toLowerCase()]??headers[name.toUpperCase()]);
}

function isMediaOutreach(payload={}){
  return Boolean(header(payload,'X-GNK-Delivery-Version')||header(payload,'X-GNK-ASG-Outreach-Delivery'));
}

function greetingFromText(text=''){
  const first=String(text||'').split(/\r?\n/).map(clean).find(line=>/^Dear\s+[^,]{1,120},$/i.test(line));
  return first||'Dear Editorial Team,';
}

function normalizeHtml(html,greeting){
  let seen=false;
  let value=String(html||'')
    .replace(/<html\b([^>]*?)\blang\s*=\s*["'][^"']*["']([^>]*)>/i,'<html$1lang="en"$2>')
    .replace(/<html(?![^>]*\blang=)/i,'<html lang="en"')
    .replace(/Dear\s+Editorial\s+Editorial\s+Team\s*,?/gi,'Dear Editorial Team,');

  const patterns=[
    /Dear\s+[^<>\r\n,]{1,120},/gi,
    /Poštovan(?:i|a|e)[^<>\r\n,]{0,120},/gi,
    /Postovan(?:i|a|e)[^<>\r\n,]{0,120},/gi
  ];

  for(const pattern of patterns){
    value=value.replace(pattern,()=>{
      if(seen)return'';
      seen=true;
      return greeting;
    });
  }

  if(!seen){
    const greetingBlock=`<p style="margin:0 0 16px">${greeting}</p>`;
    value=/<body[^>]*>/i.test(value)?value.replace(/<body[^>]*>/i,match=>match+greetingBlock):greetingBlock+value;
  }

  return value
    .replace(/(?:Dear Editorial Team,\s*){2,}/gi,'Dear Editorial Team,')
    .replace(/>\s*Dear Editorial Team,\s*<\/[^>]+>\s*<[^>]+>\s*Dear Editorial Team,\s*</gi,'>Dear Editorial Team,</');
}

function normalizeText(text,greeting){
  const lines=String(text||'').split(/\r?\n/);
  let seen=false;
  const output=[];
  for(const line of lines){
    if(/^\s*(?:Dear\s+[^,]{1,120}|Poštovan(?:i|a|e)[^,]{0,120}|Postovan(?:i|a|e)[^,]{0,120}),\s*$/i.test(line)){
      if(seen)continue;
      seen=true;
      output.push(greeting);
      continue;
    }
    output.push(line);
  }
  if(!seen)output.unshift(greeting,'');
  return output.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}

function contractError(markers){
  const error=new Error(`Media outreach message is not English-only: ${markers.join(', ')}`);
  error.code='MEDIA_MESSAGE_NOT_ENGLISH_ONLY';
  error.markers=markers;
  return error;
}

export function enforceSingleEnglishGreeting(payload={}){
  if(!isMediaOutreach(payload))return payload;
  const greeting=greetingFromText(payload.text||payload.plainText||payload.body);
  const html=normalizeHtml(payload.html||payload.bodyHtml||payload.htmlBody,greeting);
  const text=normalizeText(payload.text||payload.plainText||payload.body,greeting);
  const subject='CODE';
  const headers={
    ...(payload.headers||{}),
    'X-GNK-ASG-Single-Greeting':VERSION,
    'X-GNK-ASG-Language':'en'
  };
  const validation=validateEnglishOnlyContent({html,text,subject,headers,attachments:payload.attachments||[]});
  if(!validation.ok)throw contractError(validation.markers);
  return{...payload,subject,text,plainText:text,body:text,html,bodyHtml:html,htmlBody:html,headers};
}

export function withSingleEnglishGreeting(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{send(payload){return binding.send.call(binding,enforceSingleEnglishGreeting(payload));}}
  });
  return wrapped;
}
