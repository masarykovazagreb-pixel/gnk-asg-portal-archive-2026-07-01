// Safe SEO metadata normalizer for public pages.
// Read-only by default. Pass --write only from a reviewed workflow.
// Protected SPT/bank routes are never modified; registry pages receive only
// social/SEO keyword hygiene, while author/editor roles use the canonical registry.
import fs from 'node:fs';
import path from 'node:path';
import {
  SITE,
  PERSON_URL,
  PERSON_ID,
  ORGANIZATION_ID,
  WEBSITE_ID,
  isNerminPersonReference,
} from './lib/editorial-attribution-v1.mjs';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';
import { cleanSocialAbout, cleanSocialKeywords } from './lib/editorial-html-attribution-v1.mjs';
import { limitSeoDescription } from './lib/seo-description-v1.mjs';

const ROOT = 'apps/portal';
const REGISTRY = JSON.parse(fs.readFileSync(`${ROOT}/data/editorial-registry.json`, 'utf8'));
const EDITORIAL_PATHS = new Set((REGISTRY.items || []).map((item) => normalizeRoute(item?.path)).filter(Boolean));
const ITEM_BY_ROUTE = new Map((REGISTRY.items || []).map((item) => [normalizeRoute(item?.path), item]));
const WRITE = process.argv.includes('--write');
const SOCIAL_CARD = `${SITE}/assets/gnk-asg-social-card.png`;
const SKIP_ROOTS = new Set([
  'admin', 'admin-center', 'admin-login', 'control', 'automation-status',
  'webmail', 'mail-studio', 'campaign-mailer', 'email-status', 'worker-ops',
  'operator-dashboard', 'digital-headquarters', 'media-registration-admin',
  'podijeli', 'api', 'assets', 'data', '__preview', 'bank', 'spt',
]);
const PAGE_TYPES = new Set([
  'WebPage', 'AboutPage', 'CollectionPage', 'ContactPage', 'ProfilePage',
  'FAQPage', 'SearchResultsPage', 'ItemPage',
]);

function normalizeRoute(value) {
  const route = String(value || '').trim().replace(/^\/+|\/+$/g, '');
  return route ? `/${route}/` : '/';
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function attrValue(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  return match ? match[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
}

function insertIntoHead(html, tag) {
  return html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : `${tag}${html}`;
}

function upsertMeta(html, keyAttribute, key, value) {
  let found = false;
  const replacement = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (attrValue(tag, keyAttribute).toLowerCase() !== key.toLowerCase()) return tag;
    if (found) return '';
    found = true;
    const content = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i;
    return content.test(tag)
      ? tag.replace(content, `content="${esc(value)}"`)
      : tag.replace(/\s*\/?>$/, (end) => ` content="${esc(value)}"${end}`);
  });
  return found ? replacement : insertIntoHead(replacement, `<meta ${keyAttribute}="${esc(key)}" content="${esc(value)}">`);
}

function removeNerminAuthorMeta(html) {
  return html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (attrValue(tag, 'name').toLowerCase() !== 'author') return tag;
    return /nermin\s+sefi[cć]/i.test(attrValue(tag, 'content')) ? '' : tag;
  });
}

function pageText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pageSchemaNode(route, title, description, language) {
  const canonical = `${SITE}${route}`;
  return {
    '@context': 'https://schema.org',
    '@type': route === '/about/' || route === '/en/about/' ? 'AboutPage' : 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    inLanguage: language,
    isPartOf: { '@id': WEBSITE_ID },
    editor: { '@type': 'Person', '@id': PERSON_ID, name: 'Nermin Sefić', url: PERSON_URL },
    publisher: { '@type': 'Organization', '@id': ORGANIZATION_ID, name: 'GNK ASG d.o.o.', url: `${SITE}/` },
  };
}

function schemaTypes(node) {
  const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
  return types.filter(Boolean);
}

function cleanKeywordMeta(html, item) {
  return html.replace(/<meta\b[^>]*\bname=[\"'](?:keywords|news_keywords)[\"'][^>]*>/gi, (tag) => {
    const keywords = cleanSocialKeywords(attrValue(tag, 'content'), item);
    if (keywords === undefined) return '';
    const content = /\bcontent\s*=\s*([\"'])([\s\S]*?)\1/i;
    return content.test(tag) ? tag.replace(content, `content=\"${esc(keywords)}\"`) : tag;
  });
}

function cleanSocialArticleTags(html) {
  return html.replace(/<meta\b[^>]*property=["']article:tag["'][^>]*>/gi, (tag) => {
    const content = attrValue(tag, 'content');
    return /^#/u.test(content) || /nermin|sefi[cć]/i.test(content) ? '' : tag;
  });
}

function cleanStructuredSeoKeywords(html, item) {
  return html.replace(/<script\b[^>]*type=[\"']application\/ld\+json[\"'][^>]*>([\s\S]*?)<\/script>/gi, (block, raw) => {
    let schema;
    try { schema = JSON.parse(raw); } catch { return block; }
    const visit = (value) => {
      if (Array.isArray(value)) return value.map(visit);
      if (!value || typeof value !== 'object') return value;
      if (schemaTypes(value).includes('WebSite')) {
        value.name = 'GNK ASG';
        delete value.keywords;
      } else if ('keywords' in value) {
        const keywords = cleanSocialKeywords(value.keywords, item);
        if (keywords === undefined) delete value.keywords;
        else value.keywords = keywords;
      }
      if ('about' in value) {
        const about = cleanSocialAbout(value.about, item);
        if (about === undefined) delete value.about;
        else value.about = about;
      }
      for (const [key, child] of Object.entries(value)) value[key] = visit(child);
      return value;
    };
    schema = visit(schema);
    return `<script type=\"application/ld+json\">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
  });
}

function updatePageJsonLd(html, route, title, description, language) {
  let foundPage = false;
  const updated = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (block, raw) => {
    let schema;
    try { schema = JSON.parse(raw); } catch { return block; }
    const visit = (value) => {
      if (Array.isArray(value)) return value.map(visit);
      if (!value || typeof value !== 'object') return value;
      if (schemaTypes(value).some((type) => PAGE_TYPES.has(type))) {
        foundPage = true;
        value.editor = { '@type': 'Person', '@id': PERSON_ID, name: 'Nermin Sefić', url: PERSON_URL };
        value.publisher ||= { '@type': 'Organization', '@id': ORGANIZATION_ID, name: 'GNK ASG d.o.o.', url: `${SITE}/` };
        value.isPartOf ||= { '@id': WEBSITE_ID };
        value.url ||= `${SITE}${route}`;
        value['@id'] ||= `${SITE}${route}#webpage`;
        value.name ||= title;
        value.description ||= description;
        value.inLanguage ||= language;
        if (isNerminPersonReference(value.author)) delete value.author;
        if (route !== '/nermin-sefic/' && route !== '/en/nermin-sefic/' && 'about' in value) {
          const wasArray = Array.isArray(value.about);
          const values = wasArray ? value.about : [value.about];
          const kept = values.filter((entry) => !isNerminPersonReference(entry));
          if (!kept.length) delete value.about;
          else value.about = wasArray ? kept : kept[0];
        }
      }
      for (const [key, child] of Object.entries(value)) value[key] = visit(child);
      return value;
    };
    schema = visit(schema);
    return `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
  });
  return foundPage ? updated : insertIntoHead(updated, `<script type="application/ld+json">${JSON.stringify(pageSchemaNode(route, title, description, language)).replace(/</g, '\\u003c')}</script>`);
}

function socialImage(html, route) {
  const profilePage = route === '/nermin-sefic/' || route === '/en/nermin-sefic/';
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
  const ogTag = metas.find((tag) => attrValue(tag, 'property').toLowerCase() === 'og:image');
  const oldOg = ogTag ? attrValue(ogTag, 'content') : '';
  const fallbackNeeded = !oldOg || (!profilePage && /\/assets\/people\/nermin-sefic\//i.test(oldOg));
  const nextOg = fallbackNeeded ? SOCIAL_CARD : oldOg;
  html = upsertMeta(html, 'property', 'og:image', nextOg);
  if (!metas.some((tag) => attrValue(tag, 'property').toLowerCase() === 'og:image:alt')) {
    html = upsertMeta(html, 'property', 'og:image:alt', profilePage ? 'Nermin Sefić — public profile' : 'GNK ASG d.o.o. corporate editorial card');
  }
  const twitterTag = metas.find((tag) => attrValue(tag, 'name').toLowerCase() === 'twitter:image');
  const oldTwitter = twitterTag ? attrValue(twitterTag, 'content') : '';
  if (!oldTwitter || (!profilePage && /\/assets\/people\/nermin-sefic\//i.test(oldTwitter))) {
    html = upsertMeta(html, 'name', 'twitter:image', nextOg);
  }
  return html;
}

const files = [];
(function walk(directory) {
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name);
    let stat;
    try { stat = fs.statSync(file); } catch { continue; }
    if (stat.isDirectory()) {
      const relative = path.relative(ROOT, file).split(path.sep).join('/');
      const segments = relative.split('/');
      if ((segments[0] && SKIP_ROOTS.has(segments[0])) || (segments[0] === 'en' && segments[1] && SKIP_ROOTS.has(segments[1]))) continue;
      walk(file);
    } else if (name === 'index.html') {
      files.push(file);
    }
  }
})(ROOT);

const stats = {
  mode: WRITE ? 'write' : 'check',
  scanned: files.length,
  changed: 0,
  protectedSkipped: 0,
  editorialSkipped: 0,
  noindexSkipped: 0,
  authorConvertedToEditor: 0,
  editorMetadataEnsured: 0,
  schemaUpdated: 0,
  keywordSignalsCleaned: 0,
  changedPages: [],
};

for (const file of files) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const route = normalizeRoute(relative.replace(/index\.html$/i, ''));
  if (isProtectedEditorialRoute(route)) {
    stats.protectedSkipped++;
    continue;
  }

  let html = fs.readFileSync(file, 'utf8');
  if (/\bnoindex\b/i.test(html) || /http-equiv=["']refresh["']/i.test(html)) {
    stats.noindexSkipped++;
    continue;
  }
  const original = html;
  const item = ITEM_BY_ROUTE.get(route) || null;
  html = cleanKeywordMeta(html, item);
  html = cleanSocialArticleTags(html);
  html = cleanStructuredSeoKeywords(html, item);
  if (html !== original) stats.keywordSignalsCleaned++;
  if (EDITORIAL_PATHS.has(route)) {
    stats.editorialSkipped++;
    if (html !== original) {
      stats.changed++;
      stats.changedPages.push(route);
      if (WRITE) fs.writeFileSync(file, html, 'utf8');
    }
    continue;
  }
  const language = /<html\b[^>]*\blang=["']en(?:-[^"']*)?["']/i.test(html) ? 'en' : 'hr';
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? pageText(titleMatch[1]) : 'GNK ASG';
  const descriptionMatch = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0])
    .find((tag) => attrValue(tag, 'name').toLowerCase() === 'description');
  const firstParagraph = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
  const description = limitSeoDescription(descriptionMatch
    ? attrValue(descriptionMatch, 'content')
    : (pageText(firstParagraph) || pageText(html).slice(0, 220)));
  const canonical = `${SITE}${route}`;

  const hadNerminAuthor = [...html.matchAll(/<meta\b[^>]*>/gi)].some((match) =>
    attrValue(match[0], 'name').toLowerCase() === 'author' && /nermin\s+sefi[cć]/i.test(attrValue(match[0], 'content')));
  html = removeNerminAuthorMeta(html);
  if (hadNerminAuthor) stats.authorConvertedToEditor++;
  html = upsertMeta(html, 'name', 'editor', 'Nermin Sefić');
  stats.editorMetadataEnsured++;

  if (!/rel=["']canonical["']/i.test(html)) html = insertIntoHead(html, `<link rel="canonical" href="${canonical}">`);
  if (!/name=["']description["']/i.test(html)) html = insertIntoHead(html, `<meta name="description" content="${esc(description)}">`);
  if (!/name=["']robots["']/i.test(html)) html = insertIntoHead(html, '<meta name="robots" content="index,follow,max-image-preview:large">');
  html = upsertMeta(html, 'property', 'og:type', 'website');
  html = upsertMeta(html, 'property', 'og:site_name', 'GNK ASG');
  html = upsertMeta(html, 'property', 'og:title', title);
  html = upsertMeta(html, 'property', 'og:description', description);
  html = upsertMeta(html, 'property', 'og:url', canonical);
  html = socialImage(html, route);
  html = upsertMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = upsertMeta(html, 'name', 'twitter:title', title);
  html = upsertMeta(html, 'name', 'twitter:description', description);
  const beforeJsonLd = html;
  html = updatePageJsonLd(html, route, title, description, language);
  if (html !== beforeJsonLd) stats.schemaUpdated++;

  if (html !== original) {
    stats.changed++;
    stats.changedPages.push(route);
    if (WRITE) fs.writeFileSync(file, html, 'utf8');
  }
}

console.log(JSON.stringify({ ...stats, changedPages: WRITE ? stats.changedPages : stats.changedPages.slice(0, 40) }, null, 2));
