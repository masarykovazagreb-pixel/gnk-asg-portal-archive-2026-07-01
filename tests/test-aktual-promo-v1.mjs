#!/usr/bin/env node
/**
 * AKTUAL MEDIA — prometna traka i iskačuća najava proizvoda.
 *
 * Provjerava da najava postoji na obje jezične verzije središnje stranice,
 * da je pristupačna i da se može zatvoriti (Esc, ×, podloga, „Ne prikazuj
 * više"), da vodi na stvarne rute (uključujući Beograd) i da ne ubacuje
 * ugrađene stilove/skripte — /status/ i /gnk-aktual/ moraju ostati u skladu
 * sa svojim CSP-om.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const fails = [];
const read = (p) => readFileSync(join(PORTAL, p), 'utf8');
const has = (p) => existsSync(join(PORTAL, p));

const START = '<!-- AKTUAL-PROMO:START -->';
const END = '<!-- AKTUAL-PROMO:END -->';

for (const [page, lang] of [['gnk-aktual/index.html', 'hr'], ['en/gnk-aktual/index.html', 'en']]) {
  if (!has(page)) { fails.push(`${page}: nema stranice`); continue; }
  const html = read(page);
  const start = html.indexOf(START);
  const end = html.indexOf(END);
  if (start < 0 || end < 0) { fails.push(`${page}: nema oznaka najave`); continue; }
  if (html.indexOf(START, start + 1) >= 0) fails.push(`${page}: najava je ubačena više puta`);
  const block = html.slice(start, end);

  const masthead = html.indexOf('<section class="am-masthead"');
  if (masthead > 0 && start > masthead) fails.push(`${page}: traka nije pri vrhu (iza mastheada)`);

  for (const required of [
    'id="amPromoTop"',
    'id="amPromoModal"',
    'role="dialog"',
    'aria-modal="true"',
    'aria-labelledby="amPromoTitle"',
    'data-am-promo-close',
    'data-am-promo-never',
    '/assets/aktual-promo-v1.css',
    '/assets/aktual-promo-v1.js',
  ]) {
    if (!block.includes(required)) fails.push(`${page}: nedostaje ${required}`);
  }

  if (!/<div class="am-promo-modal" id="amPromoModal" hidden>/.test(block)) {
    fails.push(`${page}: najava nije skrivena dok JS ne odluči (mora imati hidden)`);
  }
  if (/<style[\s>]/.test(block)) fails.push(`${page}: ugrađeni <style> u najavi (CSP)`);
  if (/<script(?![^>]*src=)[^>]*>/.test(block)) fails.push(`${page}: ugrađena skripta u najavi (CSP)`);

  /* Beograd je prvi jer je srpsko izdanje novo; uz njega stalni proizvodi. */
  for (const href of ['/kanal/beograd/', '/izdanja/moda/', 'https://gnk-asg-tjednik.pages.dev/', '/galerija/']) {
    if (!block.includes(`href="${href}"`)) fails.push(`${page}: nema poveznicu na ${href}`);
  }
  const statusHref = lang === 'hr' ? '/status/' : '/en/status/';
  if (!block.includes(`href="${statusHref}"`)) fails.push(`${page}: nema poveznicu na ${statusHref}`);

  /* Dijeljenje ide preko običnih poveznica (bez ugrađenih frameova). */
  if (!block.includes('twitter.com/intent/tweet')) fails.push(`${page}: nema poveznice za dijeljenje`);

  for (const href of [...block.matchAll(/href="(\/[^"#?]*\/)"/g)].map((m) => m[1])) {
    const rel = href.slice(1).replace(/\/$/, '');
    const candidates = [join(PORTAL, rel), join(PORTAL, rel, 'index.html')];
    if (!candidates.some((p) => existsSync(p))) fails.push(`${page}: poveznica vodi na nepostojeću rutu ${href}`);
  }
}

/* Vanjski asseti i njihovo ponašanje. */
const cssPath = 'assets/aktual-promo-v1.css';
const jsPath = 'assets/aktual-promo-v1.js';
for (const p of [cssPath, jsPath]) if (!has(p)) fails.push(`${p}: nema datoteke`);
if (has(cssPath)) {
  const css = read(cssPath);
  if (!css.includes('.am-promo-modal[hidden]')) fails.push('CSS: najava se ne skriva kad je hidden');
  if (!css.includes('prefers-reduced-motion')) fails.push('CSS: nema poštovanja smanjenog kretanja');
  if (!css.includes('position: fixed')) fails.push('CSS: sloj nije fiksan (može se preklopiti sa sadržajem)');
}
if (has(jsPath)) {
  const js = read(jsPath);
  for (const token of ['Escape', 'sessionStorage', 'localStorage', 'aria-hidden']) {
    if (token === 'aria-hidden') continue;
    if (!js.includes(token)) fails.push(`JS: nema ${token} (zatvaranje/pamćenje)`);
  }
  if (!js.includes('preventScroll')) fails.push('JS: fokus se ne vraća bez skoka stranice');
  if (!js.includes("document.addEventListener('mouseout'")) fails.push('JS: nema izlaznog pokreta');
}

/* Status mora ostati bez ugrađenog stila — /status/* ima strogi CSP. */
for (const page of ['status/index.html', 'en/status/index.html']) {
  if (!has(page)) { fails.push(`${page}: nema stranice`); continue; }
  const html = read(page);
  if (/<style[\s>]/.test(html)) fails.push(`${page}: ugrađeni <style> blokira CSP`);
  if (!html.includes('/assets/status-page-v1.css')) fails.push(`${page}: nema vanjskog CSS-a`);
}
if (!has('assets/status-page-v1.css')) fails.push('assets/status-page-v1.css: nema datoteke');

console.log(JSON.stringify({
  ok: fails.length === 0,
  version: 'GNK_ASG_AKTUAL_PROMO_V1_20261022',
  pages: 2,
  failures: fails,
}, null, 2));

if (fails.length) process.exitCode = 1;
