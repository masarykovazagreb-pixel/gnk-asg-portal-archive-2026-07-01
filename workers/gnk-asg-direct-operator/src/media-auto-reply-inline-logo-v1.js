import {EmailMessage} from 'cloudflare:email';
import {serveTransparentMediaLogo} from './media-email-logo-transparent-v1.js';

export const VERSION='GNK_ASG_MEDIA_DELIVERY_V4_AUTO_REPLY_TEXT_ONLY_NO_PLACEHOLDER_20260702';
const MEDIA_EMAIL='media@gnk-asg.hr';
const LOGO_CID='gnk-asg-media-logo';
const ENCODER=new TextEncoder();
const clean=value=>String(value??'').trim();
const sender=from=>{if(from&&typeof from==='object')return clean(from.email||from.address).toLowerCase();const match=clean(from).match(/<([^>]+)>/);return clean(match?.[1]||from).toLowerCase()};
const recipient=to=>Array.isArray(to)?clean(to[0]):clean(to);
const header=(payload,name)=>clean(payload?.headers?.[name]??payload?.headers?.[name.toLowerCase()]);
const isMedia=payload=>sender(payload?.from)===MEDIA_EMAIL;
const isAutoReply=payload=>isMedia(payload)&&Boolean(header(payload,'X-GNK-ASG-Media-Auto-Reply'));
function base64(bytes){const source=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);let binary='';for(let offset=0;offset<source.length;offset+=32768)binary+=String.fromCharCode(...source.subarray(offset,offset+32768));return btoa(binary)}
const folded=value=>String(value||'').replace(/.{1,76}/g,'$&\r\n').trimEnd();
const stripPlaceholders=value=>String(value??'')
  .replace(/[\uFFFC\uFFFD\u25A0\u25A1\u25AA\u25AB\u25AD\u25AE\u25AF\u25B0\u25FB\u25FC\u25FD\u25FE]/g,'')
  .replace(/[\u200B-\u200D\u2060\uFE0E\uFE0F]/g,'')
  .replace(/[\uE000-\uF8FF]/g,'')
  .replace(/\[(?:image|slika)(?::[^\]]*)?\]/gi,'')
  .replace(/[–—−]/g,'-')
  .replace(/[ \t]+\n/g,'\n')
  .replace(/\n{3,}/g,'\n\n')
  .trim();
const word=value=>`=?UTF-8?B?${base64(ENCODER.encode(stripPlaceholders(value)))}?=`;
async function logoBytes(){const response=serveTransparentMediaLogo(new Request('https://gnk-asg.hr/assets/gnk-asg-email-logo-transparent.png'));if(!response.ok)throw new Error('media_logo_unavailable');return new Uint8Array(await response.arrayBuffer())}
function cidHtml(value){return String(value||'').replace(/src=["']https:\/\/gnk-asg\.hr\/assets\/gnk-asg-email-logo-(?:transparent|final)\.png[^"']*["']/gi,`src="cid:${LOGO_CID}"`)}
function inlineLogo(content){return{content,filename:'gnk-asg-logo.png',type:'image/png',contentType:'image/png',disposition:'inline',contentId:LOGO_CID,cid:LOGO_CID}}
function rawTextMessage(payload){
  const to=recipient(payload.to);
  const name=clean(payload.from?.name)||'GNK DINAMO Ltd. Group | Media Relations & Accreditation Center';
  const replyTo=clean(payload.replyTo)||MEDIA_EMAIL;
  const subject=stripPlaceholders(clean(payload.subject)||'Media application received');
  const text=stripPlaceholders(payload.text??payload.plainText??payload.body??'');
  const headers=payload.headers||{};
  return{to,raw:[
    `From: ${word(name)} <${MEDIA_EMAIL}>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${word(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@gnk-asg.hr>`,
    'MIME-Version: 1.0',
    `Auto-Submitted: ${clean(headers['Auto-Submitted'])||'auto-replied'}`,
    `X-Auto-Response-Suppress: ${clean(headers['X-Auto-Response-Suppress'])||'All'}`,
    `X-GNK-ASG-Global-Desk: ${clean(headers['X-GNK-ASG-Global-Desk'])}`,
    `X-GNK-ASG-Media-Auto-Reply: ${clean(headers['X-GNK-ASG-Media-Auto-Reply'])||VERSION}`,
    'X-GNK-ASG-Auto-Reply-Format: text-only-no-placeholder',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    folded(base64(ENCODER.encode(text))),
    ''
  ].join('\r\n')};
}
export function withEmbeddedMediaAutoReplyLogo(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{enumerable:true,configurable:true,value:{async send(payload){
    if(!isMedia(payload))return binding.send.call(binding,payload);
    if(isAutoReply(payload)){
      const message=rawTextMessage(payload);
      return binding.send.call(binding,new EmailMessage(MEDIA_EMAIL,message.to,message.raw));
    }
    const logo=await logoBytes();
    const html=cidHtml(payload.html??payload.bodyHtml??payload.htmlBody??'');
    const attachments=(Array.isArray(payload.attachments)?payload.attachments:[]).filter(item=>clean(item?.contentId||item?.cid)!==LOGO_CID);
    attachments.push(inlineLogo(logo));
    return binding.send.call(binding,{...payload,html,bodyHtml:html,htmlBody:html,attachments,headers:{...(payload.headers||{}),'X-GNK-ASG-Inline-Logo':VERSION}});
  }}});
  return wrapped;
}
