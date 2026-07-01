import {EmailMessage} from 'cloudflare:email';
import {serveTransparentMediaLogo} from './media-email-logo-transparent-v1.js';

export const VERSION='GNK_ASG_MEDIA_AUTO_REPLY_INLINE_LOGO_V1_20260701';
const MEDIA_EMAIL='media@gnk-asg.hr';
const LOGO_CID='gnk-asg-media-logo';
const ENCODER=new TextEncoder();

const clean=value=>String(value??'').trim();
const sender=from=>{
  if(from&&typeof from==='object')return clean(from.email||from.address).toLowerCase();
  const raw=clean(from),match=raw.match(/<([^>]+)>/);
  return clean(match?.[1]||raw).toLowerCase();
};
const recipient=to=>Array.isArray(to)?clean(to[0]):clean(to);
const isAutoReply=payload=>{
  const headers=payload?.headers||{};
  return sender(payload?.from)===MEDIA_EMAIL&&Boolean(headers['X-GNK-ASG-Media-Auto-Reply']||headers['x-gnk-asg-media-auto-reply']);
};

function base64(bytes){
  const source=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  let binary='';
  for(let offset=0;offset<source.length;offset+=32768)binary+=String.fromCharCode(...source.subarray(offset,offset+32768));
  return btoa(binary);
}
const folded=value=>String(value||'').replace(/.{1,76}/g,'$&\r\n').trimEnd();
const word=value=>`=?UTF-8?B?${base64(ENCODER.encode(String(value||'')))}?=`;

async function logoBytes(){
  const response=serveTransparentMediaLogo(new Request('https://gnk-asg.hr/assets/gnk-asg-email-logo-transparent.png'));
  if(!response.ok)throw new Error('media_logo_unavailable');
  return new Uint8Array(await response.arrayBuffer());
}

function cidHtml(value){
  return String(value||'').replace(/src="https:\/\/gnk-asg\.hr\/assets\/gnk-asg-email-logo-(?:transparent|final)\.png[^"\s]*"/gi,`src="cid:${LOGO_CID}"`);
}

async function rawMessage(payload){
  const logo=await logoBytes();
  const to=recipient(payload.to);
  const name=clean(payload.from?.name)||'GNK DINAMO Ltd. Group | Media Relations & Accreditation Center';
  const replyTo=clean(payload.replyTo)||MEDIA_EMAIL;
  const subject=clean(payload.subject)||'Media application received';
  const text=String(payload.text||'');
  const html=cidHtml(payload.html||'');
  const related=`rel_${crypto.randomUUID().replace(/-/g,'')}`;
  const alternative=`alt_${crypto.randomUUID().replace(/-/g,'')}`;
  const headers=payload.headers||{};
  return{
    to,
    raw:[
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
      `X-GNK-ASG-Inline-Logo: ${VERSION}`,
      `Content-Type: multipart/related; boundary="${related}"`,
      '',
      `--${related}`,
      `Content-Type: multipart/alternative; boundary="${alternative}"`,
      '',
      `--${alternative}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      folded(base64(ENCODER.encode(text))),
      `--${alternative}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      folded(base64(ENCODER.encode(html))),
      `--${alternative}--`,
      '',
      `--${related}`,
      'Content-Type: image/png; name="gnk-asg-logo.png"',
      'Content-Disposition: inline; filename="gnk-asg-logo.png"',
      `Content-ID: <${LOGO_CID}>`,
      `X-Attachment-Id: ${LOGO_CID}`,
      'Content-Transfer-Encoding: base64',
      '',
      folded(base64(logo)),
      `--${related}--`,
      ''
    ].join('\r\n')
  };
}

export function withEmbeddedMediaAutoReplyLogo(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{
      async send(payload){
        if(!isAutoReply(payload))return binding.send.call(binding,payload);
        const message=await rawMessage(payload);
        return binding.send.call(binding,new EmailMessage(MEDIA_EMAIL,message.to,message.raw));
      }
    }
  });
  return wrapped;
}
