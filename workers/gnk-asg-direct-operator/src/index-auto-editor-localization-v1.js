import app from './index-automation-supervisor-v2.js';

const VERSION = 'GNK_ASG_AUTO_EDITOR_LOCALIZATION_V1';
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

const text = value => String(value || '').trim();
const nowIso = () => new Date().toISOString();
const store = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-auto-editor-localization': VERSION,
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
  return writeJson(env, key, value.slice(0, max));
}

function normalize(value) {
  return text(value).toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}

function cleanTitle(value) {
  return text(value)
    .replace(/^['"â€œâ€â€ž]+|['"â€œâ€â€ž]+$/g, '')
    .replace(/\s*\[[^\]]+\]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ä‘/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || `objava-${Date.now()}`;
}

function extractAiText(result) {
  if (!result) return '';
  if (typeof result === 'string') return result;
  return text(
    result.response ||
    result.text ||
    result.result?.response ||
    result.result?.text ||
    result.output_text ||
    result.choices?.[0]?.message?.content ||
    result.choices?.[0]?.text
  );
}

async function translateTitle(env, titleEn) {
  if (!env.AI?.run) throw new Error('AI_binding_missing');

  const prompts = [
    `Prevedi ovaj poslovni naslov na prirodan standardni hrvatski jezik. Vrati samo hrvatski naslov, bez navodnika, oznaka izvora, uglatih zagrada i objaÅ¡njenja:\n${titleEn}`,
    `NapiÅ¡i profesionalan hrvatski novinski naslov koji vjerno prenosi znaÄenje ovog engleskog naslova. Vrati iskljuÄivo naslov na hrvatskom:\n${titleEn}`
  ];

  for (const prompt of prompts) {
    const result = await env.AI.run(MODEL, {
      messages: [
        {
          role: 'system',
          content: 'Ti si profesionalni prevoditelj poslovnih, gospodarskih i tehnoloÅ¡kih naslova na standardni hrvatski jezik.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 320,
      temperature: 0.1
    });

    const candidate = cleanTitle(extractAiText(result));
    if (candidate && normalize(candidate) !== normalize(titleEn)) return candidate;
  }

  throw new Error('croatian_title_not_localized');
}

function uniqueSlug(base, items, currentId) {
  const used = new Set(
    items
      .filter(item => text(item?.id) !== text(currentId))
      .map(item => text(item?.slug))
      .filter(Boolean)
  );
  if (!used.has(base)) return base;
  return `${base.slice(0, 88)}-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 12)}`;
}

async function localizeAndPersist(env, original) {
  if (!original || typeof original !== 'object') {
    throw new Error('generated_article_missing');
  }

  const titleEn = cleanTitle(original.titleEn || original.title || original.titleHr);
  let titleHr = cleanTitle(original.titleHr);

  if (!titleEn) throw new Error('english_title_missing');

  if (!titleHr || normalize(titleHr) === normalize(titleEn)) {
    titleHr = await translateTitle(env, titleEn);
  }

  if (!titleHr || normalize(titleHr) === normalize(titleEn)) {
    throw new Error('croatian_title_not_localized');
  }

  const [approved, articles, news, history] = await Promise.all([
    readList(env, 'publish:approved'),
    readList(env, 'data:articles:items'),
    readList(env, 'data:news:items'),
    readList(env, 'auto-editor:history')
  ]);

  const oldSlug = text(original.slug);
  const newSlug = uniqueSlug(slugify(titleHr), approved, original.id);
  const canonical = `https://gnk-asg.hr/objave/${newSlug}/`;
  const publishedAt = original.publishedAt || original.published_at || nowIso();

  const article = {
    ...original,
    title: titleHr,
    titleHr,
    titleEn,
    slug: newSlug,
    canonical,
    hrUrl: `/objave/${newSlug}/`,
    enUrl: `/publications/${newSlug}/`,
    publicUrl: `/objave/${newSlug}/`,
    author: 'Nermin SefiÄ‡',
    updatedAt: nowIso(),
    seo: {
      ...(original.seo || {}),
      title: cleanTitle(original.seo?.titleHr || titleHr).slice(0, 75),
      titleHr: cleanTitle(original.seo?.titleHr || titleHr).slice(0, 75),
      titleEn: cleanTitle(original.seo?.titleEn || titleEn).slice(0, 75),
      canonical,
      author: 'Nermin SefiÄ‡'
    }
  };

  const sameArticle = item =>
    text(item?.id) === text(article.id) ||
    (oldSlug && text(item?.slug) === oldSlug);

  const approvedNext = [article, ...approved.filter(item => !sameArticle(item))];
  const articlesNext = [article, ...articles.filter(item => !sameArticle(item))];

  const oldCanonical = oldSlug ? `https://gnk-asg.hr/objave/${oldSlug}/` : '';
  const teaser = {
    id: `news-${article.id}`,
    kind: 'news',
    title: titleHr,
    summary: article.summaryHr || article.summary,
    url: canonical,
    sourceUrl: canonical,
    source: 'GNK ASG Intelligence Desk',
    category: article.category || 'business',
    group: article.category || 'business',
    region: article.region || 'world',
    image: article.image,
    publishedAt,
    published_at: publishedAt,
    status: 'published'
  };

  const newsNext = [
    teaser,
    ...news.filter(item =>
      text(item?.id) !== teaser.id &&
      text(item?.url) !== oldCanonical &&
      text(item?.url) !== canonical
    )
  ];

  const historyEntry = {
    articleId: article.id,
    title: titleHr,
    slug: newSlug,
    sourceUrl: article.sourceUrl || '',
    publishedAt,
    wordCountHr: article.wordCountHr || 0,
    wordCountEn: article.wordCountEn || 0
  };

  const historyNext = [
    historyEntry,
    ...history.filter(item =>
      text(item?.articleId) !== text(article.id) &&
      text(item?.slug) !== oldSlug
    )
  ];

  await Promise.all([
    writeList(env, 'publish:approved', approvedNext),
    writeList(env, 'data:articles:items', articlesNext),
    writeList(env, 'data:news:items', newsNext),
    writeList(env, 'auto-editor:history', historyNext),
    writeJson(env, `article:${article.id}`, article)
  ]);

  const last = await readJson(env, 'auto-editor:last', null);
  if (last && text(last?.article?.id) === text(article.id)) {
    await writeJson(env, 'auto-editor:last', {
      ...last,
      ok: true,
      article,
      localizedAt: nowIso(),
      localizationVersion: VERSION
    });
  }

  return {
    ok: true,
    version: VERSION,
    article,
    oldSlug,
    newSlug,
    titleLocalized: true
  };
}

async function interceptEditorResponse(request, env, ctx) {
  const upstream = await app.fetch(request, env, ctx);
  const raw = await upstream.text();
  let data;

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return new Response(raw, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers
    });
  }

  const article = data?.article || data?.editor?.article || null;
  if (!article || data?.ok === false) return json(data, upstream.status);

  try {
    const localized = await localizeAndPersist(env, article);
    if (data.article) data.article = localized.article;
    if (data.editor?.article) data.editor.article = localized.article;
    data.localization = localized;
    data.ok = true;
    return json(data, upstream.status >= 200 && upstream.status < 300 ? upstream.status : 200);
  } catch (error) {
    return json({
      ...data,
      ok: false,
      error: text(error?.message || error),
      localizationVersion: VERSION
    }, 500);
  }
}

async function handle(request, env, ctx) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

  if (
    request.method === 'POST' &&
    (path === '/operator/auto-editor/run' || path === '/operator/news-automation/run')
  ) {
    return interceptEditorResponse(request, env, ctx);
  }

  return app.fetch(request, env, ctx);
}

export default {
  fetch: handle,

  async scheduled(event, env, ctx) {
    const task = (async () => {
      const upstream = typeof app.scheduled === 'function'
        ? await app.scheduled(event, env, {})
        : null;

      const last = await readJson(env, 'auto-editor:last', null);
      let localization = null;

      if (last?.ok && last?.article) {
        const titleHr = cleanTitle(last.article.titleHr);
        const titleEn = cleanTitle(last.article.titleEn || last.article.title);

        if (!titleHr || normalize(titleHr) === normalize(titleEn)) {
          localization = await localizeAndPersist(env, last.article);
        }
      }

      const result = {
        ok: upstream?.ok !== false && (!localization || localization.ok),
        version: VERSION,
        cron: event?.cron || '',
        upstream,
        localization,
        finishedAt: nowIso()
      };

      await writeJson(env, 'automation:localization:scheduled:last', result);
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
