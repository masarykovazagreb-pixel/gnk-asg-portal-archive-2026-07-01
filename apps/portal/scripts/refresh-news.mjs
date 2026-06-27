import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const PUBLIC_LIMIT = 100;
const ARCHIVE_KEEP_WHEN_FULL = 500;
const ARCHIVE_MAX_BEFORE_PRUNE = 1000;
const FALLBACK_IMAGE = '/assets/news-fallback.svg';
const TZ = 'Europe/Zagreb';

const ROOT = process.cwd();
const DATA_DIR = `${ROOT}/apps/portal/data`;
const PUBLIC_PATH = `${DATA_DIR}/news.json`;
const ARCHIVE_PATH = `${DATA_DIR}/news_archive.json`;
const STATUS_PATH = `${DATA_DIR}/news-automation-status.json`;

const FEEDS = [
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge', group: 'technology', region: 'World' },
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', group: 'technology', region: 'World' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC', group: 'world', region: 'World' },
  { url: 'https://www.nasa.gov/news-release/feed/', source: 'NASA', group: 'science', region: 'World' },
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News', group: 'technology', region: 'World' },
  { url: 'https://www.espn.com/espn/rss/news', source: 'ESPN', group: 'sports', region: 'World' }
];

function stripHtml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function attr(block, tagName, attrName) {
  const match = block.match(new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["'][^>]*>`, 'i'));
  return match ? match[1] : '';
}

function normalizeDate(value) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function itemId(url, title) {
  return crypto.createHash('sha1').update(`${url}|${title}`).digest('hex').slice(0, 18);
}

function parseFeed(xml, feed) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.map((block) => {
    const title = tag(block, 'title');
    const link = tag(block, 'link') || attr(block, 'link', 'href') || tag(block, 'guid');
    const summary = tag(block, 'description') || tag(block, 'summary') || tag(block, 'content:encoded');
    const published = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date');
    const image = attr(block, 'media:content', 'url') || attr(block, 'media:thumbnail', 'url') || attr(block, 'enclosure', 'url') || FALLBACK_IMAGE;
    if (!title || !link) return null;
    return {
      id: itemId(link, title),
      title,
      url: link,
      summary: summary.slice(0, 520),
      source: feed.source,
      region: feed.region,
      group: feed.group,
      category: feed.group,
      image,
      published_at: normalizeDate(published),
      share_url: `/podijeli/vijest/${itemId(link, title)}/`
    };
  }).filter(Boolean);
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const res = await fetch(feed.url, { signal: controller.signal, headers: { 'user-agent': 'GNK-ASG-NewsBot/1.0' } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const xml = await res.text();
    return { ok: true, feed: feed.url, count: parseFeed(xml, feed).length, items: parseFeed(xml, feed) };
  } catch (error) {
    return { ok: false, feed: feed.url, error: String(error?.message || error), items: [] };
  } finally {
    clearTimeout(timeout);
  }
}

const results = await Promise.all(FEEDS.map(fetchFeed));
const fetchedItems = results.flatMap((r) => r.items);
const existingPublic = await readJson(PUBLIC_PATH, []);
const existingArchive = await readJson(ARCHIVE_PATH, []);
const byId = new Map();
for (const item of [...fetchedItems, ...existingPublic, ...existingArchive]) {
  if (item?.id && !byId.has(item.id)) byId.set(item.id, item);
}

const all = [...byId.values()].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
const publicItems = all.slice(0, PUBLIC_LIMIT);
let archiveItems = all.slice(PUBLIC_LIMIT, PUBLIC_LIMIT + ARCHIVE_MAX_BEFORE_PRUNE);
if (archiveItems.length >= ARCHIVE_MAX_BEFORE_PRUNE) archiveItems = archiveItems.slice(0, ARCHIVE_KEEP_WHEN_FULL);

await fs.mkdir(DATA_DIR, { recursive: true });
await fs.writeFile(PUBLIC_PATH, `${JSON.stringify(publicItems, null, 2)}\n`);
await fs.writeFile(ARCHIVE_PATH, `${JSON.stringify(archiveItems, null, 2)}\n`);

const status = {
  ok: fetchedItems.length > 0,
  status: fetchedItems.length > 0 ? 'refreshed' : 'refresh_failed_no_items',
  updated_at: new Date().toISOString(),
  engine: 'single_publication_engine_v14_isolated_github_action',
  cadence: 'scheduled at 09:00, 16:00 and 21:00 Europe/Zagreb',
  timezone: TZ,
  scheduled_hours_local: [9, 16, 21],
  public_items_target: PUBLIC_LIMIT,
  public_items_written: publicItems.length,
  archive_policy: 'archive_latest_1000_prune_to_500_when_full',
  archive_items_written: archiveItems.length,
  rss_images_enabled: true,
  fallback_image: FALLBACK_IMAGE,
  visual_index_fallback: '/visual-index/',
  feeds_checked: results.map(({ feed, ok, count, error }) => ({ feed, ok, count: count || 0, error }))
};
await fs.writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);

if (!status.ok) {
  console.error(JSON.stringify(status, null, 2));
  process.exit(1);
}

console.log(`Wrote ${publicItems.length} public news items and ${archiveItems.length} archived items.`);
