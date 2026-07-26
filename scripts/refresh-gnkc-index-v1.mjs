#!/usr/bin/env node
/**
 * GNKC internal stable-index refresh.
 *
 * IMPORTANT (per project spec): GNKC is an INTERNAL ACCOUNTING
 * STABLE-INDEX, not a real cryptocurrency. This script and its output
 * must never claim or imply: a blockchain token, real market
 * capitalization, transferability, a wallet, public purchase/sale,
 * exchange listing, reserves, mint/burn, legal e-money status, or
 * regulatory approval. Output is explicitly labeled
 * "internal-stable-index" and "GNKC interni obračunski stable-index".
 *
 * GNKC/USD is a weighted basket of three well-known, publicly quoted
 * USD stablecoins (USDC, USDT, DAI), fetched from CoinGecko. This
 * mirrors exactly how scripts/refresh-market-pulse.mjs already
 * fetches crypto data from the same API, so it uses the same fetch
 * pattern, timeout, and error handling.
 *
 * Output: apps/portal/data/gnkc-index.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'apps/portal/data/gnkc-index.json');
const MARKET_PULSE_PATH = path.join(REPO_ROOT, 'apps/portal/data/market-pulse.json');

const UA = { 'User-Agent': 'gnk-asg-portal/gnkc-index-refresh (+https://gnk-asg.hr)' };
const STALE_AFTER_MS = 6 * 60 * 60 * 1000; // 6h — data older than this is rejected as stale
const MAX_REASONABLE_DEVIATION_PCT = 5; // reject a component price implying >5% deviation from $1 as a bad read

// Basket weights must sum to 1.0 before any normalization for missing sources.
const COMPONENTS = [
  { symbol: 'USDC', id: 'usd-coin', weight: 0.40 },
  { symbol: 'USDT', id: 'tether', weight: 0.35 },
  { symbol: 'DAI', id: 'dai', weight: 0.25 },
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

async function fetchComponentPrices() {
  const ids = COMPONENTS.map((c) => c.id).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_last_updated_at=true`;
  const data = await fetchJson(url);
  const now = Date.now();
  return COMPONENTS.map((c) => {
    const entry = data?.[c.id];
    const priceUsd = entry?.usd;
    const lastUpdatedAt = entry?.last_updated_at ? entry.last_updated_at * 1000 : null;
    let rejectReason = null;
    if (typeof priceUsd !== 'number' || !(priceUsd > 0)) rejectReason = 'missing-or-invalid-price';
    else if (Math.abs(priceUsd - 1) / 1 * 100 > MAX_REASONABLE_DEVIATION_PCT) rejectReason = 'implausible-deviation';
    else if (lastUpdatedAt && now - lastUpdatedAt > STALE_AFTER_MS) rejectReason = 'stale';
    return {
      symbol: c.symbol,
      weight: c.weight,
      priceUsd: rejectReason ? null : Number(priceUsd.toFixed(6)),
      source: 'coingecko',
      lastUpdatedAt: lastUpdatedAt ? new Date(lastUpdatedAt).toISOString() : null,
      ok: !rejectReason,
      rejectReason,
    };
  });
}

function getUsdEurRate() {
  try {
    const marketPulse = JSON.parse(fs.readFileSync(MARKET_PULSE_PATH, 'utf8'));
    const eurusd = (marketPulse.currencies || []).find((c) => c.symbol === 'EURUSD=X' && c.ok);
    if (eurusd && eurusd.price > 0) return { rate: 1 / eurusd.price, source: 'market-pulse.json EURUSD=X' };
  } catch { /* fall through to fallback below */ }
  return { rate: null, source: null };
}

function computeIndex(components, usdEur) {
  const usable = components.filter((c) => c.ok);
  if (!usable.length) {
    return { ok: false, error: 'no-usable-components' };
  }
  // Re-normalize weights across only the usable components so a missing
  // source doesn't silently skew the index toward zero.
  const totalWeight = usable.reduce((sum, c) => sum + c.weight, 0);
  const valueUsd = usable.reduce((sum, c) => sum + (c.priceUsd * c.weight / totalWeight), 0);
  const deviationPct = Number(((valueUsd - 1) * 100).toFixed(4));
  const valueEur = usdEur.rate ? Number((valueUsd * usdEur.rate).toFixed(6)) : null;
  return {
    ok: true,
    valueUsd: Number(valueUsd.toFixed(6)),
    valueEur,
    deviationPct,
    normalizedFromSources: usable.length,
    droppedSources: components.length - usable.length,
  };
}

function loadPreviousIndex() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const disclaimer = 'GNKC je interni obračunski stable-index GNK ASG/GNK DINAMO Ltd. grupe, izveden iz javno kotiranih stablecoina (USDC, USDT, DAI). Nije blockchain token, nema wallet, ne postoji mint/burn, nije javno utrživ niti burzovno uvršten, nema regulatorno odobrenje kao elektronički novac. Isključivo je interni obračunski i prezentacijski model.';

  let components;
  try {
    components = await fetchComponentPrices();
  } catch (error) {
    console.error('GNKC: failed to fetch component prices:', error.message);
    components = COMPONENTS.map((c) => ({
      symbol: c.symbol, weight: c.weight, priceUsd: null, source: 'coingecko',
      lastUpdatedAt: null, ok: false, rejectReason: 'fetch-failed',
    }));
  }

  const usdEur = getUsdEurRate();
  const index = computeIndex(components, usdEur);
  const previous = loadPreviousIndex();

  let output;
  if (!index.ok) {
    // Fail-closed: never publish a fabricated index value. If we have a
    // previous good reading, keep serving it but mark status degraded
    // and note staleness; otherwise emit an explicit unavailable state.
    console.error('GNKC: index computation failed:', index.error);
    output = previous
      ? { ...previous, status: 'degraded', staleSince: previous.updatedAt, note: 'Zadnji poznati izračun; svježe osvježavanje trenutno nije uspjelo.' }
      : {
          schemaVersion: 'gnkc-index-v1',
          symbol: 'GNKC',
          type: 'internal-stable-index',
          status: 'unavailable',
          disclaimer,
          components,
          updatedAt: new Date().toISOString(),
        };
  } else {
    const alertThresholdPct = 1.0;
    output = {
      schemaVersion: 'gnkc-index-v1',
      symbol: 'GNKC',
      type: 'internal-stable-index',
      baseCurrency: 'USD',
      valueUsd: index.valueUsd,
      valueEur: index.valueEur,
      deviationPct: index.deviationPct,
      change24hPct: previous?.valueUsd ? Number((((index.valueUsd - previous.valueUsd) / previous.valueUsd) * 100).toFixed(4)) : null,
      status: Math.abs(index.deviationPct) > alertThresholdPct ? 'watch' : 'healthy',
      alertThresholdPct,
      normalizedFromSources: index.normalizedFromSources,
      droppedSources: index.droppedSources,
      components,
      usdEurRate: usdEur.rate,
      usdEurSource: usdEur.source,
      disclaimer,
      updatedAt: new Date().toISOString(),
    };
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log('GNKC index refreshed:', {
    status: output.status,
    valueUsd: output.valueUsd,
    deviationPct: output.deviationPct,
    usableSources: index.ok ? index.normalizedFromSources : 0,
  });
}

main().catch((error) => {
  console.error('GNKC refresh failed:', error);
  process.exitCode = 1;
});
