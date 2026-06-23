import core from './index-dark-market-recovery.js';

const VERSION = 'GNK_ASG_NEWS_QUALITY_V2';
const QUALITY_INTERVAL_MS = 15 * 60 * 1000;
const PUBLICATION_KEYS = ['publish:approved', 'data:articles:items'];
const MOJIBAKE = /(?:\uFFFD|Ã.|Â.|â€|â€™|â€“|â€”|Å.|Ä.|Ð.|Ñ.)/;
const PLACEHOLDER = /(?:lorem ipsum|\bTODO\b|\bTBD\b|undefined|null|\[object Object\]|test article|draft only|tekst će biti dodan|content coming soon)/i;

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-news-quality': VERSION
  }
});

const kv = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
const nowIso = () => new Date().toISOString();
const text = value => String(value || '').trim();
const words = value => text(value).split(/\s+/).filter(Boolean).length;
const normalise = value => text(value).toLowerCase();

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

function isAutomaticArticle(item) {
  const id = normalise(item?.id);
  const source = normalise(item?.source);
  return id.startsWith('auto-') || source.includes('intelligence desk') || source.includes('auto editor');
}

function languageScore(value, language) {
  const body = ` ${normalise(value).replace(/[^a-zčćžšđ\s]/g, ' ')} `;
  const patterns = language === 'hr'
    ? [' je ', ' su ', ' za ', ' na ', ' u ', ' od ', ' koji ', ' kako ', ' tržišt', ' poslov', ' europs', ' ulaganj', ' gospodar']
    : [' the ', ' and ', ' of ', ' to ', ' in ', ' for ', ' with ', ' market', ' business', ' technology', ' investment', ' economy'];
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
    if (!text(item.slug)) reasons.push('missing_slug');
    if (titleHr.length < 12 || titleHr.length > 190) reasons.push('invalid_hr_title');
    if (titleEn.length < 12 || titleEn.length > 190) reasons.push('invalid_en_title');
    if (summaryHr.length < 70) reasons.push('short_hr_summary');
    if (summaryEn.length < 70) reasons.push('short_en_summary');
    if (hrWords < 500 || hrWords > 1500) reasons.push(`invalid_hr_length_${hrWords}`);
    if (enWords < 500 || enWords > 1500) reasons.push(`invalid_en_length_${enWords}`);
    if (languageScore(bodyHr, 'hr') < 14) reasons.push('hr_language_quality');
    if (languageScore(bodyEn, 'en') < 14) reasons.push('en_language_quality');
    if (repeatedSentenceRatio(bodyHr) > 0.2) reasons.push('hr_repetition');
    if (repeatedSentenceRatio(bodyEn) > 0.2) reasons.push('en_repetition');
    if (!Array.isArray(item.sources) || !item.sources.some(source => /^https?:\/\//i.test(String(source?.url || '')))) {
      reasons.push('missing_sources');
    }
    if (!/^https?:\/\//i.test(String(item.image || '')) && !String(item.image || '').startsWith('/')) {
      reasons.push('missing_image');
    }
  }

  return reasons;
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
  const acceptedIds = new Set();
  const removedIds = new Set();
  const removedUrls = new Set();

  for (const key of PUBLICATION_KEYS) {
    const source = await readList(env, key);
    const output = [];
    const localSeen = new Set();

    for (const item of source) {
      const id = identity(item);
      const reasons = qualityReasons(item);
      if (!id) reasons.push('missing_identity');
      if (id && localSeen.has(id)) reasons.push('duplicate');

      if (reasons.length) {
        removed.push({ key, removedAt: nowIso(), reasons, item });
        if (id) removedIds.add(id);
        [item?.canonical, item?.publicUrl, item?.hrUrl, item?.enUrl].filter(Boolean).forEach(url => removedUrls.add(normalise(url)));
        continue;
      }

      localSeen.add(id);
      acceptedIds.add(id);
      output.push(item);
    }

    lists[key] = { before: source.length, after: output.length };
    await writeList(env, key, output, 500);
  }

  const news = await readList(env, 'data:news:items');
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
      sourcesRequired: true,
      imageRequired: true,
      mojibakeRejected: true,
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

async function handle(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/data/content-quality-status.json') {
    return json({
      ok: true,
      version: VERSION,
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

  if (shouldClean(path, request.method)) await cleanPublications(env, false);
  return core.fetch(request, env, ctx);
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
