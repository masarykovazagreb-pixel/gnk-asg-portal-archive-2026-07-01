#!/usr/bin/env node
// Lokalni predlošci isključivo za planned države. Nema deploya, feeda ni vijesti.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const defaultOut = join(root, 'apps/world/country-previews');
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function validateCountries(countries) {
  if (!Array.isArray(countries)) throw new Error('countries mora biti polje');
  const ids = new Set();
  for (const c of countries) {
    if (!c || typeof c.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id) || ids.has(c.id)) throw new Error(`Nevaljan ili dupliran id: ${c?.id}`);
    ids.add(c.id);
    if (!['planned', 'preparing', 'live'].includes(c.status)) throw new Error(`${c.id}: nepoznat status`);
    if (c.status === 'planned' && (![c.country, c.capital, c.wave].every(x => typeof x === 'string' && x.trim()))) throw new Error(`${c.id}: nedostaju podaci`);
  }
}

export function renderCountry(c, lang = 'hr') {
  if (!['hr', 'en'].includes(lang)) throw new Error('Nepodržan jezik predloška');
  const en = lang === 'en';
  const country = escape(en ? (c.countryEn || c.country) : c.country);
  const capital = escape(c.capital), wave = escape(c.wave);
  const title = `${country} — AKTUAL MEDIA | ${en ? 'working preview' : 'radni predložak'}`;
  const description = en
    ? `Working preview of a future AKTUAL MEDIA edition for ${country}. Sources and editorial review are pending.`
    : `Radni predložak budućeg izdanja AKTUAL MEDIA za državu ${country}. Sadržaj i izvori čekaju uredničku provjeru.`;
  const shareDescription = en
    ? `Working preview for ${country}. Sources, rights and editorial review are not confirmed.`
    : `Radni predložak izdanja za ${country}. Izvori, prava i urednički pregled nisu potvrđeni.`;
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="website"><meta property="og:title" content="${title}">
<meta property="og:description" content="${shareDescription}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${shareDescription}">
<style>:root{color-scheme:dark;font-family:system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0b1220;color:#f4f6fb;line-height:1.6}a{color:#a6dbff}a:focus-visible{outline:3px solid #ffca7b;outline-offset:3px}header,main,footer{max-width:1100px;margin:auto;padding:1.5rem}header{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}.brand{font-weight:800;letter-spacing:.08em}.notice{background:#523715;border:1px solid #ffca7b;border-radius:.6rem;padding:1rem}.hero{padding:3rem 0 2rem}h1{font-size:clamp(2.5rem,8vw,5rem);line-height:1.1;margin:.3em 0}.tag{color:#9ec8ee;font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:1rem}.card{background:#172337;border:1px solid #35465f;border-radius:.8rem;padding:1.4rem}footer{border-top:1px solid #35465f;font-size:.9rem}.hashtags{overflow-wrap:anywhere}</style></head>
<body><header><span class="brand">AKTUAL MEDIA · ${en ? 'CHANNEL' : 'KANAL'}</span><nav aria-label="${en ? 'Navigation' : 'Navigacija'}"><a href="https://gnk-asg.hr/izdanja/">${en ? 'Network editions' : 'Mreža izdanja'}</a> · <a href="${en ? '../' : 'en/'}" lang="${en ? 'hr' : 'en'}">${en ? 'Hrvatski' : 'English'}</a></nav></header>
<main><aside class="notice"><strong>${en ? 'WORKING PREVIEW — NOT A PUBLIC EDITION.' : 'RADNI PREDLOŽAK — NIJE JAVNO IZDANJE.'}</strong> ${en ? 'Sources, rights and an editor are not confirmed. This page is not a news story and contains no published articles.' : 'Izvori, prava i urednik nisu potvrđeni. Ova stranica nije vijest i ne sadrži objavljene članke.'}</aside>
<section class="hero"><p class="tag">${en ? 'WORLD' : 'SVIJET'} · ${wave}</p><h1>${country}</h1><p>${en ? `Planned edition for ${country}. Capital: ${capital}.` : `Planirano izdanje za ${country}. Glavni grad: ${capital}.`}</p></section>
<section class="grid" aria-label="${en ? 'Edition preparation' : 'Priprema izdanja'}"><article class="card"><h2>${en ? 'News and analysis' : 'Vijesti i osvrti'}</h2><p>${en ? 'In preparation. Articles will be added only after source checks and editorial review.' : 'U pripremi. Članci će se dodati tek nakon provjere izvora i uredničkog pregleda.'}</p></article><article class="card"><h2>${en ? 'Sources and photographs' : 'Izvori i fotografije'}</h2><p>${en ? 'Sources and usage rights are still being checked. No third-party text or photographs are displayed.' : 'Izvori i prava uporabe još se provjeravaju. Nisu prikazani tuđi tekstovi ni fotografije.'}</p></article><article class="card"><h2>${en ? 'About this edition' : 'O izdanju'}</h2><p>${en ? 'This preview uses the AKTUAL MEDIA network visual style. A local editorial team has not been confirmed.' : 'Predložak koristi zajednički vizualni pristup mreže AKTUAL MEDIA. Lokalna redakcija još nije potvrđena.'}</p></article></section></main>
<footer><p>GNK ASG d.o.o. · AKTUAL MEDIA d.o.o. · Nermin Sefić</p><p class="hashtags">#NerminSefić #NerminSefic #AktualMedia #GNKASG</p><p><a href="https://gnk-asg.hr/">GNK ASG</a> · <a href="https://gnk-asg.hr/gnk-aktual/">AKTUAL MEDIA</a> · <a href="https://gnk-asg.hr/izdanja/">${en ? 'Network editions' : 'Mreža izdanja'}</a></p><p>${en ? 'Working version · no automatic publication' : 'Radna verzija · bez automatske objave'}</p></footer></body></html>\n`;
}

export function buildPreviews(countries, out) {
  validateCountries(countries);
  const planned = countries.filter(c => c.status === 'planned');
  // Nikad ne prepisuj postojeću datoteku koja nije nastala ovim generatorom.
  for (const c of planned) {
    const dir = join(out, c.id), target = join(dir, 'index.html'), marker = join(dir, '.country-preview-v1');
    if ([target, join(dir, 'robots.txt'), join(dir, 'en', 'index.html')].some(existsSync) && !existsSync(marker)) throw new Error(`${c.id}: postojeći izlaz bez oznake generatora`);
  }
  for (const c of planned) {
    const dir = join(out, c.id); mkdirSync(dir, {recursive:true});
    writeFileSync(join(dir, 'index.html'), renderCountry(c));
    mkdirSync(join(dir, 'en'), {recursive:true});
    writeFileSync(join(dir, 'en', 'index.html'), renderCountry(c, 'en'));
    writeFileSync(join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    writeFileSync(join(dir, '.country-preview-v1'), 'Lokalni predložak, nije za deploy.\n');
  }
  return planned.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--out')) throw new Error('Upotreba: node scripts/world/build-country-previews-v1.mjs [--out PUTANJA]');
  const countries = JSON.parse(readFileSync(join(root, 'config/world-countries-v1.json'), 'utf8')).countries;
  const out = args.length ? resolve(args[1]) : defaultOut;
  const count = buildPreviews(countries, out);
  console.log(`${count} lokalnih predložaka: ${out} (nije deployano)`);
}
