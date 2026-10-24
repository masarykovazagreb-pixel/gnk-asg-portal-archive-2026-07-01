#!/usr/bin/env node
/**
 * SLIKOVNI SITEMAP — samo adrese koje stvarno postoje, i nijedna datoteka
 * veća od Cloudflareovih 25 MiB.
 *
 * `image-sitemap.xml` i glavni `sitemap.xml` pišu se iz arhive, a stranice se s vremenom čiste
 * (stariji zapisi izlaze iz kanala). Kad sitemap zadrži adresu koja više ne
 * postoji, tražilica dobiva 404 na svakom otvaranju i gubi povjerenje u
 * cijeli sitemap. Ovaj skript ne izmišlja ništa: prolazi zapise i briše one
 * čija stranica nije na disku. Ako bi sitemap ostao prazan, radije ga ne
 * dira — prazan sitemap je gori od nepotpunog.
 *
 * Drugi posao istog skripta je veličina. Slikovni sitemap narastao je na
 * 34 MB i time rušio objavu (Cloudflare Workers ne prima datoteku veću od
 * 25 MiB po datoteci). Zato se iznad granice dijeli na dijelove
 * `image-sitemap-01.xml`, `-02.xml`…, a `image-sitemap.xml` postaje indeks
 * koji na njih pokazuje. Kad sadržaj padne ispod granice, dijelovi se
 * spajaju natrag u jednu datoteku.
 *
 *   node scripts/prune-image-sitemap-v1.mjs
 *   node scripts/prune-image-sitemap-v1.mjs --check   # samo izvijesti
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const SITE = 'https://gnk-asg.hr';
const CHECK = process.argv.includes('--check');

/* Granica je namjerno ispod Cloudflareovih 25 MiB: datoteka raste između
   dva pokretanja, a objava ne smije pasti zbog nekoliko kilobajta. */
const LIMIT = 20 * 1024 * 1024;
const IMAGE = 'image-sitemap.xml';
const PART_RE = /^image-sitemap-(\d{2,})\.xml$/;
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';
const URLSET_OPEN = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">';
const INDEX_OPEN = '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

const today = () => new Date().toISOString().slice(0, 10);
const partsOnDisk = () => readdirSync(PORTAL)
  .filter((name) => PART_RE.test(name))
  .sort();

const urlBlock = (file) => existsSync(file) && /<urlset|<sitemapindex/.test(readFileSync(file, 'utf8').slice(0, 4000));

/* Sadržaj slikovnog sitemapa, bez obzira na to je li trenutačno jedna
   datoteka ili indeks s dijelovima. */
function readImageEntries() {
  const file = join(PORTAL, IMAGE);
  if (!existsSync(file)) return null;
  const xml = readFileSync(file, 'utf8');
  const entries = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((match) => match[0]);
  if (entries.length) return entries;
  /* Indeks: uzmi zapise iz dijelova, po redu. */
  const merged = [];
  for (const loc of [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim())) {
    const name = loc.slice(SITE.length + 1);
    const part = join(PORTAL, name);
    if (!PART_RE.test(name) || !existsSync(part)) continue;
    const partXml = readFileSync(part, 'utf8');
    merged.push(...[...partXml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((match) => match[0]));
  }
  return merged;
}

function writeSingle(entries) {
  const body = `${XML_HEAD}${URLSET_OPEN}\n${entries.join('\n')}\n</urlset>\n`;
  writeFileSync(join(PORTAL, IMAGE), body);
  for (const name of partsOnDisk()) unlinkSync(join(PORTAL, name));
  return { mode: 'single', parts: 0 };
}

function writeSplit(entries) {
  const parts = [];
  let current = [];
  let size = XML_HEAD.length + URLSET_OPEN.length + 16;
  for (const entry of entries) {
    const add = entry.length + 1;
    if (current.length && size + add > LIMIT) {
      parts.push(current);
      current = [];
      size = XML_HEAD.length + URLSET_OPEN.length + 16;
    }
    current.push(entry);
    size += add;
  }
  if (current.length) parts.push(current);

  const names = parts.map((_, index) => `image-sitemap-${String(index + 1).padStart(2, '0')}.xml`);
  parts.forEach((group, index) => {
    writeFileSync(join(PORTAL, names[index]), `${XML_HEAD}${URLSET_OPEN}\n${group.join('\n')}\n</urlset>\n`);
  });
  for (const name of partsOnDisk()) {
    if (!names.includes(name)) unlinkSync(join(PORTAL, name));
  }
  const index = `${XML_HEAD}${INDEX_OPEN}\n${names.map((name) => `  <sitemap>\n    <loc>${SITE}/${name}</loc>\n    <lastmod>${today()}</lastmod>\n  </sitemap>`).join('\n')}\n</sitemapindex>\n`;
  writeFileSync(join(PORTAL, IMAGE), index);
  return { mode: 'split', parts: names.length };
}

/* sitemap-index.xml mora navesti svaki sitemap koji postoji, pa i dijelove. */
function syncSiteIndex() {
  const file = join(PORTAL, 'sitemap-index.xml');
  if (!existsSync(file)) return;
  const xml = readFileSync(file, 'utf8');
  const blocks = [...xml.matchAll(/<sitemap>[\s\S]*?<\/sitemap>/g)].map((match) => match[0]);
  const parts = partsOnDisk();
  const wanted = new Set(parts.map((name) => `${SITE}/${name}`));
  const kept = blocks.filter((block) => {
    const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '';
    if (!PART_RE.test(loc.slice(SITE.length + 1))) return true;
    return wanted.has(loc);
  });
  const have = new Set(kept.map((block) => (block.match(/<loc>([^<]+)<\/loc>/) || [])[1] || ''));
  const added = [...wanted].filter((loc) => !have.has(loc))
    .map((loc) => `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${today()}</lastmod>\n  </sitemap>`);
  const body = `${XML_HEAD}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...kept, ...added].join('\n')}\n</sitemapindex>\n`;
  if (body !== xml) {
    writeFileSync(file, body);
    console.log(`sitemap-index.xml — ${parts.length} dijelova slikovnog sitemapa navedeno.`);
  }
}

/* ---------- 1. brisanje adresa kojih nema ---------- */

let totalDropped = 0;
let missingFiles = 0;

for (const name of ['sitemap.xml']) {
  const file = join(PORTAL, name);
  if (!existsSync(file)) { missingFiles += 1; continue; }

  const xml = readFileSync(file, 'utf8');
  const entries = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((match) => match[0]);
  if (!entries.length) continue;

  const kept = entries.filter((entry) => {
    const loc = (entry.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '';
    if (!loc) return false;
    const path = loc.replace(SITE, '').replace(/^\/+/, '').replace(/\/$/, '');
    if (!path) return existsSync(join(PORTAL, 'index.html'));
    return existsSync(join(PORTAL, path, 'index.html'))
      || existsSync(join(PORTAL, path))
      || existsSync(join(PORTAL, `${path}.html`));
  });

  const dropped = entries.length - kept.length;
  if (!kept.length) {
    console.log(`${name} — sve ${entries.length} adresa nedostaje; datoteka nije mijenjana (prazna bi bila gora).`);
    continue;
  }
  if (dropped === 0) {
    console.log(`${name} — ${entries.length} adresa, sve postoje.`);
    continue;
  }
  if (CHECK) {
    console.error(`${name} — ${dropped} adresa u sitemapu ne postoji.`);
    process.exitCode = 1;
    continue;
  }

  const head = xml.slice(0, xml.indexOf(entries[0]));
  const last = entries[entries.length - 1];
  const tail = xml.slice(xml.lastIndexOf(last) + last.length);
  writeFileSync(file, `${head}${kept.join('\n')}${tail}`);
  console.log(`${name} — uklonjeno ${dropped} adresa koje ne postoje; ostalo ${kept.length}.`);
  totalDropped += dropped;
}

/* ---------- 2. slikovni sitemap: brisanje i veličina ---------- */

const imageEntries = readImageEntries();
if (imageEntries && imageEntries.length) {
  const kept = imageEntries.filter((entry) => {
    const loc = (entry.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '';
    if (!loc) return false;
    const path = loc.replace(SITE, '').replace(/^\/+/, '').replace(/\/$/, '');
    if (!path) return existsSync(join(PORTAL, 'index.html'));
    return existsSync(join(PORTAL, path, 'index.html'))
      || existsSync(join(PORTAL, path))
      || existsSync(join(PORTAL, `${path}.html`));
  });
  const dropped = imageEntries.length - kept.length;
  totalDropped += dropped;

  const bodySize = kept.reduce((sum, entry) => sum + entry.length + 1, 0) + XML_HEAD.length + URLSET_OPEN.length + 16;
  const needsSplit = bodySize > LIMIT;
  const wasSplit = partsOnDisk().length > 0;
  const report = () => {
    if (needsSplit) console.log(`${IMAGE} — ${kept.length} adresa, ${(bodySize / 1048576).toFixed(1)} MB; dijeli se na dijelove.`);
    else console.log(`${IMAGE} — ${kept.length} adresa, ${(bodySize / 1048576).toFixed(1)} MB, sve postoje.${wasSplit ? ' Spaja se u jednu datoteku.' : ''}`);
  };

  if (CHECK) {
    report();
    if (needsSplit !== wasSplit) console.error(`${IMAGE} — veličina traži ${needsSplit ? 'dijeljenje' : 'spajanje'}; pokreni bez --check.`);
    else if (dropped) console.error(`${IMAGE} — ${dropped} adresa ne postoji.`);
    if (needsSplit !== wasSplit || dropped) process.exitCode = 1;
  } else if (!needsSplit && !wasSplit && !dropped) {
    report();
  } else if (!needsSplit) {
    writeSingle(kept);
    report();
  } else {
    const result = writeSplit(kept);
    report();
    console.log(`${IMAGE} — ${result.parts} dijelova, svaki ispod ${(LIMIT / 1048576).toFixed(0)} MB.`);
  }
} else if (!existsSync(join(PORTAL, IMAGE))) {
  missingFiles += 1;
}

if (!CHECK) syncSiteIndex();

if (!process.exitCode) {
  console.log(`SLIKOVNI SITEMAP — gotovo${totalDropped ? `, ukupno uklonjeno ${totalDropped}` : ''}${missingFiles ? ` (${missingFiles} datoteka nema)` : ''}.`);
}

void urlBlock;
