#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(process.cwd());
const sourcePath = path.resolve(repoRoot, process.argv[2] || 'apps/portal/data');
const reportPath = path.resolve(repoRoot, process.argv[3] || 'reports/generated/seo-quality-gate.json');
const minimumWords = Number(process.env.GNK_ASG_MIN_ARTICLE_WORDS || 500);

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Source path does not exist: ${sourcePath}`);
}

const jsonFiles = fs.statSync(sourcePath).isDirectory()
  ? walk(sourcePath).filter(file => file.toLowerCase().endsWith('.json'))
  : [sourcePath];

const articles = [];
const parseErrors = [];

for (const file of jsonFiles) {
  try {
    const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const article of collectArticles(payload)) {
      articles.push({ file: slash(path.relative(repoRoot, file)), article });
    }
  } catch (error) {
    parseErrors.push({ file: slash(path.relative(repoRoot, file)), error: String(error.message || error) });
  }
}

const results = articles.map(({ file, article }) => evaluateArticle(file, article));
const slugMap = groupBy(results.filter(item => item.slug), item => item.slug);
const canonicalMap = groupBy(results.filter(item => item.canonical), item => item.canonical);
const imageMap = groupBy(results.filter(item => item.image), item => item.image);

for (const group of slugMap.values()) {
  if (group.length > 1) group.forEach(item => item.errors.push('DUPLICATE_SLUG'));
}
for (const group of canonicalMap.values()) {
  if (group.length > 1) group.forEach(item => item.errors.push('DUPLICATE_CANONICAL'));
}
for (const group of imageMap.values()) {
  if (group.length > 1) group.forEach(item => item.errors.push('REUSED_IMAGE'));
}

for (const item of results) {
  item.errors = [...new Set(item.errors)].sort();
  item.warnings = [...new Set(item.warnings)].sort();
  item.ok = item.errors.length === 0;
}

const summary = {
  generatedAt: new Date().toISOString(),
  sourcePath: slash(path.relative(repoRoot, sourcePath)),
  minimumWords,
  jsonFiles: jsonFiles.length,
  parseErrors: parseErrors.length,
  articleCount: results.length,
  passed: results.filter(item => item.ok).length,
  failed: results.filter(item => !item.ok).length,
  warnings: results.reduce((sum, item) => sum + item.warnings.length, 0),
  duplicateSlugs: [...slugMap.values()].filter(group => group.length > 1).length,
  duplicateCanonicals: [...canonicalMap.values()].filter(group => group.length > 1).length,
  reusedImages: [...imageMap.values()].filter(group => group.length > 1).length
};

const report = { summary, parseErrors, results };
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
process.exitCode = summary.failed > 0 || summary.parseErrors > 0 ? 1 : 0;

function evaluateArticle(file, article) {
  const title = stringValue(article.title || article.headline);
  const slug = stringValue(article.slug || article.id);
  const summary = stringValue(article.summary || article.excerpt || article.description || article.lead);
  const content = stringValue(article.content || article.body || article.text || article.articleBody);
  const language = stringValue(article.language || article.lang || 'hr').toLowerCase();
  const canonical = stringValue(article.canonical || article.canonicalUrl || article.url);
  const imageObject = article.image && typeof article.image === 'object' ? article.image : {};
  const image = stringValue(imageObject.url || imageObject.src || article.image || article.imageUrl || article.heroImage);
  const alt = stringValue(imageObject.alt || article.imageAlt || article.alt);
  const caption = stringValue(imageObject.caption || article.imageCaption || article.caption);
  const credit = stringValue(imageObject.credit || article.imageCredit || article.credit);
  const sources = normalizeSources(article.sources || article.references || article.sourceLinks);
  const author = stringValue(article.author || article.authorName);
  const schema = article.schema || article.structuredData || article.jsonLd || null;
  const wordCount = countWords(content);
  const errors = [];
  const warnings = [];

  if (!title) errors.push('MISSING_TITLE');
  if (!slug) errors.push('MISSING_SLUG');
  if (!summary) errors.push('MISSING_SUMMARY');
  if (!content) errors.push('MISSING_CONTENT');
  if (wordCount < minimumWords) errors.push('CONTENT_BELOW_MINIMUM_WORDS');
  if (!sources.length) errors.push('MISSING_SOURCES');
  if (!image) errors.push('MISSING_IMAGE');
  if (!alt) errors.push('MISSING_IMAGE_ALT');
  if (!caption) errors.push('MISSING_IMAGE_CAPTION');
  if (!credit) errors.push('MISSING_IMAGE_CREDIT');
  if (!canonical) errors.push('MISSING_CANONICAL');
  if (!schema) errors.push('MISSING_ARTICLE_SCHEMA');
  if (!author) warnings.push('MISSING_AUTHOR');
  if (!['hr', 'en'].includes(language)) warnings.push('UNEXPECTED_LANGUAGE');
  if (title.length > 65) warnings.push('TITLE_TOO_LONG');
  if (summary.length > 170) warnings.push('SUMMARY_TOO_LONG');
  if (!containsEditorialValue(content)) warnings.push('WEAK_EDITORIAL_STRUCTURE');

  return {
    file,
    id: stringValue(article.id || slug || title),
    title,
    slug,
    language,
    wordCount,
    canonical,
    image,
    sourceCount: sources.length,
    author,
    errors,
    warnings,
    ok: false
  };
}

function collectArticles(payload) {
  if (Array.isArray(payload)) return payload.filter(isArticleLike);
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [];
  for (const key of ['articles', 'items', 'posts', 'publications', 'objave', 'news']) {
    if (Array.isArray(payload[key])) candidates.push(...payload[key].filter(isArticleLike));
  }
  if (isArticleLike(payload)) candidates.push(payload);
  return candidates;
}

function isArticleLike(value) {
  return Boolean(value && typeof value === 'object' && (value.title || value.headline) && (value.content || value.body || value.text || value.articleBody));
}

function normalizeSources(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function containsEditorialValue(content) {
  const text = content.toLowerCase();
  const markers = ['zaključ', 'conclusion', 'zašto je važno', 'why it matters', 'izvor', 'source', 'analiz', 'analysis'];
  return markers.some(marker => text.includes(marker));
}

function countWords(value) {
  return stringValue(value)
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function stringValue(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function groupBy(items, selector) {
  const map = new Map();
  for (const item of items) {
    const key = selector(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function walk(root) {
  const output = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'reports') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) output.push(path.resolve(full));
    }
  }
  return output.sort();
}

function slash(value) {
  return String(value || '').replaceAll('\\', '/');
}
