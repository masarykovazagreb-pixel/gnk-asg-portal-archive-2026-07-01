import { recipientDisplayName } from './media-campaign-policy.js';

const TOKEN_PATTERN = /{{\s*(firstName|lastName|fullName|media|email)\s*}}/gi;

export function buildMediaCampaignMessage(campaign = {}, queueItem = {}) {
  const recipient = queueItem.recipient || {};
  const subjectTemplate = String(campaign.subject || '').trim();
  const bodyTemplate = String(campaign.bodyTemplate || campaign.body || '').trim();
  const pdfAttachmentName = cleanPdfName(campaign.pdfAttachmentName);

  if (!recipient.email) throw new Error('missing_recipient_email');
  if (!subjectTemplate) throw new Error('missing_subject');
  if (!bodyTemplate) throw new Error('missing_body');
  if (!pdfAttachmentName) throw new Error('missing_pdf_attachment');

  return {
    queueItemId: queueItem.id || '',
    to: recipient.email,
    displayName: recipientDisplayName(recipient),
    media: recipient.media || '',
    subject: personalise(subjectTemplate, recipient),
    body: personalise(bodyTemplate, recipient),
    from: String(campaign.from || campaign.senderMailbox || 'media@gnk-asg.hr').trim().toLowerCase(),
    signatureProfile: String(campaign.signatureProfile || 'media').trim(),
    language: String(campaign.language || 'hr').trim().toLowerCase(),
    attachments: [{ filename: pdfAttachmentName, mimeType: 'application/pdf' }],
    scheduledAt: normaliseScheduledAt(campaign.scheduledAt)
  };
}

export function personalise(template, recipient = {}) {
  const values = {
    firstName: recipient.firstName || '',
    lastName: recipient.lastName || '',
    fullName: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
    media: recipient.media || '',
    email: recipient.email || ''
  };

  return String(template || '').replace(TOKEN_PATTERN, (_, key) => values[normaliseKey(key)] || '').trim();
}

export function normaliseScheduledAt(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('invalid_scheduled_at');
  return parsed.toISOString();
}

function normaliseKey(key) {
  const lookup = {
    firstname: 'firstName',
    lastname: 'lastName',
    fullname: 'fullName',
    media: 'media',
    email: 'email'
  };
  return lookup[String(key || '').toLowerCase()] || '';
}

function cleanPdfName(value) {
  const filename = String(value || '').trim().replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 140);
  if (!filename || !filename.toLowerCase().endsWith('.pdf')) return '';
  return filename;
}
