import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const PORTAL_ROOT = path.join(REPO_ROOT, 'apps', 'portal');
const REPORT_ROOT = path.join(PORTAL_ROOT, 'test-results', 'visual-contrast');
const PROJECTS = ['chromium-desktop', 'chromium-mobile'];
const ROUTES = ['/', '/en/'];
const safeName = value => value.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9._-]+/gi, '-') || 'index';
const stemFor = value => `${safeName(value)}-${crypto.createHash('sha1').update(value).digest('hex').slice(0, 12)}`;
const removed = [];
const preserved = [];
const missing = [];

for (const project of PROJECTS) {
  for (const route of ROUTES) {
    const stem = stemFor(route);
    const failure = path.join(REPORT_ROOT, project, `${stem}.failure.json`);
    const report = path.join(REPORT_ROOT, project, `${stem}.json`);
    if (fs.existsSync(failure)) {
      fs.unlinkSync(failure);
      removed.push(path.relative(REPO_ROOT, failure));
    }
    if (fs.existsSync(report)) preserved.push(path.relative(REPO_ROOT, report));
    else missing.push({ project, route });
  }
}

const missingRoutes = [...new Set(missing.map(item => item.route))];
const preflight = [];
for (const route of missingRoutes) {
  const grep = `^rendered contrast ${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
  const output = path.join('test-results', `playwright-homepage-preflight-${safeName(route)}`);
  const result = spawnSync(
    'npx',
    [
      'playwright', 'test', 'tests/all-pages-visual-contrast.spec.js',
      '--project=chromium-desktop',
      '--project=chromium-mobile',
      '--workers=1',
      '--grep', grep,
      `--output=${output}`,
      '--reporter=line'
    ],
    { cwd: PORTAL_ROOT, stdio: 'inherit', shell: process.platform === 'win32' }
  );
  preflight.push({ route, status: result.status, signal: result.signal || null });
}

console.log(JSON.stringify({
  ok: preflight.every(item => item.status === 0),
  scope: 'homepage-retry-only',
  routes: ROUTES,
  projects: PROJECTS,
  removed,
  preserved,
  missing,
  preflight
}, null, 2));
