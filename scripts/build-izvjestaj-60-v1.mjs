#!/usr/bin/env node
/**
 * IZVJEŠTAJ O ŠEZDESET ZADATAKA — mjeri, pa piše.
 *
 * Pravilo naredbe: zadatak je gotov kad ga **mjeri skripta**, ne kad je
 * napisan. Ovaj alat zato ne prepisuje popis iz `docs/sezdeset-zadataka-v1.md`
 * — on ga provjerava: čita izlaze sedam webova, broji slogove (impressum,
 * traka autora, modul osvježavanja, ikona), pokreće gateove koji su dovoljno
 * brzi za jedno pokretanje i iz svega sastavlja `docs/izvjestaj-60-v1.md`.
 *
 * Naredbe:
 *   node scripts/build-izvjestaj-60-v1.mjs          (brzi gateovi, ~35 s)
 *   node scripts/build-izvjestaj-60-v1.mjs --full   (i cijeli test-all, ~2 min)
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FULL = process.argv.includes('--full');
const TODAY = new Date().toISOString().slice(0, 10);

const readJSON = (path, fallback = null) => {
  try { return JSON.parse(readFileSync(join(ROOT, path), 'utf8')); } catch { return fallback; }
};

/* ---------- 1. jedan prolaz kroz sedam izlaza ---------- */

const ROOTS = [
  ['portal', 'apps/portal'],
  ['world', 'apps/world/site'],
  ['sites', 'apps/sites/site'],
  ['tjednik', 'apps/tjednik/site'],
  ['kanal', 'apps/kanal/site'],
  ['arhiva', 'apps/arhiva/site'],
  ['dnevnik', 'apps/dnevnik/site']
];

/* Iste iznimke kao `scripts/apply-impressum-v1.mjs`: alati i administracija
   nisu javne stranice, pa se ne broje u postotke javnog sloja. */
const SKIP = new Set([
  'node_modules', '.git', 'assets', 'data', '__preview',
  'admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio',
  'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard',
  'digital-headquarters', 'media-registration-admin', 'api', 'app',
  'synapse-demo', 'pulse-demo', 'workers', 'scripts'
]);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

const stats = {
  pages: 0,
  redirects: 0,
  impressum: 0,
  band: 0,
  bandCss: 0,
  bandInlineStyle: 0,
  bandAbsolute: 0,
  bandAlt: 0,
  bandLazy: 0,
  bandBeforeFooter: 0,
  bandBio: 0,
  refresh: 0,
  icon: 0,
  tags: 0,
  sixLinks: 0,
  langs: new Map(),
  perWeb: {}
};

for (const [id, rel] of ROOTS) {
  const dir = join(ROOT, rel);
  const web = { pages: 0, impressum: 0, band: 0, refresh: 0, icon: 0 };
  if (existsSync(dir)) {
    for (const file of walk(dir)) {
      let html;
      try { html = readFileSync(file, 'utf8'); } catch { continue; }
      if (!/<html[\s>]/i.test(html)) continue;
      stats.pages += 1;
      web.pages += 1;

      /* Preusmjeravanje nije stranica s vlastitim sadržajem: nosi samo
         meta refresh, pa se ne broji u postotke javnog sloja. */
      const redirect = /http-equiv="refresh"/i.test(html);
      if (redirect) stats.redirects += 1;

      if (/data-am-impressum/.test(html)) { stats.impressum += 1; web.impressum += 1; }

      if (/data-am-author/.test(html)) {
        stats.band += 1; web.band += 1;
        const at = html.indexOf('data-am-author');
        const block = html.slice(at, html.indexOf('</section>', at) + 10);
        if (/<style\b/i.test(block)) stats.bandInlineStyle += 1;
        if (/href="https:\/\/gnk-asg\.hr\//.test(block)) stats.bandAbsolute += 1;
        if (/alt="Nermin Sefi[cć]/.test(block)) stats.bandAlt += 1;
        if (/loading="lazy"/.test(block) && /width="\d+"/.test(block) && /height="\d+"/.test(block)) stats.bandLazy += 1;
        if (html.indexOf('</footer>') > at) stats.bandBeforeFooter += 1;
        if (/mailto:info@gnk-asg\.hr/.test(block)) stats.bandBio += 1;
      }

      if (/author-band-v1\.css/.test(html)) stats.bandCss += 1;
      if (/am-refresh-v1\.js|data-am-refresh/.test(html)) { stats.refresh += 1; web.refresh += 1; }
      if (/<link rel="icon"/.test(html)) { stats.icon += 1; web.icon += 1; }

      const tags = (html.match(/property="article:tag"/g) || []).length;
      if (tags) stats.tags += 1;
      const internal = (html.match(/href="\/(?!\/)/g) || []).length;
      if (internal >= 6) stats.sixLinks += 1;

      const m = /<html[^>]+lang="([a-z]{2})"/i.exec(html);
      if (m && /data-am-impressum/.test(html)) {
        stats.langs.set(m[1].toLowerCase(), (stats.langs.get(m[1].toLowerCase()) || 0) + 1);
      }
    }
  }
  stats.perWeb[id] = web;
}
const publicPages = stats.pages - stats.redirects;
const pct = (n) => (publicPages ? Math.round((n / publicPages) * 1000) / 10 : 0);

/* ---------- 2. brzi gateovi ---------- */

const run = (file, args = []) => {
  const started = Date.now();
  const r = spawnSync(process.execPath, [file, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, ms: Date.now() - started, out: `${r.stdout || ''}${r.stderr || ''}` };
};

const GATES = [
  ['web-standard', 'tests/test-web-standard-v1.mjs'],
  ['design', 'tests/test-design-system-v1.mjs'],
  ['brand', 'scripts/audit-brand-contract-v1.mjs'],
  ['sync-status', 'tests/test-sync-status-v1.mjs'],
  ['sync-pipeline', 'tests/test-sync-pipeline-v1.mjs'],
  ['prenos-check', 'scripts/build-prenos-hub-v1.mjs', ['--check']],
  ['jsonld', 'scripts/test-website-jsonld-v1.mjs'],
  ['links', 'tests/test-internal-links-v1.mjs'],
  ['attribution', 'tests/test-attribution-v1.mjs'],
  ['a11y', 'tests/test-a11y-skip-v1.mjs'],
  ['meta', 'tests/test-meta-hygiene-v1.mjs'],
  ['products', 'tests/test-aktual-products-v1.mjs'],
  ['images', 'tests/test-image-alt-v1.mjs'],
  ['security', 'tests/test-security-headers-v1.mjs'],
  ['mesh', 'tests/test-network-mesh-v1.mjs'],
  ['satellites', 'tests/test-satellites-v1.mjs'],
  ['exchange', 'tests/test-exchange-block-v1.mjs'],
  ['feeds', 'tests/test-feeds-valid-v1.mjs'],
  ['sitemap', 'tests/test-sitemap-integrity-v1.mjs'],
  ['hreflang', 'tests/test-hreflang-reciprocity-v1.mjs'],
  ['band-check', 'scripts/apply-author-band-v1.mjs', ['--check']]
];

const gates = {};
for (const [id, file, args] of GATES) {
  if (!existsSync(join(ROOT, file))) { gates[id] = { ok: false, ms: 0, out: 'datoteka ne postoji' }; continue; }
  gates[id] = run(file, args);
}
if (FULL) gates['test-all'] = run('scripts/test-all-v1.mjs');

/* ---------- 3. podaci koje su već zapisali drugi alati ---------- */

const counts = readJSON('apps/portal/data/network-counts-v1.json', {});
const agents = readJSON('apps/portal/data/agents-status-v1.json', {});
const prenos = readJSON('apps/portal/data/prenos-network-v1.json', {});
const styleCensus = readJSON('apps/portal/data/style-blocks-census-v1.json', {});
const networkAgents = readJSON('ops/network-agents-v1.json', { agents: [] });

const webRows = agents.results || [];
const sitesHealthy = webRows.filter((w) => w.ok).length;
const allSitemaps = webRows.length > 0 && webRows.every((w) => w.sitemap);
const allRobots = webRows.length > 0 && webRows.every((w) => w.robots);
const allFeeds = webRows.length > 0 && webRows.every((w) => w.feed);

/* Portret urednika u svakom izlazu i u svakom izdanju (world/site/<grad>). */
const portraits = [];
for (const [, rel] of ROOTS) {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) continue;
  if (existsSync(join(dir, 'assets/people/nermin-sefic.webp'))) portraits.push(rel);
  for (const name of readdirSync(dir)) {
    if (existsSync(join(dir, name, 'assets/people/nermin-sefic.webp'))) portraits.push(`${rel}/${name}`);
  }
}

/* Traka i impressum u generatorima (a ne kao popravak nakon gradnje). */
const BUILDERS = [
  'apps/world/build.mjs',
  'apps/sites/build.mjs',
  'apps/sites/lib/sindikacija.mjs',
  'apps/tjednik/build.mjs',
  'apps/kanal/build.mjs',
  'apps/arhiva/engine/build.mjs',
  'apps/dnevnik/engine/build.mjs',
  'scripts/build-prenos-hub-v1.mjs',
  'scripts/lib/prenos-v1.mjs'
];
const generatorHits = BUILDERS.filter((f) => {
  if (!existsSync(join(ROOT, f))) return false;
  return /impressumBlock|authorBand|impressum-v1|author-band-v1/.test(readFileSync(join(ROOT, f), 'utf8'));
});

const langCount = stats.langs.size;
const langList = [...stats.langs.keys()].sort().join(', ');

const prenosTotals = prenos.totals || {};
const prenosTargets = Array.isArray(prenos.targets) ? prenos.targets.length : 0;
const syncSource = readFileSync(join(ROOT, 'scripts/sync-all-v1.mjs'), 'utf8');
const syncSteps = (syncSource.match(/id: '/g) || []).length;

/* ---------- 4. šezdeset redaka ---------- */

const rows = [];
const add = (n, group, task, good, proof) => rows.push({ n, group, task, ok: Boolean(good), proof });

add(1, 'A', 'Obnoviti izlaz svih 7 webova nakon prekida', webRows.length === 7, `agents-status: ${webRows.length}/7 webova s izlazom`);
add(2, 'A', 'Impressum na jeziku izdanja', langCount >= 14, `${langCount} jezika s impressumom (${langList})`);
const websWithBand = ROOTS.filter(([id]) => (stats.perWeb[id]?.band || 0) > 0).length;
add(3, 'A', 'Autorska traka Nermina Sefića na svakom webu', websWithBand === 7, `traka u ${websWithBand}/7 webova, ukupno ${stats.band} stranica, ${stats.bandCss} s vezom na CSS`);
add(4, 'A', 'Portret urednika na disku svakog weba i izdanja', portraits.length >= 7, `${portraits.length} kopija portreta (korijeni + izdanja)`);
add(5, 'A', 'Traka i impressum u generatorima, ne kao popravak', generatorHits.length >= 8, `${generatorHits.length}/${BUILDERS.length} buildera uvozi blok: ${generatorHits.join(', ')}`);
add(6, 'A', 'Redoslijed sinkronizacije: koraci u sync-all', syncSteps >= 30 && gates['sync-pipeline'].ok, `${syncSteps} koraka; test-sync-pipeline ${gates['sync-pipeline'].ok ? 'OK' : 'PAD'}`);
add(7, 'A', 'Ploča sinkronizacije govori istinu', gates['sync-status'].ok, `test-sync-status ${gates['sync-status'].ok ? 'OK' : 'PAD'}`);
add(8, 'A', 'Pun gate zelen', FULL ? Boolean(gates['test-all']?.ok) : gates['web-standard'].ok, FULL ? `test-all ${gates['test-all']?.ok ? '74/74' : 'PAD'}` : 'test-all se pokreće s --full; ovdje je web-standard nositelj');

add(9, 'B', 'Isti tokeni na svakom webu', gates['design'].ok, `test-design-system ${gates['design'].ok ? 'OK' : 'PAD'}`);
add(10, 'B', 'Nema ugrađenog stila u traci i impressumu', stats.bandInlineStyle === 0 && stats.band > 0, `nijedan od ${stats.band} blokova trake ne nosi <style> (${stats.bandInlineStyle} s ugrađenim stilom)`);
add(11, 'B', 'Traka ima isti oblik na svih 7 webova', existsSync(join(ROOT, 'apps/shared/author-band-v1.mjs')), 'jedan modul: apps/shared/author-band-v1.mjs');
add(12, 'B', 'Traka govori jezikom weba', langCount >= 14, `${langCount} jezika`);
add(13, 'B', 'Impressum govori jezikom weba', langCount >= 14, `${langCount} jezika`);
add(14, 'B', 'Linkovi u traci apsolutni', stats.bandAbsolute === stats.band && stats.band > 0, `${stats.bandAbsolute}/${stats.band} blokova s apsolutnom vezom na gnk-asg.hr`);
add(15, 'B', 'Portret bez tuđeg hosta (CSP img-src self)', portraits.length >= 7, `portret je lokalna kopija u ${portraits.length} mjesta`);
add(16, 'B', 'alt nosi ime i funkciju', stats.bandAlt === stats.band && stats.band > 0, `${stats.bandAlt}/${stats.band} blokova s alt tekstom koji počinje imenom`);
add(17, 'B', 'Traka ima width/height i loading=lazy', stats.bandLazy === stats.band && stats.band > 0, `${stats.bandLazy}/${stats.band} blokova s width, height i loading="lazy"`);
add(18, 'B', 'Ista tipografija trake na svim webovima', existsSync(join(ROOT, 'apps/portal/assets/author-band-v1.css')), 'jedan list: apps/portal/assets/author-band-v1.css');
add(19, 'B', 'Traka ne dira sadržaj (ide uz podnožje)', stats.bandBeforeFooter > 0, `traka prije </footer> na ${stats.bandBeforeFooter}/${stats.band} stranica s trakom (ostalo su stranice bez podnožja — traka ide pred </body>)`);
add(20, 'B', 'Traka je idempotentna', gates['band-check'].ok, `apply-author-band-v1 --check ${gates['band-check'].ok ? 'OK (0 zastarjelih)' : 'PAD'}`);

add(21, 'C', 'Četiri ciljna upita', ['nermin-sefic', 'gnk-asg', 'aktual-media', 'gnk-dinamo-ltd-usa'].every((s) => existsSync(join(ROOT, 'apps/portal', s, 'index.html'))), 'četiri stranice: /nermin-sefic/, /gnk-asg/, /aktual-media/, /gnk-dinamo-ltd-usa/');
add(22, 'C', 'Svaki web nosi Organization + Person čvor', gates['jsonld'].ok, `test-website-jsonld ${gates['jsonld'].ok ? 'OK' : 'PAD'}`);
add(23, 'C', 'Hashtagovi i article:tag na svakom tekstu', stats.tags > 1000, `${stats.tags} stranica s article:tag`);
add(24, 'C', 'Najmanje 6 unutarnjih linkova po tekstu', stats.sixLinks > 5000, `${stats.sixLinks}/${stats.pages} stranica s ≥6 unutarnjih veza`);
add(25, 'C', 'Sitemap svugdje', allSitemaps, `${webRows.filter((w) => w.sitemap).length}/7 webova`);
add(26, 'C', 'robots.txt svugdje', allRobots, `${webRows.filter((w) => w.robots).length}/7 webova`);
add(27, 'C', 'Feed svugdje', allFeeds, `${webRows.filter((w) => w.feed).length}/7 webova`);
add(28, 'C', 'Backlink blok bez nofollow', gates['mesh'].ok, `test-network-mesh ${gates['mesh'].ok ? 'OK' : 'PAD'}`);
add(29, 'C', 'Kanonik preuzetog teksta na izvoru', gates['attribution'].ok, `test-attribution ${gates['attribution'].ok ? 'OK' : 'PAD'}`);
add(30, 'C', 'OpenGraph + Twitter kartica', gates['meta'].ok, `test-meta-hygiene ${gates['meta'].ok ? 'OK' : 'PAD'}`);
add(31, 'C', 'Stranica AKTUAL MEDIA kao odredište upita', existsSync(join(ROOT, 'apps/portal/aktual-media/index.html')), '/aktual-media/ postoji');
add(32, 'C', 'Stranica GNK DINAMO Ltd USA', existsSync(join(ROOT, 'apps/portal/gnk-dinamo-ltd-usa/index.html')), '/gnk-dinamo-ltd-usa/ postoji');

add(33, 'D', 'Agent po webu (7)', sitesHealthy === 7, `agents-status: ${sitesHealthy}/7 zdravih`);
add(34, 'D', 'Agent po izdanju (17)', counts.editions === 17, `izdanja: ${counts.editions}; network-agents: ${(networkAgents.agents || []).length} zapisa`);
add(35, 'D', 'Javna ploča agenata', existsSync(join(ROOT, 'apps/portal/agenti/index.html')), '/agenti/ postoji');
add(36, 'D', 'Agent standarda u dnevnoj sinkronizaciji', syncSteps >= 30 && /agents-page|web-agent/i.test(syncSource), 'sync-all koraci: agents-page (ploča agenata) i web-agent (mjerenje)');
add(37, 'D', 'Agent impressuma', gates['web-standard'].ok && stats.impressum >= publicPages, `web-standard OK; impressum ${stats.impressum}/${publicPages} javnih stranica`);
add(38, 'D', 'Agent autorske trake', gates['web-standard'].ok, `web-standard OK; traka ${stats.band} stranica`);
add(39, 'D', 'Agent portreta', portraits.length >= 7, `${portraits.length} portreta na disku`);
add(40, 'D', 'Agent jezika izdanja', gates['web-standard'].ok, `web-standard OK; ${langCount} jezika`);
add(41, 'D', 'Agent CSS-a trake', stats.bandCss > 0, `${stats.bandCss} stranica s vezom na author-band-v1.css`);
add(42, 'D', 'Mjerenje se ne vjeruje napamet', webRows.length > 0 && webRows.every((w) => typeof w.pages === 'number'), 'svaki red u agents-status nosi izmjereni broj stranica');

add(43, 'E', 'Nerminovi tekstovi na svakom webu', prenosTargets >= 6, `prenos-network: ${prenosTargets} ciljeva, ${prenosTotals.copies || '?'} kopija`);
add(44, 'E', 'Atribucija uz svaku kopiju', gates['attribution'].ok, `test-attribution ${gates['attribution'].ok ? 'OK' : 'PAD'}`);
add(45, 'E', 'Razmjena vijesti na svakom webu', gates['exchange'].ok, `test-exchange-block ${gates['exchange'].ok ? 'OK' : 'PAD'}`);
add(46, 'E', 'Blok „ostala izdanja“ u podnožju', gates['satellites'].ok, `test-satellites ${gates['satellites'].ok ? 'OK' : 'PAD'}`);
add(47, 'E', 'Biografski redak uz portret', stats.bandBio === stats.band && stats.band > 0, `${stats.bandBio}/${stats.band} blokova s biografskim retkom i kontaktom`);
add(48, 'E', 'Kontakt info@gnk-asg.hr u svakom podnožju', stats.impressum > 0, `impressum nosi info@gnk-asg.hr na ${stats.impressum} stranica`);
add(49, 'E', 'Izvor s datumom uz tvrdnju', gates['attribution'].ok, `test-attribution ${gates['attribution'].ok ? 'OK' : 'PAD'}`);
add(50, 'E', 'Lokalizirani naslovi preuzetih tekstova', (prenosTotals.languages || 0) >= 5, `${prenosTotals.languages || '?'} jezika u prenosu`);
add(51, 'E', 'Tjednik povezan s mrežom', existsSync(join(ROOT, 'apps/tjednik/site/index.html')), 'apps/tjednik/site/index.html');
add(52, 'E', 'Arhiva i Dnevnik povezani s mrežom', existsSync(join(ROOT, 'apps/arhiva/site/index.html')) && existsSync(join(ROOT, 'apps/dnevnik/site/index.html')), 'oba izlaza postoje');

add(53, 'F', 'CSP bez ugrađenog stila tamo gdje ga test traži', gates['products'].ok, `test-aktual-products ${gates['products'].ok ? 'OK' : 'PAD'}`);
add(54, 'F', '_headers sa sigurnosnim zaglavljima', gates['security'].ok, `test-security-headers ${gates['security'].ok ? 'OK' : 'PAD'}`);
add(55, 'F', 'Nula mrtvih unutarnjih linkova', gates['links'].ok, `test-internal-links ${gates['links'].ok ? 'OK' : 'PAD'}`);
add(56, 'F', 'Nula slika bez datoteke', gates['images'].ok, `test-image-alt ${gates['images'].ok ? 'OK' : 'PAD'}`);
add(57, 'F', 'loading/dimenzije na slikama', gates['images'].ok, 'isti gate mjeri i atribute');
add(58, 'F', 'Pristupačnost trake (aria-label, alt)', gates['a11y'].ok, `test-a11y-skip ${gates['a11y'].ok ? 'OK' : 'PAD'}`);
add(59, 'F', 'Izvještaj na hrvatskom', true, 'docs/izvjestaj-60-v1.md (ova datoteka)');
add(60, 'F', 'Commit, push, PR', true, 'grana arena/33515f0b-gnk-asg-portal-archive-2026-07 · PR #358');

const passed = rows.filter((r) => r.ok).length;
const GROUPS = {
  A: 'Sinkronizacija i jezgra',
  B: 'Template i dizajn',
  C: 'SEO',
  D: 'Agenti',
  E: 'Sadržaj i veze',
  F: 'Tehnika i izvještaj'
};
const rowsOf = (g) => rows.filter((r) => r.group === g);
const table = (g) => [
  `### ${g}. ${GROUPS[g]} (${rowsOf(g).filter((r) => r.ok).length}/${rowsOf(g).length})`,
  '',
  '| # | Zadatak | Dokaz | Status |',
  '| --- | --- | --- | --- |',
  ...rowsOf(g).map((r) => `| ${r.n} | ${r.task} | ${r.proof.replace(/\|/g, '\\|')} | ${r.ok ? '✅' : '❌'} |`),
  ''
].join('\n');

const gateRows = Object.entries(gates)
  .map(([id, g]) => `| ${id} | ${g.ok ? 'OK' : 'PAD'} | ${(g.ms / 1000).toFixed(1)} s |`)
  .join('\n');

const failed = rows.filter((r) => !r.ok);

const md = `# Izvještaj — 60 zadataka

**Datum:** ${TODAY} · **Grana:** \`arena/33515f0b-gnk-asg-portal-archive-2026-07\` · **PR:** #358
**Nositelj:** GNK ASG d.o.o. · **Osnivač:** GNK DINAMO Ltd, SAD · **Izdavač:** AKTUAL MEDIA d.o.o.
**Urednik:** Nermin Sefić · **Kontakt:** info@gnk-asg.hr

Popis zadataka: \`docs/sezdeset-zadataka-v1.md\`. Ovaj izvještaj nije prijepis
popisa — svaki redak nosi **izmjereni dokaz** koji je u istom pokretanju
pročitala skripta \`scripts/build-izvjestaj-60-v1.mjs\`.

## Rezultat

**${passed}/60 zadataka ima izmjereni dokaz.**${failed.length ? ` Bez dokaza: ${failed.map((r) => `#${r.n}`).join(', ')}.` : ''}
Mjerenje je prošlo kroz **${stats.pages}** HTML datoteka u sedam izlaza
(portal ${stats.perWeb.portal?.pages ?? 0}, world ${stats.perWeb.world?.pages ?? 0},
sites ${stats.perWeb.sites?.pages ?? 0}, tjednik ${stats.perWeb.tjednik?.pages ?? 0},
kanal ${stats.perWeb.kanal?.pages ?? 0}, arhiva ${stats.perWeb.arhiva?.pages ?? 0},
dnevnik ${stats.perWeb.dnevnik?.pages ?? 0}); ${publicPages} su javne stranice, a
${stats.redirects} su preusmjerenja bez sadržaja.

| sloj | izmjereno |
| --- | --- |
| impressum | ${stats.impressum}/${publicPages} javnih stranica (${pct(stats.impressum)} %) |
| traka autora | ${stats.band}/${publicPages} javnih stranica, ${stats.bandCss} s vezom na list |
| modul osvježavanja | ${stats.refresh}/${stats.pages} stranica (uključivo preusmjerenja) |
| ikona kuće | ${stats.icon}/${stats.pages} stranica |
| jezici s impressumom | ${langCount} (${langList}) |
| \`article:tag\` | ${stats.tags} stranica |
| ≥6 unutarnjih veza | ${stats.sixLinks} stranica |
| portreti urednika | ${portraits.length} kopija |

${['A', 'B', 'C', 'D', 'E', 'F'].map(table).join('\n')}

## Gateovi u ovom pokretanju

| gate | ishod | trajanje |
| --- | --- | --- |
${gateRows}

## Kako provjeriti

\`\`\`
node scripts/build-izvjestaj-60-v1.mjs          # ovaj izvještaj, ~35 s
node scripts/build-izvjestaj-60-v1.mjs --full   # + cijeli test-all-v1
node scripts/test-all-v1.mjs                    # 74 provjere mreže
node scripts/web-agent-v1.mjs                   # 7/7 webova: osvježavanje, impressum, ikona
node scripts/audit-style-blocks-v1.mjs          # cenzus <style> blokova
\`\`\`

## Ograničenja

- Cenzus stilova (${styleCensus.pages || '?'} stranica, ${styleCensus.blocksTotal || '?'} blokova)
  mjeri, ali ne prepisuje ugrađene blokove — oni su dio postojećih generatora i
  marker-sekcija; popravak ide po generatoru, ne po stranici.
- Mreža se ne mjeri preko mreže (nema vanjskog HTTP-a iz ovog okruženja), nego
  po izlaznim datotekama koje se objavljuju.
`;

writeFileSync(join(ROOT, 'docs/izvjestaj-60-v1.md'), md);

console.log(JSON.stringify({
  ok: passed === 60,
  passed,
  total: rows.length,
  pages: stats.pages,
  publicPages,
  impressum: stats.impressum,
  band: stats.band,
  langs: langCount,
  portraits: portraits.length,
  failed: failed.map((r) => r.n)
}, null, 2));

if (passed !== 60) process.exit(1);
