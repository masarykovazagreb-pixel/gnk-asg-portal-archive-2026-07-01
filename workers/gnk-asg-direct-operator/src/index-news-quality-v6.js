import core from './index-dark-market-recovery.js';

const VERSION = 'GNK_ASG_NEWS_QUALITY_V6_20260625';
const QUALITY_INTERVAL_MS = 15 * 60 * 1000;
const PUBLICATION_KEYS = ['publish:approved', 'data:articles:items'];
const STABLE_JSON_PATHS = new Set([
  '/data/news.json',
  '/data/auto-editor.json',
  '/data/market.json',
  '/data/digital-assets.json',
  '/data/market-indices.json',
  '/data/exchanges.json',
  '/data/stablecoins.json',
  '/data/daily-market-brief.json',
  '/data/status.json'
]);
const PUBLIC_HTML_PREFIXES = [
  '/objave', '/publications', '/vijesti', '/news', '/trzista', '/markets',
  '/assistant', '/en/assistant', '/downloads', '/en/downloads', '/visual-index',
  '/contact', '/en/contact', '/legal', '/en/legal', '/status-automatizacije', '/automation-status'
];
const MOJIBAKE = /(?:\uFFFD|Ã.|Â.|â€|â€™|â€“|â€”|Å.|Ä.|Ð.|Ñ.|ΓÇ|┼|╛|╕)/;
const PLACEHOLDER = /(?:lorem ipsum|\bTODO\b|\bTBD\b|undefined|null|\[object Object\]|test article|draft only|tekst će biti dodan|content coming soon)/i;

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    'x-content-type-options': 'nosniff',
    'x-gnk-asg-news-quality': VERSION,
    ...extra
  }
});

const xml = value => new Response(value, {
  headers: {
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': 'public, max-age=900, stale-while-revalidate=3600',
    'x-content-type-options': 'nosniff',
    'x-gnk-asg-news-quality': VERSION
  }
});

const kv = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
const nowIso = () => new Date().toISOString();
const text = value => String(value || '').trim();
const words = value => text(value).split(/\s+/).filter(Boolean).length;
const normalise = value => text(value).toLowerCase();
const escapeXml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

async function readJson(env, key, fallback) {
  const store = kv(env);
  if (!store) return fallback;
  try {
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(env, key, value) {
  const store = kv(env);
  if (!store) return false;
  await store.put(key, JSON.stringify(value, null, 2));
  return true;
}

async function readList(env, key) {
  const value = await readJson(env, key, []);
  return Array.isArray(value) ? value : [];
}

async function writeList(env, key, list, max = 500) {
  return writeJson(env, key, list.slice(0, max));
}

function token(request) {
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  return String(
    (bearer && bearer[1]) ||
    request.headers.get('x-news-publish-token') ||
    request.headers.get('x-operator-token') ||
    request.headers.get('x-admin-token') ||
    request.headers.get('x-gnk-asg-token') ||
    ''
  ).trim();
}

function authorized(request, env) {
  const received = token(request);
  const allowed = [
    env.NEWS_PUBLISH_TOKEN,
    env.OPERATOR_TOKEN,
    env.GNK_ASG_OPERATOR_TOKEN,
    env.ADMIN_TOKEN,
    env.GNK_ASG_ADMIN_TOKEN
  ].map(value => String(value || '').trim()).filter(Boolean);
  return Boolean(received && allowed.includes(received));
}

function repairUtf8(value) {
  let output = String(value ?? '').normalize('NFC');
  if (!MOJIBAKE.test(output)) return output;
  try {
    const chars = [...output];
    if (chars.every(char => char.charCodeAt(0) <= 255)) {
      const bytes = Uint8Array.from(chars.map(char => char.charCodeAt(0)));
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (decoded && !MOJIBAKE.test(decoded)) output = decoded;
    }
  } catch {}
  const replacements = [
    ['â€™','’'],['â€˜','‘'],['â€œ','“'],['â€','”'],['â€“','–'],['â€”','—'],
    ['Â ',' '],['Â',''],['Ä','č'],['Ä‡','ć'],['Å¡','š'],['Å¾','ž'],['Ä‘','đ']
  ];
  for (const [bad, good] of replacements) output = output.split(bad).join(good);
  return output.normalize('NFC');
}

function deepRepair(value) {
  if (typeof value === 'string') return repairUtf8(value);
  if (Array.isArray(value)) return value.map(deepRepair);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepRepair(item)]));
  }
  return value;
}

function isAutomaticArticle(item) {
  const id = normalise(item?.id);
  const source = normalise(item?.source);
  return id.startsWith('auto-') || source.includes('intelligence desk') || source.includes('auto editor');
}

function languageScore(value, language) {
  const body = ` ${normalise(value).replace(/[^a-zčćžšđ\s]/g, ' ')} `;
  const patterns = language === 'hr'
    ? [' je ', ' su ', ' za ', ' na ', ' u ', ' od ', ' koji ', ' kako ', ' tržišt', ' poslov', ' europs', ' ulaganj', ' gospodar', ' društv', ' rizik', ' prilik']
    : [' the ', ' and ', ' of ', ' to ', ' in ', ' for ', ' with ', ' market', ' business', ' technology', ' investment', ' economy', ' company', ' risk', ' opportunity'];
  return patterns.reduce((score, pattern) => score + body.split(pattern).length - 1, 0);
}

function repeatedSentenceRatio(value) {
  const sentences = text(value)
    .split(/[.!?]+/)
    .map(sentence => normalise(sentence).replace(/\s+/g, ' ').trim())
    .filter(sentence => sentence.length > 35);
  if (sentences.length < 8) return 0;
  return 1 - new Set(sentences).size / sentences.length;
}

function validHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function distinctSources(item) {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const urls = sources
    .map(source => String(source?.url || '').trim())
    .filter(validHttpUrl)
    .map(url => url.toLowerCase());
  return new Set(urls).size;
}

function qualityReasons(item) {
  const reasons = [];
  if (!item || typeof item !== 'object') return ['invalid_record'];

  const titleHr = text(item.titleHr || item.title);
  const titleEn = text(item.titleEn);
  const summaryHr = text(item.summaryHr || item.summary);
  const summaryEn = text(item.summaryEn);
  const bodyHr = text(item.bodyHr || item.body);
  const bodyEn = text(item.bodyEn);
  const combined = [titleHr, titleEn, summaryHr, summaryEn, bodyHr, bodyEn].join('\n');

  if (MOJIBAKE.test(combined)) reasons.push('broken_encoding');
  if (PLACEHOLDER.test(combined)) reasons.push('placeholder_content');
  if (item.status && item.status !== 'published') reasons.push('not_published');
  if (item.approvedForPublic === false) reasons.push('not_approved');

  if (isAutomaticArticle(item)) {
    const hrWords = words(bodyHr);
    const enWords = words(bodyEn);
    const seo = item.seo || {};
    if (!text(item.slug)) reasons.push('missing_slug');
    if (titleHr.length < 12 || titleHr.length > 190) reasons.push('invalid_hr_title');
    if (titleEn.length < 12 || titleEn.length > 190) reasons.push('invalid_en_title');
    if (summaryHr.length < 120) reasons.push('short_hr_summary');
    if (summaryEn.length < 120) reasons.push('short_en_summary');
    if (hrWords < 500 || hrWords > 1500) reasons.push(`invalid_hr_length_${hrWords}`);
    if (enWords < 500 || enWords > 1500) reasons.push(`invalid_en_length_${enWords}`);
    if (languageScore(bodyHr, 'hr') < 14) reasons.push('hr_language_quality');
    if (languageScore(bodyEn, 'en') < 14) reasons.push('en_language_quality');
    if (languageScore(titleHr, 'en') > languageScore(titleHr, 'hr') && titleHr.toLowerCase() === titleEn.toLowerCase()) {
      reasons.push('hr_title_fell_back_to_english');
    }
    if (repeatedSentenceRatio(bodyHr) > 0.80) reasons.push('hr_repetition');
    if (repeatedSentenceRatio(bodyEn) > 0.80) reasons.push('en_repetition');
    if (distinctSources(item) < 2) reasons.push('fewer_than_two_sources');
    if (!validHttpUrl(item.image) && !String(item.image || '').startsWith('/')) reasons.push('missing_image');
    if (!validHttpUrl(item.canonical)) reasons.push('missing_canonical');
    if (!text(item.author)) reasons.push('missing_author');
    if (!text(seo.titleHr || seo.title)) reasons.push('missing_seo_title_hr');
    if (!text(seo.titleEn)) reasons.push('missing_seo_title_en');
    if (!text(seo.descriptionHr || seo.description)) reasons.push('missing_seo_description_hr');
    if (!text(seo.descriptionEn)) reasons.push('missing_seo_description_en');
  }

  return [...new Set(reasons)];
}

function identity(item) {
  return normalise(item?.slug || item?.id || item?.canonical || item?.publicUrl || item?.titleHr || item?.title);
}

async function cleanPublications(env, force = false) {
  const last = await readJson(env, 'quality:publications:last', null);
  const lastTime = Date.parse(last?.finishedAt || '');
  if (!force && Number.isFinite(lastTime) && Date.now() - lastTime < QUALITY_INTERVAL_MS) return last;

  const startedAt = nowIso();
  const lists = {};
  const removed = [];
  const removedIds = new Set();
  const removedUrls = new Set();

  for (const key of PUBLICATION_KEYS) {
    const source = await readList(env, key);
    const output = [];
    const localSeen = new Set();

    for (const original of source) {
      const item = deepRepair(original);
      const id = identity(item);
      const reasons = qualityReasons(item);
      if (!id) reasons.push('missing_identity');
      if (id && localSeen.has(id)) reasons.push('duplicate');

      if (reasons.length) {
        removed.push({ key, removedAt: nowIso(), reasons, item });
        if (id) removedIds.add(id);
        [item?.canonical, item?.publicUrl, item?.hrUrl, item?.enUrl]
          .filter(Boolean)
          .forEach(url => removedUrls.add(normalise(url)));
        continue;
      }

      localSeen.add(id);
      output.push(item);
    }

    lists[key] = { before: source.length, after: output.length };
    await writeList(env, key, output, 500);
  }

  const news = (await readList(env, 'data:news:items')).map(deepRepair);
  const cleanNews = news.filter(item => {
    const itemId = identity(item);
    const url = normalise(item?.url || item?.sourceUrl);
    const articleId = normalise(String(item?.id || '').replace(/^news-/, ''));
    return !removedIds.has(itemId) && !removedIds.has(articleId) && !removedUrls.has(url) && !MOJIBAKE.test([item?.title, item?.summary].join('\n'));
  });
  await writeList(env, 'data:news:items', cleanNews, 500);

  const history = await readList(env, 'auto-editor:history');
  const cleanHistory = history.filter(entry => !removedIds.has(normalise(entry?.articleId || entry?.slug)));
  await writeList(env, 'auto-editor:history', cleanHistory, 500);

  const oldQuarantine = await readList(env, 'quality:quarantine:articles');
  const quarantine = [...removed, ...oldQuarantine].slice(0, 1000);
  await writeList(env, 'quality:quarantine:articles', quarantine, 1000);

  const result = {
    ok: true,
    version: VERSION,
    startedAt,
    finishedAt: nowIso(),
    lists,
    news: { before: news.length, after: cleanNews.length },
    history: { before: history.length, after: cleanHistory.length },
    removedCount: removed.length,
    quarantineCount: quarantine.length,
    rules: {
      autoMinimumWordsPerLanguage: 500,
      autoMaximumWordsPerLanguage: 1500,
      bilingualRequired: true,
      minimumDistinctSources: 2,
      imageRequired: true,
      seoRequired: true,
      canonicalRequired: true,
      mojibakeRepairedOrRejected: true,
      placeholdersRejected: true,
      duplicatesRejected: true
    }
  };
  await writeJson(env, 'quality:publications:last', result);
  return result;
}

function shouldClean(path, method) {
  if (method !== 'GET' && method !== 'HEAD') return false;
  return path === '/objave' || path.startsWith('/objave/') ||
    path === '/publications' || path.startsWith('/publications/') ||
    path === '/data/auto-editor.json' || path === '/data/news.json';
}

function isPublicHtml(path) {
  return PUBLIC_HTML_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

async function stableJsonResponse(request, env, ctx) {
  let response;
  try {
    response = await core.fetch(request, env, ctx);
  } catch (error) {
    return json({ ok: false, status: 'FALLBACK', updatedAt: nowIso(), items: [], error: String(error?.message || error) }, 200);
  }

  let parsed = null;
  try {
    const raw = await response.text();
    if (raw.trim()) parsed = JSON.parse(raw);
  } catch {}

  const repaired = parsed && typeof parsed === 'object' ? deepRepair(parsed) : {};
  const items = Array.isArray(repaired) ? repaired : (Array.isArray(repaired.items) ? repaired.items : []);
  const output = Array.isArray(repaired) ? {
    ok: true,
    status: items.length ? 'SNAPSHOT' : 'FALLBACK',
    updatedAt: nowIso(),
    items
  } : {
    ...repaired,
    ok: repaired.ok !== false,
    status: String(repaired.status || (items.length ? 'SNAPSHOT' : 'FALLBACK')).toUpperCase(),
    updatedAt: repaired.updatedAt || repaired.generatedAt || nowIso(),
    items
  };
  if (!['LIVE', 'SNAPSHOT', 'DELAYED', 'FALLBACK', 'ERROR'].includes(output.status)) output.status = 'SNAPSHOT';
  return json(output, 200, { 'x-gnk-asg-stable-json': VERSION });
}

async function repairedHtmlResponse(response) {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html') || response.status >= 400) return response;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('x-gnk-asg-utf8-repair', VERSION);
  return new Response(repairUtf8(await response.text()), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function isoDate(value) {
  const date = new Date(value || Date.now());
  return Number.isFinite(date.getTime()) ? date.toISOString() : nowIso();
}

async function publicationSitemap(env, images = false) {
  const items = (await readList(env, 'publish:approved'))
    .map(deepRepair)
    .filter(item => item?.approvedForPublic !== false && item?.slug && !qualityReasons(item).length);

  if (images) {
    const entries = items
      .filter(item => validHttpUrl(item.image) || String(item.image || '').startsWith('/'))
      .map(item => {
        const imageUrl = validHttpUrl(item.image) ? item.image : `https://gnk-asg.hr${item.image}`;
        return `<url><loc>https://gnk-asg.hr/objave/${escapeXml(item.slug)}/</loc><image:image><image:loc>${escapeXml(imageUrl)}</image:loc><image:title>${escapeXml(item.titleHr || item.title || '')}</image:title><image:caption>${escapeXml(item.imageAlt || item.summaryHr || '')}</image:caption></image:image></url>`;
      }).join('');
    return xml(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries}</urlset>`);
  }

  const base = [
    ['/objave/', 'daily', '0.9'], ['/publications/', 'daily', '0.9'],
    ['/vijesti/', 'hourly', '0.8'], ['/news/', 'hourly', '0.8'],
    ['/status-automatizacije/', 'hourly', '0.5'], ['/automation-status/', 'hourly', '0.5']
  ];
  const entries = base.map(([path, frequency, priority]) => `<url><loc>https://gnk-asg.hr${path}</loc><lastmod>${nowIso()}</lastmod><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`)
    .concat(items.flatMap(item => {
      const lastmod = isoDate(item.updatedAt || item.publishedAt || item.createdAt);
      return [
        `<url><loc>https://gnk-asg.hr/objave/${escapeXml(item.slug)}/</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
        `<url><loc>https://gnk-asg.hr/publications/${escapeXml(item.slug)}/</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
      ];
    })).join('');
  return xml(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`);
}

async function handle(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/data/content-quality-status.json') {
    return json({
      ok: true,
      version: VERSION,
      schedule: 'every_2_hours',
      lastCleanup: await readJson(env, 'quality:publications:last', null),
      lastNewsRefresh: await readJson(env, 'automation:news-refresh:last', null),
      lastAutoEditor: await readJson(env, 'auto-editor:last', null),
      lastScheduledRun: await readJson(env, 'automation:scheduled:last', null)
    });
  }

  if (path === '/operator/content-quality/run') {
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
    if (!authorized(request, env)) return json({ ok: false, error: 'authorization_required' }, 401);
    return json(await cleanPublications(env, true));
  }

  if (path === '/sitemap-objave.xml') return publicationSitemap(env, false);
  if (path === '/image-sitemap-objave.xml') return publicationSitemap(env, true);

  if (shouldClean(path, request.method)) await cleanPublications(env, false);
  if (STABLE_JSON_PATHS.has(path)) return stableJsonResponse(request, env, ctx);

  const response = await core.fetch(request, env, ctx);
  if ((request.method === 'GET' || request.method === 'HEAD') && isPublicHtml(path) && path !== '/' && path !== '/en') {
    return repairedHtmlResponse(response);
  }
  return response;
}

export default {
  fetch: handle,
  async scheduled(event, env, ctx) {
    const task = (async () => {
      const automation = typeof core.scheduled === 'function'
        ? await core.scheduled(event, env, {})
        : null;
      const quality = await cleanPublications(env, true);
      const result = {
        ok: quality.ok !== false,
        version: VERSION,
        cron: event?.cron || '',
        finishedAt: nowIso(),
        automation,
        quality
      };
      await writeJson(env, 'quality:scheduled:last', result);
      return result;
    })();
    if (ctx?.waitUntil) {
      ctx.waitUntil(task);
      return;
    }
    return task;
  },
  async email(message, env, ctx) {
    if (typeof core.email === 'function') return core.email(message, env, ctx);
  }
};
