#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { isProtectedEditorialRoute as protectedPath } from './lib/editorial-route-protection-v1.mjs';
import { limitSeoDescription } from './lib/seo-description-v1.mjs';
import { applyHouseRibbon } from './lib/house-ribbon-v1.mjs';
import {
  SITE as CANONICAL_SITE,
  PERSON_URL,
  PERSON_ID,
  ORGANIZATION_ID,
  WEBSITE_ID,
  NERMIN_EDITOR,
  GNK_ASG_PUBLISHER,
  articleAuthorFor,
  isNerminPersonReference,
  isVerifiedNerminAuthor,
} from './lib/editorial-attribution-v1.mjs';

const PORTAL = 'apps/portal';
const REGISTRY_PATH = `${PORTAL}/data/editorial-registry.json`;
const IMAGE_MANIFEST_PATH = `${PORTAL}/data/editorial-image-manifest.json`;
const SITE = CANONICAL_SITE;
const WRITE = process.argv.includes('--write');
const FORCE_SHARE = process.argv.includes('--refresh-share');
const routesFileIndex = process.argv.indexOf('--routes-file');
let routeFilter = null;
if (routesFileIndex >= 0) {
  const routesFile = process.argv[routesFileIndex + 1];
  if (!routesFile || routesFile.startsWith('--')) throw new Error('--routes-file requires a JSON file path.');
  const routeSource = JSON.parse(fs.readFileSync(path.resolve(routesFile), 'utf8'));
  const routeItems = Array.isArray(routeSource) ? routeSource : routeSource.items;
  if (!Array.isArray(routeItems) || !routeItems.length) throw new Error(`${routesFile}: expected a non-empty route list or an object with an items array.`);
  const routes = routeItems.map((item) => typeof item === 'string' ? item : item?.path);
  if (routes.some((route) => typeof route !== 'string' || !/^\/[^\s]*\/$/.test(route))) throw new Error(`${routesFile}: every selected route must be a slash-delimited absolute site path.`);
  routeFilter = new Set(routes);
  if (routeFilter.size !== routes.length) throw new Error(`${routesFile}: duplicate routes are not allowed.`);
}
const AUTHOR_URL = PERSON_URL;
const AUTHOR_ID = PERSON_ID;
const ORG = { ...GNK_ASG_PUBLISHER, logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo-gnk-asg-canonical.svg` } };

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const unescapeHtml = (input = '') => {
  let value = String(input);
  for (let pass = 0; pass < 6; pass++) {
    const decoded = value.replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'")
      .replace(/&#(\d+);/g, (entity, digits) => { const point = Number(digits); return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity; })
      .replace(/&#x([0-9a-f]+);/gi, (entity, hex) => { const point = parseInt(hex, 16); return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity; });
    if (decoded === value) break;
    value = decoded;
  }
  return value;
};
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attrValue = (tag, name) => unescapeHtml(tag.match(new RegExp(`\\b${escapeRegex(name)}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2] || '');
const setAttr = (tag, name, value) => {
  const pattern = new RegExp(`\\b${escapeRegex(name)}\\s*=\\s*(["'])(.*?)\\1`, 'i');
  const safe = esc(value);
  return pattern.test(tag) ? tag.replace(pattern, `${name}="${safe}"`) : tag.replace(/\s*\/?>$/, (end) => ` ${name}="${safe}"${end}`);
};
const removeAttr = (tag, name) => tag.replace(new RegExp(`\\s+${escapeRegex(name)}\\s*=\\s*(["']).*?\\1`, 'i'), '');
const metaValue = (html, key, attr = 'name') => {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) if (attrValue(match[0], attr).toLowerCase() === key.toLowerCase()) return unescapeHtml(attrValue(match[0], 'content'));
  return '';
};
const insertIntoHead = (html, tag) => html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : `${tag}${html}`;
const upsertMeta = (html, keyAttr, key, value, extra = {}) => {
  const tag = `<meta ${keyAttr}="${esc(key)}" content="${esc(value)}"${Object.entries(extra).map(([name, v]) => ` ${name}="${esc(v)}"`).join('')}>`;
  let found = false;
  const next = html.replace(/<meta\b[^>]*>/gi, (current) => {
    if (attrValue(current, keyAttr).toLowerCase() !== key.toLowerCase()) return current;
    if (found) return '';
    found = true;
    let result = current;
    const content = new RegExp(`\\bcontent\\s*=\\s*(["'])(.*?)\\1`, 'i');
    if (content.test(result)) result = result.replace(content, `content="${esc(value)}"`);
    else result = result.replace(/\s*\/?>$/, (end) => ` content="${esc(value)}"${end}`);
    for (const [name, extraValue] of Object.entries(extra)) result = setAttr(result, name, extraValue);
    return result;
  });
  return found ? next : insertIntoHead(next, tag);
};
const upsertLink = (html, rel, href) => {
  let found = false;
  const next = html.replace(/<link\b[^>]*>/gi, (current) => {
    if (!attrValue(current, 'rel').toLowerCase().split(/\s+/).includes(rel.toLowerCase())) return current;
    if (found) return '';
    found = true;
    return setAttr(current, 'href', href);
  });
  return found ? next : insertIntoHead(next, `<link rel="${esc(rel)}" href="${esc(href)}">`);
};
const upsertHreflang = (html, language, href) => {
  let found = false;
  const next = html.replace(/<link\b[^>]*>/gi, (current) => {
    const rels = attrValue(current, 'rel').toLowerCase().split(/\s+/);
    if (!rels.includes('alternate') || attrValue(current, 'hreflang').toLowerCase() !== language.toLowerCase()) return current;
    if (found) return '';
    found = true;
    return setAttr(current, 'href', href);
  });
  return found ? next : insertIntoHead(next, `<link rel="alternate" hreflang="${esc(language)}" href="${esc(href)}">`);
};
const pageText = (value) => unescapeHtml(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
const pageH1 = (html) => pageText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
const typesOf = (object) => (Array.isArray(object?.['@type']) ? object['@type'] : [object?.['@type']]).filter(Boolean);
const walk = (value, callback) => {
  if (Array.isArray(value)) return value.forEach((item) => walk(item, callback));
  if (!value || typeof value !== 'object') return;
  callback(value);
  Object.values(value).forEach((item) => walk(item, callback));
};
const jsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const formatDate = (value) => value ? String(value) : null;
const labelFor = (type, language) => ({
  objava: language === 'en' ? 'Publications' : 'Objave',
  komentar: language === 'en' ? 'Commentary' : 'Komentari',
  analiza: language === 'en' ? 'Analyses' : 'Analize',
  kolumna: language === 'en' ? 'Columns' : 'Kolumne',
}[type] || 'AKTUAL MEDIA');
const collectionFor = (item) => {
  const base = item.path.replace(/[^/]+\/$/, '');
  return { path: base.endsWith('/') ? base : `${base}/`, label: labelFor(item.type, item.language) };
};
const stripPageHashtags = (html) => html
  .replace(/<p\b[^>]*class=["'][^"']*\b(?:article-hashtags|article-tags|hashtag-list|article-author-mark)\b[^"']*["'][^>]*>[\s\S]*?<\/p>/gi, '')
  .replace(/<p\b[^>]*data-author-mark=["']nermin-sefic["'][^>]*>[\s\S]*?<\/p>/gi, '');
const stripNerminAuthorAttribution = (html) => {
  let out = stripPageHashtags(html);
  out = out.replace(/<(aside|section|div)\b[^>]*class=["'][^"']*\b(?:article-author|author-box|author-card)\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, (block) => /nermin\s+sefi[cć]/i.test(pageText(block)) ? '' : block);
  out = out.replace(/<p\b[^>]*class=["'][^"']*editorial-author-inline[^"']*["'][^>]*>[\s\S]*?<\/p>/gi, (block) => {
    const text = pageText(block);
    const explicitPersonalByline = /(?:author|autor)\s*:/i.test(text) && /nermin\s+sefi[cć]/i.test(text);
    return explicitPersonalByline ? '' : block;
  });
  out = out.replace(/<(div|p)\b[^>]*class=["'][^"']*\b(?:article-meta|meta-row|byline|author-meta)\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, (block) => {
    const text = pageText(block);
    if (!/(?:author|autor)\s*:\s*nermin\s+sefi[cć]/i.test(text)) return block;
    let clean = block.replace(/<(span|a)\b[^>]*>[\s\S]*?<\/\1>/gi, (node) => {
      const text = pageText(node);
      return /^(?:(?:author|autor)\s*:\s*)?nermin\s+sefi[cć](?:\s*\/\s*gnk\s+asg\s+d\.o\.o\.)?$/i.test(text) ? '' : node;
    });
    clean = clean.replace(/(?:author|autor)\s*:\s*nermin\s+sefi[cć](?:\s*\/\s*gnk\s+asg\s+d\.o\.o\.)?\s*(?:[·|,]\s*)?/gi, '');
    clean = clean.replace(/<(?:span|a)\b[^>]*>\s*<\/(?:span|a)>/gi, '');
    return pageText(clean) ? clean : '';
  });
  return out;
};
const shareBlock = (item) => {
  const url = `${SITE}${item.path}`;
  const title = item.title || item.path;
  const message = encodeURIComponent(`${title} — ${url}`);
  const label = item.language === 'en' ? 'Share' : 'Podijeli';
  return `<aside class="editorial-share" data-editorial-share aria-label="${label}"><span>${label}</span><a target="_blank" rel="noopener noreferrer nofollow" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}">LinkedIn</a><a target="_blank" rel="noopener noreferrer nofollow" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a><a target="_blank" rel="noopener noreferrer nofollow" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}">X</a><a target="_blank" rel="noopener noreferrer nofollow" href="https://wa.me/?text=${message}">WhatsApp</a></aside>`;
};
const breadcrumbMarkup = (item) => {
  const collection = collectionFor(item);
  const home = item.language === 'en' ? 'Home' : 'Naslovnica';
  return `<nav class="editorial-breadcrumb" aria-label="${item.language === 'en' ? 'Breadcrumb' : 'Krušne mrvice'}" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:0 0 1rem;font-size:.85rem"><a href="${item.language === 'en' ? '/en/' : '/'}">${home}</a><span aria-hidden="true">›</span><a href="${esc(collection.path)}">${esc(collection.label)}</a><span aria-hidden="true">›</span><span aria-current="page">${esc(item.title)}</span></nav>`;
};
const relatedLinksBlock = (item) => {
  const en = item.language === 'en';
  const links = en
    ? [['/en/gnk-aktual/','AKTUAL MEDIA newsroom'],['/en/publications/','Publications'],['/en/commentary/','Commentary'],['/en/analyses/','Analyses'],['/en/gnk-aktual/columns/','Columns'],['/en/gnk-aktual/weekly/','Weekly archive']]
    : [['/gnk-aktual/','AKTUAL MEDIA'],['/objave/','Objave'],['/komentari/','Komentari'],['/analize/','Analize'],['/gnk-aktual/kolumne/','Kolumne'],['/gnk-aktual/tjedni/','Tjednik']];
  return `<nav class="editorial-crosslinks" data-editorial-crosslinks aria-label="${en ? 'Related AKTUAL MEDIA sections' : 'Povezane rubrike AKTUAL MEDIA'}" style="display:flex;gap:.65rem;flex-wrap:wrap;align-items:center;border-top:1px solid rgba(127,127,127,.32);padding:1rem 0;margin:1.25rem 0"><strong>AKTUAL MEDIA</strong>${links.map(([href,label]) => `<a href="${href}">${label}</a>`).join('')}</nav>`;
};
const isNermin = (item) => isVerifiedNerminAuthor(item);
const imageMarkup = (entry) => `<figure class="editorial-cover-figure"><img class="article-cover" src="${esc(entry.image)}" alt="${esc(entry.alt)}" title="${esc(entry.title)} — ${entry.language === 'en' ? 'editorial illustration' : 'urednička ilustracija'}" width="1200" height="630" loading="eager" decoding="async" fetchpriority="high"></figure>`;
const replaceImageTag = (tag, entry) => {
  let next = removeAttr(tag, 'srcset');
  next = removeAttr(next, 'sizes');
  next = setAttr(next, 'src', entry.image);
  next = setAttr(next, 'alt', entry.alt);
  next = setAttr(next, 'title', `${entry.title} — ${entry.language === 'en' ? 'editorial illustration' : 'urednička ilustracija'}`);
  next = setAttr(next, 'width', '1200');
  next = setAttr(next, 'height', '630');
  next = setAttr(next, 'loading', 'eager');
  next = setAttr(next, 'decoding', 'async');
  next = setAttr(next, 'fetchpriority', 'high');
  const classes = attrValue(next, 'class').split(/\s+/).filter(Boolean);
  if (!classes.includes('article-cover')) classes.push('article-cover');
  next = setAttr(next, 'class', classes.join(' '));
  return next;
};
const breadcrumbSchema = (item, canonical) => {
  const collection = collectionFor(item);
  const home = item.language === 'en' ? 'Home' : 'Naslovnica';
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: home, item: item.language === 'en' ? `${SITE}/en/` : `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: collection.label, item: `${SITE}${collection.path}` },
    { '@type': 'ListItem', position: 3, name: item.title, item: canonical },
  ] };
};
const patchJsonLd = (html, image, item, canonical, nermin) => {
  let articleCount = 0;
  let primaryArticleSchemaKept = false;
  let hasBreadcrumb = false;
  const datePublished = formatDate(item.publishedAt || item.published_at);
  const dateModified = formatDate(item.modifiedAt);
  const articleType = item.type === 'komentar' || item.type === 'kolumna' ? 'OpinionNewsArticle' : 'Article';
  const registryAuthor = articleAuthorFor(item);
  const editor = { ...NERMIN_EDITOR };
  let out = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (block, raw) => {
    let schema;
    try { schema = JSON.parse(raw); } catch { return block; }
    walk(schema, (object) => { if (typesOf(object).includes('BreadcrumbList')) hasBreadcrumb = true; });
    let sawArticle = primaryArticleSchemaKept;
    const keepOneArticle = (value) => {
      if (Array.isArray(value)) return value.map(keepOneArticle).filter((entry) => entry !== null);
      if (!value || typeof value !== 'object') return value;
      if (typesOf(value).some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type))) {
        if (sawArticle) return null;
        sawArticle = true;
      }
      for (const [key, child] of Object.entries(value)) {
        const retained = keepOneArticle(child);
        if (retained === null) delete value[key];
        else value[key] = retained;
      }
      return value;
    };
    schema = keepOneArticle(schema);
    if (!schema) return '';
    if (sawArticle) primaryArticleSchemaKept = true;
    walk(schema, (object) => {
      if (!typesOf(object).some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type))) return;
      articleCount++;
      if (item.type === 'komentar' || item.type === 'kolumna') object['@type'] = 'OpinionNewsArticle';
      object.headline = item.title || object.headline;
      object.description = limitSeoDescription(item.description || object.description || '');
      object.mainEntityOfPage = { '@type': 'WebPage', '@id': canonical };
      object.image = { '@type': 'ImageObject', url: `${SITE}${image.image}`, width: 1200, height: 630, caption: item.title };
      if (datePublished) object.datePublished = datePublished;
      if (dateModified) object.dateModified = dateModified;
      else delete object.dateModified;
      object.publisher = ORG;
      object.editor = editor;
      object.isPartOf ||= { '@id': WEBSITE_ID };
      object.inLanguage = object.inLanguage || (item.language === 'en' ? 'en' : 'hr');
      object.isAccessibleForFree = object.isAccessibleForFree ?? true;
      if (Array.isArray(object.keywords)) object.keywords = object.keywords.filter((word) => !/(?:nermin|sefi[cć])/i.test(String(word)));
      else if (typeof object.keywords === 'string') object.keywords = object.keywords.split(',').map((word) => word.trim()).filter((word) => word && !/(?:nermin|sefi[cć])/i.test(word)).join(', ');
      if (!/nermin\s+sefi[cć]/i.test(`${item.title || ''} ${item.description || ''}`) && object.about) {
        const entities = Array.isArray(object.about) ? object.about : [object.about];
        const remaining = entities.filter((entity) => !(entity && typesOf(entity).includes('Person') && /nermin\s+sefi[cć]/i.test(entity.name || '')));
        if (remaining.length) object.about = Array.isArray(object.about) ? remaining : remaining[0];
        else delete object.about;
      }
      if (registryAuthor) object.author = registryAuthor;
      else if (isNerminPersonReference(object.author)) delete object.author;
    });
    return `<script type="application/ld+json">${jsonForScript(schema)}</script>`;
  });
  if (!articleCount) {
    const schema = {
      '@context': 'https://schema.org', '@type': articleType, headline: item.title,
      description: limitSeoDescription(item.description || ''), url: canonical, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      image: { '@type': 'ImageObject', url: `${SITE}${image.image}`, width: 1200, height: 630, caption: item.title },
      publisher: ORG, editor, isPartOf: { '@id': WEBSITE_ID },
      inLanguage: item.language === 'en' ? 'en' : 'hr', isAccessibleForFree: true,
    };
    if (datePublished) schema.datePublished = datePublished;
    if (dateModified) schema.dateModified = dateModified;
    if (registryAuthor) schema.author = registryAuthor;
    out = insertIntoHead(out, `<script type="application/ld+json">${jsonForScript(schema)}</script>`);
  }
  if (!hasBreadcrumb) out = insertIntoHead(out, `<script type="application/ld+json">${jsonForScript(breadcrumbSchema(item, canonical))}</script>`);
  return out;
};
const patchHead = (html, item, image) => {
  const canonical = `${SITE}${item.path}`;
  const contentTitle = item.title || pageH1(html) || 'GNK ASG';
  const title = item.seoTitle || contentTitle;
  const description = limitSeoDescription(item.description || metaValue(html, 'og:description', 'property') || contentTitle);
  const registryAuthor = articleAuthorFor(item);
  let out = html;
  out = out.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  out = upsertMeta(out, 'name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1');
  out = upsertMeta(out, 'name', 'description', description);
  out = upsertMeta(out, 'name', 'editor', 'Nermin Sefić');
  out = upsertLink(out, 'canonical', canonical);
  out = upsertMeta(out, 'property', 'og:type', 'article');
  out = upsertMeta(out, 'property', 'og:title', title);
  out = upsertMeta(out, 'property', 'og:description', description);
  out = upsertMeta(out, 'property', 'og:url', canonical);
  const imageUrl = image.url || `${SITE}${image.image}`;
  out = upsertMeta(out, 'property', 'og:image', imageUrl);
  out = upsertMeta(out, 'property', 'og:image:alt', image.alt);
  out = upsertMeta(out, 'property', 'og:image:width', '1200');
  out = upsertMeta(out, 'property', 'og:image:height', '630');
  const extension = String(image.image || '').split(/[?#]/)[0].split('.').pop().toLowerCase();
  const imageType = ({ webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', avif: 'image/avif' })[extension] || 'image/webp';
  out = upsertMeta(out, 'property', 'og:image:type', imageType);
  out = upsertMeta(out, 'name', 'twitter:card', 'summary_large_image');
  out = upsertMeta(out, 'name', 'twitter:title', metaValue(out, 'og:title', 'property') || title);
  out = upsertMeta(out, 'name', 'twitter:description', description);
  out = upsertMeta(out, 'name', 'twitter:image', imageUrl);
  out = upsertMeta(out, 'name', 'twitter:image:alt', image.alt);
  out = out.replace(/<link\b[^>]*>/gi, (tag) => attrValue(tag, 'href').startsWith('/assets/editorial-content-v2.css') ? setAttr(tag, 'href', '/assets/editorial-content-v2.css?v=20261013-editorial-completeness') : tag);

  if (registryAuthor) out = upsertMeta(out, 'name', 'author', registryAuthor.name);
  else out = out.replace(/<meta\b[^>]*name=["']author["'][^>]*>/gi, (tag) => /nermin\s+sefi[cć]/i.test(attrValue(tag, 'content')) ? '' : tag);
  if (isVerifiedNerminAuthor(item)) {
    out = upsertMeta(out, 'property', 'article:author', PERSON_URL);
    out = upsertLink(out, 'author', PERSON_URL);
  } else {
    out = out.replace(/<meta\b[^>]*property=["']article:author["'][^>]*>/gi, (tag) => /nermin\s+sefi[cć]|nermin-sefic/i.test(attrValue(tag, 'content')) ? '' : tag);
    out = out.replace(/<link\b[^>]*>/gi, (tag) => {
      const rel = attrValue(tag, 'rel').toLowerCase().split(/\s+/);
      const href = attrValue(tag, 'href');
      return rel.includes('author') && /^(?:https:\/\/gnk-asg\.hr)?\/nermin-sefic\/?(?:#person|#nermin-sefic)?$/i.test(href) ? '' : tag;
    });
  }
  out = out.replace(/<meta\b[^>]*name=["']author-image["'][^>]*>/gi, (tag) => /nermin|sefi[cć]/i.test(tag) ? '' : tag);
  const publishedAt = item.publishedAt || item.published_at;
  const modifiedAt = item.modifiedAt;
  if (publishedAt) out = upsertMeta(out, 'property', 'article:published_time', publishedAt);
  if (modifiedAt) out = upsertMeta(out, 'property', 'article:modified_time', modifiedAt);
  else out = out.replace(/<meta\b[^>]*property=["']article:modified_time["'][^>]*>/gi, '');
  out = out.replace(/<meta\b[^>]*name=["']keywords["'][^>]*>/gi, (tag) => {
    const content = attrValue(tag, 'content');
    const cleaned = content.split(',').map((word) => word.trim()).filter((word) => word && !/(?:nermin|sefi[cć])/i.test(word) && !word.startsWith('#'));
    return cleaned.length ? setAttr(tag, 'content', cleaned.join(', ')) : '';
  });
  return out;
};
const patchBody = (html, item, image) => {
  let out = html;
  const tags = [...out.matchAll(/<img\b[^>]*>/gi)];
  const oldOg = metaValue(out, 'og:image', 'property').replace(SITE, '');
  const title = item.title.toLowerCase();
  const outsideWorldChart = (match) => {
    const before = out.slice(0, match.index);
    const openIndex = before.lastIndexOf('<figure');
    const closeIndex = before.lastIndexOf('</figure>');
    if (openIndex < 0 || openIndex < closeIndex) return true;
    const openTag = before.slice(openIndex).match(/^<figure\b[^>]*>/i)?.[0] || '';
    return !/\bworld-chart\b/i.test(attrValue(openTag, 'class'));
  };
  const contentImages = tags.filter(outsideWorldChart);
  const suitable = contentImages.find((match) => /\barticle-cover\b/i.test(attrValue(match[0], 'class')))
    || contentImages.find((match) => attrValue(match[0], 'src') === oldOg || attrValue(match[0], 'src') === `${SITE}${oldOg}`)
    || contentImages.find((match) => attrValue(match[0], 'alt').toLowerCase().includes(title.slice(0, Math.min(title.length, 32))))
    || contentImages.find((match) => /editorial\//i.test(attrValue(match[0], 'src')) && !/logo|favicon|icon/i.test(attrValue(match[0], 'src')));
  if (suitable) {
    const start = suitable.index;
    out = out.slice(0, start) + replaceImageTag(suitable[0], image) + out.slice(start + suitable[0].length);
  } else {
    const articleHeader = out.match(/<header\b[^>]*class=["'][^"']*\barticle-header\b[^"']*["'][^>]*>[\s\S]*?<\/header>/i);
    const h1 = out.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);
    if (articleHeader) out = out.replace(articleHeader[0], `${articleHeader[0]}${imageMarkup(image)}`);
    else if (h1) out = out.replace(h1[0], `${h1[0]}${imageMarkup(image)}`);
  }
  if (!/aria-label=["'](?:Breadcrumb|Krušne mrvice)["']|class=["'][^"']*editorial-breadcrumb/i.test(out)) {
    const h1 = out.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i);
    if (h1) out = out.replace(h1[0], `${h1[0]}${breadcrumbMarkup(item)}`);
  }
  const body = out.split(/<body\b[^>]*>/i)[1] || out;
  const hasByline = /class=["'][^"']*(?:author-box|article-author|editorial-author-inline|byline)[^"']*["']/i.test(body);
  if (isNermin(item)) {
    if (!hasByline) {
      const byline = `<p class="editorial-author-inline"><strong>${item.language === 'en' ? 'Author' : 'Autor'}:</strong> <a href="${AUTHOR_URL}" rel="author">Nermin Sefić</a></p>`;
      if (out.includes('</article>')) out = out.replace('</article>', `${byline}</article>`);
      else if (out.includes('</main>')) out = out.replace('</main>', `${byline}</main>`);
    }
  } else {
    out = stripNerminAuthorAttribution(out);
    const cleanedBody = out.split(/<body\b[^>]*>/i)[1] || out;
    const hasOtherByline = /class=["'][^"']*(?:author-box|article-author|editorial-author-inline|byline)[^"']*["']/i.test(cleanedBody);
    const registryAuthor = articleAuthorFor(item);
    if (registryAuthor && !hasOtherByline) {
      const byline = `<p class="editorial-author-inline"><strong>${item.language === 'en' ? 'Author' : 'Autor'}:</strong> ${esc(registryAuthor.name)}</p>`;
      if (out.includes('</article>')) out = out.replace('</article>', `${byline}</article>`);
      else if (out.includes('</main>')) out = out.replace('</main>', `${byline}</main>`);
    }
  }
  out = stripPageHashtags(out);
  if (!/data-editorial-crosslinks/i.test(out)) {
    if (out.includes('</article>')) out = out.replace('</article>', `${relatedLinksBlock(item)}</article>`);
    else if (out.includes('</main>')) out = out.replace('</main>', `${relatedLinksBlock(item)}</main>`);
  }
  if (FORCE_SHARE || !/(?:data-editorial-share|data-share-buttons)/i.test(out)) {
    if (out.includes('</article>')) out = out.replace('</article>', `${shareBlock(item)}</article>`);
    else if (out.includes('</main>')) out = out.replace('</main>', `${shareBlock(item)}</main>`);
  }
  let keptInlineByline = false;
  out = out.replace(/<p\b[^>]*class=["'][^"']*editorial-author-inline[^"']*["'][^>]*>[\s\S]*?<\/p>/gi, (block) => {
    if (keptInlineByline) return '';
    keptInlineByline = true;
    return block;
  });
  return out;
};
const replaceListingImage = (tag, image) => {
  let next = removeAttr(tag, 'srcset');
  next = removeAttr(next, 'sizes');
  next = setAttr(next, 'src', image.image);
  next = setAttr(next, 'alt', image.alt);
  next = setAttr(next, 'width', '1200');
  next = setAttr(next, 'height', '630');
  next = setAttr(next, 'loading', 'lazy');
  next = setAttr(next, 'decoding', 'async');
  return next;
};
const patchListingCards = (file, byPath) => {
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(/<article\b[^>]*>[\s\S]*?<\/article>/gi, (article) => {
    const route = [...byPath.keys()].find((candidate) => article.includes(`href="${candidate}"`) || article.includes(`href='${candidate}'`));
    if (!route) return article;
    const image = byPath.get(route);
    let replaced = false;
    const next = article.replace(/<img\b[^>]*>/i, (tag) => { replaced = true; return replaceListingImage(tag, image); });
    return replaced ? next : article;
  });
  if (html !== before && WRITE) fs.writeFileSync(file, html);
  return html !== before;
};

if (!fs.existsSync(REGISTRY_PATH) || !fs.existsSync(IMAGE_MANIFEST_PATH)) throw new Error('Editorial registry and image manifest must be generated first.');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(IMAGE_MANIFEST_PATH, 'utf8'));
const supportedTypes = new Set(['objava', 'komentar', 'analiza', 'kolumna']);
const eligibleRoutes = new Set((registry.items || [])
  .filter((item) => !protectedPath(item.path) && supportedTypes.has(item.type) && item.status === 'published'
    && (!routeFilter || routeFilter.has(item.path)))
  .map((item) => item.path));
const byPath = new Map((manifest.items || [])
  .filter((image) => eligibleRoutes.has(image.path))
  .map((image) => [image.path, image]));
let scanned = 0;
let changed = 0;
let protectedRoutesSkipped = 0;
const changedRoutes = [];
const failures = [];
const registryRoutesMatched = new Set();
for (const item of registry.items || []) {
  if (routeFilter && !routeFilter.has(item.path)) continue;
  registryRoutesMatched.add(item.path);
  if (protectedPath(item.path)) { protectedRoutesSkipped++; continue; }
  if (!supportedTypes.has(item.type) || item.status !== 'published') {
    if (routeFilter) failures.push(`${item.path}: requested route is not a supported published editorial item`);
    continue;
  }
  const image = byPath.get(item.path);
  if (!image) { failures.push(`${item.path}: missing generated image manifest record`); continue; }
  const file = path.join(PORTAL, item.path.replace(/^\/+|\/+$/g, ''), 'index.html');
  if (!fs.existsSync(file)) { failures.push(`${item.path}: missing public HTML`); continue; }
  scanned++;
  const before = fs.readFileSync(file, 'utf8');
  const canonical = `${SITE}${item.path}`;
  let html = patchHead(before, item, image);
  if (item.type === 'kolumna' && ['hr', 'en'].includes(item.language)) {
    const translated = (registry.items || []).find((candidate) => candidate.type === 'kolumna'
      && candidate.status === 'published' && candidate.slug === item.slug
      && candidate.language !== item.language && ['hr', 'en'].includes(candidate.language));
    const hrItem = item.language === 'hr' ? item : translated;
    const enItem = item.language === 'en' ? item : translated;
    if (hrItem?.language === 'hr' && enItem?.language === 'en') {
      html = upsertHreflang(html, 'hr', `${SITE}${hrItem.path}`);
      html = upsertHreflang(html, 'en', `${SITE}${enItem.path}`);
      html = upsertHreflang(html, 'x-default', `${SITE}${hrItem.path}`);
    }
  }
  html = patchBody(html, item, image);
  html = patchJsonLd(html, image, item, canonical, isNermin(item));
  /* Svaka nova objava rađa se sa znakom kuće — ne čeka noćni prolaz. */
  html = applyHouseRibbon(html).html;
  if (html !== before) {
    changed++;
    changedRoutes.push(item.path);
    if (WRITE) fs.writeFileSync(file, html);
  }
}
const listingFiles = [
  'objave/index.html','komentari/index.html','analize/index.html',
  'en/publications/index.html','en/commentary/index.html','en/analyses/index.html',
].map((file) => path.join(PORTAL, file));
let listingChanges = 0;
for (const file of listingFiles) if (patchListingCards(file, byPath)) listingChanges++;
if (routeFilter) {
  for (const route of routeFilter) if (!registryRoutesMatched.has(route)) failures.push(`${route}: requested route is missing from the canonical editorial registry`);
}
const result = { version: 'EDITORIAL_PUBLICATION_COMPLETENESS_MATERIALIZER_V1', write: WRITE, routeFilter: routeFilter ? [...routeFilter].sort() : null, scanned, changed, changedRoutes, listingFilesChanged: listingChanges, protectedRoutesSkipped, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
