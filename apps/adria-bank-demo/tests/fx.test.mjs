import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ECB_FALLBACK_DATE, ECB_FALLBACK_RATES_PER_EUR, CBK_FALLBACK_DATE,
  parseEcbDailyReference, parseCbkDailyReference
} from '../src/fx.mjs';

const ecbXml = `<?xml version="1.0"?><gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref"><Cube><Cube time="2026-10-09"><Cube currency="USD" rate="1.1206"/><Cube currency="JPY" rate="177.34"/><Cube currency="GBP" rate="0.84763"/><Cube currency="CHF" rate="0.9313"/><Cube currency="KES" rate="145.92"/><Cube currency="AED" rate="4.116"/><Cube currency="CAD" rate="1.5942"/><Cube currency="AUD" rate="1.6052"/><Cube currency="SGD" rate="1.4348"/></Cube></Cube></gesmes:Envelope>`;
const cbkHtml = `<html><body><h2>Daily KES Exchange Rates</h2><p>Posted on: 09/10/2026</p><table><tr><td>EURO</td><td>155.20</td></tr></table></body></html>`;

test('ECB parser extracts a dated XML reference table with numeric rates', () => {
  const reference = parseEcbDailyReference(ecbXml);
  assert.equal(reference.date, '2026-10-09');
  assert.equal(reference.rates.EUR, 1);
  assert.equal(reference.rates.USD, 1.1206);
  assert.equal(reference.rates.SGD, 1.4348);
  assert.match(reference.source, /ecb\.europa\.eu/);
});

test('CBK parser extracts only its dated indicative EUR/KES reference', () => {
  const reference = parseCbkDailyReference(cbkHtml);
  assert.equal(reference.date, '2026-10-09');
  assert.equal(reference.kesPerEur, 155.2);
  assert.match(reference.source, /centralbank\.go\.ke/);
});

test('parsers reject malformed and oversized upstream payloads instead of fabricating rates', () => {
  assert.throws(() => parseEcbDailyReference('not an ECB response'), /missing or outside/);
  assert.throws(() => parseEcbDailyReference('<Cube time="2026-10-09"><Cube currency="USD" rate="1.1"/></Cube>'), /valid daily/);
  assert.throws(() => parseCbkDailyReference('<html>no dated rates</html>'), /missing or outside/);
  assert.throws(() => parseCbkDailyReference(`<html>${'x'.repeat(5_000_001)}</html>`), /missing or outside/);
});

test('bundled fallback dates and values remain explicitly data samples', () => {
  assert.match(ECB_FALLBACK_DATE, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(CBK_FALLBACK_DATE, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(ECB_FALLBACK_RATES_PER_EUR.USD > 0);
  assert.ok(ECB_FALLBACK_RATES_PER_EUR.JPY > 0);
});
