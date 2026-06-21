import { addMailboxItem } from './storage.js';
import { buildMediaCampaignBatch } from './media-campaign-batch.js';
import { mediaCampaignStatus, planMediaCampaignWindow } from './media-campaign-actions.js';
import { executeMediaCampaignWindow } from './media-campaign-window.js';
import { deliverMediaCampaignWindow } from './media-campaign-delivery.js';
import { normaliseCampaignAttachment, readCampaignAttachment, storeCampaignAttachment } from './media-campaign-attachment.js';
import { acquireMediaCampaignLease, strictCampaignLeaseReady } from './media-campaign-lease.js';
import { saveMediaCampaign } from './media-campaign-state.js';

export async function createMediaCampaign(env, payload = {}) {
  validateCampaignContent(payload);
  const campaignId = String(payload.id || crypto.randomUUID());
  const attachmentMetadata = await optionalAttachmentMetadata(env, campaignId, payload);
  const batch = buildMediaCampaignBatch({ ...payload, id: campaignId, attachmentMetadata });
  const preview = planMediaCampaignWindow(batch);

  await saveMediaCampaign(env, batch);
  await addMailboxItem(env, 'held', {
    id: batch.id,
    type: 'media-campaign-preview',
    batchId: batch.id,
    total: batch.total,
    sent: batch.sent,
    tested: batch.tested,
    failed: batch.failed,
    remaining: batch.remaining,
    rateLimitPerMinute: batch.rateLimitPerMinute,
    attachment: {
      filename: batch.pdfAttachmentName,
      size: batch.attachmentSize,
      stored: Boolean(batch.attachmentKey)
    },
    status: batch.status,
    createdAt: batch.createdAt
  });

  return { batch, preview };
}

export async function attachMediaCampaignPdf(env, campaign, input = {}) {
  const attachment = normaliseCampaignAttachment(input.pdfAttachment || input.attachment || input);
  const metadata = await storeCampaignAttachment(env, campaign.id, attachment);
  const updated = {
    ...campaign,
    pdfAttachmentName: metadata.filename,
    attachmentKey: metadata.key,
    attachmentSize: metadata.size,
    attachmentStoredAt: new Date().toISOString()
  };
  await saveMediaCampaign(env, updated);
  await addMailboxItem(env, 'held', {
    id: `${updated.id}:attachment`,
    type: 'media-campaign-attachment',
    batchId: updated.id,
    filename: metadata.filename,
    size: metadata.size,
    stored: true,
    createdAt: updated.attachmentStoredAt
  });
  return updated;
}

export async function runMediaCampaignWindow(env, campaign, command = {}) {
  const liveRequested = command.mode === 'live' || command.live === true;
  const explicitlyConfirmed = String(command.confirmCampaignId || '') === String(campaign.id || '');
  const liveConfigured = env.MEDIA_CAMPAIGN_LIVE_SEND === 'true';

  if (liveRequested && !explicitlyConfirmed) {
    return blockedResult(campaign, 'live_confirmation_required', 400);
  }
  if (liveRequested && !liveConfigured) {
    return blockedResult(campaign, 'live_send_not_configured', 409);
  }
  if (liveRequested && !strictCampaignLeaseReady(env)) {
    return blockedResult(campaign, 'strict_rate_limit_storage_unavailable', 409);
  }

  let updated;
  if (liveRequested) {
    const attachment = await readCampaignAttachment(env, campaign);
    if (!attachment) {
      return blockedResult(campaign, 'pdf_attachment_unavailable', 409);
    }

    const lease = await acquireMediaCampaignLease(env, campaign.id);
    if (!lease.acquired) {
      return blockedResult(campaign, lease.reason, lease.reason === 'rate_limited' ? 429 : 409, lease);
    }

    updated = await deliverMediaCampaignWindow(env, campaign, attachment);
    updated.strictLeaseId = lease.leaseId;
    updated.strictLeaseAcquiredAt = lease.acquiredAt;
    updated.nextAllowedAt = lease.nextAllowedAt;
    updated.retryAfterSeconds = lease.retryAfterSeconds;
  } else {
    updated = executeMediaCampaignWindow(campaign, { liveSend: false });
  }

  await saveMediaCampaign(env, updated);
  const box = updated.productionSendEnabled ? 'outbox' : 'held';
  const createdAt = updated.lastWindowAt || updated.lastWindowAttemptAt || new Date().toISOString();
  await addMailboxItem(env, box, {
    id: `${updated.id}:${createdAt}`,
    type: 'media-campaign-window',
    batchId: updated.id,
    processed: Number(updated.lastWindowCount || 0),
    productionSendEnabled: updated.productionSendEnabled === true,
    executionBlocked: updated.executionBlocked === true,
    executionBlockReason: updated.executionBlockReason || null,
    strictLeaseId: updated.strictLeaseId || null,
    campaign: mediaCampaignStatus(updated),
    createdAt
  });

  const status = updated.executionBlocked
    ? (updated.executionBlockReason === 'rate_limited' ? 429 : 409)
    : 200;
  return {
    ok: !updated.executionBlocked,
    status,
    campaign: mediaCampaignStatus(updated),
    productionSendEnabled: updated.productionSendEnabled === true
  };
}

async function optionalAttachmentMetadata(env, campaignId, payload) {
  const input = payload.pdfAttachment || payload.attachment;
  if (input?.base64) {
    const attachment = normaliseCampaignAttachment(input);
    return storeCampaignAttachment(env, campaignId, attachment);
  }
  return {
    key: '',
    filename: String(payload.pdfAttachmentName || '').trim(),
    mimeType: 'application/pdf',
    size: 0,
    stored: false
  };
}

function validateCampaignContent(payload) {
  if (!String(payload.subject || '').trim()) throw new Error('missing_subject');
  if (!String(payload.bodyTemplate || payload.body || '').trim()) throw new Error('missing_body');
  if (!Array.isArray(payload.recipients) || !payload.recipients.length) throw new Error('missing_recipients');
  if (!String(payload.pdfAttachmentName || payload.pdfAttachment?.filename || '').trim()) throw new Error('missing_pdf_attachment');
}

function blockedResult(campaign, reason, status, details = {}) {
  const blockedCampaign = {
    ...campaign,
    executionBlocked: true,
    executionBlockReason: reason,
    productionSendEnabled: false,
    nextAllowedAt: details.nextAllowedAt || campaign.nextAllowedAt || null,
    retryAfterSeconds: details.retryAfterSeconds ?? campaign.retryAfterSeconds ?? 0
  };
  return {
    ok: false,
    status,
    error: reason,
    campaign: mediaCampaignStatus(blockedCampaign),
    productionSendEnabled: false
  };
}
