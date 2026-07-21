import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveParticipants, simulateMarketDay, validateMarketSnapshot } from '../src/simulated-market.mjs';

const config = JSON.parse(await readFile(new URL('../config/public-market-simulation.json', import.meta.url), 'utf8'));
const participants = resolveParticipants(config);
assert.equal(participants.length, config.participants.fallbackProfiles.length);

const first = simulateMarketDay({ config, date: '2026-07-22' });
const repeated = simulateMarketDay({ config, date: '2026-07-22' });
assert.deepEqual(first, repeated, 'Same date and config must produce the same simulated market snapshot.');
assert.equal(first.mode, 'OFFLINE_SIMULATION');
assert.equal(first.currency.realMoneyValue, 0);
assert.equal(first.currency.redeemable, false);
assert.equal(first.controls.realTradingEnabled, false);
assert.equal(first.controls.productionWritesEnabled, false);
assert.ok(first.public.banner.includes('SIMULACIJA'));
assert.ok(first.participants.every((item) => item.cash >= 0 && item.units >= 0));
assert.ok(first.participants.every((item) => item.lastTrade === null || item.lastTrade.simulated === true));
assert.deepEqual(first.participants.map((item) => item.rank), [1, 2, 3, 4]);

const second = simulateMarketDay({ config, date: '2026-07-23', previousSnapshot: first, signals: [{ impact: 0.4 }] });
assert.notDeepEqual(second.market, first.market);
assert.equal(second.participants.length, first.participants.length);
assert.ok(second.participants.every((item) => item.incentivePoints >= 0));

const validation = validateMarketSnapshot(second);
assert.equal(validation.ok, true, validation.errors.join('\n'));

const unsafe = structuredClone(config);
unsafe.adminControls.realTradingEnabled = true;
assert.throws(() => simulateMarketDay({ config: unsafe, date: '2026-07-22' }), /Real trading/);
