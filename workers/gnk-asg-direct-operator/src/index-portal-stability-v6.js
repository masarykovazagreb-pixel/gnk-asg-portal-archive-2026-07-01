import core from './index-publication-news-hotfix.js';

const VERSION = 'GNK_ASG_PORTAL_STABILITY_V6_20260625';
const JSON_DATA_PATHS = new Set([
  '/data/market.json',
  '/data/digital-assets.json',
  '/data/market-indices.json',
  '/data/exchanges.json',
  '/data/stablecoins.json',
  '/data/daily-market-brief.json',
  '/data/status.json'
]);
const PUBLIC_CONTENT_PREFIXES = [
  '/objave', '/publications', '/vijesti', '/news', '/trzista', '/markets',
  '/assistant', '/en/assistant', '/downloads', '/en/downloads', '/visual-index',
  '/contact', '/en/contact', '/legal', '/en/legal'
];
const MOJIBAKE = /(?:Ã.|Â.|â€|â€™|â€“|â€”|Å.|Ä.|�|ΓÇ|┼|╛|╕)/;
const HR_COMMON = new Set('i u na za od do je su se s o kao koji koja koje prema zbog kroz između tržište poslovanje tvrtka društvo razvoj ulaganja europski hrvatska rizik prilika analiza'.split(' '));
const EN_COMMON = new Set('the and of to in for with from is are as by on that this business market company technology government investment risk opportunity analysis'.split(' '));

const nowIso = () => new Date().toISOString();
const kv = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'x-content-type-options': 'nosniff',
      ...extra
    }
  });
}

function xml(value, status = 200) {
  return new Response(value, {
    status,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=900, stale-while-revalidate=3600',
      'x-content-type-options': 'nosniff'
    }
  });
}

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

async function writeList(env, key, value, max = 500) {
  return writeJson(env, key, (Array.isArray(value) ? value : []).slice(0, max));
}

function repairUtf8(value) {
  let text = String(value ?? '').normalize('NFC');
  if (!MOJIBAKE.test(text)) return text;

  try {
    const chars = [...text];
    if (chars.every(char => char.charCodeAt(0) <= 255)) {
      const bytes = Uint8Array.from(chars.map(char => char.charCodeAt(0)));
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (decoded && !MOJIBAKE.test(decoded)) text = decoded;
    }
  } catch {}

  const replacements = new Map([
    ['â€™', '’'], ['â€˜', '‘'], ['â€œ', '“'], ['â€', '”'], ['â€“', '–'], ['â€”', '—'],
    ['Â ', ' '], ['Â', ''], ['Ã„Â', 'č'], ['Ã„Â‡', 'ć'], ['Ã…Â¡', 'š'],
    ['Ã…Â¾', 'ž'], ['Ã„â€˜', 'đ'], ['Ä', 'č'], ['Ä‡', 'ć'], ['Å¡', 'š'],
    ['Å¾', 'ž'], ['Ä‘', 'đ']
  ]);
  for (const [bad, good] of replacements) text = text.split(bad).join(good);
  return text.normalize('NFC');
}

function deepRepair(value) {
  if (typeof value === 'string') return repairUtf8(value);
  if (Array.isArray(value)) return value.map(deepRepair);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepRepair(item)]));
  }
  return value;
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function languageScore(value, dictionary) {
  const tokens = repairUtf8(value).toLowerCase().match(/[a-zčćšžđ]+/g) || [];
  return tokens.reduce((total, token) => total + (dictionary.has(token) ? 1 : 0), 0);
}

function validHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function articleIssues(article) {
  const issues = [];
  const titleHr = repairUtf8(article?.titleHr || article?.title || '');
  const titleEn = repairUtf8(article?.titleEn || '');
  const summaryHr = repairUtf8(article?.summaryHr || article?.summary || '');
  const summaryEn = repairUtf8(article?.summaryEn || '');
  const bodyHr = repairUtf8(article?.bodyHr || article?.body || '');
  const bodyEn = repairUtf8(article?.bodyEn || '');
  const combined = [titleHr, titleEn, summaryHr, summaryEn, bodyHr, bodyEn].join('\n');
  const sources = Array.isArray(article?.sources) ? article.sources : [];

  if (!titleHr || titleHr.length < 18) issues.push('hr_title_missing_or_short');
  if (!titleEn || titleEn.length < 18) issues.push('en_title_missing_or_short');
  if (wordCount(bodyHr) < 500) issues.push('hr_body_below_500_words');
  if (wordCount(bodyEn) < 500) issues.push('en_body_below_500_words');
  if (summaryHr.length < 120) issues.push('hr_summary_too_short');
  if (summaryEn.length < 120) issues.push('en_summary_too_short');
  if (MOJIBAKE.test(combined)) issues.push('mojibake_detected');
  if (sources.filter(item => validHttpUrl(item?.url)).length < 2) issues.push('fewer_than_two_valid_sources');
  if (!validHttpUrl(article?.image)) issues.push('image_url_missing');
  if (!validHttpUrl(article?.canonical)) issues.push('canonical_missing');
  if (!String(article?.slug || '').trim()) issues.push('slug_missing');
  if (!String(article?.seo?.titleHr || article?.seo?.title || '').trim()) issues.push('seo_title_hr_missing');
  if (!String(article?.seo?.titleEn || '').trim()) issues.push('seo_title_en_missing');
  if (!String(article?.seo?.descriptionHr || article?.seo?.description || '').trim()) issues.push('seo_description_hr_missing');
  if (!String(article?.seo?.descriptionEn || '').trim()) issues.push('seo_description_en_missing');
  if (languageScore(bodyHr, HR_COMMON) < 12 || languageScore(bodyHr, EN_COMMON) > languageScore(bodyHr, HR_COMMON) * 1.8) {
    issues.push('hr_language_check_failed');
  }
  if (languageScore(bodyEn, EN_COMMON) < 12) issues.push('en_language_check_failed');
  if (titleHr.toLowerCase() === titleEn.toLowerCase() && languageScore(titleHr, EN_COMMON) > languageScore(titleHr, HR_COMMON)) {
    issues.push('hr_title_fell_back_to_english');
  }
  return [...new Set(issues)];
}

async function imageIssue(article) {
  if (!validHttpUrl(article?.image)) return 'image_url_missing';
  try {
    const response = await fetch(article.image, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'user-agent': 'GNK-ASG-Quality-Gate/1.0' }
    });
    if (!response.ok) return `image_http_${response.status}`;
    const type = response.headers.get('content-type') || '';
    if (type && !type.toLowerCase().startsWith('image/')) return 'image_content_type_invalid';
    return '';
  } catch {
    return 'image_unreachable';
  }
}

async function replaceArticleEverywhere(env, original, repaired) {
  const id = String(original?.id || '');
  const slug = String(original?.slug || '');
  for (const key of ['publish:approved', 'data:articles:items']) {
    const list = await readList(env, key);
    const next = list.map(item => {
      const same = String(item?.id || '') === id || String(item?.slug || '') === slug;
      return same ? repaired : deepRepair(item);
    });
    await writeList(env, key, next);
  }
  if (id) await writeJson(env, `article:${id}`, repaired);
}

async function quarantineLatest(env, reason = 'quality_gate') {
  const approved = await readList(env, 'publish:approved');
  const latestState = await readJson(env, 'auto-editor:last', null);
  const candidate = latestState?.article || approved[0] || null;
  if (!candidate) return { ok: true, checked: false, reason: 'no_candidate' };

  const repaired = deepRepair(candidate);
  const issues = articleIssues(repaired);
  const image = await imageIssue(repaired);
  if (image) issues.push(image);

  if (!issues.length) {
    repaired.quality = { ok: true, version: VERSION, checkedAt: nowIso(), issues: [] };
    if (JSON.stringify(repaired) !== JSON.stringify(candidate)) {
      await replaceArticleEverywhere(env, candidate, repaired);
    }
    await writeJson(env, 'automation:quality:last', repaired.quality);
    return { ok: true, checked: true, articleId: repaired.id, issues: [] };
  }

  const draft = {
    ...repaired,
    status: 'draft',
    approvedForPublic: false,
    quality: { ok: false, version: VERSION, checkedAt: nowIso(), reason, issues: [...new Set(issues)] }
  };
  const id = String(candidate.id || '');
  const slug = String(candidate.slug || '');
  const canonical = String(candidate.canonical || candidate.publicUrl || '');
  const articles = await readList(env, 'data:articles:items');
  const news = await readList(env, 'data:news:items');
  const quarantine = await readList(env, 'auto-editor:quarantine');

  await writeList(env, 'publish:approved', approved.filter(item => String(item?.id || '') !== id && String(item?.slug || '') !== slug));
  await writeList(env, 'data:articles:items', articles.filter(item => String(item?.id || '') !== id && String(item?.slug || '') !== slug));
  await writeList(env, 'data:news:items', news.filter(item => {
    const itemUrl = String(item?.url || item?.sourceUrl || '');
    return itemUrl !== canonical && !itemUrl.includes(`/objave/${slug}/`);
  }));
  await writeList(env, 'auto-editor:quarantine', [draft, ...quarantine.filter(item => String(item?.id || '') !== id)], 500);
  if (id) await writeJson(env, `article:${id}`, draft);
  await writeJson(env, 'automation:quality:last', draft.quality);
  await writeJson(env, 'auto-editor:last', {
    ...(latestState || {}), ok: false, quarantined: true, error: 'quality_gate_failed',
    quality: draft.quality, article: draft, finishedAt: nowIso()
  });
  return { ok: false, checked: true, quarantined: true, articleId: id, issues: draft.quality.issues };
}

async function normalizedDataResponse(request, env, ctx) {
  let response;
  try {
    response = await core.fetch(request, env, ctx);
  } catch (error) {
    return json({ ok: false, status: 'FALLBACK', updatedAt: nowIso(), items: [], error: String(error?.message || error) }, 200);
  }
  let parsed = null;
  try {
    const text = await response.text();
    if (text.trim()) parsed = JSON.parse(text);
  } catch {}
  const base = parsed && typeof parsed === 'object' ? deepRepair(parsed) : {};
  const items = Array.isArray(base) ? base : (Array.isArray(base.items) ? base.items : []);
  const output = Array.isArray(base) ? {
    ok: true, status: items.length ? 'SNAPSHOT' : 'FALLBACK', updatedAt: nowIso(), items
  } : {
    ...base,
    ok: base.ok !== false,
    status: String(base.status || (items.length ? 'SNAPSHOT' : 'FALLBACK')).toUpperCase(),
    updatedAt: base.updatedAt || base.generatedAt || nowIso(),
    items
  };
  if (!['LIVE', 'SNAPSHOT', 'DELAYED', 'FALLBACK', 'ERROR'].includes(output.status)) output.status = 'SNAPSHOT';
  return json(output, 200, { 'x-gnk-asg-data-normalizer': VERSION });
}

async function repairedNewsResponse(request, env, ctx) {
  const response = await core.fetch(request, env, ctx);
  let payload;
  try {
    payload = JSON.parse(await response.text());
  } catch {
    payload = { ok: false, status: 'FALLBACK', updatedAt: nowIso(), items: [], error: 'invalid_news_json' };
  }
  payload = deepRepair(payload);
  const items = (Array.isArray(payload) ? payload : payload.items || [])
    .filter(item => item && String(item.title || '').trim())
    .filter(item => !MOJIBAKE.test(JSON.stringify(item)));
  const output = Array.isArray(payload) ? { ok: true, status: items.length ? 'LIVE' : 'FALLBACK', updatedAt: nowIso(), items } : {
    ...payload, ok: payload.ok !== false, status: payload.status || (items.length ? 'LIVE' : 'FALLBACK'),
    updatedAt: payload.updatedAt || nowIso(), items
  };
  return json(output, 200, { 'x-gnk-asg-news-repair': VERSION });
}

function publicHeader(english) {
  const links = english ? [
    ['Home', '/en/'], ['Profile', '/en/#profil'], ['Financials', '/en/#financije'],
    ['Markets', '/markets/'], ['Publications', '/publications/'], ['News', '/news/'],
    ['PDF / Media', '/en/downloads/'], ['Gallery', '/visual-index/'], ['AI Help', '/en/assistant/'],
    ['Contact', '/en/contact/'], ['Legal', '/en/legal/']
  ] : [
    ['Početna', '/'], ['Profil', '/#profil'], ['Financije', '/#financije'],
    ['Tržišta', '/trzista/'], ['Objave', '/objave/'], ['Vijesti', '/vijesti/'],
    ['PDF / Media', '/downloads/'], ['Galerija', '/visual-index/'], ['AI pomoć', '/assistant/'],
    ['Kontakt', '/contact/'], ['Legal', '/legal/']
  ];
  const rendered = links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('');
  return `<header class="gnk-content-header"><a class="gnk-content-brand" href="${english ? '/en/' : '/'}">GNK ASG</a><nav aria-label="${english ? 'Main navigation' : 'Glavna navigacija'}">${rendered}<a role="link" tabindex="0" data-admin-route="/operator-dashboard/">Admin</a></nav><a class="gnk-language" href="${english ? '/' : '/en/'}">${english ? 'HR' : 'EN'}</a></header>`;
}

function publicFooter(english) {
  return `<footer class="gnk-content-footer"><strong>GNK ASG</strong><span>${english ? 'Public corporate information. Not legal or financial advice.' : 'Javne korporativne informacije. Nije pravni ni financijski savjet.'}</span><a href="${english ? '/automation-status/' : '/status-automatizacije/'}">${english ? 'Automation status' : 'Status automatizacije'}</a></footer>`;
}

function decorateHtmlDocument(source, path) {
  let html = repairUtf8(source);
  const english = path === '/markets' || path.startsWith('/markets/') || path === '/news' || path.startsWith('/news/') || path === '/publications' || path.startsWith('/publications/') || path.startsWith('/en/');
  if (!/<html\b/i.test(html) || !/<body\b/i.test(html)) return html;
  if (!html.includes('/assets/public-content-shell-v1.css')) {
    html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="/assets/public-content-shell-v1.css?v=20260625-v1"><script defer src="/assets/public-content-shell-v1.js?v=20260625-v1"></script></head>');
  }
  if (!/id=["']gnk-asg-premium-header["']/i.test(html) && !/class=["'][^"']*gnk-content-header/i.test(html)) {
    html = html.replace(/<body([^>]*)>/i, `<body$1 class="gnk-content-page">${publicHeader(english)}`);
    html = html.replace(/<\/body>/i, `${publicFooter(english)}</body>`);
  }
  return html;
}

async function decoratedPublicResponse(request, env, ctx, path) {
  const response = await core.fetch(request, env, ctx);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html') || response.status >= 400) return response;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('x-gnk-asg-public-shell', VERSION);
  return new Response(decorateHtmlDocument(await response.text(), path), {
    status: response.status, statusText: response.statusText, headers
  });
}

function automationStatusHtml(data, english) {
  const value = data || {};
  const rows = [
    [english ? 'Version' : 'Verzija', VERSION],
    [english ? 'Schedule' : 'Raspored', english ? 'Every two hours' : 'Svaka dva sata'],
    [english ? 'Last news refresh' : 'Zadnje osvježavanje vijesti', value.lastNewsRefresh?.updatedAt || '—'],
    [english ? 'Last publication attempt' : 'Zadnji pokušaj objave', value.lastAutoEditor?.finishedAt || value.lastAutoEditor?.publishedAt || '—'],
    [english ? 'Last quality check' : 'Zadnja kontrola kvalitete', value.quality?.checkedAt || '—'],
    [english ? 'Quality status' : 'Status kvalitete', value.quality?.ok === false ? 'ERROR' : (value.quality?.ok === true ? 'OK' : 'UNKNOWN')]
  ];
  const body = rows.map(([label, content]) => `<div><span>${esc(label)}</span><strong>${esc(content)}</strong></div>`).join('');
  return `<!doctype html><html lang="${english ? 'en' : 'hr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>${english ? 'Automation status' : 'Status automatizacije'} | GNK ASG</title><link rel="stylesheet" href="/assets/public-content-shell-v1.css?v=20260625-v1"></head><body class="gnk-content-page">${publicHeader(english)}<main class="gnk-status-main"><p class="eyebrow">GNK ASG Intelligence Desk</p><h1>${english ? 'Automation status' : 'Status automatizacije'}</h1><p>${english ? 'Public technical status without tokens, secrets or private operational data.' : 'Javni tehnički status bez tokena, secretsa i privatnih operativnih podataka.'}</p><section class="gnk-status-grid">${body}</section></main>${publicFooter(english)}<script defer src="/assets/public-content-shell-v1.js?v=20260625-v1"></script></body></html>`;
}

async function statusPage(env, english) {
  const data = {
    lastNewsRefresh: await readJson(env, 'automation:news-refresh:last', null),
    lastAutoEditor: await readJson(env, 'auto-editor:last', null),
    quality: await readJson(env, 'automation:quality:last', null)
  };
  return new Response(automationStatusHtml(data, english), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-gnk-asg-status': VERSION }
  });
}

function isoDate(value) {
  const date = new Date(value || Date.now());
  return Number.isFinite(date.getTime()) ? date.toISOString() : nowIso();
}

async function publicationSitemap(env, images = false) {
  const items = await readList(env, 'publish:approved');
  const valid = items.filter(item => item?.approvedForPublic !== false && item?.slug);
  if (images) {
    const entries = valid.filter(item => validHttpUrl(item.image)).map(item => `<url><loc>https://gnk-asg.hr/objave/${esc(item.slug)}/</loc><image:image><image:loc>${esc(item.image)}</image:loc><image:title>${esc(item.titleHr || item.title || '')}</image:title><image:caption>${esc(item.imageAlt || item.summaryHr || '')}</image:caption></image:image></url>`).join('');
    return xml(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries}</urlset>`);
  }
  const base = [
    ['/objave/', nowIso(), 'daily', '0.9'], ['/publications/', nowIso(), 'daily', '0.9'],
    ['/vijesti/', nowIso(), 'hourly', '0.8'], ['/news/', nowIso(), 'hourly', '0.8'],
    ['/status-automatizacije/', nowIso(), 'hourly', '0.5'], ['/automation-status/', nowIso(), 'hourly', '0.5']
  ];
  const entries = base.map(([path, lastmod, freq, priority]) => `<url><loc>https://gnk-asg.hr${path}</loc><lastmod>${isoDate(lastmod)}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`).concat(valid.flatMap(item => {
    const lastmod = isoDate(item.updatedAt || item.publishedAt || item.createdAt);
    return [
      `<url><loc>https://gnk-asg.hr/objave/${esc(item.slug)}/</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      `<url><loc>https://gnk-asg.hr/publications/${esc(item.slug)}/</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    ];
  })).join('');
  return xml(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`);
}

async function mainSitemap(env) {
  const dynamic = await readList(env, 'publish:approved');
  const paths = [
    '/', '/en/', '/trzista/', '/markets/', '/objave/', '/publications/', '/vijesti/', '/news/',
    '/assistant/', '/en/assistant/', '/downloads/', '/en/downloads/', '/visual-index/',
    '/contact/', '/en/contact/', '/legal/', '/en/legal/', '/status-automatizacije/', '/automation-status/'
  ];
  const entries = paths.map(path => `<url><loc>https://gnk-asg.hr${path}</loc><lastmod>${nowIso()}</lastmod><changefreq>${path === '/' || path === '/en/' ? 'daily' : 'weekly'}</changefreq><priority>${path === '/' ? '1.0' : '0.8'}</priority></url>`).concat(dynamic.filter(item => item?.slug && item?.approvedForPublic !== false).flatMap(item => {
    const lastmod = isoDate(item.updatedAt || item.publishedAt || item.createdAt);
    return [
      `<url><loc>https://gnk-asg.hr/objave/${esc(item.slug)}/</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      `<url><loc>https://gnk-asg.hr/publications/${esc(item.slug)}/</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    ];
  })).join('');
  return xml(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`);
}

function isPublicContent(path) {
  return PUBLIC_CONTENT_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

async function handleManualAutomation(request, env, ctx) {
  const response = await core.fetch(request, env, ctx);
  if (response.status >= 400) return response;
  let original = null;
  try { original = JSON.parse(await response.text()); } catch {}
  const quality = await quarantineLatest(env, 'manual_run');
  return json({ ...(original || {}), quality, ok: Boolean(original?.ok !== false && quality.ok) }, quality.ok ? 200 : 422, { 'x-gnk-asg-quality-gate': VERSION });
}

async function fetchHandler(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (url.hostname.toLowerCase() === 'www.gnk-asg.hr') {
    return Response.redirect(`https://gnk-asg.hr${url.pathname}${url.search}`, 301);
  }
  if (path === '/en/markets') return Response.redirect('https://gnk-asg.hr/markets/', 301);
  if (path === '/en/news') return Response.redirect('https://gnk-asg.hr/news/', 301);
  if (path === '/en/publications') return Response.redirect('https://gnk-asg.hr/publications/', 301);
  if (path === '/status-automatizacije') return statusPage(env, false);
  if (path === '/automation-status') return statusPage(env, true);
  if (path === '/sitemap.xml') return mainSitemap(env);
  if (path === '/sitemap-objave.xml') return publicationSitemap(env, false);
  if (path === '/image-sitemap-objave.xml') return publicationSitemap(env, true);
  if (JSON_DATA_PATHS.has(path)) return normalizedDataResponse(request, env, ctx);
  if (path === '/data/news.json') return repairedNewsResponse(request, env, ctx);
  if (request.method === 'POST' && ['/operator/auto-editor/run', '/operator/news-automation/run'].includes(path)) {
    return handleManualAutomation(request, env, ctx);
  }
  if (isPublicContent(path)) return decoratedPublicResponse(request, env, ctx, path);
  return core.fetch(request, env, ctx);
}

export default {
  fetch: fetchHandler,
  async scheduled(event, env, ctx) {
    let captured = null;
    const captureContext = { waitUntil(promise) { captured = Promise.resolve(promise); } };
    const task = (async () => {
      const returned = typeof core.scheduled === 'function' ? await core.scheduled(event, env, captureContext) : null;
      if (captured) await captured;
      else if (returned && typeof returned.then === 'function') await returned;
      const quality = await quarantineLatest(env, 'scheduled_run');
      await writeJson(env, 'automation:portal-stability:last', {
        ok: quality.ok, version: VERSION, cron: event?.cron || '', checkedAt: nowIso(), quality
      });
      return quality;
    })();
    if (ctx?.waitUntil) { ctx.waitUntil(task); return; }
    return task;
  },
  async email(message, env, ctx) {
    if (typeof core.email === 'function') return core.email(message, env, ctx);
  }
};
