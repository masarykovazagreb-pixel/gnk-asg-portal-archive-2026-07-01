#!/usr/bin/env node
/**
 * „PRESKOČI NA SADRŽAJ" — sloj za rukom pisane stranice portala.
 *
 * Zašto sloj, a ne generator: većina stranica u `apps/portal` nije izlaz nijedne
 * gradnje (trgovina, objave, galerija, komentari, visual-index, digital-workforce,
 * en/…). One se ne regeneriraju, pa se popravak mora primijeniti na datoteke.
 * Generatori (`apps/region/engine`, `apps/kanal/build.mjs`, `apps/sites`) već
 * ubacuju isti link iz predloška — tamo se ovaj sloj ne dira.
 *
 * Pravilo: svaka sadržajna stranica dobiva
 *   1. `<a class="skip" href="#sadrzaj">Sadržaj</a>` odmah iza `<body …>`;
 *   2. metu `#sadrzaj` — na postojećem `<main>` ili kao sidro prije sadržaja.
 *
 * Preskaču se: preusmjerivači (`http-equiv="refresh"`), stranice bez sadržaja
 * (< 1.200 znakova), administracija, API i datoteke bez `<body>`.
 *
 * Skripta je idempotentna i deterministična: drugi prolaz ne mijenja ništa.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const DRY = process.argv.includes('--dry-run');

const SKIP_DIRS = new Set([
  'api', 'assets', 'data', 'img', '__preview', 'app',
  'admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio',
  'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard',
  'digital-headquarters', 'media-registration-admin', 'synapse-demo', 'pulse-demo'
]);

const HAS_SKIP = /skip-link|class="skip"|Presko[ič]i na sadržaj|Skip to content|href="#sadrzaj"/i;

/* Stil se ne ubacuje u stranicu: dizajnerski gate zabranjuje ugrađeni
   `<style>` na stranicama proizvoda, a CSP ga ionako ne voli. Ako stranica ne
   učitava nijedan slog s pravilom `.skip`, dodaje se veza na zajednički list. */
const SKIP_SHEET = '/assets/am-design-v1.css?v=20261024';

const cssCache = new Map();
const cssHasSkip = (url, fromFile) => {
  const clean = url.split('?')[0].split('#')[0];
  if (!clean || /^(https?:)?\/\//.test(clean)) return false;
  const path = clean.startsWith('/') ? join(PORTAL, clean) : join(dirname(fromFile), clean);
  if (cssCache.has(path)) return cssCache.get(path);
  let ok = false;
  try { ok = /\.skip[^a-z-]/.test(readFileSync(path, 'utf8')); } catch { ok = false; }
  cssCache.set(path, ok);
  return ok;
};

/* Treba li stranica vlastiti stil? Ne treba ako neki od uključenih slogova
   već ima pravilo `.skip` — tada bi inline stil bio samo dupli bajtovi. */
const needsStyle = (html, file) => {
  if (/<style[^>]*>[^<]*\.skip\{/.test(html)) return false;
  for (const match of html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/g)) {
    if (cssHasSkip(match[1], file)) return false;
  }
  for (const match of html.matchAll(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/g)) {
    if (cssHasSkip(match[1], file)) return false;
  }
  return true;
};

const walk = (dir, out = [], depth = 0) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name) && depth < 8) walk(full, out, depth + 1);
    } else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

/* `<main` unutar <script> predloška nije stvarni DOM — preskače se. */
const insideScript = (html, index) => {
  const before = html.slice(0, index);
  return before.lastIndexOf('<script') > before.lastIndexOf('</script>');
};

const firstVisibleMain = (html) => {
  let index = html.search(/<main\b/i);
  while (index !== -1) {
    if (!insideScript(html, index)) return index;
    const next = html.slice(index + 1).search(/<main\b/i);
    if (next === -1) return -1;
    index = index + 1 + next;
  }
  return -1;
};

const ensureTarget = (html) => {
  const main = firstVisibleMain(html);
  if (main !== -1) {
    const tagEnd = html.indexOf('>', main);
    const tag = html.slice(main, tagEnd);
    if (/\bid=/.test(tag)) {
      const id = (tag.match(/\bid="([^"]+)"/) || [])[1];
      return { html, anchor: `#${id}`, changed: false };
    }
    return { html: `${html.slice(0, main)}<main id="sadrzaj"${html.slice(main + 5)}`, anchor: '#sadrzaj', changed: true };
  }
  /* Nema <main>: sidro ide prije prvog naslova, da fokus ima kamo otići. */
  const heading = html.search(/<h1\b/i);
  if (heading === -1) return { html, anchor: '', changed: false };
  return { html: `${html.slice(0, heading)}<span id="sadrzaj" tabindex="-1"></span>${html.slice(heading)}`, anchor: '#sadrzaj', changed: true };
};

let scanned = 0;
let patched = 0;
let skippedRedirect = 0;
let skippedSmall = 0;
let already = 0;
let noTarget = 0;
let styled = 0;
const examples = [];

for (const file of walk(PORTAL)) {
  const html = readFileSync(file, 'utf8');
  scanned += 1;
  if (HAS_SKIP.test(html)) {
    /* Link postoji; brine se samo da negdje postoji i pravilo `.skip`. */
    if (needsStyle(html, file) && html.includes('</head>') && !html.includes(SKIP_SHEET.split('?')[0])) {
      const out = html.replace('</head>', `\n<link rel="stylesheet" href="${SKIP_SHEET}" data-am-design="v1">\n</head>`);
      if (!DRY) writeFileSync(file, out);
      styled += 1;
      already += 1;
      continue;
    }
    already += 1;
    continue;
  }
  if (!/<body\b/i.test(html) || !/<\/body>/i.test(html)) continue;
  if (/http-equiv="refresh"/i.test(html)) { skippedRedirect += 1; continue; }
  if (html.length < 1200) { skippedSmall += 1; continue; }

  const lang = (html.match(/<html[^>]*\blang="([a-zA-Z-]+)"/) || [])[1] || 'hr';
  const label = lang.toLowerCase().startsWith('en') ? 'Skip to content' : 'Sadržaj';

  let out = html;
  const target = ensureTarget(out);
  out = target.html;
  if (target.changed) { /* meta je dodana */ }
  if (!target.anchor) { noTarget += 1; continue; }

  const bodyOpen = out.match(/<body\b[^>]*>/i);
  if (!bodyOpen || bodyOpen.index === undefined) continue;
  const insertAt = bodyOpen.index + bodyOpen[0].length;
  if (needsStyle(out, file) && out.includes('</head>') && !out.includes(SKIP_SHEET.split('?')[0])) {
    out = out.replace('</head>', `\n<link rel="stylesheet" href="${SKIP_SHEET}" data-am-design="v1">\n</head>`);
  }
  const link = `<a class="skip" href="${target.anchor}">${label}</a>`;
  out = `${out.slice(0, insertAt)}${link}${out.slice(insertAt)}`;

  if (out === html) continue;
  if (!DRY) writeFileSync(file, out);
  patched += 1;
  if (examples.length < 8) examples.push(relative(ROOT, file));
}

const report = {
  version: 'AKTUAL_MEDIA_SKIP_LINK_LAYER_V1',
  dryRun: DRY,
  scanned,
  alreadyHad: already,
  patched,
  styledExisting: styled,
  skippedRedirect,
  skippedSmall,
  noTarget,
  examples,
  ok: true
};
console.log(JSON.stringify(report, null, 2));
