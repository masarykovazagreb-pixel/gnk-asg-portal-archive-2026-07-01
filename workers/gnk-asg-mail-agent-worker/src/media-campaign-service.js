import { addMailboxItem } from './storage.js';
import { buildMediaCampaignBatch } from './media-campaign-batch.js';
import { mediaCampaignStatus, planMediaCampaignWindow } from './media-campaign-actions.js';
import { executeMediaCampaignWindow } from './media-campaign-window.js';
import { deliverMediaCampaignWindow } from './media-campaign-delivery.js';
import { normaliseCampaignAttachment, readCampaignAttachment, storeCampaignAttachment } from './media-campaign-attachment.js';
import { saveMediaCampaign } from './media-campaign-state.js';

export async function createMediaCampaign(env, payload = {}) {
  validateCampaignContent(payload);
  const campaignId = String(payload.id || crypto.randomUUID());
  const attachment = normaliseCampaignAttachment(payload.pdfAttachment || payload.attachment);
  const attachmentMetadata = await storeCampaignAttachment(env, campaignId, attachment);
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
      size: batch.attachmentSize
    },
    status: batch.status,
    createdAt: batch.createdAt
  });

  return { batch, preview };
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

  let updated;
  if (liveRequested) {
    const attachment = await readCampaignAttachment(env, campaign);
    updated = await deliverMediaCampaignWindow(env, campaign, attachment);
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

function validateCampaignContent(payload) {
  if (!String(payload.subject || '').trim()) throw new Error('missing_subject');
  if (!String(payload.bodyTemplate || payload.body || '').trim()) throw new Error('missing_body');
  if (!Array.isArray(payload.recipients) || !payload.recipients.length) throw new Error('missing_recipients');
}

function blockedResult(campaign, reason, status) {
  return {
    ok: false,
    status,
    error: reason,
    campaign: mediaCampaignStatus({
      ...campaign,
      executionBlocked: true,
      executionBlockReason: reason,
      productionSendEnabled: false
    }),
    productionSendEnabled: false
  };
}
