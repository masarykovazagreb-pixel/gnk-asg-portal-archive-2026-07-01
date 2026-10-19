#!/usr/bin/env node
/**
 * AKTUAL MEDIA REGIONAL — punjenje arhive.
 *
 * Dnevni ciklus uzima samo nekoliko najnovijih zapisa po izvoru. Ovaj skript
 * gradi širu arhivu: čita feedove i njihove stranice (paged), javni WordPress
 * REST API tamo gdje postoji, te sprema stvarne naslove, sažetke, datume i
 * poveznice na izvornik. Ništa se ne izmišlja: zapis bez stvarnog URL-a i
 * naslova se odbacuje.
 *
 * Pokretanje:
 *   node apps/region/engine/backfill.mjs --target 320
 *   node apps/region/engine/backfill.mjs --channel beograd --target 350
 *   node apps/region/engine/backfill.mjs --no-build
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchText, hash6, parseDate, slugify, themeFor, truncate, stripTags, decode } from './lib.mjs';
import { looksLikeFeed, parseFeed } from './feed.mjs';
import { buildChannel, CHANNELS } from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const DATA = join(APP, 'data');

const arg = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
};
const flag = (name) => process.argv.includes(name);

const TARGET = Number(arg('--target', '320'));
const STORE = Math.max(TARGET, Number(arg('--store', '420')));
const DAYS = Number(arg('--days', '400'));
const MAX_PAGES = Number(arg('--max-pages', '10'));
const ONLY = arg('--channel', '');
const NO_BUILD = flag('--no-build');
const PAUSE = Number(arg('--pause', '180'));

const readJSON = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};
const writeJSON = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const channelFile = (id) => join(DATA, `${id}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clean = (value = '') => decode(stripTags(String(value))).replace(/\s+/g, ' ').trim();
const normUrl = (value = '') => String(value).split('#')[0].replace(/[?&](utm_[^=&]+|fbclid|gclid)=[^&]*/gi, '').replace(/[?&]$/, '');

const isFresh = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return true;
  return Date.now() - parsed.getTime() <= DAYS * 24 * 3600 * 1000;
};

const originOf = (href) => {
  try { return new URL(href).origin; } catch { return ''; }
};

const withPage = (href, page) => {
  if (page === 1) return href;
  const u = new URL(href);
  u.searchParams.set('paged', String(page));
  return u.toString();
};

/* WordPress REST API: javni, dokumentirani izvor naslova i sažetaka. */
async function readWordPress(source, limit) {
  const origin = originOf((source.urls || [])[0] || '');
  if (!origin) return { items: [], errors: [] };
  const items = [];
  const errors = [];
  for (let page = 1; page <= MAX_PAGES && items.length < limit; page += 1) {
    const href = `${origin}/wp-json/wp/v2/posts?per_page=100&page=${page}&orderby=date&order=desc&_fields=link,date,title,excerpt`;
    try {
      const text = await fetchText(href, { timeout: 12000, tries: 1 });
      const rows = JSON.parse(text);
      if (!Array.isArray(rows) || !rows.length) break;
      for (const row of rows) {
        const title = clean(row?.title?.rendered || '');
        const link = String(row?.link || '');
        if (!title || !/^https?:/i.test(link)) continue;
        items.push({
          title,
          url: link,
          summary: clean(row?.excerpt?.rendered || ''),
          date: row?.date ? new Date(`${row.date}Z`).toISOString() : '',
          categories: [],
          author: ''
        });
      }
      await sleep(PAUSE);
    } catch (error) {
      errors.push(`wp:${page}: ${error.message}`);
      break;
    }
  }
  return { items, errors };
}

async function readFeedPages(source) {
  const items = [];
  const errors = [];
  for (const href of source.urls || []) {
    let empty = 0;
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      try {
        const text = await fetchText(withPage(href, page), { timeout: 12000, tries: 1 });
        if (!looksLikeFeed(text)) throw new Error('nije feed');
        const batch = parseFeed(text, { base: href, sourceId: source.id, sourceName: source.name });
        if (!batch.length) { empty += 1; if (empty >= 1) break; }
        items.push(...batch);
        await sleep(PAUSE);
        if (page > 1 && batch.length < 5) break;
      } catch (error) {
        errors.push(`${href}#${page}: ${error.message}`);
        break;
      }
    }
  }
  return { items, errors };
}


/* Sitemap: čita news sitemap i sitemap indeks, samo zapise koji imaju naslov. */
const xmlBlocks = (xml, tag) => {
  const out = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
};
const xmlText = (node, tag) => {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(node);
  return m ? clean(m[1].replace(/<!\[CDATA\[|\]\]>/g, '')) : '';
};

async function readSitemap(source, seeds = []) {
  const origin = originOf((source.urls || [])[0] || '');
  if (!origin) return { items: [], errors: [] };
  const items = [];
  const errors = [];
  const candidates = ['/sitemap.xml', '/sitemap_index.xml', '/news-sitemap.xml', '/sitemap-news.xml'];
  const queue = [];
  for (const path of candidates) queue.push(`${origin}${path}`);
  for (const href of seeds) if (href && !queue.includes(href)) queue.push(href);

  while (queue.length && items.length < 400) {
    const href = queue.shift();
    try {
      const xml = await fetchText(href, { timeout: 12000, tries: 1 });
      if (!/<urlset|<sitemapindex/i.test(xml)) throw new Error('nije sitemap');
      const indexes = xmlBlocks(xml, 'sitemap');
      if (indexes.length) {
        const locs = indexes.map((n) => xmlText(n, 'loc')).filter(Boolean);
        const newsy = locs.filter((u) => /news|post|article|clanak|vesti|vijesti/i.test(u));
        for (const loc of (newsy.length ? newsy : locs).slice(0, 16)) queue.push(loc);
      }
      for (const node of xmlBlocks(xml, 'url')) {
        const loc = xmlText(node, 'loc');
        const title = xmlText(node, 'news:title') || xmlText(node, 'title');
        const date = xmlText(node, 'news:publication_date') || xmlText(node, 'lastmod');
        if (!loc || !title) continue;
        items.push({ title, url: loc, summary: '', date: date || '', categories: [], author: '' });
        if (items.length >= 400) break;
      }
      await sleep(PAUSE);
    } catch (error) {
      errors.push(`${href}: ${error.message}`);
    }
  }
  return { items, errors };
}


/* Otkrivanje feedova i sitemapa iz same stranice: <link rel=alternate> i robots.txt. */
async function discover(source) {
  const origin = originOf((source.urls || [])[0] || '');
  if (!origin) return { feeds: [], sitemaps: [] };
  const feeds = [];
  const sitemaps = [];
  try {
    const html = await fetchText(`${origin}/`, { timeout: 15000, tries: 1 });
    const links = html.match(/<link\b[^>]*>/gi) || [];
    for (const tag of links) {
      if (!/application\/(rss|atom)\+xml/i.test(tag)) continue;
      const href = (tag.match(/href=["']([^"']+)["']/i) || [])[1];
      if (!href) continue;
      const abs = href.startsWith('http') ? href : new URL(href, `${origin}/`).toString();
      if (!feeds.includes(abs)) feeds.push(abs);
    }
    const sm = html.match(/https?:\/\/[^"'\s<>]+sitemap[^"'\s<>]*\.xml/gi) || [];
    for (const href of sm.slice(0, 4)) if (!sitemaps.includes(href)) sitemaps.push(href);
  } catch (error) {
    // stranica može blokirati botove; nastavljamo s poznatim feedovima
  }
  try {
    const robots = await fetchText(`${origin}/robots.txt`, { timeout: 10000, tries: 1 });
    const re = /^sitemap:\s*(\S+)$/gim;
    let m;
    while ((m = re.exec(robots))) if (!sitemaps.includes(m[1])) sitemaps.push(m[1]);
  } catch (error) {
    // robots.txt nije obavezan
  }
  return { feeds: feeds.slice(0, 6), sitemaps: sitemaps.slice(0, 4) };
}

async function harvestSource(channel, source, budget) {
  const wp = await readWordPress(source, budget);
  const feed = await readFeedPages(source);
  let items = [...wp.items, ...feed.items];
  let errors = [...wp.errors, ...feed.errors];
  if (items.length < Math.min(budget, 80)) {
    const found = await discover(source);
    if (found.feeds.length) {
      const extra = await readFeedPages({ ...source, urls: found.feeds });
      items = items.concat(extra.items);
      errors = errors.concat(extra.errors);
      await sleep(PAUSE);
    }
    if (items.length < Math.min(budget, 60)) {
      const map = await readSitemap(source, found.sitemaps);
      items = items.concat(map.items);
      errors = errors.concat(map.errors);
    }
  }
  return { items, errors };
}

async function runChannel(channel, report) {
  const existing = readJSON(channelFile(channel.id), null);
  const seen = new Map();
  const records = [];

  for (const item of existing?.items || []) {
    if (!item?.url || !item?.title) continue;
    const key = normUrl(item.url);
    if (seen.has(key)) continue;
    seen.set(key, item);
    records.push(item);
  }

  const sourceReport = [];
  let added = 0;

  for (const source of channel.sources) {
    if (records.length >= TARGET) {
      sourceReport.push({
        id: source.id, name: source.name, url: (source.urls || [])[0] || '',
        ok: true, fetched: 0, errors: ['preskočeno: cilj dosegnut'], checkedAt: new Date().toISOString()
      });
      continue;
    }
    const budget = Math.max(60, TARGET - records.length);
    const { items, errors } = await harvestSource(channel, source, budget);
    let fresh = 0;

    for (const item of items) {
      const key = normUrl(item.url);
      if (!key || seen.has(key)) continue;
      if (!isFresh(item.date)) continue;
      const date = parseDate(item.date) ? new Date(item.date).toISOString() : new Date().toISOString();
      const day = date.slice(0, 10);
      const slug = `${channel.id}-${day}-${source.id}-${slugify(item.title, 44)}-${hash6(item.url)}`;
      const record = {
        slug,
        title: truncate(item.title, 180),
        summary: truncate(item.summary || '', 700),
        date,
        url: item.url,
        source: source.id,
        sourceName: source.name,
        categories: (item.categories || []).slice(0, 6),
        author: item.author || '',
        theme: themeFor(`${item.title} ${item.summary}`).id,
        addedAt: new Date().toISOString(),
        backfilled: true
      };
      seen.set(key, record);
      records.push(record);
      fresh += 1;
      added += 1;
      if (records.length >= STORE) break;
    }

    sourceReport.push({
      id: source.id, name: source.name, url: (source.urls || [])[0] || '',
      ok: fresh > 0, fetched: fresh, errors: errors.slice(0, 4), checkedAt: new Date().toISOString()
    });
  }

  const items = records
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, STORE);

  const next = {
    version: 1,
    channel: channel.id,
    lang: channel.lang,
    city: channel.city,
    country: channel.country,
    updatedAt: new Date().toISOString(),
    sources: sourceReport,
    items
  };
  writeJSON(channelFile(channel.id), next);
  report[channel.id] = {
    added,
    total: items.length,
    target: TARGET,
    reached: items.length >= TARGET,
    sourcesOk: sourceReport.filter((s) => s.ok).length,
    sourcesTotal: sourceReport.length
  };
  return next;
}

async function main() {
  mkdirSync(DATA, { recursive: true });
  const targets = CHANNELS.filter((c) => !ONLY || c.id === ONLY);
  if (!targets.length) throw new Error(`Nepoznat kanal: ${ONLY}`);

  const report = {};
  for (const channel of targets) {
    const data = await runChannel(channel, report);
    const r = report[channel.id];
    console.log(`[${channel.id}] dodano ${r.added} · ukupno ${r.total}/${TARGET} · izvori ${r.sourcesOk}/${r.sourcesTotal}`);
    if (!NO_BUILD) {
      const built = buildChannel(channel);
      console.log(`[${channel.id}] izgrađeno stranica: ${built.pages}`);
    }
    if (data.items.length < TARGET) console.log(`::warning::[${channel.id}] ispod cilja: ${data.items.length}/${TARGET}`);
  }

  if (!NO_BUILD) {
    const { buildHub } = await import('./hub.mjs');
    const hub = buildHub();
    console.log(`[hub] izdanja: ${hub.channels} · sport: ${hub.sport} · politika: ${hub.politics} · sigurnost: ${hub.security}`);
  }

  const short = Object.entries(report).filter(([, r]) => !r.reached).map(([id, r]) => `${id} ${r.total}/${r.target}`);
  if (short.length) console.log(`::warning::Ispod cilja: ${short.join(', ')}`);
  console.log(JSON.stringify({ ok: short.length === 0, report }, null, 2));
}

if (process.argv[1] && /backfill\.mjs$/.test(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
