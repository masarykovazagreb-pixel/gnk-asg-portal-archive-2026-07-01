import {
  SITE,
  PERSON_URL,
  NERMIN_EDITOR,
  GNK_ASG_PUBLISHER,
  WEBSITE_ID,
  articleAuthorFor,
  isNerminPersonReference,
  isVerifiedNerminAuthor,
} from './editorial-attribution-v1.mjs';
import { socialHashtagsFor } from './social-hashtags-v1.mjs';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const unesc = (value) => String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const attr = (tag, name) => unesc(tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2] || '');
const insertHead = (html, tag) => html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : `${tag}${html}`;
const typesOf = (value) => (Array.isArray(value?.['@type']) ? value['@type'] : [value?.['@type']]).filter(Boolean);

function upsertMeta(html, keyAttr, key, value) {
  let found = false;
  const updated = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (attr(tag, keyAttr).toLowerCase() !== key.toLowerCase()) return tag;
    if (found) return '';
    found = true;
    const content = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i;
    return content.test(tag) ? tag.replace(content, `content="${esc(value)}"`) : tag.replace(/\s*\/?>$/, (end) => ` content="${esc(value)}"${end}`);
  });
  return found ? updated : insertHead(updated, `<meta ${keyAttr}="${esc(key)}" content="${esc(value)}">`);
}
function removeMeta(html, keyAttr, key, predicate) {
  return html.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (attr(tag, keyAttr).toLowerCase() !== key.toLowerCase()) return tag;
    return predicate(attr(tag, 'content')) ? '' : tag;
  });
}
function removeNerminAuthorLink(html) {
  return html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = attr(tag, 'rel').toLowerCase().split(/\s+/);
    return rel.includes('author') && /nermin-sefic/i.test(attr(tag, 'href')) ? '' : tag;
  });
}
function upsertNerminAuthorLink(html) {
  let found = false;
  const updated = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!attr(tag, 'rel').toLowerCase().split(/\s+/).includes('author')) return tag;
    if (found) return '';
    found = true;
    return /\bhref\s*=/i.test(tag) ? tag.replace(/\bhref\s*=\s*(["'])([\s\S]*?)\1/i, `href="${PERSON_URL}"`) : tag.replace(/\s*\/?>$/, ` href="${PERSON_URL}">`);
  });
  return found ? updated : insertHead(updated, `<link rel="author" href="${PERSON_URL}">`);
}
function stripPersonalVisibleByline(html) {
  let out = html.replace(/<(aside|section|div|p)\b[^>]*class=["'][^"']*\b(?:article-author|author-box|author-card|byline|author-meta|article-meta)\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, (block) => {
    const text = block.replace(/<[^>]+>/g, ' ');
    return /nermin\s+sefi[cć]/i.test(text) ? '' : block;
  });
  out = out.replace(/<p\b[^>]*class=["'][^"']*editorial-author-inline[^"']*["'][^>]*>[\s\S]*?<\/p>/gi, (block) => {
    const text = block.replace(/<[^>]+>/g, ' ');
    return /(?:author|autor)\s*:/i.test(text) && /nermin\s+sefi[cć]/i.test(text) ? '' : block;
  });
  return out;
}
function stripSocialTagBlocks(html) {
  return html
    .replace(/<(?:p|div|ul)\b[^>]*class=["'][^"']*\b(?:article-hashtags|article-tags|hashtag-list|article-author-mark)\b[^"']*["'][^>]*>[\s\S]*?<\/(?:p|div|ul)>/gi, '')
    .replace(/<p\b[^>]*data-author-mark=["']nermin-sefic["'][^>]*>[\s\S]*?<\/p>/gi, '');
}
function cleanKeywords(html, item) {
  return html.replace(/<meta\b[^>]*\bname=["'](?:keywords|news_keywords)["'][^>]*>/gi, (tag) => {
    const keywords = cleanSocialKeywords(attr(tag, 'content'), item);
    if (keywords === undefined) return '';
    return tag.replace(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i, `content="${esc(keywords)}"`);
  });
}
function cleanArticleTags(html) {
  return html.replace(/<meta\b[^>]*property=["']article:tag["'][^>]*>/gi, (tag) => {
    const content = attr(tag, 'content');
    return /^#/u.test(content) || /nermin|sefi[cć]/i.test(content) ? '' : tag;
  });
}
const normalizeSocialToken = (value) => String(value || '').replace(/^#+/, '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const CORE_SOCIAL_TAGS = ['GNKASG', 'GNKDINAMOLtd', 'BusinessIntelligence'];

export function cleanSocialKeywords(value, item) {
  const socialTokens = new Set([...(item ? CORE_SOCIAL_TAGS : []), ...(Array.isArray(item?.hashtags) ? item.hashtags : [])].map(normalizeSocialToken));
  const isExcluded = (entry) => {
    const word = typeof entry === 'string' ? entry : entry && typeof entry === 'object' ? entry.name : '';
    return Boolean(word) && (String(word).trim().startsWith('#') || /nermin|sefi[cć]/i.test(String(word)) || socialTokens.has(normalizeSocialToken(word)));
  };
  const wasArray = Array.isArray(value);
  const words = wasArray ? value : typeof value === 'string' ? value.split(',') : null;
  if (!words) return value;
  const kept = [];
  const seen = new Set();
  for (const entry of words) {
    const word = typeof entry === 'string' ? entry.trim() : entry;
    const name = typeof word === 'string' ? word : word && typeof word === 'object' ? word.name : '';
    if (!name || isExcluded(word)) continue;
    const token = normalizeSocialToken(name);
    if (token && seen.has(token)) continue;
    if (token) seen.add(token);
    kept.push(word);
  }
  if (!kept.length) return undefined;
  return wasArray ? kept : kept.map((word) => typeof word === 'string' ? word : word.name).join(', ');
}

export function cleanSocialAbout(value, item) {
  const tags = new Set([...CORE_SOCIAL_TAGS, ...(Array.isArray(item?.hashtags) ? item.hashtags : [])].map(normalizeSocialToken));
  const isSocialTag = (entry) => {
    const name = typeof entry === 'string' ? entry : entry && typeof entry === 'object' ? entry.name : '';
    return Boolean(name) && (String(name).trim().startsWith('#') || tags.has(normalizeSocialToken(name)));
  };
  if (Array.isArray(value)) {
    const kept = value.filter((entry) => !isSocialTag(entry));
    return kept.length ? kept : undefined;
  }
  return isSocialTag(value) ? undefined : value;
}

function patchSchemas(html, item, author) {
  return html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (block, raw) => {
    let schema;
    try { schema = JSON.parse(raw); } catch { return block; }
    const visit = (value) => {
      if (Array.isArray(value)) return value.map(visit);
      if (!value || typeof value !== 'object') return value;
      const types = typesOf(value);
      if (types.includes('WebSite')) {
        value.name = 'GNK ASG';
        delete value.keywords;
      } else if ('keywords' in value) {
        const keywords = cleanSocialKeywords(value.keywords, item);
        if (keywords === undefined) delete value.keywords;
        else value.keywords = keywords;
      }
      if (types.some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type))) {
        value.editor = { ...NERMIN_EDITOR };
        value.publisher = { ...GNK_ASG_PUBLISHER };
        value.isPartOf ||= { '@id': WEBSITE_ID };
        if (author) value.author = author;
        else if (isNerminPersonReference(value.author)) delete value.author;
        if ('about' in value) {
          const about = cleanSocialAbout(value.about, item);
          if (about === undefined) delete value.about;
          else value.about = about;
        }
        if (item.language) value.inLanguage = item.language;
      }
      for (const [key, child] of Object.entries(value)) value[key] = visit(child);
      return value;
    };
    schema = visit(schema);
    return `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;
  });
}

/** Normalize an HTML publication from a registry/queue-author decision. */
export function normalizeEditorialAttributionHtml(html, item) {
  const author = articleAuthorFor(item);
  const verified = isVerifiedNerminAuthor(item);
  let out = html;
  if (author) out = upsertMeta(out, 'name', 'author', author.name);
  else out = removeMeta(out, 'name', 'author', (content) => /nermin\s+sefi[cć]/i.test(content));
  out = upsertMeta(out, 'name', 'editor', 'Nermin Sefić');
  if (verified) {
    out = upsertMeta(out, 'property', 'article:author', PERSON_URL);
    out = upsertNerminAuthorLink(out);
  } else {
    out = removeMeta(out, 'property', 'article:author', (content) => /nermin\s+sefi[cć]|nermin-sefic/i.test(content));
    out = removeNerminAuthorLink(out);
    out = stripPersonalVisibleByline(out);
  }
  out = out.replace(/<meta\b[^>]*name=["']author-image["'][^>]*>/gi, (tag) => /nermin|sefi[cć]/i.test(tag) ? '' : tag);
  out = cleanKeywords(out, item);
  out = cleanArticleTags(out);
  out = stripSocialTagBlocks(out);
  out = patchSchemas(out, item, author);
  return { html: out, author, verified };
}

export function extractSocialHashtags(html, item, fallback = ['GNKASG']) {
  const block = html.match(/<p\b[^>]*class=["'][^"']*\b(?:article-hashtags|article-tags|hashtag-list)\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
  const candidates = block.match(/#[^\s<]+/gu)?.map((tag) => tag.replace(/^#+/, '')) || [];
  return socialHashtagsFor(item, candidates, fallback);
}
