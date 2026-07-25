const { defineConfig, devices } = require('@playwright/test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPORT_ROOT = path.resolve(__dirname, 'test-results', 'visual-contrast');
const PROJECTS = ['chromium-desktop', 'chromium-mobile'];
const HOMEPAGE_ROUTES = ['/', '/en/'];
const safeName = value => value.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9._-]+/gi, '-') || 'index';
const reportName = value => `${safeName(value)}-${crypto.createHash('sha1').update(value).digest('hex').slice(0, 12)}`;
const homepageRetryInvocation = process.argv.includes('--grep') && process.argv.some(value => value.includes('rendered contrast /'));
const missingHomepageRoutes = homepageRetryInvocation
  ? HOMEPAGE_ROUTES.filter(route => PROJECTS.some(project => !fs.existsSync(path.join(REPORT_ROOT, project, `${reportName(route)}.json`))))
  : [];
const retryGrep = missingHomepageRoutes.length
  ? new RegExp(`rendered contrast (${missingHomepageRoutes.map(route => route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`)
  : undefined;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  grep: retryGrep,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'python -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 10000
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 5'] } }
  ]
});
