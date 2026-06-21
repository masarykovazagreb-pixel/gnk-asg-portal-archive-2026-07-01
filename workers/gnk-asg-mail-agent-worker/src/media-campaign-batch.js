import { MEDIA_CAMPAIGN_LIMITS, normaliseMediaRecipient, recipientDisplayName, validateMediaRecipient } from './media-campaign-policy.js';
import { normaliseScheduledAt } from './media-campaign-message.js';
import { normaliseSuppressionEmail } from './media-campaign-suppression.js';

export function buildMediaCampaignBatch(payload = {}) {
  const rows = Array.isArray(payload.recipients) ? payload.recipients : [];
  const recipients = rows.slice(0, MEDIA_CAMPAIGN_LIMITS.maxRecipientsPerBatch).map(normaliseMediaRecipient);
  const suppressionSet = new Set(
    Array.from(payload.suppressedEmails || []).map(normaliseSuppressionEmail).filter(Boolean)
  );
  const invalid = [];
  const valid = [];
  const seen = new Set();
  const scheduledAt = normaliseScheduledAt(payload.scheduledAt);

  for (const recipient of recipients) {
    let error = validateMediaRecipient(recipient);
    if (!error && seen.has(recipient.email)) error = 'duplicate_email';
    if (!error && suppressionSet.has(recipient.email)) error = 'suppressed_recipient';
    if (error) invalid.push({ recipient, error });
    else {
      seen.add(recipient.email);
      valid.push(recipient);
    }
  }

  const suppressed = invalid.filter(item => item.error === 'suppressed_recipient').length;
  const failed = invalid.length - suppressed;
  const readyStatus = scheduledAt && new Date(scheduledAt).getTime() > Date.now() ? 'scheduled' : 'queued';
  const attachment = payload.attachmentMetadata || {};

  return {
    id: payload.id || crypto.randomUUID(),
    subject: String(payload.subject || '').trim(),
    bodyTemplate: String(payload.bodyTemplate || payload.body || '').trim(),
    from: String(payload.from || payload.senderMailbox || 'media@gnk-asg.hr').trim().toLowerCase(),
    signatureProfile: String(payload.signatureProfile || 'media').trim(),
    language: String(payload.language || 'hr').trim().toLowerCase(),
    pdfAttachmentName: String(attachment.filename || payload.pdfAttachmentName || '').trim(),
    attachmentKey: String(attachment.key || '').trim(),
    attachmentSize: Number(attachment.size || 0),
    scheduledAt,
    total: recipients.length,
    sent: 0,
    tested: 0,
    failed,
    suppressed,
    remaining: valid.length,
    rateLimitPerMinute: MEDIA_CAMPAIGN_LIMITS.maxSendPerMinute,
    status: valid.length ? readyStatus : (failed ? 'failed' : 'complete'),
    invalid,
    queue: valid.map((recipient, index) => ({
      id: `${index + 1}-${recipient.email}`,
      recipient,
      displayName: recipientDisplayName(recipient),
      status: 'remaining'
    })),
    createdAt: new Date().toISOString()
  };
}

export function nextMediaCampaignWindow(batch = {}, now = new Date()) {
  const queue = Array.isArray(batch.queue) ? batch.queue : [];
  const pending = queue.filter(item => item.status === 'remaining');
  const windowItems = pending.slice(0, MEDIA_CAMPAIGN_LIMITS.maxSendPerMinute);
  return {
    batchId: batch.id,
    scheduledAt: now.toISOString(),
    count: windowItems.length,
    items: windowItems
  };
}
