#!/usr/bin/env node
/**
 * IKONA KUĆE MORA POSTOJATI — svaka stranica, ista datoteka.
 *
 * `audit-brand-contract-v1.mjs` traži da `<link rel="icon">` vodi na datoteku
 * koja stvarno postoji i da je to znak kuće. Kad generator napiše
 * `/assets/favicon.svg`, a mapa `assets/` uz tu stranicu nema ikone, audit je u
 * pravu — stranica je obećala sliku koju poslužitelj ne može dati.
 *
 * Alat ne mijenja HTML. Gleda gdje stranica kaže da joj je ikona i, ako je
 * nema, kopira kanonski znak na to mjesto. Idempotentan je; `--check` samo
 * nabraja.
 *
 *   node scripts/ensure-house-icons-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAVICON_SVG } from '../apps/shared/brand/brand-mark-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const ROOTS = ['apps/portal', 'apps/world/site', 'apps/sites/site', 'apps/tjednik/site',
  'apps/kanal/site', 'apps/arhiva/site', 'apps/dnevnik/site'];
const SKIP = new Set(['node_modules', '.git', 'assets', 'data', '__preview']);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

const webRootOf = (file) => {
  let dir = dirname(file);
  while (dir !== ROOT && !existsSync(join(dir, 'assets'))) {
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return existsSync(join(dir, 'assets')) ? dir : ROOT;
};

let created = 0;
const pending = [];
const wrongHref = [];

for (const relRoot of ROOTS) {
  const dir = join(ROOT, relRoot);
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const html = readFileSync(file, 'utf8');
    const m = /<link rel="icon" href="([^"]+)"/i.exec(html);
    if (!m) continue;
    const href = m[1].split('?')[0];
    if (/^https?:/i.test(href)) continue;
    const target = href.startsWith('/')
      ? join(webRootOf(file), href)
      : resolve(dirname(file), href);
    if (existsSync(target)) {
      /* Ako datoteka postoji, ali nije znak kuće, ne diramo je ovdje —
         to je stvar generatora, ne ovog sloja. */
      continue;
    }
    /* Ne izmišljamo datoteku pod tuđim imenom: ako stranica za ikonu kaže
       `logo-…svg`, to je pogreška u generatoru, ne u ovoj mapi. */
    if (!/\/favicon[^/]*\.svg$/i.test(target)) {
      wrongHref.push(`${relative(ROOT, file)} → ${href}`);
      continue;
    }
    pending.push(relative(ROOT, target));
    if (CHECK) continue;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${FAVICON_SVG.trim()}\n`);
    created += 1;
  }
}

console.log(JSON.stringify({
  ok: true,
  mode: CHECK ? 'check' : 'write',
  created,
  missingNow: CHECK ? pending.length : 0,
  sample: pending.slice(0, 10),
  wrongHref: wrongHref.slice(0, 10),
  wrongHrefCount: wrongHref.length
}, null, 2));
