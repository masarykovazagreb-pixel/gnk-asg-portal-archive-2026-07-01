import fs from 'node:fs';
import path from 'node:path';
import {
  SITE,
  PERSON_URL,
  PERSON_ID,
  ORGANIZATION_ID,
  WEBSITE_ID,
  articleAuthorFor,
  isProtectedEditorialItem,
  isVerifiedNerminAuthor,
} from './lib/editorial-attribution-v1.mjs';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';

const ROOT = path.resolve('apps/portal');
const PLAN_DIR = path.join(ROOT, 'data/editorial-plan');
const PLAN = path.join(PLAN_DIR, 'manifest.json');
const HOLDS = path.join(PLAN_DIR, 'publication-holds.json');
const REPORT = path.resolve('artifacts/editorial-scheduled-publish.json');
const AUTHOR_IMAGE = '/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp';
const SOCIAL_CARD = '/assets/gnk-asg-social-card.png';
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const dateLabel = (date) => new Intl.DateTimeFormat('hr-HR', {
  day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Zagreb',
}).format(date);
const writeIfChanged = (file, content) => {
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (before === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
};

function safeSlug(item) {
  const slug = String(item?.slug || '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) throw new Error(`Invalid scheduled editorial slug: ${slug}`);
  return slug;
}
function collectionFor(item) {
  if (item?.type === 'objava') return 'objave';
  if (item?.type === 'komentar') return 'komentari';
  throw new Error(`Unsupported scheduled editorial type: ${item?.type}`);
}
function routeFor(item) {
  const route = `/${collectionFor(item)}/${safeSlug(item)}/`;
  if (isProtectedEditorialRoute(route) || isProtectedEditorialItem({ ...item, path: route })) {
    throw new Error(`Protected editorial route cannot be published by this pipeline: ${route}`);
  }
  return route;
}
function fileFor(item) {
  const target = path.resolve(ROOT, collectionFor(item), safeSlug(item), 'index.html');
  if (!target.startsWith(`${ROOT}${path.sep}`)) throw new Error('Scheduled editorial path escaped the portal root');
  return target;
}
function labelFor(item) { return item.type === 'objava' ? 'Objava' : 'Komentar'; }

function articleImage(item) {
  const candidate = String(item?.image || '').trim();
  try {
    const url = new URL(candidate || SOCIAL_CARD, `${SITE}/`);
    if (url.origin !== SITE || /\/assets\/people\/nermin-sefic\//i.test(url.pathname) || isProtectedEditorialRoute(url.pathname)) {
      throw new Error('Image is not a public editorial asset');
    }
    const localFile = path.resolve(ROOT, url.pathname.replace(/^\/+/, ''));
    if (!localFile.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(localFile)) throw new Error('Image asset does not exist locally');
    return { url: `${SITE}${url.pathname}`, path: url.pathname };
  } catch {
    const localFile = path.join(ROOT, SOCIAL_CARD.replace(/^\/+/, ''));
    if (!fs.existsSync(localFile)) throw new Error(`Required local social-card asset is missing: ${localFile}`);
    return { url: `${SITE}${SOCIAL_CARD}`, path: SOCIAL_CARD };
  }
}

function authorBox(item, author) {
  if (!author) return '';
  if (isVerifiedNerminAuthor(item)) {
    return `<aside class="article-author"><img src="${AUTHOR_IMAGE}" alt="Nermin Sefić — autor teksta ${esc(item.title)}" width="320" height="320" loading="eager"><div><span>Autor</span><strong>Nermin Sefić</strong><a href="${PERSON_URL}">Profil autora</a></div></aside>`;
  }
  return `<aside class="article-author"><div><span>Autor</span><strong>${esc(author.name)}</strong></div></aside>`;
}

function topicalKeywords(item) {
  const source = Array.isArray(item?.keywords) ? item.keywords : [];
  const seen = new Set();
  return source.map((value) => String(value || '').trim())
    .filter((value) => value && !value.startsWith('#') && !/nermin\s+sefi[cć]/i.test(value))
    .filter((value) => {
      const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function articleHtml(item, dateIso) {
  const route = routeFor(item);
  const canonical = `${SITE}${route}`;
  const author = articleAuthorFor(item);
  const image = articleImage(item);
  const authorMeta = author
    ? `<meta name="author" content="${esc(author.name)}">${isVerifiedNerminAuthor(item) ? `<meta property="article:author" content="${PERSON_URL}">` : ''}`
    : '';
  const keywords = topicalKeywords(item);
  const keywordsMeta = keywords.length ? `<meta name="keywords" content="${esc(keywords.join(', '))}">` : '';
  const headings = ['Operativni kontekst', 'Ključna upravljačka odluka', 'Praktična primjena', 'Zaključak'];
  const headingFor = (index) => Array.isArray(item.headings) ? (item.headings[index - 1] || '') : (headings[index - 1] || '');
  const body = (item.paragraphs || []).map((paragraph, index) =>
    `${index && headingFor(index) ? `<h2>${esc(headingFor(index))}</h2>` : ''}<p>${esc(paragraph)}</p>`).join('');
  const links = (item.links || []).map((link) => `<li><a href="${esc(link)}">${esc(link)}</a></li>`).join('');
  const sources = (item.sources || []).length
    ? `<section class="article-sources"><h2>Referentni izvori</h2><ul>${item.sources.map((source) => `<li><a href="${esc(source.url)}" rel="nofollow noopener" target="_blank">${esc(source.name)}</a></li>`).join('')}</ul><p>Referentni izvori navedeni su uz objavu radi provjere i konteksta.</p></section>`
    : '';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': item.type === 'komentar' ? 'OpinionNewsArticle' : 'Article',
    '@id': `${canonical}#article`,
    headline: item.title,
    description: item.description || item.summary || '',
    datePublished: dateIso,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    editor: { '@type': 'Person', '@id': PERSON_ID, name: 'Nermin Sefić', url: PERSON_URL },
    publisher: { '@type': 'Organization', '@id': ORGANIZATION_ID, name: 'GNK ASG d.o.o.', url: `${SITE}/` },
    isPartOf: { '@id': WEBSITE_ID },
    image: [image.url],
    articleSection: item.section || undefined,
    keywords: keywords.length ? keywords : undefined,
    inLanguage: 'hr',
  };
  if (author) structuredData.author = author;
  if (item.modifiedAt) structuredData.dateModified = item.modifiedAt;
  const back = item.type === 'objava' ? '/objave/' : '/komentari/';
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(item.seoTitle || item.title)}</title><meta name="description" content="${esc(item.description || item.summary)}">${keywordsMeta}<meta name="editor" content="Nermin Sefić">${authorMeta}<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:locale" content="hr_HR"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="${esc(item.seoTitle || item.title)}"><meta property="og:description" content="${esc(item.description || item.summary)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${image.url}"><meta property="og:image:alt" content="Urednička ilustracija za: ${esc(item.title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(item.seoTitle || item.title)}"><meta name="twitter:description" content="${esc(item.description || item.summary)}"><meta name="twitter:image" content="${image.url}"><script type="application/ld+json">${JSON.stringify(structuredData)}</script><link rel="stylesheet" href="/assets/editorial-content-v2.css?v=20260714-seo-v3"><link rel="stylesheet" href="/assets/public-unified-menu-v6.css?v=20260721-header-fulltransparent-v1"></head><body><header id="gnk-unified-header" data-gnk-unified-shell="v6-static"><div class="inner"><a class="brand" href="/" aria-label="GNK ASG"><img src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG" width="110" height="68" data-gnk-canonical-logo="1"></a><div id="gnk-unified-menu"><div class="actions"><div class="lang"><a href="/" aria-label="Hrvatski" aria-current="page">HR</a><a href="/en/" aria-label="English">EN</a></div><button class="toggle" type="button" aria-expanded="false" aria-controls="gnk-unified-nav">IZBORNIK</button></div><nav id="gnk-unified-nav"></nav></div></div></header><main class="editorial-wrap article"><img class="editorial-logo" src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG"><header class="article-header"><p class="eyebrow">${esc(labelFor(item))} · ${esc(item.section)} · ${dateLabel(new Date(dateIso))}</p><h1>${esc(item.title)}</h1><p class="lead">${esc(item.summary)}</p></header>${authorBox(item, author)}<img class="article-cover" src="${esc(image.path)}" alt="Urednička ilustracija za: ${esc(item.title)}"><article class="article-body">${body}<h2>Povezane teme</h2><ul>${links}</ul>${sources}<p class="editorial-approval"><strong>Urednička odgovornost:</strong> objavu je prije objave odobrio glavni urednik Nermin Sefić.</p></article><a class="article-back" href="${back}">← Povratak</a></main><script src="/assets/app.js?v=20260721-hero-rounded-v1" defer></script></body></html>`;
}
function appendCard(indexPath, item) {
  let html = fs.readFileSync(indexPath, 'utf8');
  const route = routeFor(item);
  if (html.includes(`href="${route}"`)) return false;
  const cardImage = articleImage(item).path;
  const card = `<article class="editorial-card"><img src="${esc(cardImage)}" alt="Urednička ilustracija za: ${esc(item.title)}" title="${esc(item.title)}"><p class="eyebrow">${esc(item.section)}</p><h2>${esc(item.title)}</h2><p>${esc(item.summary)}</p><a href="${route}">Otvori ${item.type === 'objava' ? 'objavu' : 'komentar'} →</a></article>`;
  const gridOpen = /<section\b(?=[^>]*\bclass\s*=\s*["'][^"']*\beditorial-grid\b[^"']*["'])[^>]*>/i.exec(html);
  const gridContentStart = gridOpen ? gridOpen.index + gridOpen[0].length : -1;
  const gridEnd = gridContentStart >= 0 ? html.indexOf('</section>', gridContentStart) : -1;
  if (!gridOpen || gridEnd < 0) throw new Error(`Editorial grid markers not found: ${indexPath}`);
  html = html.slice(0, gridEnd) + card + html.slice(gridEnd);
  return writeIfChanged(indexPath, html);
}
function appendEditorialListingCard(item) {
  const collection = item.type === 'objava' ? 'objave' : item.type === 'komentar' ? 'komentari' : null;
  if (!collection) return false;
  return appendCard(path.join(ROOT, collection, 'index.html'), item);
}
function appendAktualCard(item, dateIso) {
  const file = path.join(ROOT, 'gnk-aktual', 'index.html');
  if (!fs.existsSync(file)) return false;
  const html = fs.readFileSync(file, 'utf8');
  const route = routeFor(item);
  if (html.includes(`href="${route}"`)) return false;
  const marker = '<div class="am-editorial-links" id="amEditorialLinks">';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('AKTUAL editorial links container not found');
  const close = html.indexOf('</div>', start + marker.length);
  if (close < 0) throw new Error('AKTUAL editorial links container is not closed');
  const link = `<a href="${esc(route)}" data-published="${esc(dateIso)}">${esc(item.title)}</a>`;
  return writeIfChanged(file, html.slice(0, start + marker.length) + link + '\n        ' + html.slice(start + marker.length));
}
function appendSitemap(item, date) {
  const file = path.join(ROOT, 'editorial-sitemap.xml');
  let xml = fs.readFileSync(file, 'utf8');
  const url = `${SITE}${routeFor(item)}`;
  if (xml.includes(`<loc>${url}</loc>`)) return false;
  xml = xml.replace('</urlset>', `  <url><loc>${url}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`);
  return writeIfChanged(file, xml);
}
function loadPublicationHolds() {
  if (!fs.existsSync(HOLDS)) return { version: null, active: new Map() };
  const source = JSON.parse(fs.readFileSync(HOLDS, 'utf8'));
  if (!Array.isArray(source.holds)) throw new Error(`Invalid publication holds file: ${HOLDS}`);
  const active = new Map();
  for (const hold of source.holds) {
    if (!hold?.active) continue;
    if (!hold.packageId || typeof hold.packageId !== 'string') throw new Error('Active publication hold lacks packageId');
    if (!hold.reason || String(hold.reason).trim().length < 20) throw new Error(`Publication hold ${hold.packageId} lacks a substantive reason`);
    if (active.has(hold.packageId)) throw new Error(`Duplicate active publication hold: ${hold.packageId}`);
    active.set(hold.packageId, hold);
  }
  return { version: source.version || null, active };
}

if (!fs.existsSync(PLAN)) throw new Error(`Missing plan: ${PLAN}`);
const planSource = fs.readFileSync(PLAN, 'utf8');
const plan = JSON.parse(planSource);
const publicationHolds = loadPublicationHolds();
const packageIds = new Set((plan.packages || []).map((pack) => pack.id));
for (const packageId of publicationHolds.active.keys()) if (!packageIds.has(packageId)) throw new Error(`Publication hold references unknown package: ${packageId}`);
const now = new Date(process.env.EDITORIAL_NOW || Date.now());
const summary = {
  ok: true,
  version: 'GNK_ASG_EDITORIAL_SCHEDULED_PUBLISH_V4_ATTRIBUTION',
  now: now.toISOString(),
  publicationHoldsVersion: publicationHolds.version,
  packages: [],
  published: [],
  held: [],
  publicChanged: false,
  stateChanged: false,
  attributionPolicy: 'registry-gated-author; Nermin-is-editor-not-default-author',
};

for (const pack of plan.packages || []) {
  const items = (pack.files || []).flatMap((file) => JSON.parse(fs.readFileSync(path.join(PLAN_DIR, file), 'utf8')));
  const publishAt = new Date(pack.publishAt);
  if (!Number.isFinite(publishAt.getTime())) throw new Error(`Invalid publishAt for package ${pack.id}`);
  const due = now >= publishAt;
  const already = Boolean(pack.publishedAt);
  const hold = publicationHolds.active.get(pack.id);
  const itemSummary = {
    id: pack.id,
    publishAt: pack.publishAt,
    due,
    alreadyPublished: already,
    publicationHeld: Boolean(hold),
    holdReason: hold?.reason || null,
    published: [],
  };
  if (hold) {
    if (already) throw new Error(`Publication hold ${pack.id} was applied after publication and cannot unpublish content`);
    summary.held.push(pack.id);
    summary.packages.push(itemSummary);
    continue;
  }

  let publishedNow = false;
  if (due && already) {
    for (const item of items) {
      const target = fileFor(item);
      const route = routeFor(item);
      if (!fs.existsSync(target)) {
        if (writeIfChanged(target, articleHtml(item, pack.publishAt))) summary.publicChanged = true;
        itemSummary.published.push(route);
        summary.published.push(route);
      }
    }
  }
  if (due && !already) {
    if (!pack.deployApproved) throw new Error(`Package ${pack.id} lacks deploy approval`);
    const allRoutes = [];
    for (const item of items) {
      const target = fileFor(item);
      const route = routeFor(item);
      allRoutes.push(route);
      if (writeIfChanged(target, articleHtml(item, pack.publishAt))) summary.publicChanged = true;
      itemSummary.published.push(route);
      summary.published.push(route);
    }
    pack.publishedAt = now.toISOString();
    pack.status = 'published';
    pack.publishedRoutes = allRoutes;
    publishedNow = true;
    summary.stateChanged = true;
  }
  const distributionContract = Array.isArray(pack.distribution) && pack.distribution.includes('AKTUAL MEDIA / Komentari');
  if (due && (publishedNow || distributionContract)) {
    for (const item of items) {
      const target = fileFor(item);
      if (!fs.existsSync(target)) throw new Error(`Published editorial route missing: ${routeFor(item)}`);
      if (appendEditorialListingCard(item)) summary.publicChanged = true;
      if (appendAktualCard(item, pack.publishAt)) summary.publicChanged = true;
      if (appendSitemap(item, pack.publishAt.slice(0, 10))) summary.publicChanged = true;
    }
  }
  summary.packages.push(itemSummary);
}

const nextPlan = JSON.stringify(plan, null, 2);
if (nextPlan !== planSource) {
  writeIfChanged(PLAN, nextPlan);
  summary.stateChanged = true;
}
if (summary.publicChanged || summary.stateChanged) writeIfChanged(REPORT, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
