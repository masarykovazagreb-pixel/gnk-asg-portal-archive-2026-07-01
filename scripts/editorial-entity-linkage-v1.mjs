import fs from 'node:fs';
import path from 'node:path';
import {
  SITE,
  PERSON_URL,
  PERSON_ID,
  ORGANIZATION_ID,
  WEBSITE_ID,
  articleAuthorFor,
  isNerminPersonReference,
  isProtectedEditorialItem,
  isVerifiedNerminAuthor,
} from './lib/editorial-attribution-v1.mjs';
import { normalizeEditorialAttributionHtml } from './lib/editorial-html-attribution-v1.mjs';

const PORTAL = 'apps/portal';
const REGISTRY_FILE = `${PORTAL}/data/editorial-registry.json`;
const WRITE = process.argv.includes('--write');
const SOCIAL_CARD = `${SITE}/assets/gnk-asg-social-card.png`;
const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
const stats = {
  mode: WRITE ? 'write' : 'check',
  registryItems: 0,
  eligible: 0,
  protectedSkipped: 0,
  weeklySkipped: 0,
  missingFiles: 0,
  changed: 0,
  nerminAuthor: 0,
  organizationAuthor: 0,
  authorOmitted: 0,
  editorLinked: 0,
};
const changedPages = [];

const escapeAttr = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const attrValue = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  return match ? match[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
};
const insertIntoHead = (html, tag) => html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : `${tag}${html}`;

function upsertMeta(html, keyAttribute, key, value) {
  const safeValue = escapeAttr(value);
  let found = false;
  const updated = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (attrValue(tag, keyAttribute).toLowerCase() !== key.toLowerCase()) return tag;
    if (found) return '';
    found = true;
    const content = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i;
    if (content.test(tag)) return tag.replace(content, `content="${safeValue}"`);
    return tag.replace(/\s*\/?>$/, (end) => ` content="${safeValue}"${end}`);
  });
  return found ? updated : insertIntoHead(updated, `<meta ${keyAttribute}="${escapeAttr(key)}" content="${safeValue}">`);
}

function removeMetaIf(html, keyAttribute, key, predicate) {
  return html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (attrValue(tag, keyAttribute).toLowerCase() !== key.toLowerCase()) return tag;
    return predicate(attrValue(tag, 'content')) ? '' : tag;
  });
}

function normalizeAuthorMeta(html, item) {
  const author = articleAuthorFor(item);
  if (author) {
    html = upsertMeta(html, 'name', 'author', author.name);
  } else {
    html = removeMetaIf(html, 'name', 'author', (content) => /nermin\s+sefi[cć]/i.test(content));
  }
  html = upsertMeta(html, 'name', 'editor', 'Nermin Sefić');

  if (isVerifiedNerminAuthor(item)) {
    html = upsertMeta(html, 'property', 'article:author', PERSON_URL);
    if (!/<link\b[^>]*rel=["']author["']/i.test(html)) {
      html = insertIntoHead(html, `<link rel="author" href="${PERSON_URL}">`);
    }
  } else {
    html = removeMetaIf(html, 'property', 'article:author', (content) => /nermin\s+sefi[cć]|nermin-sefic/i.test(content));
    html = html.replace(/<link\b[^>]*>/gi, (tag) => {
      const rel = attrValue(tag, 'rel').toLowerCase().split(/\s+/);
      const href = attrValue(tag, 'href');
      return rel.includes('author') && /nermin-sefic/i.test(href) ? '' : tag;
    });
  }
  return html;
}

function isArticleType(value) {
  const types = Array.isArray(value?.['@type']) ? value['@type'] : [value?.['@type']];
  return types.some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type));
}

const CORE_SOCIAL_TOKENS = ['GNKASG', 'GNKDINAMOLtd', 'BusinessIntelligence'];
const normalizedSocialToken = (value) => String(value || '').replace(/^#+/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const socialTokenSetFor = (item) => new Set([...CORE_SOCIAL_TOKENS, ...(Array.isArray(item?.hashtags) ? item.hashtags : [])].map(normalizedSocialToken));

function stripSocialTagsFromAbout(value, item) {
  const socialTokens = socialTokenSetFor(item);
  const isSocialTag = (entry) => {
    const name = typeof entry === 'string' ? entry : entry?.name;
    return Boolean(name) && (String(name).trim().startsWith('#') || socialTokens.has(normalizedSocialToken(name)));
  };
  if (Array.isArray(value)) {
    const kept = value.filter((entry) => !isSocialTag(entry));
    return kept.length ? kept : undefined;
  }
  return isSocialTag(value) ? undefined : value;
}

function stripNerminFromAbout(value, item) {
  const socialCleaned = stripSocialTagsFromAbout(value, item);
  if (socialCleaned === undefined || /nermin\s+sefi[cć]/i.test(`${item.title || ''} ${item.description || ''}`)) return socialCleaned;
  const wasArray = Array.isArray(socialCleaned);
  const values = wasArray ? socialCleaned : [socialCleaned];
  const kept = values.filter((entry) => !isNerminPersonReference(entry));
  if (!kept.length) return undefined;
  return wasArray ? kept : kept[0];
}

function cleanKeywords(value, item) {
  const socialTokens = socialTokenSetFor(item);
  const keep = (entry) => {
    const text = String(entry || '').trim();
    return text && !text.startsWith('#') && !/nermin\s+sefi[cć]/i.test(text) && !socialTokens.has(normalizedSocialToken(text));
  };
  if (Array.isArray(value)) {
    const kept = value.filter(keep);
    return kept.length ? kept : undefined;
  }
  if (typeof value === 'string') {
    const kept = value.split(',').map((entry) => entry.trim()).filter(keep);
    return kept.length ? kept.join(', ') : undefined;
  }
  return value;
}

function updateArticleNode(node, item, imageUrl) {
  const author = articleAuthorFor(item);
  node.editor = { '@id': PERSON_ID, '@type': 'Person', name: 'Nermin Sefić', url: PERSON_URL };
  node.publisher = { '@id': ORGANIZATION_ID, '@type': 'Organization', name: 'GNK ASG d.o.o.', url: `${SITE}/` };
  node.isPartOf ||= { '@id': WEBSITE_ID };
  node.url = item.url;
  node.mainEntityOfPage = { '@type': 'WebPage', '@id': item.url };
  node.headline ||= item.title;
  if (item.description) node.description = item.description;
  node.inLanguage ||= item.language === 'en' ? 'en' : 'hr';
  if (item.publishedAt) node.datePublished ||= item.publishedAt;
  if (item.modifiedAt) node.dateModified = item.modifiedAt;
  if (author) {
    node.author = author;
  } else if (isNerminPersonReference(node.author)) {
    delete node.author;
  }
  if ('about' in node) {
    const about = stripNerminFromAbout(node.about, item);
    if (about === undefined) delete node.about;
    else node.about = about;
  }
  if ('keywords' in node) {
    const keywords = cleanKeywords(node.keywords, item);
    if (keywords === undefined) delete node.keywords;
    else node.keywords = keywords;
  }
  if (!node.image && imageUrl) node.image = { '@type': 'ImageObject', url: imageUrl };
  return node;
}

function updateJsonLd(html, item, imageUrl, { removeArticles = false } = {}) {
  let foundArticle = false;
  let editorLinked = false;
  const REMOVE = Symbol('remove-duplicate-or-forbidden-article');
  const updated = html.replace(/<script\b([^>]*)type=["']application\/ld\+json["']([^>]*)>([\s\S]*?)<\/script>/gi, (block, before, after, raw) => {
    let schema;
    try { schema = JSON.parse(raw); } catch { return block; }
    const visit = (value) => {
      if (Array.isArray(value)) {
        const kept = [];
        for (const entry of value) {
          const next = visit(entry);
          if (next !== REMOVE) kept.push(next);
        }
        return kept;
      }
      if (!value || typeof value !== 'object') return value;
      if (isArticleType(value)) {
        if (removeArticles || foundArticle) return REMOVE;
        foundArticle = true;
        updateArticleNode(value, item, imageUrl);
        editorLinked = true;
      } else {
        if ('about' in value) {
          const about = stripSocialTagsFromAbout(value.about, item);
          if (about === undefined) delete value.about;
          else value.about = about;
        }
        if ('keywords' in value) {
          const keywords = cleanKeywords(value.keywords, item);
          if (keywords === undefined) delete value.keywords;
          else value.keywords = keywords;
        }
      }
      for (const [key, child] of Object.entries(value)) {
        const next = visit(child);
        if (next === REMOVE) delete value[key];
        else value[key] = next;
      }
      return value;
    };
    schema = visit(schema);
    if (schema === REMOVE) return '';
    return `<script${before}type="application/ld+json"${after}>${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
  });
  if (!foundArticle && !removeArticles) {
    const author = articleAuthorFor(item);
    const article = {
      '@context': 'https://schema.org',
      '@type': item.type === 'komentar' || item.type === 'kolumna' ? 'OpinionNewsArticle' : 'Article',
      mainEntityOfPage: { '@type': 'WebPage', '@id': item.url },
      headline: String(item.title || '').slice(0, 110),
      description: item.description || '',
      inLanguage: item.language === 'en' ? 'en' : 'hr',
      editor: { '@id': PERSON_ID, '@type': 'Person', name: 'Nermin Sefić', url: PERSON_URL },
      publisher: { '@id': ORGANIZATION_ID, '@type': 'Organization', name: 'GNK ASG d.o.o.', url: `${SITE}/` },
      isPartOf: { '@id': WEBSITE_ID },
      url: item.url,
    };
    if (author) article.author = author;
    if (imageUrl) article.image = { '@type': 'ImageObject', url: imageUrl };
    if (item.publishedAt) article.datePublished = item.publishedAt;
    if (item.modifiedAt) article.dateModified = item.modifiedAt;
    return {
      html: insertIntoHead(updated, `<script type="application/ld+json">${JSON.stringify(article).replace(/</g, '\\u003c')}</script>`),
      editorLinked: true,
    };
  }
  return { html: updated, editorLinked };
}

function normalizeVisibleAttribution(html, item) {
  let out = html
    .replace(/<(aside|section|div|p)\b[^>]*class=["'][^"']*\b(?:article-author|author-box|author-card|byline|author-meta)\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, (block) => /nermin\s+sefi[cć]/i.test(block.replace(/<[^>]+>/g, ' ')) && !isVerifiedNerminAuthor(item) ? '' : block)
    .replace(/<p\b[^>]*class=["'][^"']*editorial-author-inline[^"']*["'][^>]*>[\s\S]*?<\/p>/gi, (block) => {
      const text = block.replace(/<[^>]+>/g, ' ');
      return /(?:author|autor)\s*:/i.test(text) && /nermin\s+sefi[cć]/i.test(text) && !isVerifiedNerminAuthor(item) ? '' : block;
    })
    .replace(/<p\b[^>]*data-author-mark=["']nermin-sefic["'][^>]*>[\s\S]*?<\/p>/gi, '');
  const author = articleAuthorFor(item);
  if (!author) return out;
  const body = out.split(/<body\b[^>]*>/i)[1] || out;
  const hasMatchingByline = /class=["'][^"']*(?:article-author|author-box|author-card|editorial-author-inline|byline)[^"']*["']/i.test(body)
    && body.includes(author.name);
  if (hasMatchingByline) return out;
  const isEn = item.language === 'en';
  const byline = `<p class="editorial-author-inline"><strong>${isEn ? 'Author' : 'Autor'}:</strong> ${escapeAttr(author.name)}</p>`;
  if (out.includes('</article>')) return out.replace('</article>', `${byline}</article>`);
  if (out.includes('</main>')) return out.replace('</main>', `${byline}</main>`);
  return out;
}

function currentOgImage(html) {
  const tag = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0])
    .find((tag) => attrValue(tag, 'property').toLowerCase() === 'og:image');
  return tag ? attrValue(tag, 'content') : '';
}

function localRegistryImage(item) {
  const candidate = String(item.image || '');
  try {
    const url = candidate.startsWith('/') ? new URL(candidate, SITE) : new URL(candidate);
    if (url.origin !== SITE) return '';
    if (isProtectedEditorialItem({ path: url.pathname }) || /\/assets\/people\/nermin-sefic\//i.test(url.pathname)) return '';
    const file = path.join(PORTAL, url.pathname.replace(/^\/+/, ''));
    return fs.existsSync(file) ? `${SITE}${url.pathname}` : '';
  } catch {
    return '';
  }
}

function normalizeCanonicalUrl(html, item) {
  if (!item.url) return html;
  let found = false;
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = attrValue(tag, 'rel').toLowerCase().split(/\s+/);
    if (!rel.includes('canonical')) return tag;
    if (found) return '';
    found = true;
    if (/\bhref\s*=\s*(["'])/i.test(tag)) {
      return tag.replace(/\bhref\s*=\s*(["'])[\s\S]*?\1/i, `href="${escapeAttr(item.url)}"`);
    }
    return tag.replace(/\s*\/?>$/, (end) => ` href="${escapeAttr(item.url)}"${end}`);
  });
  if (!found) html = insertIntoHead(html, `<link rel="canonical" href="${escapeAttr(item.url)}">`);
  return upsertMeta(html, 'property', 'og:url', item.url);
}

function normalizeSocialImage(html, item) {
  const registryImage = localRegistryImage(item);
  const existing = currentOgImage(html);
  const invalidGeneric = /market-information\.svg(?:$|[?#])/i.test(existing);
  const unrelatedPortrait = /\/assets\/people\/nermin-sefic\//i.test(existing);
  const nextImage = (!existing || invalidGeneric || unrelatedPortrait)
    ? (registryImage || SOCIAL_CARD)
    : existing;
  html = upsertMeta(html, 'property', 'og:image', nextImage);
  html = upsertMeta(html, 'property', 'og:image:alt', nextImage === SOCIAL_CARD
    ? 'GNK ASG d.o.o. corporate editorial card'
    : `Editorial illustration for: ${item.title || 'GNK ASG publication'}`);

  const twitterTag = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0])
    .find((tag) => attrValue(tag, 'name').toLowerCase() === 'twitter:image');
  const twitterImage = twitterTag ? attrValue(twitterTag, 'content') : '';
  if (!twitterImage || /\/assets\/people\/nermin-sefic\//i.test(twitterImage) || invalidGeneric) {
    html = upsertMeta(html, 'name', 'twitter:image', nextImage);
  }
  html = upsertMeta(html, 'name', 'twitter:card', 'summary_large_image');
  return { html, imageUrl: nextImage };
}

for (const item of registry.items || []) {
  stats.registryItems++;
  if (isProtectedEditorialItem(item)) {
    stats.protectedSkipped++;
    continue;
  }
  const relativePath = String(item.path || '').replace(/^\/+|\/+$/g, '');
  if (!relativePath) {
    stats.missingFiles++;
    continue;
  }
  const file = path.join(PORTAL, relativePath, 'index.html');
  if (!fs.existsSync(file)) {
    stats.missingFiles++;
    continue;
  }
  // Weekly editions are aggregated, not personal articles: normalize only their
  // Article JSON-LD so social hashtags stay out of `about` and `keywords`.
  if (item.type === 'tjednik') {
    stats.weeklySkipped++;
    const original = fs.readFileSync(file, 'utf8');
    const normalized = updateJsonLd(original, item, '', { removeArticles: true }).html;
    if (normalized !== original) {
      stats.changed++;
      changedPages.push(item.path);
      if (WRITE) fs.writeFileSync(file, normalized, 'utf8');
    }
    continue;
  }

  stats.eligible++;
  let html = fs.readFileSync(file, 'utf8');
  const original = html;
  html = normalizeCanonicalUrl(html, item);
  const social = normalizeSocialImage(html, item);
  html = social.html;
  html = normalizeAuthorMeta(html, item);
  html = normalizeVisibleAttribution(html, item);
  html = updateJsonLd(html, item, social.imageUrl).html;
  html = normalizeEditorialAttributionHtml(html, item).html;

  if (isVerifiedNerminAuthor(item)) stats.nerminAuthor++;
  else if (articleAuthorFor(item)) stats.organizationAuthor++;
  else stats.authorOmitted++;
  stats.editorLinked++;

  if (html !== original) {
    stats.changed++;
    changedPages.push(item.path);
    if (WRITE) fs.writeFileSync(file, html, 'utf8');
  }
}

console.log(JSON.stringify({ ...stats, changedPages: WRITE ? changedPages : changedPages.slice(0, 30) }, null, 2));
