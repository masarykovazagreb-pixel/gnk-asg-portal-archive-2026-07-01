#!/usr/bin/env node
/**
 * OSVJEŽAVANJE NA SVAKOJ STRANICI — jedan sloj, svi webovi.
 *
 * Problem: svaka stranica mreže je statična. Posjetitelj nema način provjeriti
 * je li ono što gleda jučerašnje ili današnje, a uredništvo nema način da iz
 * preglednika vidi koje stranice zaostaju. Dosad je osvježavanje radilo samo
 * na portalu (`browser-data-refresh.js`) i samo za tržišne podatke.
 *
 * Rješenje: jedan mali modul (`apps/portal/assets/am-refresh-v1.js`) koji
 *   • pokazuje podatkovni dan iz kojeg su brojke izračunate,
 *   • ponovno provjeri ima li novijeg zapisa i ponudi osvježavanje,
 *   • ne šalje nijedan zahtjev dok je kartica skrivena,
 *   • ne dira sadržaj stranice i ne mijenja nijedan meta podatak.
 *
 * Sloj je idempotentan: drugo pokretanje ne mijenja ništa. Datum u upitu
 * dolazi iz podataka (`network-counts-v1.json`), nikad iz sata — inače bi
 * svaka gradnja proizvela drugačije bajtove.
 *
 * Pokretanje:
 *   node scripts/apply-refresh-v1.mjs            # svi webovi
 *   node scripts/apply-refresh-v1.mjs --check    # padne ako neka stranica nema modul
 *   node scripts/apply-refresh-v1.mjs --only=portal
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const SOURCE = join(PORTAL, 'assets', 'am-refresh-v1.js');
const CHECK = process.argv.includes('--check');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1] : '';

const counts = (() => {
  try { return JSON.parse(readFileSync(join(PORTAL, 'data', 'network-counts-v1.json'), 'utf8')); } catch { return {}; }
})();
const DATA_DAY = counts.dataDay || counts.generatedAt || '';
if (!DATA_DAY) {
  console.error('Nema podatkovnog dana — pokreni node scripts/build-network-counts-v1.mjs');
  process.exit(1);
}

const TAG = `<script src="/assets/am-refresh-v1.js?v=${DATA_DAY}" data-am-netday="${DATA_DAY}" defer></script>`;
const MARKER = 'data-am-netday';

/* Webovi: svaki ima svoj korijen i svoju mapu asseta. */
const WEBS = [
  { id: 'portal', root: PORTAL, assets: join(PORTAL, 'assets') },
  { id: 'world', root: join(ROOT, 'apps', 'world', 'site'), assets: join(ROOT, 'apps', 'world', 'site', 'assets') },
  { id: 'kanal', root: join(ROOT, 'apps', 'kanal', 'site'), assets: join(ROOT, 'apps', 'kanal', 'site', 'assets') },
  { id: 'arhiva', root: join(ROOT, 'apps', 'arhiva', 'site'), assets: join(ROOT, 'apps', 'arhiva', 'site', 'assets') },
  { id: 'dnevnik', root: join(ROOT, 'apps', 'dnevnik', 'site'), assets: join(ROOT, 'apps', 'dnevnik', 'site', 'assets') },
  { id: 'sites', root: join(ROOT, 'apps', 'sites', 'site'), assets: join(ROOT, 'apps', 'sites', 'site', 'assets') }
];

/* Stranice koje nisu javne (administracija, alati) ne dobivaju traku. */
const SKIP_DIRS = new Set(['admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio',
  'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard', 'digital-headquarters',
  'media-registration-admin', 'api', 'assets', 'data', '__preview', 'app', 'synapse-demo', 'pulse-demo']);

const walk = (dir, out = [], depth = 0) => {
  if (!existsSync(dir) || depth > 8) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, out, depth + 1);
    } else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

let pages = 0;
let injected = 0;
let missing = [];

if (!existsSync(SOURCE)) {
  console.error(`Nema modula: ${relative(ROOT, SOURCE)}`);
  process.exit(1);
}

for (const web of WEBS) {
  if (ONLY && ONLY !== web.id) continue;
  if (!existsSync(web.root)) continue;

  /* Modul mora postojati na svakom webu (vlastita domena, vlastiti asseti). */
  if (!CHECK) {
    mkdirSync(web.assets, { recursive: true });
    const target = join(web.assets, 'am-refresh-v1.js');
    const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
    const source = readFileSync(SOURCE, 'utf8');
    if (current !== source) copyFileSync(SOURCE, target);
  } else if (web.id !== 'portal' && !existsSync(join(web.assets, 'am-refresh-v1.js'))) {
    missing.push(`${web.id}: nema assets/am-refresh-v1.js`);
  }

  for (const file of walk(web.root)) {
    pages += 1;
    const rel = relative(ROOT, file);
    const html = readFileSync(file, 'utf8');
    if (!/<\/body>/i.test(html)) continue;
    if (html.includes(MARKER)) {
      /* Već ima modul — provjeri je li verzija ista; ako nije, zamijeni. */
      const current = (html.match(/<script[^>]*data-am-netday="[^"]*"[^>]*><\/script>/) || [])[0];
      if (current === TAG) continue;
      if (CHECK) { missing.push(`${rel}: zastarjela verzija modula`); continue; }
      writeFileSync(file, html.replace(current, TAG));
      injected += 1;
      continue;
    }
    if (CHECK) { missing.push(`${rel}: bez modula osvježavanja`); continue; }
    writeFileSync(file, html.replace(/<\/body>/i, `${TAG}\n</body>`));
    injected += 1;
  }
}

const report = {
  version: 'AKTUAL_MEDIA_REFRESH_LAYER_V1',
  dataDay: DATA_DAY,
  pages,
  injected,
  failures: missing.length,
  ok: missing.length === 0,
  ...(CHECK ? {} : { check: undefined })
};
delete report.check;
console.log(JSON.stringify(report, null, 2));
if (missing.length) {
  console.error(missing.slice(0, 10).join('\n'));
  if (missing.length > 10) console.error(`… i još ${missing.length - 10}`);
  process.exit(1);
}
