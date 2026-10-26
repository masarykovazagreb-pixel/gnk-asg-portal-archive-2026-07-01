#!/usr/bin/env node
/**
 * AUTORSKA TRAKA — popravni sloj za rukom pisane stranice.
 *
 * Generatori (region, world, kanal, tjednik, sites, arhiva, dnevnik) traku
 * upisuju sami. Ovaj skript pokriva stranice koje nitko ne generira: naslovnicu
 * portala, uredničke stranice, galerije i starije izlaze.
 *
 * Traka nema ugrađenog stila — CSS je u vanjskom listu weba.
 *
 * Pokretanje:
 *   node scripts/apply-author-band-v1.mjs [--dry-run] [--check]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authorBand, AUTHOR_BAND_CSS, AUTHOR_BAND_VERSION, AUTHOR_PORTRAIT, ensureAuthorPortrait } from '../apps/shared/author-band-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');
const CHECK = process.argv.includes('--check');

const SKIP = new Set([
  'admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio', 'campaign-mailer',
  'email-status', 'worker-ops', 'operator-dashboard', 'digital-headquarters',
  'media-registration-admin', 'api', 'assets', 'data', '__preview', 'app', 'synapse-demo',
  'pulse-demo', 'workers', 'scripts'
]);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (SKIP.has(name)) continue;
      walk(full, out);
    } else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

const langOf = (html) => (html.match(/<html[^>]*\blang="([a-zA-Z-]+)"/) || [])[1] || 'hr';

/* Jedan popis weba: izlaz + način na koji traka dolazi do portreta. */
const WEBS = [
  { dir: 'apps/portal', portrait: '/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp', city: null },
  { dir: 'apps/arhiva/site', portrait: '/assets/people/nermin-sefic.webp', city: null },
  { dir: 'apps/dnevnik/site', portrait: '/assets/people/nermin-sefic.webp', city: null },
  { dir: 'apps/kanal/site', portrait: '/assets/nermin-sefic-portrait.webp', city: null },
  { dir: 'apps/tjednik/site', portrait: '/assets/people/nermin-sefic.webp', city: null },
  { dir: 'apps/world/site', portrait: '/assets/people/nermin-sefic.webp', city: null },
  { dir: 'apps/sites/site', portrait: '/assets/people/nermin-sefic.webp', city: null }
];

/* Vanjski list trake: bez njega bi traka bila goli tekst sa slikom u punoj
   veličini. Jedan list za cijelu maticu; izdanja imaju vlastiti region.css. */
const CSS_FILE = join(ROOT, 'apps', 'portal', 'assets', 'author-band-v1.css');
const CSS_LINK = '<link rel="stylesheet" href="/assets/author-band-v1.css?v=20261025">';
if (!DRY && !CHECK && !existsSync(CSS_FILE)) {
  mkdirSync(dirname(CSS_FILE), { recursive: true });
  writeFileSync(CSS_FILE, `${AUTHOR_BAND_CSS}\n`);
}

const withCss = (html) => (html.includes('/assets/author-band-v1.css')
  ? html
  : html.replace(/<\/head>/i, `${CSS_LINK}\n</head>`));

let edited = 0;
let skipped = 0;
let portraits = 0;
const stale = [];

for (const web of WEBS) {
  const dir = join(ROOT, web.dir);
  if (!existsSync(dir)) continue;
  if (!DRY && !CHECK) {
    /* Portret u korijen weba. Putanja je apsolutna (`/assets/people/…`), pa
       kopije u podmapama nisu potrebne — a stvarale su tuđe `assets/` mape
       (npr. `portal/reports/assets`) koje sljedeći sloj pogrešno proglašava
       korijenom weba. */
    if (ensureAuthorPortrait(AUTHOR_PORTRAIT, dir)) portraits += 1;
  }
  for (const file of walk(dir)) {
    const html = readFileSync(file, 'utf8');
    if (html.includes('data-am-author="v1"')) {
      /* Traka već postoji — provjeri samo da list s njezinim stilom nije
         izgubljen (starije stranice imaju traku, ali ne i CSS). */
      const hasCss = /author-band-v1\.css|region\.css|kanal\.css|tjednik\.css|site\.css/.test(html);
      if (!hasCss && /<\/head>/i.test(html) && !CHECK) {
        const fixed = withCss(html);
        if (fixed !== html) { writeFileSync(file, fixed); edited += 1; continue; }
      }
      skipped += 1;
      continue;
    }
    if (/http-equiv="refresh"/i.test(html)) continue;
    if (/^google[0-9a-f]+\.html$/i.test(file.split('/').pop())) continue;
    const marker = /<\/footer>/i.test(html) ? '</footer>' : (/<\/body>/i.test(html) ? '</body>' : null);
    if (!marker) continue;
    if (CHECK) { stale.push(relative(ROOT, file)); continue; }
    const band = authorBand(langOf(html), web.city, { portrait: web.portrait });
    const out = withCss(html.replace(marker, `${band}\n${marker}`));
    if (!DRY) writeFileSync(file, out);
    edited += 1;
  }
}

/* Gradska izdanja: portret po izdanju i put do njega. */
const kanalRoot = join(ROOT, 'apps', 'portal', 'kanal');
if (existsSync(kanalRoot)) {
  for (const city of readdirSync(kanalRoot)) {
    const dir = join(kanalRoot, city);
    if (!statSync(dir).isDirectory() || city === 'assets' || city === 'data') continue;
    if (!DRY && !CHECK) ensureAuthorPortrait(AUTHOR_PORTRAIT, dir);
    const index = join(dir, 'index.html');
    if (!existsSync(index)) continue;
    const html = readFileSync(index, 'utf8');
    if (html.includes('data-am-author="v1"')) {
      /* Traka već postoji — provjeri samo da list s njezinim stilom nije
         izgubljen (starije stranice imaju traku, ali ne i CSS). */
      const hasCss = /author-band-v1\.css|region\.css|kanal\.css|tjednik\.css|site\.css/.test(html);
      if (!hasCss && /<\/head>/i.test(html) && !CHECK) {
        const fixed = withCss(html);
        if (fixed !== html) { writeFileSync(file, fixed); edited += 1; continue; }
      }
      skipped += 1;
      continue;
    }
    if (CHECK) { stale.push(relative(ROOT, index)); continue; }
    const band = authorBand(langOf(html), city);
    const marker = /<\/footer>/i.test(html) ? '</footer>' : '</body>';
    if (!DRY) writeFileSync(index, withCss(html.replace(marker, `${band}\n${marker}`)));
    edited += 1;
  }
}

const result = {
  version: AUTHOR_BAND_VERSION,
  dryRun: DRY,
  check: CHECK,
  edited,
  skipped,
  portraits,
  stale: stale.length,
  staleSample: stale.slice(0, 10),
  ok: CHECK ? stale.length === 0 : true
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
