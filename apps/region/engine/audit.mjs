#!/usr/bin/env node
/**
 * Provjera izgrađenih izdanja prije deploya.
 *
 * Za svaki kanal provjerava:
 *  - svaka stranica ima title, description, canonical i JSON-LD,
 *  - sve unutarnje poveznice vode na postojeću datoteku,
 *  - svaki osvrt ima poveznicu na izvornik (http) i datum,
 *  - feed i sitemap postoje i sadrže iste adrese.
 *
 *   node apps/region/engine/audit.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const ROOT = join(APP, '..', '..');
const SITE = join(ROOT, 'apps', 'portal', 'kanal');
const PORTAL = join(ROOT, 'apps', 'portal');
const DATA = join(APP, 'data');

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const target = join(dir, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});

const errors = [];
const warnings = [];
const report = [];
/* Jezik izdanja: engleski kanal nema /en/ prijevod, pa ni hreflang par. */
const CHANNELS = JSON.parse(readFileSync(join(APP, 'channels.json'), 'utf8')).channels;
const LANG_OF = new Map(CHANNELS.map((c) => [c.id, c.lang]));

for (const channel of readdirSync(SITE).filter((d) => statSync(join(SITE, d)).isDirectory())) {
  const root = join(SITE, channel);
  const pages = walk(root).filter((f) => f.endsWith('.html'));
  const dataFile = join(DATA, `${channel}.json`);
  const data = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : { items: [] };
  const slugs = new Set((data.items || []).map((i) => i.slug));

  for (const page of pages) {
    const rel = `/${relative(root, page).replace(/\\/g, '/')}`;
    const html = readFileSync(page, 'utf8');
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1];
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
    if (!title) errors.push(`${channel}${rel}: nema title`);
    if (!description) errors.push(`${channel}${rel}: nema description`);
    if (!canonical) errors.push(`${channel}${rel}: nema canonical`);
    if (!/application\/ld\+json/.test(html) && rel !== '/404.html') errors.push(`${channel}${rel}: nema JSON-LD`);
    if (!/name="keywords"/.test(html)) errors.push(`${channel}${rel}: nema keywords (hashtagovi)`);
    if (!/og:title/.test(html) || !/twitter:card/.test(html)) errors.push(`${channel}${rel}: nema OG/Twitter`);
    // Hreflang is used only when a genuinely equivalent language overview exists.
    // Individual article/topic/source URLs have no English translation and must
    // not claim that their channel homepage is a language alternate.
    const hasLanguagePair = rel === '/index.html' || rel === '/en/index.html';
    const declaresHreflang = /rel="alternate" hreflang=/.test(html);
    /* Englesko izdanje je već na engleskom: /en/ mu nije prijevod, nego ista
       stranica, pa se par ne ispisuje i ne traži. Za ostala izdanja vrijedi
       pravilo: par na naslovnicama, nigdje drugdje. */
    const englishEdition = LANG_OF.get(channel) === 'en';
    if (hasLanguagePair && !englishEdition && !declaresHreflang) errors.push(`${channel}${rel}: nema hreflang para za naslovnicu`);
    if (!hasLanguagePair && declaresHreflang) errors.push(`${channel}${rel}: nepostojeći prijevod u hreflang`);
    if (/property="og:locale" content="(?:undefined|null|)"/i.test(html)) errors.push(`${channel}${rel}: neispravan og:locale`);

    // naslovi i JSON-LD moraju biti parsabilni
    for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(block[1]); } catch { errors.push(`${channel}${rel}: JSON-LD nije valjan JSON`); }
    }

    // unutarnje poveznice
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href = m[1];
      if (!href || href.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(href)) continue;
      const clean = href.split('#')[0].split('?')[0];
      if (!clean) continue;
      const local = clean.startsWith('/') ? join(root, clean.slice(1)) : resolve(dirname(page), clean);
      // Kanali sada žive pod gnk-asg.hr/kanal/<id>/, pa se apsolutni putevi (/assets, /izdanja, /galerija …)
      // provjeravaju i u korijenu portala, gdje ih poslužuje glavna domena.
      const portal = clean.startsWith('/') ? join(PORTAL, clean.slice(1)) : null;
      const ok = existsSync(local) || existsSync(join(local, 'index.html'))
        || (portal && (existsSync(portal) || existsSync(join(portal, 'index.html'))));
      if (!ok) errors.push(`${channel}${rel}: slomljena poveznica ${href}`);
    }

    // članci moraju imati izvornik i datum
    if (rel.startsWith('/clanak/')) {
      if (!/<a[^>]+href="https?:\/\/[^"]+"[^>]*rel="external noopener nofollow"/.test(html)) {
        errors.push(`${channel}${rel}: nema poveznicu na izvornik`);
      }
      if (!/<time datetime="\d{4}-\d{2}-\d{2}/.test(html)) errors.push(`${channel}${rel}: nema datum`);
      const slug = rel.split('/')[2];
      if (!slugs.has(slug)) errors.push(`${channel}${rel}: slug nije u podacima (${slug})`);
    }
  }

  const feed = join(root, 'feed.json');
  const sitemap = join(root, 'sitemap.xml');
  if (!existsSync(feed)) errors.push(`${channel}: nema feed.json`);
  if (!existsSync(sitemap)) errors.push(`${channel}: nema sitemap.xml`);
  if (existsSync(feed)) {
    const json = JSON.parse(readFileSync(feed, 'utf8'));
    if (!json.items.length && (data.items || []).length) warnings.push(`${channel}: feed je prazan, a podaci imaju ${data.items.length} zapisa`);
    for (const item of json.items) if (!/^https?:\/\//.test(item.url)) errors.push(`${channel}: feed stavka bez https adrese`);
  }
  if (existsSync(sitemap)) {
    const xml = readFileSync(sitemap, 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (!locs.length) errors.push(`${channel}: sitemap je prazan`);
    for (const slug of slugs) if (!locs.some((l) => l.endsWith(`/clanak/${slug}/`))) errors.push(`${channel}: sitemap ne sadrži ${slug}`);
  }

  report.push({ channel, pages: pages.length, items: (data.items || []).length });
}

console.log(JSON.stringify({ ok: errors.length === 0, channels: report, errors: [...new Set(errors)].slice(0, 60), warnings: [...new Set(warnings)].slice(0, 30) }, null, 2));
if (errors.length) process.exit(1);
