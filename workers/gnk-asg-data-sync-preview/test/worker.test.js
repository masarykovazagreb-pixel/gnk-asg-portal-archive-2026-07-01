import worker from '../src/index.js';
import { DATA_KEYS } from '../src/refresh.js';

class MemoryKv {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
    this.puts = 0;
  }
  async get(key) {
    return this.values.get(key) || null;
  }
  async put(key, value) {
    this.puts += 1;
    this.values.set(key, value);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function body(response) {
  return JSON.parse(await response.text());
}

const now = new Date().toISOString();
const store = new MemoryKv({
  [DATA_KEYS.news]: JSON.stringify({
    ok: true,
    status: 'LIVE',
    updatedAt: now,
    sourceUpdatedAt: now,
    ttlMinutes: 480,
    items: [{ title: 'Test', url: 'https://example.com/test' }]
  }),
  [DATA_KEYS.market]: JSON.stringify({
    ok: true,
    status: 'LIVE',
    updatedAt: now,
    sourceUpdatedAt: now,
    ttlMinutes: 15,
    crypto: [{ symbol: 'BTC', priceEur: 90000 }]
  }),
  [DATA_KEYS.btcChart]: JSON.stringify({
    ok: true,
    status: 'LIVE',
    updatedAt: now,
    sourceUpdatedAt: now,
    ttlMinutes: 15,
    prices: [{ time: now, value: 90000 }]
  })
});
const env = {
  GNK_ASG_KV: store,
  DATA_SYNC_PREVIEW_WRITE: 'false',
  OPERATOR_TOKEN: 'test-operator-token-value'
};

const statusResponse = await worker.fetch(new Request('https://preview.example/__preview/data-sync/status'), env, {});
const status = await body(statusResponse);
assert(statusResponse.status === 200 && status.ok, 'Status route must be available.');
assert(status.previewOnly === true && status.productionRouteConfigured === false, 'Status must disclose preview-only routing.');
assert(status.writesEnabled === false && status.storageAvailable === true, 'Status must disclose locked writes and available storage.');
assert(statusResponse.headers.get('x-gnk-asg-production-changed') === 'false', 'Production unchanged header is missing.');

const newsResponse = await worker.fetch(new Request('https://preview.example/data/news.json'), env, {});
const news = await body(newsResponse);
assert(newsResponse.status === 200 && news.status === 'LIVE', 'Stored news snapshot must be readable without refresh.');
assert(news.items.length === 1, 'Stored news item is missing.');

const marketResponse = await worker.fetch(new Request('https://preview.example/data/market.json'), env, {});
const market = await body(marketResponse);
assert(marketResponse.status === 200 && market.status === 'LIVE', 'Stored market snapshot must be readable.');
assert(market.crypto[0].symbol === 'BTC', 'Stored market content is incorrect.');

const unauthorizedResponse = await worker.fetch(new Request('https://preview.example/__preview/data-sync/run-news', {
  method: 'POST'
}), env, {});
assert(unauthorizedResponse.status === 401, 'Manual refresh without token must return 401.');

const lockedResponse = await worker.fetch(new Request('https://preview.example/__preview/data-sync/run-news', {
  method: 'POST',
  headers: { 'x-operator-token': env.OPERATOR_TOKEN }
}), env, {});
const locked = await body(lockedResponse);
assert(lockedResponse.status === 423 && locked.error === 'preview_writes_locked', 'Authorized manual refresh must remain locked by default.');

const beforePuts = store.puts;
await worker.scheduled({ scheduledTime: Date.now() }, env, {
  waitUntil(promise) {
    return promise;
  }
});
assert(store.puts === beforePuts, 'Locked scheduled event must not write to storage.');

const optionsResponse = await worker.fetch(new Request('https://preview.example/data/news.json', {
  method: 'OPTIONS'
}), env, {});
assert(optionsResponse.status === 204, 'OPTIONS must return 204.');
assert(optionsResponse.headers.get('access-control-allow-origin')?.includes('preview'), 'Preview CORS origin is missing.');

const missingResponse = await worker.fetch(new Request('https://preview.example/unknown'), env, {});
assert(missingResponse.status === 404, 'Unknown route must return 404.');

console.log('Data sync preview worker test passed: snapshots, status, CORS, auth, write lock and locked cron.');
