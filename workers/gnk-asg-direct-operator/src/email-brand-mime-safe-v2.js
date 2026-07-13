import {
  buildBrandedRawEmail as buildLegacyBrandedRawEmail,
  EMAIL_LOGO_CID,
  EMAIL_LOGO_PATH,
  EMAIL_LOGO_URL,
  ensureMediaHtml,
  ensureMediaText,
  foldBase64,
  loadEmailLogo,
  mediaSignatureHtml,
  mediaSignatureText
} from './email-brand-mime-v1.js';

export const VERSION='GNK_ASG_EMAIL_BRAND_MIME_SAFE_V2_20260713_STRICT_ADDRESS_INPUT';

const clean=value=>String(value??'').trim();
const hasCrLf=value=>/[\r\n]/.test(String(value??''));
const validEmail=value=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/i.test(clean(value));

function validateMailbox(value,label){
  if(hasCrLf(value))throw new Error(`invalid_${label}_email`);
  const address=clean(value).toLowerCase();
  if(!validEmail(address))throw new Error(`invalid_${label}_email`);
  return address;
}

function validateRecipients(value){
  if(hasCrLf(value))throw new Error('invalid_to_email');
  const recipients=String(value??'').split(/[;,\s]+/).map(clean).filter(Boolean);
  if(!recipients.length||recipients.some(item=>!validEmail(item)))throw new Error('invalid_to_email');
  return [...new Set(recipients.map(item=>item.toLowerCase()))].join(', ');
}

export async function buildBrandedRawEmail(options={}){
  const fromEmail=validateMailbox(options.fromEmail??'media@gnk-asg.hr','from');
  const to=validateRecipients(options.to);
  const replyTo=validateMailbox(options.replyTo??fromEmail,'reply_to');
  return buildLegacyBrandedRawEmail({...options,fromEmail,to,replyTo});
}

export {
  EMAIL_LOGO_CID,
  EMAIL_LOGO_PATH,
  EMAIL_LOGO_URL,
  ensureMediaHtml,
  ensureMediaText,
  foldBase64,
  loadEmailLogo,
  mediaSignatureHtml,
  mediaSignatureText
};
