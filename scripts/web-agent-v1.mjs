#!/usr/bin/env node
/**
 * AGENT MREŽE — mjerenje standarda svakog weba.
 *
 * Ne vjeruje se izvještaju: skript prolazi kroz izlaz svakog weba i broji
 * stranice koje imaju modul osvježavanja, impressum i ikonu. Rezultat je
 * `apps/portal/data/agents-status-v1.json`, koji čita javna ploča `/agenti/`
 * i gate `tests/test-web-standard-v1.mjs`.
 *
 * Preusmjerivači se preskaču: stranica koja samo šalje na drugu adresu nije
 * stranica i ne mora imati podnožje. Googleova potvrda vlasništva također nije
 * stranica, nego datoteka s tokenom.
 *
 * Pokretanje:
 *   node scripts/web-agent-v1.mjs             svi webovi, čitljiv ispis
 *   node scripts/web-agent-v1.mjs --json      strojni izlaz
 *   node scripts/web-agent-v1.mjs --web portal   samo jedan web
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
const only = (() => {
  const i = process.argv.indexOf('--web');
  return i > -1 ? process.argv[i + 1] : null;
})();

/** Sedam webova mreže: put do izlaza, javna adresa, ime. */
const WEBS = [
  { id: 'portal', label: 'AKTUAL MEDIA (HR jezgra)', dir: 'apps/portal', base: 'https://gnk-asg.hr/' },
  { id: 'world', label: 'Svjetski portali', dir: 'apps/world/site', base: 'https://gnk-asg-world.pages.dev/' },
  { id: 'kanal', label: 'KANAL', dir: 'apps/kanal/site', base: 'https://gnk-asg-kanal.pages.dev/' },
  { id: 'arhiva', label: 'ARHIVA', dir: 'apps/arhiva/site', base: 'https://gnk-asg-arhiva.pages.dev/' },
  { id: 'dnevnik', label: 'DNEVNIK', dir: 'apps/dnevnik/site', base: 'https://gnk-asg-dnevnik.pages.dev/' },
  { id: 'sites', label: 'Samostalne stranice', dir: 'apps/sites/site', base: 'https://gnk-bor-usa.pages.dev/' },
  { id: 'tjednik', label: 'BUSINESS TJEDNIK', dir: 'apps/tjednik/site', base: 'https://gnk-asg-tjednik.pages.dev/' }
];

/* Alati i administracija nisu javne stranice. */
const SKIP = new Set([
  'admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio', 'campaign-mailer',
  'email-status', 'worker-ops', 'operator-dashboard', 'digital-headquarters',
  'media-registration-admin', 'api', 'assets', 'data', '__preview', 'app', 'synapse-demo',
  'pulse-demo', 'workers', 'scripts'
]);

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

const pct = (a, b) => (b === 0 ? 100 : Math.round((a / b) * 1000) / 10);
const nameOf = (file) => file.split('/').pop();

const results = [];
for (const web of WEBS) {
  if (only && web.id !== only) continue;
  const dir = join(ROOT, web.dir);
  if (!existsSync(dir)) {
    results.push({ ...web, error: 'nema izlaza', ok: false });
    continue;
  }
  const files = walk(dir);
  let pages = 0;
  let refresh = 0;
  let impressum = 0;
  let icon = 0;
  let redirects = 0;
  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    if (/http-equiv="refresh"/i.test(html) || /^google[0-9a-f]+\.html$/i.test(nameOf(file))) { redirects += 1; continue; }
    pages += 1;
    if (/data-am-refresh|am-refresh-v1\.js/.test(html)) refresh += 1;
    if (html.includes('data-am-impressum') || html.includes('am-impressum')) impressum += 1;
    if (/rel="icon"/i.test(html)) icon += 1;
  }
  /* Sitemap, robots i feed po subsiteu: world ima devet portala, sites šest. */
  const subdirs = readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory() && !SKIP.has(n) && n !== 'assets');
  const localWeb = (d) => ({
    sitemap: existsSync(join(d, 'sitemap.xml')),
    robots: existsSync(join(d, 'robots.txt')),
    feed: existsSync(join(d, 'feed.xml')) || existsSync(join(d, 'rss.xml')) || existsSync(join(d, 'feed.json'))
  });
  const own = localWeb(dir);
  const subsites = subdirs.filter((n) => existsSync(join(dir, n, 'index.html')) && (existsSync(join(dir, n, 'sitemap.xml')) || existsSync(join(dir, n, 'robots.txt'))));
  const subChecks = subsites.map((n) => ({ id: n, ...localWeb(join(dir, n)) }));
  const healthySubsites = subChecks.filter((s) => s.sitemap && s.robots && s.feed).length;
  const sitemap = own.sitemap || (subChecks.length > 0 && healthySubsites >= Math.ceil(subChecks.length * 0.75));
  const robots = own.robots || (subChecks.length > 0 && subChecks.every((s) => s.robots));
  const feed = own.feed || (subChecks.length > 0 && healthySubsites >= Math.ceil(subChecks.length * 0.75));

  const row = {
    id: web.id,
    label: web.label,
    base: web.base,
    pages,
    redirects,
    refresh: pct(refresh, pages),
    impressum: pct(impressum, pages),
    icon: pct(icon, pages),
    sitemap,
    robots,
    feed,
    subsites: subChecks.length,
    subsitesHealthy: healthySubsites
  };
  row.ok = row.refresh === 100 && row.impressum === 100 && row.icon === 100 && sitemap && robots && feed;
  results.push(row);
}

const healthy = results.filter((r) => r.ok).length;
const report = {
  version: 'AKTUAL_MEDIA_WEB_AGENT_V1',
  measuredAt: new Date().toISOString().slice(0, 10),
  webs: results.length,
  healthy,
  ok: healthy === results.length,
  results
};

const outFile = join(ROOT, 'apps', 'portal', 'data', 'agents-status-v1.json');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const r of results) {
    const mark = r.ok ? 'OK ' : 'PAD';
    if (r.error) { console.log(`${mark} ${r.id.padEnd(9)} ${r.error}`); continue; }
    console.log(`${mark} ${r.id.padEnd(9)} ${String(r.pages).padStart(5)} str.  ${r.refresh}% osvježavanje · ${r.impressum}% impressum · ${r.icon}% ikona`);
  }
  console.log(`Zdravo ${healthy}/${results.length} webova · apps/portal/data/agents-status-v1.json`);
}
if (!report.ok) process.exit(1);
