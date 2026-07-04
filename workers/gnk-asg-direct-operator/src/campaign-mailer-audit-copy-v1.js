import {MANDATORY_BCC} from './email-signature-contract-v1.js';

export const VERSION='GNK_ASG_CAMPAIGN_MAILER_AUDIT_COPY_V1_20260704';
export const AUDIT_RECIPIENT=MANDATORY_BCC;

const clean=value=>String(value??'').trim();
const normalize=value=>clean(value).toLowerCase();

export function campaignAuditRaw(raw,originalRecipient){
 const source=String(raw||'');
 if(/\r?\nX-GNK-ASG-Audit-Copy:/i.test(`\n${source}`))return source;
 const separator=source.search(/\r?\n\r?\n/);
 const headers=separator>=0?source.slice(0,separator):source;
 const body=separator>=0?source.slice(separator):'\r\n\r\n';
 return `${headers}\r\nX-GNK-ASG-Audit-Copy: campaign-outbound\r\nX-GNK-ASG-Audit-Copy-Version: ${VERSION}\r\nX-GNK-ASG-Original-Recipient: ${clean(originalRecipient)}${body}`;
}

export function campaignAuditDescriptor(from,originalRecipient,raw){
 if(normalize(originalRecipient)===normalize(AUDIT_RECIPIENT))return null;
 return{from:clean(from),to:AUDIT_RECIPIENT,raw:campaignAuditRaw(raw,originalRecipient),originalRecipient:clean(originalRecipient),version:VERSION};
}
