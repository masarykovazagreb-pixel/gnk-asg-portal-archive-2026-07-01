import { DATA_KEYS, refreshMarket } from './refresh.js';

const PROVIDER = 'CoinPaprika';
const COINPAPRIKA_IDS = Object.freeze({
  bitcoin: 'btc-bitcoin',
  ethereum: 'eth-ethereum',
  solana: 'sol-solana',
  ripple: 'xrp-xrp'
});

export async function refreshMarketWithPublicFallbacks(env, options = {}) {
  const result = await refreshMarket(env, options);
  if (!result?.market || result.blocked) return result;

  const candidates = result.market.crypto?.filter(item => needsFallback(item)) || [];
  if (!candidates.length) return result;

  const fetchImpl = options.fetchImpl || fetch;
  const now = new Date(options.now || Date.now());
  const recovered = new Map();
  const providerErrors = [];

  for (const item of candidates) {
    const providerId = COINPAPRIKA_IDS[item.id];
    if (!providerId) continue;

    try {
      const payload = await fetchJson(
        fetchImpl,
        `https://api.coinpaprika.com/v1/tickers/${providerId}?quotes=EUR,USD`
      );
      const normalized = normalizeCoinPaprika(item, payload, now);
      if (normalized) recovered.set(item.id, normalized);
      else providerErrors.push({ module: 'crypto-fallback', provider: PROVIDER, coin: item.symbol, error: 'empty_quote' });
    } catch (error) {
      providerErrors.push({
        module: 'crypto-fallback',
        provider: PROVIDER,
        coin: item.symbol,
        error: String(error?.message || error)
      });
    }
  }

  if (!recovered.size) {
    return {
      ...result,
      market: {
        ...result.market,
        errors: [...(result.market.errors || []), ...providerErrors]
      }
    };
  }

  const crypto = result.market.crypto.map(item => recovered.get(item.id) || item);
  const hasFresh = crypto.some(item => item.status === 'LIVE' || item.status === 'DELAYED');
  const allPriced = crypto.every(item => item.priceEur != null || item.priceUsd != null);
  const allLive = crypto.every(item => item.status === 'LIVE');
  const fxLive = result.market.fx?.status === 'LIVE';
  const status = allPriced && allLive && fxLive
    ? 'LIVE'
    : hasFresh || fxLive
      ? 'DELAYED'
      : 'FALLBACK';

  const sourceUpdatedAt = oldestTimestamp(
    crypto
      .filter(item => item.status === 'LIVE' || item.status === 'DELAYED')
      .map(item => item.sourceUpdatedAt)
      .filter(Boolean),
    result.market.sourceUpdatedAt || result.market.updatedAt
  );

  const market = {
    ...result.market,
    ok: crypto.some(item => item.priceEur != null || item.priceUsd != null) || result.market.fx?.value != null,
    status,
    sourceUpdatedAt,
    crypto,
    providers: unique([...(result.market.providers || []), PROVIDER]),
    fallbackProvidersUsed: unique([...(result.market.fallbackProvidersUsed || []), PROVIDER]),
    errors: [...(result.market.errors || []), ...providerErrors]
  };

  await persistMarket(env, market);
  return { ...result, ok: market.ok, market };
}

function needsFallback(item = {}) {
  return item.status !== 'LIVE' || item.priceEur == null || item.priceUsd == null;
}

function normalizeCoinPaprika(item, payload, now) {
  const eur = finiteOrNull(payload?.quotes?.EUR?.price);
  const usd = finiteOrNull(payload?.quotes?.USD?.price);
  if (eur == null && usd == null) return null;

  const sourceUpdatedAt = validIso(payload?.last_updated) || now.toISOString();
  return {
    ...item,
    priceEur: eur,
    priceUsd: usd,
    change24hEur: finiteOrNull(payload?.quotes?.EUR?.percent_change_24h),
    marketCapEur: finiteOrNull(payload?.quotes?.EUR?.market_cap),
    volume24hEur: finiteOrNull(payload?.quotes?.EUR?.volume_24h),
    status: 'DELAYED',
    provider: PROVIDER,
    sourceUpdatedAt,
    url: `/coin/${item.slug}`
  };
}

async function persistMarket(env, market) {
  const store = storage(env);
  if (!store) return;

  await store.put(DATA_KEYS.market, JSON.stringify(market));
  await store.put(DATA_KEYS.digitalAssets, JSON.stringify(market));

  const current = await readJson(store, DATA_KEYS.status, { ok: true, modules: {} });
  current.ok = true;
  current.updatedAt = market.updatedAt;
  current.modules = {
    ...(current.modules || {}),
    market: {
      status: market.status,
      updatedAt: market.updatedAt,
      sourceUpdatedAt: market.sourceUpdatedAt || market.updatedAt,
      count: market.crypto?.length || 0,
      providers: market.providers || []
    }
  };
  await store.put(DATA_KEYS.status, JSON.stringify(current));
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json', 'user-agent': 'GNK-ASG-Data-Sync/2.0' }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
  return JSON.parse(text);
}

function oldestTimestamp(values, fallback) {
  const timestamps = values
    .map(value => ({ value, time: Date.parse(value || '') }))
    .filter(item => Number.isFinite(item.time))
    .sort((a, b) => a.time - b.time);
  return timestamps[0]?.value || fallback || '';
}

function validIso(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function storage(env = {}) {
  return env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || env.CONTENT_KV || null;
}

async function readJson(store, key, fallback) {
  try {
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export const PUBLIC_MARKET_FALLBACKS = Object.freeze({
  provider: PROVIDER,
  coinIds: COINPAPRIKA_IDS,
  status: 'DELAYED',
  productionRoutesChanged: false,
  secretsRequired: false
});
