#!/usr/bin/env node
/**
 * SVJETSKA IZDANJA — ugovor devet portala.
 *
 * Test ne provjerava kako stranica izgleda, nego ono što se ne smije tiho
 * izgubiti: jezik i smjer pisma, vlastiti canonical, sitemap koji ne vodi
 * na tuđe stranice, feed koji vraća na kanonski osvrt, robots.txt, sigurnosna
 * zaglavlja, blok mreže s dvadeset ulaza i pokrivenost pet kontinenata.
 *
 * Pokretanje:
 *   node tests/test-world-portals-v1.mjs                 svih devet
 *   node tests/test-world-portals-v1.mjs --only tokio    jedan portal (agent)
 *   node tests/test-world-portals-v1.mjs --no-fresh      ne gradi, samo provjeri
 *
 * Ako izlaz ne postoji, test ga izgradi — isto kao što test mreže gradi
 * arhivu i dnevnik. Tako agent može stajati sam, bez prethodnog koraka.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_PORTALS, WORLD_BY_ID, portalBase, CONTINENT_LIST } from '../apps/world/lib/registry.mjs';
import { PORTALS as NETWORK_PORTALS, coreTargets, portalTargets } from '../apps/satellites/lib/network-v1.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps', 'world', 'site');
const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
const FRESH = !args.includes('--no-fresh');
const targets = ONLY ? [WORLD_BY_ID.get(ONLY)].filter(Boolean) : WORLD_PORTALS;
if (!targets.length) {
  console.error(JSON.stringify({ ok: false, reason: `nepoznat portal: ${ONLY}` }, null, 2));
  process.exit(2);
}

const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };
const read = (file) => readFileSync(file, 'utf8');
const has = (file) => existsSync(file);

function walk(dir) {
  if (!has(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

const attrs = (html, name) => [...html.matchAll(new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]*)"`, 'gi'))].map((m) => m[1]);
const links = (html) => [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gi)].map((m) => ({ href: m[1], tag: m[0] }));
const norm = (url) => String(url || '').replace(/\/+$/, '').toLowerCase();

function auditPortal(portal) {
  const dir = join(OUT, portal.id);
  const base = portalBase(portal);
  const home = join(dir, 'index.html');
  check(has(home), `${portal.id}: nema naslovnice`);
  if (!has(home)) return;

  /* 1. Jezik, smjer pisma, canonical i meta. */
  const first = read(home);
  check(new RegExp(`<html lang="${portal.lang}"`).test(first), `${portal.id}: html lang nije ${portal.lang}`);
  if (portal.lang === 'ar') check(/<html lang="ar" dir="rtl">/.test(first), `${portal.id}: arapski nije zdesna nalijevo`);
  check(first.includes(`<link rel="canonical" href="${base}/">`), `${portal.id}: canonical nije ${base}/`);
  check(attrs(first, 'description').some((value) => value.length > 40), `${portal.id}: meta description je prazna`);
  for (const value of attrs(first, 'description')) {
    check(value.length <= 160, `${portal.id}: meta description ima ${value.length} znakova (max 160)`);
  }
  check(/<title>[^<]{10,}<\/title>/.test(first), `${portal.id}: title nedostaje`);
  check(first.includes(`data-channel="${portal.id}"`), `${portal.id}: body nema data-channel`);

  /* 2. Blok mreže: 20 ulaza i svi ostali portali. */
  check(first.includes('data-mesh="v1"'), `${portal.id}: nema bloka mreže`);
  const mesh = first.match(/<nav class="mesh[\s\S]*?<\/nav>/);
  check(Boolean(mesh), `${portal.id}: blok mreže nije zatvoren`);
  if (mesh) {
    const coreCount = (mesh[0].match(/data-mesh-item=/g) || []).length;
    check(coreCount === 20 + portalTargets(base).length, `${portal.id}: mreža ima ${coreCount} stavki (očekivano ${20 + portalTargets(base).length})`);
    check(first.includes('data-mesh-group="core"') && first.includes('data-mesh-group="portals"'), `${portal.id}: nedostaje grupa mreže`);
  }
  const coreLinks = coreTargets('en').map((target) => norm(target.url));
  const hrefs = new Set(links(first).map((link) => norm(link.href)));
  for (const url of coreLinks) {
    if (norm(url) === norm(base)) continue;
    check(hrefs.has(url), `${portal.id}: naslovnica ne vodi na ${url}`);
  }
  for (const target of portalTargets(base)) {
    check(hrefs.has(norm(target.url)), `${portal.id}: naslovnica ne vodi na portal ${target.url}`);
  }

  /* 3. Svaki osvrt vodi na kanonsku adresu pod gnk-asg.hr. */
  const articlePrefix = `${portal.sourceBase}clanak/`;
  const articleLinks = links(first).filter((link) => link.href.includes('/clanak/'));
  check(articleLinks.length >= 5, `${portal.id}: premalo linkova na osvrte (${articleLinks.length})`);
  for (const link of articleLinks) {
    check(link.href.startsWith(articlePrefix), `${portal.id}: osvrt ne vodi na ${articlePrefix} (${link.href})`);
    check(/rel="external noopener"/.test(link.tag), `${portal.id}: link na osvrt bez rel="external noopener"`);
  }

  /* 4. Nijedan interni link ne smije biti http:// ni localhost. */
  for (const link of links(first)) {
    if (/^(mailto:|tel:|#)/.test(link.href)) continue;
    check(!/^http:\/\//i.test(link.href), `${portal.id}: http:// link (${link.href})`);
    check(!/localhost|127\.0\.0\.1|file:\/\//i.test(link.href), `${portal.id}: lokalni link (${link.href})`);
  }

  /* 5. Sve HTML stranice: jedan canonical, jedan blok mreže, alt na svakoj slici. */
  const pages = walk(dir);
  check(pages.length >= 8, `${portal.id}: samo ${pages.length} HTML stranica`);
  const canonicals = new Set();
  for (const file of pages) {
    const html = read(file);
    const relative = file.slice(dir.length + 1).replace(/index\.html$/, '');
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
    check(Boolean(canonical), `${portal.id}/${relative}: nema canonical`);
    /* Preneseni tekstovi (kolumne i prenos) svjesno pokazuju na izvornik:
       kopija ne smije preuzeti matičnu adresu, inače devet domena konkurira
       jedna drugoj za isti tekst. Sve ostale stranice portala ostaju
       isključivo vlastite. */
    const syndicated = ((relative.startsWith('kolumne/') || relative.startsWith('prenos/'))
      && relative.replace(/\/+$/, '').split('/').length >= 2);
    if (syndicated) {
      check(/^https:\/\/gnk-asg\.hr\/|^https:\/\/gnk-asg-kanal\.pages\.dev\//.test(canonical),
        `${portal.id}/${relative}: canonical prenesenog teksta ne vodi na naš izvornik (${canonical})`);
    } else {
      check(canonical.startsWith(`${base}/`) || canonical === base, `${portal.id}/${relative}: canonical izvan portala (${canonical})`);
    }

    check(!canonicals.has(canonical), `${portal.id}/${relative}: duplikat canonicala (${canonical})`);
    canonicals.add(canonical);
    check((html.match(/data-mesh="v1"/g) || []).length === 1, `${portal.id}/${relative}: blok mreže nije točno jedan`);
    for (const image of html.matchAll(/<img\b[^>]*>/g)) {
      check(/\balt="[^"]+"/.test(image[0]), `${portal.id}/${relative}: slika bez alt teksta`);
    }
    check(html.includes('id="sadrzaj"'), `${portal.id}/${relative}: nema glavne regije #sadrzaj`);
    check(/class="skip"/.test(html), `${portal.id}/${relative}: nema preskoka sadržaja`);
    check(!/<script\b(?![^>]*type="application\/ld\+json")/i.test(html), `${portal.id}/${relative}: stranica nosi skriptu (CSP je zaključan)`);
  }

  /* 6. Sitemap: samo vlastite stranice, bez članaka (nema dvostrukog sadržaja). */
  const sitemapFile = join(dir, 'sitemap.xml');
  check(has(sitemapFile), `${portal.id}: nema sitemap.xml`);
  if (has(sitemapFile)) {
    const xml = read(sitemapFile);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    check(locs.length >= 8, `${portal.id}: sitemap ima ${locs.length} adresa`);
    for (const loc of locs) check(loc.startsWith(`${base}/`), `${portal.id}: sitemap vodi izvan portala (${loc})`);
    check(!locs.some((loc) => loc.includes('/clanak/')), `${portal.id}: sitemap sadrži članke (dvostruki sadržaj)`);
    for (const loc of locs) {
      const path = loc.slice(base.length + 1).replace(/\/$/, '');
      const file = path ? join(dir, path, 'index.html') : join(dir, 'index.html');
      check(has(file), `${portal.id}: sitemap vodi na stranicu koje nema (${loc})`);
    }
  }

  /* 7. Feedovi: zapisi vode na kanonski osvrt. */
  const rssFile = join(dir, 'feed.xml');
  const jsonFile = join(dir, 'feed.json');
  check(has(rssFile) && has(jsonFile), `${portal.id}: nema RSS ili JSON feed`);
  if (has(rssFile)) {
    const rss = read(rssFile);
    const items = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    check(items.length >= 1, `${portal.id}: RSS nema zapisa`);
    for (const item of items) {
      const link = (item.match(/<link>([^<]+)<\/link>/) || [])[1] || '';
      check(link.startsWith(articlePrefix), `${portal.id}: RSS link nije kanonski (${link})`);
      const date = (item.match(/<pubDate>([^<]+)<\/pubDate>/) || [])[1] || '';
      check(Number.isFinite(Date.parse(date)), `${portal.id}: RSS datum nije valjan (${date})`);
    }
  }
  if (has(jsonFile)) {
    const feed = JSON.parse(read(jsonFile));
    check(feed.version === 'https://jsonfeed.org/version/1.1', `${portal.id}: JSON feed nije 1.1`);
    check(Array.isArray(feed.items) && feed.items.length >= 1, `${portal.id}: JSON feed nema zapisa`);
    for (const item of feed.items || []) check(String(item.url).startsWith(articlePrefix), `${portal.id}: JSON feed link nije kanonski`);
  }

  /* 8. Roboti, zaglavlja, manifest, llms i 404. */
  const robots = has(join(dir, 'robots.txt')) ? read(join(dir, 'robots.txt')) : '';
  check(robots.includes(`Sitemap: ${base}/sitemap.xml`), `${portal.id}: robots.txt nema sitemap`);
  const headers = has(join(dir, '_headers')) ? read(join(dir, '_headers')) : '';
  check(/Content-Security-Policy:/.test(headers), `${portal.id}: nema CSP`);
  check(/X-Frame-Options: DENY/.test(headers), `${portal.id}: nema X-Frame-Options`);
  check(/X-Content-Type-Options: nosniff/.test(headers), `${portal.id}: nema nosniff`);
  check(has(join(dir, 'manifest.webmanifest')), `${portal.id}: nema manifest`);
  check(has(join(dir, 'llms.txt')), `${portal.id}: nema llms.txt`);
  check(has(join(dir, '404.html')), `${portal.id}: nema 404`);
  check(has(join(dir, 'assets', 'brand.webp')), `${portal.id}: nema znaka izdanja`);
}

/* Ako izlaz ne postoji, izgradi ga — test tada radi sam, bez prethodnog koraka. */
for (const portal of targets) {
  if (!FRESH || has(join(OUT, portal.id, 'index.html'))) continue;
  execFileSync(process.execPath, [join(ROOT, 'apps', 'world', 'build.mjs'), '--only', portal.id], { cwd: ROOT, stdio: 'pipe' });
}

for (const portal of targets) auditPortal(portal);

/* Mreža mora poznavati svaki portal — inače se nigdje ne linka. */
const networkUrls = new Set(NETWORK_PORTALS.map((portal) => norm(portal.url)));
for (const portal of WORLD_PORTALS) {
  check(networkUrls.has(norm(portal.base)), `${portal.id}: nije u popisu portala mreže`);
}

/* Pokrivenost kontinenata je ugovor, ne tvrdnja. */
const continents = new Set(WORLD_PORTALS.map((portal) => portal.continent.hr));
for (const continent of CONTINENT_LIST) check(continents.has(continent), `kontinent ${continent} nema portal`);
check(continents.size === 5, `portali pokrivaju ${continents.size} kontinenata (očekivano 5)`);

/* Domene su jedinstvene i pripadaju registru. */
const domains = WORLD_PORTALS.map((portal) => portal.domain);
check(new Set(domains).size === domains.length, 'duplikat domene među portalima');
for (const portal of WORLD_PORTALS) {
  check(/^gnk-world-[a-z]+\.pages\.dev$/.test(portal.domain), `${portal.id}: domena nije gnk-world-<id>.pages.dev`);
}

const report = {
  ok: fails.length === 0,
  version: 'GNK_ASG_WORLD_PORTALS_V1_20261022',
  portals: targets.map((portal) => ({
    id: portal.id,
    domain: portal.domain,
    lang: portal.lang,
    continent: portal.continent.hr,
    pages: walk(join(OUT, portal.id)).length
  })),
  continents: [...continents].sort(),
  failures: fails.slice(0, 40)
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) process.exit(1);
