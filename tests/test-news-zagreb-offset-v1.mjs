import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the production formatter without running the network-writing main().
const source = readFileSync(new URL('../scripts/gnk-news-refresh.mjs', import.meta.url), 'utf8');
const formatter = source.match(/function nowIsoZagreb\([^]*?\n}\n/);
assert.ok(formatter, 'production timestamp formatter exists');
const format = vm.runInNewContext(`const TZ = 'Europe/Zagreb'; ${formatter[0]}; nowIsoZagreb`, { Intl, Date });
for (const [utc, expected] of [
  ['2026-01-15T12:30:00Z', '2026-01-15T13:30:00+01:00'],
  ['2026-07-15T12:30:00Z', '2026-07-15T14:30:00+02:00'],
  ['2026-03-29T00:59:59Z', '2026-03-29T01:59:59+01:00'],
  ['2026-03-29T01:00:00Z', '2026-03-29T03:00:00+02:00'],
  ['2026-10-25T00:59:59Z', '2026-10-25T02:59:59+02:00'],
  ['2026-10-25T01:00:00Z', '2026-10-25T02:00:00+01:00'],
]) {
  const actual = format(new Date(utc));
  assert.equal(actual, expected);
  assert.equal(Date.parse(actual), Date.parse(utc), 'SLA age must use the original instant');
}
console.log('Zagreb timestamp: winter/summer and both DST boundaries preserve the instant.');
