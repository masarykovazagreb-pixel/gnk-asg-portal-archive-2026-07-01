#!/usr/bin/env node
/**
 * UZVRATNOST: SVAKI WEB VODI NA SVAKI DRUGI.
 *
 * Mreža od 35 webova nije mreža ako veze idu samo u jednom smjeru. Do
 * 24. 10. 2026. KANAL nije bio povezan ni s jednog izdanja, a sam nije vodio
 * ni na jedno izdanje; arhiva i dnevnik dijelili su sudbinu. Čitatelj koji je
 * došao iz tražilice na dnevni pregled ostajao je u slijepoj ulici.
 *
 * Test uzima registar mreže (`apps/portal/data/mreza-v1.json` — 17 izdanja,
 * 9 svjetskih portala, 6 webova) i provjerava dvije stvari za svaki web:
 *   1. uzvratnost: ako A vodi na B, B vodi na A;
 *   2. dubinu: svaki web ima najmanje 20 izlaznih veza na mrežu.
 *
 * Veza se broji po hostu (samostalne domene) ili po putanji (izdanja koja
 * žive na gnk-asg.hr), pa se ne može "zadovoljiti" linkom na vlastitu
 * naslovnicu.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const registry = JSON.parse(readFileSync(join(ROOT, 'apps/portal/data/mreza-v1.json'), 'utf8'));

const webs = [
  ...registry.editions.map((edition) => ({ id: edition.id, kind: 'izdanje', url: edition.url, file: `apps/portal/kanal/${edition.id}/index.html` })),
  ...registry.world.map((portal) => ({ id: portal.id, kind: 'svijet', url: portal.url, file: `apps/world/site/${portal.id}/index.html` })),
  ...registry.sites.map((site) => ({ id: site.slug, kind: 'web', url: site.url, file: `apps/sites/site/${site.slug}/index.html` })),
  { id: 'arhiva', kind: 'portal', url: 'https://gnk-asg-arhiva.pages.dev/', file: 'apps/arhiva/site/index.html' },
  { id: 'dnevnik', kind: 'portal', url: 'https://gnk-asg-dnevnik.pages.dev/', file: 'apps/dnevnik/site/index.html' },
  { id: 'kanal', kind: 'portal', url: 'https://gnk-asg-kanal.pages.dev/', file: 'apps/kanal/site/index.html' }
];

const hostOf = (url) => String(url).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const pathOf = (url) => new URL(url).pathname;

const pages = new Map();
for (const web of webs) {
  const file = join(ROOT, web.file);
  check(existsSync(file), `${web.id}: nema naslovnice (${web.file})`);
  if (existsSync(file)) pages.set(web.id, readFileSync(file, 'utf8'));
}

/* 1. Uzvratnost A→B i B→A. */
const linksTo = (from, toUrl) => {
  const html = pages.get(from);
  if (!html) return false;
  const url = typeof toUrl === 'string' ? toUrl : toUrl.url;
  const host = hostOf(url);
  const path = pathOf(url);
  if (host === 'gnk-asg.hr') return path !== '/' && html.includes(path);
  if (html.includes(host)) return true;
  /* Izdanja se međusobno zovu i putanjom, i hostom. */
  return path !== '/' && html.includes(path);
};

const matrix = [];
for (const from of webs) {
  for (const to of webs) {
    if (from.id === to.id) continue;
    const forward = linksTo(from.id, to.url);
    const back = linksTo(to.id, from.url);
    matrix.push({ from: from.id, to: to.id, forward, back });
    if (forward && !back) fails.push(`uzvratnost: ${from.id} → ${to.id} postoji, ali ${to.id} → ${from.id} ne`);
  }
}

/* 2. Dubina: najmanje 20 izlaznih veza na mrežu po webu. */
const outbound = [];
for (const web of webs) {
  const html = pages.get(web.id) || '';
  const targets = new Set();
  for (const other of webs) {
    if (other.id === web.id) continue;
    if (linksTo(web.id, other.url)) targets.add(other.id);
  }
  outbound.push({ id: web.id, links: targets.size });
  check(targets.size >= 20, `${web.id}: samo ${targets.size} izlaznih veza na mrežu (najmanje 20)`);
}

const weakest = [...outbound].sort((a, b) => a.links - b.links).slice(0, 3);
const report = {
  version: 'AKTUAL_MEDIA_NETWORK_RECIPROCITY_V1',
  webs: webs.length,
  pairs: matrix.length,
  forward: matrix.filter((pair) => pair.forward).length,
  reciprocal: matrix.filter((pair) => pair.forward && pair.back).length,
  weakest,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 15).join('\n'));
  if (fails.length > 15) console.error(`… i još ${fails.length - 15}`);
  process.exit(1);
}
