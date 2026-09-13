import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = { pages: 0, articleNodes: 0, invalidDates: 0, chronologyErrors: 0, socialMismatches: 0, missingPublished: 0 };
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
  const p = path.join(dir, ent.name);
  if (ent.isDirectory()) return walk(p);
  return ent.isFile() && ent.name === 'index.html' ? [p] : [];
});
const routeOf = file => '/' + path.relative(PORTAL, path.dirname(file)).split(path.sep).filter(Boolean).join('/') + (path.dirname(file) === PORTAL ? '' : '/');
const flatten = value => {
  const out = [];
  const q = Array.isArray(value) ? [...value] : [value];
  while (q.length) {
    const node = q.shift();
    if (!node || typeof node !== 'object') continue;
    out.push(node);
    if (Array.isArray(node['@graph'])) q.push(...node['@graph']);
  }
  return out;
};
const typeHasArticle = node => {
  const t = node?.['@type'];
  const vals = Array.isArray(t) ? t : [t];
  return vals.some(v => ['Article','NewsArticle','BlogPosting'].includes(v));
};
const metaProperty = (html, property) => {
  for (const tag of html.match(/<meta\s+[^>]*>/gi) || []) {
    if ((tag.match(/\bproperty=["']([^"']+)["']/i)?.[1] || '').toLowerCase() !== property.toLowerCase()) continue;
    return tag.match(/\bcontent=["']([^"']+)["']/i)?.[1]?.trim() || '';
  }
  return '';
};
const parseDate = value => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};
for (const file of walk(PORTAL)) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeOf(file);
  stats.pages++;
  const nodes = [];
  const re = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try { nodes.push(...flatten(JSON.parse(m[1]))); } catch {}
  }
  const publishedMeta = metaProperty(html, 'article:published_time');
  const modifiedMeta = metaProperty(html, 'article:modified_time');
  for (const node of nodes.filter(typeHasArticle)) {
    stats.articleNodes++;
    const published = parseDate(node.datePublished);
    const modified = parseDate(node.dateModified);
    if (!published) {
      stats.missingPublished++;
      failures.push(`${route}: Article JSON-LD missing valid datePublished`);
    }
    if (node.datePublished && !published) {
      stats.invalidDates++;
      failures.push(`${route}: invalid Article datePublished ${node.datePublished}`);
    }
    if (node.dateModified && !modified) {
      stats.invalidDates++;
      failures.push(`${route}: invalid Article dateModified ${node.dateModified}`);
    }
    if (published && modified && modified < published) {
      stats.chronologyErrors++;
      failures.push(`${route}: Article dateModified precedes datePublished`);
    }
    if (publishedMeta && node.datePublished && parseDate(publishedMeta) !== published) {
      stats.socialMismatches++;
      failures.push(`${route}: article:published_time disagrees with JSON-LD datePublished`);
    }
    if (modifiedMeta && node.dateModified && parseDate(modifiedMeta) !== modified) {
      stats.socialMismatches++;
      failures.push(`${route}: article:modified_time disagrees with JSON-LD dateModified`);
    }
  }
}
const report = { version: 'GNK_ASG_ARTICLE_TEMPORAL_SCHEMA_COHERENCE_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'article-temporal-schema-coherence');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
