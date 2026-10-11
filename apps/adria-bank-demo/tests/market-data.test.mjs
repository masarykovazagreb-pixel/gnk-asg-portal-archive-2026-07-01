import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTwelveDataExchangeRate } from '../src/market-data.mjs';

test('optional Twelve Data parser accepts only a positive fixed-pair indication and sanitizes the response', () => {
  const reference = parseTwelveDataExchangeRate({
    symbol: 'EUR/USD', rate: '1.07456', timestamp: 1791705600, apikey: 'must-not-survive'
  }, { now: new Date('2026-10-11T10:15:00.000Z') });
  assert.deepEqual(reference, {
    provider: 'Twelve Data', symbol: 'EUR/USD', rate: 1.07456,
    timestamp: new Date(1791705600 * 1000).toISOString(),
    receivedAt: '2026-10-11T10:15:00.000Z', indicativeOnly: true
  });
  assert.ok(!JSON.stringify(reference).includes('must-not-survive'));
  assert.throws(() => parseTwelveDataExchangeRate({ symbol: 'GBP/USD', rate: '1.2', timestamp: 1791705600 }), /requested pair/);
  assert.throws(() => parseTwelveDataExchangeRate({ symbol: 'EUR/USD', rate: '-1', timestamp: 1791705600 }), /allowed range/);
  assert.throws(() => parseTwelveDataExchangeRate({ status: 'error', message: 'secret-bearing provider error' }), /provider returned an error/);
  assert.throws(() => parseTwelveDataExchangeRate({ symbol: 'EUR/USD', rate: '1.2' }), /timestamp was missing/);
});
