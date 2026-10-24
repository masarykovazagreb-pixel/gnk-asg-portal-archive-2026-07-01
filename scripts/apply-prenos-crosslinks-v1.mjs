#!/usr/bin/env node
/**
 * VEZA IZVOR → KOPIJE, NA SVAKOM TEKSTU.
 *
 * Svaki tekst s matice objavljen je i na domene mreže. Dosad je to pisalo
 * samo na kopiji (atribucija i veza na izvornik). Ovaj skript dopisuje
 * izvorniku drugu polovicu: popis adresa na kojima taj tekst stoji, s
 * vezom na svaku kopiju i na zajednički popis prijenosa.
 *
 * Pravila:
 *  - popis se čita iz apps/portal/data/prenos-network-v1.json, koji gradi
 *    build-prenos-hub-v1.mjs iz korpusa i s diska — ništa se ne izmišlja;
 *  - blok stoji na kraju <main>, označen s data-prenos-crosslinks, pa ga
 *    urednička mjera (Direct Static Editorial Policy) prepoznaje kao
 *    metapodatak, a ne kao tijelo članka;
 *  - idempotentan je: stari blok se zamjenjuje, a tekst bez kopija ga nema.
 *
 *   node scripts/apply-prenos-crosslinks-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const DATA = join(PORTAL, 'data', 'prenos-network-v1.json');
const CHECK = process.argv.includes('--check');
const CSS_HREF = '/assets/prenos-crosslinks-v1.css?v=20261024';
const ORIGIN = 'https://gnk-asg.hr';
const MARK = 'data-prenos-crosslinks';

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const data = JSON.parse(readFileSync(DATA, 'utf8'));

/* Kanonska adresa → datoteka. Samo tekstovi čiji je izvor na ovoj domeni;
   kopije s drugih domena imaju svoj izvor i svoj blok. */
function fileFor(canonical) {
  if (!canonical.startsWith(`${ORIGIN}/`)) return null;
  const route = canonical.slice(`${ORIGIN}/`.length);
  const candidates = route.endsWith('/')
    ? [join(PORTAL, route, 'index.html')]
    : [join(PORTAL, route), join(PORTAL, `${route}.html`), join(PORTAL, route, 'index.html')];
  return candidates.find((file) => existsSync(file)) || null;
}

function blockFor(item, lang) {
  const en = lang === 'en';
  const links = item.copies
    .map((copy) => `<a href="${esc(copy.url)}" rel="external noopener" hreflang="${esc(copy.lang)}" lang="${esc(copy.lang)}">${esc(copyName(copy.key))}</a>`)
    .join(' · ');
  const index = en ? '/en/prenos/' : '/prenos/';
  return `<aside class="article-meta am-prenos" ${MARK}="v1">
<p><b>${en ? 'This text is also published on' : 'Ovaj tekst objavljen je i na'}:</b> ${links} — <a href="${index}">${en ? 'all republications' : 'svi prijenosi'}</a></p>
</aside>`;
}

function copyName(key) {
  const target = data.targets.find((entry) => entry.key === key);
  return target ? target.name : key;
}

const current = new Map(data.texts.map((item) => [item.canonical, item]));
const touched = [];
const skipped = [];

for (const [canonical, item] of current) {
  const file = fileFor(canonical);
  if (!file) { skipped.push(canonical); continue; }
  const html = readFileSync(file, 'utf8');
  if (/http-equiv=["']refresh["']/i.test(html) || /name=["']robots["'][^>]*\bnoindex\b/i.test(html)) {
    skipped.push(canonical);
    continue;
  }
  const mainEnd = html.lastIndexOf('</main>');
  if (mainEnd < 0) { skipped.push(canonical); continue; }

  const lang = (html.match(/<html[^>]*\blang=["']([a-z]{2})/i) || [])[1] || 'hr';
  const block = blockFor(item, lang);
  let next = html.replace(new RegExp(`<aside[^>]*${MARK}="v1"[\\s\\S]*?</aside>\\s*`, 'g'), '');
  next = `${next.slice(0, next.lastIndexOf('</main>'))}${block}\n${next.slice(next.lastIndexOf('</main>'))}`;
  if (!next.includes('prenos-crosslinks-v1.css')) {
    next = next.replace('</head>', `<link rel="stylesheet" href="${CSS_HREF}">\n</head>`);
  }
  if (next === html) continue;
  touched.push(relative(ROOT, file).split(/[\\/]/).join('/'));
  if (!CHECK) writeFileSync(file, next);
}

const cssFile = join(PORTAL, 'assets', 'prenos-crosslinks-v1.css');
const CSS = `/* Veza izvor → kopije. Blok je metapodatak uz članak, ne dio teksta. */
.am-prenos{margin:26px 0 8px;padding:14px 16px;border:1px solid #e3e8f0;border-left:4px solid #8a6a1f;border-radius:10px;background:#fbfaf6;font:400 14px/1.6 system-ui,sans-serif;color:#33404f}
.am-prenos p{margin:0}
.am-prenos b{color:#12233a}
.am-prenos a{color:#0f4c81;text-decoration:none;border-bottom:1px solid rgba(15,76,129,.28)}
.am-prenos a:hover,.am-prenos a:focus-visible{border-bottom-color:#0f4c81}
@media (prefers-color-scheme:dark){.am-prenos{background:#12171f;border-color:#243040;border-left-color:#c8963c;color:#dfe6ef}.am-prenos b{color:#f4f7fb}.am-prenos a{color:#9cc7f0;border-bottom-color:rgba(156,199,240,.35)}}
`;
if (!CHECK) {
  mkdirSync(dirname(cssFile), { recursive: true });
  const currentCss = existsSync(cssFile) ? readFileSync(cssFile, 'utf8') : null;
  if (currentCss !== CSS) writeFileSync(cssFile, CSS);
}

console.log(JSON.stringify({
  version: 'GNK_ASG_PRENOS_CROSSLINKS_V1_20261024',
  mode: CHECK ? 'check' : 'write',
  texts: data.texts.length,
  touched: touched.length,
  skipped: skipped.length,
  files: CHECK ? touched.slice(0, 20) : undefined
}, null, 2));

if (CHECK && touched.length) {
  console.error(`Veza na kopije nedostaje na ${touched.length} tekstova; pokreni bez --check.`);
  process.exitCode = 1;
}
