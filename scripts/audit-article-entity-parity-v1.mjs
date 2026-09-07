import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const ARTICLE_TYPES = new Set(['Article','NewsArticle','BlogPosting','OpinionNewsArticle']);
const ENTITY_NAMES = new Map([
  ['nermin sefić', 'Nermin Sefić'],
  ['nermin sefic', 'Nermin Sefić'],
  ['sefić nermin', 'Nermin Sefić'],
  ['sefic nermin', 'Nermin Sefić'],
  ['gnk asg', 'GNK ASG'],
  ['gnk asg d.o.o.', 'GNK ASG'],
  ['gnk dinamo ltd.', 'GNK DINAMO Ltd.'],
  ['gnk dinamo ltd', 'GNK DINAMO Ltd.']
]);
const failures = [];
const warnings = [];
const stats = { registryItems: 0, checkedPages: 0, articleNodes: 0, canonicalMainEntityMatches: 0, mainEntityMismatches: 0, authorParityMismatches: 0, publisherMismatches: 0, missingAuthorSignals: 0, missingPublisherSignals: 0, invalidAuthorTypes: 0, entitySignalsChecked: 0, malformedEntitySignals: 0 };
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
const listify = v => Array.isArray(v) ? v : (v == null ? [] : [v]);
const canonicalEntityName = v => ENTITY_NAMES.get(normText(v).toLowerCase()) || '';

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
    if (article.author && typeof article.author === 'object' && !Array.isArray(article.author)) {
      const authorType = article.author['@type'];
      if (authorType && !['Person','Organization'].includes(authorType)) {
        stats.invalidAuthorTypes++;
        fail(`${route}: Article author @type must be Person or Organization when explicitly typed; found ${authorType}`);
      }
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

    for (const field of ['about', 'mentions']) {
      for (const entity of listify(article[field])) {
        const name = nodeName(entity);
        if (!name) {
          stats.malformedEntitySignals++;
          fail(`${route}: Article ${field} entry must include a non-empty entity name`);
          continue;
        }
        const canonicalName = canonicalEntityName(name);
        if (!canonicalName) continue;
        stats.entitySignalsChecked++;
        if (entity && typeof entity === 'object' && entity['@type'] && !['Person','Organization','Thing','SportsOrganization'].includes(entity['@type'])) {
          stats.malformedEntitySignals++;
          fail(`${route}: ${field} entity ${name} uses unsupported @type ${entity['@type']}`);
        }
        if (/^gnk asg(?: d\.o\.o\.)?$/i.test(name) && entity && typeof entity === 'object' && entity['@type'] && entity['@type'] !== 'Organization') {
          stats.malformedEntitySignals++;
          fail(`${route}: ${field} entity ${name} must be typed Organization`);
        }
        if (/^(?:nermin|sefi[cć])/i.test(name) && entity && typeof entity === 'object' && entity['@type'] && entity['@type'] !== 'Person') {
          stats.malformedEntitySignals++;
          fail(`${route}: ${field} entity ${name} must be typed Person`);
        }
      }
    }
  }
}

const report = { version: 'GNK_ASG_ARTICLE_ENTITY_PARITY_V1', scope: 'Article-family JSON-LD on materialized editorial registry pages', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'article-entity-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
