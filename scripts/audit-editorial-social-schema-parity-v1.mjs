import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const OUTDIR = path.join(ROOT, 'artifacts', 'editorial-social-schema-parity');
const OUT = path.join(OUTDIR, 'report.json');

const read = (p) => fs.readFileSync(p, 'utf8');
const decode = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function meta(html, key, value) {
  const a = new RegExp(`<meta\\s+[^>]*${key}=["']${esc(value)}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const b = new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*${key}=["']${esc(value)}["'][^>]*>`, 'i');
  const m = html.match(a) || html.match(b);
  return m ? decode(m[1]) : '';
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

function flattenJsonLd(value, out = []) {
  if (Array.isArray(value)) {
    for (const v of value) flattenJsonLd(v, out);
  } else if (value && typeof value === 'object') {
    out.push(value);
    if (Array.isArray(value['@graph'])) flattenJsonLd(value['@graph'], out);
  }
  return out;
}

function imageMatches(value, expected) {
  if (typeof value === 'string') return value === expected;
  if (Array.isArray(value)) return value.some((v) => imageMatches(v, expected));
  if (value && typeof value === 'object') return [value.url, value.contentUrl].some((v) => v === expected);
  return false;
}

const registry = JSON.parse(read(REGISTRY));
const items = Array.isArray(registry.items) ? registry.items : [];
const failures = [];
const checked = [];

for (const item of items) {
  if (!item?.path || !item?.url || !item?.image || !item?.publishedAt) continue;
  const rel = item.path.replace(/^\/+|\/+$/g, '');
  const file = path.join(PORTAL, rel, 'index.html');
  if (!fs.existsSync(file)) {
    failures.push({ path: item.path, rule: 'route-materialization', expected: file });
    continue;
  }
  const html = read(file);
  const rules = {
    'og:image': meta(html, 'property', 'og:image') === item.image,
    'og:image:alt': Boolean(meta(html, 'property', 'og:image:alt')),
    'twitter:card': meta(html, 'name', 'twitter:card') === 'summary_large_image',
    'twitter:image': meta(html, 'name', 'twitter:image') === item.image,
    'twitter:image:alt': Boolean(meta(html, 'name', 'twitter:image:alt')),
    'article:published_time': meta(html, 'property', 'article:published_time') === item.publishedAt,
  };

  let articleSchema = null;
  for (const block of jsonLdBlocks(html)) {
    try {
      const parsed = JSON.parse(block);
      const nodes = flattenJsonLd(parsed);
      articleSchema = nodes.find((n) => ['Article', 'NewsArticle', 'BlogPosting'].includes(n?.['@type']));
      if (articleSchema) break;
    } catch {
      failures.push({ path: item.path, rule: 'jsonld-parseable' });
    }
  }

  rules['article-schema'] = Boolean(articleSchema);
  rules['schema:datePublished'] = articleSchema?.datePublished === item.publishedAt;
  rules['schema:image'] = imageMatches(articleSchema?.image, item.image);

  for (const [rule, ok] of Object.entries(rules)) {
    if (!ok) failures.push({ path: item.path, rule, expectedImage: item.image, expectedPublishedAt: item.publishedAt });
  }
  checked.push(item.path);
}

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  contract: 'GNK_ASG_EDITORIAL_SOCIAL_SCHEMA_PARITY_V1',
  checkedRoutes: checked.length,
  failureCount: failures.length,
  failures,
}, null, 2) + '\n');

if (checked.length === 0) {
  console.error('FAIL: no eligible editorial routes were checked');
  process.exit(1);
}
if (failures.length) {
  console.error(`FAIL: editorial social/schema parity has ${failures.length} violation(s); see ${OUT}`);
  process.exit(1);
}
console.log(`PASS: ${checked.length} editorial routes satisfy social image + Article parity`);
