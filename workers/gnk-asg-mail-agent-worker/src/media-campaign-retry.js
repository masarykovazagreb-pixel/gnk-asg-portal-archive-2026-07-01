const DEFAULT_MAX_RETRY_ATTEMPTS = 3;

export function retryFailedMediaCampaignRecipients(campaign = {}, options = {}) {
  const now = normaliseNow(options.now);
  const maxAttempts = normaliseMaxAttempts(options.maxAttempts);
  const queue = Array.isArray(campaign.queue) ? campaign.queue : [];
  let retried = 0;
  let exhausted = 0;

  const nextQueue = queue.map(item => {
    if (item?.status !== 'failed') return item;

    const retryAttempts = Number(item.retryAttempts || 0);
    if (retryAttempts >= maxAttempts) {
      exhausted += 1;
      return {
        ...item,
        retryExhausted: true,
        retryExhaustedAt: item.retryExhaustedAt || now.toISOString()
      };
    }

    retried += 1;
    return {
      ...item,
      status: 'remaining',
      retryAttempts: retryAttempts + 1,
      retryRequestedAt: now.toISOString(),
      retryExhausted: false,
      lastError: item.lastError || item.error || null
    };
  });

  const sent = countStatus(nextQueue, 'sent');
  const tested = countStatus(nextQueue, 'tested');
  const failed = countStatus(nextQueue, 'failed');
  const suppressed = countStatus(nextQueue, 'suppressed');
  const remaining = countStatus(nextQueue, 'remaining');

  return {
    ...campaign,
    queue: nextQueue,
    sent,
    tested,
    failed,
    suppressed,
    remaining,
    status: remaining ? 'queued' : campaign.status,
    retryRequestedAt: retried ? now.toISOString() : campaign.retryRequestedAt || null,
    retryRequestedCount: retried,
    retryExhaustedCount: exhausted,
    maxRetryAttempts: maxAttempts,
    productionSendEnabled: false,
    executionBlocked: false,
    executionBlockReason: null
  };
}

function countStatus(queue, status) {
  return queue.filter(item => item?.status === status).length;
}

function normaliseNow(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) throw new Error('invalid_retry_timestamp');
  return parsed;
}

function normaliseMaxAttempts(value) {
  const parsed = Number(value ?? DEFAULT_MAX_RETRY_ATTEMPTS);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new Error('invalid_max_retry_attempts');
  }
  return parsed;
}
