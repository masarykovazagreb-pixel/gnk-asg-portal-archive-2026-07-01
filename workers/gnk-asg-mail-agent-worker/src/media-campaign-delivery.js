import { sendManualMail } from './sender.js';
import { buildMediaCampaignMessage } from './media-campaign-message.js';
import { MEDIA_CAMPAIGN_LIMITS } from './media-campaign-policy.js';
import { mediaCampaignRateLimitState } from './media-campaign-rate-limit.js';
import { mediaCampaignScheduleState } from './media-campaign-schedule.js';

export async function deliverMediaCampaignWindow(env, campaign = {}, attachment, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const schedule = mediaCampaignScheduleState(campaign, now);
  if (!schedule.ready) return blocked(campaign, now, schedule.reason, schedule);

  const rateLimit = mediaCampaignRateLimitState(campaign, now);
  if (!rateLimit.ready) return blocked(campaign, now, rateLimit.reason, rateLimit);

  if (!attachment?.base64 || attachment.mimeType !== 'application/pdf') {
    return blocked(campaign, now, 'pdf_attachment_unavailable');
  }

  const queue = Array.isArray(campaign.queue) ? campaign.queue : [];
  const selectedIds = new Set(
    queue
      .filter(item => item.status === 'remaining')
      .slice(0, MEDIA_CAMPAIGN_LIMITS.maxSendPerMinute)
      .map(item => item.id)
  );

  const outcomes = new Map();
  for (const item of queue) {
    if (!selectedIds.has(item.id)) continue;
    try {
      const message = buildMediaCampaignMessage(campaign, item);
      const result = await sendManualMail(env, {
        from: message.from,
        fromName: 'GNK ASG Media',
        to: message.to,
        subject: message.subject,
        body: message.body,
        language: message.language,
        signatureProfile: message.signatureProfile,
        attachments: [attachment]
      });
      outcomes.set(item.id, result.ok
        ? { status: 'sent', result }
        : { status: 'failed', reason: 'delivery_partial_failure', result });
    } catch (error) {
      outcomes.set(item.id, {
        status: 'failed',
        reason: String(error?.message || error)
      });
    }
  }

  const nextQueue = queue.map(item => {
    const outcome = outcomes.get(item.id);
    if (!outcome) return item;
    return {
      ...item,
      status: outcome.status,
      processedAt: now.toISOString(),
      delivery: outcome.result || null,
      failureReason: outcome.reason || null
    };
  });

  const sent = nextQueue.filter(item => item.status === 'sent').length;
  const tested = nextQueue.filter(item => item.status === 'tested').length;
  const failed = nextQueue.filter(item => item.status === 'failed').length;
  const remaining = nextQueue.filter(item => item.status === 'remaining').length;
  const processed = outcomes.size;

  return {
    ...campaign,
    queue: nextQueue,
    sent,
    tested,
    failed,
    remaining,
    status: remaining ? 'queued' : (failed && !sent ? 'failed' : 'complete'),
    lastWindowAt: now.toISOString(),
    lastWindowCount: processed,
    nextAllowedAt: processed ? new Date(now.getTime() + 60000).toISOString() : now.toISOString(),
    retryAfterSeconds: processed ? 60 : 0,
    productionSendEnabled: true,
    executionBlocked: false,
    executionBlockReason: null
  };
}

function blocked(campaign, now, reason, details = {}) {
  return {
    ...campaign,
    lastWindowAttemptAt: now.toISOString(),
    lastWindowCount: 0,
    productionSendEnabled: false,
    executionBlocked: true,
    executionBlockReason: reason,
    nextAllowedAt: details.nextAllowedAt || details.scheduledAt || null,
    retryAfterSeconds: Number(details.retryAfterSeconds || 0)
  };
}
