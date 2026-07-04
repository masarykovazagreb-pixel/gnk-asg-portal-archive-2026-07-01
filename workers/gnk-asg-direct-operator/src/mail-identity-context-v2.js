import {applyMailIdentityContext as applyBase,PLATFORM_CONTEXT,REGIONAL_CONTEXT,VERSION as BASE_VERSION} from './mail-identity-context-v1.js';

export const VERSION=`GNK_ASG_MAIL_IDENTITY_CONTEXT_V2_IDEMPOTENT_${BASE_VERSION}`;
export{PLATFORM_CONTEXT,REGIONAL_CONTEXT};

const clean=value=>String(value??'').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function stableContextHtml(payload){
  const headers=payload?.headers||{};
  const role=clean(headers['X-GNK-ASG-Centre-Role']||headers['x-gnk-asg-centre-role']);
  const location=clean(headers['X-GNK-ASG-Global-Centre']||headers['x-gnk-asg-global-centre']);
  const items=[PLATFORM_CONTEXT,REGIONAL_CONTEXT,role&&location?`${role}: ${location}`:''].filter(Boolean);
  return `<section data-gnk-asg-mail-context="${VERSION}" style="display:block;margin:4px 0 8px">${items.map((item,index)=>`<div style="font-size:14px;line-height:1.5;margin:0 0 3px${index===items.length-1?';font-weight:700':''}">${escapeHtml(item)}</div>`).join('')}</section>`;
}

function canonicalHtml(value,payload){
  let html=String(value||'')
    .replace(/<section\b[^>]*data-gnk-asg-mail-context=["'][^"']*["'][^>]*>[\s\S]*?<\/section>\s*/gi,'')
    .replace(/<div\b[^>]*data-gnk-asg-mail-context=["'][^"']*["'][^>]*>[\s\S]*?(?=<a\b[^>]*href=["']mailto:)/gi,'');
  const block=stableContextHtml(payload);
  const tables=[...html.matchAll(/<table\b[^>]*data-gnk-asg-(?:media-)?signature=["'][^"']*["'][^>]*>[\s\S]*?<\/table>/gi)];
  const entry=tables.at(-1),table=entry?.[0];
  if(!table)return`${html}${block}`;
  const patched=/<a\b[^>]*href=["']mailto:/i.test(table)?table.replace(/<a\b[^>]*href=["']mailto:/i,`${block}$&`):table.replace(/<\/td>\s*<\/tr>\s*<\/table>$/i,`${block}</td></tr></table>`);
  return html.slice(0,entry.index)+patched+html.slice(entry.index+table.length);
}

export function applyMailIdentityContext(payload={},direction='outbound'){
  const next=applyBase(payload,direction);
  if(next.html!==undefined)next.html=canonicalHtml(next.html,next);
  if('bodyHtml'in next)next.bodyHtml=next.html;
  if('htmlBody'in next)next.htmlBody=next.html;
  next.headers={...(next.headers||{}),'X-GNK-ASG-Mail-Identity-Context':VERSION};
  return next;
}

export function withMailIdentityContext(env,direction='outbound'){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  return new Proxy(env,{get(target,property,receiver){if(property==='EMAIL')return{send(payload){return binding.send.call(binding,applyMailIdentityContext(payload,direction));}};return Reflect.get(target,property,receiver);}});
}

export const __test={stableContextHtml,canonicalHtml};
