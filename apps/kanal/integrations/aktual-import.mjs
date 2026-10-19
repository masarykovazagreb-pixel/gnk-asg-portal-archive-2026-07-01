#!/usr/bin/env node
/**
 * AKTUAL MEDIA importer za GNK ASG KANAL.
 *
 * Dohvaća feed.json, filtrira po statusu, deduplicira po `id` i zapisuje
 * AKTUAL-kompatibilan JSON. Ne objavljuje ništa samo — to je priprema za uvoz.
 *
 *   node apps/kanal/integrations/aktual-import.mjs \
 *     --feed https://masarykovazagreb-pixel.github.io/gnk-asg-kanal/feed.json \
 *     --out  ./aktual-import.json \
 *     --status approved|all
 */
import { readFile, writeFile } from 'node:fs/promises';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const FEED = arg('--feed', 'https://masarykovazagreb-pixel.github.io/gnk-asg-kanal/feed.json');
const OUT = arg('--out', 'aktual-import.json');
const STATUS = arg('--status', 'all');

const res = await fetch(FEED, { headers: { accept: 'application/feed+json, application/json' } });
if (!res.ok) {
  console.error(`Feed nedostupan: HTTP ${res.status} ${FEED}`);
  process.exit(1);
}
const feed = await res.json();
const items = Array.isArray(feed.items) ? feed.items : [];

const selected = items.filter((it) => {
  const st = it._kanal?.editorialStatus || 'unknown';
  return STATUS === 'all' ? true : st === STATUS;
});

const out = {
  source: {
    name: feed.title,
    feed: FEED,
    home: feed.home_page_url,
    attribution: feed._kanal?.attribution || 'Izvor: GNK ASG KANAL',
    license: feed._kanal?.license || 'Preuzimanje dopušteno uz atribuciju.',
    fetchedAt: new Date().toISOString()
  },
  count: selected.length,
  items: selected.map((it) => ({
    externalId: it.id,
    status: it._kanal?.editorialStatus || 'unknown',
    title: it.title,
    dek: it.summary,
    bodyText: it.content_text,
    publishedAt: it.date_published,
    updatedAt: it.date_modified,
    author: it.authors?.[0]?.name || 'Nermin Sefić',
    authorUrl: it.authors?.[0]?.url || 'https://gnk-asg.hr/nermin-sefic/',
    section: it._kanal?.sectionLabel || 'Kanal',
    tags: it.tags || [],
    image: it.image,
    canonical: it.url,
    sources: it._kanal?.sources || [],
    attribution: 'Izvor: GNK ASG KANAL',
    readingMinutes: it._kanal?.readingMinutes ?? null,
    words: it._kanal?.words ?? null
  }))
};

await writeFile(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log(`AKTUAL import: ${out.count}/${items.length} stavki → ${OUT}`);
for (const i of out.items) console.log(`  • [${i.status}] ${i.title}`);
