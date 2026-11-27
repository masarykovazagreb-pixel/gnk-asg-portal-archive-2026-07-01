import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { parsePriceMinor, validateProductUrl, validateQuote } from '../workers/gnk-asg-price-alerts/src/index.mjs';

const hosts = ['trgovina.hr'];
const url = 'https://trgovina.hr/artikl/telefon-256';
const now = Date.parse('2026-11-24T09:00:00Z');
const quote = { productId: 'sku-100', model: 'Telefon X', variant: '256 GB crna',
  condition: 'new', market: 'HR', currency: 'EUR', priceMinor: 21999,
  seller: 'Trgovina', offerUrl: url, matchedUrl: url, observedAt: '2026-11-24T08:50:00Z' };
const watch = { url, productId: null, model: null, savedVariant: null, requestedVariant: '256 GB' };

test('ciljana cijena se računa u centima bez usporedbe float vrijednosti', () => {
  assert.equal(parsePriceMinor('199,99'), 19999);
  assert.equal(parsePriceMinor('200'), 20000);
  assert.equal(parsePriceMinor(''), null);
  assert.equal(parsePriceMinor('0'), null);
  assert.throws(() => parsePriceMinor('1.234,56'));
  assert.throws(() => parsePriceMinor('abc'));
});

test('dopušta samo HTTPS proizvod na točno dopuštenoj domeni', () => {
  assert.equal(validateProductUrl(url + '#reviews', hosts), url);
  assert.throws(() => validateProductUrl('http://trgovina.hr/artikl/x', hosts));
  assert.throws(() => validateProductUrl('https://trgovina.hr.evil.test/artikl/x', hosts));
  assert.throws(() => validateProductUrl('https://127.0.0.1/admin', hosts));
  assert.throws(() => validateProductUrl('https://trgovina.hr/', hosts));
  assert.throws(() => validateProductUrl('https://user:password@trgovina.hr/artikl/x', hosts));
});

test('ponuda se verificira po tržištu, valuti, stanju, identitetu i vremenu', () => {
  assert.equal(validateQuote(quote, watch, hosts, now).priceMinor, 21999);
  assert.equal(validateQuote({ ...quote, currency: 'USD' }, watch, hosts, now), null);
  assert.equal(validateQuote({ ...quote, market: 'SI' }, watch, hosts, now), null);
  assert.equal(validateQuote({ ...quote, condition: 'used' }, watch, hosts, now), null);
  assert.equal(validateQuote({ ...quote, matchedUrl: 'https://trgovina.hr/artikl/drugi-proizvod' }, watch, hosts, now), null);
  assert.equal(validateQuote({ ...quote, offerUrl: 'https://evil.test/x' }, watch, hosts, now), null);
  assert.equal(validateQuote({ ...quote, observedAt: '2026-11-20T08:50:00Z' }, watch, hosts, now), null);
  assert.equal(validateQuote({ ...quote, productId: 'sku-other' }, { ...watch, productId: 'sku-100' }, hosts, now), null);
  assert.equal(validateQuote({ ...quote, variant: '128 GB' }, watch, hosts, now), null);
  assert.equal(validateQuote({ ...quote, priceMinor: 12.75 }, watch, hosts, now), null);
});

test('bez licenciranih izvora javna registracija je onemogućena', async () => {
  const status = await worker.fetch(new Request('https://gnk-asg.hr/api/price-alerts/status'), {});
  assert.equal(status.status, 200);
  const data = await status.json();
  assert.equal(data.enabled, false);
  assert.deepEqual(data.supportedRetailers, []);
  const submit = await worker.fetch(new Request('https://gnk-asg.hr/api/price-alerts/subscribe', {
    method: 'POST', headers: { origin: 'https://gnk-asg.hr', 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.invalid', url })
  }), {});
  assert.equal(submit.status, 503);
  await worker.scheduled({}, {});
});
