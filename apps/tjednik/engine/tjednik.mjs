#!/usr/bin/env node
/**
 * GNK ASG BUSINESS TJEDNIK — dnevni stroj kritičkih osvrta.
 *
 * Što radi:
 *   1. čita poslovne izvore (Lider, Jutarnji list, Poslovni dnevnik, Forbes)
 *   2. za svaki novi poslovni tekst sprema kritički osvrt na NAČIN IZVJEŠTAVANJA
 *      (ne prenosi tvrdnje iz članka kao svoje, ne kopira tekst)
 *   3. gradi dnevni dodatak i tjednu promjenu iz vlastitih podataka
 *   4. pokreće build.mjs
 *
 * Pokretanje:
 *   node apps/tjednik/engine/tjednik.mjs
 *   node apps/tjednik/engine/tjednik.mjs --max 6 --date 2026-10-19 --dry-run
 *   node apps/tjednik/engine/tjednik.mjs --no-build
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  BASE_DEFAULT, dayKey, decode, hash, isoDate, numberIn, slugify, stripTags, themeFor, CHECKS, UNIVERSAL_CHECKS
} from './lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const SRC = join(APP, 'src');
const CRITIQUES = join(SRC, 'critiques');
const STATE_PATH = join(HERE, 'state.json');
const RUN_PATH = join(HERE, 'last-run.json');
const SOURCES_PATH = join(HERE, 'sources.json');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const flag = (name) => process.argv.includes(name);

const TODAY = arg('--date', dayKey());
const MAX_PER_SOURCE = Number(arg('--max', '0')); // 0 = koristi cap iz sources.json
const DRY = flag('--dry-run');
const NO_BUILD = flag('--no-build');
const BASE = (process.env.TJEDNIK_BASE || BASE_DEFAULT).replace(/\/+$/, '') + '/';

const readJSON = (p, fallback) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; }
};
const writeJSON = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');

const sources = readJSON(SOURCES_PATH, { sources: [] }).sources;
const state = readJSON(STATE_PATH, { seen: {}, days: {} });
state.seen ||= {};
state.days ||= {};

const UA = 'GNK-ASG-Business-Tjednik/1.0 (+https://gnk-asg-tjednik.pages.dev/metodologija/; kontakt beckuphome@gmail.com)';

const fetchText = async (url, timeoutMs = 20000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
};

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? decode(m[1]).trim() : '';
};

const attr = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*href=["']([^"']+)["']`, 'i'));
  return m ? decode(m[1]).trim() : '';
};

const categories = (xml) => [...xml.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)]
  .map((m) => stripTags(m[1]))
  .filter(Boolean);

const normalizeUrl = (url = '') => {
  try {
    const u = new URL(decode(url).trim());
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach((p) => u.searchParams.delete(p));
    u.hash = '';
    if (u.pathname !== '/') u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString();
  } catch {
    return String(url).trim();
  }
};

const parseDate = (s, fallback = TODAY) => {
  if (!s) return fallback;
  const raw = decode(s);
  const n = new Date(raw);
  if (!Number.isNaN(n.getTime())) return n.toISOString().slice(0, 10);
  const eu = raw.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (eu) return `${eu[3]}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}`;
  return fallback;
};

/* ---------- RSS / Atom ---------- */

function parseFeed(xml, source) {
  const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map((m) => m[2]);
  const out = [];
  for (const b of blocks) {
    const link = tag(b, 'link') || attr(b, 'link') || tag(b, 'guid');
    const title = stripTags(tag(b, 'title'));
    if (!link || !title) continue;
    const summary = stripTags(
      tag(b, 'description') || tag(b, 'summary') || tag(b, 'content:encoded') || tag(b, 'content') || ''
    ).slice(0, 600);
    const cats = categories(b);
    const date = parseDate(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'));
    out.push({ title, url: normalizeUrl(link), summary, categories: cats, date, sourceId: source.id });
  }
  return out;
}

/* ---------- Lider: HTML popis + meta opis ---------- */

const LIDER_SECTIONS = new Set([
  'biznis-i-politika', 'tvrtke-i-trzista', 'financije', 'kripto', 'sto-i-kako', 'zeleno-i-digitalno', 'unplugged', 'lider-bi'
]);

function parseLider(html) {
  const found = new Map();
  const re = /<a[^>]+href=["'](https:\/\/lidermedia\.hr\/[a-z0-9-]+\/[a-z0-9-]+\/)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const url = normalizeUrl(m[1]);
    const section = new URL(url).pathname.split('/').filter(Boolean)[0];
    if (!LIDER_SECTIONS.has(section)) continue;
    const title = stripTags(m[2]).replace(/\s*\\\s*$/, '').trim();
    if (title.length < 25 || found.has(url)) continue;
    found.set(url, { title, url, summary: '', categories: [section], date: TODAY, sourceId: 'lider' });
  }
  return [...found.values()];
}

async function enrichLider(item) {
  try {
    const html = await fetchText(item.url);
    const desc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const published = html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i);
    if (desc) item.summary = stripTags(desc[1]).slice(0, 600);
    if (published) item.date = parseDate(published[1]);
  } catch (e) {
    // bez meta opisa: osvrt ostaje na razini naslova, što je eksplicitno označeno
  }
  return item;
}

/* ---------- odabir po izvoru ---------- */

function keepFor(source, item) {
  if (source.id === 'forbes') {
    const cats = (item.categories || []).map((c) => c.toLowerCase());
    const joined = cats.join(' ');
    if ((source.excludeCategories || []).some((x) => joined.includes(x))) return false;
    if (!(source.includeCategories || []).some((x) => joined.includes(x))) return false;
  }
  if (!item.summary && source.id !== 'lider') item.summary = '';
  return true;
}

async function collect() {
  const report = [];
  const picked = [];
  for (const source of sources) {
    const started = Date.now();
    try {
      let items = [];
      if (source.kind === 'rss') {
        const xml = await fetchText(source.feed);
        items = parseFeed(xml, source);
      } else {
        for (const page of source.pages || [source.home]) {
          const html = await fetchText(page);
          items = items.concat(parseLider(html));
        }
        const byUrl = new Map();
        items.forEach((i) => byUrl.set(i.url, i));
        items = [...byUrl.values()];
      }

      items = items.filter((i) => keepFor(source, i));
      items.sort((a, b) => b.date.localeCompare(a.date));

      const cap = MAX_PER_SOURCE || source.cap || 8;
      const fresh = [];
      for (const item of items) {
        if (fresh.length >= cap) break;
        if (state.seen[item.url]) continue;
        if (!/^https?:\/\//.test(item.url)) continue;
        fresh.push(item);
      }

      if (source.id === 'lider') {
        for (const item of fresh) await enrichLider(item);
      }

      picked.push(...fresh.map((i) => ({ ...i, sourceName: source.name, sourceHome: source.home })));
      report.push({ source: source.id, fetched: items.length, new: fresh.length, ok: true, ms: Date.now() - started });
      console.log(`[${source.id}] pronađeno ${items.length}, novih ${fresh.length}`);
    } catch (e) {
      report.push({ source: source.id, ok: false, error: String(e.message || e), ms: Date.now() - started });
      console.warn(`[${source.id}] greška: ${e.message || e}`);
    }
  }
  return { picked, report };
}

/* ---------- kritički osvrt ---------- */

const CHECK_LABELS = [
  'Referentni okvir',
  'Provjerljivost brojke',
  'Primarni dokument'
];

function makeCritique(item) {
  const text = `${item.title} ${item.summary}`;
  const theme = themeFor(text);
  const checks = [...(CHECKS[theme.id] || CHECKS.poslovanje), ...UNIVERSAL_CHECKS];
  const hasNumber = numberIn(item.title);
  const quote = (item.summary || '').trim().slice(0, 240);
  const slug = `kritika-${item.date}-${item.sourceId}-${slugify(item.title, 54)}-${hash(item.url)}`;
  return {
    slug,
    date: item.date,
    addedAt: isoDate(),
    source: item.sourceId,
    sourceName: item.sourceName,
    sourceHome: item.sourceHome,
    title: item.title,
    url: item.url,
    summary: quote,
    categories: (item.categories || []).slice(0, 6),
    theme: theme.id,
    themeLabel: theme.label,
    hasNumber,
    checks: checks.map((q, i) => ({ label: CHECK_LABELS[i] || 'Dodatna provjera', q })),
    status: 'auto-critique',
    base: BASE
  };
}

/* ---------- zapis ---------- */

mkdirSync(CRITIQUES, { recursive: true });
const { picked, report } = await collect();

const written = [];
for (const item of picked) {
  const c = makeCritique(item);
  if (DRY) {
    console.log('[dry]', c.slug, '|', c.sourceName, '|', c.title.slice(0, 70));
    written.push(c);
    continue;
  }
  writeJSON(join(CRITIQUES, `${c.slug}.json`), c);
  state.seen[item.url] = { date: c.date, slug: c.slug, source: c.source };
  written.push(c);
}

if (!DRY) {
  state.days[TODAY] = [...new Set([...(state.days[TODAY] || []), ...written.map((c) => c.slug)])];
  state.lastRun = isoDate();
  writeJSON(STATE_PATH, state);
  writeJSON(RUN_PATH, {
    date: TODAY,
    generatedAt: isoDate(),
    status: 'auto-critique',
    disclosure: 'Kritički osvrti na način izvještavanja. Automatski sastavljeno; ne prenosi tvrdnje izvornika kao tvrdnje tjednika.',
    sources: report,
    newCritiques: written.length,
    slugs: written.map((c) => c.slug)
  });
}

const total = existsSync(CRITIQUES) ? readdirSync(CRITIQUES).filter((f) => f.endsWith('.json')).length : 0;
console.log(`Novih osvrta: ${written.length} · ukupno u arhivi: ${total}`);

if (!NO_BUILD) {
  execFileSync(process.execPath, [join(APP, 'build.mjs'), '--base', BASE], { stdio: 'inherit' });
}
