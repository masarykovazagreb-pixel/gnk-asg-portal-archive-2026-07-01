import {handleMediaBootstrapHtmlEmail,VERSION as HTML_VERSION} from './media-bootstrap-html-v1.js';
export const VERSION=`GNK_ASG_MEDIA_BOOTSTRAP_HTML_FORWARD_V1_TO_${HTML_VERSION}`;
const PREFIX='[MCC-BOOTSTRAP THE-CODE-2026]';
const clean=value=>String(value??'').trim();
export async function handleMediaBootstrapHtmlForwardEmail(message,env){
 const subject=clean(message?.headers?.get?.('subject')||'');
 if(subject.includes(PREFIX)&&/\bHTML\b/i.test(subject))return handleMediaBootstrapHtmlEmail(message,env);
 let raw='';try{raw=await new Response(message.raw).text();}catch{return null;}
 if(!raw.includes(PREFIX)||!/(?:\bHTML\b|ugrađeni[^\r\n]*HTML|production HTML)/i.test(raw))return null;
 const originalHeaders=message?.headers;
 const proxy=Object.create(message||null);
 Object.defineProperty(proxy,'headers',{enumerable:true,configurable:true,value:{get(name){const key=String(name||'').toLowerCase();if(key==='subject')return`${PREFIX} HTML`;return originalHeaders?.get?.(name)||'';}}});
 return handleMediaBootstrapHtmlEmail(proxy,env);
}
