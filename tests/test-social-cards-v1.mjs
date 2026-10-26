#!/usr/bin/env node
/**
 * DRUŠTVENE KARTICE — gate za OG i Twitter meta sloj.
 *
 * Kad se stranica podijeli, o njoj odlučuju tri stvari: naslov, opis i slika.
 * Ako slike nema, mreža prikaže prazan okvir ili generičku plohu, a stranica
 * izgleda nedovršeno. Ovaj test zato traži, na svakoj javnoj i indeksabilnoj
 * stranici:
 *
 *   1. `og:image` s apsolutnim https URL-om;
 *   2. `og:image:alt` s opisom (nije prazan, nije samo "slika");
 *   3. `twitter:card`, `twitter:image` i `twitter:image:alt`;
 *   4. da lokalna datoteka iz `og:image` stvarno postoji u repozitoriju —
 *      osim kad slika ide kroz `/api/img` posrednik.
 *
 * Interna administracija, alati i `noindex` stranice izuzeti su: njih nitko
 * ne dijeli, a njihov meta sloj ima druga pravila.
 *
 * Test ne pristupa mreži.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');

/* Alati i interne stranice — nisu javni sadržaj. */
const EXCLUDED = [
  'admin/', 'admin-center/', 'operator-dashboard/', 'webmail/', 'mail-studio/',
  'campaign-mailer/', 'media-registration-admin/', 'data/', 'assets/',
  '__preview/', 'google', 'worker-ops/', 'email-status/'
];

const fails = [];
let pages = 0;
let skipped = 0;

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
};

const meta = (head, pattern) => {
  const match = head.match(pattern);
  return match ? match[1].trim() : '';
};

for (const file of walk(PORTAL)) {
  const rel = file.slice(PORTAL.length + 1).replace(/\\/g, '/');
  if (EXCLUDED.some((prefix) => rel.startsWith(prefix))) { skipped += 1; continue; }

  let html;
  try { html = readFileSync(file, 'utf8'); } catch { skipped += 1; continue; }
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) { skipped += 1; continue; }
  const head = html.slice(0, headEnd);

  const robots = meta(head, /<meta name="robots" content="([^"]*)"/);
  if (robots && robots.includes('noindex')) { skipped += 1; continue; }

  pages += 1;
  const ogImage = meta(head, /<meta property="og:image" content="([^"]+)"/);
  const ogAlt = meta(head, /<meta property="og:image:alt" content="([^"]*)"/);
  const twitterCard = meta(head, /<meta name="twitter:card" content="([^"]*)"/);
  const twitterImage = meta(head, /<meta name="twitter:image" content="([^"]+)"/);
  const twitterAlt = meta(head, /<meta name="twitter:image:alt" content="([^"]*)"/);

  if (!ogImage) { fails.push(`${rel}: nema og:image`); continue; }
  if (!/^https:\/\//.test(ogImage)) fails.push(`${rel}: og:image nije https — ${ogImage}`);
  if (!ogAlt) fails.push(`${rel}: nema og:image:alt`);
  /* Kratki naslovi na kineskom ili japanskom nose više značenja po znaku —
     prag se računa u znakovima, ali za ne-latinična pisma je niži. */
  else if (ogAlt.length < (/[\u2E80-\u9FFF\uAC00-\uD7AF\u0600-\u06FF]/.test(ogAlt) ? 4 : 12)) {
    fails.push(`${rel}: og:image:alt je prekratak (${ogAlt.length})`);
  }
  if (!twitterCard) fails.push(`${rel}: nema twitter:card`);
  if (!twitterImage) fails.push(`${rel}: nema twitter:image`);
  if (!twitterAlt) fails.push(`${rel}: nema twitter:image:alt`);

  /* Lokalna slika mora postojati — inače je kartica prazna kad je podijele. */
  for (const [label, url] of [['og:image', ogImage], ['twitter:image', twitterImage]]) {
    if (!url || !url.startsWith('https://gnk-asg.hr/')) continue;
    if (url.includes('/api/')) continue;
    const path = join(PORTAL, url.slice('https://gnk-asg.hr/'.length).split('?')[0].split('#')[0]);
    if (!existsSync(path)) fails.push(`${rel}: ${label} pokazuje na nepostojeću datoteku — ${url}`);
  }
}

if (fails.length) {
  console.error(`DRUŠTVENE KARTICE — ${fails.length} problema (${pages} javnih stranica):`);
  for (const fail of fails.slice(0, 40)) console.error(`  ✗ ${fail}`);
  if (fails.length > 40) console.error(`  … i još ${fails.length - 40}`);
  process.exit(1);
}
console.log(`DRUŠTVENE KARTICE — OK: ${pages} javnih stranica ima OG i Twitter sliku s opisom (${skipped} internih preskočeno).`);
