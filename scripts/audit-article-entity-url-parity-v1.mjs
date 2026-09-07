import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const ARTICLE_TYPES = new Set(['Article','NewsArticle','BlogPosting','OpinionNewsArticle']);
const failures = [];
const warnings = [];
const stats = { registryItems: 0, checkedPages: 0, articleNodes: 0, nerminSignals: 0, gnkAsgSignals: 0, gnkDinamoSignals: 0, missingEntityUrls: 0, wrongEntityUrls: 0, credentialErrors: 0, insecureErrors: 0 };
const fail = m => failures.push(m);
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const nodesFrom = value => Array.isArray(value?.['@graph']) ? value['@graph'] : [value];
const listify = value => Array.isArray(value) ? value : (value == null ? [] : [value]);
const nameOf = value => typeof value === 'string' ? String(value).trim() : String(value?.name || '').trim();
const urlOf = value => typeof value === 'string' ? '' : String(value?.['@id'] || value?.url || '').trim();
const clean = value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
const classify = name => {
  const n = clean(name);
  if (['nermin sefić','nermin sefic','sefić nermin','sefic nermin'].includes(n)) return 'nermin';
  if (['gnk asg','gnk asg d.o.o.'].includes(n)) return 'asg';
  if (['gnk dinamo ltd.','gnk dinamo ltd'].includes(n)) return 'dinamo';
  return '';
};
const expected = (kind, route) => {
  if (kind === 'nermin') return route.startsWith('/en/') ? `${ORIGIN}/en/nermin-sefic/` : `${ORIGIN}/nermin-sefic/`;
  if (kind === 'asg') return `${ORIGIN}/`;
  return '';
};
const validateUrl = (route, field, kind, raw) => {
  if (!raw) {
    stats.missingEntityUrls++;
    if (kind === 'dinamo') warnings.push(`${route}: ${field} GNK DINAMO Ltd. signal has no stable public entity URL to verify`);
    else fail(`${route}: ${field} ${kind === 'nermin' ? 'Nermin Sefić' : 'GNK ASG'} signal must include @id or url`);
    return;
  }
  let u;
  try { u = new URL(raw, ORIGIN); } catch { stats.wrongEntityUrls++; fail(`${route}: ${field} entity URL is invalid: ${raw}`); return; }
  if (u.protocol !== 'https:') { stats.insecureErrors++; fail(`${route}: ${field} entity URL must use HTTPS: ${raw}`); }
  if (u.username || u.password) { stats.credentialErrors++; fail(`${route}: ${field} entity URL must not contain credentials: ${raw}`); }
  if (u.search || u.hash) { stats.wrongEntityUrls++; fail(`${route}: ${field} entity URL must not contain query or fragment: ${raw}`); }
  if (kind === 'dinamo') return;
  const target = expected(kind, route);
  if (u.href !== target) { stats.wrongEntityUrls++; fail(`${route}: ${field} ${kind === 'nermin' ? 'Nermin Sefić' : 'GNK ASG'} entity URL must equal ${target}; found ${u.href}`); }
};

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
  const blocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  const articles = [];
  for (const [i, block] of blocks.entries()) {
    try {
      const parsed = JSON.parse(block[1]);
      for (const node of nodesFrom(parsed)) if (ARTICLE_TYPES.has(node?.['@type'])) articles.push(node);
    } catch (error) {
      fail(`${route}: invalid JSON-LD block ${i + 1}: ${error.message}`);
    }
  }
  for (const article of articles) {
    stats.articleNodes++;
    const fields = [['author', article.author], ['publisher', article.publisher], ['about', article.about], ['mentions', article.mentions]];
    for (const [field, value] of fields) {
      for (const entity of listify(value)) {
        const kind = classify(nameOf(entity));
        if (!kind) continue;
        if (kind === 'nermin') stats.nerminSignals++;
        if (kind === 'asg') stats.gnkAsgSignals++;
        if (kind === 'dinamo') stats.gnkDinamoSignals++;
        validateUrl(route, field, kind, urlOf(entity));
      }
    }
  }
}

const report = { version: 'GNK_ASG_ARTICLE_ENTITY_URL_PARITY_V1', scope: 'known entity URLs in Article-family JSON-LD on materialized editorial registry pages', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'article-entity-url-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
