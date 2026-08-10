import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import crypto from 'node:crypto';

const TZ = 'Europe/Zagreb';
const PUBLIC_TARGET = 300;
const MIN_ITEMS_FLOOR = 200;  // ako filter previše odreže, dopuni iz arhive dok se ne dostigne minimum
const ARCHIVE_KEEP_WHEN_FULL = 500;
const ARCHIVE_MAX_BEFORE_PRUNE = 1000;
const DATA_DIR = 'apps/portal/data';
const NEWS_PATH = `${DATA_DIR}/news.json`;
const ARCHIVE_PATH = `${DATA_DIR}/news_archive.json`;
const STATUS_PATH = `${DATA_DIR}/news-automation-status.json`;
const FALLBACK_IMAGE = '/assets/news-fallback.svg';

// Grupe moraju odgovarati onima koje stranica /gnk-aktual/ poznaje.
// Glavne grupe ukljucuju economy, technology, digital-assets, international,
// hrvatska, regije i tematske rubrike poput ljubimci.
// (Reuters vise nema javni RSS — feeds.reuters.com je ugasen i zato je izbacen.)
const FEEDS = [
  // --- Burza i biznis ------------------------------------------------
  { source: 'CNBC', group: 'economy', category: 'business', url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html' },
  { source: 'CNBC Business', group: 'economy', category: 'business', url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html' },
  { source: 'BBC Business', group: 'economy', category: 'business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { source: 'The Guardian Business', group: 'economy', category: 'business', url: 'https://www.theguardian.com/uk/business/rss' },
  { source: 'MarketWatch', group: 'economy', category: 'markets', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { source: 'The New York Times Business', group: 'economy', category: 'business', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml' },
  { source: 'Sky News Business', group: 'economy', category: 'business', url: 'https://feeds.skynews.com/feeds/rss/business.xml' },
  { source: 'The Independent Business', group: 'economy', category: 'business', url: 'https://www.independent.co.uk/news/business/rss' },
  { source: 'Euronews Business', group: 'economy', category: 'business', url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=business' },
  { source: 'Al Jazeera Economy', group: 'economy', category: 'business', url: 'https://www.aljazeera.com/xml/rss/economy.xml' },
  { source: 'DW Business', group: 'economy', category: 'business', url: 'https://rss.dw.com/xml/rss-en-bus' },

  // --- Tehnologija ---------------------------------------------------
  { source: 'The Verge', group: 'technology', category: 'technology', url: 'https://www.theverge.com/rss/index.xml' },
  { source: 'TechCrunch', group: 'technology', category: 'technology', url: 'https://techcrunch.com/feed/' },
  { source: 'Wired', group: 'technology', category: 'technology', url: 'https://www.wired.com/feed/rss' },
  { source: 'Ars Technica', group: 'technology', category: 'technology', url: 'https://arstechnica.com/feed/' },
  { source: 'Engadget', group: 'technology', category: 'technology', url: 'https://www.engadget.com/rss.xml' },
  { source: 'BBC Technology', group: 'technology', category: 'technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { source: 'The Guardian Technology', group: 'technology', category: 'technology', url: 'https://www.theguardian.com/uk/technology/rss' },
  { source: 'MIT Technology Review', group: 'technology', category: 'technology', url: 'https://www.technologyreview.com/feed/' },
  { source: 'VentureBeat', group: 'technology', category: 'technology', url: 'https://venturebeat.com/feed/' },

  // --- Digitalna imovina ---------------------------------------------
  { source: 'CoinDesk', group: 'digital-assets', category: 'digital-assets', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'Cointelegraph', group: 'digital-assets', category: 'digital-assets', url: 'https://cointelegraph.com/rss' },
  { source: 'Decrypt', group: 'digital-assets', category: 'digital-assets', url: 'https://decrypt.co/feed' },
  { source: 'The Block', group: 'digital-assets', category: 'digital-assets', url: 'https://www.theblock.co/rss.xml' },
  { source: 'Bitcoin Magazine', group: 'digital-assets', category: 'digital-assets', url: 'https://bitcoinmagazine.com/feed' },
  { source: 'CryptoSlate', group: 'digital-assets', category: 'digital-assets', url: 'https://cryptoslate.com/feed/' },

  // --- Indija ----------------------------------------------------------
  { source: 'The Hindu BusinessLine', group: 'regije', category: 'indija', url: 'https://www.thehindubusinessline.com/feeder/default.rss' },
  { source: 'Economic Times', group: 'regije', category: 'indija', url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms' },
  { source: 'Business Standard', group: 'regije', category: 'indija', url: 'https://www.business-standard.com/rss/home_page_top_stories.rss' },
  { source: 'Livemint', group: 'regije', category: 'indija', url: 'https://www.livemint.com/rss/companies' },

  // --- Azija -----------------------------------------------------------
  { source: 'Nikkei Asia', group: 'regije', category: 'azija', url: 'https://asia.nikkei.com/rss/feed/nar' },
  { source: 'The Japan Times', group: 'regije', category: 'azija', url: 'https://www.japantimes.co.jp/feed/' },
  { source: 'Channel News Asia', group: 'regije', category: 'azija', url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml' },
  { source: 'South China Morning Post', group: 'regije', category: 'azija', url: 'https://www.scmp.com/rss/92/feed' },

  // --- Afrika ----------------------------------------------------------
  { source: 'AllAfrica Business', group: 'regije', category: 'afrika', url: 'https://allafrica.com/tools/headlines/rdf/business/headlines.rdf' },
  { source: 'Nairametrics', group: 'regije', category: 'afrika', url: 'https://nairametrics.com/feed/' },
  { source: 'The East African', group: 'regije', category: 'afrika', url: 'https://www.theeastafrican.co.ke/rss' },

  // --- Latinska Amerika i Bliski istok ---------------------------------
  { source: 'Agencia Brasil', group: 'regije', category: 'latinska-amerika', url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml' },
  { source: 'Arab News Business', group: 'regije', category: 'bliski-istok', url: 'https://www.arabnews.com/cat/3/rss.xml' },

  // --- Svijet ---------------------------------------------------------
  { source: 'BBC News', group: 'international', category: 'world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'The Guardian', group: 'international', category: 'world', url: 'https://www.theguardian.com/world/rss' },
  { source: 'Al Jazeera', group: 'international', category: 'world', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { source: 'France 24', group: 'international', category: 'world', url: 'https://www.france24.com/en/rss' },
  { source: 'The New York Times World', group: 'international', category: 'world', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  { source: 'European Commission', group: 'international', category: 'world', url: 'https://ec.europa.eu/commission/presscorner/api/rss?language=en' },

  // --- Kucni ljubimci --------------------------------------------------
  // Prikazuje se samo naslov, slika/izvorni media URL kada ga RSS daje,
  // kratak izvod i poveznica na izvornog izdavaca; puni tekst se ne pohranjuje.
  { source: 'The Guardian Pets', group: 'ljubimci', category: 'pets', url: 'https://www.theguardian.com/lifeandstyle/pets/rss' },
  { source: 'Dogster', group: 'ljubimci', category: 'dogs', url: 'https://www.dogster.com/feed' },
  { source: 'Catster', group: 'ljubimci', category: 'cats', url: 'https://www.catster.com/feed' },

  // --- Hrvatska --------------------------------------------------------
  { source: 'Index.hr', group: 'hrvatska', category: 'hrvatska', url: 'https://www.index.hr/rss/vijesti' },
  { source: 'Index.hr Novac', group: 'hrvatska', category: 'hrvatska', url: 'https://www.index.hr/rss/vijesti-novac' },
  { source: 'Poslovni dnevnik', group: 'hrvatska', category: 'hrvatska', url: 'https://www.poslovni.hr/feed' },
  { source: 'tportal', group: 'hrvatska', category: 'hrvatska', url: 'https://www.tportal.hr/rss' },
  { source: 'Lider', group: 'hrvatska', category: 'hrvatska', url: 'https://lidermedia.hr/feed/' },
  { source: 'SEEbiz', group: 'hrvatska', category: 'hrvatska', url: 'https://www.seebiz.eu/rss/' },
  { source: 'Netokracija', group: 'hrvatska', category: 'hrvatska', url: 'https://www.netokracija.com/feed' },
  // --- Znanost i istrazivanje ---------------------------------------
  { source: 'NASA Breaking News', group: 'znanost', category: 'science', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
  { source: 'ESA News', group: 'znanost', category: 'science', url: 'https://www.esa.int/rssfeed/Our_Activities/Space_News' },
  { source: 'Scientific American', group: 'znanost', category: 'science', url: 'https://rss.sciam.com/ScientificAmerican-Global' },
  { source: 'ScienceDaily', group: 'znanost', category: 'science', url: 'https://www.sciencedaily.com/rss/all.xml' },
  { source: 'Phys.org', group: 'znanost', category: 'science', url: 'https://phys.org/rss-feed/' },

  // --- Zdravlje i medicina ------------------------------------------
  { source: 'BBC Health', group: 'zdravlje', category: 'health', url: 'https://feeds.bbci.co.uk/news/health/rss.xml' },
  { source: 'The Guardian Health', group: 'zdravlje', category: 'health', url: 'https://www.theguardian.com/society/health/rss' },
  { source: 'Medical News Today', group: 'zdravlje', category: 'health', url: 'https://www.medicalnewstoday.com/newsfeeds/rss/medical_all.xml' },

  // --- Kultura i umjetnost ------------------------------------------
  { source: 'BBC Culture', group: 'kultura', category: 'culture', url: 'https://feeds.bbci.co.uk/culture/feed.rss' },
  { source: 'The Guardian Culture', group: 'kultura', category: 'culture', url: 'https://www.theguardian.com/culture/rss' },
  { source: 'The New York Times Arts', group: 'kultura', category: 'culture', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml' },
  { source: 'Smithsonian Magazine', group: 'kultura', category: 'culture', url: 'https://www.smithsonianmag.com/rss/latest_articles/' },

  // --- Djeca, obitelj, obrazovanje ----------------------------------
  { source: 'BBC Newsround', group: 'djeca', category: 'family', url: 'https://feeds.bbci.co.uk/newsround/rss.xml' },
  { source: 'NPR Ed', group: 'djeca', category: 'education', url: 'https://feeds.npr.org/1013/rss.xml' },
  { source: 'The Guardian Family', group: 'djeca', category: 'family', url: 'https://www.theguardian.com/lifeandstyle/family/rss' },

  // --- Priroda, zivotinje, okolis -----------------------------------
  { source: 'National Geographic Animals', group: 'ljubimci', category: 'animals', url: 'https://feeds.feedburner.com/ng/News/News_Main' },
  { source: 'BBC Nature', group: 'ljubimci', category: 'nature', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml' },
  { source: 'The Guardian Animals', group: 'ljubimci', category: 'animals', url: 'https://www.theguardian.com/environment/animals/rss' },
  { source: 'The Guardian Environment', group: 'ljubimci', category: 'environment', url: 'https://www.theguardian.com/environment/rss' },
  { source: 'Mongabay', group: 'ljubimci', category: 'environment', url: 'https://news.mongabay.com/feed/' },

  // --- Sport --------------------------------------------------------
  { source: 'BBC Sport', group: 'sport', category: 'sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
  { source: 'The Guardian Sport', group: 'sport', category: 'sport', url: 'https://www.theguardian.com/sport/rss' },
  { source: 'ESPN Top Headlines', group: 'sport', category: 'sport', url: 'https://www.espn.com/espn/rss/news' },

  // --- Zivotni stil, hrana, putovanja -------------------------------
  { source: 'BBC Travel', group: 'turizam', category: 'travel', url: 'https://www.bbc.co.uk/travel/feed.rss' },
  { source: 'The Guardian Travel', group: 'turizam', category: 'travel', url: 'https://www.theguardian.com/travel/rss' },
  { source: 'The Guardian Food', group: 'turizam', category: 'food', url: 'https://www.theguardian.com/food/rss' },
  { source: 'Bon Appetit', group: 'turizam', category: 'food', url: 'https://www.bonappetit.com/feed/rss' },

  // --- Klima i energija ---------------------------------------------
  { source: 'Reuters Sustainability', group: 'okolis', category: 'climate', url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=green' },
  { source: 'The Guardian Climate Crisis', group: 'okolis', category: 'climate', url: 'https://www.theguardian.com/environment/climate-crisis/rss' },
  { source: 'Grist', group: 'okolis', category: 'climate', url: 'https://grist.org/feed/' },

];

// Koliko vijesti jedan medij smije zauzeti u objavljenom skupu.
const MAX_PER_SOURCE = 6;

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
    const image = firstImage(item);
    if (!title || !url || summary.length < 80) return null;
    if (!image) return null;  // korisnicki zahtjev: preskoci vijesti bez prave slike
    if (/promo code|coupon code|% off|discount code|deals? this|save \d+%/i.test(title)) return null;
    return {
      id: idFor(url, title),
      title,
      url,
      summary: summary.slice(0, 600),
      image,
      imageAlt: title,
      imageCredit: feed.source,
      source: feed.source,
      region: feed.source,
      group: feed.group,
      category: feed.category,
      published_at: publishedAt,
      publishedAt,
      verified: true,
      verification: { article: { ok: true }, image: { ok: true, fallback: false } },
      share_url: `/podijeli/vijest/${idFor(url, title)}/`,
      editor_approved: 'Nermin Sefić',
      editor_role: 'urednik'
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
  const seenKeys = new Set();
  const seenTitles = new Set();
  const unique = [];
  for (const item of items) {
    const key = item.id || item.url;
    const titleKey = String(item.title || '').toLowerCase().trim().replace(/\s+/g, ' ');
    if (!key || seenKeys.has(key)) continue;
    if (titleKey && seenTitles.has(titleKey)) continue;
    seenKeys.add(key);
    if (titleKey) seenTitles.add(titleKey);
    unique.push(item);
  }
  return unique.sort((a, b) => Date.parse(b.publishedAt || b.published_at || 0) - Date.parse(a.publishedAt || a.published_at || 0));
}

// Ogranicava koliko vijesti jedan medij smije imati u objavljenom skupu.
// Visak se ne baca nego ide na kraj — tako se popuni do PUBLIC_TARGET
// i kad je dio feedova nedostupan.
function balanceBySource(items, cap, target) {
  const used = new Map();
  const primary = [];
  const overflow = [];
  for (const item of items) {
    const source = item.source || '?';
    const count = (used.get(source) || 0) + 1;
    used.set(source, count);
    (count <= cap ? primary : overflow).push(item);
  }
  return primary.concat(overflow).slice(0, target);
}

async function main() {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const fresh = uniqueSorted(results.flatMap(result => result.items));
  const previousPublic = await readJson(NEWS_PATH, []);
  const previousArchivePayload = await readJson(ARCHIVE_PATH, { updatedAt: null, items: [] });
  const previousArchive = Array.isArray(previousArchivePayload) ? previousArchivePayload : (previousArchivePayload.items || []);

  // Merge fresh items with whatever is already in news.json rather than overwriting it outright.
  // Other scheduled processes (e.g. scripts/refresh_index_live_data.py) also write to this same
  // file with their own sources, using URL-keyed merge; overwriting here would silently erase
  // their items every time this script runs, and vice versa -- this was a real, confirmed source
  // of churn/duplication between runs of different processes.
  // Drop legacy items that still point to fallback SVG (korisnicki zahtjev: bez slike se ne prikazuje).
  
  // HEAD-check svake nove slike, uz 8s timeout / redirect follow, s malom paralelnošću
  async function headOk(url) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 5000);
    try {
      let r = await fetch(url, { method: 'HEAD', signal: ac.signal, redirect: 'follow', headers: { 'user-agent': 'GNK-ASG-NewsBot/1.0' } });
      if (!r.ok) r = await fetch(url, { method: 'GET', signal: ac.signal, redirect: 'follow', headers: { 'user-agent': 'GNK-ASG-NewsBot/1.0', 'range': 'bytes=0-1023' } });
      if (!r.ok) return false;
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      return ct.startsWith('image/') || ct === '' || ct.startsWith('application/octet-stream');
    } catch { return false; }
    finally { clearTimeout(t); }
  }
  async function validateImages(items, concurrency = 24) {
    const out = new Array(items.length);
    let i = 0;
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (i < items.length) {
        const my = i++;
        out[my] = await headOk(items[my].image);
      }
    }));
    return items.filter((_, k) => out[k]);
  }
  // samo NOVE stavke koje nisu već u previousPublic (ubrzava refresh):
  const previouslyKnown = new Set((previousPublic || []).map(it => it && it.id).filter(Boolean));
  const [alreadyKnown, actuallyFresh] = fresh.reduce((acc, it) => (previouslyKnown.has(it.id) ? acc[0].push(it) : acc[1].push(it), acc), [[], []]);
  const validatedNew = await validateImages(actuallyFresh);
  const freshValidated = [...alreadyKnown, ...validatedNew];
  console.log(`Skipped HEAD for ${alreadyKnown.length} previously-known items; validated ${validatedNew.length}/${actuallyFresh.length} new`);
  const droppedByImageCheck = fresh.length - freshValidated.length;
  console.log(`Image HEAD check: ${freshValidated.length}/${fresh.length} passed (${droppedByImageCheck} dropped)`);

  const isReal = it => it && it.image && !/news-fallback\.svg$/i.test(it.image);
  const merged = uniqueSorted([...freshValidated, ...previousPublic.filter(isReal)]);
  const publicItems = balanceBySource(merged, MAX_PER_SOURCE, PUBLIC_TARGET);
  // Sigurnosni sloj: ako je publicItems < MIN_ITEMS_FLOOR, dopuni iz arhive
  let publicItemsFinal = publicItems;
  if (publicItemsFinal.length < MIN_ITEMS_FLOOR) {
    const seen = new Set(publicItemsFinal.map(it => it.id));
    const filler = [...previousPublic, ...previousArchive]
      .filter(it => it && it.image && !seen.has(it.id) && !/news-fallback\.svg$/i.test(it.image));
    for (const it of filler) {
      if (publicItemsFinal.length >= MIN_ITEMS_FLOOR) break;
      publicItemsFinal.push(it);
      seen.add(it.id);
    }
    console.log(`Floor guard: filled to ${publicItemsFinal.length} items (min ${MIN_ITEMS_FLOOR})`);
  }
  let archiveItems = uniqueSorted([...freshValidated, ...previousPublic.filter(isReal), ...previousArchive.filter(isReal)]);
  if (archiveItems.length > ARCHIVE_MAX_BEFORE_PRUNE) archiveItems = archiveItems.slice(0, ARCHIVE_KEEP_WHEN_FULL);

  await mkdir(dirname(NEWS_PATH), { recursive: true });
  await writeFile(NEWS_PATH, `${JSON.stringify(publicItemsFinal, null, 2)}\n`, 'utf8');
  await writeFile(ARCHIVE_PATH, `${JSON.stringify({ updatedAt: new Date().toISOString(), policy: 'archive_latest_1000_prune_to_500_when_full', items: archiveItems }, null, 2)}\n`, 'utf8');

  const okFeeds = results.filter(result => result.ok).length;
  const status = {
    ok: publicItemsFinal.length >= 15,
    status: publicItems.length >= 15 ? 'refreshed' : 'insufficient_items',
    updated_at: nowIsoZagreb(),
    engine: 'single_publication_engine_v14_github_actions',
    cadence: 'every 2 hours (00:00-22:00 UTC)',
    timezone: TZ,
    scheduled_interval_hours: 2,
    max_items_per_source: MAX_PER_SOURCE,
    feeds_configured: FEEDS.length,
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