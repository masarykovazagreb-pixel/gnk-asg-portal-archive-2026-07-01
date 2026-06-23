import core from './index-publication-news-hotfix.js';

const VERSION = 'GNK_ASG_PUBLICATION_AUTOMATION_V2';
const RECENT_IMAGE_LIMIT = 30;
const CATALOG = [
  {
    set: 'financije-poslovanje',
    labelHr: 'financije i poslovanje',
    labelEn: 'finance and business',
    keywords: ['financ', 'business', 'econom', 'capital', 'profit', 'bank', 'investment', 'company', 'corporate', 'poslov', 'gospodar', 'ulaganj']
  },
  {
    set: 'tehnologija-ai',
    labelHr: 'tehnologija i umjetna inteligencija',
    labelEn: 'technology and artificial intelligence',
    keywords: ['ai', 'artificial intelligence', 'technology', 'tech', 'software', 'cloud', 'cyber', 'chip', 'automation', 'digital', 'tehnolog', 'umjetn', 'automatiz']
  },
  {
    set: 'globalno-poslovanje',
    labelHr: 'globalno poslovanje',
    labelEn: 'global business',
    keywords: ['global', 'world', 'europe', 'region', 'trade', 'geopolit', 'supply chain', 'international', 'međunarod', 'europs', 'regional']
  },
  {
    set: 'digitalna-imovina-fintech-trzista',
    labelHr: 'digitalna imovina, fintech i tržišta',
    labelEn: 'digital assets, fintech and markets',
    keywords: ['crypto', 'bitcoin', 'fintech', 'payment', 'market', 'stock', 'exchange', 'digital asset', 'burz', 'tržišt', 'kripto', 'plaćanj']
  },
  {
    set: 'infrastruktura-sport-odrzivost',
    labelHr: 'infrastruktura, sport i održivost',
    labelEn: 'infrastructure, sport and sustainability',
    keywords: ['sport', 'football', 'infrastructure', 'energy', 'sustainab', 'green', 'urban', 'climate', 'stadium', 'infrastruktur', 'održiv', 'energet']
  }
].flatMap(group => Array.from({ length: 20 }, (_, index) => {
  const number = String(index + 1).padStart(3, '0');
  return {
    id: `gnk-asg-${group.set}-${number}`,
    set: group.set,
    labelHr: group.labelHr,
    labelEn: group.labelEn,
    keywords: group.keywords,
    src: `/assets/seo-gallery/gnk-asg-${group.set}-${number}.jpg`
  };
}));

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-publication-automation': VERSION
  }
});

const kv = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
const nowIso = () => new Date().toISOString();
const text = value => String(value || '').trim();
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

function randomIndex(length) {
  if (length <= 1) return 0;
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % length;
}

function shuffled(items) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1);
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

function articleSearchText(article) {
  return normalise([
    article?.category,
    article?.region,
    article?.title,
    article?.titleHr,
    article?.titleEn,
    article?.summary,
    article?.summaryHr,
    article?.summaryEn
  ].filter(Boolean).join(' '));
}

function preferredSets(article) {
  const haystack = articleSearchText(article);
  const scores = new Map();
  for (const item of CATALOG) {
    if (scores.has(item.set)) continue;
    const score = item.keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
    scores.set(item.set, score);
  }
  const best = Math.max(...scores.values());
  if (best <= 0) return [];
  return [...scores.entries()].filter(([, score]) => score === best).map(([set]) => set);
}

async function assetExists(env, src) {
  if (!env.ASSETS?.fetch) return true;
  try {
    const response = await env.ASSETS.fetch(new Request(`https://gnk-asg.hr${src}`, { method: 'GET' }));
    try { response.body?.cancel(); } catch {}
    return response.ok && String(response.headers.get('content-type') || '').toLowerCase().startsWith('image/');
  } catch {
    return false;
  }
}

async function chooseImage(env, article) {
  const history = await readList(env, 'auto-editor:image-history');
  const recent = new Set(history.slice(0, RECENT_IMAGE_LIMIT).map(entry => text(entry?.src)));
  const preferred = new Set(preferredSets(article));

  let candidates = CATALOG.filter(item => (!preferred.size || preferred.has(item.set)) && !recent.has(item.src));
  if (!candidates.length) candidates = CATALOG.filter(item => !recent.has(item.src));
  if (!candidates.length) candidates = [...CATALOG];

  for (const candidate of shuffled(candidates).slice(0, 25)) {
    if (await assetExists(env, candidate.src)) return { candidate, history };
  }

  const fallback = CATALOG.find(item => item.src === '/assets/seo-gallery/gnk-asg-financije-poslovanje-001.jpg') || CATALOG[0];
  return { candidate: fallback, history };
}

function replaceByIdentity(list, article) {
  const articleId = text(article?.id);
  const slug = text(article?.slug);
  return list.map(item => {
    if ((articleId && text(item?.id) === articleId) || (slug && text(item?.slug) === slug)) return article;
    return item;
  });
}

async function assignImage(env, articleId = '') {
  const approved = await readList(env, 'publish:approved');
  const articles = await readList(env, 'data:articles:items');
  const target = approved.find(item => articleId && text(item?.id) === articleId) ||
    articles.find(item => articleId && text(item?.id) === articleId) ||
    approved[0] ||
    articles[0];

  if (!target) {
    const result = { ok: false, version: VERSION, error: 'no_article_available', finishedAt: nowIso() };
    await writeJson(env, 'automation:image-selection:last', result);
    return result;
  }

  if (target.imageAssignmentVersion === VERSION && target.image) {
    return { ok: true, version: VERSION, skipped: true, reason: 'already_assigned', articleId: target.id, image: target.image };
  }

  const { candidate, history } = await chooseImage(env, target);
  const updatedAt = nowIso();
  const updated = {
    ...target,
    image: candidate.src,
    imageId: candidate.id,
    imageSet: candidate.set,
    imageAlt: `${target.titleHr || target.title || 'GNK ASG analiza'} — GNK ASG vizualni indeks`,
    imageAltHr: `${target.titleHr || target.title || 'GNK ASG analiza'} — GNK ASG vizualni indeks`,
    imageAltEn: `${target.titleEn || target.title || 'GNK ASG analysis'} — GNK ASG Visual Index`,
    imageCredit: 'GNK ASG Visual Index',
    imageSourceUrl: '/visual-index/',
    imageAssignmentVersion: VERSION,
    updatedAt
  };

  await writeList(env, 'publish:approved', [updated, ...replaceByIdentity(approved, updated).filter(item => text(item?.id) !== text(updated.id))], 500);
  await writeList(env, 'data:articles:items', [updated, ...replaceByIdentity(articles, updated).filter(item => text(item?.id) !== text(updated.id))], 500);
  await writeJson(env, `article:${updated.id}`, updated);

  const news = await readList(env, 'data:news:items');
  const updatedNews = news.map(item => {
    const matchesId = text(item?.id) === `news-${text(updated.id)}`;
    const matchesUrl = text(item?.url) === text(updated.canonical) || text(item?.sourceUrl) === text(updated.canonical);
    return matchesId || matchesUrl ? { ...item, image: candidate.src, imageAlt: updated.imageAlt, imageCredit: updated.imageCredit } : item;
  });
  await writeList(env, 'data:news:items', updatedNews, 500);

  const editorHistory = await readList(env, 'auto-editor:history');
  const patchedEditorHistory = editorHistory.map(entry =>
    text(entry?.articleId) === text(updated.id)
      ? { ...entry, image: candidate.src, imageId: candidate.id, imageSet: candidate.set }
      : entry
  );
  await writeList(env, 'auto-editor:history', patchedEditorHistory, 500);

  const imageHistoryEntry = {
    articleId: updated.id,
    slug: updated.slug,
    src: candidate.src,
    imageId: candidate.id,
    imageSet: candidate.set,
    assignedAt: updatedAt
  };
  await writeList(env, 'auto-editor:image-history', [imageHistoryEntry, ...history.filter(entry => text(entry?.articleId) !== text(updated.id))], 500);

  const result = {
    ok: true,
    version: VERSION,
    articleId: updated.id,
    slug: updated.slug,
    image: candidate.src,
    imageId: candidate.id,
    imageSet: candidate.set,
    recentImageWindow: RECENT_IMAGE_LIMIT,
    catalogSize: CATALOG.length,
    finishedAt: updatedAt
  };
  await writeJson(env, 'automation:image-selection:last', result);
  return result;
}

async function parseJsonResponse(response) {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

async function fetchHandler(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/data/publication-automation-status.json' || path === '/operator/publication-automation/status') {
    return json({
      ok: true,
      version: VERSION,
      schedule: {
        newsRefresh: 'hourly',
        autoEditor: 'every 3 hours',
        timezone: 'UTC cron; public timestamps are ISO 8601'
      },
      imageRotation: {
        catalogSize: CATALOG.length,
        recentImageWindow: RECENT_IMAGE_LIMIT,
        lastAssignment: await readJson(env, 'automation:image-selection:last', null),
        recent: (await readList(env, 'auto-editor:image-history')).slice(0, RECENT_IMAGE_LIMIT)
      },
      lastNewsRefresh: await readJson(env, 'automation:news-refresh:last', null),
      lastAutoEditor: await readJson(env, 'auto-editor:last', null),
      lastScheduledRun: await readJson(env, 'automation:scheduled:last', null),
      lastQualityCheck: await readJson(env, 'quality:publications:last', null)
    });
  }

  if (path === '/operator/publication-image/run') {
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
    if (!authorized(request, env)) return json({ ok: false, error: 'authorization_required' }, 401);
    let body = {};
    try { body = await request.json(); } catch {}
    const result = await assignImage(env, text(body?.articleId));
    return json(result, result.ok ? 200 : 500);
  }

  const response = await core.fetch(request, env, ctx);

  if (
    request.method === 'POST' &&
    (path === '/operator/auto-editor/run' || path === '/operator/news-automation/run') &&
    response.ok
  ) {
    const data = await parseJsonResponse(response);
    const articleId = text(data?.article?.id || data?.editor?.article?.id);
    const imageAssignment = await assignImage(env, articleId);
    return json({ ...data, imageAssignment }, imageAssignment.ok ? response.status : 500);
  }

  return response;
}

export default {
  fetch: fetchHandler,

  async scheduled(event, env, ctx) {
    const task = (async () => {
      const automation = typeof core.scheduled === 'function'
        ? await core.scheduled(event, env, {})
        : null;
      let imageAssignment = null;
      if (automation?.autoEditor?.ok && automation?.autoEditor?.article?.id) {
        imageAssignment = await assignImage(env, automation.autoEditor.article.id);
      }
      const result = {
        ok: automation?.ok !== false && (!imageAssignment || imageAssignment.ok !== false),
        version: VERSION,
        cron: event?.cron || '',
        automation,
        imageAssignment,
        finishedAt: nowIso()
      };
      await writeJson(env, 'automation:publication-v2:last', result);
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
