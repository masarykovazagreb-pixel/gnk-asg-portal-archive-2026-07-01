#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const PORTAL = resolve(ROOT, 'apps/portal');
const WRITE = process.argv.includes('--write');
const ONLY_ARG = process.argv.find((arg) => arg.startsWith('--only='));
const ONLY = new Set(
  String(ONLY_ARG || '')
    .replace(/^--only=/, '')
    .split(',')
    .map((value) => value.trim().replace(/^apps\/portal\//, ''))
    .filter(Boolean)
);
const CSS_TAG = '<link rel="stylesheet" href="/assets/seo-knowledge-graph-v1.css?v=20260801">';
const SCRIPT_TAG = '<script src="/assets/seo-knowledge-graph-v1.js?v=20260801" defer></script>';

const protectedPrefixes = [
  'admin-center/', 'admin-login/', 'mail-studio/', 'webmail/',
  'campaign-mailer/', 'email-status/', 'worker-ops/',
  'operator-dashboard/', 'digital-headquarters/'
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path, files);
    else if (name === 'index.html') files.push(path);
  }
  return files;
}

const candidates = [];
const changed = [];
for (const file of walk(PORTAL)) {
  const rel = relative(PORTAL, file).replaceAll('\\', '/');
  if (ONLY.size > 0 && !ONLY.has(rel)) continue;
  if (protectedPrefixes.some((prefix) => rel.startsWith(prefix))) continue;
  let html = readFileSync(file, 'utf8');
  if (!/class=["'][^"']*\b(?:editorial-wrap\s+article|article\s+editorial-wrap)\b/i.test(html)) continue;
  candidates.push(rel);

  const missingCss = !html.includes('/assets/seo-knowledge-graph-v1.css');
  const missingScript = !html.includes('/assets/seo-knowledge-graph-v1.js');
  if (!missingCss && !missingScript) continue;

  if (missingCss && /<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${CSS_TAG}</head>`);
  if (missingScript && /<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${SCRIPT_TAG}</body>`);

  if (WRITE) writeFileSync(file, html, 'utf8');
  changed.push({ path: rel, missingCss, missingScript });
}

if (ONLY.size > 0) {
  const missing = [...ONLY].filter((path) => !candidates.includes(path));
  if (missing.length > 0) {
    console.error(`Requested canary paths are missing or not editorial pages: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const summary = {
  mode: WRITE ? 'write' : 'inventory',
  scope: ONLY.size > 0 ? 'allowlist' : 'all-editorial',
  requested: [...ONLY],
  candidates: candidates.length,
  wouldChange: changed.length,
  changed
};
console.log(JSON.stringify(summary, null, 2));
