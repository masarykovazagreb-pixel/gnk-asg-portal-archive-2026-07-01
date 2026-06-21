import {
  DATA_SYNC_KEYS,
  duePlan,
  honestStatus,
  marketSlot,
  newsSlot,
  runScheduledDataSync,
  zagrebParts
} from '../src/schedule.js';

class MemoryKv {
  constructor() {
    this.values = new Map();
  }
  async get(key) {
    return this.values.get(key) || null;
  }
  async put(key, value) {
    this.values.set(key, value);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const summer = new Date('2026-06-21T07:00:00.000Z');
const winter = new Date('2026-12-21T08:00:00.000Z');
assert(zagrebParts(summer).hour === 9, 'Summer time must resolve to 09:00 in Zagreb.');
assert(zagrebParts(winter).hour === 9, 'Winter time must resolve to 09:00 in Zagreb.');
assert(newsSlot(summer) === '2026-06-21@09:00', 'Summer news slot is incorrect.');
assert(newsSlot(winter) === '2026-12-21@09:00', 'Winter news slot is incorrect.');
assert(newsSlot(new Date('2026-06-21T14:00:00.000Z')) === '2026-06-21@16:00', 'Afternoon news slot is incorrect.');
assert(newsSlot(new Date('2026-06-21T10:00:00.000Z')) === '', 'News must not run outside 09:00 or 16:00 windows.');
assert(marketSlot(new Date('2026-06-21T06:22:00.000Z')) === '2026-06-21@08:15', 'Market quarter-hour slot is incorrect.');

const morningPlan = duePlan(summer, {});
assert(morningPlan.news.due, '09:00 news must be due without prior state.');
assert(morningPlan.market.due, '09:00 market must be due without prior state.');
const repeatedPlan = duePlan(summer, {
  lastNewsSlot: morningPlan.news.slot,
  lastMarketSlot: morningPlan.market.slot
});
assert(!repeatedPlan.news.due, 'News slot must be deduplicated.');
assert(!repeatedPlan.market.due, 'Market slot must be deduplicated.');

let newsRuns = 0;
let marketRuns = 0;
const store = new MemoryKv();
const env = { GNK_ASG_KV: store };
const refreshNews = async () => ({ ok: true, status: 'LIVE', run: ++newsRuns });
const refreshMarket = async () => ({ ok: true, status: 'LIVE', run: ++marketRuns });

const first = await runScheduledDataSync({ env, now: summer, refreshNews, refreshMarket });
assert(first.ok && first.news.executed && first.market.executed, 'First 09:00 run must execute news and market.');
assert(newsRuns === 1 && marketRuns === 1, 'First handlers must run exactly once.');

const duplicate = await runScheduledDataSync({
  env,
  now: new Date('2026-06-21T07:05:00.000Z'),
  refreshNews,
  refreshMarket
});
assert(!duplicate.news.executed && !duplicate.market.executed, 'Same local slots must not execute twice.');
assert(newsRuns === 1 && marketRuns === 1, 'Deduplicated handlers must not run again.');

const nextQuarter = await runScheduledDataSync({
  env,
  now: new Date('2026-06-21T07:15:00.000Z'),
  refreshNews,
  refreshMarket
});
assert(!nextQuarter.news.executed && nextQuarter.market.executed, '09:15 must execute only market.');
assert(newsRuns === 1 && marketRuns === 2, 'Market must run once in the next interval.');

const afternoon = await runScheduledDataSync({
  env,
  now: new Date('2026-06-21T14:00:00.000Z'),
  refreshNews,
  refreshMarket
});
assert(afternoon.news.executed && afternoon.market.executed, '16:00 must execute news and market.');
assert(newsRuns === 2 && marketRuns === 3, 'Afternoon counters are incorrect.');

const state = JSON.parse(await store.get(DATA_SYNC_KEYS.state));
assert(state.lastNewsSlot === '2026-06-21@16:00', 'Latest news state slot was not stored.');
assert(state.lastMarketSlot === '2026-06-21@16:00', 'Latest market state slot was not stored.');
const log = JSON.parse(await store.get(DATA_SYNC_KEYS.log));
assert(Array.isArray(log) && log.length === 4, 'Each scheduled evaluation must be logged.');

let blockedCalls = 0;
const blocked = await runScheduledDataSync({
  env: {},
  now: summer,
  refreshNews: async () => { blockedCalls += 1; },
  refreshMarket: async () => { blockedCalls += 1; }
});
assert(blocked.blocked && !blocked.writes, 'Missing storage must block execution.');
assert(blockedCalls === 0, 'Handlers must not run without storage.');

const retryStore = new MemoryKv();
let failures = 0;
const failedRun = await runScheduledDataSync({
  env: { GNK_ASG_KV: retryStore },
  now: summer,
  refreshNews: async () => { failures += 1; throw new Error('temporary'); },
  refreshMarket: async () => ({ ok: true })
});
assert(!failedRun.news.ok, 'Failed news handler must be reported.');
const retryState = JSON.parse(await retryStore.get(DATA_SYNC_KEYS.state));
assert(!retryState.lastNewsSlot, 'Failed news slot must not be marked complete.');
await runScheduledDataSync({
  env: { GNK_ASG_KV: retryStore },
  now: new Date('2026-06-21T07:05:00.000Z'),
  refreshNews: async () => ({ ok: true }),
  refreshMarket: async () => ({ ok: true })
});
const recoveredState = JSON.parse(await retryStore.get(DATA_SYNC_KEYS.state));
assert(recoveredState.lastNewsSlot === '2026-06-21@09:00', 'Failed news slot must be retried in the same window.');
assert(failures === 1, 'Failure counter is incorrect.');

assert(honestStatus({ sourceStatus: 'LIVE', updatedAt: '2026-06-21T07:00:00Z', now: '2026-06-21T07:10:00Z' }) === 'LIVE', 'Fresh LIVE status is incorrect.');
assert(honestStatus({ sourceStatus: 'LIVE', updatedAt: '2026-06-21T07:00:00Z', now: '2026-06-21T08:00:00Z' }) === 'DELAYED', 'Aged LIVE data must become DELAYED.');
assert(honestStatus({ sourceStatus: 'LIVE', updatedAt: '2026-06-21T07:00:00Z', now: '2026-06-21T10:00:00Z' }) === 'FALLBACK', 'Expired LIVE data must become FALLBACK.');
assert(honestStatus({ sourceStatus: 'SNAPSHOT', updatedAt: '' }) === 'SNAPSHOT', 'Explicit SNAPSHOT must remain SNAPSHOT.');
assert(honestStatus({ sourceStatus: 'FALLBACK', updatedAt: '2026-06-21T07:00:00Z' }) === 'FALLBACK', 'FALLBACK must remain FALLBACK.');

console.log('Data sync schedule test passed: Zagreb DST, 09/16 news, 15-minute market, dedupe, retry, storage gate and honest statuses.');
