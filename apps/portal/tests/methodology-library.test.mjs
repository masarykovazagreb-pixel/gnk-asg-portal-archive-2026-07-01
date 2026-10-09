// GNK ASG — Javna knjižnica metodologija: testovi i integritetni guard.
// Pokretanje: node --test apps/portal/tests/methodology-library.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const mt = require('../metodologije/methodology.js');
const catalog = JSON.parse(await readFile(new URL('../data/methodology_catalog.json', import.meta.url), 'utf8'));
const pageHtml = await readFile(new URL('../metodologije/index.html', import.meta.url), 'utf8');
const uiJs = await readFile(new URL('../metodologije/methodology-ui.js', import.meta.url), 'utf8');
const methodJs = await readFile(new URL('../metodologije/methodology.js', import.meta.url), 'utf8');

const REQUIRED = ['id', 'name', 'area', 'purpose', 'formula', 'inputs', 'output', 'limitation', 'owner', 'version', 'reviewDue', 'permalink', 'example'];

test('Catalog: at least 15 methods, unique ids, all required fields present', () => {
  assert.ok(catalog.methods.length >= 15, `found ${catalog.methods.length}`);
  assert.equal(catalog.methodCount, catalog.methods.length);
  const ids = catalog.methods.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, 'ids must be unique');
  for (const m of catalog.methods) {
    for (const key of REQUIRED) {
      assert.ok(m[key] !== undefined && m[key] !== null && m[key] !== '', `${m.id}: missing ${key}`);
    }
    assert.ok(m.inputs.length > 0, `${m.id}: inputs required`);
    for (const inp of m.inputs) assert.ok(inp.unit && inp.description, `${m.id}: input ${inp.name} needs unit and description`);
    assert.ok(m.limitation.length >= 20, `${m.id}: limitation must be a real description`);
    assert.equal(m.permalink, `/metodologije/#${m.id}`);
  }
});

test('Catalog: every method has a calculator and its documented example reproduces', () => {
  const computable = new Set(mt.methodIds());
  for (const m of catalog.methods) {
    assert.ok(computable.has(m.id), `${m.id}: no calculator implementation`);
    const r = mt.calculate(m.id, m.example.inputs);
    assert.equal(r.ok, true, `${m.id}: example failed with ${r.error}`);
    const tolerance = Math.abs(m.example.result) < 1 ? 0.001 : 0.0001;
    assert.ok(Math.abs(r.value - m.example.result) <= Math.max(tolerance, Math.abs(m.example.result) * 1e-6),
      `${m.id}: expected ${m.example.result}, got ${r.value}`);
  }
});

test('Calculators: known textbook values', () => {
  // WCAG: crni tekst na bijeloj pozadini je 21:1, a #767676 na bijelom ~4,54:1.
  assert.ok(Math.abs(mt.calculate('wcag-contrast', { boja_teksta_hex: '#767676', boja_pozadine_hex: '#ffffff' }).value - 4.54) < 0.01);
  // Uzorak: z=1,96, p=0,5, e=0,05 daje 385.
  assert.equal(mt.calculate('sample-size', { z: 1.96, p: 0.5, e: 0.05 }).value, 385);
  // Decimalni zarez u unosu.
  assert.equal(mt.calculate('revenue-growth', { prihod_novi: '1.200', prihod_stari: '1000' }).ok, true);
});

test('Calculators: invalid input is rejected with a short error code, not echoed', () => {
  assert.equal(mt.calculate('roi', { prihod_od_ulaganja: '10', iznos_ulaganja: '0' }).error, 'division_by_zero');
  assert.equal(mt.calculate('risk-matrix-score', { vjerojatnost: 7, utjecaj: 2 }).error, 'scale_out_of_range');
  assert.equal(mt.calculate('break-even', { fiksni_troskovi: 1, cijena_po_jedinici: 5, varijabilni_trosak_po_jedinici: 9 }).error, 'negative_contribution');
  const bad = mt.calculate('availability', { ukupno_minuta: 100, prekid_minuta: 'TAJNO-123' });
  assert.equal(bad.ok, false);
  assert.ok(!JSON.stringify(bad).includes('TAJNO'));
  assert.equal(mt.calculate('nepostoji', {}).error, 'unknown_method');
});

test('Recovery gap is zero when the target is met, not negative', () => {
  assert.equal(mt.calculate('recovery-gap', { rto_minute: 60, stvarno_vrijeme_oporavka_minute: 30 }).value, 0);
});

// Integritetni guard ----------------------------------------------------
test('methodology-library-integrity-guard-v1: page policy, keyboard access, no network writes or storage', () => {
  const cspMeta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(pageHtml);
  assert.ok(cspMeta, 'CSP meta tag required');
  assert.match(cspMeta[1], /form-action 'none'/);
  assert.doesNotMatch(cspMeta[1], /unsafe-eval|unsafe-inline/);
  assert.match(cspMeta[1], /connect-src 'self'/, 'catalog is loaded from same origin only');
  const executableInline = [...pageHtml.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/gi)]
    .filter((m) => !/type="application\/ld\+json"/i.test(m[1]));
  assert.equal(executableInline.length, 0);
  assert.match(pageHtml, /class="dt-skip"/);
  assert.match(pageHtml, /<link rel="canonical" href="https:\/\/gnk-asg\.hr\/metodologije\/">/);
  assert.match(pageHtml, /<label for="search">/, 'search input must have a label');
  assert.match(pageHtml, /<label for="area">/, 'area filter must have a label');

  for (const [name, src] of [['methodology-ui.js', uiJs], ['methodology.js', methodJs]]) {
    assert.doesNotMatch(src, /XMLHttpRequest|navigator\.sendBeacon|WebSocket|new Worker/, `${name}: outbound channel`);
    assert.doesNotMatch(src, /localStorage|sessionStorage|document\.cookie/, `${name}: storage use`);
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML/, `${name}: HTML injection sink`);
  }
  // Jedini mrežni poziv u sučelju je dohvat kataloga s iste domene.
  const fetches = [...uiJs.matchAll(/fetch\(\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(fetches, ['../data/methodology_catalog.json']);
});
