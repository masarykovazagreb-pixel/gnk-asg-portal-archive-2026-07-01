#!/usr/bin/env node
/**
 * DIZAJN SREDIŠNJE STRANICE — uključivanje sloja `aktual-hub-v2.css`.
 *
 * Sloj se učitava zadnji u `<head>`, iza svih starijih listova, da pobijedi
 * pravila koja su na stranicu došla iz deset različitih razdoblja. Skript je
 * idempotentan: ako je veza već tu, samo osvježi `?v=` (inače posjetitelji
 * drže stari CSS zbog keša od godine dana).
 *
 * Pokretanje: node scripts/apply-aktual-hub-design-v1.mjs [--check]
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOUSE } from '../apps/shared/impressum-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['apps/portal/gnk-aktual/index.html', 'apps/portal/en/gnk-aktual/index.html'];
const CSS = '/assets/aktual-hub-v2.css';
/* Verzija je otisak sadržaja lista: kad se CSS promijeni, mijenja se i ?v,
   pa preglednik ne servira stari izgled iz memorije. */
const VERSION = createHash('sha1')
  .update(readFileSync(join(ROOT, 'apps/portal/assets/aktual-hub-v2.css')))
  .digest('hex')
  .slice(0, 8);
const CHECK = process.argv.includes('--check');

const tag = `<link rel="stylesheet" href="${CSS}?v=${VERSION}" data-am-hub-design="v2">`;

/* ---------- hero traka: brojevi mreže i četiri ciljna upita ----------
   Traka ne dodaje nijedan <h2>, pa se paritet naslova HR/EN ne mijenja.
   Brojevi dolaze iz `network-counts-v1.json`, nikad iz teksta. */

const counts = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'apps', 'portal', 'data', 'network-counts-v1.json'), 'utf8'));
  } catch {
    return {};
  }
})();

const nf = new Intl.NumberFormat('hr-HR');
const TEXTS = {
  hr: {
    texts: 'tekstova u arhivi',
    cities: 'gradskih izdanja',
    langs: 'jezika',
    sources: 'izvora',
    queries: 'Tražite nekoga ili nešto?',
    chip: [['nermin sefić', '/nermin-sefic/'], ['gnk asg', '/gnk-asg/'], ['aktual media', '/aktual-media/'], ['gnk dinamo ltd usa', '/gnk-dinamo-ltd-usa/']],
    cta: 'Sva izdanja →',
    cta2: 'Agenti mreže →',
    editors: `Urednik: Nermin Sefić · ${HOUSE.email}`
  },
  en: {
    texts: 'texts in the archive',
    cities: 'city editions',
    langs: 'languages',
    sources: 'sources',
    queries: 'Looking for a name or a company?',
    chip: [['nermin sefić', '/en/nermin-sefic/'], ['gnk asg', '/gnk-asg/'], ['aktual media', '/en/aktual-media/'], ['gnk dinamo ltd usa', '/gnk-dinamo-ltd-usa/']],
    cta: 'All editions →',
    cta2: 'Network agents →',
    editors: `Editor: Nermin Sefić · ${HOUSE.email}`
  }
};

const strip = (lang) => {
  const t = TEXTS[lang];
  const cells = [
    [nf.format(counts.texts || 0), t.texts],
    [String(counts.cities || 17), t.cities],
    [String(counts.languages || 14), t.langs],
    [String(counts.sources || 0), t.sources]
  ].map(([v, k]) => `<li><b>${v}</b><span>${k}</span></li>`).join('');
  const chips = t.chip.map(([q, href]) => `<a href="${href}"${href.startsWith('/en/') ? ' hreflang="en" lang="en"' : ''}>${q}</a>`).join('');
  return `<!-- AM-HUB-STRIP:START -->
<section class="amh-strip" aria-label="${lang === 'hr' ? 'Mreža u brojevima' : 'The network in numbers'}">
  <ul class="amh-stats">${cells}</ul>
  <div class="amh-queries">
    <span>${t.queries}</span>
    <nav>${chips}</nav>
  </div>
  <div class="amh-cta">
    <a class="amh-btn" href="${lang === 'hr' ? '/izdanja/' : '/izdanja/'}"${lang === 'en' ? ' hreflang="hr" lang="hr"' : ''}>${t.cta}</a>
    <a class="amh-btn amh-btn--ghost" href="/agenti/">${t.cta2}</a>
    <span class="amh-editor">${t.editors}</span>
  </div>
</section>
<!-- AM-HUB-STRIP:END -->`;
};
const touched = [];
const missing = [];

for (const rel of PAGES) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) { missing.push(rel); continue; }
  const original = readFileSync(file, 'utf8');
  let html = original;

  const lang = rel.includes('/en/') ? 'en' : 'hr';

  /* Zaglavlje: bočne redove pune podaci, ne engleski ostaci na hrvatskoj
     stranici. Brojevi dolaze iz iste datoteke kao i traka. */
  const sideLeft = lang === 'hr'
    ? `Nositelj GNK ASG d.o.o. · izdavač AKTUAL MEDIA d.o.o.<br>Osnivač GNK DINAMO Ltd, SAD`
    : `Holder GNK ASG d.o.o. · publisher AKTUAL MEDIA d.o.o.<br>Founder GNK DINAMO Ltd, USA`;
  const sideRight = lang === 'hr'
    ? `AKTUAL MEDIA DESK<br>${nf.format(counts.texts || 0)} tekstova · ${counts.cities || 17} izdanja · ${counts.languages || 14} jezika`
    : `AKTUAL MEDIA DESK<br>${nf.format(counts.texts || 0)} texts · ${counts.cities || 17} editions · ${counts.languages || 14} languages`;
  html = html.replace(/<div class="am-mast-side">[\s\S]*?<\/div>/, `<div class="am-mast-side">${sideLeft}</div>`);
  html = html.replace(/<div class="am-mast-side right">[\s\S]*?<\/div>/, `<div class="am-mast-side right">${sideRight}</div>`);

  /* Hero traka ide odmah iza mastheada, prije atlasa. */
  const block = strip(lang);
  if (/<!-- AM-HUB-STRIP:START -->[\s\S]*?<!-- AM-HUB-STRIP:END -->/.test(html)) {
    html = html.replace(/<!-- AM-HUB-STRIP:START -->[\s\S]*?<!-- AM-HUB-STRIP:END -->/, block);
  } else {
    const masthead = html.match(/<section class="am-masthead"[\s\S]*?<\/section>/);
    if (!masthead) { missing.push(`${rel} (nema mastheada)`); continue; }
    html = html.replace(masthead[0], `${masthead[0]}\n${block}`);
  }

  /* Sloj mora biti ZADNJI u headu: stariji listovi i slojevi koji se dodaju
     kasnije (traka, impressum) ne smiju ga prekriti. Zato se veza uvijek
     ukloni pa doda na kraj. */
  html = html.replace(/\n?<link[^>]*href="\/assets\/aktual-hub-v2\.css\?v=[^"]*"[^>]*>/g, '');
  if (!/<\/head>/i.test(html)) { missing.push(`${rel} (nema </head>)`); continue; }
  html = html.replace(/<\/head>/i, `${tag}\n</head>`);

  if (html === original) continue;
  if (!CHECK) writeFileSync(file, html);
  touched.push(rel);
}

console.log(JSON.stringify({
  version: 'AKTUAL_MEDIA_HUB_DESIGN_V2',
  check: CHECK,
  pages: PAGES.length,
  touched,
  missing,
  ok: missing.length === 0
}, null, 2));
if (missing.length) process.exit(1);
