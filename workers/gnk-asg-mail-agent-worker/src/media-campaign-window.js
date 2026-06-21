import { MEDIA_CAMPAIGN_LIMITS } from './media-campaign-policy.js';
import { mediaCampaignRateLimitState } from './media-campaign-rate-limit.js';
import { mediaCampaignScheduleState } from './media-campaign-schedule.js';

export function executeMediaCampaignWindow(campaign = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const schedule = mediaCampaignScheduleState(campaign, now);
  if (!schedule.ready) {
    return blockedWindow(campaign, now, options, schedule.reason, {
      scheduledAt: schedule.scheduledAt || null
    });
  }

  const rateLimit = mediaCampaignRateLimitState(campaign, now);
  if (!rateLimit.ready) {
    return blockedWindow(campaign, now, options, rateLimit.reason, {
      nextAllowedAt: rateLimit.nextAllowedAt,
      retryAfterSeconds: rateLimit.retryAfterSeconds
    });
  }

  const queue = Array.isArray(campaign.queue) ? campaign.queue : [];
  const limit = MEDIA_CAMPAIGN_LIMITS.maxSendPerMinute;
  const liveSend = options.liveSend === true;
  let processed = 0;

  const nextQueue = queue.map(item => {
    if (processed >= limit || item.status !== 'remaining') return item;
    processed += 1;
    return {
      ...item,
      status: liveSend ? 'sent' : 'tested',
      simulated: !liveSend,
      processedAt: now.toISOString()
    };
  });

  const sent = nextQueue.filter(item => item.status === 'sent').length;
  const tested = nextQueue.filter(item => item.status === 'tested').length;
  const failed = nextQueue.filter(item => item.status === 'failed').length;
  const remaining = nextQueue.filter(item => item.status === 'remaining').length;

  return {
    ...campaign,
    queue: nextQueue,
    sent,
    tested,
    failed,
    remaining,
    status: remaining ? 'queued' : 'complete',
    lastWindowAt: now.toISOString(),
    lastWindowCount: processed,
    nextAllowedAt: processed ? new Date(now.getTime() + 60_000).toISOString() : now.toISOString(),
    retryAfterSeconds: processed ? 60 : 0,
    productionSendEnabled: liveSend,
    executionBlocked: false,
    executionBlockReason: null
  };
}

function blockedWindow(campaign, now, options, reason, details = {}) {
  return {
    ...campaign,
    lastWindowAttemptAt: now.toISOString(),
    lastWindowCount: 0,
    productionSendEnabled: options.liveSend === true,
    executionBlocked: true,
    executionBlockReason: reason,
    ...details
  };
}
