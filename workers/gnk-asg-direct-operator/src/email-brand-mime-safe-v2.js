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

export const VERSION='GNK_ASG_EMAIL_BRAND_MIME_SAFE_V3_20260713_STRICT_ADDRESS_AND_ATTACHMENT_INPUT';

const clean=value=>String(value??'').trim();
const hasCrLf=value=>/[\r\n]/.test(String(value??''));
const validEmail=value=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/i.test(clean(value));
const validContentType=value=>/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?:\s*;\s*[a-z0-9!#$&^_.+-]+=[a-z0-9!#$&^_.+-]+)*$/i.test(clean(value));

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

function normalizeAttachment(file={}){
  const filename=String(file.filename??'document.bin')
    .replace(/[\r\n]+/g,'_')
    .replace(/["\\/<>:|?*\x00-\x1F]+/g,'_')
    .slice(0,180)||'document.bin';
  const contentType=hasCrLf(file.contentType)||!validContentType(file.contentType)
    ?'application/octet-stream'
    :clean(file.contentType).toLowerCase();
  return {...file,filename,contentType};
}

export async function buildBrandedRawEmail(options={}){
  const fromEmail=validateMailbox(options.fromEmail??'media@gnk-asg.hr','from');
  const to=validateRecipients(options.to);
  const replyTo=validateMailbox(options.replyTo??fromEmail,'reply_to');
  const attachments=(Array.isArray(options.attachments)?options.attachments:[]).map(normalizeAttachment);
  return buildLegacyBrandedRawEmail({...options,fromEmail,to,replyTo,attachments});
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
