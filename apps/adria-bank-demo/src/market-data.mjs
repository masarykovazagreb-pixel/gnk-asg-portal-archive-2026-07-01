export const TWELVE_DATA_REFERENCE_URL = 'https://api.twelvedata.com/exchange_rate';
export const TWELVE_DATA_DOCS_URL = 'https://twelvedata.com/docs';

/**
 * Reduce an upstream Twelve Data response to the one fixed pair and safe fields
 * used by the optional, read-only market-data panel. This value is never used
 * by simulated trades, account conversion or the bundled daily reference board.
 */
export function parseTwelveDataExchangeRate(payload, { now = new Date() } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Market-data response was invalid.');
  if (payload.status === 'error' || payload.code) throw new Error('Market-data provider returned an error.');
  const symbol = String(payload.symbol || 'EUR/USD').replace(/\s/g, '').toUpperCase();
  if (symbol !== 'EUR/USD') throw new Error('Market-data response did not match the requested pair.');
  const rate = Number(payload.rate);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1_000_000) throw new Error('Market-data rate was outside the allowed range.');

  const rawTimestamp = payload.timestamp ?? payload.datetime ?? payload.date;
  let timestamp;
  if (typeof rawTimestamp === 'number' || /^\d{9,13}$/.test(String(rawTimestamp ?? ''))) {
    const numeric = Number(rawTimestamp);
    timestamp = new Date(numeric >= 1_000_000_000_000 ? numeric : numeric * 1000);
  } else if (rawTimestamp) {
    timestamp = new Date(rawTimestamp);
  } else {
    throw new Error('Market-data timestamp was missing.');
  }
  if (Number.isNaN(timestamp.valueOf())) throw new Error('Market-data timestamp was invalid.');

  return Object.freeze({
    provider: 'Twelve Data', symbol: 'EUR/USD', rate,
    timestamp: timestamp.toISOString(), receivedAt: new Date(now).toISOString(),
    indicativeOnly: true
  });
}
