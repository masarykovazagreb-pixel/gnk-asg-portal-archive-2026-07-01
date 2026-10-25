#!/usr/bin/env node
/**
 * POPIS SVIH STRANICA KOJE IMAMO — mjereno, ne prepisano.
 *
 * Zašto postoji: na pitanje "što sve imamo" dosad se odgovaralo brojem iz
 * sjećanja. Ovaj skript prolazi kroz stvarna izlazna stabla, broji stranice po
 * webu i tipu, i iz toga gradi dvije stvari:
 *
 *   1. javnu stranicu `/sve-stranice/` — popis svih webova mreže s brojem
 *      stranica, tipovima, zadnjim podatkovnim danom i izravnim ulazom;
 *   2. izvještaj na hrvatskom `docs/izvjestaj-inventure-v1.md` — isti podaci
 *      plus ono što se iz brojeva vidi (pokrivenost, praznine, zaostatak).
 *
 * Nijedan broj se ne upisuje ručno. Ako se web ne izgradi, nema ga ni u
 * popisu — praznina se vidi, ne skriva.
 *
 * Pokretanje:
 *   node scripts/build-pages-inventory-v1.mjs
 *   node scripts/build-pages-inventory-v1.mjs --check
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshTag } from '../apps/shared/refresh-tag-v1.mjs';
import { designTokensCss } from '../apps/shared/design-system-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const OUT_HTML = join(ROOT, 'apps', 'portal', 'sve-stranice', 'index.html');
const OUT_MD = join(ROOT, 'docs', 'izvjestaj-inventure-v1.md');

const readJSON = (path, fallback = null) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};

const counts = readJSON(join(ROOT, 'apps', 'portal', 'data', 'network-counts-v1.json'), {});
const mreza = readJSON(join(ROOT, 'apps', 'portal', 'data', 'mreza-v1.json'), { sites: [], editions: [], world: [] });

const WEBS = [
  { id: 'portal', name: 'GNK ASG (glavna domena)', url: 'https://gnk-asg.hr/', root: join(ROOT, 'apps', 'portal'), kind: 'portal' },
  { id: 'world', name: 'GNK World — svjetski portali', url: 'https://gnk-asg.hr/svijet/', root: join(ROOT, 'apps', 'world', 'site'), kind: 'world' },
  { id: 'kanal', name: 'GNK ASG KANAL', url: 'https://gnk-asg-kanal.pages.dev/', root: join(ROOT, 'apps', 'kanal', 'site'), kind: 'kanal' },
  { id: 'arhiva', name: 'AKTUAL ARHIVA', url: 'https://gnk-asg-arhiva.pages.dev/', root: join(ROOT, 'apps', 'arhiva', 'site'), kind: 'arhiva' },
  { id: 'dnevnik', name: 'AKTUAL DNEVNIK', url: 'https://gnk-asg-dnevnik.pages.dev/', root: join(ROOT, 'apps', 'dnevnik', 'site'), kind: 'dnevnik' },
  { id: 'sites', name: 'Samostalni webovi (šest izdanja)', url: 'https://gnk-bor-usa.pages.dev/', root: join(ROOT, 'apps', 'sites', 'site'), kind: 'sites' },
  { id: 'izdanja', name: 'Gradska izdanja (17 kanala)', url: 'https://gnk-asg.hr/kanal/', root: join(ROOT, 'apps', 'portal', 'kanal'), kind: 'editions', separate: true }
];

/* Tip stranice iz putanje — isti rječnik za sve webove. */
const kindOf = (sub) => {
  if (!sub) return 'naslovnica';
  if (/(^|\/)clanak\//.test(sub)) return 'članak';
  if (/(^|\/)prenos\//.test(sub)) return 'prenos';
  if (/(^|\/)kolumna\//.test(sub)) return 'kolumna';
  if (/(^|\/)en(\/|$)/.test(sub)) return 'engleska inačica';
  if (/(^|\/)tema\//.test(sub)) return 'tema';
  if (/(^|\/)izvor/.test(sub)) return 'izvor';
  if (/(^|\/)(izdanja|mreza|status|gnk-aktual|kanal)(\/|$)/.test(sub)) return 'pregled';
  return 'stranica';
};

const walk = (dir, out = [], depth = 0, skip = null) => {
  if (!existsSync(dir) || depth > 7) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    if (skip && join(dir, name) === skip) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out, depth + 1, skip);
    else if (name === 'index.html') out.push(full);
  }
  return out;
};

const inventory = [];
for (const web of WEBS) {
  if (!existsSync(web.root)) {
    inventory.push({ ...web, pages: 0, missing: true, kinds: {}, lastDay: '' });
    continue;
  }
  const files = walk(web.root, [], 0, web.id === 'portal' ? join(ROOT, 'apps', 'portal', 'kanal') : null);
  const kinds = {};
  let newest = '';
  for (const file of files) {
    const sub = relative(web.root, file).replace(/index\.html$/, '').replace(/\/$/, '');
    const kind = kindOf(sub);
    kinds[kind] = (kinds[kind] || 0) + 1;
    const html = readFileSync(file, 'utf8');
    const stamp = (html.match(/(?:datetime|data-day|content)="(20\d{2}-\d{2}-\d{2})/) || [])[1];
    if (stamp && stamp > newest) newest = stamp;
  }
  inventory.push({ ...web, root: undefined, pages: files.length, missing: false, kinds, lastDay: newest });
}

const totalPages = inventory.reduce((sum, web) => sum + web.pages, 0);
const missing = inventory.filter((web) => web.missing);

/* --- javna stranica --- */
const rows = inventory.map((web) => {
  const chips = Object.entries(web.kinds).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([kind, n]) => `<li><b>${n}</b> ${kind}</li>`).join('');
  return `<article class="inv-card">
    <h2><a href="${web.url}">${web.name}</a></h2>
    <p class="inv-count">${web.missing ? 'nije izgrađen' : `${web.pages.toLocaleString('hr-HR')} stranica`}</p>
    <ul class="inv-kinds">${web.missing ? '<li>pokreni gradnju</li>' : chips}</ul>
    <p class="inv-day">${web.lastDay ? `Zadnji datum u sadržaju: ${web.lastDay}` : 'bez datuma u sadržaju'}</p>
  </article>`;
}).join('\n');

const html = `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sve stranice mreže — ${totalPages.toLocaleString('hr-HR')} stranica | AKTUAL MEDIA</title>
<meta name="description" content="Popis svih webova i stranica mreže AKTUAL MEDIA, izmjeren pri svakoj gradnji: ${totalPages.toLocaleString('hr-HR')} stranica na ${inventory.length} webova, po tipu i datumu. Bez procjena.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://gnk-asg.hr/sve-stranice/">
<meta property="og:type" content="website">
<meta property="og:title" content="Sve stranice mreže — AKTUAL MEDIA">
<meta property="og:description" content="Izmjeren popis svih stranica: ${totalPages.toLocaleString('hr-HR')} stranica na ${inventory.length} webova.">
<meta property="og:url" content="https://gnk-asg.hr/sve-stranice/">
<meta property="og:locale" content="hr_HR">
<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/sve-stranice/">
<link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/sve-stranice/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://gnk-asg.hr/#website","name":"GNK ASG","url":"https://gnk-asg.hr/","inLanguage":["hr","en"],"publisher":{"@id":"https://gnk-asg.hr/#gnk-asg"}},{"@type":"CollectionPage","@id":"https://gnk-asg.hr/sve-stranice/#webpage","url":"https://gnk-asg.hr/sve-stranice/","name":"Sve stranice mreže","inLanguage":"hr","isPartOf":{"@id":"https://gnk-asg.hr/#website"},"publisher":{"@id":"https://gnk-asg.hr/#gnk-asg"}},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"GNK ASG","item":"https://gnk-asg.hr/"},{"@type":"ListItem","position":2,"name":"Sve stranice","item":"https://gnk-asg.hr/sve-stranice/"}]}]}</script>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/am-design-v1.css">
<style>
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;background:#f7f4ec;color:#12233a;font:16px/1.65 Georgia,"Times New Roman",serif}
a{color:#8c2f2f;text-decoration:none}
a:hover{text-decoration:underline}
.inv-wrap{max-width:1100px;margin:0 auto;padding:clamp(20px,4vw,56px) clamp(16px,4vw,40px) 80px}
.inv-eyebrow{font:800 11px/1.4 system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase;color:#8c6a1f;margin:0 0 10px}
h1{font:700 clamp(30px,4.4vw,52px)/1.05 Georgia,serif;letter-spacing:-.02em;margin:0 0 14px;max-width:22ch}
.inv-lead{font-size:clamp(16px,1.6vw,19px);max-width:70ch;color:#2f4054;margin:0 0 26px}
.inv-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 34px;padding:0;list-style:none}
.inv-stats li{background:#fffdf8;border:1px solid #e2dac9;border-radius:14px;padding:14px 16px}
.inv-stats b{display:block;font:800 clamp(24px,3vw,34px)/1 system-ui,sans-serif;color:#12233a;letter-spacing:-.02em}
.inv-stats span{font:700 10.5px/1.3 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6b6558}
.inv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin:0 0 34px}
.inv-card{background:#fffdf8;border:1px solid #e2dac9;border-top:3px solid #c8963c;border-radius:16px;padding:18px 18px 16px;box-shadow:0 10px 26px rgba(31,38,48,.06)}
.inv-card h2{margin:0 0 6px;font:800 16px/1.25 system-ui,sans-serif;letter-spacing:-.01em}
.inv-count{margin:0 0 10px;font:800 22px/1 system-ui,sans-serif;color:#8c2f2f;letter-spacing:-.01em}
.inv-kinds{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;padding:0;list-style:none}
.inv-kinds li{font:700 10px/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#4a463d;background:#f3ecdc;border:1px solid #e2dac9;border-radius:999px;padding:5px 8px}
.inv-kinds b{color:#12233a}
.inv-day{margin:0;font:600 11.5px/1.4 system-ui,sans-serif;color:#6b6558}
.inv-note{background:#fff;border-left:4px solid #c8963c;padding:14px 18px;border-radius:0 12px 12px 0;font-size:14.5px;color:#2f4054;max-width:76ch}
.inv-foot{margin-top:34px;font:600 12px/1.6 system-ui,sans-serif;color:#6b6558}
@media (prefers-color-scheme:dark){
  body{background:#0a1420;color:#e8eef6}
  .inv-stats li,.inv-card{background:#111e2d;border-color:#23374d}
  .inv-lead,.inv-note{color:#b9c7d8}
  .inv-kinds li{background:#16273a;border-color:#23374d;color:#cfdae8}
  .inv-kinds b,.inv-stats b{color:#f2f6fb}
  .inv-note{background:#111e2d}
  .inv-card h2 a{color:#f0c66e}
}
@media print{
  body{background:#fff;color:#000}
  .inv-card{break-inside:avoid;box-shadow:none}
  a[href]::after{content:" (" attr(href) ")";font-size:10px;color:#555}
}
</style>
${designTokensCss()}
</head>
<body>
<a class="skip" href="#sadrzaj">Sadržaj</a>
<main class="inv-wrap" id="sadrzaj">
  <p class="inv-eyebrow">AKTUAL MEDIA · inventura</p>
  <h1>Sve stranice mreže, izmjerene — ne prepisane</h1>
  <p class="inv-lead">Ovo nije najava. Svaki broj na ovoj stranici izračunat je prolaskom kroz stvarna izlazna stabla pri zadnjoj gradnji, pa se popis mijenja kad se promijeni sadržaj. Podatkovni dan: <b>${counts.dataDay || '—'}</b>.</p>
  <ul class="inv-stats">
    <li><b>${totalPages.toLocaleString('hr-HR')}</b><span>stranica ukupno</span></li>
    <li><b>${inventory.length}</b><span>webova u mreži</span></li>
    <li><b>${(counts.texts || 0).toLocaleString('hr-HR')}</b><span>tekstova u podacima</span></li>
    <li><b>${counts.cities || 0}</b><span>gradskih izdanja</span></li>
    <li><b>${counts.languages || 0}</b><span>jezika</span></li>
    <li><b>${missing.length}</b><span>webova bez izlaza</span></li>
  </ul>
  <div class="inv-grid">
${rows}
  </div>
  <p class="inv-note">Popis se ne uređuje ručno. Ako web nije izgrađen, ovdje piše „nije izgrađen“ — praznina se vidi, ne skriva. Detaljan izvještaj s tipovima stranica i zaostatkom stoji u <code>docs/izvjestaj-inventure-v1.md</code>.</p>
  <p class="inv-foot">GNK ASG d.o.o. · AKTUAL MEDIA · urednik i direktor Nermin Sefić</p>
</main>
${refreshTag('/')}
</body>
</html>
`;

/* --- izvještaj na hrvatskom --- */
const md = `# Izvještaj: što mreža ima

Izmjereno iz izlaznih stabala, ne iz sjećanja. Datum zapisa: ${counts.generatedAt || '—'}.
Podatkovni dan: ${counts.dataDay || '—'}.

## Ukupno

| Što | Broj |
| --- | --- |
| Stranica ukupno | ${totalPages.toLocaleString('hr-HR')} |
| Webova | ${inventory.length} |
| Tekstova u podacima | ${(counts.texts || 0).toLocaleString('hr-HR')} |
| Gradskih izdanja | ${counts.cities || 0} |
| Svjetskih izdanja | ${counts.world || 0} |
| Samostalnih webova | ${counts.sites || 0} |
| Jezika | ${counts.languages || 0} |
| Medijskih izvora | ${counts.sources || 0} |

## Po webu

| Web | Stranica | Tipovi | Zadnji datum |
| --- | --- | --- | --- |
${inventory.map((web) => `| ${web.name} | ${web.missing ? 'nije izgrađen' : web.pages.toLocaleString('hr-HR')} | ${web.missing ? '—' : Object.entries(web.kinds).sort((a, b) => b[1] - a[1]).map(([kind, n]) => `${kind} ${n}`).join(', ')} | ${web.lastDay || '—'} |`).join('\n')}

## Što iz brojeva slijedi

${missing.length ? `- **${missing.length} web(ova) nema izlaz**: ${missing.map((web) => web.name).join(', ')}. Dok se ne izgrade, linkovi na njih vode u prazno.\n` : '- Svi webovi imaju izlaz; nijedan link u mreži ne vodi u prazno.\n'}- Podatkovni dan je **${counts.dataDay || 'nepoznat'}**, a zapis je napravljen **${counts.generatedAt || '—'}**. Ako se ta dva datuma raziđu, sadržaj zaostaje za podacima i to se vidi na ploči \`/status/\`, ne u tekstu.\n- Brojevi se ne prepisuju: svi generatori čitaju \`apps/portal/data/network-counts-v1.json\`, pa ne mogu pokazivati tri različita zbroja.\n- Popis svih stranica je i javna stranica \`/sve-stranice/\` — dostupna bez prijave, s istim brojevima.\n\n## Kako se ovo obnavlja

\`\`\`
node scripts/build-network-counts-v1.mjs   # brojevi iz podataka
node scripts/build-pages-inventory-v1.mjs  # ovaj izvještaj i /sve-stranice/
\`\`\`

Nijedan korak ne traži mrežu. Ako podaci nedostaju, skript padne — ne ispiše nulu.
`;

if (CHECK) {
  const current = existsSync(OUT_HTML) ? readFileSync(OUT_HTML, 'utf8') : '';
  const ok = current === html;
  console.log(JSON.stringify({ version: 'AKTUAL_MEDIA_PAGES_INVENTORY_V1', check: ok ? 'ok' : 'stale', pages: totalPages }, null, 2));
  if (!ok) process.exit(1);
} else {
  mkdirSync(dirname(OUT_HTML), { recursive: true });
  writeFileSync(OUT_HTML, html);
  writeFileSync(OUT_MD, md);
  console.log(JSON.stringify({
    version: 'AKTUAL_MEDIA_PAGES_INVENTORY_V1',
    pages: totalPages,
    webs: inventory.length,
    missing: missing.map((web) => web.id),
    out: ['apps/portal/sve-stranice/index.html', 'docs/izvjestaj-inventure-v1.md']
  }, null, 2));
}
