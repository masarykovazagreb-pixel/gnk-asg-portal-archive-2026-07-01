#!/usr/bin/env node
/**
 * JEDAN ZNAK ZA CIJELU MREŽU.
 *
 * Do 24. 10. 2026. svaki je web imao svoj favicon u obliku slova — "B" za
 * Beograd, "N" za Nairobi, "K" za Kanal Zagreb. Na kartici preglednika tako
 * je stajalo trideset i jedno različito slovo, a nijedno nije bilo znak kuće.
 * Kad čitatelj otvori pet izdanja, pet je ikona; mreža se ne prepoznaje.
 *
 * Od sada: jedan crtež, jedne boje, jedan oblik — znak AKTUAL MEDIA (slovo A
 * na tamnoplavoj podlozi, zlatna crta ispod). Izdanje se razlikuje imenom u
 * naslovu i bojom stranice, ne znakom.
 *
 * Skripta radi tri stvari, idempotentno:
 *  1. u svaki web upisuje iste bajtove `apps/shared/brand/favicon.svg`;
 *  2. u svaki web kopira `aktual-media-mark.svg` (za zaglavlje i podnožje);
 *  3. u `<head>` svake stranice koja nema ikonu dodaje lokalnu `<link rel="icon">`.
 *
 *   node scripts/apply-brand-mark-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const FAVICON = readFileSync(join(ROOT, 'apps/shared/brand/favicon.svg'), 'utf8');
const MARK = readFileSync(join(ROOT, 'apps/portal/assets/brand/aktual-media-mark.svg'), 'utf8');

/* Svaki web mreže ima svoj korijen izlaza i svoj `assets/`. */
const SITES = [
  'apps/portal',
  'apps/sites/site',
  'apps/world/site',
  'apps/arhiva/site',
  'apps/dnevnik/site',
  'apps/kanal/site',
  'apps/tjednik/site'
];

const SKIP_DIRS = new Set([
  'admin', 'admin-center', 'admin-login', 'automation-status', 'webmail', 'mail-studio',
  'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard', 'api', 'data',
  '__preview', 'app', 'workers', 'scripts', 'digital-headquarters',
  'media-registration-admin', 'control', 'pulse-demo', 'synapse-demo'
]);

const written = [];
const pending = [];
const pagesChanged = [];

const dirs = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    out.push(full);
    dirs(full, out);
  }
  return out;
};

/* 1 + 2. Znak i favicon u svaki web koji ima `assets/`. */
const targets = [];
for (const base of SITES) {
  const abs = join(ROOT, base);
  if (!existsSync(abs)) continue;
  /* apps/portal/assets je zajednički korijen portala; kanali imaju svoj. */
  for (const dir of [abs, ...dirs(abs)]) {
    if (!dir.endsWith('/assets')) continue;
    targets.push(dir);
  }
}

for (const dir of targets) {
  const favicon = join(dir, 'favicon.svg');
  const mark = join(dir, 'aktual-media-mark.svg');
  /* Arhiva i dnevnik drže ikonu i pod `assets/brand/` (tako je zove njihov
     `alternate` link). Ako ta putanja postoji, mora nositi isti crtež. */
  const brandIcon = join(dir, 'brand', 'favicon.svg');
  const pairs = [[favicon, FAVICON], [mark, MARK]];
  if (existsSync(brandIcon)) pairs.push([brandIcon, FAVICON]);
  for (const [file, content] of pairs) {
    const current = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (current === content) continue;
    if (CHECK) pending.push(relative(ROOT, file));
    else {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
      written.push(relative(ROOT, file));
    }
  }
}

/* 3. Ikona u zaglavlju svake stranice koja je nema. */
const ICON = '<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">';
const walkPages = (dir, base, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walkPages(full, base, out);
    } else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

for (const base of SITES) {
  const root = join(ROOT, base);
  if (!existsSync(root)) continue;
  const siteRoots = base === 'apps/portal' || base.endsWith('/site')
    ? [root, ...dirs(root).filter((d) => existsSync(join(d, 'index.html')) && dirname(join(d, 'index.html')) !== root)]
    : [root];

  for (const page of walkPages(root, base)) {
    const rel = relative(root, page);
    if (rel.split('/').some((segment) => SKIP_DIRS.has(segment))) continue;
    /* Ikona se računa od KORIJENA WEBA (mape koja ima `assets/`), ne od
       korijena cijelog stabla: `sites/site/bor-usa/en/index.html` traži
       `../assets/favicon.svg`, a ne `../../assets/`. Zato se put traži
       penjanjem dok se ne nađe mapa s ikonom. */
    let webRoot = dirname(page);
    while (!existsSync(join(webRoot, 'assets', 'favicon.svg')) && webRoot !== ROOT) {
      const up = dirname(webRoot);
      if (up === webRoot) break;
      webRoot = up;
    }
    if (!existsSync(join(webRoot, 'assets', 'favicon.svg'))) continue;
    const depth = relative(webRoot, dirname(page)).split('/').filter(Boolean).length;
    /* Portal ima jednu domenu za sve dubine, pa ondje vrijedi apsolutni put;
       samostalni webovi se grade u podmapu i ondje je relativni put sigurniji
       (radi i kad se web otvori iz mape, bez poslužitelja). */
    const href = webRoot === join(ROOT, 'apps/portal') ? '/assets/favicon.svg'
      : `${'../'.repeat(depth)}assets/favicon.svg`;
    const html = readFileSync(page, 'utf8');
    if (!/<html[\s>]/i.test(html)) continue;
    /* Postojeću ikonu NE diramo: svaki generator ima svoje pravilo putanje
       (portal apsolutno, arhiva i dnevnik na vlastiti host, kanali relativno),
       a testovi to pravilo provjeravaju. Jedinstven je crtež, ne zapis putanje. */
    if (/<link rel="(?:shortcut )?icon"/.test(html)) continue;
    const anchor = html.match(/<meta name="viewport"[^>]*>/) || html.match(/<meta charset="[^"]*">/);
    if (!anchor) continue;
    const next = html.replace(anchor[0], `${anchor[0]}\n<link rel="icon" href="${href}" type="image/svg+xml">`);
    if (CHECK) { pagesChanged.push(relative(ROOT, page)); continue; }
    writeFileSync(page, next);
    pagesChanged.push(relative(ROOT, page));
  }
}

const report = {
  version: 'AKTUAL_MEDIA_BRAND_MARK_V1',
  mode: CHECK ? 'check' : 'apply',
  assetDirs: targets.length,
  assetsWritten: written.length,
  pagesWithIcon: pagesChanged.length
};
console.log(JSON.stringify(report, null, 2));
if (CHECK && (pending.length || pagesChanged.length)) {
  console.error(`Bez jedinstvenog znaka: ${pending.length} datoteka, ${pagesChanged.length} stranica`);
  process.exit(1);
}
