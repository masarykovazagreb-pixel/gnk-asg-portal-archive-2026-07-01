#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PORTAL = 'apps/portal';
const SITE = 'https://gnk-asg.hr';
const AUTHOR_URL = `${SITE}/nermin-sefic/`;
const REGISTRY_PATH = `${PORTAL}/data/editorial-registry.json`;
const IMAGE_MANIFEST_PATH = `${PORTAL}/data/editorial-image-manifest.json`;
const SITEMAP_PATH = `${PORTAL}/editorial-sitemap.xml`;
const failures = [];
const warnings = [];
const protectedPath = (route) => /(?:^|\/)spt(?:[-/]|$)|\b(?:bank|banks|banking)(?:[-/]|$)|\badria-?bank(?:[-/]|$)/i.test(route);
const articleTypes = new Set(['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting']);
const decodeEntities = (value = '') => String(value)
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'")
  .replace(/&#(\d+);/g, (_all, number) => String.fromCodePoint(Number(number)))
  .replace(/&#x([0-9a-f]+);/gi, (_all, hex) => String.fromCodePoint(parseInt(hex, 16)));
const trimText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const validIsoDate = (value) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}(?:[Tt][^\s]+)?$/.test(value)
  && !Number.isNaN(Date.parse(value));
const sameInstant = (left, right) => validIsoDate(left) && validIsoDate(right)
  && Date.parse(left) === Date.parse(right);
const normalUrl = (value, base = SITE) => {
  if (!value) return '';
  try { return new URL(value, base).href.replace(/#.*$/, ''); } catch { return value; }
};
const localImageFile = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url, SITE);
    if (parsed.origin !== SITE) return '';
    return path.join(PORTAL, decodeURIComponent(parsed.pathname.replace(/^\//, '')));
  } catch { return ''; }
};
function addError(message) { failures.push(message); }
function addWarning(message) { warnings.push(message); }

// A small stateful HTML tokenizer is used rather than tag-regex checks. It
// respects quoted attributes and raw script/style bodies, while JSON-LD is
// parsed by JSON.parse below.
function parseHtml(source) {
  const out = { title: '', h1: [], h2: 0, h3: 0, visibleText: '', metas: [], links: [], images: [], anchors: [], scripts: [], articles: [], tags: [] };
  const stack = [];
  const textFrames = [];
  let i = 0;
  const appendText = (raw) => {
    const text = decodeEntities(raw);
    if (!text) return;
    const current = stack.at(-1);
    if (!current || !['script', 'style', 'noscript', 'template'].includes(current.name)) out.visibleText += `${text} `;
    for (const frame of textFrames) frame.value += text;
  };
  const readTag = (start) => {
    let j = start;
    let quote = '';
    while (j < source.length) {
      const char = source[j];
      if (quote) { if (char === quote) quote = ''; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') return j + 1;
      j++;
    }
    return source.length;
  };
  const parseAttributes = (inside, offset) => {
    const attrs = {};
    let j = offset;
    while (j < inside.length) {
      while (/\s/.test(inside[j] || '')) j++;
      if (!inside[j] || inside[j] === '/' || inside[j] === '>') break;
      const nameStart = j;
      while (j < inside.length && !/[\s=/>]/.test(inside[j])) j++;
      if (j === nameStart) { j++; continue; }
      const name = inside.slice(nameStart, j).toLowerCase();
      while (/\s/.test(inside[j] || '')) j++;
      let value = '';
      if (inside[j] === '=') {
        j++;
        while (/\s/.test(inside[j] || '')) j++;
        if (inside[j] === '"' || inside[j] === "'") {
          const quote = inside[j++];
          const valueStart = j;
          while (j < inside.length && inside[j] !== quote) j++;
          value = inside.slice(valueStart, j);
          if (inside[j] === quote) j++;
        } else {
          const valueStart = j;
          while (j < inside.length && !/[\s>]/.test(inside[j])) j++;
          value = inside.slice(valueStart, j).replace(/\/$/, '');
        }
      }
      if (!(name in attrs)) attrs[name] = decodeEntities(value);
    }
    return attrs;
  };
  const closeStack = (name) => {
    let idx = stack.map((frame) => frame.name).lastIndexOf(name);
    if (idx < 0) return;
    while (stack.length > idx) {
      const closed = stack.pop();
      if (closed.name === 'article') out.articles.push(closed.article);
      if (['h1', 'h2', 'h3', 'title'].includes(closed.name)) {
        const frameIndex = textFrames.lastIndexOf(closed.textFrame);
        if (frameIndex >= 0) textFrames.splice(frameIndex, 1);
        const value = trimText(closed.textFrame?.value);
        if (closed.name === 'title') out.title = value;
        if (closed.name === 'h1' && value) out.h1.push(value);
      }
    }
  };
  const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  while (i < source.length) {
    if (source[i] !== '<') {
      const next = source.indexOf('<', i);
      const end = next < 0 ? source.length : next;
      appendText(source.slice(i, end));
      i = end;
      continue;
    }
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      i = end < 0 ? source.length : end + 3;
      continue;
    }
    const end = readTag(i);
    const token = source.slice(i, end);
    if (/^<!|^<\?/.test(token)) { i = end; continue; }
    const closing = /^<\s*\//.test(token);
    if (closing) {
      const name = token.match(/^<\s*\/\s*([a-z0-9:-]+)/i)?.[1]?.toLowerCase();
      if (name) closeStack(name);
      i = end;
      continue;
    }
    const nameMatch = token.match(/^<\s*([a-z0-9:-]+)/i);
    if (!nameMatch) { i++; continue; }
    const name = nameMatch[1].toLowerCase();
    const attrs = parseAttributes(token, nameMatch[0].length + 1);
    out.tags.push({ name, attrs });
    const frame = { name, attrs, textFrame: null };
    if (name === 'meta') out.metas.push(attrs);
    if (name === 'link') out.links.push(attrs);
    if (name === 'img') {
      out.images.push(attrs);
      for (const parent of stack) if (parent.name === 'article') parent.article.images.push(attrs);
    }
    if (name === 'a') {
      out.anchors.push(attrs);
      for (const parent of stack) if (parent.name === 'article') parent.article.hrefs.push(attrs.href || '');
    }
    if (name === 'article') frame.article = { attrs, images: [], hrefs: [] };
    if (['h1', 'h2', 'h3', 'title'].includes(name)) {
      frame.textFrame = { name, value: '' };
      textFrames.push(frame.textFrame);
      if (name === 'h2') out.h2++;
      if (name === 'h3') out.h3++;
    }
    if (name === 'script') {
      const rawEnd = source.toLowerCase().indexOf('</script', end);
      const content = rawEnd < 0 ? source.slice(end) : source.slice(end, rawEnd);
      out.scripts.push({ attrs, content });
      if ((attrs.type || '').toLowerCase() === 'application/ld+json') {
        try { out.scripts.at(-1).json = JSON.parse(content.trim()); }
        catch (error) { out.scripts.at(-1).jsonError = error.message; }
      }
      const closeEnd = rawEnd < 0 ? source.length : readTag(rawEnd);
      i = closeEnd;
      continue;
    }
    if (name === 'style') {
      const rawEnd = source.toLowerCase().indexOf('</style', end);
      i = rawEnd < 0 ? source.length : readTag(rawEnd);
      continue;
    }
    if (!voidTags.has(name) && !/\/\s*>$/.test(token)) stack.push(frame);
    else if (name === 'article') out.articles.push(frame.article);
    i = end;
  }
  out.visibleText = trimText(out.visibleText);
  return out;
}
function metaValues(parsed, key, attrName = 'name') {
  return parsed.metas.filter((item) => String(item[attrName] || '').toLowerCase() === key.toLowerCase()).map((item) => item.content || '');
}
function metaValue(parsed, key, attrName = 'name') { return metaValues(parsed, key, attrName)[0] || ''; }
function walk(value, fn) {
  if (Array.isArray(value)) return value.forEach((item) => walk(item, fn));
  if (!value || typeof value !== 'object') return;
  fn(value);
  Object.values(value).forEach((item) => walk(item, fn));
}
function typesOf(value) { return (Array.isArray(value?.['@type']) ? value['@type'] : [value?.['@type']]).filter(Boolean); }
function imageUrls(value, output = []) {
  if (typeof value === 'string') { output.push(value); return output; }
  if (Array.isArray(value)) { for (const item of value) imageUrls(item, output); return output; }
  if (value && typeof value === 'object') {
    if (value.url || value.contentUrl) imageUrls(value.url || value.contentUrl, output);
    else for (const item of Object.values(value)) imageUrls(item, output);
  }
  return output;
}
function normalizeLocal(value) { return normalUrl(value, SITE); }
function xmlLocs(file) {
  if (!fs.existsSync(file)) return new Set();
  const text = fs.readFileSync(file, 'utf8');
  return new Set([...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeEntities(match[1].trim())));
}
function fileForRoute(route) { return path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html'); }

if (!fs.existsSync(REGISTRY_PATH)) throw new Error(`Missing editorial registry: ${REGISTRY_PATH}`);
if (!fs.existsSync(IMAGE_MANIFEST_PATH)) throw new Error(`Missing editorial image manifest: ${IMAGE_MANIFEST_PATH}`);
if (!fs.existsSync(SITEMAP_PATH)) throw new Error(`Missing editorial sitemap: ${SITEMAP_PATH}`);
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const imageManifest = JSON.parse(fs.readFileSync(IMAGE_MANIFEST_PATH, 'utf8'));
const manifestByPath = new Map((imageManifest.items || []).map((item) => [item.path, item]));
const sitemap = xmlLocs(SITEMAP_PATH);
const published = (registry.items || []).filter((item) => item.status === 'published');
const canonicalOwners = new Map();
const imageUse = new Map();
const listingConfigs = [
  { file: `${PORTAL}/objave/index.html`, type: 'objava', language: 'hr', prefix: '/objave/' },
  { file: `${PORTAL}/komentari/index.html`, type: 'komentar', language: 'hr', prefix: '/komentari/' },
  { file: `${PORTAL}/analize/index.html`, type: 'analiza', language: 'hr', prefix: '/analize/' },
  { file: `${PORTAL}/en/publications/index.html`, type: 'objava', language: 'en', prefix: '/en/publications/' },
  { file: `${PORTAL}/en/commentary/index.html`, type: 'komentar', language: 'en', prefix: '/en/commentary/' },
  { file: `${PORTAL}/en/analyses/index.html`, type: 'analiza', language: 'en', prefix: '/en/analyses/' },
];
const listingParsed = new Map();
for (const config of listingConfigs) {
  if (!fs.existsSync(config.file)) { addError(`${config.file}: static collection page is missing`); continue; }
  listingParsed.set(config.file, { html: fs.readFileSync(config.file, 'utf8'), parsed: parseHtml(fs.readFileSync(config.file, 'utf8')) });
}
const report = {
  version: 'EDITORIAL_PUBLICATION_COMPLETENESS_AUDIT_V1',
  registryItems: (registry.items || []).length,
  publishedItems: published.length,
  protectedItemsReadOnly: 0,
  auditedItems: 0,
  staticListingCards: 0,
  weeklyIssues: 0,
  errors: failures,
  warnings,
};

if (!Array.isArray(imageManifest.items)) addError('Editorial image manifest items must be an array.');
const uniqueManifestImages = new Set((imageManifest.items || []).map((item) => item.image));
if (uniqueManifestImages.size !== (imageManifest.items || []).length) addError('Editorial image manifest repeats an image path; every canonical original needs a unique image.');
if (imageManifest.total !== (imageManifest.items || []).length) addError(`Editorial image manifest total ${imageManifest.total} does not equal its ${imageManifest.items?.length || 0} records.`);

for (const item of published) {
  if (!item.publishedAt) addError(`${item.path}: registry publishedAt is missing for a published route.`);
  else if (!validIsoDate(item.publishedAt)) addError(`${item.path}: registry publishedAt is not a valid ISO date (${item.publishedAt}).`);
  if (item.modifiedAt) {
    if (!validIsoDate(item.modifiedAt)) addError(`${item.path}: registry modifiedAt is not a valid ISO date (${item.modifiedAt}).`);
    if (!['meta:article:modified_time', 'jsonld:dateModified'].includes(item.modifiedAtSource)) addError(`${item.path}: registry modifiedAt lacks an explicit source.`);
    if (sameInstant(item.modifiedAt, item.publishedAt)) addError(`${item.path}: registry modifiedAt duplicates publishedAt without evidence of a separate modification.`);
  } else if (item.modifiedAtSource) {
    addError(`${item.path}: registry modifiedAtSource exists without a verified modifiedAt value.`);
  }
  const expectedCanonical = `${SITE}${item.path}`;
  if (canonicalOwners.has(expectedCanonical)) addError(`Duplicate canonical URL ${expectedCanonical} (${canonicalOwners.get(expectedCanonical)} and ${item.path}).`);
  else canonicalOwners.set(expectedCanonical, item.path);
  if (!item.url || normalUrl(item.url) !== expectedCanonical) addError(`${item.path}: registry URL is not the route canonical.`);
  if (!item.in_sitemap) addError(`${item.path}: registry in_sitemap is false; do not mark a published route as sitemap-covered until validated.`);
  if (!sitemap.has(expectedCanonical)) addError(`${item.path}: canonical route is absent from editorial-sitemap.xml.`);
  const pagePath = fileForRoute(item.path);
  if (!fs.existsSync(pagePath)) { addError(`${item.path}: published route has no static HTML file.`); continue; }
  const protectedItem = protectedPath(item.path);
  if (protectedItem) { report.protectedItemsReadOnly++; continue; }
  report.auditedItems++;
  const html = fs.readFileSync(pagePath, 'utf8');
  const parsed = parseHtml(html);

  if (parsed.h1.length !== 1) addError(`${item.path}: expected exactly one H1, found ${parsed.h1.length}.`);
  if (!parsed.h2 && parsed.visibleText.length > 4500) addWarning(`${item.path}: long-form page has no H2 section headings; review content structure.`);
  if (!parsed.tags.some((tag) => tag.name === 'nav' && /breadcrumb|krušne mrvice/i.test(tag.attrs['aria-label'] || ''))) addError(`${item.path}: visible breadcrumb navigation is missing.`);
  if (!parsed.title || parsed.title.length < 10) addError(`${item.path}: HTML <title> is missing or too short.`);
  if (!metaValue(parsed, 'description') || metaValue(parsed, 'description').trim().length < 45) addError(`${item.path}: search description is missing or too short.`);
  const canonicalLinks = parsed.links.filter((link) => String(link.rel || '').toLowerCase().split(/\s+/).includes('canonical')).map((link) => link.href || '');
  if (canonicalLinks.length !== 1 || canonicalLinks[0] !== expectedCanonical) addError(`${item.path}: expected one self-canonical ${expectedCanonical}; found ${canonicalLinks.join(', ') || 'none'}.`);
  const robots = metaValue(parsed, 'robots').toLowerCase();
  if (!robots.includes('index') || robots.includes('noindex') || !robots.includes('follow') || !robots.includes('max-image-preview:large')) addError(`${item.path}: robots must allow index/follow and large image previews (found ${robots || 'missing'}).`);
  for (const [key, attrName] of [['og:title','property'],['og:description','property'],['og:url','property'],['og:image','property'],['og:image:alt','property'],['twitter:card','name'],['twitter:title','name'],['twitter:description','name'],['twitter:image','name'],['twitter:image:alt','name']]) {
    if (!metaValue(parsed, key, attrName)) addError(`${item.path}: missing ${attrName}=${key} social metadata.`);
  }
  if (metaValue(parsed, 'twitter:card') !== 'summary_large_image') addError(`${item.path}: twitter:card must be summary_large_image.`);
  if (metaValues(parsed, 'keywords').some((value) => /(?:nermin|sefi[cć])/i.test(value))) addError(`${item.path}: meta keywords contain author-name variants.`);
  if (metaValue(parsed, 'og:url', 'property') !== expectedCanonical) addError(`${item.path}: og:url does not match canonical.`);
  if (item.type !== 'tjednik' && item.publishedAt && String(metaValue(parsed, 'article:published_time', 'property')).slice(0, 10) !== String(item.publishedAt).slice(0, 10)) addError(`${item.path}: article:published_time metadata does not match the registered publication date.`);
  if (item.type !== 'tjednik' && item.modifiedAt && String(metaValue(parsed, 'article:modified_time', 'property')).slice(0, 10) !== String(item.modifiedAt).slice(0, 10)) addError(`${item.path}: article:modified_time metadata does not match the registered modification date.`);
  if (item.type !== 'tjednik' && !item.modifiedAt && metaValue(parsed, 'article:modified_time', 'property')) addError(`${item.path}: article:modified_time is present without a reliably sourced registry modifiedAt.`);

  const isWeeklyArchive = item.type === 'tjednik';
  const articleNodes = [];
  const collectionNodes = [];
  const itemListNodes = [];
  const breadcrumbNodes = [];
  let malformedJsonLd = false;
  for (const script of parsed.scripts.filter((script) => (script.attrs.type || '').toLowerCase() === 'application/ld+json')) {
    if (script.jsonError) { malformedJsonLd = true; continue; }
    walk(script.json, (node) => {
      const types = typesOf(node);
      if (types.some((type) => articleTypes.has(type))) articleNodes.push(node);
      if (types.includes('CollectionPage')) collectionNodes.push(node);
      if (types.includes('ItemList')) itemListNodes.push(node);
      if (types.includes('BreadcrumbList')) breadcrumbNodes.push(node);
    });
  }
  if (malformedJsonLd) addError(`${item.path}: malformed JSON-LD script.`);
  if (!breadcrumbNodes.length) addError(`${item.path}: BreadcrumbList JSON-LD is missing.`);
  if (isWeeklyArchive) {
    if (articleNodes.length) addError(`${item.path}: curated issue should use CollectionPage/ItemList, not be typed as an authored Article.`);
    if (!collectionNodes.length || !itemListNodes.length) addError(`${item.path}: weekly issue requires CollectionPage and ItemList JSON-LD.`);
    if (collectionNodes.length && item.publishedAt) {
      const expectedIssueDate = String(item.publishedAt).slice(0, 10);
      const schemaIssueDate = String(collectionNodes[0].datePublished || '').slice(0, 10);
      if (!schemaIssueDate) addError(`${item.path}: CollectionPage datePublished is missing for the dated weekly issue.`);
      else if (schemaIssueDate !== expectedIssueDate) addError(`${item.path}: CollectionPage datePublished does not match issue_week ${expectedIssueDate}.`);
    }
    const collectionImage = collectionNodes[0] ? imageUrls(collectionNodes[0].image || collectionNodes[0].primaryImageOfPage).map(normalUrl) : [];
    if (!collectionImage.includes(normalUrl(metaValue(parsed, 'og:image', 'property')))) addError(`${item.path}: CollectionPage image does not match its social cover.`);
  } else if (articleNodes.length !== 1) addError(`${item.path}: expected exactly one Article/OpinionNewsArticle JSON-LD entity; found ${articleNodes.length}.`);
  const article = articleNodes[0];
  if (!isWeeklyArchive && !article) addError(`${item.path}: article JSON-LD is missing.`);
  if (!isWeeklyArchive && article) {
    const expectedArticleType = item.type === 'komentar' || item.type === 'kolumna' ? 'OpinionNewsArticle' : null;
    if (expectedArticleType && !typesOf(article).includes(expectedArticleType)) addError(`${item.path}: ${item.type} should use ${expectedArticleType} schema.`);
    if (!article.headline) addError(`${item.path}: schema headline is missing.`);
    if (!article.description) addError(`${item.path}: schema description is missing.`);
    if (item.publishedAt && !article.datePublished) addError(`${item.path}: schema datePublished is missing despite a registered publication date.`);
    else if (item.publishedAt && String(article.datePublished).slice(0, 10) !== String(item.publishedAt).slice(0, 10)) addError(`${item.path}: schema datePublished does not match the registered publication date.`);
    if (item.modifiedAt && !article.dateModified) addError(`${item.path}: schema dateModified is missing despite a registered modification date.`);
    else if (item.modifiedAt && String(article.dateModified).slice(0, 10) !== String(item.modifiedAt).slice(0, 10)) addError(`${item.path}: schema dateModified does not match the registered modification date.`);
    else if (!item.modifiedAt && article.dateModified) addError(`${item.path}: schema dateModified is present without a reliably sourced registry modifiedAt.`);
    const mainUrl = typeof article.mainEntityOfPage === 'string' ? article.mainEntityOfPage : article.mainEntityOfPage?.['@id'];
    if (!mainUrl) addError(`${item.path}: schema mainEntityOfPage is missing.`);
    else if (normalUrl(mainUrl) !== expectedCanonical) addError(`${item.path}: schema mainEntityOfPage differs from canonical.`);
    const schemaImage = imageUrls(article.image).map(normalUrl);
    if (!schemaImage.includes(normalUrl(metaValue(parsed, 'og:image', 'property')))) addError(`${item.path}: schema image differs from the social image.`);
    const schemaAuthor = Array.isArray(article.author) ? article.author[0] : article.author;
    const nermin = item.author === 'Nermin Sefić';
    if (nermin) {
      if (!schemaAuthor || !typesOf(schemaAuthor).includes('Person') || schemaAuthor.name !== 'Nermin Sefić' || normalUrl(schemaAuthor.url) !== AUTHOR_URL) addError(`${item.path}: Nermin author must be a Person linked to ${AUTHOR_URL}.`);
    } else if (schemaAuthor && typesOf(schemaAuthor).includes('Person') && /nermin\s+sefi[cć]/i.test(schemaAuthor.name || '')) {
      addError(`${item.path}: non-Nermin content is incorrectly attributed to Nermin as a Person.`);
    }
    const publisherNode = Array.isArray(article.publisher) ? article.publisher[0] : article.publisher;
    if (!publisherNode || (!typesOf(publisherNode).includes('Organization') && !publisherNode['@id'])) addError(`${item.path}: Article publisher must identify an Organization.`);
  }
  if (!protectedItem) {
    const expectedImage = item.image;
    if (!expectedImage) addError(`${item.path}: primary image URL missing from registry.`);
    const ogImage = metaValue(parsed, 'og:image', 'property');
    if (normalUrl(ogImage) !== normalUrl(expectedImage)) addError(`${item.path}: OG image does not match registry image.`);
    if (normalUrl(metaValue(parsed, 'twitter:image')) !== normalUrl(expectedImage)) addError(`${item.path}: Twitter image does not match registry image.`);
    if (isWeeklyArchive) {
      const cover = parsed.images.find((image) => normalUrl(image.src) === normalUrl(expectedImage));
      if (!cover || !cover.alt || cover.width !== '1200' || cover.height !== '630') addError(`${item.path}: CollectionPage cover must be visible, described and dimensioned.`);
      for (const image of parsed.images) if (!('alt' in image)) addError(`${item.path}: an image is missing its alt attribute.`);
      const localFile = localImageFile(expectedImage);
      if (localFile && !fs.existsSync(localFile)) addError(`${item.path}: weekly cover image file is missing (${localFile}).`);
    } else {
      const cover = parsed.images.find((image) => String(image.class || '').split(/\s+/).includes('article-cover'));
      if (!cover) addError(`${item.path}: primary article-cover image is missing from visible HTML.`);
      else {
        if (!cover.alt || !cover.width || !cover.height) addError(`${item.path}: article cover must have descriptive alt text and explicit dimensions.`);
        if (normalUrl(cover.src) !== normalUrl(expectedImage)) addError(`${item.path}: visible article cover does not match registry image.`);
        if (cover.width !== '1200' || cover.height !== '630') addError(`${item.path}: generated article cover should declare its 1200×630 dimensions.`);
      }
      for (const image of parsed.images) if (!('alt' in image)) addError(`${item.path}: an image is missing its alt attribute.`);
      const localFile = localImageFile(expectedImage);
      if (localFile) {
        if (!fs.existsSync(localFile)) addError(`${item.path}: primary local image file is missing (${localFile}).`);
        else {
          const bytes = fs.readFileSync(localFile);
          if (bytes.length < 128 || bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') addError(`${item.path}: primary generated image is not a readable WebP.`);
        }
      }
      const nerminAuthor = item.author === 'Nermin Sefić' && item.authorSchemaVerified === true && ['komentar', 'kolumna', 'analiza'].includes(item.type);
      if (item.author === 'Nermin Sefić' && !nerminAuthor) addError(`${item.path}: Nermin attribution is outside the approved authored editorial types.`);
      const authorMeta = `${metaValue(parsed, 'author')} ${metaValue(parsed, 'article:author', 'property')}`;
      const relAuthor = parsed.links.some((link) => String(link.rel || '').toLowerCase().split(/\s+/).includes('author') && normalUrl(link.href) === AUTHOR_URL);
      if (nerminAuthor) {
        if (!/nermin\s+sefi[cć]/i.test(metaValue(parsed, 'author')) || !/nermin\s+sefi[cć]/i.test(metaValue(parsed, 'article:author', 'property'))) addError(`${item.path}: verified Nermin authorship requires consistent author metadata.`);
        if (!parsed.anchors.some((anchor) => anchor.href === '/nermin-sefic/' || anchor.href === AUTHOR_URL) && !relAuthor) addError(`${item.path}: visible author-profile link is missing.`);
      } else {
        if (/nermin\s+sefi[cć]/i.test(authorMeta) || relAuthor || /nermin|sefi[cć]/i.test(metaValue(parsed, 'author-image'))) addError(`${item.path}: legacy Nermin author metadata remains on non-Nermin content.`);
        const authorPanels = [...html.matchAll(/<aside\b[^>]*class=["'][^"']*\b(?:article-author|author-box)\b[^"']*["'][^>]*>[\s\S]*?<\/aside>/gi)].map((match) => match[0]);
        if (authorPanels.some((panel) => /nermin\s+sefi[cć]/i.test(panel))) addError(`${item.path}: visible Nermin byline panel remains on non-Nermin content.`);
        const bylineBlocks = [...html.matchAll(/<(?:div|p)\b[^>]*class=["'][^"']*\b(?:article-meta|meta-row|byline|author-meta|article-author)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:div|p)>/gi)].map((match) => match[0]);
        if (bylineBlocks.some((block) => /nermin\s+sefi[cć]/i.test(block))) addError(`${item.path}: visible Nermin name remains in an unverified byline block.`);
        const topicTagBlocks = [...html.matchAll(/<p\b[^>]*class=["'][^"']*\b(?:article-hashtags|article-tags|hashtag-list)\b[^"']*["'][^>]*>[\s\S]*?<\/p>/gi)].map((match) => match[0]);
        if (topicTagBlocks.some((block) => /#(?:NerminSefić|NerminSefic|SefićNermin|SeficNermin)(?=[\s.,;:!?)}\]]|$)/iu.test(block))) addError(`${item.path}: Nermin hashtag remains in an unverified topic-tag block.`);
      }
      const marks = parsed.tags.filter((tag) => tag.attrs['data-author-mark'] === 'nermin-sefic').length;
      if (nerminAuthor && marks !== 1) addError(`${item.path}: expected exactly one canonical Nermin hashtag block, found ${marks}.`);
      if (!nerminAuthor && marks) addError(`${item.path}: Nermin hashtag block appears on non-Nermin content.`);
      if (!parsed.tags.some((tag) => tag.attrs['data-editorial-crosslinks'] !== undefined)) addError(`${item.path}: internal AKTUAL MEDIA cross-links are missing.`);
      const manifest = manifestByPath.get(item.path);
      if (!manifest) addError(`${item.path}: unique local image record is missing from editorial-image-manifest.json.`);
      else if (normalUrl(manifest.image) !== normalUrl(expectedImage)) addError(`${item.path}: image manifest and registry disagree.`);
      if (expectedImage) imageUse.set(expectedImage, (imageUse.get(expectedImage) || 0) + 1);
    }
  }
}

for (const [image, count] of imageUse) if (count > 4) addError(`Editorial image reused across ${count} original texts (limit 4): ${image}`);

for (const config of listingConfigs) {
  const listing = listingParsed.get(config.file);
  if (!listing) continue;
  const expected = published.filter((item) => item.type === config.type && item.language === config.language && item.path.startsWith(config.prefix));
  report.staticListingCards += expected.length;
  const countTags = listing.parsed.tags.filter((tag) => String(tag.attrs.class || '').split(/\s+/).includes('editorial-listing-count'));
  if (countTags.length !== 1) addError(`${config.file}: expected one static listing-count notice, found ${countTags.length}.`);
  for (const item of expected) {
    const matchingCards = listing.parsed.articles.filter((entry) => entry.attrs['data-editorial-route'] === item.path);
    const article = matchingCards[0];
    const linked = listing.parsed.anchors.some((anchor) => anchor.href === item.path);
    if (!linked) addError(`${config.file}: published item missing static listing link ${item.path}.`);
    if (matchingCards.length !== 1) addError(`${config.file}: expected exactly one server-rendered article card for ${item.path}, found ${matchingCards.length}.`);
    else if (!protectedPath(item.path)) {
      const image = manifestByPath.get(item.path);
      if (image && normalUrl(article.images[0]?.src) !== normalUrl(image.image)) addError(`${config.file}: card image mismatch for ${item.path}.`);
    }
  }
  if (listing.parsed.h1.length !== 1) addError(`${config.file}: expected one H1 on the static collection page.`);
  if (listing.html.includes('editorial-latest-index-v1.js')) addError(`${config.file}: dynamic-only latest renderer is still attached; listings must remain static HTML.`);
}

const staticArchivePages = [
  { file: `${PORTAL}/gnk-aktual/kolumne/index.html`, language: 'hr', type: 'kolumna', prefix: '/gnk-aktual/kolumne/' },
  { file: `${PORTAL}/en/gnk-aktual/columns/index.html`, language: 'en', type: 'kolumna', prefix: '/en/gnk-aktual/columns/' },
  { file: `${PORTAL}/gnk-aktual/tjedni/index.html`, language: 'hr', type: 'tjednik', prefix: '/gnk-aktual/tjedni/' },
  { file: `${PORTAL}/en/gnk-aktual/weekly/index.html`, language: 'en', type: 'tjednik', prefix: '/en/gnk-aktual/weekly/' },
];
for (const config of staticArchivePages) {
  if (!fs.existsSync(config.file)) { addError(`${config.file}: static archive index is missing.`); continue; }
  const html = fs.readFileSync(config.file, 'utf8');
  const parsed = parseHtml(html);
  const expected = published.filter((item) => item.type === config.type && item.language === config.language && item.path.startsWith(config.prefix));
  if (parsed.h1.length !== 1) addError(`${config.file}: expected exactly one H1.`);
  for (const item of expected) if (!parsed.anchors.some((anchor) => anchor.href === item.path)) addError(`${config.file}: published ${config.type} archive route is not statically linked: ${item.path}.`);
  if (config.type === 'kolumna') {
    if (html.includes('fetch(') || html.includes('id="columns" class="grid" aria-live="polite"')) addError(`${config.file}: columns hub relies on JS-only fetching/placeholder markup.`);
    const collectionHeadings = parsed.tags.filter((tag) => tag.name === 'h2' && tag.attrs.id === 'columns-heading');
    if (collectionHeadings.length !== 1) addError(`${config.file}: expected one accessible static-list heading, found ${collectionHeadings.length}.`);
    const cards = parsed.articles.filter((article) => expected.some((item) => article.hrefs.includes(item.path)));
    if (cards.length !== expected.length) addError(`${config.file}: expected ${expected.length} static column cards, found ${cards.length}.`);
  } else {
    if (html.includes('aktual-media-weekly-v1.js') || html.includes('Loading weekly selection') || html.includes('Učitavanje tjednog izbora')) addError(`${config.file}: weekly archive index still relies on a JavaScript placeholder.`);
  }
}

const archiveDir = `${PORTAL}/data/aktual-weekly-archives`;
if (fs.existsSync(archiveDir)) {
  for (const file of fs.readdirSync(archiveDir).filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))) {
    const issue = JSON.parse(fs.readFileSync(path.join(archiveDir, file), 'utf8'));
    const week = file.slice(0, 10);
    report.weeklyIssues++;
    if (issue.issue_week !== week) addError(`${file}: stable archive key must use issue_week (${week}), not a publication-date field.`);
    if (issue.issue_date && Number.isNaN(Date.parse(issue.issue_date))) addError(`${file}: issue_date is not a valid date.`);
    const hrRoute = `/gnk-aktual/tjedni/${week}/`;
    const enRoute = `/en/gnk-aktual/weekly/${week}/`;
    if (issue.issue_path_hr !== hrRoute || issue.issue_path_en !== enRoute) addError(`${file}: permanent archive route must derive from issue_week.`);
    const storyRecords = (issue.sections || []).flatMap((section) => section.items || []);
    if (storyRecords.length < 8 || storyRecords.length > 20) addError(`${file}: weekly edition must contain 8–20 selected stories (found ${storyRecords.length}).`);
    if ((issue.counts?.selected_items ?? storyRecords.length) !== storyRecords.length) addError(`${file}: selected_items count differs from the curated story count.`);
    if (!issue.editorial_intro || !issue.editorial_note) addError(`${file}: weekly issue needs an editorial introduction and editorial notes.`);
    const sources = new Set(storyRecords.map((story) => story.source).filter(Boolean));
    if (sources.size < 4) addError(`${file}: weekly issue needs at least four distinct sources (found ${sources.size}).`);
    const storyImages = new Set();
    const storyUrls = new Set();
    for (const story of storyRecords) {
      if (!story.title || !story.summary || !story.url || !story.source || !story.image || !story.imageAlt) addError(`${file}: a selected story is missing title, summary, source, image or alt.`);
      if (storyUrls.has(story.url)) addError(`${file}: duplicate source story ${story.url}.`);
      storyUrls.add(story.url);
      if (story.image_policy === 'licensed-source') {
        if (!story.image_credit || !story.image_rights) addError(`${file}: licensed source image missing documented credit/rights (${story.url}).`);
      } else {
        if (!story.image.startsWith('/assets/editorial/generated/')) addError(`${file}: external image used without documented reuse rights (${story.url}).`);
        if (storyImages.has(story.image)) addError(`${file}: one image is repeated across selected external stories (${story.image}).`);
        storyImages.add(story.image);
        if (!fs.existsSync(path.join(PORTAL, story.image.replace(/^\//, '')))) addError(`${file}: generated weekly illustration is missing (${story.image}).`);
      }
    }
    for (const [language, route] of [['hr', hrRoute], ['en', enRoute]]) {
      const page = fileForRoute(route);
      if (!fs.existsSync(page)) { addError(`${route}: static issue page is missing.`); continue; }
      const parsed = parseHtml(fs.readFileSync(page, 'utf8'));
      if (parsed.h1.length !== 1) addError(`${route}: expected exactly one H1.`);
      const canonical = parsed.links.find((link) => String(link.rel || '').toLowerCase().split(/\s+/).includes('canonical'))?.href;
      if (canonical !== `${SITE}${route}`) addError(`${route}: archive canonical is not self-referential.`);
      if (!metaValue(parsed, 'description')) addError(`${route}: archive description is missing.`);
      const weeklySchemas = [];
      for (const script of parsed.scripts.filter((node) => node.json)) walk(script.json, (node) => {
        if (typesOf(node).includes('CollectionPage')) weeklySchemas.push(node);
        if (typesOf(node).includes('ItemList')) weeklySchemas.push(node);
      });
      const collectionSchemaNode = weeklySchemas.find((node) => typesOf(node).includes('CollectionPage'));
      const itemListSchemaNode = weeklySchemas.find((node) => typesOf(node).includes('ItemList'));
      if (!collectionSchemaNode) addError(`${route}: CollectionPage JSON-LD is missing.`);
      if (!itemListSchemaNode) addError(`${route}: ItemList JSON-LD is missing.`);
      if (itemListSchemaNode) {
        if (itemListSchemaNode.numberOfItems !== storyRecords.length) addError(`${route}: ItemList numberOfItems differs from the curated story count.`);
        const listItems = itemListSchemaNode.itemListElement || [];
        if (listItems.length !== storyRecords.length) addError(`${route}: ItemList does not enumerate every curated story.`);
        storyRecords.forEach((story, index) => {
          const listed = listItems[index];
          const expectedImage = normalUrl(story.image);
          if (!listed || normalUrl(listed.url) !== normalUrl(story.url)) addError(`${route}: ItemList story ${index + 1} does not match the curated source URL.`);
          if (listed && !imageUrls(listed.image).map(normalUrl).includes(expectedImage)) addError(`${route}: ItemList story ${index + 1} image differs from its static card.`);
          if (!parsed.anchors.some((anchor) => anchor.href === story.url)) addError(`${route}: source publisher link is missing from static story ${index + 1}.`);
          const card = parsed.articles.find((entry) => entry.images.some((image) => normalUrl(image.src) === expectedImage));
          if (!card) addError(`${route}: selected story ${index + 1} has no image-bearing static HTML card.`);
          else if (!card.images.every((image) => String(image.alt || '').trim())) addError(`${route}: selected story ${index + 1} has an image without descriptive alt text.`);
        });
      }
      if (parsed.articles.length < storyRecords.length) addError(`${route}: not all selected stories are rendered as static HTML cards.`);
      if (parsed.visibleText.length < 3000) addWarning(`${route}: rendered issue text looks unusually short; review the static archive content.`);
      if (metaValue(parsed, 'author') || metaValue(parsed, 'article:author', 'property')) addError(`${route}: curated issue must not be falsely attributed to Nermin Sefić or another individual author.`);
    }
    if (issue.issue_id !== `aktual-media-tjedni-${week}` || issue.archive_key !== week) addError(`${file}: issue identity must be deterministically derived from issue_week.`);
    if (!issue.editorial_intro_en || !issue.editorial_note_en) addError(`${file}: English weekly archive needs its own introduction and editorial note.`);
    if (issue.counts?.sources != null && issue.counts.sources !== sources.size) addError(`${file}: source count metadata differs from the curated source set.`);
    for (const [image, alt] of [[issue.cover_image_hr, issue.cover_alt_hr], [issue.cover_image_en, issue.cover_alt_en]]) {
      if (!image || !fs.existsSync(path.join(PORTAL, image.replace(/^\//, '')))) addError(`${file}: localized weekly cover image is missing (${image || 'empty'}).`);
      if (!alt || !alt.trim()) addError(`${file}: localized weekly cover is missing descriptive alt text.`);
    }
  }
}

const newsroomPages = [
  { file: `${PORTAL}/gnk-aktual/index.html`, language: 'hr', required: ['Najnovije','Hrvatska','Svijet','Biznis','Tehnologija','Sport','Kultura','Tjednik','Komentari','Kolumne','Sve vijesti','Sve analize'], links: ['#amLead','#rubrika-hrvatska','#rubrika-svijet','#rubrika-biznis','#rubrika-tehnologija','#rubrika-sport','#rubrika-kultura','/gnk-aktual/tjedni/','/komentari/','/gnk-aktual/kolumne/','/objave/','/analize/'] },
  { file: `${PORTAL}/en/gnk-aktual/index.html`, language: 'en', required: ['Latest','Croatia','World','Business','Technology','Sport','Culture','Weekly','Commentary','Columns','All news','All analyses'], links: ['#amLead','#rubrika-hrvatska','#rubrika-svijet','#rubrika-biznis','#rubrika-tehnologija','#rubrika-sport','#rubrika-kultura','/en/gnk-aktual/weekly/','/en/commentary/','/en/gnk-aktual/columns/','/en/publications/','/en/analyses/'] },
];
for (const page of newsroomPages) {
  if (!fs.existsSync(page.file)) { addError(`${page.file}: AKTUAL MEDIA home is missing.`); continue; }
  const html = fs.readFileSync(page.file, 'utf8');
  const parsed = parseHtml(html);
  for (const label of page.required) if (!parsed.visibleText.includes(label)) addError(`${page.file}: required static newsroom navigation label missing: ${label}.`);
  for (const href of page.links) if (!parsed.anchors.some((anchor) => anchor.href === href)) addError(`${page.file}: required static newsroom navigation link missing: ${href}.`);
  if (metaValue(parsed, 'author') && /nermin\s+sefi[cć]/i.test(metaValue(parsed, 'author'))) addError(`${page.file}: newsroom CollectionPage should not be marked as authored by Nermin Sefić.`);
  if (html.includes('"author":{"@type":"Person","name":"Nermin Sefić"')) addError(`${page.file}: newsroom collection schema still attributes the full newsroom to Nermin Sefić.`);
}

const summary = {
  version: report.version,
  registryItems: report.registryItems,
  publishedItems: report.publishedItems,
  auditedItems: report.auditedItems,
  protectedItemsReadOnly: report.protectedItemsReadOnly,
  staticListingCards: report.staticListingCards,
  weeklyIssues: report.weeklyIssues,
  imageManifestEntries: imageManifest.items?.length || 0,
  uniqueEditorialImages: uniqueManifestImages.size,
  errors: failures.length,
  warnings: warnings.length,
  failures: failures.slice(0, 250),
  warnings: warnings.slice(0, 100),
};
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
