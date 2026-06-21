import { honestStatus } from './schedule.js';

const NEWS_KEY = 'data:news.json';
const MARKET_KEY = 'data:market.json';
const DIGITAL_KEY = 'data:digital-assets.json';
const BTC_CHART_KEY = 'data:btc_chart.json';
const STATUS_KEY = 'data:update_status.json';

const NEWS_FEEDS = [
  { source: 'BBC Business', category: 'Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { source: 'BBC Technology', category: 'Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { source: 'The Guardian Business', category: 'Business', url: 'https://www.theguardian.com/uk/business/rss' },
  { source: 'The Guardian Technology', category: 'Technology', url: 'https://www.theguardian.com/uk/technology/rss' }
];

const CRYPTO = [
  { id: 'bitcoin', slug: 'btc', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', slug: 'eth', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', slug: 'sol', symbol: 'SOL', name: 'Solana' },
  { id: 'ripple', slug: 'xrp', symbol: 'XRP', name: 'XRP' }
];

export async function refreshNews(env, options = {}) {
  const store = storage(env);
  if (!store) return blocked('news');
  const fetchImpl = options.fetchImpl || fetch;
  const now = new Date(options.now || Date.now());
  const previous = await readJson(store, NEWS_KEY, null);
  const collected = [];
  const errors = [];

  for (const feed of NEWS_FEEDS) {
    try {
      const response = await fetchImpl(feed.url, {
        headers: {
          accept: 'application/rss+xml, application/xml, text/xml, */*',
          'user-agent': 'GNK-ASG-Data-Sync/2.0'
        }
      });
      const text = await response.text();
      if (!response.ok) {
        errors.push({ source: feed.source, status: response.status });
        continue;
      }
      collected.push(...parseFeed(text, feed));
    } catch (error) {
      errors.push({ source: feed.source, error: String(error?.message || error) });
    }
  }

  const freshItems = dedupeNews(collected).slice(0, 24);
  const usePrevious = freshItems.length === 0 && Array.isArray(previous?.items) && previous.items.length > 0;
  const items = usePrevious ? previous.items : freshItems;
  const status = freshItems.length > 0 ? 'LIVE' : 'FALLBACK';
  const updatedAt = now.toISOString();
  const snapshot = {
    ok: items.length > 0,
    type: 'news',
    status,
    updatedAt,
    sourceUpdatedAt: usePrevious ? previous.updatedAt || '' : updatedAt,
    ageMinutes: usePrevious ? ageMinutes(previous.updatedAt, now) : 0,
    ttlMinutes: 480,
    count: items.length,
    sources: NEWS_FEEDS.map(item => item.source),
    errors,
    fallbackReason: usePrevious ? 'last_good_snapshot' : freshItems.length ? '' : 'no_fresh_items',
    items
  };

  await store.put(NEWS_KEY, JSON.stringify(snapshot));
  await mergeStatus(store, 'news', snapshot);
  return snapshot;
}

export async function refreshMarket(env, options = {}) {
  const store = storage(env);
  if (!store) return blocked('market');
  const fetchImpl = options.fetchImpl || fetch;
  const now = new Date(options.now || Date.now());
  const previous = await readJson(store, MARKET_KEY, null);
  const previousChart = await readJson(store, BTC_CHART_KEY, null);
  const errors = [];

  const pricesUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${CRYPTO.map(item => item.id).join(',')}&vs_currencies=eur,usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
  let crypto = [];
  try {
    const prices = await fetchJson(fetchImpl, pricesUrl);
    crypto = CRYPTO.map(item => normalizeCrypto(item, prices[item.id] || {}, previous));
  } catch (error) {
    errors.push({ module: 'crypto', error: String(error?.message || error) });
    crypto = CRYPTO.map(item => previousCrypto(item, previous));
  }

  let fx;
  try {
    const value = await fetchJson(fetchImpl, 'https://api.frankfurter.app/latest?from=USD&to=EUR');
    const rate = Number(value?.rates?.EUR);
    fx = {
      pair: 'USD/EUR',
      value: Number.isFinite(rate) ? rate : null,
      date: value?.date || now.toISOString().slice(0, 10),
      status: Number.isFinite(rate) ? 'LIVE' : 'FALLBACK'
    };
  } catch (error) {
    errors.push({ module: 'fx', error: String(error?.message || error) });
    fx = previous?.fx?.value != null
      ? { ...previous.fx, status: 'FALLBACK' }
      : { pair: 'USD/EUR', value: null, date: '', status: 'FALLBACK' };
  }

  let btcChart;
  try {
    const chart = await fetchJson(fetchImpl, 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=7&interval=daily');
    const prices = Array.isArray(chart?.prices)
      ? chart.prices.filter(item => Array.isArray(item) && Number.isFinite(Number(item[0])) && Number.isFinite(Number(item[1])))
      : [];
    if (!prices.length) throw new Error('empty_chart');
    btcChart = {
      ok: true,
      status: 'LIVE',
      updatedAt: now.toISOString(),
      sourceUpdatedAt: now.toISOString(),
      currency: 'EUR',
      days: 7,
      prices: prices.map(item => ({ time: new Date(Number(item[0])).toISOString(), value: Number(item[1]) }))
    };
  } catch (error) {
    errors.push({ module: 'btc-chart', error: String(error?.message || error) });
    btcChart = Array.isArray(previousChart?.prices) && previousChart.prices.length
      ? {
          ...previousChart,
          status: 'FALLBACK',
          updatedAt: now.toISOString(),
          sourceUpdatedAt: previousChart.sourceUpdatedAt || previousChart.updatedAt || '',
          fallbackReason: 'last_good_snapshot'
        }
      : {
          ok: false,
          status: 'FALLBACK',
          updatedAt: now.toISOString(),
          sourceUpdatedAt: '',
          currency: 'EUR',
          days: 7,
          prices: [],
          fallbackReason: 'no_chart_snapshot'
        };
  }

  const liveCrypto = crypto.filter(item => item.status === 'LIVE').length;
  const overall = liveCrypto === crypto.length && fx.status === 'LIVE'
    ? 'LIVE'
    : liveCrypto > 0 || fx.status === 'LIVE'
      ? 'DELAYED'
      : 'FALLBACK';
  const updatedAt = now.toISOString();
  const market = {
    ok: crypto.some(item => item.priceEur != null) || fx.value != null,
    type: 'market',
    status: overall,
    updatedAt,
    sourceUpdatedAt: overall === 'FALLBACK' ? previous?.sourceUpdatedAt || previous?.updatedAt || '' : updatedAt,
    ttlMinutes: 15,
    disclaimer: 'Podatci su informativni, mogu kasniti i nisu financijski savjet.',
    crypto,
    fx,
    commodities: [
      commoditySnapshot('GOLD', 'Zlato', previous),
      commoditySnapshot('BRENT', 'Brent nafta', previous)
    ],
    errors
  };

  await store.put(MARKET_KEY, JSON.stringify(market));
  await store.put(DIGITAL_KEY, JSON.stringify(market));
  await store.put(BTC_CHART_KEY, JSON.stringify(btcChart));
  await mergeStatus(store, 'market', market, { btcChart });
  return { ok: market.ok, market, btcChart };
}

export async function readSnapshot(env, key, options = {}) {
  const store = storage(env);
  if (!store) return blocked(key);
  const snapshot = await readJson(store, key, null);
  if (!snapshot) return { ok: false, status: 'FALLBACK', error: 'snapshot_missing', key };
  const status = honestStatus({
    sourceStatus: snapshot.status,
    updatedAt: snapshot.sourceUpdatedAt || snapshot.updatedAt,
    now: options.now || new Date(),
    liveMinutes: Number(options.liveMinutes || snapshot.ttlMinutes || 20),
    delayedMinutes: Number(options.delayedMinutes || Math.max(90, Number(snapshot.ttlMinutes || 20) * 4))
  });
  return {
    ...snapshot,
    status,
    ageMinutes: ageMinutes(snapshot.sourceUpdatedAt || snapshot.updatedAt, options.now || new Date())
  };
}

export async function readUpdateStatus(env, options = {}) {
  const store = storage(env);
  if (!store) return blocked('status');
  const status = await readJson(store, STATUS_KEY, null);
  return status || {
    ok: true,
    status: 'PENDING',
    updatedAt: new Date(options.now || Date.now()).toISOString(),
    modules: {}
  };
}

async function mergeStatus(store, module, snapshot, extra = {}) {
  const current = await readJson(store, STATUS_KEY, { ok: true, modules: {} });
  current.ok = true;
  current.updatedAt = snapshot.updatedAt;
  current.modules = {
    ...(current.modules || {}),
    [module]: {
      status: snapshot.status,
      updatedAt: snapshot.updatedAt,
      sourceUpdatedAt: snapshot.sourceUpdatedAt || snapshot.updatedAt,
      count: snapshot.count ?? snapshot.crypto?.length ?? 0
    }
  };
  if (extra.btcChart) {
    current.modules.btcChart = {
      status: extra.btcChart.status,
      updatedAt: extra.btcChart.updatedAt,
      sourceUpdatedAt: extra.btcChart.sourceUpdatedAt || extra.btcChart.updatedAt,
      points: extra.btcChart.prices?.length || 0
    };
  }
  await store.put(STATUS_KEY, JSON.stringify(current));
}

function normalizeCrypto(item, price, previous) {
  const eur = finiteOrNull(price?.eur);
  const usd = finiteOrNull(price?.usd);
  if (eur != null || usd != null) {
    return {
      ...item,
      priceEur: eur,
      priceUsd: usd,
      change24hEur: finiteOrNull(price?.eur_24h_change),
      marketCapEur: finiteOrNull(price?.eur_market_cap),
      volume24hEur: finiteOrNull(price?.eur_24h_vol),
      status: 'LIVE',
      url: `/coin/${item.slug}`
    };
  }
  return previousCrypto(item, previous);
}

function previousCrypto(item, previous) {
  const old = previous?.crypto?.find(value => value.id === item.id || value.symbol === item.symbol);
  return old
    ? { ...old, ...item, status: 'FALLBACK', url: `/coin/${item.slug}` }
    : {
        ...item,
        priceEur: null,
        priceUsd: null,
        change24hEur: null,
        marketCapEur: null,
        volume24hEur: null,
        status: 'FALLBACK',
        url: `/coin/${item.slug}`
      };
}

function commoditySnapshot(symbol, name, previous) {
  const old = previous?.commodities?.find(item => item.symbol === symbol);
  if (old?.value != null) return { ...old, symbol, name, status: 'SNAPSHOT' };
  return { symbol, name, value: null, currency: symbol === 'GOLD' ? 'EUR/oz' : 'USD/bbl', status: 'FALLBACK' };
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json', 'user-agent': 'GNK-ASG-Data-Sync/2.0' }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
  return JSON.parse(text);
}

function parseFeed(xml, feed) {
  const blocks = String(xml || '').match(/<item[\s\S]*?<\/item>/gi)
    || String(xml || '').match(/<entry[\s\S]*?<\/entry>/gi)
    || [];
  return blocks.slice(0, 12).map((block, index) => {
    const title = pick(block, 'title');
    const url = pick(block, 'link') || block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || '';
    const summary = pick(block, 'description') || pick(block, 'summary') || pick(block, 'content');
    const publishedAt = pick(block, 'pubDate') || pick(block, 'updated') || pick(block, 'published');
    return {
      id: slug(`${feed.source}-${index}-${title}`),
      title,
      summary: summary.slice(0, 500),
      url,
      source: feed.source,
      category: feed.category,
      publishedAt
    };
  }).filter(item => item.title && /^https?:\/\//i.test(item.url));
}

function pick(xml, tag) {
  const match = String(xml || '').match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return decodeXml(match?.[1] || '');
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeNews(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.url || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function ageMinutes(value, now = new Date()) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.round((new Date(now).getTime() - timestamp) / 60000));
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

function blocked(module) {
  return { ok: false, blocked: true, writes: false, module, error: 'storage_missing' };
}

export const DATA_KEYS = Object.freeze({
  news: NEWS_KEY,
  market: MARKET_KEY,
  digitalAssets: DIGITAL_KEY,
  btcChart: BTC_CHART_KEY,
  status: STATUS_KEY
});
