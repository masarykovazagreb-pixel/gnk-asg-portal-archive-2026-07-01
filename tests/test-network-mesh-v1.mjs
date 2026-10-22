#!/usr/bin/env node
/**
 * MREŽA — paukova mreža, ne zvijezda.
 *
 * Test provjerava da svaki samostalni portal nosi isti blok i da u njemu
 * stvarno stoji dvadeset ulaza u maticu (AKTUAL MEDIA, arhiva, dnevnik i
 * 17 gradskih izdanja) te svi ostali portali. Bez ovog testa blok može
 * tiho izgubiti izdanje ili portal, a da stranica i dalje izgleda ispravno.
 *
 * Pravila koja test čuva:
 *  - 20 stavki u jezgri, bez duplikata;
 *  - nijedan portal ne linka sam sebe (vlastita stavka je označena, ne link);
 *  - svaki link je apsolutan https i nosi rel="external noopener";
 *  - hrvatski i engleski ulaz imaju isti skup adresa;
 *  - arhiva i dnevnik nisu izuzeti — i oni su dio mreže.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTALS as NETWORK_PORTALS } from '../apps/satellites/lib/network-v1.mjs';
import { WORLD_PORTALS } from '../apps/world/lib/registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const has = (rel) => existsSync(join(ROOT, rel));

/* Arhiva i dnevnik nisu u gitu — grade se u deployu. Ako ih nema, izgradi
   ih ovdje (bez mreže, iz arhive izdanja) da test ima što provjeriti. */
for (const [dir, script] of [['apps/arhiva/site/index.html', 'apps/arhiva/engine/build.mjs'], ['apps/dnevnik/site/index.html', 'apps/dnevnik/engine/build.mjs']]) {
  if (!has(dir)) {
    execFileSync(process.execPath, [join(ROOT, script)], { cwd: ROOT, stdio: 'pipe' });
  }
}
/* Devet svjetskih portala gradi se iz istog popisa; ako izlaz ne postoji,
   test ga izgradi prije provjere (kao i arhivu i dnevnik). */
if (!has('apps/world/site/tokio/index.html')) {
  execFileSync(process.execPath, [join(ROOT, 'apps/world/build.mjs')], { cwd: ROOT, stdio: 'pipe' });
}

const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const SITES = ['bor-usa', 'kosarka', 'scena-znanosti', 'step-buducnosti', 'zdravlje', 'izbori-srbija'];
const CHANNELS = JSON.parse(read('apps/region/channels.json')).channels;
const EDITION_URLS = CHANNELS.map((channel) => channel.base.replace(/\/+$/, ''));
const CORE = ['https://gnk-asg.hr/gnk-aktual', 'https://gnk-asg-arhiva.pages.dev', 'https://gnk-asg-dnevnik.pages.dev', ...EDITION_URLS];
/* Popis portala dolazi iz samog lib-a — test ne smije imati vlastiti popis,
   inače novi portal tiho izostane iz provjere. */
const PORTALS = NETWORK_PORTALS.map((portal) => portal.url);

const group = (html, name) => {
  const match = html.match(new RegExp(`data-mesh-group="${name}"[\\s\\S]*?</ul>`));
  return match ? match[0] : '';
};
const items = (html, name) => [...group(html, name).matchAll(/<li\b[^>]*data-mesh-item="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)]
  .map((m) => ({ id: m[1], body: m[2], href: (m[2].match(/href="([^"]+)"/) || [])[1] || '' }));
const norm = (url) => String(url || '').replace(/\/+$/, '');

function audit(file, selfUrl) {
  check(has(file), `${file}: ne postoji`);
  if (!has(file)) return;
  const html = read(file);
  check(html.includes('data-mesh="v1"'), `${file}: nema bloka mreže`);
  const core = items(html, 'core');
  const portals = items(html, 'portals');
  const expectedPortals = PORTALS.filter((url) => !['https://gnk-asg-arhiva.pages.dev', 'https://gnk-asg-dnevnik.pages.dev'].includes(norm(url)) && norm(url) !== norm(selfUrl)).length;
  check(core.length === 20, `${file}: jezgra ima ${core.length} stavki (očekivano 20)`);
  check(portals.length === expectedPortals, `${file}: portala ${portals.length} (očekivano ${expectedPortals})`);

  const coreLinks = core.map((row) => norm(row.href)).filter(Boolean);
  check(new Set(coreLinks).size === coreLinks.length, `${file}: duplikat u jezgri`);
  for (const url of CORE) {
    if (norm(url) === norm(selfUrl)) continue;
    check(coreLinks.includes(norm(url)), `${file}: jezgra ne vodi na ${url}`);
  }
  check(core.length - coreLinks.length <= 1, `${file}: jezgra ima više self stavki nego što treba`);

  const portalLinks = portals.map((row) => norm(row.href)).filter(Boolean);
  for (const url of PORTALS) {
    if (norm(url) === norm(selfUrl)) continue;
    if (['https://gnk-asg-arhiva.pages.dev', 'https://gnk-asg-dnevnik.pages.dev'].includes(norm(url))) {
      /* Arhiva i dnevnik su u jezgri — tamo se i provjeravaju. */
      check(coreLinks.includes(norm(url)), `${file}: jezgra ne vodi na ${url}`);
      continue;
    }
    check(portalLinks.includes(norm(url)), `${file}: portali ne vode na ${url}`);
  }
  check(!portalLinks.includes(norm(selfUrl)), `${file}: portal linka sam sebe`);

  const allLinks = [...core, ...portals].map((row) => row.href).filter(Boolean);
  for (const href of allLinks) {
    check(/^https:\/\//.test(href), `${file}: link nije apsolutan https (${href})`);
  }
  const anchors = [...group(html, 'core').matchAll(/<a\b[^>]*>/g), ...group(html, 'portals').matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  check(anchors.length === allLinks.length, `${file}: broj <a> i hrefova se razlikuje`);
  for (const anchor of anchors) {
    check(/rel="external noopener"/.test(anchor), `${file}: link bez rel="external noopener" (${(anchor.match(/href="([^"]+)"/) || [])[1]})`);
    check(!/nofollow/.test(anchor), `${file}: nofollow na mrežnom linku`);
  }
}

for (const slug of SITES) {
  const base = `https://gnk-${slug}.pages.dev/`;
  audit(`apps/sites/site/${slug}/index.html`, base);
  /* Engleski ulaz mora nositi isti skup adresa, samo prevedene natpise. */
  const enFile = `apps/sites/site/${slug}/en/index.html`;
  if (has(enFile)) {
    const en = read(enFile);
    check(en.includes('data-mesh="v1"'), `${enFile}: nema bloka mreže`);
    check(en.includes('data-mesh-group="core"') && items(en, 'core').length === 20, `${enFile}: jezgra nema 20 stavki`);
    check(/AKTUAL MEDIA network|The AKTUAL MEDIA network/.test(en), `${enFile}: blok nije na engleskom`);
  }
}

audit('apps/arhiva/site/index.html', 'https://gnk-asg-arhiva.pages.dev/');
audit('apps/dnevnik/site/index.html', 'https://gnk-asg-dnevnik.pages.dev/');

/* Devet svjetskih portala: svaki nosi isti blok, a vlastita adresa je
   označena u drugom sloju (ili izostavljena kao link). */
for (const portal of WORLD_PORTALS) {
  audit(`apps/world/site/${portal.id}/index.html`, portal.base);
}

/* Gradska izdanja na gnk-asg.hr: svaka naslovnica nosi isti blok, a hub
   /kanal/ je popis svih sedamnaest. */
for (const channel of CHANNELS) {
  audit(`apps/portal/kanal/${channel.id}/index.html`, channel.base);
}
audit('apps/portal/kanal/index.html', 'https://gnk-asg.hr/kanal/');

/* Blok ne smije ponavljati isti link dva puta na istoj stranici. */
for (const file of ['apps/arhiva/site/index.html', 'apps/dnevnik/site/index.html', ...SITES.map((slug) => `apps/sites/site/${slug}/index.html`), ...WORLD_PORTALS.map((portal) => `apps/world/site/${portal.id}/index.html`), ...CHANNELS.map((channel) => `apps/portal/kanal/${channel.id}/index.html`), 'apps/portal/kanal/index.html']) {
  if (!has(file)) continue;
  const html = read(file);
  const all = [...html.matchAll(/data-mesh-link="([^"]+)"/g)].map((m) => m[1]);
  check(new Set(all).size === all.length, `${file}: isti link dva puta u bloku (${all.filter((x, i) => all.indexOf(x) !== i).join(', ')})`);
}

const report = {
  ok: fails.length === 0,
  version: 'GNK_ASG_NETWORK_MESH_V1_20261022',
  editions: CHANNELS.length,
  portals: PORTALS.length,
  core: 20,
  checked: SITES.length * 2 + 2 + WORLD_PORTALS.length + CHANNELS.length + 1,
  failures: fails.slice(0, 40)
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) process.exit(1);
