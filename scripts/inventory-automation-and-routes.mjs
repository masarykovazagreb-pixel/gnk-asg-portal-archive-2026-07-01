#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');
const PROTECTED_PREFIXES = [
  'apps/portal/preuzimanja/api-lab/',
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll('\\', '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function cronValues(text) {
  return [...text.matchAll(/cron:\s*['\"]([^'\"]+)['\"]/g)].map((m) => m[1]);
}

function namedWorkflow(text, fallback) {
  return text.match(/^name:\s*(.+)$/m)?.[1]?.trim() || fallback;
}

const resourcePatterns = [
  { resource: 'news.json', regex: /(?:^|[\/])news\.json\b/gi },
  { resource: 'editorial-plan', regex: /apps[\/]portal[\/]data[\/]editorial-plan/gi },
  { resource: 'blogger-state', regex: /blogger[^\n]{0,120}(?:state|publish)|(?:state|publish)[^\n]{0,120}blogger/gi },
  { resource: 'digital-workforce-metrics', regex: /digital[-_ ]workforce[^\n]{0,120}(?:metric|telemetry)|(?:metric|telemetry)[^\n]{0,120}digital[-_ ]workforce/gi },
  { resource: 'market-data', regex: /market[^\n]{0,120}(?:json|data|snapshot)|(?:json|data|snapshot)[^\n]{0,120}market/gi },
];

const writeSignals = /(?:git\s+add|git\s+commit|writeFile|writeFileSync|appendFile|sed\s+-i|tee\s+|>\s*[^&]|cp\s+|mv\s+)/i;

const workflows = walk(WORKFLOW_DIR)
  .filter((f) => /\.ya?ml$/i.test(f))
  .map((file) => {
    const text = read(file);
    const resources = resourcePatterns
      .filter(({ regex }) => {
        regex.lastIndex = 0;
        return regex.test(text);
      })
      .map(({ resource }) => resource);
    return {
      path: rel(file),
      name: namedWorkflow(text, path.basename(file)),
      schedules: cronValues(text),
      workflowDispatch: /workflow_dispatch\s*:/i.test(text),
      pullRequestTrigger: /pull_request\s*:/i.test(text),
      pushTrigger: /(?:^|\n)\s*push\s*:/i.test(text),
      probableWriter: writeSignals.test(text),
      resources,
    };
  });

const allFiles = walk(ROOT).filter((f) => {
  const relative = rel(f);
  if (relative.startsWith('.git/')) return false;
  if (relative.startsWith('node_modules/')) return false;
  if (PROTECTED_PREFIXES.some((prefix) => relative.startsWith(prefix))) return false;
  return /(?:wrangler\.toml|\.(?:mjs|cjs|js|ts|tsx|py|sh|ya?ml|json))$/i.test(relative);
});

const writerCandidates = [];
for (const file of allFiles) {
  const text = read(file);
  if (!writeSignals.test(text)) continue;
  for (const { resource, regex } of resourcePatterns) {
    regex.lastIndex = 0;
    if (regex.test(text)) writerCandidates.push({ resource, path: rel(file) });
  }
}

const resourceOwnership = Object.fromEntries(
  resourcePatterns.map(({ resource }) => {
    const candidates = [...new Set(writerCandidates.filter((x) => x.resource === resource).map((x) => x.path))];
    return [resource, {
      candidateWriters: candidates,
      candidateWriterCount: candidates.length,
      status: candidates.length <= 1 ? 'single-or-none' : 'conflict',
    }];
  }),
);

const wranglerFiles = allFiles.filter((f) => path.basename(f) === 'wrangler.toml');
const routes = [];
for (const file of wranglerFiles) {
  const text = read(file);
  const worker = text.match(/^name\s*=\s*['\"]([^'\"]+)['\"]/m)?.[1] || path.basename(path.dirname(file));
  for (const match of text.matchAll(/pattern\s*=\s*['\"]([^'\"]+)['\"]/g)) {
    routes.push({ worker, pattern: match[1], config: rel(file) });
  }
}

const duplicateRoutes = Object.entries(
  routes.reduce((acc, route) => {
    (acc[route.pattern] ||= []).push(route);
    return acc;
  }, {}),
)
  .filter(([, entries]) => entries.length > 1)
  .map(([pattern, entries]) => ({ pattern, entries }));

const report = {
  contract: 'GNK_ASG_AUTOMATION_ROUTE_INVENTORY_V1',
  generatedAt: new Date().toISOString(),
  protectedPathsExcluded: PROTECTED_PREFIXES,
  workflowCount: workflows.length,
  workflows,
  resourceOwnership,
  routeCount: routes.length,
  routes,
  duplicateRoutes,
};

report.digest = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
console.log(JSON.stringify(report, null, 2));

const conflicts = Object.values(resourceOwnership).filter((x) => x.status === 'conflict').length;
if (process.argv.includes('--strict') && (conflicts > 0 || duplicateRoutes.length > 0)) process.exit(1);
