#!/usr/bin/env node
// Standard "Kanal v2": svaka stranica svjetskog izdanja (apps/portal/kanal/<grad>/index.html)
// mora imati isti minimum elemenata. Test ne popravlja ništa; samo provjerava.
//
// Provjere po stranici:
//  - najmanje 6 hashtagova u article:tag meta oznakama
//  - najmanje 6 vidljivih hashtagova (linkovi ili oznake)
//  - urednik Nermin Sefić (dopuštene varijante imena: Sefić / Sefic, s i bez razmaka)
//  - AKTUAL MEDIA, GNK ASG, GNK DINAMO Ltd prisutni u tekstu i u JSON-LD
//  - logo izdanja postoji kao datoteka
//  - svaka kartica s medijem (.cardmedia, bilo koji element) ima <img> s postojećom lokalnom datotekom
//  - najmanje jedna kartica s medijem po stranici (inače provjera nema smisla)
//  - meta description 80–320 znakova (standard za izdanja)
//
// Izlaz: JSON sažetak; exit 1 ako je ijedna provjera pala.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KANAL = join(ROOT, 'apps', 'portal', 'kanal');
const PORTAL = join(ROOT, 'apps', 'portal');
const NERMIN = /Nermin\s*Sefi[cć]/iu;
const MIN_TAGS = 6;

function cities() {
  return readdirSync(KANAL).filter((d) => {
    const p = join(KANAL, d, 'index.html');
    return existsSync(p) && statSync(join(KANAL, d)).isDirectory();
  }).sort();
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style[\s\S]*?<\/style>/giu, ' ')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&nbsp;/gu, ' ')
    .replace(/\s+/gu, ' ');
}

function metaContent(html, key, attr = 'name') {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, 'iu');
  const m = html.match(re);
  return m ? m[1] : '';
}

function checkPage(city) {
  const file = join(KANAL, city, 'index.html');
  const html = readFileSync(file, 'utf8');
  const text = visibleText(html);
  const errors = [];

  const articleTags = [...html.matchAll(/<meta\s+property="article:tag"\s+content="([^"]+)"/giu)].map((m) => m[1]);
  if (articleTags.length < MIN_TAGS) errors.push(`article:tag ${articleTags.length} < ${MIN_TAGS}`);

  const visibleTags = new Set([...text.matchAll(/#[\p{L}\p{N}_]+/gu)].map((m) => m[0]));
  if (visibleTags.size < MIN_TAGS) errors.push(`vidljivih hashtagova ${visibleTags.size} < ${MIN_TAGS}`);

  if (!NERMIN.test(text)) errors.push('nema urednika Nermin Sefić u vidljivom tekstu');
  for (const term of ['AKTUAL MEDIA', 'GNK ASG', 'GNK DINAMO Ltd']) {
    if (!text.includes(term)) errors.push(`nedostaje "${term}" u vidljivom tekstu`);
  }
  const jsonld = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/giu)].map((m) => m[1]).join('\n');
  if (!/GNK DINAMO Ltd/u.test(jsonld)) errors.push('JSON-LD nema GNK DINAMO Ltd');

  const logo = join(PORTAL, 'assets', 'brand', `kanal-${city}-1200.webp`);
  if (!existsSync(logo)) errors.push(`nedostaje logo ${city}`);

  // Kartica s medijem: <img> je ili lokalna datoteka (izdanje, umjetnička ilustracija)
  // ili vanjska slika preko vlastitog proxyja (/api/img). Proxy slike nemaju lokalnu
  // datoteku, pa im je obavezan fallback (znak brenda u region.css, isti za sve gradove).
  const css = existsSync(join(KANAL, city, 'assets', 'region.css')) ? readFileSync(join(KANAL, city, 'assets', 'region.css'), 'utf8') : '';
  const fallbackOk = /\.cardmedia\{[^}]*aktual-media-mark\.svg/u.test(css) && existsSync(join(PORTAL, 'assets', 'brand', 'aktual-media-mark.svg'));
  let mediaCards = 0;
  let proxied = 0;
  let missingMedia = 0;
  for (const block of html.matchAll(/<(\w+) class="cardmedia[ "][^>]*>([\s\S]*?)<\/\1>/giu)) {
    mediaCards += 1;
    const src = (block[2].match(/<img[^>]*src="([^"]+)"/iu) || [])[1];
    if (!src) { missingMedia += 1; continue; }
    if (src.startsWith('/api/img') || /^https:\/\/gnk-asg\.hr\/api\/img/u.test(src)) {
      proxied += 1;
      if (!fallbackOk) missingMedia += 1;
      continue;
    }
    if (/^https?:/u.test(src)) { missingMedia += 1; continue; }
    if (!existsSync(join(PORTAL, src.split('?')[0].replace(/^\//u, '')))) missingMedia += 1;
  }
  if (mediaCards < 1) errors.push('nema nijedne kartice s medijem');
  if (missingMedia) errors.push(`${missingMedia} od ${mediaCards} kartica nema dostupnu sliku ni lokalni fallback`);

  const desc = metaContent(html, 'description');
  if (desc.length < 80 || desc.length > 320) errors.push(`meta description ${desc.length} izvan 80–320`);

  return { city, errors, visibleTags: visibleTags.size, articleTags: articleTags.length, mediaCards, proxied, missingMedia, descriptionLength: desc.length };
}

const results = cities().map(checkPage);
const failed = results.filter((r) => r.errors.length);
const report = {
  version: 'GNK_ASG_KANAL_STANDARD_V2',
  pages: results.length,
  ok: failed.length === 0,
  failedPages: failed.length,
  results,
};
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
