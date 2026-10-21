#!/usr/bin/env node
/*
 * Fotografija mora ostati fotografija.
 *
 * Tri su mjesta na portalu imala isti problem, svaki put u drugom obliku:
 * slika je bila tu, ali je preko nje bio nacrtan film — ili slika na 72 %
 * iznad tamne podloge, ili crni gradijent preko cijele širine. Čitalac je
 * vidio obojenu plohu, a ne grad.
 *
 * Ovaj test čuva popravak: na tim mjestima slika je puna, a zatamnjenje
 * postoji samo tamo gdje je tekst i pada na nulu prije ruba slike.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const read = (p) => readFileSync(p, 'utf8');
const rule = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `rule ${selector} is missing`);
  return match[1];
};

/* ---------- 1. AKTUAL MEDIA i regije: slika nije prozirna ---------- */

const media = read('apps/portal/assets/aktual-media-world-v1.css');
const leadImg = rule(media, '.am-lead img');
assert.match(leadImg, /opacity:1\b/, 'the lead photo must be fully opaque');
assert.doesNotMatch(leadImg, /opacity:\.\d/, 'no transparency over a dark background');

const regions = read('apps/portal/assets/aktual-regions-v1.css');
const regionImg = rule(regions, '.rg-lead-main img');
assert.match(regionImg, /opacity:1\b/);
assert.doesNotMatch(regionImg, /opacity:\.\d/);

/* Zatamnjenje smije pokriti samo donju trećinu, gdje je tekst. */
for (const [name, css, selector] of [
  ['AKTUAL MEDIA', media, '.am-lead::after'],
  ['regije', regions, '.rg-lead-main:after'],
]) {
  const overlay = rule(css, selector);
  assert.match(overlay, /rgba\(5,8,12,0\)|transparent/, `${name}: overlay must start transparent`);
  const stops = [...overlay.matchAll(/rgba\(5,8,12,([\d.]+)\)\s*(\d+)%/g)];
  assert.ok(stops.length >= 2, `${name}: overlay needs explicit stops`);
  assert.ok(Number(stops[0][2]) <= 40, `${name}: the top of the photo stays clear`);
  assert.ok(Number(stops[stops.length - 1][1]) >= 0.75, `${name}: text at the bottom keeps contrast`);
}

/* ---------- 2. Gradski kanali: osam jednakih kopija, film pada na nulu ---------- */

const kanalDir = 'apps/portal/kanal';
const channels = readdirSync(kanalDir).filter((name) => existsSync(path.join(kanalDir, name, 'assets/region.css')));
assert.equal(channels.length, 8, 'expected eight city channels');

let reference = null;
for (const channel of channels) {
  const css = read(path.join(kanalDir, channel, 'assets/region.css'));
  reference ??= css;
  assert.equal(css, reference, `${channel}: region.css drifted from the other channels`);

  const hero = rule(css, '.intro--hero::after');
  assert.match(hero, /rgba\(6,12,20,0\)\s*100%/, 'the veil must fade to nothing at the right edge');
  assert.doesNotMatch(hero, /rgba\(6,12,20,\.9\d\)\s*0%,rgba\([^)]*\)\s*\d+%,rgba\([^)]*,\.\d+\)\s*\d+%,rgba\([^)]*,\.\d+\)\s*100%/,
    'no near-opaque wash that stays dark across the whole hero');

  const img = rule(css, '.heroimg');
  assert.match(img, /object-fit:cover/);
  assert.doesNotMatch(img, /opacity/, 'the hero photo is drawn at full strength');
}

/* ---------- 3. Generator, ne samo kopije ----------

   Gradske kanale svaka dva sata ponovno gradi apps/region/engine/build.mjs i
   zapisuje ih u main. Popravak samo u osam kopija CSS-a bio bi pregazan pri
   prvom ciklusu — zato se provjerava izvor iz kojeg kopije nastaju. */

const generator = read('apps/region/engine/build.mjs');
const generatedHero = generator.match(/\.intro--hero::after\{content:"[^"]*"[^}]*\}/);
assert.ok(generatedHero, 'the channel generator must still define the hero overlay');
assert.match(generatedHero[0], /rgba\(6,12,20,0\)\s*100%/, 'generated hero veil must fade to nothing');
assert.doesNotMatch(generatedHero[0], /rgba\(6,12,20,\.34\)\s*100%/,
  'the near-opaque veil is back in the generator and the next region cycle would restore it');
// Token smije mijenjati ime; važno je da je datumski i da ga generator
// i stranica nose jednako. Zamrznuti sufiks je lomio test pri svakoj
// promjeni CSS-a.
const cssToken = generator.match(/assets\/region\.css\?v=(\d{8}-[a-z0-9-]+)/);
assert.ok(cssToken, 'the generator must cache-bust the CSS it writes into every channel page');
assert.match(cssToken[1], /^\d{8}-/, 'the CSS version must be dated');

/* ---------- 3. Poveznica nosi novu verziju, inače preglednik posluži staru ---------- */

const page = read('apps/portal/kanal/zagreb/index.html');
assert.ok(page.includes(`region.css?v=${cssToken[1]}`),
  'the channel page must load the same dated CSS version the generator writes');
const aktual = read('apps/portal/gnk-aktual/index.html');
assert.match(aktual, /aktual-media-world-v1\.css\?v=2026\d{4}-[a-z0-9-]+/, 'AKTUAL must load a dated build of the layout CSS');
// CSS i JS moraju nositi isti token: pola objave je gore od nijedne.
for (const [file, page_html, stem] of [
  ['AKTUAL', aktual, 'aktual-media-world-v1'],
  ['Regije', read('apps/portal/gnk-aktual/regije/index.html'), 'aktual-regions-v1'],
]) {
  const css = (page_html.match(new RegExp(`${stem}\\.css\\?v=([^"&]+)`)) || [])[1];
  const js = (page_html.match(new RegExp(`${stem}\\.js\\?v=([^"&]+)`)) || [])[1];
  assert.ok(css, `${file}: CSS token missing`);
  assert.equal(css, js, `${file}: CSS and JS must share one cache-busting token`);
}

console.log('Fotografije: pune slike na AKTUAL MEDIA, regijama i svih osam gradskih kanala — PASS');
