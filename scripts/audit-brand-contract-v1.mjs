#!/usr/bin/env node
/**
 * UGOVOR O BRENDU — jedno ime, jedan znak, jedan izdavač.
 *
 * Zašto: ime kuće se dosad pisalo u deset varijanti ("GNK ASG MREŽA",
 * "GNK ASG MEDIA DESK", "AKTUAL MEDIA — medijski brend na gnk-asg.hr"), a
 * meta `publisher` nije bio na svakom webu. Čitatelj i tražilica tako dobivaju
 * dvije kuće, a mreža izgleda kao skup nepovezanih stranica.
 *
 * Ugovor:
 *  1. svaki javni web mreže nosi znak kuće (`aktual-media-mark.svg`) ili
 *     vlastiti znak izdanja iz istog sustava (`/assets/brand/…`);
 *  2. svaki javni web navodi istog izdavača u `meta publisher`:
 *     "AKTUAL MEDIA d.o.o.";
 *  3. nijedna stranica ne nosi umirovljeno ime kuće (popis niže);
 *  4. naslov naslovnice sadrži "AKTUAL MEDIA" ili ime izdanja iz registra.
 *
 * Korporativni portal (gnk-asg.hr/) je izuzet: to je stranica matičnog
 * društva GNK ASG d.o.o., pa ondje izdavač ostaje GNK ASG d.o.o.
 *
 *   node scripts/audit-brand-contract-v1.mjs [--strict]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES } from '../apps/sites/lib/registry.mjs';
import { WORLD_PORTALS } from '../apps/world/lib/registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STRICT = process.argv.includes('--strict');
const CHANNELS = JSON.parse(readFileSync(join(ROOT, 'apps/region/channels.json'), 'utf8')).channels;

const PUBLISHER = 'AKTUAL MEDIA d.o.o.';

/* Imena koja su bila u upotrebi, a više nisu ime kuće. */
const RETIRED = [
  'GNK ASG MREŽA',
  'GNK ASG MEDIA DESK',
  'GNK ASG NEWS',
  'GNK ASG PORTAL',
  'AKTUAL MEDIA — medijski brend na gnk-asg.hr'
];

const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

const SKIP = new Set([
  'admin', 'admin-center', 'admin-login', 'automation-status', 'webmail', 'mail-studio',
  'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard', 'api', 'assets',
  'data', '__preview', 'app', 'workers', 'scripts', 'digital-headquarters',
  'media-registration-admin', 'control', 'pulse-demo', 'synapse-demo'
]);

const CANONICAL_ICON = readFileSync(join(ROOT, 'apps/shared/brand/favicon.svg'), 'utf8');

/* Mapa "vlastiti host → mapa weba". Služi za dvije stvari: ikona smije biti
   zapisana punim URL-om na vlastiti host (arhiva, dnevnik, prijenske kopije na
   samostalnim webovima), ali ne na tuđi; i time se provjerava da datoteka
   stvarno postoji na tom webu. */
const HOST_DIRS = new Map();
const addHost = (base, dir) => {
  const host = String(base || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (host && dir && existsSync(join(ROOT, dir))) HOST_DIRS.set(host, dir);
};
for (const site of SITES) addHost(site.base, `apps/sites/site/${site.slug}`);
for (const portal of WORLD_PORTALS) addHost(portal.base || portal.url, `apps/world/site/${portal.id}`);
for (const channel of CHANNELS) addHost(channel.base || channel.url, `apps/portal/kanal/${channel.id}`);
addHost('https://gnk-asg-arhiva.pages.dev/', 'apps/arhiva/site');
addHost('https://gnk-asg-dnevnik.pages.dev/', 'apps/dnevnik/site');
addHost('https://gnk-asg-kanal.pages.dev/', 'apps/kanal/site');
addHost('https://gnk-asg.hr/', 'apps/portal');

/* 1) Nijedna javna stranica ne nosi umirovljeno ime, a svaka nosi isti znak. */
let scanned = 0;
let icons = 0;
const iconMisses = [];
for (const base of ['apps/portal', 'apps/sites/site', 'apps/world/site', 'apps/arhiva/site', 'apps/dnevnik/site', 'apps/kanal/site', 'apps/tjednik/site']) {
  if (!existsSync(join(ROOT, base))) continue;
  for (const file of walk(join(ROOT, base))) {
    const rel = relative(join(ROOT, base), file);
    if (rel.split('/').some((segment) => SKIP.has(segment))) continue;
    const html = readFileSync(file, 'utf8');
    if (!/<html[\s>]/i.test(html)) continue;
    scanned += 1;
    for (const name of RETIRED) {
      if (html.includes(name)) fails.push(`${base}/${rel}: umirovljeno ime kuće „${name}“`);
    }

    /* Isti favicon na svakoj javnoj stranici. Prije je svako izdanje crtalo
       svoje slovo, pa je mreža na karticama preglednika bila 31 različit web. */
    const icon = html.match(/<link rel="icon" href="([^"]+)"/);
    if (!icon) { if (iconMisses.length < 10) iconMisses.push(`${base}/${rel}: nema rel="icon"`); continue; }
    const href = icon[1].split('?')[0];
    /* Arhiva i dnevnik pišu ikonu punim URL-om na vlastiti host (tako traži
       njihov test). Host mora biti jedan od naših, inače slika ovisi o tuđem
       poslužitelju. */
    let pathname = href;
    let hostDir = null;
    if (/^https?:/.test(href)) {
      const url = new URL(href);
      hostDir = HOST_DIRS.get(url.host);
      if (!hostDir) { if (iconMisses.length < 10) iconMisses.push(`${base}/${rel}: ikona s tuđeg hosta (${url.host})`); continue; }
      pathname = url.pathname;
    }
    /* Apsolutni put vodi na korijen TOG weba, ne na korijen cijelog stabla:
       `sites/site/bor-usa/index.html` + `/assets/favicon.svg` znači
       `sites/site/bor-usa/assets/favicon.svg`. Zato se korijen traži penjanjem
       do prve mape koja ima `assets/`. */
    let webRoot = dirname(file);
    while (!existsSync(join(webRoot, 'assets')) && webRoot !== ROOT) {
      const up = dirname(webRoot);
      if (up === webRoot) break;
      webRoot = up;
    }
    const target = pathname.startsWith('/')
      ? join(ROOT, hostDir || relative(ROOT, webRoot), pathname)
      : resolve(dirname(file), pathname);
    if (!existsSync(target)) { if (iconMisses.length < 10) iconMisses.push(`${base}/${rel}: ikona ${href} ne postoji`); continue; }
    if (readFileSync(target, 'utf8') !== CANONICAL_ICON) { if (iconMisses.length < 10) iconMisses.push(`${base}/${rel}: ikona ${href} nije znak kuće`); continue; }
    icons += 1;
  }
}
for (const miss of iconMisses) fails.push(miss);

/* 2) Svaki web mreže: znak, izdavač i naslov. */
const editions = [
  ...CHANNELS.map((channel) => ({
    file: `apps/portal/kanal/${channel.id}/index.html`,
    name: channel.title,
    label: `kanal ${channel.id}`
  })),
  ...WORLD_PORTALS.map((portal) => ({
    file: `apps/world/site/${portal.id}/index.html`,
    name: portal.city,
    label: `svijet ${portal.id}`
  })),
  ...SITES.map((site) => ({
    file: `apps/sites/site/${site.slug}/index.html`,
    name: site.name,
    label: `web ${site.slug}`
  })),
  { file: 'apps/portal/gnk-aktual/index.html', name: 'AKTUAL MEDIA', label: 'središte' },
  { file: 'apps/portal/en/gnk-aktual/index.html', name: 'AKTUAL MEDIA', label: 'središte EN' },
  { file: 'apps/arhiva/site/index.html', name: 'AKTUAL ARHIVA', label: 'arhiva' },
  { file: 'apps/dnevnik/site/index.html', name: 'AKTUAL DNEVNIK', label: 'dnevnik' },
  { file: 'apps/kanal/site/index.html', name: 'KANAL ZAGREB', label: 'kanal (web)' },
  { file: 'apps/portal/prenos/index.html', name: 'AKTUAL MEDIA', label: 'prijenos' },
  { file: 'apps/portal/en/prenos/index.html', name: 'AKTUAL MEDIA', label: 'prijenos EN' }
];

let checked = 0;
for (const edition of editions) {
  const file = join(ROOT, edition.file);
  check(existsSync(file), `${edition.file}: ne postoji`);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  checked += 1;

  check(/aktual-media-mark\.svg|assets\/brand\/[^"]*\.(svg|webp)/.test(html), `${edition.label}: nema znaka kuće`);
  const publisher = (html.match(/<meta name="publisher" content="([^"]*)"/) || [])[1] || '';
  check(publisher === PUBLISHER, `${edition.label}: meta publisher je „${publisher}“ (očekivano „${PUBLISHER}“)`);

  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const named = /AKTUAL MEDIA/i.test(title) || (edition.name && title.toLowerCase().includes(String(edition.name).toLowerCase()));
  check(named, `${edition.label}: naslov ne imenuje izdanje (${title.slice(0, 80)})`);
}

const report = {
  version: 'AKTUAL_MEDIA_BRAND_CONTRACT_V1',
  pages: scanned,
  icons,
  editions: checked,
  publisher: PUBLISHER,
  failures: fails.length,
  strict: STRICT
};
console.log(JSON.stringify({ ...report, ok: fails.length === 0 }, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 25).join('\n'));
  if (fails.length > 25) console.error(`… i još ${fails.length - 25}`);
  process.exit(1);
}
