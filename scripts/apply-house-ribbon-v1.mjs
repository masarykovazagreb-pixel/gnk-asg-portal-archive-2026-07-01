#!/usr/bin/env node
/**
 * ZNAK KUĆE NA SVAKOJ STRANICI PORTALA.
 *
 * Mreža AKTUAL MEDIA ima jedan znak i jedno ime. Generatori ga već ispisuju
 * na novim stranicama, ali starije rukom pisane stranice (objave, komentari,
 * analize, tematske, arhive) imaju samo zaglavlje portala. Ovaj skript ih
 * dopunjuje bez diranja sadržaja:
 *
 *   - umeće traku kuće na vrh tijela, ispod veze za preskok a iznad zaglavlja
 *     (znak, ime, izdanje, veza na matičnu mrežu) i jednom `<link>` na
 *     /assets/house-ribbon-v1.css; nikad unutar <main>, da ne ulazi u mjeru
 *     članka;
 *   - preskače stranice koje traku već imaju, noindex preusmjerene stranice,
 *     alate i sve što nije javna stranica;
 *   - idempotentan je: drugi prolaz ne mijenja ništa.
 *
 *   node scripts/apply-house-ribbon-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { applyHouseRibbon } from './lib/house-ribbon-v1.mjs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const CHECK = process.argv.includes('--check');
const CSS_HREF = '/assets/house-ribbon-v1.css?v=20261024';
const MARK = 'am-ribbon';

const SKIP = new Set([
  'admin', 'admin-center', 'admin-login', 'control', 'automation-status', 'webmail',
  'mail-studio', 'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard',
  'digital-headquarters', 'media-registration-admin', 'podijeli', 'api', 'assets',
  'data', '__preview'
]);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      const rel = relative(PORTAL, full).split(/[\\/]/);
      if (rel[0] === 'en' && SKIP.has(rel[1])) continue;
      if (SKIP.has(rel[0])) continue;
      walk(full, out);
    } else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

const ribbon = (lang) => {
  const en = lang === 'en';
  const alt = en ? 'AKTUAL MEDIA — network mark' : 'AKTUAL MEDIA — znak mreže';
  const label = en ? 'AKTUAL MEDIA — network home' : 'AKTUAL MEDIA — matična mreža';
  const edition = en ? 'AKTUAL MEDIA network' : 'mreža AKTUAL MEDIA';
  return `<div class="${MARK}"><a class="${MARK}-brand" href="https://gnk-asg.hr/" rel="external noopener" aria-label="${esc(label)}"><img src="/assets/brand/aktual-media-mark.svg" alt="${esc(alt)}" width="72" height="72" loading="lazy" decoding="async"><span>AKTUAL MEDIA</span></a><span class="${MARK}-ed"><b>${esc(edition)}</b></span></div>`;
};

let scanned = 0;
let added = 0;
let skipped = 0;
const changed = [];

for (const file of walk(PORTAL)) {
  scanned += 1;
  let html = readFileSync(file, 'utf8');
  /* applyHouseRibbon sam prepoznaje ispravno mjesto trake; ovdje se ne
     preskače po pukom postojanju oznake jer traka znade stajati dublje,
     unutar <main>, gdje ulazi u mjeru članka. */
  const applied = applyHouseRibbon(html);
  if (!applied.changed) { skipped += 1; continue; }
  html = applied.html;
  added += 1;
  changed.push(relative(ROOT, file).split(/[\\/]/).join('/'));
  if (!CHECK) writeFileSync(file, html);
}

console.log(JSON.stringify({
  version: 'GNK_ASG_HOUSE_RIBBON_V1_20261024',
  mode: CHECK ? 'check' : 'write',
  scanned,
  added,
  skipped,
  changed: CHECK ? changed.slice(0, 20) : undefined
}, null, 2));

if (CHECK && added) {
  console.error(`Traka kuće nedostaje na ${added} stranica; pokreni bez --check.`);
  process.exitCode = 1;
}
void existsSync;
