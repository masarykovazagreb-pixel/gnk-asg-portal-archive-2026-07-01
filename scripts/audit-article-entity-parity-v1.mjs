import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const ARTICLE_TYPES = new Set(['Article','NewsArticle','BlogPosting','OpinionNewsArticle']);
const failures = [];
const warnings = [];
const stats = { registryItems: 0, checkedPages: 0, articleNodes: 0, canonicalMainEntityMatches: 0, mainEntityMismatches: 0, authorParityMismatches: 0, publisherMismatches: 0, missingAuthorSignals: 0, missingPublisherSignals: 0 };
const fail = m => failures.push(m);
const warn = m => warnings.push(m);
const extract = (html, regex) => html.match(regex)?.[1]?.trim() || '';
const meta = (html, name) => extract(html, new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')) || extract(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["'][^>]*>`, 'i'));
const property = (html, name) => extract(html, new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')) || extract(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["'][^>]*>`, 'i'));
const canonical = html => extract(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) || extract(html, /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const nodesFrom = value => Array.isArray(value?.['@graph']) ? value['@graph'] : [value];
const normText = v => String(v || '').replace(/\s+/g, ' ').trim();
const normUrl = v => { try { return new URL(v, ORIGIN).href; } catch { return ''; } };
const nodeName = v => typeof v === 'string' ? normText(v) : normText(v?.name);
const nodeUrl = v => typeof v === 'string' ? normUrl(v) : normUrl(v?.['@id'] || v?.url);

if (!fs.existsSync(REGISTRY)) process.exit(1);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];
stats.registryItems = items.length;

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages++;
  const pageCanonical = normUrl(canonical(html) || `${ORIGIN}${route}`);
  const metaAuthor = normText(meta(html, 'author') || property(html, 'article:author'));
  const blocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  const articleNodes = [];
  for (const [i, block] of blocks.entries()) {
    try {
      const parsed = JSON.parse(block[1]);
      for (const node of nodesFrom(parsed)) if (ARTICLE_TYPES.has(node?.['@type'])) articleNodes.push(node);
    } catch (error) {
      fail(`${route}: invalid JSON-LD block ${i + 1}: ${error.message}`);
    }
  }
  if (!articleNodes.length) continue;
  for (const article of articleNodes) {
    stats.articleNodes++;
    const mainEntityUrl = nodeUrl(article.mainEntityOfPage);
    if (!mainEntityUrl || mainEntityUrl !== pageCanonical) {
      stats.mainEntityMismatches++;
      fail(`${route}: Article mainEntityOfPage must resolve exactly to canonical URL`);
    } else stats.canonicalMainEntityMatches++;

    const schemaAuthor = nodeName(article.author);
    if (!schemaAuthor && !metaAuthor) {
      stats.missingAuthorSignals++;
      warn(`${route}: no truthful author signal available in Article schema or meta author`);
    } else if (schemaAuthor && metaAuthor && schemaAuthor !== metaAuthor) {
      stats.authorParityMismatches++;
      fail(`${route}: Article author (${schemaAuthor}) disagrees with page author metadata (${metaAuthor})`);
    }

    const publisherName = nodeName(article.publisher);
    if (!publisherName) {
      stats.missingPublisherSignals++;
      fail(`${route}: Article schema is missing publisher Organization name`);
    } else if (!/^GNK ASG(?:\s+d\.o\.o\.)?$/i.test(publisherName)) {
      stats.publisherMismatches++;
      fail(`${route}: Article publisher must be GNK ASG or GNK ASG d.o.o.; found ${publisherName}`);
    }

    if (article.publisher && typeof article.publisher === 'object' && article.publisher['@type'] && article.publisher['@type'] !== 'Organization') {
      stats.publisherMismatches++;
      fail(`${route}: Article publisher @type must be Organization`);
    }
  }
}

const report = { version: 'GNK_ASG_ARTICLE_ENTITY_PARITY_V1', scope: 'Article-family JSON-LD on materialized editorial registry pages', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'article-entity-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
