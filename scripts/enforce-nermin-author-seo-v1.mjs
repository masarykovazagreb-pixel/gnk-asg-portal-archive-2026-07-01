#!/usr/bin/env node
// Registry-scoped attribution normalizer for AKTUAL MEDIA columns.
// Nermin is an author only for a verified page-specific byline; editor metadata
// is neutral and hashtags are not injected into article bodies.
import fs from 'node:fs';
import path from 'node:path';
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
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';

const PORTAL = 'apps/portal';
const ROOT = `${PORTAL}/gnk-aktual/kolumne`;
const REGISTRY_FILE = `${PORTAL}/data/editorial-registry.json`;
const WRITE = process.argv.includes('--write');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2]?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") || '';
const insertIntoHead = (html, tag) => html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : `${tag}${html}`;
const typesOf = (value) => (Array.isArray(value?.['@type']) ? value['@type'] : [value?.['@type']]).filter(Boolean);

function normalizeRoute(value) {
  const route = String(value || '').trim().replace(/^\/+|\/+$/g, '');
  return route ? `/${route}/` : '/';
}
function walk(directory, out = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (entry.isFile() && entry.name === 'index.html') out.push(file);
  }
  return out;
}
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
function upsertRelAuthor(html) {
  let found = false;
  const updated = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!attr(tag, 'rel').toLowerCase().split(/\s+/).includes('author')) return tag;
    if (found) return '';
    found = true;
    return /\bhref\s*=/i.test(tag) ? tag.replace(/\bhref\s*=\s*(["'])([\s\S]*?)\1/i, `href="${PERSON_URL}"`) : tag.replace(/\s*\/?>$/, ` href="${PERSON_URL}">`);
  });
  return found ? updated : insertIntoHead(updated, `<link rel="author" href="${PERSON_URL}">`);
}
function removeNerminRelAuthor(html) {
  return html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = attr(tag, 'rel').toLowerCase().split(/\s+/);
    return rel.includes('author') && /nermin-sefic/i.test(attr(tag, 'href')) ? '' : tag;
  });
}
function removeHashtagBlocks(html) {
  return html
    .replace(/<p\b[^>]*class=["'][^"']*\b(?:article-hashtags|article-tags|hashtag-list|article-author-mark)\b[^"']*["'][^>]*>[\s\S]*?<\/p>/gi, '')
    .replace(/<p\b[^>]*data-author-mark=["']nermin-sefic["'][^>]*>[\s\S]*?<\/p>/gi, '');
}
function normalizeVisibleByline(html, item, author) {
  if (isVerifiedNerminAuthor(item)) return html;
  let out = html.replace(/<(aside|section|div)\b[^>]*class=["'][^"']*\b(?:article-author|author-box|author-card)\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, (block) => /nermin\s+sefi[cć]/i.test(block.replace(/<[^>]+>/g, ' ')) ? '' : block);
  out = out.replace(/<p\b[^>]*class=["'][^"']*editorial-author-inline[^"']*["'][^>]*>[\s\S]*?<\/p>/gi, (block) => {
    const text = block.replace(/<[^>]+>/g, ' ');
    return /(?:author|autor)\s*:/i.test(text) && /nermin\s+sefi[cć]/i.test(text) ? '' : block;
  });
  const hasByline = /class=["'][^"']*(?:article-author|author-box|author-card|editorial-author-inline|byline)[^"']*["']/i.test(out);
  if (author && !hasByline) {
    const isEn = /<html\b[^>]*lang=["']en/i.test(out);
    const byline = `<p class="editorial-author-inline"><strong>${isEn ? 'Author' : 'Autor'}:</strong> ${esc(author.name)}</p>`;
    if (out.includes('</article>')) out = out.replace('</article>', `${byline}</article>`);
    else if (out.includes('</main>')) out = out.replace('</main>', `${byline}</main>`);
  }
  return out;
}
function patchArticleJsonLd(html, item, author) {
  return html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (block, raw) => {
    let schema;
    try { schema = JSON.parse(raw); } catch { return block; }
    const visit = (value) => {
      if (Array.isArray(value)) return value.map(visit);
      if (!value || typeof value !== 'object') return value;
      if (typesOf(value).some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type))) {
        value.editor = { ...NERMIN_EDITOR };
        value.publisher ||= { ...GNK_ASG_PUBLISHER };
        value.isPartOf ||= { '@id': WEBSITE_ID };
        if (author) value.author = author;
        else if (isNerminPersonReference(value.author)) delete value.author;
      }
      for (const [key, child] of Object.entries(value)) value[key] = visit(child);
      return value;
    };
    schema = visit(schema);
    return `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
  });
}
function visiblePersonalByline(html) {
  return /<(?:div|p|span|aside)\b[^>]*class=["'][^"']*\b(?:article-meta|meta-row|meta|byline|author-box|author-box-name|author-name|article-author|oznaka)\b[^"']*["'][^>]*>[\s\S]*?nermin\s+sefi[cć][\s\S]*?<\/(?:div|p|span|aside)>/i.test(html);
}
function routeFor(file) {
  const relative = path.relative(PORTAL, file).split(path.sep).join('/');
  return normalizeRoute(`/${relative.replace(/index\.html$/i, '')}`);
}

if (!fs.existsSync(REGISTRY_FILE)) throw new Error(`Missing canonical editorial registry: ${REGISTRY_FILE}`);
const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
const itemsByRoute = new Map((registry.items || []).map((item) => [normalizeRoute(item.path), item]));
const files = walk(ROOT);
const report = {
  version: 'EDITORIAL_COLUMN_ATTRIBUTION_V2',
  mode: WRITE ? 'write' : 'check',
  scanned: files.length,
  eligible: 0,
  unverified: 0,
  protectedSkipped: 0,
  missingRegistry: 0,
  changed: 0,
  verifiedNerminAuthors: 0,
  organizationAuthors: 0,
  authorsOmitted: 0,
  violations: [],
  changedPages: [],
};
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const route = routeFor(file);
  if (isProtectedEditorialRoute(route)) {
    report.protectedSkipped++;
    continue;
  }
  const item = itemsByRoute.get(route);
  if (!item || item.status !== 'published' || item.type !== 'kolumna') {
    report.missingRegistry++;
    continue;
  }
  report.eligible++;
  const before = html;
  const author = articleAuthorFor(item);
  const nermin = isVerifiedNerminAuthor(item);
  if (nermin) {
    if (!visiblePersonalByline(html)) report.violations.push(`${route}: verified Nermin authorship lacks a visible personal byline.`);
    report.verifiedNerminAuthors++;
  } else if (author) report.organizationAuthors++;
  else report.authorsOmitted++;

  if (author) html = upsertMeta(html, 'name', 'author', author.name);
  else html = removeMeta(html, 'name', 'author', (content) => /nermin\s+sefi[cć]/i.test(content));
  html = upsertMeta(html, 'name', 'editor', 'Nermin Sefić');
  if (nermin) {
    html = upsertMeta(html, 'property', 'article:author', PERSON_URL);
    html = upsertRelAuthor(html);
  } else {
    html = removeMeta(html, 'property', 'article:author', (content) => /nermin\s+sefi[cć]|nermin-sefic/i.test(content));
    html = removeNerminRelAuthor(html);
    html = normalizeVisibleByline(html, item, author);
    report.unverified++;
  }
  html = html.replace(/<meta\b[^>]*name=["']author-image["'][^>]*>/gi, (tag) => /nermin|sefi[cć]/i.test(tag) ? '' : tag);
  html = removeHashtagBlocks(html);
  html = patchArticleJsonLd(html, item, author);

  if (html !== before) {
    report.changed++;
    report.changedPages.push(route);
    if (WRITE) fs.writeFileSync(file, html);
  }
}
console.log(JSON.stringify(report, null, 2));
if (report.violations.length) process.exitCode = 1;
