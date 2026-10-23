#!/usr/bin/env node
/**
 * SLIKOVNI SITEMAP — samo adrese koje stvarno postoje.
 *
 * `image-sitemap.xml` i glavni `sitemap.xml` pišu se iz arhive, a stranice se s vremenom čiste
 * (stariji zapisi izlaze iz kanala). Kad sitemap zadrži adresu koja više ne
 * postoji, tražilica dobiva 404 na svakom otvaranju i gubi povjerenje u
 * cijeli sitemap. Ovaj skript ne izmišlja ništa: prolazi zapise i briše one
 * čija stranica nije na disku. Ako bi sitemap ostao prazan, radije ga ne
 * dira — prazan sitemap je gori od nepotpunog.
 *
 *   node scripts/prune-image-sitemap-v1.mjs
 *   node scripts/prune-image-sitemap-v1.mjs --check   # samo izvijesti
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const FILES = ['image-sitemap.xml', 'sitemap.xml'];
const CHECK = process.argv.includes('--check');
const SITE = 'https://gnk-asg.hr';

let totalDropped = 0;
let missingFiles = 0;

for (const name of FILES) {
  const file = join(PORTAL, name);
  if (!existsSync(file)) { missingFiles += 1; continue; }

  const xml = readFileSync(file, 'utf8');
  const entries = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0]);
  if (!entries.length) continue;

  const pageExists = (loc) => {
    const path = loc.replace(SITE, '').replace(/^\/+/, '').replace(/\/$/, '');
    if (!path) return existsSync(join(PORTAL, 'index.html'));
    return existsSync(join(PORTAL, path, 'index.html'))
      || existsSync(join(PORTAL, path))
      || existsSync(join(PORTAL, `${path}.html`));
  };

  const kept = entries.filter((entry) => {
    const loc = (entry.match(/<loc>([^<]+)<\/loc>/) || [])[1] || '';
    return loc ? pageExists(loc) : false;
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

if (!process.exitCode) {
  console.log(`SLIKOVNI SITEMAP — gotovo${totalDropped ? `, ukupno uklonjeno ${totalDropped}` : ''}${missingFiles ? ` (${missingFiles} datoteka nema)` : ''}.`);
}
