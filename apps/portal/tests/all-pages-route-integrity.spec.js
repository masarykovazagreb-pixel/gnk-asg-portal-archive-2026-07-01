const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const PORTAL_ROOT = path.resolve(__dirname, '..');
const IGNORED_DIRECTORIES = new Set(['node_modules', 'test-results', 'playwright-report', '.git']);

function walkHtml(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) out.push(absolute);
  }
  return out;
}

function routeForFile(file) {
  const relative = path.relative(PORTAL_ROOT, file).split(path.sep).join('/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function isRedirectStub(file) {
  const html = fs.readFileSync(file, 'utf8');
  const hasMetaRefresh = /<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/i.test(html);
  const redirectExpression = /(?:window\.)?location\.(?:replace|assign)\s*\(|(?:window\.)?location(?:\.href)?\s*=/i;
  return hasMetaRefresh || (html.length < 8_000 && redirectExpression.test(html));
}

const routeEntries = [...new Map(
  walkHtml(PORTAL_ROOT)
    .filter(file => !isRedirectStub(file))
    .map(file => [routeForFile(file), file])
).keys()].sort((left, right) => left.localeCompare(right));

test.describe.configure({ mode: 'parallel' });
test.setTimeout(30_000);

test.beforeAll(() => {
  expect(routeEntries.length, 'Route-integrity audit must discover non-redirect portal routes').toBeGreaterThan(700);
});

for (const route of routeEntries) {
  test(`route integrity ${route}`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    expect(response, `${route} did not return a response`).not.toBeNull();
    expect(response.status(), `${route} returned HTTP ${response.status()}`).toBeLessThan(500);
    await page.waitForTimeout(500);

    const actual = new URL(page.url());
    expect(actual.origin, `${route} escaped the local audit origin to ${actual.href}`).toBe('http://127.0.0.1:4173');
    expect(actual.pathname, `${route} navigated to ${actual.pathname}`).toBe(route);
  });
}
