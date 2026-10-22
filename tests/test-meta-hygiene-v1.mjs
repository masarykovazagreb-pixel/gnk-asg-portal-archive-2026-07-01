#!/usr/bin/env node
/**
 * META HIGIJENA — pravilo koje je postavljeno za sve AKTUAL MEDIA stranice.
 *
 * 1. `meta keywords` i `news_keywords` nose riječi, nikad oznake: hashtag
 *    ima svoje mjesto u `article:tag` (jedan tag = jedan meta). Ako se `#`
 *    zavuče u keywords, tražilica dobiva smeće, a oznaka više nije strojno
 *    čitljiva.
 * 2. Ime urednika nije ključna riječ. Autorstvo ide kroz `author`,
 *    `article:author` i JSON-LD, ne kroz popis pojmova.
 * 3. Stranica koja nosi AKTUAL MEDIA entitet mora ga nositi s istim @id-om
 *    na svakoj podstranici — inače Google vidi dvije organizacije.
 *
 * Test čita generirane datoteke na disku. Ako padne, popravlja se generator.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const BRAND_ID = 'https://gnk-asg.hr/gnk-aktual/#news-organization';
const AUTHOR = /Nermin\s+Sefi[cć]|Sefi[cć]\s+Nermin/i;

/* Proizvodi koje ovaj generator sada piše. Starije, zasebno generirane
   stranice (spt/, publications/ …) imaju svoje testove i svoj red čišćenja;
   ovdje se čuva pravilo za kanale, deskove, podatkovni desk i mrežu. */
const SCOPE = ['kanal', 'izdanja', 'aktual-media', 'gnk-aktual', 'mreza'];
const HTML = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (name.endsWith('.html')) HTML.push(path);
  }
};
walk(PORTAL);

const fails = [];
let withKeywords = 0;
let withTags = 0;
let brandPages = 0;

for (const file of HTML) {
  const rel = relative(ROOT, file);
  const html = readFileSync(file, 'utf8');
  const inScope = SCOPE.some((prefix) => rel.startsWith(join('apps', 'portal', prefix)));
  if (!inScope) continue;
  for (const match of html.matchAll(/<meta\s+name=["'](keywords|news_keywords)["'][^>]*>/gi)) {
    withKeywords += 1;
    const raw = (match[0].match(/content=["']([^"']*)["']/) || [, ''])[1];
    /* &#39; je apostrof u naslovu, ne oznaka — dekodiraj prije provjere. */
    const content = raw.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    if (content.includes('#')) fails.push(`${rel}: ${match[1]} sadrži # (${content.slice(0, 80)})`);
    if (AUTHOR.test(content)) fails.push(`${rel}: ${match[1]} sadrži ime urednika`);
  }
  if (/property=["']article:tag["']/.test(html)) withTags += 1;
  if (html.includes(BRAND_ID)) brandPages += 1;
}

/* AKTUAL MEDIA entitet ne smije se pojaviti pod id-om GNK ASG organizacije:
   dvije organizacije s istim @id-om = jedna pogrešna tvrdnja. */
const brandOwners = [...HTML].filter((file) => {
  const html = readFileSync(file, 'utf8');
  return new RegExp(`"@type":"NewsMediaOrganization","@id":"https://gnk-asg\\.hr/#gnk-asg"|<script[^>]*>\\s*\\{[^<]*"@type": ?"NewsMediaOrganization", ?"@id": ?"https://gnk-asg\\.hr/#gnk-asg"`).test(html);
});
for (const file of brandOwners.slice(0, 10)) fails.push(`${relative(ROOT, file)}: AKTUAL MEDIA nosi @id GNK ASG organizacije`);

/* Mreža i kanali moraju imati barem jednu oznaku i barem jedan link natrag
   na AKTUAL MEDIA — inače stranica ne pripada kući kojoj pripada. */
const sample = ['kanal/zagreb/index.html', 'kanal/beograd/index.html', 'izdanja/moda/index.html', 'izdanja/index.html', 'gnk-aktual/index.html'];
for (const rel of sample) {
  const file = join(PORTAL, rel);
  if (!existsSync(file)) { fails.push(`${rel}: nedostaje`); continue; }
  const html = readFileSync(file, 'utf8');
  if (!html.includes('/gnk-aktual/')) fails.push(`${rel}: nema poveznicu na AKTUAL MEDIA`);
  if (!/property=["']article:tag["']|<li class=["'](iz-tags|tag|amc-tags)["']|class=["']amc-tags["']/.test(html)) {
    fails.push(`${rel}: nema oznake (article:tag ili vidljive pločice)`);
  }
}

const report = {
  ok: fails.length === 0,
  version: 'GNK_ASG_META_HYGIENE_V1_20261022',
  pages: HTML.length,
  keywordMetas: withKeywords,
  pagesWithTags: withTags,
  pagesWithBrandEntity: brandPages,
  failures: fails.slice(0, 40),
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) process.exit(1);
