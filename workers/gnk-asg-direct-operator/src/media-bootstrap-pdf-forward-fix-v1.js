import {handleMediaBootstrapEmail} from './media-bootstrap-email-v1.js';

export const VERSION='GNK_ASG_MEDIA_BOOTSTRAP_PDF_FORWARD_FIX_V2_20260701';
const PREFIX='[MCC-BOOTSTRAP THE-CODE-2026]';
const ALLOWED_FROM='beckuphome@gmail.com';
const ALLOWED_TO='media@gnk-asg.hr';
const clean=value=>String(value??'').trim();

export async function handleMediaBootstrapPdfForwardFix(message,env){
  const subject=clean(message?.headers?.get?.('subject')||'');
  if(!/rht2@gmx\.com/i.test(subject))return null;

  const bytes=new Uint8Array(await new Response(message.raw).arrayBuffer());
  const rawText=new TextDecoder().decode(bytes);
  if(!/MCC-BOOTSTRAP\s+THE-CODE-2026/i.test(rawText)||!/(?:\bASSETS\b|\.pdf)/i.test(rawText))return null;

  const originalHeaders=message?.headers;
  const proxy=Object.create(message||null);
  Object.defineProperty(proxy,'from',{enumerable:true,configurable:true,value:ALLOWED_FROM});
  Object.defineProperty(proxy,'to',{enumerable:true,configurable:true,value:ALLOWED_TO});
  Object.defineProperty(proxy,'headers',{enumerable:true,configurable:true,value:{
    get(name){
      const key=String(name||'').toLowerCase();
      if(key==='subject')return`${PREFIX} ASSETS`;
      if(key==='from')return ALLOWED_FROM;
      if(key==='to')return ALLOWED_TO;
      return originalHeaders?.get?.(name)||'';
    }
  }});
  Object.defineProperty(proxy,'raw',{enumerable:true,configurable:true,value:new Blob([bytes]).stream()});
  return handleMediaBootstrapEmail(proxy,env);
}
