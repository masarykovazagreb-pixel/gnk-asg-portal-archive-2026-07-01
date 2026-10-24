#!/usr/bin/env node
/**
 * DIZAJN SUSTAV — sloj za rukom pisane stranice portala.
 *
 * Generatori (kanali, svjetski portali, samostalni webovi, arhiva, dnevnik,
 * KANAL) ugrađuju token blok sami, pa im je izlaz reproducibilan i test
 * svježine ga ne vidi kao zaostatak.
 *
 * Portal ide drugim putem: jedan vanjski list `/assets/am-design-v1.css`, koji
 * vrijedi za sve rute i ne krši nijednu politiku sadržaja. Ugrađeni stil na
 * portalu ne dolazi u obzir — dio ruta ima `style-src 'self'` bez
 * `'unsafe-inline'`, a dio (proizvodi, status, alati) drži pravilo da HTML ne
 * nosi stil nego ga učitava.
 *
 *   node scripts/apply-design-tokens-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withDesignTokensLink, designTokensFile, DESIGN_ID } from '../apps/shared/design-system-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const ASSET = join(PORTAL, 'assets', 'am-design-v1.css');
const CHECK = process.argv.includes('--check');

/* Alati, administracija i tehničke datoteke nisu javne stranice. */
const SKIP = new Set([
  'admin', 'admin-center', 'admin-login', 'control', 'automation-status', 'webmail',
  'mail-studio', 'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard',
  'digital-headquarters', 'media-registration-admin', 'api', 'assets', 'data', '__preview',
  'app', 'synapse-demo', 'pulse-demo', 'workers', 'scripts'
]);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (SKIP.has(relative(PORTAL, full).split('/')[0])) continue;
      walk(full, out);
    } else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

let scanned = 0;
let changed = 0;
const missing = [];

/* List je izveden iz istog modula kao i ugrađeni blok — dvije kopije tokena
   ne postoje, pa se ne mogu razići. */
const css = designTokensFile();
const cssCurrent = existsSync(ASSET) ? readFileSync(ASSET, 'utf8') : '';
if (cssCurrent !== css) {
  if (CHECK) missing.push(relative(ROOT, ASSET));
  else {
    mkdirSync(dirname(ASSET), { recursive: true });
    writeFileSync(ASSET, css);
    changed += 1;
  }
}

for (const file of walk(PORTAL)) {
  const html = readFileSync(file, 'utf8');
  scanned += 1;
  if (!/<html[\s>]/i.test(html)) continue;

  /* Stranica koja je prije dobila ugrađeni blok (stariji sloj) vraća se na
     vanjski list — portal ne nosi stil u HTML-u. */
  let prepared = html;
  if (prepared.includes(`id="${DESIGN_ID}"`)) {
    prepared = prepared.replace(new RegExp(`<style id="${DESIGN_ID}"[\\s\\S]*?</style>\\s*`), '');
  }
  if (prepared.includes('data-am-design="v1"')) continue;

  const next = withDesignTokensLink(prepared);
  if (next === prepared) continue;
  const rel = relative(ROOT, file);
  if (CHECK) { missing.push(rel); continue; }
  writeFileSync(file, next);
  changed += 1;
}

const report = {
  version: 'AKTUAL_MEDIA_DESIGN_TOKENS_V1',
  mode: CHECK ? 'check' : 'apply',
  scanned,
  changed,
  missing: CHECK ? missing.length : 0
};
console.log(JSON.stringify(report, null, 2));
if (CHECK && missing.length) {
  console.error(`Bez token lista: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ` … i još ${missing.length - 10}` : ''}`);
  process.exit(1);
}
