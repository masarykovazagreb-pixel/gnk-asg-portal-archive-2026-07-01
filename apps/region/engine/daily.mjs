#!/usr/bin/env node
/**
 * AKTUAL MEDIA REGIONAL — dnevni ciklus.
 *
 * Za svaki kanal:
 *   1. čita javne feedove navedenih medija (RSS/Atom),
 *   2. sprema nove zapise uz poveznicu na izvornik i datum,
 *   3. gradi stranice (build.mjs),
 *   4. zapisuje stanje i izvještaj za operativni nadzor.
 *
 * Pokretanje:
 *   node apps/region/engine/daily.mjs                # svi kanali
 *   node apps/region/engine/daily.mjs --channel beograd
 *   node apps/region/engine/daily.mjs --no-build --dry-run
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchText, hash6, ISO_DAY, parseDate, slugify, themeFor, truncate } from './lib.mjs';
import { looksLikeFeed, parseFeed } from './feed.mjs';
import { buildChannel, CHANNELS } from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const ROOT = join(APP, '..', '..');
const DATA = join(APP, 'data');
const STATUS = join(DATA, '_status.json');

const arg = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
};
const flag = (name) => process.argv.includes(name);

const DRY = flag('--dry-run');
const NO_BUILD = flag('--no-build');
const ONLY = arg('--channel', '');
const MAX_AGE_DAYS = Number(arg('--days', '21'));

const readJSON = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};
const writeJSON = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

function channelFile(id) { return join(DATA, `${id}.json`); }

function loadChannelData(channel) {
  const existing = readJSON(channelFile(channel.id), null);
  if (existing && Array.isArray(existing.items)) return existing;
  return { version: 1, channel: channel.id, updatedAt: '', items: [], seen: {} };
}

const isFresh = (date) => {
  const parsed = parseDate(date);
  if (!parsed) return true;
  return Date.now() - parsed.getTime() <= MAX_AGE_DAYS * 24 * 3600 * 1000;
};

async function readSource(source) {
  const errors = [];
  for (const url of source.urls || []) {
    try {
      const text = await fetchText(url);
      if (!looksLikeFeed(text)) throw new Error('nije feed');
      const items = parseFeed(text, { base: url, sourceId: source.id, sourceName: source.name });
      if (!items.length) throw new Error('prazan feed');
      return { url, items, errors };
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }
  return { url: '', items: [], errors };
}

const itemKey = (item) => `${item.url}#${item.date.slice(0, 10)}`;

export async function runChannel(channel, { dry = false, report = {} } = {}) {
  const data = loadChannelData(channel);
  const seen = new Map(data.items.map((i) => [itemKey(i), i]));
  const added = [];
  const sourceReport = [];

  for (const source of channel.sources) {
    const { url, items, errors } = await readSource(source);
    sourceReport.push({
      id: source.id, name: source.name, url: url || (source.urls || [])[0] || '',
      ok: Boolean(items.length), fetched: items.length, errors,
      checkedAt: new Date().toISOString()
    });
    if (!items.length) continue;

    const fresh = items
      .filter((item) => item.title && item.url)
      .filter((item) => isFresh(item.date))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, source.cap || 6);

    for (const item of fresh) {
      const key = itemKey(item);
      if (seen.has(key)) continue;
      const day = item.date ? item.date.slice(0, 10) : ISO_DAY();
      const slug = `${channel.id}-${day}-${source.id}-${slugify(item.title, 44)}-${hash6(item.url)}`;
      const theme = themeFor(`${item.title} ${item.summary}`).id;
      const record = {
        slug,
        title: truncate(item.title, 180),
        summary: truncate(item.summary || '', 700),
        date: item.date || new Date().toISOString(),
        url: item.url,
        source: source.id,
        sourceName: source.name,
        categories: item.categories || [],
        author: item.author || '',
        theme,
        /* SVG se ne poslužuje kroz posrednik slika (CSP i provjera sadržaja ga
           odbijaju), pa takav URL ne ulazi u zapis — bolje bez slike nego sa
           slomljenom minijaturom. */
        image: /^https:\/\//.test(item.image || '') && !/\.svg(?:[?#]|$)/i.test(item.image) ? item.image : '',
        imageAlt: (item.imageAlt || item.title || '').slice(0, 180),
        addedAt: new Date().toISOString()
      };
      seen.set(key, record);
      added.push(record);
    }
  }

  const merged = [...added, ...data.items]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 420);

  const next = {
    version: 1,
    channel: channel.id,
    lang: channel.lang,
    city: channel.city,
    country: channel.country,
    updatedAt: new Date().toISOString(),
    sources: sourceReport,
    items: merged
  };

  if (!dry) writeJSON(channelFile(channel.id), next);
  report[channel.id] = {
    fetched: added.length,
    total: merged.length,
    sourcesOk: sourceReport.filter((s) => s.ok).length,
    sourcesTotal: sourceReport.length,
    failed: sourceReport.filter((s) => !s.ok).map((s) => s.id)
  };
  return next;
}

async function main() {
  mkdirSync(DATA, { recursive: true });
  const kill = readJSON(join(ROOT, 'ops', 'automation-kill-switches.json'), {});
  if (kill?.channels?.regionPublish?.enabled !== true && !flag('--force')) {
    console.log('regionPublish je isključen u ops/automation-kill-switches.json — ciklus se preskače.');
    return;
  }

  const targets = CHANNELS.filter((c) => !ONLY || c.id === ONLY);
  if (!targets.length) throw new Error(`Nepoznat kanal: ${ONLY}`);

  const report = {};
  const built = [];
  for (const channel of targets) {
    const data = await runChannel(channel, { dry: DRY, report });
    console.log(`[${channel.id}] novih ${report[channel.id].fetched} · ukupno ${report[channel.id].total} · izvori ${report[channel.id].sourcesOk}/${report[channel.id].sourcesTotal}`);
    if (!NO_BUILD && !DRY) {
      const result = buildChannel(channel);
      built.push(result);
      console.log(`[${channel.id}] izgrađeno stranica: ${result.pages}`);
    }
  }

  if (!DRY) {
    const previous = readJSON(STATUS, { runs: [] });
    const run = {
      at: new Date().toISOString(),
      channels: report,
      built,
      env: { node: process.version }
    };
    writeJSON(STATUS, { version: 1, lastRun: run, runs: [run, ...(previous.runs || [])].slice(0, 40) });
    writeJSON(join(APP, 'engine', 'last-run.json'), run);
  }

  if (!NO_BUILD && !DRY) {
    const { buildHub } = await import('./hub.mjs');
    const hub = await buildHub();
    console.log(`[hub] izdanja: ${hub.channels} · sport: ${hub.sport} · politika: ${hub.politics} · sigurnost: ${hub.security}`);
  }

  const failedSources = Object.entries(report).flatMap(([id, r]) => r.failed.map((s) => `${id}/${s}`));
  if (failedSources.length) console.log(`::warning::Nedostupni izvori: ${failedSources.join(', ')}`);
  console.log(JSON.stringify({ ok: true, report }, null, 2));
}

if (process.argv[1] && /daily\.mjs$/.test(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { existsSync };
