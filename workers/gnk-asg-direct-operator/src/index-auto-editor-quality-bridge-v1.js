import app from './index-auto-editor-localization-v1.js';
import {
  cleanPublications,
  contentQualityStatus,
  publicationSitemap,
  repairHtmlResponse,
  stableJsonPaths,
  stableJsonResponse
} from './publication-quality-core-v6.js';

const VERSION = 'GNK_ASG_AUTO_EDITOR_QUALITY_BRIDGE_V3_20260625';
const AUTHOR = 'Nermin Sefić';
const PUBLIC_HTML_PREFIXES = [
  '/objave', '/publications', '/vijesti', '/news', '/trzista', '/markets',
  '/assistant', '/en/assistant', '/downloads', '/en/downloads', '/visual-index',
  '/contact', '/en/contact', '/legal', '/en/legal', '/status-automatizacije', '/automation-status'
];

const text = value => String(value || '').trim();
const store = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
const nowIso = () => new Date().toISOString();

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-quality-bridge': VERSION,
    'x-content-type-options': 'nosniff'
  }
});

async function readJson(env, key, fallback = null) {
  const kv = store(env);
  if (!kv) return fallback;
  try {
    const raw = await kv.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(env, key, value) {
  const kv = store(env);
  if (!kv) return false;
  await kv.put(key, JSON.stringify(value, null, 2));
  return true;
}

async function readList(env, key) {
  const value = await readJson(env, key, []);
  return Array.isArray(value) ? value : [];
}

async function writeList(env, key, value, max = 500) {
  return writeJson(env, key, (Array.isArray(value) ? value : []).slice(0, max));
}

function normalizeSources(value) {
  const sourceList = Array.isArray(value) ? value : [];
  const seen = new Set();
  return sourceList
    .map(source => {
      if (typeof source === 'string') {
        const url = text(source);
        return /^https?:\/\//i.test(url) ? { url } : null;
      }
      if (source && typeof source === 'object') {
        const url = text(source.url || source.sourceUrl || source.href);
        return /^https?:\/\//i.test(url) ? { ...source, url } : null;
      }
      return null;
    })
    .filter(Boolean)
    .filter(source => {
      const key = source.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function repairArticle(article) {
  if (!article || typeof article !== 'object') return null;
  const slug = text(article.slug);
  const canonical = text(article.canonical) || (slug ? `https://gnk-asg.hr/objave/${slug}/` : '');
  const titleHr = text(article.titleHr || article.title);
  const titleEn = text(article.titleEn);
  const summaryHr = text(article.summaryHr || article.summary);
  const summaryEn = text(article.summaryEn);
  const currentSeo = article.seo && typeof article.seo === 'object' ? article.seo : {};

  return {
    ...article,
    author: AUTHOR,
    canonical,
    status: 'published',
    approvedForPublic: true,
    sources: normalizeSources(article.sources),
    updatedAt: nowIso(),
    seo: {
      ...currentSeo,
      author: AUTHOR,
      titleHr: text(currentSeo.titleHr || currentSeo.title || titleHr),
      titleEn: text(currentSeo.titleEn || titleEn),
      descriptionHr: text(currentSeo.descriptionHr || currentSeo.description || summaryHr),
      descriptionEn: text(currentSeo.descriptionEn || summaryEn)
    }
  };
}

async function persistArticle(env, article) {
  const repaired = repairArticle(article);
  if (!repaired) throw new Error('article_missing');
  if (!text(repaired.id)) throw new Error('article_id_missing');
  if (!text(repaired.slug)) throw new Error('article_slug_missing');
  if (!repaired.sources.length) throw new Error('valid_sources_missing');

  const [approved, articles, news, history, last] = await Promise.all([
    readList(env, 'publish:approved'),
    readList(env, 'data:articles:items'),
    readList(env, 'data:news:items'),
    readList(env, 'auto-editor:history'),
    readJson(env, 'auto-editor:last', null)
  ]);

  const sameArticle = item =>
    text(item?.id) === text(repaired.id) ||
    text(item?.slug) === text(repaired.slug);
  const publishedAt = repaired.publishedAt || repaired.published_at || nowIso();

  const teaser = {
    id: `news-${repaired.id}`,
    kind: 'news',
    title: repaired.titleHr || repaired.title,
    summary: repaired.summaryHr || repaired.summary,
    url: repaired.canonical,
    sourceUrl: repaired.canonical,
    source: 'GNK ASG Intelligence Desk',
    category: repaired.category || 'business',
    group: repaired.category || 'business',
    region: repaired.region || 'world',
    image: repaired.image,
    publishedAt,
    published_at: publishedAt,
    status: 'published'
  };

  const historyEntry = {
    articleId: repaired.id,
    title: repaired.titleHr || repaired.title,
    slug: repaired.slug,
    sourceUrl: repaired.sourceUrl || '',
    publishedAt,
    wordCountHr: repaired.wordCountHr || 0,
    wordCountEn: repaired.wordCountEn || 0
  };

  await Promise.all([
    writeList(env, 'publish:approved', [repaired, ...approved.filter(item => !sameArticle(item))]),
    writeList(env, 'data:articles:items', [repaired, ...articles.filter(item => !sameArticle(item))]),
    writeList(env, 'data:news:items', [
      teaser,
      ...news.filter(item => text(item?.id) !== teaser.id && text(item?.url) !== repaired.canonical)
    ]),
    writeList(env, 'auto-editor:history', [
      historyEntry,
      ...history.filter(item => text(item?.articleId) !== text(repaired.id))
    ]),
    writeJson(env, `article:${repaired.id}`, repaired)
  ]);

  if (last && text(last?.article?.id) === text(repaired.id)) {
    await writeJson(env, 'auto-editor:last', {
      ...last,
      ok: true,
      article: repaired,
      qualityBridgeAt: nowIso(),
      qualityBridgeVersion: VERSION
    });
  }

  return repaired;
}

async function intercept(request, env, ctx) {
  const response = await app.fetch(request, env, ctx);
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return new Response(raw, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  const article = data?.article || data?.editor?.article || data?.localization?.article || null;
  if (!article || data?.ok === false) return json(data, response.status);

  try {
    const repaired = await persistArticle(env, article);
    if (data.article) data.article = repaired;
    if (data.editor?.article) data.editor.article = repaired;
    if (data.localization?.article) data.localization.article = repaired;
    const quality = await cleanPublications(env, true);
    data.qualityBridge = {
      ok: true,
      version: VERSION,
      sourceCount: repaired.sources.length,
      author: repaired.author,
      quality
    };
    data.ok = true;
    return json(data, response.ok ? response.status : 200);
  } catch (error) {
    return json({
      ...data,
      ok: false,
      error: text(error?.message || error),
      qualityBridgeVersion: VERSION
    }, 500);
  }
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

async function handle(request, env, ctx) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

  if (path === '/data/content-quality-status.json') {
    return json(await contentQualityStatus(env));
  }
  if (path === '/sitemap-objave.xml') return publicationSitemap(env, false);
  if (path === '/image-sitemap-objave.xml') return publicationSitemap(env, true);

  if (
    request.method === 'POST' &&
    (path === '/operator/auto-editor/run' || path === '/operator/news-automation/run')
  ) {
    return intercept(request, env, ctx);
  }

  if (shouldClean(path, request.method)) await cleanPublications(env, false);

  const response = await app.fetch(request, env, ctx);
  if (stableJsonPaths.has(path)) return stableJsonResponse(response, path);
  if ((request.method === 'GET' || request.method === 'HEAD') && isPublicHtml(path) && path !== '/' && path !== '/en') {
    return repairHtmlResponse(response);
  }
  return response;
}

export default {
  fetch: handle,

  async scheduled(event, env, ctx) {
    const task = (async () => {
      const upstream = typeof app.scheduled === 'function'
        ? await app.scheduled(event, env, {})
        : null;

      const last = await readJson(env, 'auto-editor:last', null);
      let repaired = null;
      if (last?.ok && last?.article) repaired = await persistArticle(env, last.article);
      const quality = await cleanPublications(env, true);

      const result = {
        ok: upstream?.ok !== false && (!last?.article || Boolean(repaired)) && quality.ok !== false,
        version: VERSION,
        cron: event?.cron || '',
        upstream,
        quality,
        repairedArticleId: repaired?.id || null,
        sourceCount: repaired?.sources?.length || 0,
        finishedAt: nowIso()
      };

      await writeJson(env, 'automation:quality-bridge:scheduled:last', result);
      return result;
    })();

    if (ctx?.waitUntil) {
      ctx.waitUntil(task);
      return;
    }
    return task;
  },

  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};
