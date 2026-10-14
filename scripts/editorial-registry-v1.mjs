#!/usr/bin/env node
// Canonical inventory for every published GNK ASG editorial item and AKTUAL issue.
/**
 * Scans the published static HTML, rather than the scheduler alone, so content
 * created outside the planner remains discoverable by listings, sitemaps and QA.
 * Run from the repository root:
 *   node scripts/editorial-registry-v1.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { limitSeoDescription } from './lib/seo-description-v1.mjs';

const PORTAL = 'apps/portal';
const PLAN_DIR = join(PORTAL, 'data/editorial-plan');
const OUT = join(PORTAL, 'data/editorial-registry.json');
const SITE = 'https://gnk-asg.hr';

const SECTIONS = [
  { dir: 'objave', collection: 'Objave', route: '/objave/', type: 'objava', language: 'hr' },
  { dir: 'komentari', collection: 'Komentari', route: '/komentari/', type: 'komentar', language: 'hr' },
  { dir: 'analize', collection: 'Analize', route: '/analize/', type: 'analiza', language: 'hr' },
  { dir: 'en/publications', collection: 'Publications', route: '/en/publications/', type: 'objava', language: 'en' },
  { dir: 'en/commentary', collection: 'Commentary', route: '/en/commentary/', type: 'komentar', language: 'en' },
  { dir: 'en/analyses', collection: 'Analyses', route: '/en/analyses/', type: 'analiza', language: 'en' },
  { dir: 'gnk-aktual/kolumne', collection: 'AKTUAL MEDIA Columns', route: '/gnk-aktual/kolumne/', type: 'kolumna', language: 'hr' },
  { dir: 'en/gnk-aktual/columns', collection: 'AKTUAL MEDIA Columns', route: '/en/gnk-aktual/columns/', type: 'kolumna', language: 'en' },
  { dir: 'gnk-aktual/tjedni', collection: 'AKTUAL MEDIA Weekly', route: '/gnk-aktual/tjedni/', type: 'tjednik', language: 'hr' },
  { dir: 'en/gnk-aktual/weekly', collection: 'AKTUAL MEDIA Weekly', route: '/en/gnk-aktual/weekly/', type: 'tjednik', language: 'en' },
];
const BASE_TAGS = ['GNKASG', 'GNKDINAMOLtd', 'NerminSefic', 'BusinessIntelligence'];
const protectedPath = (route) => /(?:^|\/)spt(?:[-/]|$)|\b(?:bank|banks|banking)(?:[-/]|$)|\badria-?bank(?:[-/]|$)/i.test(route);

const unescapeHtml = (input = '') => {
  let value = String(input);
  for (let pass = 0; pass < 6; pass++) {
    const decoded = value
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'")
      .replace(/&#(\d+);/g, (entity, digits) => { const point = Number(digits); return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity; })
      .replace(/&#x([0-9a-f]+);/gi, (entity, hex) => { const point = parseInt(hex, 16); return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity; });
    if (decoded === value) break;
    value = decoded;
  }
  return value;
};
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attrValue = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${escapeRegex(name)}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  return match ? unescapeHtml(match[2]) : '';
};
const visibleNerminByline = (html) => [...html.matchAll(/<(?:div|p|span|aside)\b[^>]*class=["'][^"']*\b(?:article-meta|meta-row|meta|byline|author-box|author-box-name|author-name|article-author|oznaka)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:div|p|span|aside)>/gi)]
  .some((match) => !/\bclass=["'][^"']*\beditorial-author-inline\b/i.test(match[0])
    && /nermin\s+sefi[cć]/i.test(unescapeHtml(match[0].replace(/<[^>]+>/g, ' '))));
const metaValue = (html, key, attr = 'name') => {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (attrValue(match[0], attr).toLowerCase() === key.toLowerCase()) return attrValue(match[0], 'content');
  }
  return '';
};
const DATE_MONTHS = new Map(Object.entries({
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  'siječnja': 1, 'veljače': 2, 'ožujka': 3, 'travnja': 4, 'svibnja': 5, 'lipnja': 6,
  'srpnja': 7, 'kolovoza': 8, 'rujna': 9, 'listopada': 10, 'studenoga': 11, 'prosinca': 12,
}));
const isoDate = (year, month, day) => {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)
    ? ''
    : date.toISOString().slice(0, 10);
};
const parseVisibleDate = (value = '') => {
  const text = unescapeHtml(String(value).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})(?:T[^\s<]+)?\b/);
  if (iso) return isoDate(iso[1], iso[2], iso[3]);
  const localized = text.match(/\b(\d{1,2})\.?\s+([\p{L}]+)\s+(20\d{2})\b/u);
  if (!localized) return '';
  const month = DATE_MONTHS.get(localized[2].toLocaleLowerCase('hr-HR'));
  return month ? isoDate(localized[3], month, localized[1]) : '';
};
const validIsoDate = (value) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}(?:[Tt][^\s]+)?$/.test(value)
  && !Number.isNaN(Date.parse(value));
const sameInstant = (left, right) => validIsoDate(left) && validIsoDate(right)
  && Date.parse(left) === Date.parse(right);
const visiblePublicationDate = (html) => {
  for (const match of html.matchAll(/<(p|div|time)\b(?=[^>]*\bclass=["'][^"']*\b(?:eyebrow|article-meta|meta-row|byline)\b[^"']*["'])[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const block = match[0];
    const time = block.match(/<time\b[^>]*\bdatetime=["']([^"']+)["'][^>]*>/i);
    const date = parseVisibleDate(time?.[1] || block);
    if (date) return date;
  }
  return '';
};
const parseJsonLd = (html) => {
  const output = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { output.push(JSON.parse(match[1])); } catch { /* malformed legacy schema is reported by completeness QA */ }
  }
  return output;
};
const walkObjects = (value, callback) => {
  if (Array.isArray(value)) return value.forEach((item) => walkObjects(item, callback));
  if (!value || typeof value !== 'object') return;
  callback(value);
  Object.values(value).forEach((item) => walkObjects(item, callback));
};
const allImageUrls = (html, schemas) => {
  const values = new Set();
  const add = (value) => {
    if (typeof value === 'string' && value.trim()) values.add(value.trim());
    else if (Array.isArray(value)) value.forEach(add);
    else if (value && typeof value === 'object') add(value.url || value.contentUrl);
  };
  add(metaValue(html, 'og:image', 'property'));
  for (const schema of schemas) walkObjects(schema, (obj) => {
    const type = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
    if (type.some((t) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting', 'CollectionPage'].includes(t))) add(obj.image);
  });
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) add(attrValue(match[0], 'src'));
  return [...values].map((value) => value.startsWith('/') ? `${SITE}${value}` : value);
};

// Scheduled planner inventory. It is useful provenance, but not the publication source of truth.
const planned = new Set();
const plannedAt = {};
if (existsSync(PLAN_DIR)) {
  for (const file of readdirSync(PLAN_DIR)) {
    if (!/^\d{8}.*\.json$/.test(file)) continue;
    try {
      for (const item of JSON.parse(readFileSync(join(PLAN_DIR, file), 'utf8'))) {
        planned.add(item.slug);
        plannedAt[item.slug] = file.slice(0, 8);
      }
    } catch { /* Preserve scanning if an old planning file is malformed. */ }
  }
}

const aktualHome = existsSync(join(PORTAL, 'gnk-aktual/index.html'))
  ? readFileSync(join(PORTAL, 'gnk-aktual/index.html'), 'utf8')
  : '';
const xmlUnescape = (value = '') => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const sitemapUrls = new Set();
for (const sitemap of ['editorial-sitemap.xml', 'sitemap.xml']) {
  const file = join(PORTAL, sitemap);
  if (!existsSync(file)) continue;
  for (const match of readFileSync(file, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.add(xmlUnescape(match[1].trim()));
}
const items = [];
for (const section of SECTIONS) {
  const base = join(PORTAL, section.dir);
  if (!existsSync(base)) continue;
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(base, entry.name, 'index.html');
    if (!existsSync(file)) continue;
    const html = readFileSync(file, 'utf8');
    const routePath = `${section.route}${entry.name}/`;
    const expectedCanonical = `${SITE}${routePath}`;
    const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((match) => match[0])
      .find((tag) => attrValue(tag, 'rel').toLowerCase().split(/\s+/).includes('canonical')) || '';
    const canonical = attrValue(canonicalTag, 'href');

    // Alias and wrapper pages are intentionally excluded: each content item has one canonical owner.
    if (canonical && canonical !== expectedCanonical) continue;

    const schemas = parseJsonLd(html);
    const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
    const seoTitle = unescapeHtml(titleTag.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    const h1Raw = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
    const h1Title = unescapeHtml(h1Raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    let schemaHeadline = '';
    for (const schema of schemas) walkObjects(schema, (obj) => {
      const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
      if (!schemaHeadline && types.some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type))
          && typeof obj.headline === 'string' && obj.headline.trim()) schemaHeadline = obj.headline.trim();
    });
    const titleCandidate = (metaValue(html, 'og:title', 'property') || seoTitle).split(' | ')[0].trim();
    const truncatedByHeading = h1Title && titleCandidate && h1Title.length > titleCandidate.length * 1.25
      && h1Title.toLowerCase().startsWith(titleCandidate.toLowerCase());
    const title = schemaHeadline || ((titleCandidate.length < 10 || truncatedByHeading) ? (h1Title || titleCandidate) : titleCandidate);
    const description = limitSeoDescription(metaValue(html, 'description') || metaValue(html, 'og:description', 'property'));
    const keywords = metaValue(html, 'keywords').split(',').map((keyword) => keyword.trim())
      .filter(Boolean).filter((keyword) => !/(?:nermin|sefi[cć])/i.test(keyword));
    const rawImage = metaValue(html, 'og:image', 'property');
    const image = rawImage ? (rawImage.startsWith('/') ? `${SITE}${rawImage}` : rawImage) : null;
    const imageAlt = metaValue(html, 'og:image:alt', 'property') || metaValue(html, 'twitter:image:alt')
      || [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => attrValue(match[0], 'alt')).find(Boolean) || '';
    const authorText = metaValue(html, 'author') || metaValue(html, 'article:author', 'property');
    const sourceAuthor = /nermin\s+sefi[cć]/i.test(authorText) ? 'Nermin Sefić' : (authorText || null);
    let author = sourceAuthor;
    let published = metaValue(html, 'article:published_time', 'property');
    const modifiedCandidates = [];
    const htmlModified = metaValue(html, 'article:modified_time', 'property');
    if (htmlModified) modifiedCandidates.push({ value: htmlModified, source: 'meta:article:modified_time' });
    let schemaAuthor = false;
    for (const schema of schemas) walkObjects(schema, (obj) => {
      const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
      if (types.some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type))) {
        const a = Array.isArray(obj.author) ? obj.author[0] : obj.author;
        if (a && typeof a === 'object' && /nermin\s+sefi[cć]/i.test(a.name || '')) {
          schemaAuthor = true;
          author = 'Nermin Sefić';
        }
        if (!published) published = obj.datePublished || '';
        if (obj.dateModified) modifiedCandidates.push({ value: obj.dateModified, source: 'jsonld:dateModified' });
      }
    });
    if (!published) {
      const match = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
      if (match) published = match[1];
    }
    if (!published) published = section.type === 'tjednik' ? parseVisibleDate(entry.name) : visiblePublicationDate(html);
    if (!published && section.language === 'hr' && plannedAt[entry.name]) {
      const date = plannedAt[entry.name];
      published = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T08:00:00+02:00`;
    }
    // The previous materializer copied datePublished into dateModified. Keep a
    // modification date only when an explicit source provides one that is both
    // valid and distinct from publication; conflicting sources remain unset.
    const distinctModified = modifiedCandidates.filter((candidate) => validIsoDate(candidate.value)
      && (!validIsoDate(published) || !sameInstant(candidate.value, published)));
    const distinctModifiedByInstant = new Map(distinctModified.map((candidate) => [Date.parse(candidate.value), candidate]));
    const verifiedModified = distinctModifiedByInstant.size === 1
      ? [...distinctModifiedByInstant.values()][0]
      : null;
    const status = metaValue(html, 'robots').toLowerCase().includes('noindex') ? 'held' : 'published';
    const isColumn = section.type === 'kolumna';
    const isWeekly = section.type === 'tjednik';
    const visibleOnComments = section.type === 'komentar';
    const visibleOnPosts = section.type === 'objava';
    const visibleOnAktual = isColumn || isWeekly || aktualHome.includes(`href="${routePath}"`);
    const allImages = allImageUrls(html, schemas);
    // Legacy author metadata and JSON-LD were copied onto unrelated/newsroom pages.
    // Require a visible pre-existing byline plus Article Person schema before retaining Nermin attribution;
    // the materializer's own editorial-author-inline element is deliberately not accepted as evidence.
    const protectedRoute = protectedPath(routePath);
    const hasVisibleNerminByline = visibleNerminByline(html);
    const nerminAuthorshipVerified = author === 'Nermin Sefić' && schemaAuthor && hasVisibleNerminByline
      && (protectedRoute || ['komentar', 'kolumna', 'analiza'].includes(section.type));
    const resolvedAuthor = author === 'Nermin Sefić' && !nerminAuthorshipVerified ? null : author;
    const baseTags = nerminAuthorshipVerified ? BASE_TAGS : BASE_TAGS.filter((tag) => tag !== 'NerminSefic');
    const tags = [...new Set([...baseTags, ...keywords.map((keyword) => keyword.replace(/[^\p{L}\p{N}]/gu, ''))])]
      .filter((tag) => tag.length > 2 && tag.length < 30).slice(0, 12);

    items.push({
      slug: entry.name,
      type: section.type,
      collection: section.collection,
      path: routePath,
      url: canonical || expectedCanonical,
      title,
      seoTitle: seoTitle || title,
      description,
      author: resolvedAuthor,
      authorUrl: resolvedAuthor === 'Nermin Sefić' ? `${SITE}/nermin-sefic/` : null,
      keywords,
      hashtags: tags,
      image,
      imageAlt,
      images: allImages,
      publishedAt: published || null,
      published_at: published || null,
      modifiedAt: verifiedModified?.value || null,
      modifiedAtSource: verifiedModified?.source || null,
      status,
      inPlan: section.language === 'hr' && planned.has(entry.name),
      seoComplete: Boolean(title && description && canonical && image && schemas.length),
      language: section.language,
      visible_on_comments: visibleOnComments,
      visible_on_posts: visibleOnPosts,
      visible_on_aktual: visibleOnAktual,
      visible_on_columns: isColumn,
      visible_on_weekly: isWeekly,
      in_sitemap: sitemapUrls.has(canonical || expectedCanonical),
      authorSchemaVerified: Boolean(nerminAuthorshipVerified),
      authorAttributionBasis: nerminAuthorshipVerified ? 'visible-editorial-byline-and-person-schema' : null,
    });
  }
}

items.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')) || a.path.localeCompare(b.path));

const outsidePlan = items.filter((item) => !item.inPlan);
const incomplete = items.filter((item) => !item.seoComplete);
const registryCore = {
  version: 'GNK_ASG_EDITORIAL_REGISTRY_V2',
  site: SITE,
  total: items.length,
  byType: items.reduce((acc, item) => ((acc[item.type] = (acc[item.type] || 0) + 1), acc), {}),
  inPlan: items.length - outsidePlan.length,
  outsidePlan: outsidePlan.length,
  seoIncomplete: incomplete.length,
  note: 'Kanonicki popis javnih HR/EN objava, komentara, analiza, kolumni i arhiviranih AKTUAL MEDIA Tjednika. Izvor su objavljene HTML stranice; raspored objava je samo dodatna provenijencija.',
  items,
};

let previousRaw = '';
let previous = null;
if (existsSync(OUT)) {
  previousRaw = readFileSync(OUT, 'utf8');
  try { previous = JSON.parse(previousRaw); } catch { previous = null; }
}
const withoutGeneratedAt = (value) => {
  if (!value || typeof value !== 'object') return value;
  const { generatedAt: _generatedAt, ...rest } = value;
  return rest;
};
const substantiveUnchanged = previous
  ? JSON.stringify(withoutGeneratedAt(previous)) === JSON.stringify(registryCore)
  : false;
const generatedAt = substantiveUnchanged && previous?.generatedAt
  ? previous.generatedAt
  : new Date().toISOString();
const registry = { generatedAt, ...registryCore };

mkdirSync(dirname(OUT), { recursive: true });
const nextRaw = JSON.stringify(registry, null, 2) + '\n';
if (nextRaw !== previousRaw) {
  writeFileSync(OUT, nextRaw, 'utf8');
  console.log('zapisano:', OUT);
} else {
  console.log('bez promjene:', OUT);
}
console.log('  ukupno tekstova: ', registry.total, JSON.stringify(registry.byType));
console.log('  u rasporedu:     ', registry.inPlan);
console.log('  izvan rasporeda: ', registry.outsidePlan);
console.log('  nepotpun SEO:    ', registry.seoIncomplete);
if (incomplete.length) {
  for (const item of incomplete.slice(0, 10)) console.log('     ', item.path);
  process.exitCode = 1;
}
