import { MEDIA_CAMPAIGN_LIMITS } from './media-campaign-policy.js';
import { nextMediaCampaignWindow } from './media-campaign-batch.js';
import { mediaCampaignRateLimitState } from './media-campaign-rate-limit.js';
import { mediaCampaignScheduleState } from './media-campaign-schedule.js';

export function pauseMediaCampaign(campaign = {}) {
  return { ...campaign, status: 'paused', pausedAt: new Date().toISOString() };
}

export function resumeMediaCampaign(campaign = {}, now = new Date()) {
  const queue = Array.isArray(campaign.queue) ? campaign.queue : [];
  const remaining = queue.filter(item => item.status === 'remaining').length;
  const schedule = mediaCampaignScheduleState({ ...campaign, status: 'queued' }, now);
  const status = remaining ? (schedule.ready ? 'queued' : 'scheduled') : 'complete';
  return { ...campaign, status, resumedAt: now.toISOString(), remaining };
}

export function mediaCampaignStatus(campaign = {}) {
  const queue = Array.isArray(campaign.queue) ? campaign.queue : [];
  const count = status => queue.filter(item => item.status === status).length;
  const invalid = Array.isArray(campaign.invalid) ? campaign.invalid : [];
  const importedSuppressed = invalid.filter(item => item?.error === 'suppressed_recipient').length;
  const invalidFailed = invalid.length - importedSuppressed;
  return {
    id: campaign.id,
    status: campaign.status,
    total: Number(campaign.total || queue.length),
    sent: count('sent'),
    tested: count('tested'),
    failed: invalidFailed + count('failed'),
    suppressed: importedSuppressed + count('suppressed'),
    remaining: count('remaining'),
    scheduledAt: campaign.scheduledAt || null,
    lastWindowAt: campaign.lastWindowAt || null,
    lastWindowAttemptAt: campaign.lastWindowAttemptAt || null,
    nextAllowedAt: campaign.nextAllowedAt || null,
    retryAfterSeconds: Number(campaign.retryAfterSeconds || 0),
    executionBlocked: campaign.executionBlocked === true,
    executionBlockReason: campaign.executionBlockReason || null,
    rateLimitPerMinute: MEDIA_CAMPAIGN_LIMITS.maxSendPerMinute,
    suppressionCheckRequired: MEDIA_CAMPAIGN_LIMITS.requireSuppressionCheck === true,
    productionSendEnabled: campaign.productionSendEnabled === true
  };
}

export function planMediaCampaignWindow(campaign = {}, now = new Date()) {
  const schedule = mediaCampaignScheduleState(campaign, now);
  if (!schedule.ready) {
    return {
      batchId: campaign.id,
      scheduledAt: schedule.scheduledAt || now.toISOString(),
      count: 0,
      items: [],
      reason: schedule.reason,
      nextAllowedAt: null,
      retryAfterSeconds: 0
    };
  }

  const rateLimit = mediaCampaignRateLimitState(campaign, now);
  if (!rateLimit.ready) {
    return {
      batchId: campaign.id,
      scheduledAt: now.toISOString(),
      count: 0,
      items: [],
      reason: rateLimit.reason,
      nextAllowedAt: rateLimit.nextAllowedAt,
      retryAfterSeconds: rateLimit.retryAfterSeconds
    };
  }

  return {
    ...nextMediaCampaignWindow(campaign, now),
    reason: 'ready',
    nextAllowedAt: rateLimit.nextAllowedAt,
    retryAfterSeconds: 0
  };
}
