// Compatibility name retained for existing workflows. This step no longer
// inserts personal hashtag markers. Hashtags remain social-distribution data;
// page authorship and editorial responsibility come from the canonical registry.
import fs from 'node:fs';
import path from 'node:path';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';
import {
  SITE,
  PERSON_URL,
  NERMIN_EDITOR,
  GNK_ASG_PUBLISHER,
  WEBSITE_ID,
  articleAuthorFor,
  isNerminPersonReference,
  isVerifiedNerminAuthor,
} from './lib/editorial-attribution-v1.mjs';
import { cleanSocialAbout, cleanSocialKeywords } from './lib/editorial-html-attribution-v1.mjs';

const ROOT = path.resolve('apps/portal');
const REGISTRY_FILE = path.join(ROOT, 'data/editorial-registry.json');
const WRITE = process.argv.includes('--write');
const REGISTRY = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const unescape = (value) => String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const attr = (tag, name) => unescape(tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2] || '');
const normalizeRoute = (value) => {
  const route = String(value || '').trim().replace(/^\/+|\/+$/g, '');
  return route ? `/${route}/` : '/';
};
const insertIntoHead = (html, tag) => html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : `${tag}${html}`;
function upsertMeta(html, keyAttr, key, value) {
  let found = false;
  const updated = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (attr(tag, keyAttr).toLowerCase() !== key.toLowerCase()) return tag;
    if (found) return '';
    found = true;
    const content = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i;
    return content.test(tag) ? tag.replace(content, `content="${esc(value)}"`) : tag.replace(/\s*\/?>$/, (end) => ` content="${esc(value)}"${end}`);
  });
  return found ? updated : insertIntoHead(updated, `<meta ${keyAttr}="${esc(key)}" content="${esc(value)}">`);
}
function removeMeta(html, keyAttr, key, predicate) {
  return html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (attr(tag, keyAttr).toLowerCase() !== key.toLowerCase()) return tag;
    return predicate(attr(tag, 'content')) ? '' : tag;
  });
}
function upsertAuthorLink(html) {
  let found = false;
  const updated = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!attr(tag, 'rel').toLowerCase().split(/\s+/).includes('author')) return tag;
    if (found) return '';
    found = true;
    return /\bhref\s*=/i.test(tag) ? tag.replace(/\bhref\s*=\s*(["'])([\s\S]*?)\1/i, `href="${PERSON_URL}"`) : tag.replace(/\s*\/?>$/, ` href="${PERSON_URL}">`);
  });
  return found ? updated : insertIntoHead(updated, `<link rel="author" href="${PERSON_URL}">`);
}
function removeNerminAuthorLink(html) {
  return html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = attr(tag, 'rel').toLowerCase().split(/\s+/);
    const href = attr(tag, 'href');
    return rel.includes('author') && /nermin-sefic/i.test(href) ? '' : tag;
  });
}
function cleanKeywordTags(html, item) {
  return html.replace(/<meta\b[^>]*\bname=["'](?:keywords|news_keywords)["'][^>]*>/gi, (tag) => {
    const keywords = cleanSocialKeywords(attr(tag, 'content'), item);
    return keywords === undefined ? '' : tag.replace(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i, `content="${esc(keywords)}"`);
  });
}
function cleanSocialArticleTags(html) {
  return html.replace(/<meta\b[^>]*property=["']article:tag["'][^>]*>/gi, (tag) => {
    const content = attr(tag, 'content');
    return /nermin|sefi[cć]|^#/i.test(content) ? '' : tag;
  });
}
function removeSocialHashtagBlocks(html) {
  return html
    .replace(/<(?:p|div|ul)\b[^>]*class=["'][^"']*\b(?:article-hashtags|article-tags|hashtag-list|article-author-mark)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:p|div|ul)>/gi, '')
    .replace(/<p\b[^>]*data-author-mark=["']nermin-sefic["'][^>]*>[\s\S]*?<\/p>/gi, '');
}
function removeUnverifiedByline(html) {
  let out = html.replace(/<(aside|section|div)\b[^>]*class=["'][^"']*\b(?:article-author|author-box|author-card)\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, (block) => /nermin\s+sefi[cć]/i.test(block.replace(/<[^>]+>/g, ' ')) ? '' : block);
  out = out.replace(/<p\b[^>]*class=["'][^"']*editorial-author-inline[^"']*["'][^>]*>[\s\S]*?<\/p>/gi, (block) => {
    const text = block.replace(/<[^>]+>/g, ' ');
    return /(?:author|autor)\s*:/i.test(text) && /nermin\s+sefi[cć]/i.test(text) ? '' : block;
  });
  return out;
}
function patchArticleSchemas(html, item) {
  const author = articleAuthorFor(item);
  let sawArticle = false;
  return html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (block, raw) => {
    let schema;
    try { schema = JSON.parse(raw); } catch { return block; }
    const visit = (value) => {
      if (Array.isArray(value)) return value.map(visit);
      if (!value || typeof value !== 'object') return value;
      const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
      if (types.includes('WebSite')) {
        value.name = 'GNK ASG';
        delete value.keywords;
      } else if ('keywords' in value) {
        const keywords = cleanSocialKeywords(value.keywords, item);
        if (keywords === undefined) delete value.keywords;
        else value.keywords = keywords;
      }
      if (types.some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type))) {
        sawArticle = true;
        value.editor = { ...NERMIN_EDITOR };
        value.publisher ||= { ...GNK_ASG_PUBLISHER };
        value.isPartOf ||= { '@id': WEBSITE_ID };
        if (author) value.author = author;
        else if (isNerminPersonReference(value.author)) delete value.author;
        if ('about' in value) {
          const about = cleanSocialAbout(value.about, item);
          if (about === undefined) delete value.about;
          else value.about = about;
        }
      }
      for (const [key, child] of Object.entries(value)) value[key] = visit(child);
      return value;
    };
    schema = visit(schema);
    return `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
  });
}

const stats = {
  mode: WRITE ? 'write' : 'check',
  registryItems: 0,
  eligible: 0,
  protectedSkipped: 0,
  missingFiles: 0,
  changed: 0,
  personalAuthorsVerified: 0,
  organizationAuthors: 0,
  personalAuthorsRemoved: 0,
  editorReferences: 0,
};
const changedRoutes = [];
for (const item of REGISTRY.items || []) {
  stats.registryItems++;
  if (item.status !== 'published' || !['objava', 'komentar', 'analiza', 'kolumna'].includes(item.type)) continue;
  const route = normalizeRoute(item.path);
  if (isProtectedEditorialRoute(route)) {
    stats.protectedSkipped++;
    continue;
  }
  const relative = route.replace(/^\/+|\/+$/g, '');
  if (!relative || relative.split('/').some((part) => part === '..')) {
    stats.missingFiles++;
    continue;
  }
  const file = path.resolve(ROOT, relative, 'index.html');
  if (!file.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(file)) {
    stats.missingFiles++;
    continue;
  }
  stats.eligible++;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const author = articleAuthorFor(item);
  const wasPersonalAuthor = /<meta\b[^>]*name=["']author["'][^>]*content=["'][^"']*nermin\s+sefi[cć]/i.test(html)
    || /<meta\b[^>]*property=["']article:author["'][^>]*content=["'][^"']*(?:nermin\s+sefi[cć]|nermin-sefic)/i.test(html);
  if (author) html = upsertMeta(html, 'name', 'author', author.name);
  else html = removeMeta(html, 'name', 'author', (content) => /nermin\s+sefi[cć]/i.test(content));
  html = upsertMeta(html, 'name', 'editor', 'Nermin Sefić');
  if (isVerifiedNerminAuthor(item)) {
    html = upsertMeta(html, 'property', 'article:author', PERSON_URL);
    html = upsertAuthorLink(html);
    stats.personalAuthorsVerified++;
  } else {
    html = removeMeta(html, 'property', 'article:author', (content) => /nermin\s+sefi[cć]|nermin-sefic/i.test(content));
    html = removeNerminAuthorLink(html);
    html = removeUnverifiedByline(html);
    if (wasPersonalAuthor) stats.personalAuthorsRemoved++;
  }
  if (author && author['@type'] === 'Organization') stats.organizationAuthors++;
  html = cleanKeywordTags(html, item);
  html = cleanSocialArticleTags(html);
  html = removeSocialHashtagBlocks(html);
  html = patchArticleSchemas(html, item);
  stats.editorReferences++;
  if (html !== before) {
    stats.changed++;
    changedRoutes.push(route);
    if (WRITE) fs.writeFileSync(file, html, 'utf8');
  }
}
console.log(JSON.stringify({ ...stats, changedRoutes: WRITE ? changedRoutes : changedRoutes.slice(0, 40) }, null, 2));
