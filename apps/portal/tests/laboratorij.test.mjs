// GNK ASG — Laboratorij: testovi 20 alata, validacije unosa i integriteta stranice.
// Pokretanje: node --test apps/portal/tests/laboratorij.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const L = require('../laboratorij/laboratorij.js');
const pageHtml = await readFile(new URL('../laboratorij/index.html', import.meta.url), 'utf8');
const libJs = await readFile(new URL('../laboratorij/laboratorij.js', import.meta.url), 'utf8');
const uiJs = await readFile(new URL('../laboratorij/laboratorij-ui.js', import.meta.url), 'utf8');

test('catalog: 20 tools, unique ids, each with group, fields, description and example', () => {
  assert.equal(L.TOOLS.length, 20);
  const ids = L.TOOLS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'ids must be unique');
  for (const t of L.TOOLS) {
    assert.ok(t.name && t.group && t.description.length > 20, `${t.id}: name, group and description required`);
    assert.ok(t.fields.length >= 1, `${t.id}: at least one field`);
    assert.ok(t.example && t.example.values, `${t.id}: example required`);
    for (const f of t.fields) assert.ok(f.name && f.label, `${t.id}: field needs name and label`);
  }
});

test('examples: every tool reproduces its documented result', () => {
  for (const t of L.TOOLS) {
    const r = L.run(t.id, t.example.values);
    assert.equal(r.ok, true, `${t.id}: failed with ${r.error}`);
    const exp = t.example.expect;
    if (typeof exp === 'number') assert.ok(Math.abs(r.value - exp) < 0.0001, `${t.id}: ${r.value} != ${exp}`);
    else if (typeof exp === 'string') assert.equal(r.value, exp, t.id);
    else for (const k of Object.keys(exp)) assert.equal(r.value[k], exp[k], `${t.id}.${k}`);
  }
});

test('numbers: Croatian decimal comma accepted, spaces tolerated, garbage rejected', () => {
  assert.equal(L.run('pdv-dodaj', { neto: '100,5', stopa: '25' }).value, 125.63);
  assert.equal(L.run('pdv-dodaj', { neto: ' 1 000 ', stopa: '25' }).value, 1250);
  const bad = L.run('pdv-dodaj', { neto: '12abc', stopa: '25' });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /mora biti broj/);
});

test('validation: impossible inputs return a reason, never a number', () => {
  assert.equal(L.run('pdv-dodaj', { neto: '100', stopa: '-5' }).ok, false);
  assert.equal(L.run('promjena-postotka', { pocetna: '0', nova: '5' }).ok, false);
  assert.equal(L.run('anuitet', { iznos: '-100', kamata: '5', mjeseci: '12' }).ok, false);
  assert.equal(L.run('anuitet', { iznos: '100', kamata: '5', mjeseci: '0' }).ok, false);
  assert.equal(L.run('dani-izmedu', { od: '2026-02-30', do: '2026-03-01' }).ok, false, 'non-existent date');
  assert.equal(L.run('dani-izmedu', { od: '9.10.2026', do: '2026-10-10' }).ok, false, 'wrong format');
  assert.equal(L.run('radni-dani', { od: '2026-10-09', do: '2026-10-01' }).ok, false, 'reversed range');
  assert.equal(L.run('prosjek', { brojevi: '   ' }).ok, false);
  assert.equal(L.run('standardna-devijacija', { brojevi: '5' }).ok, false, 'needs two values');
  assert.equal(L.run('udio-postotak', { dio: '1', ukupno: '0' }).ok, false);
  assert.equal(L.run('rimski-brojevi', { broj: '0' }).ok, false);
  assert.equal(L.run('rimski-brojevi', { broj: '4000' }).ok, false);
  assert.equal(L.run('hex-rgb', { hex: '#12345' }).ok, false);
  assert.equal(L.run('url-slug', { naslov: '!!!' }).ok, false);
  assert.equal(L.run('base64-utf8', { nacin: 'decode', tekst: '%%%' }).ok, false);
  assert.equal(L.run('nepostojeci', {}).ok, false);
});

test('working days: weekends and fixed Croatian holidays excluded; Easter not modelled', () => {
  // 24. 12. 2026. četvrtak (radni); 25. 12. petak (blagdan, isključen); 26. 12. subota (vikend);
  // 27. nedjelja (vikend); 28. ponedjeljak (radni). Očekivano: 2 radna dana, 1 isključen blagdan.
  const r = L.run('radni-dani', { od: '2026-12-24', do: '2026-12-28' });
  assert.equal(r.value, 2, r.text);
  assert.match(r.text, /isključeno blagdana: 1/);
});

test('url-slug: Croatian letters folded, punctuation collapsed', () => {
  assert.equal(L.run('url-slug', { naslov: 'Čćšžđ — Ljubljana & Đakovo' }).value, 'ccszd-ljubljana-dakovo');
});

test('meta length: counts characters, flags hashtags in title or description', () => {
  const ok = L.run('duljina-meta', { naslov: 'Naslov od deset riječi', opis: 'a'.repeat(140) }).value;
  assert.equal(ok.titleOk, true);
  assert.equal(ok.descriptionOk, true);
  const long = L.run('duljina-meta', { naslov: 'x'.repeat(61), opis: 'kratko' }).value;
  assert.equal(long.titleOk, false);
  assert.equal(long.descriptionOk, false);
  const tag = L.run('duljina-meta', { naslov: 'Vijest #Analiza', opis: 'a'.repeat(140) }).value;
  assert.equal(tag.hashtagInMeta, true);
});

test('hashtag counter: 5–10 rule, duplicates removed, name repetition flagged', () => {
  const ok = L.run('brojac-hashtagova', { tekst: '#A1 #Ba #Cde #Dfg #Ehi' }).value;
  assert.equal(ok.inRange, true);
  const few = L.run('brojac-hashtagova', { tekst: '#Analiza #analiza #Podaci' }).value;
  assert.equal(few.count, 2);
  assert.equal(few.duplicatesRemoved, 1);
  assert.equal(few.inRange, false);
  const name = L.run('brojac-hashtagova', { tekst: '#NerminSefic #Podaci #Analiza #Financije #Tehnologija' });
  assert.equal(name.value.nameRepeats, 1);
  assert.match(name.text, /ime osobe ponovljeno/);
});

test('base64: UTF-8 round trip with Croatian letters', () => {
  const enc = L.run('base64-utf8', { nacin: 'encode', tekst: 'Čćšžđ' });
  const dec = L.run('base64-utf8', { nacin: 'decode', tekst: enc.value });
  assert.equal(dec.value, 'Čćšžđ');
});

test('calendar: day counts across a leap day and a month boundary', () => {
  assert.equal(L.run('dani-izmedu', { od: '2028-02-28', do: '2028-03-01' }).value, 2);
  assert.equal(L.run('dani-izmedu', { od: '2026-10-31', do: '2026-11-01' }).value, 1);
});

test('statistics: median of even count, sample standard deviation', () => {
  assert.equal(L.run('medijan', { brojevi: '1 2 3 4' }).value, 2.5);
  assert.equal(L.run('prosjek', { brojevi: '1;2;3;4' }).value, 2.5);
});

test('source: no code execution, no network, no storage in the library or UI', () => {
  for (const [name, src] of [['lib', libJs], ['ui', uiJs]]) {
    assert.ok(!/\beval\s*\(|new Function\s*\(/.test(src), `${name}: code execution`);
    assert.ok(!/\.innerHTML\s*=|insertAdjacentHTML|document\.write/.test(src), `${name}: HTML sink`);
    assert.ok(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|sendBeacon|fetch\(/.test(src), `${name}: network or storage`);
  }
});

test('page: strict CSP, required containers, no inline executable script', () => {
  assert.match(pageHtml, /script-src 'self'/);
  assert.ok(!/script-src[^"]*unsafe-/.test(pageHtml));
  assert.ok(pageHtml.includes('id="alati"') && pageHtml.includes('id="count"'));
  const inline = pageHtml.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(inline), 'no inline executable script');
  for (const f of ['laboratorij.js', 'laboratorij-ui.js']) assert.ok(pageHtml.includes(f));
});
