import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const ARTICLE_TYPES = new Set(['Article', 'NewsArticle', 'BlogPosting', 'OpinionNewsArticle']);
const failures = [];
const warnings = [];
const stats = {
  registryItems: 0,
  checkedPages: 0,
  articleNodes: 0,
  titleMismatches: 0,
  imageMismatches: 0,
  invalidPublishedDates: 0,
  canonicalIdentityMismatches: 0
};

const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim();
const absolute = (value, route) => {
  if (!value) return '';
  try { return new URL(value, `${ORIGIN}${route}`).href; } catch { return String(value); }
};
const nodeTypes = node => Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
const imageUrls = (value, route) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(entry => imageUrls(entry, route));
  if (typeof value === 'string') return [absolute(value, route)];
  if (typeof value === 'object') return [value.url, value.contentUrl, value['@id']].filter(Boolean).map(v => absolute(v, route));
  return [];
};
const canonicalIds = (node, route) => {
  const values = [];
  if (node?.url) values.push(node.url);
  if (node?.['@id']) values.push(node['@id']);
  if (typeof node?.mainEntityOfPage === 'string') values.push(node.mainEntityOfPage);
  if (node?.mainEntityOfPage?.['@id']) values.push(node.mainEntityOfPage['@id']);
  return values.map(v => absolute(v, route));
};

if (!fs.existsSync(REGISTRY)) {
  console.error(`Registry missing: ${REGISTRY}`);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];
stats.registryItems = items.length;

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  stats.checkedPages++;

  const html = fs.readFileSync(file, 'utf8');
  const blocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  const articleNodes = [];

  for (const [index, block] of blocks.entries()) {
    try {
      const parsed = JSON.parse(block[1]);
      const nodes = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed];
      for (const node of nodes) {
        if (nodeTypes(node).some(type => ARTICLE_TYPES.has(type))) articleNodes.push(node);
      }
    } catch (error) {
      failures.push(`${route}: invalid JSON-LD block ${index + 1}: ${error.message}`);
    }
  }

  if (!articleNodes.length) {
    failures.push(`${route}: registry editorial page has no supported Article/NewsArticle/BlogPosting/OpinionNewsArticle node`);
    continue;
  }

  stats.articleNodes += articleNodes.length;
  const expectedTitle = normalizeText(item.title);
  const expectedImage = absolute(item.image, route);
  const expectedCanonical = `${ORIGIN}${route}`;

  const titleMatch = articleNodes.some(node => normalizeText(node.headline || node.name) === expectedTitle);
  if (expectedTitle && !titleMatch) {
    stats.titleMismatches++;
    failures.push(`${route}: structured-data headline/name does not match editorial-registry title`);
  }

  if (expectedImage) {
    const declaredImages = new Set(articleNodes.flatMap(node => imageUrls(node.image, route)));
    if (!declaredImages.has(expectedImage)) {
      stats.imageMismatches++;
      failures.push(`${route}: structured-data image does not match editorial-registry image ${expectedImage}`);
    }
  } else {
    warnings.push(`${route}: editorial-registry item has no image to cross-check against structured data`);
  }

  for (const node of articleNodes) {
    if (!node.datePublished || Number.isNaN(Date.parse(node.datePublished))) {
      stats.invalidPublishedDates++;
      failures.push(`${route}: article structured data must contain a parseable datePublished`);
    }
  }

  const identities = new Set(articleNodes.flatMap(node => canonicalIds(node, route)));
  if (identities.size && !identities.has(expectedCanonical)) {
    stats.canonicalIdentityMismatches++;
    failures.push(`${route}: Article identity/url/mainEntityOfPage does not resolve to canonical ${expectedCanonical}`);
  } else if (!identities.size) {
    warnings.push(`${route}: article structured data has no url/@id/mainEntityOfPage identity signal`);
  }
}

const report = {
  version: 'GNK_ASG_EDITORIAL_REGISTRY_SCHEMA_PARITY_V1',
  ok: failures.length === 0,
  supportedArticleTypes: [...ARTICLE_TYPES],
  stats,
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'editorial-registry-schema-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
