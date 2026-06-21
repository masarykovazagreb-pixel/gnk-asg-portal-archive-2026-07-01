import {
  DATA_KEYS,
  readSnapshot,
  readUpdateStatus,
  refreshMarket,
  refreshNews
} from '../src/refresh.js';

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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function textResponse(data, status = 200) {
  return new Response(data, {
    status,
    headers: { 'content-type': 'application/xml' }
  });
}

const rss = source => `<?xml version="1.0"?><rss><channel>
  <item>
    <title>${source} poslovna vijest</title>
    <link>https://example.com/${source.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</link>
    <description>Provjerena poslovna vijest iz javnog RSS izvora.</description>
    <pubDate>Sun, 21 Jun 2026 07:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

const successfulFetch = async url => {
  const value = String(url);
  if (value.includes('simple/price')) {
    return jsonResponse({
      bitcoin: { eur: 90000, usd: 98000, eur_24h_change: 1.25, eur_market_cap: 1800000000000, eur_24h_vol: 40000000000 },
      ethereum: { eur: 3200, usd: 3500, eur_24h_change: -0.5, eur_market_cap: 380000000000, eur_24h_vol: 18000000000 },
      solana: { eur: 145, usd: 158, eur_24h_change: 2.1, eur_market_cap: 72000000000, eur_24h_vol: 5000000000 },
      ripple: { eur: 0.52, usd: 0.57, eur_24h_change: 0.7, eur_market_cap: 29000000000, eur_24h_vol: 1200000000 }
    });
  }
  if (value.includes('market_chart')) {
    return jsonResponse({ prices: [
      [Date.parse('2026-06-15T00:00:00Z'), 87000],
      [Date.parse('2026-06-16T00:00:00Z'), 88000],
      [Date.parse('2026-06-17T00:00:00Z'), 89000]
    ] });
  }
  if (value.includes('frankfurter.app')) {
    return jsonResponse({ date: '2026-06-21', rates: { EUR: 0.92 } });
  }
  if (value.includes('feeds.bbci.co.uk/news/business')) return textResponse(rss('BBC Business'));
  if (value.includes('feeds.bbci.co.uk/news/technology')) return textResponse(rss('BBC Technology'));
  if (value.includes('guardian.com/uk/business')) return textResponse(rss('Guardian Business'));
  if (value.includes('guardian.com/uk/technology')) return textResponse(rss('Guardian Technology'));
  return textResponse('not found', 404);
};

const failingFetch = async () => {
  throw new Error('network unavailable');
};

const now = new Date('2026-06-21T07:00:00.000Z');
const store = new MemoryKv();
const env = { GNK_ASG_KV: store };

const news = await refreshNews(env, { fetchImpl: successfulFetch, now });
assert(news.ok, 'Fresh news refresh must be OK.');
assert(news.status === 'LIVE', 'Fresh news must be LIVE.');
assert(news.items.length === 4, `Expected four unique RSS items, got ${news.items.length}.`);
assert(news.items.every(item => /^https:\/\//.test(item.url)), 'News items must contain valid source URLs.');
assert(await store.get(DATA_KEYS.news), 'News snapshot was not stored.');

const marketResult = await refreshMarket(env, { fetchImpl: successfulFetch, now });
assert(marketResult.ok, 'Fresh market refresh must be OK.');
assert(marketResult.market.status === 'LIVE', 'Complete fresh market data must be LIVE.');
assert(marketResult.market.crypto.every(item => item.status === 'LIVE' && item.priceEur != null), 'All crypto records must be live and priced.');
assert(marketResult.market.fx.status === 'LIVE' && marketResult.market.fx.value === 0.92, 'FX value is incorrect.');
assert(marketResult.market.commodities.every(item => item.status === 'FALLBACK' && item.value == null), 'Gold and Brent must not receive invented values.');
assert(marketResult.btcChart.status === 'LIVE' && marketResult.btcChart.prices.length === 3, 'BTC chart is incorrect.');
assert(await store.get(DATA_KEYS.market), 'Market snapshot was not stored.');
assert(await store.get(DATA_KEYS.digitalAssets), 'Digital assets snapshot was not stored.');
assert(await store.get(DATA_KEYS.btcChart), 'BTC chart snapshot was not stored.');

const freshRead = await readSnapshot(env, DATA_KEYS.market, { now: '2026-06-21T07:10:00Z', liveMinutes: 20, delayedMinutes: 90 });
assert(freshRead.status === 'LIVE', 'Fresh stored market snapshot must be LIVE.');
const delayedRead = await readSnapshot(env, DATA_KEYS.market, { now: '2026-06-21T08:00:00Z', liveMinutes: 20, delayedMinutes: 90 });
assert(delayedRead.status === 'DELAYED', 'Aged stored market snapshot must be DELAYED.');
const expiredRead = await readSnapshot(env, DATA_KEYS.market, { now: '2026-06-21T10:00:00Z', liveMinutes: 20, delayedMinutes: 90 });
assert(expiredRead.status === 'FALLBACK', 'Expired stored market snapshot must be FALLBACK.');

const failedNews = await refreshNews(env, {
  fetchImpl: failingFetch,
  now: new Date('2026-06-21T16:00:00Z')
});
assert(failedNews.ok, 'Last-good news snapshot should keep public data available.');
assert(failedNews.status === 'FALLBACK', 'Failed refresh must use FALLBACK status.');
assert(failedNews.fallbackReason === 'last_good_snapshot', 'Failed news refresh must disclose last-good fallback.');
assert(failedNews.items.length === news.items.length, 'Last-good news items were not retained.');

const failedMarket = await refreshMarket(env, {
  fetchImpl: failingFetch,
  now: new Date('2026-06-21T16:00:00Z')
});
assert(failedMarket.market.status === 'FALLBACK', 'All-source market failure must be FALLBACK.');
assert(failedMarket.market.crypto.every(item => item.status === 'FALLBACK'), 'Previous crypto values must be marked FALLBACK.');
assert(failedMarket.market.crypto.every(item => item.priceEur != null), 'Previous crypto values should be retained as a snapshot.');
assert(failedMarket.market.fx.status === 'FALLBACK' && failedMarket.market.fx.value === 0.92, 'Previous FX value must be retained and marked FALLBACK.');
assert(failedMarket.btcChart.status === 'FALLBACK', 'Previous chart must be marked FALLBACK.');
assert(failedMarket.btcChart.prices.length === 3, 'Previous chart points must be retained without synthetic data.');

const updateStatus = await readUpdateStatus(env, { now });
assert(updateStatus.modules.news.status === 'FALLBACK', 'Status feed must report news fallback.');
assert(updateStatus.modules.market.status === 'FALLBACK', 'Status feed must report market fallback.');
assert(updateStatus.modules.btcChart.status === 'FALLBACK', 'Status feed must report chart fallback.');

const missing = await refreshNews({}, { fetchImpl: successfulFetch, now });
assert(missing.blocked && missing.writes === false, 'Refresh must not execute without storage.');

console.log('Data refresh test passed: RSS, crypto, FX, chart, KV snapshots, no fake commodities, last-good fallback and honest status aging.');
