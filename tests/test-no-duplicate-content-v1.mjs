#!/usr/bin/env node
/**
 * JEDAN TEKST — JEDNA KANONSKA ADRESA PO WEBU.
 *
 * Prenošenje je dopušteno, kopiranje bez kanonika nije: ako dvije stranice
 * istog weba tvrde da su izvornik istog teksta, tražilica bira jednu, drugu
 * proglašava suvišnom i obje padaju. Isto vrijedi ako prenesena stranica
 * kanonizira samu sebe — tada tvrdi da je ona izvornik, a nije.
 *
 * Test zato traži:
 *   1. svaka stranica ima apsolutni HTTPS `rel="canonical"`;
 *   2. nijedna prenesena stranica (`/prenos/…`) ne kanonizira sebe;
 *   3. nijedan web nema dvije stranice s istom kanonskom adresom;
 *   4. nijedan web nema dvije stranice s istim naslovom i istim tijelom
 *         (tiha dvostruka objava iste stvari).
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name === 'index.html') out.push(full);
  }
  return out;
};

const SITES = join(ROOT, 'apps/sites/site');
const webs = existsSync(SITES) ? readdirSync(SITES).filter((name) => statSync(join(SITES, name)).isDirectory()) : [];
let pages = 0;
let copied = 0;

for (const web of webs) {
  const byCanonical = new Map();
  const byBody = new Map();

  /* Vlastita adresa weba: kanonik naslovnice. Sve ostale vlastite adrese
     izvode se iz putanje datoteke, jer `og:url` na prenesenoj stranici
     namjerno pokazuje na izvornik, a ne na ovu kopiju. */
  const homeFile = join(SITES, web, 'index.html');
  const home = existsSync(homeFile)
    ? ((readFileSync(homeFile, 'utf8').match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '').replace(/\/$/, '')
    : '';

  for (const file of walk(join(SITES, web))) {
    pages += 1;
    const rel = relative(ROOT, file);
    const html = readFileSync(file, 'utf8');
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];

    if (!canonical) { fails.push(`${rel}: nema canonical`); continue; }
    check(/^https:\/\//.test(canonical), `${rel}: canonical nije apsolutni HTTPS (${canonical.slice(0, 60)})`);

    /* Vlastita adresa ove stranice, izvedena iz putanje weba. */
    const subpath = relative(join(SITES, web), file).replace(/index\.html$/, '');
    const self = home ? `${home}/${subpath}`.replace(/\/{2,}/g, '/').replace(/^https:\//, 'https://') : '';
    const isCopiedText = (rel.includes('/prenos/') || rel.includes('/kolumna/'))
      && subpath.split('/').filter(Boolean).length > 1;
    if (isCopiedText) {
      copied += 1;
      check(!self || canonical !== self, `${rel}: prenesena stranica kanonizira samu sebe (${canonical.slice(0, 70)})`);
    }

    /* Dvije stranice istog weba ne smiju dijeliti kanonsku adresu. */
    if (byCanonical.has(canonical)) fails.push(`${rel}: ista kanonska adresa kao ${byCanonical.get(canonical)}`);
    else byCanonical.set(canonical, rel);

    /* Isti naslov i isto tijelo — tiha dvostruka objava. */
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const body = (html.match(/<article[\s\S]*?<\/article>/) || [''])[0].replace(/\s+/g, ' ').slice(0, 4000);
    if (title && body) {
      const key = `${title}\u0000${body}`;
      if (byBody.has(key)) fails.push(`${rel}: isti naslov i tijelo kao ${byBody.get(key)}`);
      else byBody.set(key, rel);
    }
  }
}

if (!pages) fails.push('nijedna stranica nije pronađena');

const report = {
  version: 'AKTUAL_MEDIA_NO_DUPLICATE_CONTENT_V1',
  webs: webs.length,
  pages,
  copied,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 15).join('\n'));
  if (fails.length > 15) console.error(`… i još ${fails.length - 15}`);
  process.exit(1);
}
