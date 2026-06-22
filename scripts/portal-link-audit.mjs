#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(process.cwd());
const portalRoot = path.resolve(repoRoot, process.argv[2] || 'apps/portal');
const reportRoot = path.resolve(repoRoot, process.argv[3] || 'reports/generated');

if (!fs.existsSync(portalRoot)) {
  throw new Error(`Portal root does not exist: ${portalRoot}`);
}

const allFiles = walk(portalRoot);
const htmlFiles = allFiles.filter(file => file.toLowerCase().endsWith('.html'));
const fileSet = new Set(allFiles.map(normalizePath));
const findings = [];
const pages = [];

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const relativePage = slash(path.relative(portalRoot, htmlFile));
  const baseHref = firstMatch(html, /<base\s+[^>]*href=["']([^"']+)["'][^>]*>/i) || '';
  const links = extractAttributes(html, ['href', 'src', 'action']);
  const ids = extractAttributes(html, ['id']).map(item => item.value).filter(Boolean);
  const duplicateIds = duplicates(ids);
  const seo = inspectSeo(html);
  const localLinks = [];

  for (const link of links) {
    const raw = String(link.value || '').trim();
    if (!raw || shouldIgnore(raw)) continue;

    const target = resolveLocalTarget({
      raw,
      htmlFile,
      portalRoot,
      baseHref
    });

    if (!target) continue;

    const exists = targetExists(target, fileSet);
    localLinks.push({ attribute: link.attribute, raw, target: slash(path.relative(portalRoot, target)), exists });

    if (!exists) {
      findings.push({
        severity: 'error',
        code: 'BROKEN_LOCAL_LINK',
        page: relativePage,
        attribute: link.attribute,
        value: raw,
        resolvedTarget: slash(path.relative(portalRoot, target))
      });
    }
  }

  for (const duplicateId of duplicateIds) {
    findings.push({
      severity: 'error',
      code: 'DUPLICATE_HTML_ID',
      page: relativePage,
      value: duplicateId
    });
  }

  for (const issue of seo.issues) {
    findings.push({
      severity: issue.severity,
      code: issue.code,
      page: relativePage,
      value: issue.value || ''
    });
  }

  pages.push({
    page: relativePage,
    baseHref,
    localLinkCount: localLinks.length,
    brokenLocalLinkCount: localLinks.filter(item => !item.exists).length,
    duplicateIds,
    seo: seo.summary,
    localLinks
  });
}

const summary = {
  generatedAt: new Date().toISOString(),
  portalRoot: slash(path.relative(repoRoot, portalRoot)),
  pageCount: htmlFiles.length,
  scannedFileCount: allFiles.length,
  findingCount: findings.length,
  errors: findings.filter(item => item.severity === 'error').length,
  warnings: findings.filter(item => item.severity === 'warning').length,
  brokenLocalLinks: findings.filter(item => item.code === 'BROKEN_LOCAL_LINK').length,
  duplicateHtmlIds: findings.filter(item => item.code === 'DUPLICATE_HTML_ID').length,
  pagesMissingCanonical: findings.filter(item => item.code === 'SEO_MISSING_CANONICAL').length,
  pagesMissingDescription: findings.filter(item => item.code === 'SEO_MISSING_DESCRIPTION').length,
  pagesMissingHreflang: findings.filter(item => item.code === 'SEO_MISSING_HREFLANG').length
};

fs.mkdirSync(reportRoot, { recursive: true });
fs.writeFileSync(
  path.join(reportRoot, 'portal-link-audit.json'),
  JSON.stringify({ summary, findings, pages }, null, 2),
  'utf8'
);
fs.writeFileSync(
  path.join(reportRoot, 'portal-link-audit.md'),
  renderMarkdown(summary, findings),
  'utf8'
);

console.log(JSON.stringify(summary, null, 2));
process.exitCode = summary.errors > 0 ? 1 : 0;

function walk(root) {
  const output = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'reports') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) output.push(path.resolve(full));
    }
  }

  return output.sort();
}

function extractAttributes(html, attributes) {
  const output = [];
  for (const attribute of attributes) {
    const expression = new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, 'gi');
    let match;
    while ((match = expression.exec(html)) !== null) {
      output.push({ attribute, value: match[1] });
    }
  }
  return output;
}

function inspectSeo(html) {
  const title = firstMatch(html, /<title>([\s\S]*?)<\/title>/i).trim();
  const description = firstMatch(html, /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i).trim() ||
    firstMatch(html, /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i).trim();
  const canonical = firstMatch(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i).trim();
  const hreflangCount = (html.match(/<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=/gi) || []).length;
  const ogTitle = firstMatch(html, /<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i).trim();
  const ogDescription = firstMatch(html, /<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i).trim();
  const robots = firstMatch(html, /<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i).trim();
  const jsonLdCount = (html.match(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>/gi) || []).length;
  const issues = [];

  if (!title) issues.push({ severity: 'error', code: 'SEO_MISSING_TITLE' });
  if (!description) issues.push({ severity: 'error', code: 'SEO_MISSING_DESCRIPTION' });
  if (!canonical) issues.push({ severity: 'warning', code: 'SEO_MISSING_CANONICAL' });
  if (!hreflangCount) issues.push({ severity: 'warning', code: 'SEO_MISSING_HREFLANG' });
  if (!ogTitle) issues.push({ severity: 'warning', code: 'SEO_MISSING_OG_TITLE' });
  if (!ogDescription) issues.push({ severity: 'warning', code: 'SEO_MISSING_OG_DESCRIPTION' });
  if (!robots) issues.push({ severity: 'warning', code: 'SEO_MISSING_ROBOTS' });
  if (!jsonLdCount) issues.push({ severity: 'warning', code: 'SEO_MISSING_JSON_LD' });
  if (title.length > 65) issues.push({ severity: 'warning', code: 'SEO_TITLE_TOO_LONG', value: String(title.length) });
  if (description.length > 165) issues.push({ severity: 'warning', code: 'SEO_DESCRIPTION_TOO_LONG', value: String(description.length) });

  return {
    summary: {
      title,
      titleLength: title.length,
      descriptionLength: description.length,
      canonical,
      hreflangCount,
      ogTitle: Boolean(ogTitle),
      ogDescription: Boolean(ogDescription),
      robots: Boolean(robots),
      jsonLdCount
    },
    issues
  };
}

function resolveLocalTarget({ raw, htmlFile, portalRoot, baseHref }) {
  const clean = raw.split('#')[0].split('?')[0].trim();
  if (!clean) return null;

  if (clean.startsWith('/')) {
    return path.resolve(portalRoot, `.${clean}`);
  }

  const baseDirectory = baseHref && !shouldIgnore(baseHref)
    ? path.resolve(path.dirname(htmlFile), baseHref)
    : path.dirname(htmlFile);

  return path.resolve(baseDirectory, clean);
}

function targetExists(target, fileSet) {
  const normalized = normalizePath(target);
  if (fileSet.has(normalized)) return true;
  if (fileSet.has(normalizePath(path.join(target, 'index.html')))) return true;
  if (!path.extname(target) && fileSet.has(normalizePath(`${target}.html`))) return true;
  return false;
}

function shouldIgnore(value) {
  return /^(?:https?:|mailto:|tel:|data:|javascript:|blob:|#)/i.test(value);
}

function firstMatch(text, expression) {
  return expression.exec(text)?.[1] || '';
}

function duplicates(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value).sort();
}

function normalizePath(value) {
  return path.resolve(value).replaceAll('\\', '/').toLowerCase();
}

function slash(value) {
  return String(value || '').replaceAll('\\', '/');
}

function renderMarkdown(summary, findings) {
  const rows = findings.map(item =>
    `| ${item.severity} | ${item.code} | ${item.page || ''} | ${String(item.value || item.resolvedTarget || '').replaceAll('|', '\\|')} |`
  );

  return [
    '# GNK ASG portal link and SEO audit',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `- Pages: ${summary.pageCount}`,
    `- Scanned files: ${summary.scannedFileCount}`,
    `- Errors: ${summary.errors}`,
    `- Warnings: ${summary.warnings}`,
    `- Broken local links: ${summary.brokenLocalLinks}`,
    `- Duplicate HTML IDs: ${summary.duplicateHtmlIds}`,
    '',
    '| Severity | Code | Page | Value |',
    '|---|---|---|---|',
    ...(rows.length ? rows : ['| info | NO_FINDINGS |  |  |']),
    ''
  ].join('\n');
}
