#!/usr/bin/env node
/**
 * DIZAJN SUSTAV — jedan rječnik na svakom webu mreže.
 *
 * Provjera ne gleda dojam, nego izlaz: svaka javna stranica mora nositi isti
 * token blok (`#am-design-v1`), s istim imenima i bez duplikata. Ako generator
 * zaboravi blok, stranica se tiho vraća na svoje boje i mreža se raspada na
 * dvadeset izgleda — zato ovaj gate pada.
 *
 * Dodatno: zajedničke komponente (razmjena, mreža, traka) moraju čitati iste
 * tokene, a ne svoje fiksne vrijednosti.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKENS, DESIGN_ID } from '../apps/shared/design-system-v1.mjs';
import { EXCHANGE_CSS } from '../apps/satellites/lib/razmjena-v1.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

/* Opseg: sve što čitatelj može otvoriti iz mreže. Administracija i alati
   imaju vlastiti strogi CSP i svoj dizajn, pa nisu dio ovog ugovora. */
const SKIP_SEGMENTS = new Set([
  'admin', 'admin-center', 'admin-login', 'automation-status', 'webmail', 'mail-studio',
  'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard', 'api', 'assets',
  'data', '__preview', 'app', 'workers', 'scripts', 'digital-headquarters',
  'media-registration-admin', 'control', 'pulse-demo', 'synapse-demo', 's-chat', 'visual-index'
]);

const files = [];
for (const base of ['apps/portal', 'apps/sites/site', 'apps/world/site', 'apps/arhiva/site', 'apps/dnevnik/site', 'apps/kanal/site']) {
  for (const file of walk(join(ROOT, base))) {
    const rel = file.slice(join(ROOT, base).length + 1);
    if (rel.split('/').some((segment) => SKIP_SEGMENTS.has(segment))) continue;
    /* Stranice greške (404) imaju vlastiti, strogi CSP bez inline stila — za
       njih vrijedi ugovor sigurnosnih zaglavlja, ne dizajn sustav. */
    if (/^(404|50\d)\.html$/.test(rel)) continue;
    files.push(file);
  }
}

let withTokens = 0;
let duplicates = 0;
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  if (!/<html[\s>]/i.test(html)) continue;
  const blocks = (html.match(new RegExp(`id="${DESIGN_ID}"`, 'g')) || []).length;
  /* Stranice sa strogim CSP-om nose isti token list kao vanjsku datoteku. */
  const linked = /<link[^>]+data-am-design="v1"/.test(html);
  if (blocks + (linked ? 1 : 0) > 1) { duplicates += 1; check(false, `${file.slice(ROOT.length + 1)}: token blok ${blocks + 1} puta`); continue; }
  if (!blocks && !linked) {
    check(false, `${file.slice(ROOT.length + 1)}: nema token blok (${DESIGN_ID})`);
    continue;
  }
  withTokens += 1;
}

/* Blok mora nositi sve tokene, ne samo svoje ime. Portal nosi vanjski list
   (isti sadržaj), pa se uzorak čita iz njega; generatori nose ugrađeni blok. */
const sample = readFileSync(join(ROOT, 'apps/sites/site/bor-usa/index.html'), 'utf8');
const block = (sample.match(new RegExp(`<style id="${DESIGN_ID}"[\\s\\S]*?</style>`)) || [''])[0];
check(Boolean(block), 'bor-usa: token blok nije pronađen');

const assetFile = join(ROOT, 'apps/portal/assets/am-design-v1.css');
check(existsSync(assetFile), 'portal: vanjski token list ne postoji');
const assetCss = existsSync(assetFile) ? readFileSync(assetFile, 'utf8') : '';
for (const token of Object.keys(TOKENS)) {
  check(assetCss.includes(token), `vanjski token list ne nosi ${token}`);
}
for (const token of Object.keys(TOKENS)) {
  check(block.includes(token), `token blok ne nosi ${token}`);
}
check(/prefers-reduced-motion/.test(block), 'token blok ne poštuje smanjeno kretanje');
check(/focus-visible/.test(block), 'token blok ne jamči vidljiv fokus');

/* Zajednička komponenta mora čitati tokene, ne fiksne vrijednosti. */
check(/var\(--amd-/.test(EXCHANGE_CSS), 'razmjena ne čita --amd- tokene');

/* Dva weba iste mreže ne smiju imati različit token blok za iste vrijednosti:
   blok je funkcija, pa se na svakoj stranici mora pojaviti isti tekst. */
const portalBlock = assetCss;
const siteBlock = block;
const same = (a, b) => {
  const tokensOf = (css) => [...css.matchAll(/(--amd-[a-z0-9-]+):([^;}]*)/g)].map((m) => `${m[1]}=${m[2].trim()}`).sort();
  return JSON.stringify(tokensOf(a)) === JSON.stringify(tokensOf(b));
};
check(same(portalBlock, siteBlock), 'portal i BOR USA nemaju isti skup tokena');

const report = {
  version: 'AKTUAL_MEDIA_DESIGN_SYSTEM_V1',
  pages: files.length,
  withTokens,
  duplicates,
  tokens: Object.keys(TOKENS).length,
  failures: fails.length
};
console.log(JSON.stringify({ ...report, ok: fails.length === 0 }, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 20).join('\n'));
  if (fails.length > 20) console.error(`… i još ${fails.length - 20}`);
  process.exit(1);
}
