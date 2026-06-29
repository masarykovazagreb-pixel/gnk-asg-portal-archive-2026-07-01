import {EMAIL_LOGO_CID,EMAIL_LOGO_URL,loadEmailLogo} from './email-brand-mime-v1.js';

export const VERSION='GNK_ASG_EMAIL_INLINE_LOGO_V1_20260629';
const clean=value=>String(value??'').trim();

export async function attachInlineEmailLogo(payload={},env){
  if(!payload||typeof payload!=='object'||payload.constructor?.name==='EmailMessage'||payload.raw)return payload;
  const logo=await loadEmailLogo(env);
  if(!logo)return payload;
  const next={...payload};
  next.html=String(next.html||'').replaceAll(EMAIL_LOGO_URL,`cid:${EMAIL_LOGO_CID}`);
  const attachments=Array.isArray(next.attachments)?[...next.attachments]:[];
  if(!attachments.some(item=>clean(item?.contentId||item?.cid)===EMAIL_LOGO_CID||clean(item?.filename)==='gnk-asg-logo.png')){
    attachments.push({content:logo.bytes,filename:logo.filename,type:logo.contentType,disposition:'inline',contentId:EMAIL_LOGO_CID});
  }
  next.attachments=attachments;
  next.headers={...(next.headers||{}),'X-GNK-ASG-Inline-Logo':VERSION};
  return next;
}
