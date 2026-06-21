import { retryFailedMediaCampaignRecipients } from '../src/media-campaign-retry.js';

const fixedNow = new Date('2026-06-21T16:00:00.000Z');

function verifyRetryRequeuesEligibleFailures() {
  const campaign = {
    id: 'retry-proof',
    status: 'paused',
    productionSendEnabled: true,
    queue: [
      { id: 'sent-1', status: 'sent', retryAttempts: 0 },
      { id: 'failed-1', status: 'failed', retryAttempts: 0, error: 'provider_timeout' },
      { id: 'failed-2', status: 'failed', retryAttempts: 2, lastError: 'temporary_rejection' },
      { id: 'remaining-1', status: 'remaining', retryAttempts: 0 },
      { id: 'suppressed-1', status: 'suppressed', retryAttempts: 0 }
    ]
  };

  const result = retryFailedMediaCampaignRecipients(campaign, {
    now: fixedNow,
    maxAttempts: 3
  });

  assert(result.sent === 1, 'Sent counter changed during retry preparation.');
  assert(result.failed === 0, 'Eligible failed recipients were not requeued.');
  assert(result.remaining === 3, 'Remaining counter is incorrect after retry preparation.');
  assert(result.suppressed === 1, 'Suppressed recipients must remain suppressed.');
  assert(result.retryRequestedCount === 2, 'Retry count is incorrect.');
  assert(result.retryExhaustedCount === 0, 'No recipient should be exhausted in this scenario.');
  assert(result.status === 'queued', 'Retry preparation must return the campaign to queued state.');
  assert(result.productionSendEnabled === false, 'Retry preparation must never enable live sending.');

  const firstRetry = result.queue.find(item => item.id === 'failed-1');
  const secondRetry = result.queue.find(item => item.id === 'failed-2');
  assert(firstRetry.status === 'remaining' && firstRetry.retryAttempts === 1, 'First retry attempt was not recorded.');
  assert(secondRetry.status === 'remaining' && secondRetry.retryAttempts === 3, 'Final permitted retry attempt was not recorded.');
  assert(firstRetry.lastError === 'provider_timeout', 'Original provider error was not preserved.');
  assert(firstRetry.retryRequestedAt === fixedNow.toISOString(), 'Retry timestamp is not deterministic.');
}

function verifyRetryExhaustion() {
  const campaign = {
    id: 'retry-exhaustion-proof',
    status: 'queued',
    queue: [
      { id: 'failed-1', status: 'failed', retryAttempts: 3, error: 'permanent_rejection' },
      { id: 'failed-2', status: 'failed', retryAttempts: 1, error: 'provider_timeout' }
    ]
  };

  const result = retryFailedMediaCampaignRecipients(campaign, {
    now: fixedNow,
    maxAttempts: 3
  });

  const exhausted = result.queue.find(item => item.id === 'failed-1');
  const retried = result.queue.find(item => item.id === 'failed-2');
  assert(exhausted.status === 'failed', 'Exhausted recipient must remain failed.');
  assert(exhausted.retryExhausted === true, 'Exhausted recipient is not marked.');
  assert(exhausted.retryExhaustedAt === fixedNow.toISOString(), 'Exhaustion timestamp is incorrect.');
  assert(retried.status === 'remaining' && retried.retryAttempts === 2, 'Eligible recipient was not requeued.');
  assert(result.failed === 1 && result.remaining === 1, 'Failed/remaining evidence counters are incorrect.');
  assert(result.retryRequestedCount === 1 && result.retryExhaustedCount === 1, 'Retry evidence counters are incorrect.');
}

function verifyValidation() {
  assertThrows(
    () => retryFailedMediaCampaignRecipients({}, { maxAttempts: 0 }),
    'invalid_max_retry_attempts'
  );
  assertThrows(
    () => retryFailedMediaCampaignRecipients({}, { now: 'not-a-date' }),
    'invalid_retry_timestamp'
  );
}

function assertThrows(run, expectedMessage) {
  try {
    run();
  } catch (error) {
    assert(error.message === expectedMessage, `Unexpected validation error: ${error.message}`);
    return;
  }
  throw new Error(`Expected error was not thrown: ${expectedMessage}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

verifyRetryRequeuesEligibleFailures();
verifyRetryExhaustion();
verifyValidation();
console.log('Media campaign retry policy test passed.');
