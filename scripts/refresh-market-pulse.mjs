import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('apps/portal/data/market-pulse.json');

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; GNK-ASG-Market-Pulse/1.0)' };

const INDICES = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^DJI', label: 'Dow Jones' },
  { symbol: '^IXIC', label: 'Nasdaq' },
  { symbol: '^FTSE', label: 'FTSE 100' },
  { symbol: '^GDAXI', label: 'DAX' },
  { symbol: '^N225', label: 'Nikkei' },
  { symbol: '^VIX', label: 'VIX' },
];

const COMMODITIES = [
  { symbol: 'GC=F', label: 'Zlato', unit: 'USD/oz' },
  { symbol: 'SI=F', label: 'Srebro', unit: 'USD/oz' },
  { symbol: 'CL=F', label: 'WTI nafta', unit: 'USD/bbl' },
  { symbol: 'BZ=F', label: 'Brent', unit: 'USD/bbl' },
  { symbol: 'HG=F', label: 'Bakar', unit: 'USD/lb' },
];

const CURRENCIES = [
  { symbol: 'EURUSD=X', label: 'EUR/USD' },
  { symbol: 'GBPUSD=X', label: 'GBP/USD' },
  { symbol: 'USDJPY=X', label: 'USD/JPY' },
  { symbol: 'USDCNY=X', label: 'USD/CNY' },
];

const STOCKS = [
  { symbol: 'AAPL', label: 'Apple' },
  { symbol: 'MSFT', label: 'Microsoft' },
  { symbol: 'NVDA', label: 'NVIDIA' },
  { symbol: 'GOOGL', label: 'Alphabet' },
  { symbol: 'AMZN', label: 'Amazon' },
  { symbol: 'TSLA', label: 'Tesla' },
];

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { headers: UA, signal: controller.signal, ...opts });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchYahooQuote(symbol, label, extra = {}) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const data = await fetchJson(url);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('no result');
    const meta = result.meta || {};
    const closes = (result.indicators?.quote?.[0]?.close || []).filter((v) => v != null);
    const price = meta.regularMarketPrice ?? closes[closes.length - 1];
    const prevClose = meta.chartPreviousClose ?? closes[closes.length - 2] ?? price;
    const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
    return { symbol, label, ...extra, price: Number(price), changePct: Number(changePct.toFixed(2)), ok: true };
  } catch (error) {
    return { symbol, label, ...extra, ok: false, error: String(error?.message || error) };
  }
}

async function fetchCryptoGlobal() {
  try {
    const data = await fetchJson('https://api.coingecko.com/api/v3/global');
    const d = data?.data;
    if (!d) throw new Error('no data');
    return {
      ok: true,
      totalMarketCapUsd: d.total_market_cap?.usd || null,
      marketCapChangePct24h: d.market_cap_change_percentage_24h_usd != null
        ? Number(d.market_cap_change_percentage_24h_usd.toFixed(2)) : null,
      btcDominancePct: d.market_cap_percentage?.btc != null ? Number(d.market_cap_percentage.btc.toFixed(1)) : null,
      ethDominancePct: d.market_cap_percentage?.eth != null ? Number(d.market_cap_percentage.eth.toFixed(1)) : null,
      activeCryptocurrencies: d.active_cryptocurrencies || null,
    };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

async function fetchFearGreed() {
  try {
    const data = await fetchJson('https://api.alternative.me/fng/?limit=1');
    const item = data?.data?.[0];
    if (!item) throw new Error('no data');
    return { ok: true, value: Number(item.value), classification: item.value_classification };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

async function fetchTopCoins() {
  try {
    const data = await fetchJson(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&price_change_percentage=24h,7d'
    );
    if (!Array.isArray(data)) throw new Error('unexpected shape');
    return data.map((c) => ({
      id: c.id,
      symbol: (c.symbol || '').toUpperCase(),
      name: c.name,
      price: c.current_price,
      changePct24h: c.price_change_percentage_24h_in_currency != null
        ? Number(c.price_change_percentage_24h_in_currency.toFixed(2)) : null,
      changePct7d: c.price_change_percentage_7d_in_currency != null
        ? Number(c.price_change_percentage_7d_in_currency.toFixed(2)) : null,
      marketCap: c.market_cap,
      image: c.image || null,
    }));
  } catch (error) {
    return [];
  }
}

async function main() {
  const [indices, commodities, currencies, stocks, cryptoGlobal, fearGreed, topCoins] = await Promise.all([
    Promise.all(INDICES.map((i) => fetchYahooQuote(i.symbol, i.label))),
    Promise.all(COMMODITIES.map((c) => fetchYahooQuote(c.symbol, c.label, { unit: c.unit }))),
    Promise.all(CURRENCIES.map((c) => fetchYahooQuote(c.symbol, c.label))),
    Promise.all(STOCKS.map((s) => fetchYahooQuote(s.symbol, s.label))),
    fetchCryptoGlobal(),
    fetchFearGreed(),
    fetchTopCoins(),
  ]);

  const allQuotes = [...indices, ...commodities, ...currencies, ...stocks];
  const okCount = allQuotes.filter((q) => q.ok).length;

  const report = {
    version: 'GNK_ASG_MARKET_PULSE_V1_20260722',
    generatedAt: new Date().toISOString(),
    sources: ['Yahoo Finance', 'CoinGecko', 'Alternative.me Fear & Greed Index'],
    instrumentsOk: okCount,
    instrumentsTotal: allQuotes.length,
    indices,
    commodities,
    stocks,
    currencies,
    crypto: { global: cryptoGlobal, fearGreed, topCoins },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, instrumentsOk: okCount, instrumentsTotal: allQuotes.length, topCoins: topCoins.length }, null, 2));
}

await main();
