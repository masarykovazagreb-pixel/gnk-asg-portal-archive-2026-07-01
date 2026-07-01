import {handleMediaBootstrapEmail} from './media-bootstrap-email-v1.js';

export const VERSION='GNK_ASG_MEDIA_BOOTSTRAP_PDF_FORWARD_FIX_V1_20260701';
const PREFIX='[MCC-BOOTSTRAP THE-CODE-2026]';
const ALLOWED_FROM='beckuphome@gmail.com';
const ALLOWED_TO='media@gnk-asg.hr';
const clean=value=>String(value??'').trim();
const lower=value=>clean(value).toLowerCase();

export async function handleMediaBootstrapPdfForwardFix(message,env){
  const from=lower(message.from||message?.headers?.get?.('from'));
  const to=lower(message.to||message?.headers?.get?.('to'));
  const subject=clean(message?.headers?.get?.('subject')||'');
  if(from!==ALLOWED_FROM||to!==ALLOWED_TO||!/^fwd:\s*rht2@gmx\.com$/i.test(subject))return null;

  const bytes=new Uint8Array(await new Response(message.raw).arrayBuffer());
  const rawText=new TextDecoder().decode(bytes);
  if(!rawText.includes('MCC-BOOTSTRAP THE-CODE-2026')||!/(?:\bASSETS\b|PDF)/i.test(rawText))return null;

  const originalHeaders=message?.headers;
  const proxy=Object.create(message||null);
  Object.defineProperty(proxy,'headers',{enumerable:true,configurable:true,value:{
    get(name){
      const key=String(name||'').toLowerCase();
      if(key==='subject')return`${PREFIX} ASSETS`;
      return originalHeaders?.get?.(name)||'';
    }
  }});
  Object.defineProperty(proxy,'raw',{enumerable:true,configurable:true,value:new Blob([bytes]).stream()});
  return handleMediaBootstrapEmail(proxy,env);
}
