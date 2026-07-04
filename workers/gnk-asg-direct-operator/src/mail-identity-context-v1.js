import {GLOBAL_SERVICE_CENTRES,centreLocation,centreRoleLabel} from './global-service-centres-v1.js';

export const VERSION='GNK_ASG_MAIL_IDENTITY_CONTEXT_V1_20260704';
export const PLATFORM_CONTEXT='GNK DINAMO Ltd. Group — Enterprise Digital Platform';
export const REGIONAL_CONTEXT='GNK ASG d.o.o. — Regional operating company';

const clean=value=>String(value??'').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const senderEmail=from=>{if(from&&typeof from==='object')return clean(from.email||from.address).toLowerCase();const raw=clean(from),match=raw.match(/<([^>]+)>/);return clean(match?.[1]||raw).toLowerCase();};
const payloadHeader=(payload,name)=>{const headers=payload?.headers;if(headers instanceof Headers)return clean(headers.get(name));if(!headers||typeof headers!=='object')return'';const key=Object.keys(headers).find(item=>item.toLowerCase()===String(name).toLowerCase());return key?clean(headers[key]):'';};

function fullLocation(value){
  const raw=clean(value);
  if(!raw)return'';
  if(raw.includes(','))return raw;
  const centre=GLOBAL_SERVICE_CENTRES.find(item=>item.name.toLowerCase()===raw.toLowerCase()||item.id===raw.toLowerCase());
  return centre?centreLocation(centre):raw;
}

function removeContextText(value){
  return String(value||'').split(/\r?\n/).filter(line=>{
    const text=clean(line);
    return text!==PLATFORM_CONTEXT&&text!==REGIONAL_CONTEXT&&!/^(?:(?:Sending|Receiving)\s+)?(?:Global Service Centre|Global Media Desk|Globalni operativni centar|Globalni medijski ured)\s*:/i.test(text);
  }).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}

function contextBlock(location,direction){
  return [PLATFORM_CONTEXT,REGIONAL_CONTEXT,location?`${centreRoleLabel(direction)}: ${location}`:''].filter(Boolean).join('\n');
}

function transformText(value,email,location,direction){
  const text=removeContextText(value),block=contextBlock(location,direction);
  if(!text)return block;
  const lower=text.toLowerCase(),needle=clean(email).toLowerCase(),index=needle?lower.lastIndexOf(needle):-1;
  return index>=0?`${text.slice(0,index).trimEnd()}\n${block}\n${text.slice(index)}`:`${text}\n${block}`;
}

function contextHtml(location,direction){
  const items=[PLATFORM_CONTEXT,REGIONAL_CONTEXT,location?`${centreRoleLabel(direction)}: ${location}`:''].filter(Boolean);
  return `<div data-gnk-asg-mail-context="${VERSION}" style="margin:4px 0 8px">${items.map((item,index)=>`<div style="font-size:14px;line-height:1.5;margin:0 0 3px${index===items.length-1?';font-weight:700':''}">${escapeHtml(item)}</div>`).join('')}</div>`;
}

function transformHtml(value,location,direction){
  let html=String(value||'').replace(/<div\b[^>]*data-gnk-asg-mail-context=["'][^"']*["'][^>]*>[\s\S]*?<\/div>\s*/gi,'');
  const block=contextHtml(location,direction);
  const tables=[...html.matchAll(/<table\b[^>]*data-gnk-asg-(?:media-)?signature=["'][^"']*["'][^>]*>[\s\S]*?<\/table>/gi)];
  const table=tables.at(-1)?.[0];
  if(!table)return`${html}${block}`;
  const patched=/<a\b[^>]*href=["']mailto:/i.test(table)?table.replace(/<a\b[^>]*href=["']mailto:/i,`${block}$&`):table.replace(/<\/td>\s*<\/tr>\s*<\/table>$/i,`${block}</td></tr></table>`);
  return html.slice(0,tables.at(-1).index)+patched+html.slice(tables.at(-1).index+table.length);
}

export function applyMailIdentityContext(payload={},direction='outbound'){
  const selectedDirection=clean(payloadHeader(payload,'X-GNK-ASG-Centre-Direction')||direction).toLowerCase()==='inbound'?'inbound':'outbound';
  const location=fullLocation(payloadHeader(payload,'X-GNK-ASG-Global-Centre')||payloadHeader(payload,'X-GNK-ASG-City'));
  const email=senderEmail(payload.from);
  const next={...payload};
  if('text'in payload||'plainText'in payload||'body'in payload)next.text=transformText(payload.text??payload.plainText??payload.body??'',email,location,selectedDirection);
  if('plainText'in payload)next.plainText=next.text;
  if('body'in payload&&typeof payload.body==='string'&&!/<[a-z][\s\S]*>/i.test(payload.body))next.body=next.text;
  const sourceHtml=payload.html??payload.bodyHtml??payload.htmlBody;
  if(sourceHtml!==undefined){next.html=transformHtml(sourceHtml,location,selectedDirection);if('bodyHtml'in payload)next.bodyHtml=next.html;if('htmlBody'in payload)next.htmlBody=next.html;}
  next.headers={...(payload.headers||{}),'X-GNK-ASG-Mail-Identity-Context':VERSION,'X-GNK-ASG-Centre-Direction':selectedDirection,'X-GNK-ASG-Centre-Role':centreRoleLabel(selectedDirection),...(location?{'X-GNK-ASG-Global-Centre':location}:{})};
  return next;
}

export function withMailIdentityContext(env,direction='outbound'){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  return new Proxy(env,{get(target,property,receiver){if(property==='EMAIL')return{send(payload){return binding.send.call(binding,applyMailIdentityContext(payload,direction));}};return Reflect.get(target,property,receiver);}});
}

export const __test={fullLocation,removeContextText,transformText,transformHtml,contextBlock};
