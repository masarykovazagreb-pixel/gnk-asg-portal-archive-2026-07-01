import { mediaCampaignRateLimitState } from '../src/media-campaign-rate-limit.js';
import { executeMediaCampaignWindow } from '../src/media-campaign-window.js';

const firstAt = new Date('2026-06-21T08:00:00.000Z');
const campaign = {
  id: 'window-test',
  queue: Array.from({ length: 20 }, (_, index) => ({
    id: `item-${index + 1}`,
    status: 'remaining'
  }))
};

const first = executeMediaCampaignWindow(campaign, { liveSend: false, now: firstAt });
if (first.lastWindowCount !== 10 || first.remaining !== 10) {
  throw new Error('First window must process ten items.');
}

const earlyAt = new Date(firstAt.getTime() + 30000);
const limited = mediaCampaignRateLimitState(first, earlyAt);
if (limited.ready || limited.reason !== 'rate_limited' || limited.retryAfterSeconds !== 30) {
  throw new Error('A second window must wait for one minute.');
}

const blocked = executeMediaCampaignWindow(first, { liveSend: false, now: earlyAt });
if (!blocked.executionBlocked || blocked.executionBlockReason !== 'rate_limited') {
  throw new Error('Early execution must be blocked.');
}
if (blocked.remaining !== 10 || blocked.lastWindowCount !== 0) {
  throw new Error('Blocked execution must preserve the queue.');
}

const secondAt = new Date(firstAt.getTime() + 60000);
const second = executeMediaCampaignWindow(first, { liveSend: false, now: secondAt });
if (second.lastWindowCount !== 10 || second.remaining !== 0 || second.tested !== 20) {
  throw new Error('The second window must process the remaining items.');
}

console.log('Media campaign rate limit test passed.');
