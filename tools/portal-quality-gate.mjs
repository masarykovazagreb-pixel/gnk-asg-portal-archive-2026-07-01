#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const root = path.resolve(valueAfter('--root', 'apps/portal'));
const outDir = path.resolve(valueAfter('--out', 'reports/portal-quality-gate'));
const repoRoot = path.resolve(root, '..', '..');
const strict = args.includes('--strict');
const generatedAt = new Date().toISOString();

if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Portal root does not exist: ${root}`);
  process.exit(2);
}

const skippedDirectories = new Set(['.git', 'node_modules', 'reports', 'coverage', 'dist', 'build', '.wrangler']);
const issues = [];
const files = [];
const bppReferences = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    if (entry.isFile()) files.push(absolute);
  }
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function report(severity, code, file, message, details = {}) {
  issues.push({ severity, code, file: file ? relative(file) : null, message, ...details });
}

function read(file) {
  try {
    if (fs.statSync(file).size > 5 * 1024 * 1024) return null;
    return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return null;
  }
}

function attributes(tag) {
  const result = {};
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(pattern)) {
    const key = match[1].toLowerCase();
    if (['meta', 'link', 'img', 'a', 'script', 'source'].includes(key)) continue;
    result[key] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return result;
}

function tags(html, name) {
  const pattern = new RegExp(`<${name}\\b[^>]*>`, 'gi');
  return [...html.matchAll(pattern)].map((match) => attributes(match[0]));
}

function meta(html, key, expected) {
  const wanted = expected.toLowerCase();
  for (const item of tags(html, 'meta')) {
    if ((item[key] || '').toLowerCase() === wanted) return (item.content || '').trim();
  }
  return '';
}

function canonical(html) {
  for (const item of tags(html, 'link')) {
    const relations = (item.rel || '').toLowerCase().split(/\s+/);
    if (relations.includes('canonical')) return (item.href || '').trim();
  }
  return '';
}

function hasNoIndex(html) {
  return /<meta\b[^>]*name\s*=\s*["']robots["'][^>]*content\s*=\s*["'][^"']*noindex/i.test(html)
    || /<meta\b[^>]*content\s*=\s*["'][^"']*noindex[^"']*["'][^>]*name\s*=\s*["']robots["']/i.test(html);
}

function normalizeCanonical(input) {
  if (!input) return '';
  try {
    const url = new URL(input, 'https://gnk-asg.hr');
    url.hash = '';
    url.search = '';
    const pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '');
    return `${url.origin.toLowerCase()}${pathname}`;
  } catch {
    return input.trim().replace(/\/$/, '');
  }
}

function route(file) {
  const name = relative(file);
  if (/^index\.html?$/i.test(name)) return '/';
  if (/\/index\.html?$/i.test(name)) return `/${name.replace(/index\.html?$/i, '')}`;
  return `/${name}`;
}

function isExternal(reference) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference)
    || reference.includes('{{')
    || reference.includes('${');
}

function candidates(sourceFile, reference) {
  let clean = String(reference || '').split('#')[0].split('?')[0].trim();
  if (!clean || isExternal(clean)) return [];
  try { clean = decodeURIComponent(clean); } catch {}
  const absolute = clean.startsWith('/')
    ? path.resolve(root, `.${clean}`)
    : path.resolve(path.dirname(sourceFile), clean);
  const values = [absolute];
  if (clean.endsWith('/')) values.push(path.join(absolute, 'index.html'));
  if (!path.extname(absolute)) values.push(`${absolute}.html`, path.join(absolute, 'index.html'));
  return [...new Set(values)];
}

function imageKey(sourceFile, reference) {
  const possible = candidates(sourceFile, reference);
  if (!possible.length) return '';
  return path.relative(root, possible[0]).split(path.sep).join('/').toLowerCase();
}

function collectBppReferences() {
  const roots = ['apps', 'workers', 'packages', 'contracts', 'docs'];
  const extensions = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.jsonc', '.md', '.txt', '.yml', '.yaml', '.toml', '.xml', '.svg', '.py', '.ps1', '.sh', '.sql']);
  const phrase = /bpp\.is|bitcoin\s+payment\s+processor|online\s+currency\s+exchange\s*\/\s*payment\s+processor|(?:bpp|bitcoin-payment-processor|bitcoinpaymentprocessor|payment-processor)\.gnk-asg\.hr|gnk-asg\.hr\/(?:bpp|bitcoin-payment-processor|bitcoinpaymentprocessor|payment-processor)/i;
  const forbidden = /https?:\/\/(?:www\.)?(?:bpp|bitcoin-payment-processor|bitcoinpaymentprocessor|payment-processor)\.gnk-asg\.hr|https?:\/\/(?:www\.)?gnk-asg\.hr\/(?:bpp|bitcoin-payment-processor|bitcoinpaymentprocessor|payment-processor)|http:\/\/(?:www\.)?bpp\.is|https?:\/\/www\.bpp\.is/i;

  function scan(directory) {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        scan(absolute);
        continue;
      }
      if (!entry.isFile() || !extensions.has(path.extname(entry.name).toLowerCase())) continue;
      const text = read(absolute);
      if (text == null || text.includes('\u0000')) continue;
      const lines = text.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (!phrase.test(line)) return;
        const item = {
          file: path.relative(repoRoot, absolute).split(path.sep).join('/'),
          line: index + 1,
          text: line.trim().slice(0, 600),
          forbiddenAlias: forbidden.test(line)
        };
        bppReferences.push(item);
        if (item.forbiddenAlias) {
          report('error', 'BPP_DOMAIN_ALIAS', absolute, 'Deprecated BPP domain alias found; use https://bpp.is/.', { line: item.line, excerpt: item.text });
        }
      });
    }
  }

  for (const item of roots) scan(path.join(repoRoot, item));
}

walk(root);
collectBppReferences();

const htmlFiles = files.filter((file) => /\.html?$/i.test(file));
const allFiles = new Set(files.map((file) => path.resolve(file)));
const canonicals = new Map();
const imageUsage = new Map();
const pageSummary = [];

for (const file of htmlFiles) {
  const html = read(file);
  if (html == null) {
    report('error', 'HTML_UNREADABLE', file, 'HTML file could not be read.');
    continue;
  }

  const noindex = hasNoIndex(html);
  const hiddenPath = relative(file).split('/').some((part) => part.startsWith('.') || part.startsWith('__'));
  const publicPage = !noindex && !hiddenPath;
  const lang = (html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i)?.[1] || '').trim();
  const title = (html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]*>/g, '').trim();
  const description = meta(html, 'name', 'description');
  const viewport = meta(html, 'name', 'viewport');
  const canonicalUrl = canonical(html);

  if (!lang) report('error', 'MISSING_LANG', file, 'Missing html lang attribute.');
  if (!title) report('error', 'MISSING_TITLE', file, 'Missing document title.');
  if (!viewport) report('warning', 'MISSING_VIEWPORT', file, 'Missing viewport meta tag.');
  if (publicPage && !description) report('warning', 'MISSING_DESCRIPTION', file, 'Public page is missing a meta description.');
  if (publicPage && !canonicalUrl) report('warning', 'MISSING_CANONICAL', file, 'Public page is missing a canonical URL.');
  if (/^(?:admin|operator|private|internal)\//i.test(relative(file)) && !noindex) {
    report('error', 'PRIVATE_ROUTE_INDEXABLE', file, 'Administrative or private route is not marked noindex.');
  }

  if (canonicalUrl) {
    const normalized = normalizeCanonical(canonicalUrl);
    const current = canonicals.get(normalized) || [];
    current.push(relative(file));
    canonicals.set(normalized, current);
    if (!/^https:\/\//i.test(canonicalUrl)) {
      report('warning', 'CANONICAL_NOT_ABSOLUTE', file, 'Canonical URL should be absolute.', { canonical: canonicalUrl });
    }
  }

  const references = [];
  for (const item of tags(html, 'a')) if (item.href) references.push({ type: 'link', value: item.href });
  for (const name of ['img', 'source', 'script', 'video', 'audio', 'iframe']) {
    for (const item of tags(html, name)) {
      if (item.src) references.push({ type: ['img', 'source'].includes(name) ? 'image' : 'asset', value: item.src });
      if (item.srcset) {
        for (const part of item.srcset.split(',')) {
          const source = part.trim().split(/\s+/)[0];
          if (source) references.push({ type: 'image', value: source });
        }
      }
    }
  }
  for (const item of tags(html, 'link')) {
    if (item.href && /(?:stylesheet|icon|manifest|preload|modulepreload)/i.test(item.rel || '')) {
      references.push({ type: 'asset', value: item.href });
    }
  }

  const seen = new Set();
  for (const reference of references) {
    const key = `${reference.type}:${reference.value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (reference.type === 'image') {
      const normalizedImage = imageKey(file, reference.value);
      if (normalizedImage) {
        const usage = imageUsage.get(normalizedImage) || { reference: reference.value, pages: new Set() };
        usage.pages.add(relative(file));
        imageUsage.set(normalizedImage, usage);
      }
    }

    const possible = candidates(file, reference.value);
    if (!possible.length) continue;
    const exists = possible.some((item) => allFiles.has(path.resolve(item)) || fs.existsSync(item));
    const dynamic = reference.type === 'link' && /^\/(?:api|objave|publications)\//i.test(reference.value);
    if (!exists && !dynamic) {
      report(reference.type === 'link' ? 'warning' : 'error', reference.type === 'link' ? 'BROKEN_INTERNAL_LINK' : 'MISSING_ASSET', file, `Local ${reference.type} target was not found.`, { target: reference.value });
    }
  }

  const installLinks = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']*(?:install|app)[^"']*)["'][^>]*>/gi)].map((match) => match[1]);
  const counts = installLinks.reduce((map, href) => map.set(href, (map.get(href) || 0) + 1), new Map());
  for (const [href, count] of counts) {
    if (count > 1) report('warning', 'DUPLICATE_INSTALL_LINK', file, 'Install/app link is repeated on the same page.', { target: href, count });
  }

  pageSummary.push({ file: relative(file), route: route(file), public: publicPage, noindex, lang, title, description, canonical: canonicalUrl });
}

for (const [canonicalUrl, pages] of canonicals) {
  if (!canonicalUrl || pages.length < 2) continue;
  for (const page of pages) {
    report('error', 'DUPLICATE_CANONICAL', path.join(root, page), 'Canonical URL is shared by multiple HTML pages.', { canonical: canonicalUrl, pages });
  }
}

for (const [image, usage] of imageUsage) {
  if (usage.pages.size < 2 || /(?:logo|icon|favicon|brand|flag|badge)/i.test(image)) continue;
  for (const page of usage.pages) {
    report('warning', 'REUSED_CONTENT_IMAGE', path.join(root, page), 'The same content image is used on multiple pages.', { image, pages: [...usage.pages].sort() });
  }
}

const imageRegistry = [...imageUsage.entries()]
  .map(([image, usage]) => ({ image, sourceReference: usage.reference, usageCount: usage.pages.size, pages: [...usage.pages].sort() }))
  .sort((a, b) => b.usageCount - a.usageCount || a.image.localeCompare(b.image));

const totals = issues.reduce((result, issue) => {
  result[issue.severity] = (result[issue.severity] || 0) + 1;
  return result;
}, { error: 0, warning: 0, info: 0 });

issues.sort((a, b) => a.severity.localeCompare(b.severity) || (a.file || '').localeCompare(b.file || '') || a.code.localeCompare(b.code));

const result = {
  schemaVersion: 2,
  generatedAt,
  root: path.relative(process.cwd(), root).split(path.sep).join('/'),
  strict,
  summary: {
    scannedFiles: files.length,
    htmlFiles: htmlFiles.length,
    publicHtmlFiles: pageSummary.filter((page) => page.public).length,
    canonicalUrls: canonicals.size,
    indexedImages: imageRegistry.length,
    bppReferences: bppReferences.length,
    bppForbiddenAliases: bppReferences.filter((item) => item.forbiddenAlias).length,
    errors: totals.error,
    warnings: totals.warning,
    infos: totals.info
  },
  pages: pageSummary,
  imageRegistry,
  bppReferences,
  issues
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'audit.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outDir, 'image-usage-registry.json'), `${JSON.stringify({ generatedAt, images: imageRegistry }, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outDir, 'bpp-references.json'), `${JSON.stringify({ generatedAt, canonicalUrl: 'https://bpp.is/', references: bppReferences }, null, 2)}\n`, 'utf8');

const markdown = [
  '# GNK ASG Portal Quality Gate',
  '',
  `Generated: ${generatedAt}`,
  '',
  '## Summary',
  '',
  `- Scanned files: ${result.summary.scannedFiles}`,
  `- HTML files: ${result.summary.htmlFiles}`,
  `- Public HTML files: ${result.summary.publicHtmlFiles}`,
  `- Canonical URLs: ${result.summary.canonicalUrls}`,
  `- Indexed images: ${result.summary.indexedImages}`,
  `- BPP references: ${result.summary.bppReferences}`,
  `- Forbidden BPP aliases: ${result.summary.bppForbiddenAliases}`,
  `- Errors: ${result.summary.errors}`,
  `- Warnings: ${result.summary.warnings}`,
  '',
  '## BPP domain policy',
  '',
  '- Official host: `bpp.is`',
  '- Official URL: `https://bpp.is/`',
  '',
  '## Issues',
  ''
];

if (!issues.length) markdown.push('No issues found.');
for (const issue of issues) {
  const details = [issue.target && `target=${issue.target}`, issue.canonical && `canonical=${issue.canonical}`, issue.image && `image=${issue.image}`].filter(Boolean).join('; ');
  markdown.push(`- **${issue.severity.toUpperCase()} ${issue.code}** — ${issue.file || 'repository'} — ${issue.message}${details ? ` (${details})` : ''}`);
}

markdown.push('', '## Gate mode', '', strict ? 'Strict mode: errors fail the command.' : 'Audit mode: findings are reported without failing the command.', '');
fs.writeFileSync(path.join(outDir, 'audit.md'), `${markdown.join('\n')}\n`, 'utf8');

const fingerprint = crypto.createHash('sha256').update(JSON.stringify(issues)).digest('hex').slice(0, 16);
console.log(`GNK ASG quality gate: ${totals.error} error(s), ${totals.warning} warning(s), ${bppReferences.length} BPP reference(s), fingerprint ${fingerprint}`);
console.log(`BPP reference report: ${path.join(outDir, 'bpp-references.json')}`);
console.log(`Report: ${path.join(outDir, 'audit.md')}`);

if (strict && totals.error > 0) process.exit(1);
