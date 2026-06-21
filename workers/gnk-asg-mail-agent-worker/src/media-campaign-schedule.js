export function mediaCampaignScheduleState(campaign = {}, now = new Date()) {
  if (campaign.status === 'paused') {
    return { ready: false, reason: 'paused', scheduledAt: campaign.scheduledAt || null };
  }

  if (!campaign.scheduledAt) {
    return { ready: true, reason: 'ready', scheduledAt: null };
  }

  const scheduled = new Date(campaign.scheduledAt);
  const current = now instanceof Date ? now : new Date(now);

  if (Number.isNaN(scheduled.getTime()) || Number.isNaN(current.getTime())) {
    return { ready: false, reason: 'invalid_schedule', scheduledAt: campaign.scheduledAt };
  }

  if (scheduled.getTime() > current.getTime()) {
    return { ready: false, reason: 'scheduled', scheduledAt: scheduled.toISOString() };
  }

  return { ready: true, reason: 'ready', scheduledAt: scheduled.toISOString() };
}
