const WINDOW_MS = 60_000;

export function mediaCampaignRateLimitState(campaign = {}, now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime())) {
    return {
      ready: false,
      reason: 'invalid_now',
      nextAllowedAt: null,
      retryAfterSeconds: null
    };
  }

  if (!campaign.lastWindowAt || Number(campaign.lastWindowCount || 0) <= 0) {
    return {
      ready: true,
      reason: 'ready',
      nextAllowedAt: current.toISOString(),
      retryAfterSeconds: 0
    };
  }

  const lastWindowAt = new Date(campaign.lastWindowAt);
  if (Number.isNaN(lastWindowAt.getTime())) {
    return {
      ready: false,
      reason: 'invalid_last_window',
      nextAllowedAt: null,
      retryAfterSeconds: null
    };
  }

  const nextAllowedAt = new Date(lastWindowAt.getTime() + WINDOW_MS);
  const remainingMs = nextAllowedAt.getTime() - current.getTime();
  if (remainingMs > 0) {
    return {
      ready: false,
      reason: 'rate_limited',
      nextAllowedAt: nextAllowedAt.toISOString(),
      retryAfterSeconds: Math.ceil(remainingMs / 1000)
    };
  }

  return {
    ready: true,
    reason: 'ready',
    nextAllowedAt: nextAllowedAt.toISOString(),
    retryAfterSeconds: 0
  };
}
