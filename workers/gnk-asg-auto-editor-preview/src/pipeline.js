import { imageObjectSchema, selectEditorialImage } from '../../../packages/editorial/image-selector.mjs';

const DRAFTS_KEY = 'auto-editor:v2:drafts';
const USAGE_KEY = 'auto-editor:v2:image-usage';
const NEWS_KEY = 'data:news.json';
const MARKET_KEY = 'data:market.json';
const CATALOG_KEYS = [
  'data:visual_gallery.json',
  'data:generated-gallery-30.json',
  'data:auto-editor-image-catalog.json'
];

export async function generateEditorialDraft(env, options = {}) {
  const store = storage(env);
  if (!store) return blocked('storage_missing');

  const now = new Date(options.now || Date.now());
  const drafts = await readJson(store, DRAFTS_KEY, []);
  const news = await readJson(store, NEWS_KEY, null);
  const market = await readJson(store, MARKET_KEY, null);
  const topic = selectTopic({ news, market, drafts, now });
  if (!topic) return blocked('source_topic_missing');

  const generator = options.generate || (prompt => generateWithWorkersAi(env, prompt));
  if (typeof generator !== 'function') return blocked('ai_generator_missing');

  const prompt = buildPrompt(topic, now);
  let generated;
  try {
    generated = await generator(prompt, { topic, now });
  } catch (error) {
    return {
      ok: false,
      blocked: true,
      reason: 'ai_generation_failed',
      error: String(error?.message || error),
      topic
    };
  }

  const parsed = normalizeGenerated(generated, topic);
  const validation = validateGenerated(parsed);
  if (!validation.ok) {
    return {
      ok: false,
      blocked: true,
      reason: 'article_validation_failed',
      validation,
      topic
    };
  }

  const catalogs = await Promise.all(CATALOG_KEYS.map(key => readJson(store, key, [])));
  const usageLog = await readJson(store, USAGE_KEY, []);
  const articleForImage = {
    title: parsed.hr.title,
    summary: parsed.hr.summary,
    category: parsed.category,
    keywords: parsed.keywords,
    topics: [topic.title, topic.source]
  };
  const image = selectEditorialImage(articleForImage, catalogs, {
    usageLog,
    preventReuseDays: 7,
    minimumWidth: 1200,
    fallback: 'https://gnk-asg.hr/assets/gnk-asg-social-card.png'
  });

  const slug = uniqueSlug(parsed.hr.title, drafts, now);
  const createdAt = now.toISOString();
  const canonical = `/objave/${slug}/`;
  const enPath = `/publications/${slug}/`;
  const sensitive = isSensitive(`${parsed.hr.title} ${parsed.hr.body} ${parsed.hr.conclusion}`);
  const draft = {
    id: `auto-editor-${slug}`,
    slug,
    status: sensitive ? 'held_sensitive' : 'pending_review',
    approved: false,
    autoPublished: false,
    createdAt,
    updatedAt: createdAt,
    scheduledSlot: options.slot || '',
    author: 'Nermin Sefić',
    category: parsed.category,
    keywords: parsed.keywords,
    topic,
    sources: parsed.sources,
    image,
    routes: {
      canonical,
      hr: canonical,
      en: enPath
    },
    hreflang: {
      hr: canonical,
      en: enPath,
      'x-default': canonical
    },
    translations: {
      hr: buildTranslation(parsed.hr, 'hr', canonical, enPath, image),
      en: buildTranslation(parsed.en, 'en', canonical, enPath, image)
    },
    validation,
    sensitive,
    reviewReason: sensitive
      ? 'Sadržaj sadrži osjetljive pravne, financijske, sigurnosne ili medijske pojmove.'
      : 'Preview draft-first politika zahtijeva ljudsku kontrolu prije objave.',
    rollback: {
      sourceKey: DRAFTS_KEY,
      deleteAllowed: false,
      productionTouched: false
    }
  };

  const nextDrafts = [draft, ...(Array.isArray(drafts) ? drafts : []).filter(item => item.id !== draft.id)].slice(0, 200);
  await store.put(DRAFTS_KEY, JSON.stringify(nextDrafts));
  const nextUsage = [{
    imageId: image.id || '',
    imageUrl: image.url || image.src || '',
    articleId: draft.id,
    usedAt: createdAt
  }, ...(Array.isArray(usageLog) ? usageLog : [])].slice(0, 500);
  await store.put(USAGE_KEY, JSON.stringify(nextUsage));

  return {
    ok: true,
    stored: true,
    published: false,
    draft
  };
}

export function selectTopic({ news, market, drafts = [], now = new Date() } = {}) {
  const recentUrls = new Set(
    (Array.isArray(drafts) ? drafts : [])
      .filter(item => Date.parse(item.createdAt || '') >= new Date(now).getTime() - 7 * 86400000)
      .flatMap(item => item.sources || [])
      .map(source => source.url)
      .filter(Boolean)
  );

  const candidates = (Array.isArray(news?.items) ? news.items : [])
    .filter(item => item?.title && /^https?:\/\//i.test(item?.url || ''))
    .filter(item => !recentUrls.has(item.url))
    .map(item => ({
      kind: 'news',
      title: String(item.title).trim(),
      summary: String(item.summary || '').trim(),
      url: item.url,
      source: item.source || 'Javni izvor',
      publishedAt: item.publishedAt || news.updatedAt || '',
      category: mapCategory(item.category, item.title),
      score: topicScore(item, now)
    }));

  if (market?.crypto?.some(item => item.priceEur != null)) {
    const live = market.crypto.filter(item => item.priceEur != null);
    candidates.push({
      kind: 'market',
      title: 'Digitalna imovina i tržišni pokazatelji u europskom poslovnom kontekstu',
      summary: live.map(item => `${item.symbol}: ${item.priceEur} EUR`).join('; '),
      url: 'https://gnk-asg.hr/trzista/',
      source: 'GNK ASG Digital Exchange Monitor',
      publishedAt: market.sourceUpdatedAt || market.updatedAt || '',
      category: 'Tržišta',
      score: 35
    });
  }

  return candidates.sort((a, b) => b.score - a.score || String(b.publishedAt).localeCompare(String(a.publishedAt)))[0] || null;
}

export function buildPrompt(topic, now = new Date()) {
  return [
    'Pripremi jednu vlastitu uredničku analizu GNK ASG-a u strogo strukturiranom JSON formatu.',
    'Ne izmišljaj datume, brojke, citate, osobe ni tvrdnje izvan dostavljenog izvora.',
    'Obje jezične verzije moraju obrađivati istu temu i iste činjenice.',
    'Svaka verzija mora imati najmanje 500 riječi, jasan uvod, objašnjenje zašto je tema važna i vlastiti zaključak.',
    'Autor je Nermin Sefić. Sadržaj nije pravni ni financijski savjet.',
    `Vrijeme pripreme: ${new Date(now).toISOString()}`,
    `Kategorija: ${topic.category}`,
    `Naslov izvora: ${topic.title}`,
    `Sažetak izvora: ${topic.summary}`,
    `Izvor: ${topic.source}`,
    `URL izvora: ${topic.url}`,
    'Vrati samo JSON s poljima: category, keywords, sources, hr i en.',
    'hr i en moraju sadržavati: title, summary, body, whyItMatters i conclusion.',
    'sources mora biti niz objekata s title i url.'
  ].join('\n');
}

export function validateGenerated(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return { ok: false, errors: ['missing_object'] };
  if (!value.category) errors.push('missing_category');
  if (!Array.isArray(value.sources) || !value.sources.some(source => source?.title && /^https?:\/\//i.test(source?.url || ''))) {
    errors.push('missing_valid_source');
  }
  for (const lang of ['hr', 'en']) {
    const item = value[lang];
    if (!item?.title) errors.push(`${lang}_missing_title`);
    if (!item?.summary) errors.push(`${lang}_missing_summary`);
    if (!item?.whyItMatters) errors.push(`${lang}_missing_why_it_matters`);
    if (!item?.conclusion) errors.push(`${lang}_missing_conclusion`);
    const words = wordCount([item?.body, item?.whyItMatters, item?.conclusion].filter(Boolean).join(' '));
    if (words < 500) errors.push(`${lang}_minimum_500_words_not_met:${words}`);
  }
  return {
    ok: errors.length === 0,
    errors,
    wordCountHr: wordCount([value.hr?.body, value.hr?.whyItMatters, value.hr?.conclusion].filter(Boolean).join(' ')),
    wordCountEn: wordCount([value.en?.body, value.en?.whyItMatters, value.en?.conclusion].filter(Boolean).join(' '))
  };
}

function normalizeGenerated(generated, topic) {
  let value = generated;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch {
      const match = value.match(/\{[\s\S]*\}/);
      try { value = match ? JSON.parse(match[0]) : null; } catch { value = null; }
    }
  }
  if (value?.response && typeof value.response === 'string') return normalizeGenerated(value.response, topic);
  if (!value || typeof value !== 'object') return null;
  const sourceList = Array.isArray(value.sources) ? value.sources : [];
  if (!sourceList.some(source => source?.url === topic.url)) {
    sourceList.unshift({ title: topic.title, url: topic.url, publisher: topic.source });
  }
  return {
    category: String(value.category || topic.category || 'Poslovanje').trim(),
    keywords: [...new Set([
      ...(Array.isArray(value.keywords) ? value.keywords : []),
      'GNK ASG',
      'GNK DINAMO Ltd.',
      'Nermin Sefić'
    ].map(item => String(item || '').trim()).filter(Boolean))].slice(0, 20),
    sources: sourceList.filter(source => source?.title && /^https?:\/\//i.test(source?.url || '')).slice(0, 10),
    hr: normalizeTranslation(value.hr),
    en: normalizeTranslation(value.en)
  };
}

function normalizeTranslation(value = {}) {
  return {
    title: String(value.title || '').trim(),
    summary: String(value.summary || '').trim(),
    body: String(value.body || '').trim(),
    whyItMatters: String(value.whyItMatters || '').trim(),
    conclusion: String(value.conclusion || '').trim()
  };
}

function buildTranslation(value, lang, canonical, enPath, image) {
  const body = [value.body, value.whyItMatters, value.conclusion].filter(Boolean).join('\n\n');
  const url = lang === 'hr' ? canonical : enPath;
  return {
    lang,
    title: value.title,
    summary: value.summary,
    body,
    whyItMatters: value.whyItMatters,
    conclusion: value.conclusion,
    wordCount: wordCount(body),
    seo: {
      title: value.title.slice(0, 70),
      description: value.summary.slice(0, 180),
      canonical,
      url,
      hreflangHr: canonical,
      hreflangEn: enPath,
      robots: 'index,follow,max-image-preview:large'
    },
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: value.title,
      description: value.summary,
      author: { '@type': 'Person', name: 'Nermin Sefić' },
      publisher: { '@type': 'Organization', name: 'GNK ASG' },
      image: imageObjectSchema(image, url),
      mainEntityOfPage: url
    }
  };
}

async function generateWithWorkersAi(env, prompt) {
  if (!env.AI?.run) throw new Error('workers_ai_binding_missing');
  const result = await env.AI.run(env.AUTO_EDITOR_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content: 'Ti si urednički AI GNK ASG-a. Pišeš činjenično, profesionalno, dvojezično i vraćaš isključivo valjan JSON.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.25,
    max_tokens: 7000
  });
  return result?.response || result;
}

function mapCategory(category, title) {
  const value = `${category || ''} ${title || ''}`.toLowerCase();
  if (/technology|tech|ai|artificial|software|cloud/.test(value)) return 'AI i tehnologija';
  if (/market|crypto|bitcoin|finance|business/.test(value)) return 'Tržišta';
  if (/sport|football|stadium|club/.test(value)) return 'Sport i ekonomija';
  return 'Poslovanje';
}

function topicScore(item, now) {
  const age = Date.parse(item.publishedAt || '');
  const recency = Number.isFinite(age) ? Math.max(0, 48 - (new Date(now).getTime() - age) / 3600000) : 0;
  const summary = String(item.summary || '').length >= 80 ? 15 : 5;
  const trusted = /BBC|Guardian|GNK ASG/i.test(item.source || '') ? 20 : 10;
  return recency + summary + trusted;
}

function uniqueSlug(title, drafts, now) {
  const base = slugify(title) || 'objava';
  const existing = new Set((Array.isArray(drafts) ? drafts : []).map(item => item.slug));
  if (!existing.has(base)) return base;
  const date = new Date(now).toISOString().slice(0, 10);
  let candidate = `${base}-${date}`;
  let index = 2;
  while (existing.has(candidate)) candidate = `${base}-${date}-${index++}`;
  return candidate;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

function isSensitive(value) {
  return /\b(sud|tužb|kaznen|ugovor|obveza plaćanja|isplata|bankovni račun|porez|osobni podat|incident|hakir|službeno priopćenje|government|court|legal claim|payment instruction|security incident)\b/i.test(String(value || ''));
}

function wordCount(value) {
  return (String(value || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}

function storage(env = {}) {
  return env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || env.CONTENT_KV || null;
}

async function readJson(store, key, fallback) {
  try {
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function blocked(reason) {
  return { ok: false, blocked: true, stored: false, published: false, reason };
}

export const AUTO_EDITOR_KEYS = Object.freeze({
  drafts: DRAFTS_KEY,
  imageUsage: USAGE_KEY,
  news: NEWS_KEY,
  market: MARKET_KEY,
  catalogs: CATALOG_KEYS
});
