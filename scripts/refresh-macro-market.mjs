import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('apps/portal/data/macro_market.json');

const ASSETS = [
  { key: 'btc', symbol: 'BTC-USD', label: 'Bitcoin', ticker: 'BTC', unit: 'USD / BTC', invert: false, needsRawPoints: true },
  { key: 'gold', symbol: 'GC=F', label: 'Zlato', ticker: 'XAU', unit: 'USD / oz', invert: false, needsRawPoints: false },
  { key: 'oil', symbol: 'BZ=F', label: 'Brent nafta', ticker: 'BRENT', unit: 'USD / barrel', invert: false, needsRawPoints: false },
  { key: 'usd', symbol: 'EURUSD=X', label: 'USD / EUR', ticker: 'USD', unit: 'EUR / USD', invert: true, needsRawPoints: false }
];

async function fetchYahooChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; GNK-ASG-Macro-Refresh/1.0)' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('no chart result');
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const points = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close == null || !Number.isFinite(Number(close))) continue;
      points.push([timestamps[i] * 1000, Number(close)]);
    }
    return points;
  } finally {
    clearTimeout(timer);
  }
}

function invertPoints(points) {
  return points.map(([t, v]) => [t, v ? 1 / v : v]);
}

function normalise(points) {
  if (!points.length || !Number(points[0][1])) return [];
  const first = Number(points[0][1]);
  return points.map(([t, v]) => [t, Math.round((Number(v) / first) * 10000) / 100]);
}

function dailyReturns(points) {
  return points.slice(1).map((row, index) => {
    const prev = Number(points[index][1]);
    return prev ? Number(row[1]) / prev - 1 : null;
  }).filter(v => v != null && Number.isFinite(v));
}

function correlation(a, b) {
  const count = Math.min(a.length, b.length);
  if (count < 3) return null;
  const left = a.slice(-count), right = b.slice(-count);
  const avgL = left.reduce((s, v) => s + v, 0) / count;
  const avgR = right.reduce((s, v) => s + v, 0) / count;
  const numerator = left.reduce((s, v, i) => s + (v - avgL) * (right[i] - avgR), 0);
  const varL = left.reduce((s, v) => s + (v - avgL) ** 2, 0);
  const varR = right.reduce((s, v) => s + (v - avgR) ** 2, 0);
  const denominator = Math.sqrt(varL * varR);
  return denominator ? Math.round((numerator / denominator) * 1000) / 1000 : null;
}

async function loadAsset(config) {
  try {
    let points = await fetchYahooChart(config.symbol);
    if (config.invert) points = invertPoints(points);
    if (points.length < 3) throw new Error('insufficient points');
    const values = points.map(p => p[1]);
    const last = values[values.length - 1];
    const first = values[0];
    const last7 = values.length > 8 ? values[values.length - 8] : first;
    const asset = {
      symbol: config.symbol,
      label: config.label,
      ticker: config.ticker,
      unit: config.unit,
      invert: config.invert,
      source: 'Yahoo Finance public chart' + (config.invert ? ', inverted EURUSD' : ''),
      current: last,
      change_7d_percent: Math.round(((last / last7) - 1) * 10000) / 100,
      change_30d_percent: Math.round(((last / first) - 1) * 10000) / 100,
      low_30d: Math.min(...values),
      high_30d: Math.max(...values),
      indexed_points: normalise(points)
    };
    if (config.needsRawPoints) asset.points = points;
    return { ok: true, key: config.key, asset, returns: dailyReturns(points) };
  } catch (error) {
    return { ok: false, key: config.key, error: String(error?.message || error) };
  }
}

async function main() {
  const started = Date.now();
  const results = await Promise.all(ASSETS.map(loadAsset));
  const assets = {};
  const returnsByKey = {};
  for (const result of results) {
    if (result.ok) {
      assets[result.key] = result.asset;
      returnsByKey[result.key] = result.returns;
    }
  }
  const successfulKeys = Object.keys(assets);
  const correlations = {};
  if (returnsByKey.btc) {
    for (const key of ['gold', 'oil', 'usd']) {
      correlations[`btc_${key}`] = returnsByKey[key] ? correlation(returnsByKey.btc, returnsByKey[key]) : null;
    }
  }
  const failed = results.filter(r => !r.ok);
  const dataset = {
    updated_at: new Date().toISOString(),
    title: 'BTC, zlato, Brent nafta i USD/EUR - statistička usporedba',
    period: 'posljednjih 30 dostupnih dnevnih tržišnih vrijednosti',
    disclaimer: 'Indikativni javni tržišni podatci; prikaz nije usluga trgovanja niti investicijski savjet.',
    source: 'Public market data sources; unified portal refresh',
    assets,
    correlations,
    status: successfulKeys.length === ASSETS.length ? 'ok' : (successfulKeys.length ? 'partial' : 'failed'),
    successful_assets: successfulKeys.length,
    configured_assets: ASSETS.length,
    skipped_assets_private: [],
    failed_assets: failed.map(f => ({ key: f.key, error: f.error })),
    runtime_seconds: Math.round(((Date.now() - started) / 1000) * 100) / 100
  };
  // Never overwrite good data with an empty/failed refresh; keep the previous file if nothing came back.
  if (successfulKeys.length === 0 && fs.existsSync(OUT)) {
    console.log(JSON.stringify({ ok: false, message: 'All asset fetches failed; previous macro_market.json left unchanged.', failed: dataset.failed_assets }, null, 2));
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(OUT, JSON.stringify(dataset, null, 2));
  console.log(JSON.stringify({ ok: true, status: dataset.status, successful_assets: dataset.successful_assets, failed_assets: dataset.failed_assets }, null, 2));
}

await main();
