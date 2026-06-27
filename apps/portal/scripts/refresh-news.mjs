import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const PUBLIC_LIMIT = 100;
const ARCHIVE_KEEP_WHEN_FULL = 500;
const ARCHIVE_MAX_BEFORE_PRUNE = 1000;
const TZ = 'Europe/Zagreb';

const ROOT = process.cwd();
const DATA_DIR = `${ROOT}/apps/portal/data`;
const PUBLIC_PATH = `${DATA_DIR}/news.json`;
const ARCHIVE_PATH = `${DATA_DIR}/news_archive.json`;
const STATUS_PATH = `${DATA_DIR}/news-automation-status.json`;
const MANUAL_SEED_PATH = `${DATA_DIR}/news_manual_seed.json`;

const FEEDS = [
  { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge', group: 'technology', region: 'World' },
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', group: 'technology', region: 'World' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC', group: 'world', region: 'World' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', source: 'BBC Technology', group: 'technology', region: 'World' },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', source: 'BBC Sport', group: 'sports', region: 'World' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'The New York Times', group: 'world', region: 'World' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', source: 'The New York Times Technology', group: 'technology', region: 'World' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', source: 'The New York Times Science', group: 'science', region: 'World' },
  { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian', group: 'world', region: 'World' },
  { url: 'https://www.theguardian.com/technology/rss', source: 'The Guardian Technology', group: 'technology', region: 'World' },
  { url: 'https://www.theguardian.com/science/rss', source: 'The Guardian Science', group: 'science', region: 'World' },
  { url: 'https://www.nasa.gov/news-release/feed/', source: 'NASA', group: 'science', region: 'World' },
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News', group: 'technology', region: 'World' },
  { url: 'https://www.espn.com/espn/rss/news', source: 'ESPN', group: 'sports', region: 'World' }
];

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(value = '') {
  return decodeHtmlEntities(value)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value = '', max = 520) {
  return stripHtml(value).slice(0, max).trim();
}

function cleanUrl(value = '') {
  return decodeHtmlEntities(value).trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

function attr(block, tagName, attrName) {
  const match = block.match(new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["'][^>]*>`, 'i'));
  return match ? cleanUrl(match[1]) : '';
}

function normalizeDate(value) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function itemId(url, title) {
  return crypto.createHash('sha1').update(`${url}|${title}`).digest('hex').slice(0, 18);
}

function isRealImage(value) {
  const raw = cleanUrl(value);
  if (!raw || raw.includes('/assets/news-fallback.svg') || raw.startsWith('data:image/')) return false;
  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function normalizeNewsItem(item, defaults = {}) {
  if (!item?.title || !item?.url || !isRealImage(item.image)) return null;
  const title = cleanText(item.title, 220);
  const url = cleanUrl(item.url);
  const id = String(item.id || itemId(url, title)).trim();
  return {
    id,
    title,
    url,
    summary: cleanText(item.summary || '', 520),
    source: cleanText(item.source || defaults.source || 'GNK ASG', 120),
    region: cleanText(item.region || defaults.region || 'Europe', 80),
    group: cleanText(item.group || item.category || defaults.group || 'corporate', 80),
    category: cleanText(item.category || item.group || defaults.group || 'corporate', 80),
    image: cleanUrl(item.image),
    published_at: normalizeDate(item.published_at),
    share_url: item.share_url || `/podijeli/vijest/${id}/`
  };
}

function parseFeed(xml, feed) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.map((block) => {
    const title = tag(block, 'title');
    const link = tag(block, 'link') || attr(block, 'link', 'href') || tag(block, 'guid');
    const summary = tag(block, 'description') || tag(block, 'summary') || tag(block, 'content:encoded');
    const published = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date');
    const image = attr(block, 'media:content', 'url') || attr(block, 'media:thumbnail', 'url') || attr(block, 'enclosure', 'url');
    return normalizeNewsItem({
      id: itemId(link, title),
      title,
      url: link,
      summary,
      source: feed.source,
      region: feed.region,
      group: feed.group,
      category: feed.group,
      image,
      published_at: published,
      share_url: `/podijeli/vijest/${itemId(link, title)}/`
    }, feed);
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
    const items = parseFeed(xml, feed);
    return { ok: true, feed: feed.url, count: items.length, items };
  } catch (error) {
    return { ok: false, feed: feed.url, error: String(error?.message || error), items: [] };
  } finally {
    clearTimeout(timeout);
  }
}

const manualItems = (await readJson(MANUAL_SEED_PATH, [])).map((item) => normalizeNewsItem(item, { source: 'GNK ASG', region: 'Europe', group: 'corporate' })).filter(Boolean);
const results = await Promise.all(FEEDS.map(fetchFeed));
const fetchedItems = results.flatMap((r) => r.items);
const existingPublic = await readJson(PUBLIC_PATH, []);
const existingArchive = await readJson(ARCHIVE_PATH, []);
const byId = new Map();
for (const rawItem of [...manualItems, ...fetchedItems, ...existingPublic, ...existingArchive]) {
  const item = normalizeNewsItem(rawItem);
  if (item?.id && isRealImage(item.image) && !byId.has(item.id)) byId.set(item.id, item);
}

const all = [...byId.values()].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
const publicItems = all.slice(0, PUBLIC_LIMIT);
let archiveItems = all.slice(PUBLIC_LIMIT, PUBLIC_LIMIT + ARCHIVE_MAX_BEFORE_PRUNE);
if (archiveItems.length >= ARCHIVE_MAX_BEFORE_PRUNE) archiveItems = archiveItems.slice(0, ARCHIVE_KEEP_WHEN_FULL);

await fs.mkdir(DATA_DIR, { recursive: true });
await fs.writeFile(PUBLIC_PATH, `${JSON.stringify(publicItems, null, 2)}\n`);
await fs.writeFile(ARCHIVE_PATH, `${JSON.stringify(archiveItems, null, 2)}\n`);

const status = {
  ok: (fetchedItems.length > 0 || manualItems.length > 0) && publicItems.length > 0,
  status: (fetchedItems.length > 0 || manualItems.length > 0) && publicItems.length > 0 ? 'refreshed' : 'refresh_failed_no_real_images',
  updated_at: new Date().toISOString(),
  engine: 'single_publication_engine_v14_isolated_github_action',
  cadence: 'scheduled at 09:00, 16:00 and 21:00 Europe/Zagreb',
  timezone: TZ,
  scheduled_hours_local: [9, 16, 21],
  public_items_target: PUBLIC_LIMIT,
  public_items_written: publicItems.length,
  manual_items_loaded: manualItems.length,
  archive_policy: 'archive_latest_1000_prune_to_500_when_full',
  archive_items_written: archiveItems.length,
  rss_images_enabled: true,
  fallback_image: null,
  fallback_image_allowed: false,
  visual_index_fallback: '/visual-index/',
  feeds_checked: results.map(({ feed, ok, count, error }) => ({ feed, ok, count: count || 0, error }))
};
await fs.writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`);

if (!status.ok) {
  console.error(JSON.stringify(status, null, 2));
  process.exit(1);
}

console.log(`Wrote ${publicItems.length} public news items and ${archiveItems.length} archived items without fallback images. Manual items loaded: ${manualItems.length}.`);
