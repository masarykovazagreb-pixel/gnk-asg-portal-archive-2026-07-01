import { DATA_KEYS } from '../src/refresh.js';
import { PUBLIC_MARKET_FALLBACKS, refreshMarketWithPublicFallbacks } from '../src/public-market-fallbacks.js';

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

const paprika = {
  'btc-bitcoin': { id: 'btc-bitcoin', last_updated: '2026-06-21T10:00:00Z', quotes: { EUR: { price: 90500, percent_change_24h: 1.1, market_cap: 1800000000000, volume_24h: 41000000000 }, USD: { price: 98500 } } },
  'eth-ethereum': { id: 'eth-ethereum', last_updated: '2026-06-21T10:00:00Z', quotes: { EUR: { price: 3250, percent_change_24h: -0.4, market_cap: 390000000000, volume_24h: 19000000000 }, USD: { price: 3540 } } },
  'sol-solana': { id: 'sol-solana', last_updated: '2026-06-21T09:59:00Z', quotes: { EUR: { price: 147, percent_change_24h: 2.2, market_cap: 73000000000, volume_24h: 5200000000 }, USD: { price: 160 } } },
  'xrp-xrp': { id: 'xrp-xrp', last_updated: '2026-06-21T09:58:00Z', quotes: { EUR: { price: 0.53, percent_change_24h: 0.8, market_cap: 30000000000, volume_24h: 1300000000 }, USD: { price: 0.58 } } }
};

const fallbackFetch = async url => {
  const value = String(url);
  if (value.includes('api.coingecko.com')) return jsonResponse({ error: 'rate_limited' }, 429);
  if (value.includes('api.frankfurter.app')) return jsonResponse({ date: '2026-06-21', rates: { EUR: 0.92 } });
  if (value.includes('api.coinpaprika.com')) {
    const id = Object.keys(paprika).find(key => value.includes(key));
    return id ? jsonResponse(paprika[id]) : jsonResponse({ error: 'not_found' }, 404);
  }
  return jsonResponse({ error: 'not_found' }, 404);
};

const store = new MemoryKv();
const env = { GNK_ASG_KV: store };
const result = await refreshMarketWithPublicFallbacks(env, {
  fetchImpl: fallbackFetch,
  now: new Date('2026-06-21T10:02:00Z')
});

assert(result.ok, 'CoinPaprika fallback must keep the market snapshot available.');
assert(result.market.status === 'DELAYED', 'Fallback provider data must be disclosed as DELAYED, never LIVE.');
assert(result.market.crypto.length === 4, 'All configured crypto assets must remain present.');
assert(result.market.crypto.every(item => item.status === 'DELAYED'), 'Recovered crypto values must be marked DELAYED.');
assert(result.market.crypto.every(item => item.provider === 'CoinPaprika'), 'Recovered values must name their provider.');
assert(result.market.crypto.every(item => item.priceEur != null && item.priceUsd != null), 'Recovered prices must include EUR and USD.');
assert(result.market.fallbackProvidersUsed.includes('CoinPaprika'), 'Snapshot must disclose the fallback provider.');
assert(result.market.sourceUpdatedAt === '2026-06-21T09:58:00.000Z', 'Snapshot freshness must use the oldest recovered source timestamp.');
assert(PUBLIC_MARKET_FALLBACKS.secretsRequired === false, 'Public fallback must not require a secret.');
assert(PUBLIC_MARKET_FALLBACKS.productionRoutesChanged === false, 'Fallback module must not modify production routes.');

const storedMarket = JSON.parse(await store.get(DATA_KEYS.market));
const storedDigital = JSON.parse(await store.get(DATA_KEYS.digitalAssets));
const storedStatus = JSON.parse(await store.get(DATA_KEYS.status));
assert(storedMarket.status === 'DELAYED', 'Market KV snapshot was not updated.');
assert(storedDigital.status === 'DELAYED', 'Digital assets KV snapshot was not updated.');
assert(storedStatus.modules.market.providers.includes('CoinPaprika'), 'Status evidence must name the fallback provider.');

console.log('Public market fallback test passed: no-key CoinPaprika recovery, honest DELAYED status, source timestamps and KV evidence.');
