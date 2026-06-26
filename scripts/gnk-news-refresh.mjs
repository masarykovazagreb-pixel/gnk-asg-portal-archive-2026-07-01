import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import crypto from 'node:crypto';

const TZ = 'Europe/Zagreb';
const PUBLIC_TARGET = 100;
const ARCHIVE_KEEP_WHEN_FULL = 500;
const ARCHIVE_MAX_BEFORE_PRUNE = 1000;
const DATA_DIR = 'apps/portal/data';
const NEWS_PATH = `${DATA_DIR}/news.json`;
const ARCHIVE_PATH = `${DATA_DIR}/news_archive.json`;
const STATUS_PATH = `${DATA_DIR}/news-automation-status.json`;
const FALLBACK_IMAGE = '/assets/news-fallback.svg';

const FEEDS = [
  { source: 'The Verge', group: 'technology', category: 'technology', url: 'https://www.theverge.com/rss/index.xml' },
  { source: 'TechCrunch', group: 'technology', category: 'startup', url: 'https://techcrunch.com/feed/' },
  { source: 'Reuters Business', group: 'business', category: 'business', url: 'https://feeds.reuters.com/reuters/businessNews' },
  { source: 'Reuters Technology', group: 'technology', category: 'technology', url: 'https://feeds.reuters.com/reuters/technologyNews' },
  { source: 'MarketWatch', group: 'markets', category: 'markets', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { source: 'CNBC Business', group: 'business', category: 'business', url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html' },
  { source: 'CNBC Technology', group: 'technology', category: 'technology', url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html' },
  { source: 'BBC Business', group: 'business', category: 'business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { source: 'BBC Technology', group: 'technology', category: 'technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { source: 'WIRED Business', group: 'technology', category: 'technology', url: 'https://www.wired.com/feed/category/business/latest/rss' }
];

function nowIsoZagreb() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(new Date()).reduce((acc, part) => (acc[part.type] = part.value, acc), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+02:00`;
}

function decode(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return match ? decode(match[1]) : '';
}

function attr(text, attrName) {
  const match = text.match(new RegExp(`${attrName}=["']([^"']+)["']`, 'i'));
  return match ? decode(match[1]) : '';
}

function firstImage(xml) {
  const media = xml.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/i)?.[0] || '';
  const mediaUrl = attr(media, 'url');
  if (mediaUrl && /^https?:\/\//i.test(mediaUrl)) return mediaUrl;
  const html = xml.match(/<(?:description|content:encoded)(?:\s[^>]*)?>([\s\S]*?)<\/(?:description|content:encoded)>/i)?.[1] || '';
  const img = html.match(/<img\b[^>]*>/i)?.[0] || '';
  const src = attr(img, 'src');
  return src && /^https?:\/\//i.test(src) ? src : '';
}

function splitItems(xml) {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(match => match[0]);
  if (items.length) return items;
  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map(match => match[0]);
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

function parseDate(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

function idFor(url, title) {
  return crypto.createHash('sha256').update(`${url}|${title}`).digest('hex').slice(0, 18);
}

function parseFeed(xml, feed) {
  return splitItems(xml).map(item => {
    const title = tag(item, 'title');
    let url = normalizeUrl(tag(item, 'link'));
    if (!url) url = normalizeUrl(attr(item.match(/<link\b[^>]*>/i)?.[0] || '', 'href'));
    const summary = decode(tag(item, 'description') || tag(item, 'summary') || tag(item, 'content:encoded'));
    const publishedAt = parseDate(tag(item, 'pubDate') || tag(item, 'published') || tag(item, 'updated') || tag(item, 'dc:date'));
    const image = firstImage(item) || FALLBACK_IMAGE;
    if (!title || !url || summary.length < 40) return null;
    return {
      id: idFor(url, title),
      title,
      url,
      summary: summary.slice(0, 600),
      image,
      imageAlt: image === FALLBACK_IMAGE ? 'GNK ASG zamjenska slika' : title,
      imageCredit: image === FALLBACK_IMAGE ? 'GNK ASG' : feed.source,
      source: feed.source,
      region: feed.source,
      group: feed.group,
      category: feed.category,
      published_at: publishedAt,
      publishedAt,
      verified: true,
      verification: { article: { ok: true }, image: { ok: image === FALLBACK_IMAGE ? false : true, fallback: image === FALLBACK_IMAGE } },
      share_url: `/podijeli/vijest/${idFor(url, title)}/`
    };
  }).filter(Boolean);
}

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(feed.url, { signal: controller.signal, headers: { 'user-agent': 'GNK-ASG-NewsBot/1.0' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { feed, items: parseFeed(await response.text(), feed), ok: true };
  } catch (error) {
    return { feed, items: [], ok: false, error: String(error?.message || error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch { return fallback; }
}

function uniqueSorted(items) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const key = item.id || item.url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique.sort((a, b) => Date.parse(b.publishedAt || b.published_at || 0) - Date.parse(a.publishedAt || a.published_at || 0));
}

async function main() {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const fresh = uniqueSorted(results.flatMap(result => result.items));
  const previousPublic = await readJson(NEWS_PATH, []);
  const previousArchivePayload = await readJson(ARCHIVE_PATH, { updatedAt: null, items: [] });
  const previousArchive = Array.isArray(previousArchivePayload) ? previousArchivePayload : (previousArchivePayload.items || []);

  const publicItems = fresh.slice(0, PUBLIC_TARGET);
  let archiveItems = uniqueSorted([...fresh, ...previousPublic, ...previousArchive]);
  if (archiveItems.length > ARCHIVE_MAX_BEFORE_PRUNE) archiveItems = archiveItems.slice(0, ARCHIVE_KEEP_WHEN_FULL);

  await mkdir(dirname(NEWS_PATH), { recursive: true });
  await writeFile(NEWS_PATH, `${JSON.stringify(publicItems, null, 2)}\n`, 'utf8');
  await writeFile(ARCHIVE_PATH, `${JSON.stringify({ updatedAt: new Date().toISOString(), policy: 'archive_latest_1000_prune_to_500_when_full', items: archiveItems }, null, 2)}\n`, 'utf8');

  const okFeeds = results.filter(result => result.ok).length;
  const status = {
    ok: publicItems.length >= 15,
    status: publicItems.length >= 15 ? 'refreshed' : 'insufficient_items',
    updated_at: nowIsoZagreb(),
    engine: 'single_publication_engine_v14_github_actions',
    cadence: 'scheduled at 09:00, 16:00 and 21:00 Europe/Zagreb',
    timezone: TZ,
    scheduled_hours_local: [9, 16, 21],
    public_items_target: PUBLIC_TARGET,
    public_items_written: publicItems.length,
    archive_policy: 'archive_latest_1000_prune_to_500_when_full',
    archive_items_written: archiveItems.length,
    rss_images_enabled: true,
    fallback_image: FALLBACK_IMAGE,
    visual_index_fallback: '/visual-index/',
    feed_results: results.map(result => ({ source: result.feed.source, ok: result.ok, items: result.items.length, error: result.error || null })),
    last_checked_issue: publicItems.length >= 15 ? null : `only ${publicItems.length} usable items from ${okFeeds}/${FEEDS.length} feeds`
  };
  await writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`, 'utf8');

  if (publicItems.length < 15) process.exitCode = 1;
}

await main();
