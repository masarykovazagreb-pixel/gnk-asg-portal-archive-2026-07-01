// GNK ASG — Social Meta Guard.
// Confirms that pages selected for social distribution have accurate preview
// metadata. Author metadata is conditional on the canonical editorial registry;
// editor/publisher roles are never treated as article authors.
// This audit writes a local JSON report only. It does not publish or notify crawlers.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { articleAuthorFor, isProtectedEditorialItem } from './lib/editorial-attribution-v1.mjs';

const ROOT = 'apps/portal';
const REQUIRED_META = [
  { name: 'title', re: /<title>[^<]{10,}<\/title>/i },
  { name: 'meta:description', re: /<meta name="description" content="[^"]{40,}"/i },
  { name: 'canonical', re: /<link rel="canonical" href="https:\/\/gnk-asg\.hr[^"]*">/i },
  { name: 'og:title', re: /<meta property="og:title" content="[^"]{5,}"/i },
  { name: 'og:description', re: /<meta property="og:description" content="[^"]{20,}"/i },
  { name: 'og:image', re: /<meta property="og:image" content="https:\/\/gnk-asg\.hr[^"]*"/i },
  { name: 'og:url', re: /<meta property="og:url" content="https:\/\/gnk-asg\.hr[^"]*"/i },
  { name: 'twitter:card', re: /<meta name="twitter:card" content="[^"]+"/i },
  { name: 'editor', re: /<meta name="editor" content="[^"]{5,}"/i },
  { name: 'json-ld', re: /<script type="application\/ld\+json">/i },
];

function pathToFile(urlPath) {
  const clean = urlPath.replace(/^https?:\/\/gnk-asg\.hr/, '').replace(/\?.*$/, '');
  const rel = clean.endsWith('/') ? clean + 'index.html' : clean + '/index.html';
  return join(ROOT, rel);
}
function metaContent(html, attribute, name) {
  const tag = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0])
    .find((value) => new RegExp(`\\b${attribute}=["']${name}["']`, 'i').test(value));
  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1] || '';
}
function authorErrors(html, item) {
  const expected = item ? articleAuthorFor(item) : null;
  const actual = metaContent(html, 'name', 'author');
  const articleAuthor = metaContent(html, 'property', 'article:author');
  const errors = [];
  if (expected && actual !== expected.name) errors.push(`author-metadata-must-match-registry:${expected.name}`);
  if (!expected && item && (/(?:nermin\s+sefi[cć]|nermin-sefic)/i.test(actual)
    || /(?:nermin\s+sefi[cć]|nermin-sefic)/i.test(articleAuthor))) {
    errors.push('unverified-personal-author-metadata');
  }
  return errors;
}
function auditOne(source) {
  const { urlPath, item = null } = source;
  const file = pathToFile(urlPath);
  if (!existsSync(file)) return { urlPath, ok: false, missing: ['file-not-found'] };
  const html = readFileSync(file, 'utf8');
  const missing = REQUIRED_META.filter((meta) => !meta.re.test(html)).map((meta) => meta.name);
  missing.push(...authorErrors(html, item));
  return {
    urlPath,
    ok: missing.length === 0,
    missing,
    expectedArticleAuthor: item ? articleAuthorFor(item)?.name || null : null,
    score: Math.round(((REQUIRED_META.length - Math.min(REQUIRED_META.length, missing.length)) / REQUIRED_META.length) * 100),
  };
}

// Audit core profile/index pages and the newest registry items, excluding
// protected SPT/bank routes. These are read-only checks, not publish actions.
function collectSocialSources() {
  const sources = [
    '/', '/en/', '/nermin-sefic/', '/en/nermin-sefic/', '/gnk-aktual/', '/en/gnk-aktual/',
  ].map((urlPath) => ({ urlPath }));
  try {
    const registry = JSON.parse(readFileSync(`${ROOT}/data/editorial-registry.json`, 'utf8'));
    for (const item of (registry.items || []).slice(0, 40)) {
      if (!item.path || item.type === 'tjednik' || isProtectedEditorialItem(item)) continue;
      sources.push({ urlPath: item.path, item });
    }
  } catch {}
  const seen = new Set();
  return sources.filter((source) => {
    if (seen.has(source.urlPath)) return false;
    seen.add(source.urlPath);
    return true;
  });
}

const sources = collectSocialSources();
const results = sources.map(auditOne);
const failing = results.filter((result) => !result.ok);
const avgScore = Math.round(results.reduce((sum, result) => sum + (result.score || 0), 0) / results.length);
const report = {
  checked: results.length,
  passing: results.length - failing.length,
  failing: failing.length,
  avgScore,
  failingDetail: failing,
};

mkdirSync(`${ROOT}/data/seo-audit`, { recursive: true });
writeFileSync(`${ROOT}/data/seo-audit/social-meta-guard.json`, JSON.stringify(report, null, 2) + '\n');

console.log(JSON.stringify({ checked: report.checked, passing: report.passing, failing: report.failing, avgScore }, null, 2));
if (failing.length) {
  console.log('URLs needing meta reinforcement:');
  for (const result of failing) console.log(` - ${result.urlPath}: missing [${result.missing.join(', ')}]`);
}
