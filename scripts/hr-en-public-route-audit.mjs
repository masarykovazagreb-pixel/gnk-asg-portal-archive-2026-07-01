import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL_ROOT = path.join(ROOT, 'apps', 'portal');
const REPORT_DIR = path.join(ROOT, 'reports', 'hr-en-public-route-audit');
const NAV_PATH = path.join(PORTAL_ROOT, 'data', 'navigation.json');

const navigation = JSON.parse(fs.readFileSync(NAV_PATH, 'utf8'));
const languages = ['hr', 'en'];
const checks = [];
const routes = [];

for (const language of languages) {
  const entries = Array.isArray(navigation[language]) ? navigation[language] : [];
  const keys = new Set();
  const hrefs = new Set();

  for (const entry of entries.filter(item => item?.public === true)) {
    const key = String(entry.key || '').trim();
    const href = String(entry.href || '').trim();
    const normalizedPath = normalizeRoute(href);
    const file = routeToFile(normalizedPath);
    const absoluteFile = path.join(PORTAL_ROOT, file);
    const exists = fs.existsSync(absoluteFile) && fs.statSync(absoluteFile).isFile();
    const size = exists ? fs.statSync(absoluteFile).size : 0;

    checks.push(result(`${language.toUpperCase()} key is unique: ${key}`, key && !keys.has(key), href));
    checks.push(result(`${language.toUpperCase()} href is unique: ${href}`, href && !hrefs.has(href), key));
    checks.push(result(`${language.toUpperCase()} route exists: ${normalizedPath}`, exists, file));
    checks.push(result(`${language.toUpperCase()} route is non-empty: ${normalizedPath}`, size > 0, `${size} bytes`));

    keys.add(key);
    hrefs.add(href);
    routes.push({ language, key, href, normalizedPath, file, exists, size });
  }
}

const hrByKey = new Map(routes.filter(item => item.language === 'hr').map(item => [item.key, item]));
const enByKey = new Map(routes.filter(item => item.language === 'en').map(item => [item.key, item]));
const pairedKeys = [...new Set([...hrByKey.keys(), ...enByKey.keys()])].sort();

for (const key of pairedKeys) {
  if (key === 'language') continue;
  const hr = hrByKey.get(key);
  const en = enByKey.get(key);
  checks.push(result(`HR/EN public route pair exists: ${key}`, Boolean(hr && en), `${hr?.href || 'missing'} | ${en?.href || 'missing'}`));
}

checks.push(result('Navigation schema version is explicit', Number.isInteger(navigation.schemaVersion) && navigation.schemaVersion > 0, String(navigation.schemaVersion || 'missing')));
checks.push(result('HR home route is configured', navigation.brand?.homeHr === '/', String(navigation.brand?.homeHr || 'missing')));
checks.push(result('EN home route is configured', navigation.brand?.homeEn === '/en/', String(navigation.brand?.homeEn || 'missing')));

const failed = checks.filter(item => !item.pass);
const report = {
  generatedAt: new Date().toISOString(),
  branch: 'experience-ai-live-overview',
  scope: 'repository-static-route-audit',
  productionTouched: false,
  productionDeployPerformed: false,
  publicRouteCount: routes.length,
  uniqueStaticFiles: [...new Set(routes.map(item => item.file))].length,
  passed: checks.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'FAIL' : 'PASS',
  routes,
  checks
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORT_DIR, 'route-audit.json'), `${JSON.stringify(report, null, 2)}\n`);

const rows = checks.map(item => `| ${item.pass ? 'PASS' : 'FAIL'} | ${escapeCell(item.name)} | ${escapeCell(item.detail)} |`).join('\n');
const markdown = `# GNK ASG HR/EN Public Route Audit\n\n- Status: **${report.status}**\n- Public route entries: ${report.publicRouteCount}\n- Unique static files: ${report.uniqueStaticFiles}\n- Production touched: NO\n- Production deploy performed: NO\n- Passed: ${report.passed}/${checks.length}\n\n| Result | Check | Detail |\n|---|---|---|\n${rows}\n`;
fs.writeFileSync(path.join(REPORT_DIR, 'route-audit.md'), markdown);
console.log(markdown);

if (failed.length) process.exit(1);

function normalizeRoute(href) {
  const withoutOrigin = href.replace(/^https?:\/\/[^/]+/i, '');
  const withoutQuery = withoutOrigin.split('?')[0].split('#')[0] || '/';
  const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  if (withLeadingSlash === '/') return '/';
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function routeToFile(route) {
  if (route === '/') return 'index.html';
  return path.posix.join(route.replace(/^\//, ''), 'index.html');
}

function result(name, pass, detail = '') {
  return { name, pass: Boolean(pass), detail: String(detail) };
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}
