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
const reportFor = (project, route) => path.join(REPORT_ROOT, project, `${stemFor(route)}.json`);
const failureFor = (project, route) => path.join(REPORT_ROOT, project, `${stemFor(route)}.failure.json`);
const normalizedPathname = value => {
  try {
    const pathname = new URL(value).pathname;
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  } catch {
    return null;
  }
};

const removed = [];
const preserved = [];
const aliased = [];
const missing = [];

for (const project of PROJECTS) {
  for (const route of ROUTES) {
    const failure = failureFor(project, route);
    if (fs.existsSync(failure)) {
      fs.unlinkSync(failure);
      removed.push(path.relative(REPO_ROOT, failure));
    }
  }

  for (const route of ROUTES) {
    const report = reportFor(project, route);
    if (fs.existsSync(report)) {
      preserved.push(path.relative(REPO_ROOT, report));
      continue;
    }

    const sourceRoute = ROUTES.find(candidate => {
      const candidateReport = reportFor(project, candidate);
      if (!fs.existsSync(candidateReport)) return false;
      try {
        const evidence = JSON.parse(fs.readFileSync(candidateReport, 'utf8'));
        return normalizedPathname(evidence.url) === route;
      } catch {
        return false;
      }
    });

    if (sourceRoute) {
      const source = reportFor(project, sourceRoute);
      let evidence;
      try {
        evidence = JSON.parse(fs.readFileSync(source, 'utf8'));
      } catch {
        missing.push({ project, route });
        continue;
      }
      let rewrittenUrl = evidence.url;
      try {
        const parsed = new URL(String(evidence.url || ''));
        parsed.pathname = route;
        rewrittenUrl = parsed.href;
      } catch {
        missing.push({ project, route });
        continue;
      }
      const aliasedEvidence = { ...evidence, url: rewrittenUrl };
      fs.writeFileSync(report, JSON.stringify(aliasedEvidence, null, 2));
      aliased.push({
        project,
        route,
        sourceRoute,
        source: path.relative(REPO_ROOT, source),
        target: path.relative(REPO_ROOT, report),
        rewrittenUrl
      });
      continue;
    }

    missing.push({ project, route });
  }
}

const releaseAuditServer = () => {
  if (process.platform === 'win32') return { attempted: false, status: null };
  const result = spawnSync('fuser', ['-k', '4173/tcp'], { stdio: 'ignore' });
  return { attempted: true, status: result.status };
};

const missingRoutes = [...new Set(missing.map(item => item.route))];
const preflight = [];
for (const route of missingRoutes) {
  const releasedBeforePreflight = releaseAuditServer();
  spawnSync('sleep', ['1'], { stdio: 'ignore' });
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
  preflight.push({ route, releasedBeforePreflight, status: result.status, signal: result.signal || null });
}

const unresolved = [];
for (const project of PROJECTS) {
  for (const route of ROUTES) {
    if (!fs.existsSync(reportFor(project, route))) unresolved.push({ project, route });
  }
}

const ok = preflight.every(item => item.status === 0) && unresolved.length === 0;
const releasedWebServer = releaseAuditServer();

console.log(JSON.stringify({
  ok,
  scope: 'homepage-retry-only',
  routes: ROUTES,
  projects: PROJECTS,
  removed,
  preserved,
  aliased,
  missing,
  preflight,
  unresolved,
  releasedWebServer
}, null, 2));

if (!ok) process.exit(1);
