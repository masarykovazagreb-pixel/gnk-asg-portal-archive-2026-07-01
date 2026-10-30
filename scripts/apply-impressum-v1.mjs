#!/usr/bin/env node
/**
 * IMPRESSUM + IKONA — popravni sloj za rukom pisane stranice.
 *
 * Generatori (region, world, kanal, tjednik, sites, arhiva, dnevnik) sada sami
 * upisuju impressum i traku urednika. Ostaju stranice koje nitko ne generira:
 * naslovnice portala, uredničke stranice, galerije, stari izlazi. Ovaj skript
 * ih pronalazi i dopunjava bez diranja sadržaja.
 *
 * Pravila:
 *   - preusmjerivači (http-equiv="refresh") se preskaču — nisu stranice;
 *   - Googleova potvrda vlasništva nije stranica — preskače se;
 *   - blok se ne dodaje dvaput (marker `data-am-impressum`);
 *   - ikona se dodaje u `<head>` ako je nema.
 *
 * Pokretanje:
 *   node scripts/apply-impressum-v1.mjs [--root apps/portal] [--refresh] [--icon] [--dry-run] [--check]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { impressumBlock } from '../apps/shared/impressum-v1.mjs';
import { refreshTag } from '../apps/shared/refresh-tag-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
};
const ALL = process.argv.includes('--all');
/* Sedam webova mreže — sloj mora pokriti svaki, ne samo maticu. */
const ROOTS = ['apps/portal', 'apps/world/site', 'apps/sites/site', 'apps/tjednik/site',
  'apps/kanal/site', 'apps/arhiva/site', 'apps/dnevnik/site'];
// Korijeni "…/site" su generirani izlazi (u .gitignore). Ako generator nije
// pokrenut u tom koraku (npr. deploy samo region), korijena nema — to nije
// greška, nema stranica za obraditi.
const TARGETS = (ALL ? ROOTS.map((r) => join(ROOT, r)) : [join(ROOT, arg('--root') || 'apps/portal')])
  .filter((t) => existsSync(t));
const DRY = process.argv.includes('--dry-run');
const CHECK = process.argv.includes('--check');
const REFRESH = process.argv.includes('--refresh');
const ICON = process.argv.includes('--icon');

/* Alati, administracija i tehničke datoteke nisu javne stranice. */
const SKIP = new Set([
  'admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio', 'campaign-mailer',
  'email-status', 'worker-ops', 'operator-dashboard', 'digital-headquarters',
  'media-registration-admin', 'api', 'assets', 'data', '__preview', 'app', 'synapse-demo',
  'pulse-demo', 'workers', 'scripts'
]);

const ICON_TAG = '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">';

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
const isGoogle = (file) => /^google[0-9a-f]+\.html$/i.test(file.split('/').pop());

let scanned = 0;
let patched = 0;
let redirects = 0;
let skippedNoBody = 0;
const pending = [];
const perRoot = [];

for (const TARGET of TARGETS) {
const before = { scanned, patched };
for (const file of walk(TARGET)) {
  scanned += 1;
  const html = readFileSync(file, 'utf8');
  if (/http-equiv="refresh"/i.test(html) || isGoogle(file)) { redirects += 1; continue; }

  const needsImpressum = !html.includes('data-am-impressum');
  const needsRefresh = REFRESH && !/data-am-refresh|am-refresh-v1\.js/.test(html);
  const needsIcon = ICON && !/rel="icon"/i.test(html);
  if (!needsImpressum && !needsRefresh && !needsIcon) continue;

  if (!/<\/body>/i.test(html)) { skippedNoBody += 1; continue; }
  if (CHECK) { pending.push(relative(ROOT, file)); continue; }

  let out = html;
  if (needsIcon && /<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `${ICON_TAG}\n</head>`);
  if (needsImpressum) out = out.replace(/<\/body>/i, `${impressumBlock(langOf(html))}\n</body>`);
  if (needsRefresh) {
    const tag = refreshTag('/');
    if (tag) out = out.replace(/<\/body>/i, `${tag}\n</body>`);
  }
  if (!DRY) writeFileSync(file, out);
  if (process.argv.includes('--verbose')) console.log('patched', file.slice(ROOT.length + 1));
  patched += 1;
}

perRoot.push({ root: relative(ROOT, TARGET), scanned: scanned - before.scanned, patched: patched - before.patched });
}

const result = {
  version: 'AKTUAL_MEDIA_IMPRESSUM_LAYER_V1',
  roots: perRoot,
  dryRun: DRY,
  check: CHECK,
  scanned,
  patched,
  redirects,
  skippedNoBody,
  pending: pending.length,
  pendingSample: pending.slice(0, 10),
  ok: CHECK ? pending.length === 0 : true
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
