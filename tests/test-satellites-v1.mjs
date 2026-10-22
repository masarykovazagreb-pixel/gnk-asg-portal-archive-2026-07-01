#!/usr/bin/env node
/**
 * Gate za samostalne portale: AKTUAL ARHIVA (apps/arhiva/site) i
 * AKTUAL DNEVNIK (apps/dnevnik/site).
 *
 * Provjerava ono što se lako pokvari i što Google/čitatelj vide prvo:
 *  - svaka stranica: jedan <h1>, <title> ≤ 60, description ≤ 160 (osim noindex),
 *    canonical, hreflang par (hr/en + x-default), OG/Twitter slika 1200×630;
 *  - hreflang je uzajaman: HR stranica pokazuje na EN, EN na HR, i obje
 *    postoje na popisu stranica tog portala;
 *  - svaka <img> ima alt; vanjske slike idu isključivo kroz /api/img;
 *  - JSON-LD se parsira, ima @graph, točno jedan WebSite čvor i publisher;
 *  - interni linkovi vode na postojeću datoteku (nema mrtvih ruta);
 *  - sitemap.xml: valjan XML, svi URL-ovi unutar vlastite domene, svaki
 *    indeksabilan canonical je u sitemapu, nema duplikata;
 *  - robots.txt, feed.xml, 404.html i assets/site.css postoje;
 *  - "linija": svaka stranica linka na gnk-asg.hr, sestrinski portal i
 *    vlastiti jezični par.
 *
 * Pokretanje: node tests/test-satellites-v1.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAIN = 'https://gnk-asg.hr';

const SITES = [
  { id: 'arhiva', name: 'AKTUAL ARHIVA', dir: join(ROOT, 'apps/arhiva/site'), url: 'https://gnk-asg-arhiva.pages.dev', sister: 'https://gnk-asg-dnevnik.pages.dev' },
  { id: 'dnevnik', name: 'AKTUAL DNEVNIK', dir: join(ROOT, 'apps/dnevnik/site'), url: 'https://gnk-asg-dnevnik.pages.dev', sister: 'https://gnk-asg-arhiva.pages.dev' },
];

const failures = [];
const notes = [];
const fail = (site, file, msg) => failures.push(`${site.id}: ${file ? file + ': ' : ''}${msg}`);

const walk = (dir, ext, out = []) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
};

const attr = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

for (const site of SITES) {
  if (!existsSync(site.dir)) { fail(site, null, 'izlazni direktorij ne postoji — pokreni build'); continue; }

  const files = walk(site.dir, '.html');
  if (!files.length) fail(site, null, 'nema HTML stranica');

  // Prvi prolaz: učitaj sve stranice i njihove canonicale.
  const pages = files.map((file) => {
    const rel = relative(site.dir, file).replace(/\\/g, '/');
    const html = readFileSync(file, 'utf8');
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
    const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/);
    const hreflang = Object.fromEntries(
      [...html.matchAll(/<link rel="alternate" hreflang="([^"]*)" href="([^"]*)"/g)].map((m) => [m[1], decode(m[2])])
    );
    return { rel, file, html, noindex, canonical: canonical ? decode(canonical) : null, hreflang };
  });
  const byCanonical = new Map(pages.filter((p) => p.canonical).map((p) => [p.canonical, p]));

  const canonicalSeen = new Map();
  const indexable = new Set();

  for (const p of pages) {
    const { rel, html } = p;

    // h1
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) fail(site, rel, `<h1> se pojavljuje ${h1}×`);

    // title
    const title = decode(attr(html, /<title>([\s\S]*?)<\/title>/) || '');
    if (!title) fail(site, rel, 'nema <title>');
    else if (title.length > 60) fail(site, rel, `<title> ima ${title.length} znakova (max 60): ${title}`);
    else if (title.length < 25) fail(site, rel, `<title> ima samo ${title.length} znakova: ${title}`);

    // description
    const desc = decode(attr(html, /<meta name="description" content="([^"]*)"/) || '');
    if (!p.noindex) {
      if (!desc) fail(site, rel, 'nema meta description');
      else if (desc.length > 160) fail(site, rel, `description ima ${desc.length} znakova (max 160)`);
      else if (desc.length < 70) fail(site, rel, `description ima samo ${desc.length} znakova`);
    }

    // zabranjeni meta
    if (/name="(keywords|news_keywords)"/.test(html)) fail(site, rel, 'meta keywords/news_keywords nije dopušten');

    // canonical
    if (!p.noindex) {
      if (!p.canonical) fail(site, rel, 'nema canonical');
      else {
        if (!p.canonical.startsWith(site.url)) fail(site, rel, `canonical nije na vlastitoj domeni: ${p.canonical}`);
        if (canonicalSeen.has(p.canonical)) fail(site, rel, `canonical je duplikat s ${canonicalSeen.get(p.canonical)}: ${p.canonical}`);
        canonicalSeen.set(p.canonical, rel);
        indexable.add(p.canonical);
      }
    }

    // hreflang: ja + par + x-default
    if (!p.noindex) {
      for (const need of ['hr', 'en', 'x-default']) {
        if (!p.hreflang[need]) fail(site, rel, `nedostaje hreflang="${need}"`);
      }
      if (p.hreflang.hr && p.hreflang.en) {
        if (p.hreflang.hr === p.hreflang.en) fail(site, rel, 'hr i en hreflang pokazuju na istu adresu');
        const self = p.hreflang[p.rel.startsWith('en/') ? 'en' : 'hr'];
        if (self !== p.canonical) fail(site, rel, `hreflang za vlastiti jezik (${self}) nije canonical (${p.canonical})`);
        const pairUrl = p.rel.startsWith('en/') ? p.hreflang.hr : p.hreflang.en;
        const pair = byCanonical.get(pairUrl);
        if (!pair) fail(site, rel, `jezični par ne postoji na portalu: ${pairUrl}`);
        else {
          const back = pair.hreflang[p.rel.startsWith('en/') ? 'en' : 'hr'];
          if (back !== p.canonical) fail(site, rel, `par ${pair.rel} ne pokazuje natrag na ${p.canonical}`);
        }
        if (p.hreflang['x-default'] !== p.canonical) {
          fail(site, rel, `x-default nije HR adresa: ${p.hreflang['x-default']}`);
        }
      }
    }

    // OG / Twitter
    const og = attr(html, /<meta property="og:image" content="([^"]*)"/);
    if (!p.noindex) {
      if (!og) fail(site, rel, 'nema og:image');
      else if (!og.startsWith(site.url + '/')) fail(site, rel, `og:image nije na vlastitoj domeni: ${og}`);
      else {
        const ogFile = join(site.dir, og.slice(site.url.length).replace(/^\//, ''));
        if (!existsSync(ogFile)) fail(site, rel, `og:image datoteka ne postoji u build: ${og.slice(site.url.length)}`);
        else if (statSync(ogFile).size < 8000) fail(site, rel, 'og:image je premala');
      }
      if (!/<meta property="og:image:alt" content="[^"]+"/.test(html)) fail(site, rel, 'nema og:image:alt');
      if (!/<meta name="twitter:image:alt" content="[^"]+"/.test(html)) fail(site, rel, 'nema twitter:image:alt');
      if (attr(html, /<meta property="og:image:width" content="([^"]*)"/) !== '1200') fail(site, rel, 'og:image:width nije 1200');
      if (attr(html, /<meta property="og:image:height" content="([^"]*)"/) !== '630') fail(site, rel, 'og:image:height nije 630');
      if (!/summary_large_image/.test(html)) fail(site, rel, 'twitter:card nije summary_large_image');
      if (!attr(html, /<meta name="twitter:image" content="([^"]*)"/)) fail(site, rel, 'nema twitter:image');
      if (!/<html lang="(hr|en)">/.test(html)) fail(site, rel, 'nema lang na <html>');
      const icon = attr(html, /<link rel="icon" href="([^"]*)"/);
      if (!icon) fail(site, rel, 'nema favicon');
      else if (!icon.startsWith(site.url + '/') || !existsSync(join(site.dir, icon.slice(site.url.length).replace(/^\//, '')))) {
        fail(site, rel, `favicon nije lokalna datoteka: ${icon}`);
      }
      if (!/<meta property="og:title"/.test(html) || !/<meta property="og:description"/.test(html)) {
        fail(site, rel, 'nema og:title/og:description');
      }
    }

    // slike: alt obavezan, vanjske samo kroz proxy
    for (const tag of html.match(/<img\b[^>]*>/g) || []) {
      if (!/\balt="/.test(tag)) fail(site, rel, `slika bez alt: ${tag.slice(0, 90)}`);
      const src = attr(tag, /\bsrc="([^"]*)"/) || '';
      if (/^https?:\/\//.test(src) && !src.startsWith(MAIN + '/api/img')) {
        fail(site, rel, `vanjska slika nije kroz /api/img: ${src.slice(0, 80)}`);
      }
    }

    // JSON-LD
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    if (!p.noindex) {
      if (!blocks.length) fail(site, rel, 'nema JSON-LD');
      for (const raw of blocks) {
        let data;
        try { data = JSON.parse(raw); } catch (e) { fail(site, rel, `JSON-LD se ne parsira: ${e.message}`); continue; }
        const graph = data['@graph'] || [data];
        if (!graph.length) fail(site, rel, 'JSON-LD @graph je prazan');
        const websites = graph.filter((n) => n['@type'] === 'WebSite');
        if (websites.length !== 1) fail(site, rel, `WebSite čvorova: ${websites.length} (mora biti 1)`);
        if (!graph.some((n) => n['@type'] === 'NewsMediaOrganization')) fail(site, rel, 'nema NewsMediaOrganization u grafu');
        const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
        if (!crumbs) fail(site, rel, 'nema BreadcrumbList');
        else {
          const items = crumbs.itemListElement || [];
          if (!items.length) fail(site, rel, 'BreadcrumbList je prazan');
          if (new Set(items.map((i) => i.item)).size !== items.length) fail(site, rel, 'BreadcrumbList ponavlja istu adresu');
          const isHome = rel === 'index.html' || rel === 'en/index.html';
          if (items.length === 1 && !isHome) fail(site, rel, 'BreadcrumbList ima samo korijen na podstranici');
          if (items.length === 2 && isHome) fail(site, rel, 'BreadcrumbList ponavlja naslovnicu u dva koraka');
        }
      }
    }

    // interni linkovi
    for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
      const target = decode(m[1]);
      let path = join(site.dir, target);
      if (target.endsWith('/')) path = join(path, 'index.html');
      if (!existsSync(path)) fail(site, rel, `mrtav interni link: ${target}`);
    }

    // "linija": prema glavnom portalu i sestrinskom portalu
    if (!p.noindex) {
      if (!html.includes(MAIN)) fail(site, rel, 'nema poveznice na gnk-asg.hr');
      if (!html.includes(site.sister)) fail(site, rel, 'nema poveznice na sestrinski portal');
    }
  }

  // sitemap
  const smPath = join(site.dir, 'sitemap.xml');
  if (!existsSync(smPath)) fail(site, null, 'nema sitemap.xml');
  else {
    const sm = readFileSync(smPath, 'utf8');
    if (!sm.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) fail(site, null, 'sitemap bez xmlns');
    if (/xhtml:link/.test(sm) && !sm.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"')) {
      fail(site, null, 'sitemap koristi xhtml:link bez xmlns:xhtml');
    }
    const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => decode(m[1]));
    if (!locs.length) fail(site, null, 'sitemap bez <loc>');
    const dup = locs.filter((l, i) => locs.indexOf(l) !== i);
    if (dup.length) fail(site, null, `sitemap ima duplikate: ${dup.slice(0, 3).join(', ')}`);
    for (const loc of locs) {
      if (!loc.startsWith(site.url)) fail(site, null, `sitemap URL izvan domene: ${loc}`);
      const relPath = loc.slice(site.url.length);
      const target = relPath === '/' || relPath === '' ? 'index.html' : join(relPath.replace(/^\//, ''), 'index.html');
      if (!existsSync(join(site.dir, target))) fail(site, null, `sitemap URL bez datoteke: ${loc}`);
    }
    for (const u of indexable) if (!locs.includes(u)) fail(site, null, `stranica nije u sitemapu: ${u}`);
    notes.push(`${site.id}: sitemap ${locs.length} URL-ova`);
  }

  // robots
  const rb = join(site.dir, 'robots.txt');
  if (!existsSync(rb)) fail(site, null, 'nema robots.txt');
  else {
    const r = readFileSync(rb, 'utf8');
    if (!/Sitemap:\s*https:\/\//.test(r)) fail(site, null, 'robots.txt bez Sitemap');
    if (!r.includes(site.url)) fail(site, null, 'robots.txt ne pokazuje na vlastitu domenu');
  }

  // feed
  const fd = join(site.dir, 'feed.xml');
  if (!existsSync(fd)) fail(site, null, 'nema feed.xml');
  else {
    const f = readFileSync(fd, 'utf8');
    if (!/<rss[^>]+version="2.0"/.test(f)) fail(site, null, 'feed.xml nije RSS 2.0');
    const items = (f.match(/<item>/g) || []).length;
    if (items < 1) fail(site, null, 'feed.xml bez <item>');
    else notes.push(`${site.id}: feed ${items} stavki`);
    for (const m of f.matchAll(/<link>([^<]*)<\/link>/g)) {
      if (!/^https:\/\//.test(decode(m[1]))) fail(site, null, `feed link nije apsolutan: ${m[1]}`);
    }
  }

  // obavezni artefakti
  if (!existsSync(join(site.dir, 'assets/site.css'))) fail(site, null, 'nema assets/site.css');
  if (!existsSync(join(site.dir, '404.html'))) fail(site, null, 'nema 404.html');
  if (/<style[\s>]/.test(readFileSync(join(site.dir, '404.html'), 'utf8'))) fail(site, '404.html', 'inline <style> (CSP)');

  notes.push(`${site.id}: ${pages.length} HTML stranica`);
}

const result = { ok: failures.length === 0, sites: SITES.length, notes, failures };
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
