// GNK ASG Data Clinic — testovi i integritetni guard.
// Pokretanje: node --test apps/portal/tests/data-clinic.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const dc = require('../data-clinic/data-clinic.js');
const base = new URL('../data-clinic/', import.meta.url);
const read = (name) => readFile(new URL(name, base), 'utf8');

// Pomoćna: izračunaj valjani OIB za zadanih 10 znamenki (ISO 7064 MOD 11,10).
function oibFor(ten) {
  let a = 10;
  for (const ch of ten) {
    a = (a + Number(ch)) % 10;
    if (a === 0) a = 10;
    a = (a * 2) % 11;
  }
  let control = 11 - a;
  if (control === 10) control = 0;
  return ten + control;
}

// 0. CSV parser ---------------------------------------------------------
test('CSV: detects semicolon and comma delimiters, handles quotes and CRLF', () => {
  const semi = dc.parseCsv('ime;iznos\r\n"Horvat; Ana";12\r\n');
  assert.equal(semi.delimiter, ';');
  assert.deepEqual(semi.rows, [['Horvat; Ana', '12']]);
  const comma = dc.parseCsv('a,b\n1,"x ""y"""\n');
  assert.equal(comma.delimiter, ',');
  assert.deepEqual(comma.rows, [['1', 'x "y"']]);
});

test('CSV: empty and unclosed-quote input return explicit errors', () => {
  assert.equal(dc.parseCsv('   ').error, 'empty');
  assert.equal(dc.parseCsv('a,b\n"x,1\n').error, 'unclosed_quote');
});

// 1. CSV Privacy Inspector ---------------------------------------------
test('Privacy: counts per column and never returns the matched values', () => {
  const oib = oibFor('1234567890');
  const csv = [
    'kontakt,racun,kartica,oib,napomena',
    'ana.horvat@example.com,HR1210010051863000160,4111 1111 1111 1111,' + oib + ',ok',
    'ivan@example.org,DE89 3704 0044 0532 0130 00,5500 0000 0000 0004,' + oib + ',ok',
    'nema,nema,nema,nema,+385 91 234 5678'
  ].join('\n');
  const r = dc.inspectCsvPrivacy(csv);
  assert.equal(r.ok, true);
  const col = (name) => r.columns.find((c) => c.name === name);
  assert.equal(col('kontakt').counts.email, 2);
  assert.equal(col('racun').counts.iban >= 1, true, 'checksum-valid IBAN counted');
  assert.equal(col('kartica').counts.card, 2, 'Luhn-valid cards counted');
  assert.equal(col('oib').counts.oib, 2);
  assert.equal(col('napomena').counts.phone, 1);
  const serialized = JSON.stringify(r);
  for (const leaked of ['ana.horvat', 'ivan@example', 'HR1210', '4111 1111', '5500 0000', oib, '+385 91']) {
    assert.ok(!serialized.includes(leaked), `leaked: ${leaked}`);
  }
});

test('Privacy: invalid checksums are not counted as OIB, IBAN or card', () => {
  const wrongOib = oibFor('1234567890').slice(0, 10) + ((Number(oibFor('1234567890')[10]) + 1) % 10);
  const r = dc.inspectCsvPrivacy('x\n' + wrongOib + '\nDE00 0000 0000 0000 0000 00\n4111 1111 1111 1112\n');
  const c = r.columns[0].counts;
  assert.equal(c.oib, 0);
  assert.equal(c.iban, 0);
  assert.equal(c.card, 0);
});

test('Privacy: OIB and Luhn validators behave correctly', () => {
  assert.equal(dc.isValidOib(oibFor('9876543210')), true);
  assert.equal(dc.isValidOib('12345'), false);
  assert.equal(dc.passesLuhn('4111111111111111'), true);
});

// 2. Missing Data Explorer ----------------------------------------------
test('Missing data: counts empty tokens and computes share per column', () => {
  const r = dc.exploreMissingData('a;b;c\n1;;NA\n2;x;\n3;y;z\n4;null;-\n');
  assert.equal(r.rows, 4);
  const [a, b, c] = r.columns;
  assert.deepEqual([a.empty, a.share], [0, 0]);
  assert.deepEqual([b.empty, b.share], [2, 50]);
  assert.deepEqual([c.empty, c.share], [3, 75]);
});

test('Missing data: counts rows with the wrong number of fields', () => {
  const r = dc.exploreMissingData('a,b\n1,2\n3\n');
  assert.equal(r.raggedRows, 1);
});

// 3. Unit Consistency Checker -------------------------------------------
test('Units: detects mixed units in one column and classifies bare numbers', () => {
  const csv = [
    'masa,trajanje,cijena',
    '12 kg,1,100.00 EUR',
    '800 g,1,100 €',
    '3 kg,1,100 EUR',
    '5 kg,1,100 EUR',
    '"1,5 h",1 h,100 EUR',
    '90 min,1 h,100 EUR',
    '25%,2 h,100 EUR'
  ].join('\n');
  const r = dc.checkUnitConsistency(csv);
  const masa = r.columns.find((c) => c.name === 'masa');
  const trajanje = r.columns.find((c) => c.name === 'trajanje');
  const cijena = r.columns.find((c) => c.name === 'cijena');
  assert.equal(masa.mixed, true);
  const masaUnits = masa.units.map((u) => u.unit);
  assert.ok(masaUnits.includes('g') && masaUnits.includes('kg'), 'kg and g mixed');
  assert.ok(masaUnits.includes('%'), 'percent value in mass column is also flagged');
  assert.equal(trajanje.mixed, true);
  assert.equal(cijena.mixed, false, 'EUR and € are the same unit');
  assert.equal(dc.unitOf('42'), '(bez jedinice)');
  assert.equal(dc.unitOf('17 furlongs'), '(nepoznata jedinica)');
});

test('Units: values are not mutated and only counts are reported', () => {
  const csv = 'v\n12 kg\n800 g\n';
  dc.checkUnitConsistency(csv);
  assert.equal(csv, 'v\n12 kg\n800 g\n');
  const serialized = JSON.stringify(dc.checkUnitConsistency(csv));
  assert.ok(!serialized.includes('800 g'));
});

// 4. Date Format Normalizer ---------------------------------------------
test('Dates: ISO, Croatian dotted, unambiguous slash and invalid values', () => {
  assert.deepEqual(dc.normalizeDate('2026-10-09'), { status: 'iso', iso: '2026-10-09' });
  assert.deepEqual(dc.normalizeDate('9.10.2026.'), { status: 'normalized', iso: '2026-10-09' });
  assert.deepEqual(dc.normalizeDate('25/12/2026'), { status: 'normalized', iso: '2026-12-25' });
  assert.deepEqual(dc.normalizeDate('12/25/2026'), { status: 'normalized', iso: '2026-12-25' });
  assert.equal(dc.normalizeDate('03/04/2026').status, 'ambiguous');
  assert.equal(dc.normalizeDate('31.02.2026.').status, 'invalid');
  assert.equal(dc.normalizeDate('nekad').status, 'invalid');
  assert.equal(dc.normalizeDate('').status, 'empty');
});

test('Dates: column-level summary reports the column and counts', () => {
  const r = dc.normalizeDateColumn('datum;iznos\n2026-10-09;1\n9.10.2026.;2\n03/04/2026;3\nxx;4\n', 'datum');
  assert.equal(r.ok, true);
  assert.deepEqual(r.summary, { iso: 1, normalized: 1, ambiguous: 1, invalid: 1, empty: 0 });
  assert.equal(dc.normalizeDateColumn('a\n1\n', 'nepostoji').error, 'column_not_found');
});

// 5. Data Contract Builder ----------------------------------------------
test('Contract: valid definition produces a versioned contract and flags personal data', () => {
  const r = dc.buildDataContract('naziv;string;da;public\niznos;number;da;internal\nemail;string;ne;personal_data');
  assert.equal(r.ok, true);
  assert.equal(r.contract.contractVersion, '1.0');
  assert.equal(r.contract.fields.length, 3);
  assert.equal(r.contract.fields[2].required, false);
  assert.deepEqual(r.contract.personalDataFields, ['email']);
});

test('Contract: invalid names, unknown types and duplicates are rejected', () => {
  const r = dc.buildDataContract('Naziv Polja;string;da;public\nkol;float;da;public\nkol;string;maybe;secret\nx;string;da;public');
  assert.equal(r.ok, false);
  const errs = r.errors.map((e) => e.error);
  assert.ok(errs.includes('invalid_name'));
  assert.ok(errs.includes('unknown_type'));
  assert.ok(errs.includes('invalid_required_flag'));
  assert.ok(errs.includes('unknown_classification'));
  assert.equal(dc.buildDataContract('').ok, false);
});

test('Contract: the accepted type list matches the documented list', () => {
  assert.deepEqual(dc.CONTRACT_TYPES, ['string', 'number', 'integer', 'boolean', 'date']);
});

// 6. Integritetni guard --------------------------------------------------
test('data-clinic-integrity-guard-v1: five tools, strict page policy, no network, storage or HTML sinks', async () => {
  for (const fn of ['inspectCsvPrivacy', 'exploreMissingData', 'checkUnitConsistency', 'normalizeDateColumn', 'buildDataContract']) {
    assert.equal(typeof dc[fn], 'function', `missing tool ${fn}`);
  }
  const html = await read('index.html');
  const cspMeta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html);
  assert.ok(cspMeta, 'CSP meta tag required');
  assert.match(cspMeta[1], /connect-src 'none'/);
  assert.match(cspMeta[1], /form-action 'none'/);
  assert.doesNotMatch(cspMeta[1], /unsafe-eval|unsafe-inline/);
  const executableInline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/gi)]
    .filter((m) => !/type="application\/ld\+json"/i.test(m[1]));
  assert.equal(executableInline.length, 0, 'no executable inline scripts');
  assert.doesNotMatch(html, /<form[\s>]/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/gnk-asg\.hr\/data-clinic\/">/);
  assert.match(html, /class="dt-skip"/);

  for (const file of ['data-clinic.js', 'data-clinic-ui.js']) {
    const src = await read(file);
    assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|navigator\.sendBeacon|WebSocket/, `${file}: network call`);
    assert.doesNotMatch(src, /localStorage|sessionStorage|document\.cookie/, `${file}: storage use`);
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML/, `${file}: HTML injection sink`);
  }
});
