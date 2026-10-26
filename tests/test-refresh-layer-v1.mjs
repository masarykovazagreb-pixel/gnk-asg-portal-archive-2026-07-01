#!/usr/bin/env node
/**
 * OSVJEŽAVANJE MORA RADITI NA SVAKOJ STRANICI.
 *
 * Zahtjev je bio izričit: osvježavanje na svim stranicama, ne samo na
 * naslovnici. Statistički gledano, najveći dio prometa ide na pojedinačne
 * članke i na izdanja — ako traka tamo ne postoji, čitatelj ne zna je li
 * tekst od danas ili od prošlog tjedna.
 *
 * Test provjerava, na svakom izlaznom stablu:
 *   1. modul `/assets/am-refresh-v1.js` postoji na tom webu;
 *   2. svaka javna HTML stranica učitava modul s `data-am-netday`;
 *   3. datum u modulu je stvarni podatkovni dan iz `network-counts-v1.json`
 *      (ne današnji datum iz sata — inače se stranica lažno "osvježava");
 *   4. stranica ne učitava modul dvaput i ne učitava tuđi host.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const counts = (() => {
  try { return JSON.parse(readFileSync(join(ROOT, 'apps/portal/data/network-counts-v1.json'), 'utf8')); } catch { return {}; }
})();
const DAY = counts.dataDay || '';
check(/^\d{4}-\d{2}-\d{2}$/.test(DAY), 'network-counts-v1.json nema podatkovni dan');

const WEBS = [
  { id: 'portal', root: join(ROOT, 'apps/portal') },
  { id: 'world', root: join(ROOT, 'apps/world/site') },
  { id: 'kanal', root: join(ROOT, 'apps/kanal/site') },
  { id: 'arhiva', root: join(ROOT, 'apps/arhiva/site') },
  { id: 'dnevnik', root: join(ROOT, 'apps/dnevnik/site') },
  { id: 'sites', root: join(ROOT, 'apps/sites/site') }
];

const SKIP = new Set(['admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio',
  'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard', 'digital-headquarters',
  'media-registration-admin', 'api', 'assets', 'data', '__preview', 'app', 'synapse-demo', 'pulse-demo']);

const walk = (dir, out = [], depth = 0) => {
  if (!existsSync(dir) || depth > 8) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) { if (!SKIP.has(name)) walk(full, out, depth + 1); }
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

let pages = 0;
let loaded = 0;
for (const web of WEBS) {
  if (!existsSync(web.root)) { fails.push(`${web.id}: izlaz ne postoji`); continue; }
  const module = join(web.root, 'assets', 'am-refresh-v1.js');
  if (!existsSync(module)) fails.push(`${web.id}: nema assets/am-refresh-v1.js`);

  for (const file of walk(web.root)) {
    pages += 1;
    const rel = relative(ROOT, file);
    const html = readFileSync(file, 'utf8');
    if (!/<\/body>/i.test(html)) continue;
    const tags = [...html.matchAll(/<script[^>]*am-refresh-v1\.js[^>]*><\/script>/g)].map((match) => match[0]);
    if (tags.length !== 1) { fails.push(`${rel}: modul osvježavanja ${tags.length === 0 ? 'nedostaje' : 'je dvaput'}`); continue; }
    const tag = tags[0];
    check(/data-am-netday="\d{4}-\d{2}-\d{2}"/.test(tag), `${rel}: modul bez podatkovnog dana`);
    check(!/src="https?:\/\//.test(tag), `${rel}: modul se učitava s tuđeg hosta`);
    if (DAY && !tag.includes(`data-am-netday="${DAY}"`)) fails.push(`${rel}: podatkovni dan u modulu nije ${DAY}`);
    loaded += 1;
  }
}

const report = {
  version: 'AKTUAL_MEDIA_REFRESH_LAYER_GATE_V1',
  dataDay: DAY,
  webs: WEBS.length,
  pages,
  loaded,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 12).join('\n'));
  if (fails.length > 12) console.error(`… i još ${fails.length - 12}`);
  process.exit(1);
}
