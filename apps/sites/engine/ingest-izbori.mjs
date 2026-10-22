#!/usr/bin/env node
/**
 * IZBORI U SRBIJI — sakupljač.
 *
 * Čita javne RSS/Atom feedove iz apps/sites/data/izbori-feeds.json, zadržava
 * samo zapise koji istodobno spominju Srbiju i izborni proces (isti kriterij
 * kao nadzorni desk), i sprema ih u apps/sites/data/izbori-extra.json.
 *
 * Pravila:
 *   • ništa se ne izmišlja — naslov, sažetak, datum i poveznica dolaze iz feeda;
 *   • feed koji ne odgovori se preskače i to se zabilježi u izvještaju;
 *   • stariji zapisi se čuvaju 21 dan, pa desk ima povijest i kad feed padne;
 *   • skripta nikad ne briše arhivu gradskih izdanja — samo dodaje svoj sloj.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFeed, looksLikeFeed } from '../../region/engine/feed.mjs';
import { matchesItem } from '../lib/elections.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const DATA = join(APP, 'data');
const OUT = join(DATA, 'izbori-extra.json');
const CONFIG = join(DATA, 'izbori-feeds.json');
const KEEP_DAYS = 21;
const TIMEOUT = 15000;
const UA = 'GNK-ASG-IzboriDesk/1.0 (+https://gnk-asg.hr/mreza/)';

const now = Date.now();
const recent = (iso) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) && now - t <= KEEP_DAYS * 24 * 3600 * 1000;
};

async function readFeed(feed) {
  try {
    const response = await fetch(feed.url, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (!looksLikeFeed(text)) throw new Error('nije feed');
    const items = parseFeed(text, { base: feed.url, sourceId: feed.id, sourceName: feed.name });
    if (!items.length) throw new Error('prazan feed');
    return { items, error: '' };
  } catch (error) {
    return { items: [], error: error.message };
  }
}

async function main() {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
  const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { items: [] };
  const store = new Map((previous.items || []).filter((item) => recent(item.date)).map((item) => [item.url, item]));
  const report = [];

  for (const feed of config.feeds) {
    const { items, error } = await readFeed(feed);
    let kept = 0;
    for (const item of items) {
      if (!matchesItem(item.title || '', item.summary || '')) continue;
      if (!/^https?:\/\//.test(item.url || '')) continue;
      if (store.has(item.url)) continue;
      store.set(item.url, {
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: feed.name,
        sourceId: feed.id,
        country: feed.country,
        city: feed.city,
        date: item.date,
        via: 'feed',
      });
      kept += 1;
    }
    report.push({ id: feed.id, name: feed.name, country: feed.country, ok: !error, fetched: items.length, kept, error });
    console.log(`${error ? '×' : '✓'} ${feed.name.padEnd(20)} ${String(items.length).padStart(3)} → ${String(kept).padStart(2)}${error ? `  (${error})` : ''}`);
  }

  const items = [...store.values()]
    .filter((item) => item.date && recent(item.date))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  mkdirSync(DATA, { recursive: true });
  writeFileSync(OUT, JSON.stringify({
    version: 'GNK_ASG_IZBORI_EXTRA_V1_20261022',
    updatedAt: new Date().toISOString(),
    keepDays: KEEP_DAYS,
    feeds: config.feeds,
    report,
    items,
  }, null, 2));

  const ok = report.filter((entry) => entry.ok).length;
  console.log(`\nizbori-extra.json — ${items.length} zapisa, ${ok}/${report.length} feedova odgovorilo`);
  if (!ok) {
    console.error('Nijedan feed nije odgovorio; datoteka je ostala na starim zapisima.');
    process.exitCode = 0;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
