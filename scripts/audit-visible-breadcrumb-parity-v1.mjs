import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = { registryItems: 0, checkedPages: 0, visibleBreadcrumbPages: 0, ariaCurrentErrors: 0, finalHrefErrors: 0, emptyLabelErrors: 0 };
const fail = m => failures.push(m);
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const extract = (html, re) => html.match(re)?.[1]?.trim() || '';
const canonical = html => extract(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) || extract(html, /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
const text = value => String(value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
const navMatch = html => html.match(/<nav\b([^>]*)>([\s\S]*?)<\/nav>/gi)?.find(block => /breadcrumb/i.test(block)) || html.match(/<(?:ol|ul|div)\b[^>]*class=["'][^"']*breadcrumb[^"']*["'][^>]*>[\s\S]*?<\/(?:ol|ul|div)>/i)?.[0] || '';
const attr = (tag, name) => extract(tag, new RegExp(`${name}=["']([^"']*)["']`, 'i'));
const normalizeUrl = value => { try { const u = new URL(value, ORIGIN); return `${u.origin}${u.pathname}`; } catch { return ''; } };

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
  const visible = navMatch(html);
  if (!visible) continue;
  stats.visibleBreadcrumbPages++;
  const links = [...visible.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(m => ({ attrs: m[1], label: text(m[2]), href: attr(m[1], 'href'), current: attr(m[1], 'aria-current') }));
  const spans = [...visible.matchAll(/<(?:span|li)\b([^>]*)>([\s\S]*?)<\/(?:span|li)>/gi)].map(m => ({ attrs: m[1], label: text(m[2]), current: attr(m[1], 'aria-current') }));
  const all = [...links, ...spans].filter(x => x.label || x.current);
  for (const entry of all) if (!entry.label) { stats.emptyLabelErrors++; fail(`${route}: visible breadcrumb entry has empty user-facing label`); }
  const current = all.filter(x => String(x.current || '').toLowerCase() === 'page');
  if (current.length !== 1) {
    stats.ariaCurrentErrors++;
    fail(`${route}: visible breadcrumb must contain exactly one aria-current="page" entry; found ${current.length}`);
  }
  const canonicalUrl = normalizeUrl(canonical(html) || `${ORIGIN}${route}`);
  if (current.length === 1 && current[0].href) {
    const currentHref = normalizeUrl(current[0].href);
    if (!currentHref || currentHref !== canonicalUrl) {
      stats.finalHrefErrors++;
      fail(`${route}: aria-current breadcrumb href must equal clean canonical URL`);
    }
  }
  if (links.length) {
    const finalLink = links[links.length - 1];
    if (String(finalLink.current || '').toLowerCase() === 'page') {
      const finalHref = normalizeUrl(finalLink.href);
      if (!finalHref || finalHref !== canonicalUrl) {
        stats.finalHrefErrors++;
        fail(`${route}: final linked breadcrumb must resolve exactly to canonical URL`);
      }
    }
  }
}

const report = { version: 'GNK_ASG_VISIBLE_BREADCRUMB_PARITY_V1', scope: 'materialized editorial registry pages with visible breadcrumb UI', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'visible-breadcrumb-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
