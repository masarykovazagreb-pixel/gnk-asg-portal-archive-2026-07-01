import { MEDIA_CAMPAIGN_LIMITS, normaliseMediaRecipient, recipientDisplayName, validateMediaRecipient } from './media-campaign-policy.js';

export function buildMediaCampaignBatch(payload = {}) {
  const rows = Array.isArray(payload.recipients) ? payload.recipients : [];
  const recipients = rows.slice(0, MEDIA_CAMPAIGN_LIMITS.maxRecipientsPerBatch).map(normaliseMediaRecipient);
  const invalid = [];
  const valid = [];

  for (const recipient of recipients) {
    const error = validateMediaRecipient(recipient);
    if (error) invalid.push({ recipient, error });
    else valid.push(recipient);
  }

  return {
    id: payload.id || crypto.randomUUID(),
    subject: String(payload.subject || '').trim(),
    pdfAttachmentName: String(payload.pdfAttachmentName || '').trim(),
    total: recipients.length,
    sent: 0,
    failed: invalid.length,
    remaining: valid.length,
    rateLimitPerMinute: MEDIA_CAMPAIGN_LIMITS.maxSendPerMinute,
    status: invalid.length && !valid.length ? 'failed' : 'queued',
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
