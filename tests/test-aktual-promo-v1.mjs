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
    '/assets/aktual-promo-v1.css?v=',
    '/assets/aktual-promo-v1.js?v=',
  ]) {
    if (!block.includes(required)) fails.push(`${page}: nedostaje ${required}`);
  }

  if (!/<div class="am-promo-modal" id="amPromoModal" hidden>/.test(block)) {
    fails.push(`${page}: najava nije skrivena dok JS ne odluči (mora imati hidden)`);
  }
  if (/<style[\s>]/.test(block)) fails.push(`${page}: ugrađeni <style> u najavi (CSP)`);
  /* /assets/* je immutable na godinu dana — bez novog ?v= posjetitelji drže stari CSS/JS. */
  if (!/aktual-promo-v1\.css\?v=\d{8}[a-z]?/.test(block)) fails.push(`${page}: CSS nema cache-buster`);
  if (!/aktual-promo-v1\.js\?v=\d{8}[a-z]?/.test(block)) fails.push(`${page}: JS nema cache-buster`);

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

/* ---------- paritet sekcija: EN nije kraća verzija HR-a ---------- */
const hrPage = read('gnk-aktual/index.html');
const enPage = read('en/gnk-aktual/index.html');
for (const [page, html] of [['gnk-aktual/index.html', hrPage], ['en/gnk-aktual/index.html', enPage]]) {
  for (const marker of ['<!-- AKTUAL-CENTRAL:START -->', '<!-- IZDANJA-BAND:START -->', '<!-- KANAL-BAND:START -->']) {
    if (!html.includes(marker)) fails.push(`${page}: nema bloka ${marker}`);
  }
  if (html.split('<!-- AKTUAL-CENTRAL:START -->').length !== 2) fails.push(`${page}: središnja ploča nije točno jednom`);
}
const countH2 = (html) => (html.match(/<h2\b/g) || []).length;
if (countH2(hrPage) !== countH2(enPage)) {
  fails.push(`EN ima ${countH2(enPage)} naslova druge razine, HR ${countH2(hrPage)} — EN je opet kraća`);
}
/* Naslovi se ne prepisuju u test: broj gradova i jezika raste s mrežom, pa se
   provjerava oblik natpisa (engleski, s brojevima iz kanala), ne stari tekst. */
if (!/cities,\s+[a-z]+ languages/i.test(enPage) && !enPage.includes('languages,')) {
  fails.push('EN: nema engleski naslov ploče s gradovima i jezicima');
}
for (const [needle, label] of [
  ['five continents, one newsroom', 'engleska traka izdanja'],
  ['From the GNK ASG channel', 'engleska traka kanala'],
  ['Edition hashtags', 'engleske oznake']
]) {
  if (!enPage.includes(needle)) fails.push(`EN: nema ${label} (${needle})`);
}
for (const croatian of ['Sedamnaest gradova', 'Naša izdanja — pet kontinenata', 'Iz GNK ASG KANALA', 'Hashtagovi izdanja']) {
  if (enPage.includes(croatian)) fails.push(`EN: hrvatski naslov ${croatian} na engleskoj stranici`);
}

/* ---------- prozorčići i lebdeća reklama (oba jezika) ---------- */
const WINDOW_TARGETS = {
  hr: ['/status/', '/kanal/beograd/', '/galerija/', '/gnk-aktual/mreza/', '/aktual-media/proizvodi/'],
  en: ['/en/status/', '/kanal/beograd/', '/galerija/', '/en/gnk-aktual/network/', '/en/aktual-media/proizvodi/']
};
for (const [page, lang] of [['gnk-aktual/index.html', 'hr'], ['en/gnk-aktual/index.html', 'en']]) {
  const html = read(page);
  if (!html.includes('class="am-win-row"')) { fails.push(`${page}: nema trake prozorčića`); continue; }
  const row = html.slice(html.indexOf('class="am-win-row"'), html.indexOf('</nav>', html.indexOf('class="am-win-row"')));
  const wins = (row.match(/<li class="am-win">/g) || []).length;
  if (wins !== 5) fails.push(`${page}: ${wins} prozorčića (mora biti 5)`);
  for (const href of WINDOW_TARGETS[lang]) {
    if (!row.includes(`href="${href}"`)) fails.push(`${page}: prozorčić ne vodi na ${href}`);
  }
  if (!/am-win-head[\s\S]{0,400}Svi proizvodi|am-win-head[\s\S]{0,400}All products/.test(row)) {
    fails.push(`${page}: nema poveznice na popis svih proizvoda u zaglavlju prozorčića`);
  }
  if (row.includes('<style')) fails.push(`${page}: ugrađeni stil u prozorčićima`);
  // prozorčići moraju biti prije mastheada, kao i traka
  const mastIdx = html.indexOf('<section class="am-masthead"');
  if (mastIdx > 0 && html.indexOf('class="am-win-row"') > mastIdx) fails.push(`${page}: prozorčići su ispod mastheada`);

  if (!html.includes('id="amAd"')) { fails.push(`${page}: nema lebdeće reklame`); continue; }
  const adStart = html.indexOf('id="amAd"');
  const ad = html.slice(html.lastIndexOf('<aside', adStart), html.indexOf('</aside>', adStart));
  const offers = (ad.match(/data-am-ad-item/g) || []).length;
  if (offers !== 3) fails.push(`${page}: ${offers} ponuda u reklami (moraju biti 3)`);
  if ((ad.match(/<aside class="am-ad" id="amAd" hidden/g) || []).length !== 1) fails.push(`${page}: reklama nije skrivena dok JS ne odluči`);
  for (const token of ['data-am-ad-close', 'am-ad-dots', 'aria-label=']) {
    if (!ad.includes(token)) fails.push(`${page}: reklama nema ${token}`);
  }
  // barem jedna ponuda mora voditi na Beograd — novo izdanje
  if (!ad.includes('href="/kanal/beograd/"')) fails.push(`${page}: reklama ne nudi Beograd`);
}

/* Reklama mora biti ponuđena i bez JS-a: <noscript> nije potreban jer je
   reklama samo dodatak, ali ne smije blokirati čitanje (nema position:fixed
   preko cijelog ekrana u CSS-u). */
/* ---------- masthead: JEDAN naslov, bez drugog „loga" ---------- */
for (const page of ['gnk-aktual/index.html', 'en/gnk-aktual/index.html']) {
  const html = read(page);
  const mast = html.slice(html.indexOf('<section class="am-masthead"'), html.indexOf('</section>', html.indexOf('<section class="am-masthead"')));
  const titles = (mast.match(/<h1\b/g) || []).length;
  if (titles !== 1) fails.push(`${page}: masthead ima ${titles} naslova (mora biti 1)`);
  if (mast.includes('am-mast-logo')) fails.push(`${page}: masthead još nosi znak uz tekstni naslov (dvostruki naslov)`);
  if (!mast.includes('class="am-brand-kicker"') || !mast.includes('class="am-brand-sub"')) {
    fails.push(`${page}: masthead nema isti tekstni sklop kao druga jezična verzija`);
  }
}
if ((read('gnk-aktual/index.html').match(/<h1\b/g) || []).length !== 1) fails.push('HR stranica: više od jednog <h1>');
if ((read('en/gnk-aktual/index.html').match(/<h1\b/g) || []).length !== 1) fails.push('EN stranica: više od jednog <h1>');

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

if (has('assets/aktual-promo-v1.css')) {
  const css = read('assets/aktual-promo-v1.css');
  for (const token of ['@keyframes am-win-pop', '.am-win-grid', '.am-ad', '.am-ad-close', '[hidden]']) {
    if (!css.includes(token)) fails.push(`CSS: nema ${token}`);
  }
  if (!/@media \(max-width: 700px\)/.test(css)) fails.push('CSS: nema mobilnog prekida za reklamu/prozorčiće');
}
if (has('assets/aktual-promo-v1.js')) {
  const js = read('assets/aktual-promo-v1.js');
  for (const token of ['IntersectionObserver', 'am-ad-v1:hidden', 'am-ad-v1:never', 'data-am-ad-close', 'is-in']) {
    if (!js.includes(token)) fails.push(`JS: nema ${token} (prozorčići/reklama)`);
  }
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
  version: 'GNK_ASG_AKTUAL_PROMO_V2_20261022',
  pages: 2,
  failures: fails,
}, null, 2));

if (fails.length) process.exitCode = 1;
