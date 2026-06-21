import { acquireMediaCampaignLease, strictCampaignLeaseReady } from '../src/media-campaign-lease.js';

class MemoryD1 {
  constructor() {
    this.rows = new Map();
  }

  prepare(sql) {
    const database = this;
    return {
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async run() {
        if (/CREATE TABLE/i.test(sql)) return { meta: { changes: 0 } };
        if (/INSERT OR IGNORE/i.test(sql)) {
          const [campaignId, updatedAt] = this.values;
          if (!database.rows.has(campaignId)) {
            database.rows.set(campaignId, {
              campaign_id: campaignId,
              last_started_at: 0,
              lease_id: null,
              updated_at: updatedAt
            });
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
        if (/UPDATE media_campaign_rate_leases/i.test(sql)) {
          const [nowMs, leaseId, updatedAt, campaignId, threshold] = this.values;
          const row = database.rows.get(campaignId);
          if (row && row.last_started_at <= threshold) {
            row.last_started_at = nowMs;
            row.lease_id = leaseId;
            row.updated_at = updatedAt;
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
        throw new Error(`Unexpected SQL run: ${sql}`);
      },
      async first() {
        if (/SELECT last_started_at/i.test(sql)) {
          const [campaignId] = this.values;
          return database.rows.get(campaignId) || null;
        }
        throw new Error(`Unexpected SQL first: ${sql}`);
      }
    };
  }
}

const env = { GNK_ASG_D1: new MemoryD1() };
if (!strictCampaignLeaseReady(env)) throw new Error('D1 lease binding was not detected.');

const start = new Date('2026-06-21T08:00:00.000Z');
const first = await acquireMediaCampaignLease(env, 'campaign-100', start);
if (!first.acquired || first.retryAfterSeconds !== 60) {
  throw new Error('First campaign lease must be acquired.');
}

const duplicate = await acquireMediaCampaignLease(env, 'campaign-100', new Date(start.getTime() + 500));
if (duplicate.acquired || duplicate.reason !== 'rate_limited') {
  throw new Error('Concurrent campaign lease must be rejected.');
}
if (duplicate.retryAfterSeconds !== 60) {
  throw new Error('Concurrent lease retry time is incorrect.');
}

const early = await acquireMediaCampaignLease(env, 'campaign-100', new Date(start.getTime() + 59_000));
if (early.acquired || early.retryAfterSeconds !== 1) {
  throw new Error('Lease must remain blocked until the full minute expires.');
}

const next = await acquireMediaCampaignLease(env, 'campaign-100', new Date(start.getTime() + 60_000));
if (!next.acquired) throw new Error('Lease must be available after sixty seconds.');

console.log('Media campaign strict D1 lease test passed.');
