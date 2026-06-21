import { MEDIA_CAMPAIGN_LIMITS } from './media-campaign-policy.js';

export function executeMediaCampaignWindow(campaign = {}, options = {}) {
  const queue = Array.isArray(campaign.queue) ? campaign.queue : [];
  const limit = MEDIA_CAMPAIGN_LIMITS.maxSendPerMinute;
  const liveSend = options.liveSend === true;
  let processed = 0;

  const nextQueue = queue.map(item => {
    if (processed >= limit || item.status !== 'remaining') return item;
    processed += 1;
    return {
      ...item,
      status: liveSend ? 'queued' : 'sent',
      simulated: !liveSend,
      processedAt: new Date().toISOString()
    };
  });

  const sent = nextQueue.filter(item => item.status === 'sent').length;
  const failed = Number(campaign.failed || 0) + nextQueue.filter(item => item.status === 'failed').length;
  const remaining = nextQueue.filter(item => item.status === 'remaining').length;

  return {
    ...campaign,
    queue: nextQueue,
    sent,
    failed,
    remaining,
    status: remaining ? 'queued' : 'complete',
    lastWindowAt: new Date().toISOString(),
    lastWindowCount: processed,
    productionSendEnabled: liveSend
  };
}
