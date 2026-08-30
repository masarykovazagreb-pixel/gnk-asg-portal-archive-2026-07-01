import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const MIN_WORDS = Number(process.env.DIRECT_EDITORIAL_MIN_WORDS || 3000);
const MIN_INTERNAL_LINKS = Number(process.env.DIRECT_EDITORIAL_MIN_INTERNAL_LINKS || 5);
const SITE_ORIGIN = 'https://gnk-asg.hr';
const TARGET = /^apps\/portal\/(objave|publications|komentari|comments|analize|analysis)\/.+\/index\.html$/;
const EXCEPTION_META = /<meta\s+name=["']editorial-policy-exception["']\s+content=["']digital-workforce-worker["']\s*\/?\s*>/iu;
const ARTICLE_TYPES = new Set(['Article', 'NewsArticle', 'OpinionNewsArticle', 'AnalysisNewsArticle', 'Report']);
const LOCKED_AUTHORED_STATEMENTS = new Set([
  'apps/portal/objave/osvrt-na-2013-omega-factoring-nermin-sefic/index.html',
  'apps/portal/objave/ai-radna-snaga-ai-workforce-u-tisku/index.html',
  'apps/portal/objave/koncar-gnk-asg-504-milijuna-ai-radna-snaga-izvoz/index.html',
  'apps/portal/objave/filip-hrgovic-svjetski-prvak-ibf-gnk-asg-cestitka/index.html',
]);
const segmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('hr', { granularity: 'word' })
  : null;

if (!Number.isInteger(MIN_WORDS) || MIN_WORDS < 1) throw new Error('Invalid DIRECT_EDITORIAL_MIN_WORDS');
if (!Number.isInteger(MIN_INTERNAL_LINKS) || MIN_INTERNAL_LINKS < 1) throw new Error('Invalid DIRECT_EDITORIAL_MIN_INTERNAL_LINKS');

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&#(\d+);/gu, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/giu, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)));
}

function stripMarkup(value) {
  return decodeEntities(String(value || '')
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/giu, ' ')
    .replace(/<[^>]+>/gu, ' '))
    .replace(/\s+/gu, ' ')
    .trim();
}

function countWords(value) {
  const text = stripMarkup(value);
  if (!text) return 0;
  if (segmenter) return [...segmenter.segment(text)].filter(part => part.isWordLike).length;
  return (text.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu) || []).length;
}

function firstMatch(html, expression) {
  const match = html.match(expression);
  return match ? decodeEntities(match[1]).trim() : '';
}

function metaContent(html, key, attribute = 'name') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const forward = new RegExp(`<meta\\s+[^>]*${attribute}=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'iu');
  const reverse = new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${escaped}["'][^>]*>`, 'iu');
  return firstMatch(html, forward) || firstMatch(html, reverse);
}

function linkHref(html, relValue, hreflang = null) {
  const tags = html.match(/<link\b[^>]*>/giu) || [];
  for (const tag of tags) {
    const rel = firstMatch(tag, /\brel=["']([^"']+)["']/iu).toLowerCase().split(/\s+/u);
    const lang = firstMatch(tag, /\bhreflang=["']([^"']+)["']/iu).toLowerCase();
    if (!rel.includes(relValue.toLowerCase())) continue;
    if (hreflang && lang !== hreflang.toLowerCase()) continue;
    const href = firstMatch(tag, /\bhref=["']([^"']+)["']/iu);
    if (href) return href;
  }
  return '';
}

function extractArticleHtml(html) {
  return firstMatch(html, /<article\b[^>]*>([\s\S]*?)<\/article>/iu)
    || firstMatch(html, /<main\b[^>]*>([\s\S]*?)<\/main>/iu)
    || html;
}

function extractJsonLd(html) {
  const blocks = [];
  const expression = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu;
  for (const match of html.matchAll(expression)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (error) {
      blocks.push({ __parseError: error.message });
    }
  }
  return blocks;
}

function flattenSchema(value, output = []) {
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    for (const entry of value) flattenSchema(entry, output);
    return output;
  }
  output.push(value);
  if (Array.isArray(value['@graph'])) flattenSchema(value['@graph'], output);
  return output;
}

function typeList(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function expectedCanonical(file) {
  const relative = file
    .replace(/^apps\/portal/u, '')
    .replace(/index\.html$/u, '')
    .replace(/\\/gu, '/');
  return `${SITE_ORIGIN}${relative}`;
}

function changedFiles() {
  const explicit = process.argv.slice(2).filter(Boolean);
  if (explicit.length) return explicit;
  if (process.env.DIRECT_EDITORIAL_ALL === '1') {
    const roots = ['objave', 'publications', 'komentari', 'comments', 'analize', 'analysis'];
    const found = [];
    for (const root of roots) {
      const start = path.join(ROOT, 'apps/portal', root);
      if (!fs.existsSync(start)) continue;
      const stack = [start];
      while (stack.length) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) stack.push(full);
          else if (entry.name === 'index.html') found.push(path.relative(ROOT, full).replace(/\\/gu, '/'));
        }
      }
    }
    return found;
  }

  const base = process.env.GITHUB_BASE_SHA || process.env.DIRECT_EDITORIAL_BASE_SHA;
  const head = process.env.GITHUB_SHA || process.env.DIRECT_EDITORIAL_HEAD_SHA || 'HEAD';
  if (!base) throw new Error('Missing GITHUB_BASE_SHA or explicit file arguments');
  const output = execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', `${base}...${head}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return output.split(/\r?\n/u).map(value => value.trim()).filter(Boolean);
}

function validate(file) {
  const errors = [];
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute)) return { file, skipped: true, reason: 'missing-after-diff', errors };
  const html = fs.readFileSync(absolute, 'utf8');

  if (EXCEPTION_META.test(html)) {
    return { file, skipped: true, reason: 'digital-workforce-worker-exception', errors };
  }

  if (LOCKED_AUTHORED_STATEMENTS.has(file)) {
    return { file, skipped: true, reason: 'locked-authored-statement-exception', errors };
  }

  const articleHtml = extractArticleHtml(html);
  const wordCount = countWords(articleHtml);
  const title = stripMarkup(firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/iu));
  const description = metaContent(html, 'description');
  const canonical = linkHref(html, 'canonical');
  const expected = expectedCanonical(file);
  const h1Count = (articleHtml.match(/<h1\b[^>]*>/giu) || []).length;
  const internalLinks = new Set();
  for (const match of articleHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/giu)) {
    const href = decodeEntities(match[1]).trim();
    if (href.startsWith('/') && !href.startsWith('//') && href !== '/') internalLinks.add(href.split('#')[0]);
  }
  const localImages = [...articleHtml.matchAll(/<img\b[^>]*src=["']([^"']+)["'][^>]*>/giu)]
    .map(match => decodeEntities(match[1]).trim())
    .filter(src => src.startsWith('/') && !src.startsWith('//'));
  const schemas = extractJsonLd(html);
  const nodes = schemas.flatMap(schema => flattenSchema(schema));
  const articleNode = nodes.find(node => typeList(node['@type']).some(type => ARTICLE_TYPES.has(type)));
  const authorName = articleNode && typeof articleNode.author === 'object'
    ? String(articleNode.author.name || '').trim()
    : '';
  const publisherName = articleNode && typeof articleNode.publisher === 'object'
    ? String(articleNode.publisher.name || '').trim()
    : '';

  if (!/^.{20,120}$/u.test(title)) errors.push(`title length is ${title.length}; expected 20-120 characters`);
  if (description.length < 80 || description.length > 200) errors.push(`meta description length is ${description.length}; expected 80-200 characters`);
  if (canonical !== expected) errors.push(`canonical must be ${expected}; found ${canonical || 'missing'}`);
  if (h1Count !== 1) errors.push(`expected exactly one H1 inside article/main; found ${h1Count}`);
  if (wordCount < MIN_WORDS) errors.push(`visible article body has ${wordCount} words; minimum is ${MIN_WORDS}`);
  if (internalLinks.size < MIN_INTERNAL_LINKS) errors.push(`article has ${internalLinks.size} unique internal links; minimum is ${MIN_INTERNAL_LINKS}`);
  if (!localImages.length) errors.push('article has no local image');

  const requiredMeta = [
    ['og:title', metaContent(html, 'og:title', 'property')],
    ['og:description', metaContent(html, 'og:description', 'property')],
    ['og:image', metaContent(html, 'og:image', 'property')],
    ['og:url', metaContent(html, 'og:url', 'property')],
    ['twitter:card', metaContent(html, 'twitter:card')],
    ['twitter:title', metaContent(html, 'twitter:title')],
    ['twitter:description', metaContent(html, 'twitter:description')],
    ['twitter:image', metaContent(html, 'twitter:image')],
  ];
  for (const [name, value] of requiredMeta) if (!value) errors.push(`missing ${name}`);
  const ogUrl = metaContent(html, 'og:url', 'property');
  if (ogUrl && ogUrl !== expected) errors.push(`og:url must match canonical ${expected}`);
  const ogImage = metaContent(html, 'og:image', 'property');
  const twitterImage = metaContent(html, 'twitter:image');
  for (const [name, value] of [['og:image', ogImage], ['twitter:image', twitterImage]]) {
    if (value && !(value.startsWith(`${SITE_ORIGIN}/`) || value.startsWith('/'))) errors.push(`${name} must use a GNK-ASG/local image`);
  }

  if (!schemas.length) errors.push('missing JSON-LD');
  if (schemas.some(schema => schema.__parseError)) errors.push('contains invalid JSON-LD');
  if (!articleNode) errors.push('missing Article/NewsArticle/OpinionNewsArticle/AnalysisNewsArticle schema');
  if (articleNode && !authorName) errors.push('article schema is missing author name');
  if (articleNode && !publisherName) errors.push('article schema is missing publisher name');
  if (articleNode && articleNode.mainEntityOfPage && typeof articleNode.mainEntityOfPage === 'string' && articleNode.mainEntityOfPage !== expected) {
    errors.push('article schema mainEntityOfPage does not match canonical');
  }

  const visibleAuthor = /\b(?:autor|author|piše|by)\b[^<]{0,80}/iu.test(stripMarkup(articleHtml));
  const metaAuthor = metaContent(html, 'author');
  if (!visibleAuthor && !metaAuthor && !authorName) errors.push('missing visible, meta or schema author attribution');

  return {
    file,
    skipped: false,
    wordCount,
    internalLinks: internalLinks.size,
    localImages: localImages.length,
    canonical,
    articleType: articleNode ? typeList(articleNode['@type']) : [],
    author: authorName || metaAuthor || null,
    errors,
  };
}

const candidates = [...new Set(changedFiles().map(file => file.replace(/\\/gu, '/')))]
  .filter(file => TARGET.test(file))
  .sort();
const results = candidates.map(validate);
const errors = results.flatMap(result => result.errors.map(error => `${result.file}: ${error}`));
const summary = {
  ok: errors.length === 0,
  version: 'GNK_ASG_DIRECT_STATIC_EDITORIAL_POLICY_V1_20260806',
  minimumWords: MIN_WORDS,
  minimumInternalLinks: MIN_INTERNAL_LINKS,
  candidateCount: candidates.length,
  checkedCount: results.filter(result => !result.skipped).length,
  skippedCount: results.filter(result => result.skipped).length,
  results,
  errors,
};

if (errors.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(summary, null, 2));
console.log('DIRECT_STATIC_EDITORIAL_POLICY_OK');
