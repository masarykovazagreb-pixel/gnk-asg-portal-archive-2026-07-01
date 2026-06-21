import { MEDIA_CAMPAIGN_LIMITS } from './media-campaign-policy.js';
import { nextMediaCampaignWindow } from './media-campaign-batch.js';
import { mediaCampaignScheduleState } from './media-campaign-schedule.js';

export function pauseMediaCampaign(campaign = {}) {
  return { ...campaign, status: 'paused', pausedAt: new Date().toISOString() };
}

export function resumeMediaCampaign(campaign = {}, now = new Date()) {
  const queue = Array.isArray(campaign.queue) ? campaign.queue : [];
  const remaining = queue.filter(item => item.status === 'remaining').length;
  const schedule = mediaCampaignScheduleState({ ...campaign, status: 'queued' }, now);
  const status = remaining ? (schedule.ready ? 'queued' : 'scheduled') : 'complete';
  return {
    ...campaign,
    status,
    resumedAt: now.toISOString(),
    remaining
  };
}

export function mediaCampaignStatus(campaign = {}) {
  const queue = Array.isArray(campaign.queue) ? campaign.queue : [];
  const count = status => queue.filter(item => item.status === status).length;
  const sent = count('sent');
  const tested = count('tested');
  const failed = (Array.isArray(campaign.invalid) ? campaign.invalid.length : 0) + count('failed');
  const remaining = count('remaining');
  return {
    id: campaign.id,
    status: campaign.status,
    total: Number(campaign.total || queue.length),
    sent,
    tested,
    failed,
    remaining,
    scheduledAt: campaign.scheduledAt || null,
    rateLimitPerMinute: MEDIA_CAMPAIGN_LIMITS.maxSendPerMinute,
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
      reason: schedule.reason
    };
  }
  return nextMediaCampaignWindow(campaign, now);
}
