#!/usr/bin/env node
/**
 * STANDARD SVAKOG WEBA — gate.
 *
 * Provjerava da nijedan web mreže nije ispao iz dogovorenog standarda:
 * impressum (nositelj, osnivač, izdavač, urednik, kontakt), modul osvježavanja,
 * ikona, sitemap, robots i feed — te autorska traka s portretom urednika na
 * svakom webu i na svakom gradskom izdanju, na jeziku tog izdanja.
 *
 * Gate ne vjeruje izvještaju agenata: pokreće mjerenje ponovno, jer izvještaj
 * može biti star.
 *
 * Pokretanje: node tests/test-web-standard-v1.mjs
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = spawnSync(process.execPath, [join(ROOT, 'scripts', 'web-agent-v1.mjs'), '--json'], { encoding: 'utf8' });
const file = join(ROOT, 'apps', 'portal', 'data', 'agents-status-v1.json');
if (!existsSync(file)) {
  console.error('nema agents-status-v1.json — pokreni scripts/web-agent-v1.mjs');
  process.exit(1);
}

const report = JSON.parse(readFileSync(file, 'utf8'));
const failures = [];
for (const web of report.results) {
  if (web.refresh !== 100) failures.push(`${web.id}: osvježavanje ${web.refresh}% (mora 100%)`);
  if (web.impressum !== 100) failures.push(`${web.id}: impressum ${web.impressum}% (mora 100%)`);
  if (web.icon !== 100) failures.push(`${web.id}: ikona ${web.icon}% (mora 100%)`);
  if (!web.sitemap) failures.push(`${web.id}: nema sitemap.xml`);
  if (!web.robots) failures.push(`${web.id}: nema robots.txt`);
  if (!web.feed) failures.push(`${web.id}: nema feeda`);
}

/* Impressum mora nositi sve činjenice iz ugovora kuće, na svakom webu. */
const FACTS = ['GNK ASG d.o.o.', 'GNK DINAMO Ltd', 'AKTUAL MEDIA d.o.o.', 'Nermin Sefić', 'info@gnk-asg.hr'];
const samples = [
  'apps/portal/index.html',
  'apps/world/site/tokio/index.html',
  'apps/sites/site/bor-usa/index.html',
  'apps/arhiva/site/index.html',
  'apps/dnevnik/site/index.html',
  'apps/kanal/site/index.html',
  'apps/tjednik/site/index.html'
];
for (const rel of samples) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) { failures.push(`${rel}: nema stranice`); continue; }
  const html = readFileSync(full, 'utf8');
  if (!html.includes('data-am-impressum')) failures.push(`${rel}: nema impressuma`);
  for (const fact of FACTS) if (!html.includes(fact)) failures.push(`${rel}: impressum ne sadrži „${fact}"`);
}

/* Urednik mora biti vidljiv na svakom webu: traka s portretom i funkcijom. */
for (const rel of samples) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) continue;
  const html = readFileSync(full, 'utf8');
  if (!html.includes('data-am-author="v1"')) { failures.push(`${rel}: nema autorske trake`); continue; }
  const img = (html.match(/data-am-author="v1"[\s\S]{0,600}?src="([^"]+)"/) || [])[1];
  if (!img) { failures.push(`${rel}: traka bez portreta`); continue; }
  const local = join(dirname(full), img.replace(/^\//, ''));
  if (!existsSync(local)) failures.push(`${rel}: portret ne postoji (${img})`);
  if (!html.includes('Nermin Sefić')) failures.push(`${rel}: traka bez imena urednika`);
}

/* Svako gradsko izdanje: traka, portret na disku, CSS u vanjskom listu,
   i impressum na jeziku izdanja (bez hrvatskog okvira na nehrvatskoj stranici). */
const kanal = join(ROOT, 'apps', 'portal', 'kanal');
const HR_ONLY = ['Sadržaj se objavljuje', 'Izdavač i kontakt', 'Nositelj:'];
for (const city of readdirSync(kanal)) {
  const dir = join(kanal, city);
  if (!statSync(dir).isDirectory() || city === 'assets' || city === 'data') continue;
  const index = join(dir, 'index.html');
  if (!existsSync(index)) { failures.push(`kanal/${city}: nema naslovnice`); continue; }
  const html = readFileSync(index, 'utf8');
  const lang = (html.match(/<html[^>]*\blang="([a-zA-Z-]+)"/) || [])[1] || 'hr';
  if (!html.includes('data-am-author="v1"')) failures.push(`kanal/${city}: nema autorske trake`);
  if (!existsSync(join(dir, 'assets', 'people', 'nermin-sefic.webp'))) failures.push(`kanal/${city}: nema portreta`);
  const css = join(dir, 'assets', 'region.css');
  if (!existsSync(css) || !readFileSync(css, 'utf8').includes('.am-author{')) failures.push(`kanal/${city}: nema CSS-a autorske trake`);
  if (/<style[^>]*data-am-author-css/i.test(html)) failures.push(`kanal/${city}: ugrađeni stil u traci`);
  if (!['hr', 'sr', 'bs'].includes(lang)) {
    for (const marker of HR_ONLY) {
      if (html.includes(marker)) failures.push(`kanal/${city} (${lang}): hrvatski okvir „${marker}"`);
    }
  }
}

const result = {
  version: 'AKTUAL_MEDIA_WEB_STANDARD_GATE_V1',
  webs: report.webs,
  healthy: report.healthy,
  editions: readdirSync(kanal).filter((n) => statSync(join(kanal, n)).isDirectory() && n !== 'assets' && n !== 'data').length,
  exit: run.status,
  failures: failures.length,
  notes: failures.slice(0, 20),
  ok: failures.length === 0 && report.ok
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
