import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const ORIGIN_URL = new URL(ORIGIN);
const failures = [];
const warnings = [];
const stats = { registryItems: 0, checkedPages: 0, checkedLinks: 0, brokenLinks: 0, malformedLinks: 0, duplicateLinks: 0, insecureSameHostLinks: 0, credentialLinks: 0 };

const normalizeRoute = value => {
  try {
    const url = new URL(String(value || ''), ORIGIN);
    if (url.origin !== ORIGIN) return null;
    return url.pathname.replace(/\/{2,}/g, '/');
  } catch {
    return undefined;
  }
};

const routeCandidates = route => {
  const clean = route.replace(/^\/+/, '');
  if (!clean) return [path.join(PORTAL, 'index.html')];
  const decoded = (() => { try { return decodeURIComponent(clean); } catch { return clean; } })();
  const candidates = [path.join(PORTAL, decoded)];
  if (decoded.endsWith('/')) candidates.push(path.join(PORTAL, decoded, 'index.html'));
  else if (!path.extname(decoded)) candidates.push(path.join(PORTAL, decoded, 'index.html'));
  return candidates;
};

const existsForRoute = route => routeCandidates(route).some(candidate => fs.existsSync(candidate));
const extractHrefs = html => [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)].map(match => match[1].trim());
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');

if (!fs.existsSync(REGISTRY)) {
  console.error('Missing editorial registry');
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];
stats.registryItems = items.length;

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = route === '/' ? path.join(PORTAL, 'index.html') : routeFile(route);
  if (!fs.existsSync(file)) continue;
  stats.checkedPages++;
  const html = fs.readFileSync(file, 'utf8');
  const seen = new Map();
  for (const href of extractHrefs(html)) {
    if (!href || href.startsWith('#') || /^(mailto:|tel:|sms:|javascript:|data:)/i.test(href)) continue;
    let parsed;
    try { parsed = new URL(href, ORIGIN); } catch {
      stats.malformedLinks++;
      failures.push(`${route}: malformed href ${href}`);
      continue;
    }

    if (parsed.hostname === ORIGIN_URL.hostname && parsed.protocol !== 'https:') {
      stats.insecureSameHostLinks++;
      failures.push(`${route}: same-host link must use HTTPS ${href}`);
      continue;
    }
    if (parsed.hostname === ORIGIN_URL.hostname && (parsed.username || parsed.password)) {
      stats.credentialLinks++;
      failures.push(`${route}: internal link must not contain URL credentials ${href}`);
      continue;
    }
    if (parsed.origin !== ORIGIN) continue;

    const target = normalizeRoute(href);
    if (target === undefined) {
      stats.malformedLinks++;
      failures.push(`${route}: malformed internal href ${href}`);
      continue;
    }
    if (target === null) continue;
    stats.checkedLinks++;
    const key = `${target}${parsed.search}${parsed.hash}`;
    seen.set(key, (seen.get(key) || 0) + 1);
    if (/\/en\/en(?:\/|$)/i.test(target)) {
      stats.brokenLinks++;
      failures.push(`${route}: invalid duplicated locale path ${href}`);
      continue;
    }
    if (!existsForRoute(target)) {
      stats.brokenLinks++;
      failures.push(`${route}: unresolved internal link ${href} -> ${target}`);
    }
  }
  for (const [href, count] of seen) {
    if (count > 1) {
      stats.duplicateLinks += count - 1;
      warnings.push(`${route}: repeated internal link ${href} (${count} occurrences)`);
    }
  }
}

const report = {
  version: 'GNK_ASG_INTERNAL_LINK_INTEGRITY_V1',
  scope: 'materialized editorial registry pages',
  semantics: 'Validates materialized internal routes and fails closed on malformed, duplicated-locale, insecure same-host and credential-bearing internal links.',
  ok: failures.length === 0,
  stats,
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'internal-link-integrity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
