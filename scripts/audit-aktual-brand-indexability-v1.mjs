#!/usr/bin/env node
/**
 * AKTUAL MEDIA — non-destructive search-indexability audit.
 * Reads the real canonical channel sitemaps and their generated HTML pages.
 * No remote API calls, no search-engine submission, no files modified.
 * Usage: node scripts/audit-aktual-brand-indexability-v1.mjs [--strict]
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps/portal');
const host = 'https://gnk-asg.hr';
/* Popis izdanja se čita s diska, ne upisuje rukom: kad se doda novo
   izdanje, audit ga mora provjeriti bez izmjene ovog skripta. */
const channels = fs.existsSync(path.join(root, 'kanal'))
  ? fs.readdirSync(path.join(root, 'kanal'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(root, 'kanal', e.name, 'sitemap.xml')))
    .map((e) => e.name).sort()
  : [];
const extractLocs = (xml) => [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
  .map((match) => match[1].trim());
const isArticle = (url) => /\/clanak\/[^/]+\/$/.test(url);
const errorSamples = [];
const warningSamples = [];
const stats = {
  checkedAt: new Date().toISOString(),
  brand: 'AKTUAL MEDIA',
  scope: 'repository-only; not a Google indexing confirmation',
  channels: {}, totalSitemapUrls: 0, uniqueUrls: 0, articles: 0,
  indexedByGoogle: 'unknown', missingFiles: 0, badCanonical: 0,
  noindexInSitemap: 0, undefinedLocale: 0, articleSchemaMissing: 0,
  missingBrandNavigation: 0, duplicateUrls: 0
};
const shown = (array, entry) => { if (array.length < 20) array.push(entry); };
const known = new Set();

for (const id of channels) {
  const file = path.join(root, 'kanal', id, 'sitemap.xml');
  if (!fs.existsSync(file)) {
    stats.missingFiles++;
    shown(errorSamples, { path: file, error: 'Missing channel sitemap' });
    continue;
  }
  const urls = extractLocs(fs.readFileSync(file, 'utf8'));
  const result = { urls: urls.length, articles: 0, missing: 0, badCanonical: 0 };
  for (const loc of urls) {
    stats.totalSitemapUrls++;
    if (known.has(loc)) {
      stats.duplicateUrls++;
      shown(errorSamples, { url: loc, error: 'Duplicate sitemap URL' });
    }
    known.add(loc);
    if (!loc.startsWith(host + '/kanal/' + id + '/')) {
      stats.badCanonical++; result.badCanonical++;
      shown(errorSamples, { url: loc, error: 'Out-of-scope sitemap URL' });
      continue;
    }
    const relative = new URL(loc).pathname.replace(/^\/+/, '');
    const htmlFile = path.join(root, relative, 'index.html');
    if (!fs.existsSync(htmlFile)) {
      stats.missingFiles++; result.missing++;
      shown(errorSamples, { url: loc, error: 'HTML not found' });
      continue;
    }
    const html = fs.readFileSync(htmlFile, 'utf8');
    const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
    if (canonical !== loc) {
      stats.badCanonical++; result.badCanonical++;
      shown(errorSamples, { url: loc, error: 'Canonical mismatch', canonical: canonical || null });
    }
    if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) {
      stats.noindexInSitemap++;
      shown(errorSamples, { url: loc, error: 'Sitemap contains noindex HTML' });
    }
    if (/property=["']og:locale["']\s+content=["']undefined/i.test(html)) {
      stats.undefinedLocale++;
      shown(warningSamples, { url: loc, warning: 'Undefined Open Graph locale' });
    }
    if (isArticle(loc)) {
      result.articles++;
      stats.articles++;
      if (!/"@type"\s*:\s*"NewsArticle"/.test(html)) {
        stats.articleSchemaMissing++;
        shown(warningSamples, { url: loc, warning: 'Missing NewsArticle JSON-LD' });
      }
    }
    if (!html.includes('/gnk-aktual/')) {
      stats.missingBrandNavigation++;
      shown(warningSamples, { url: loc, warning: 'No path back to AKTUAL MEDIA hub' });
    }
  }
  stats.channels[id] = result;
}
stats.uniqueUrls = known.size;
const index = path.join(root, 'sitemap-index.xml');
const registered = fs.existsSync(index)
  ? extractLocs(fs.readFileSync(index, 'utf8')) : [];
stats.unregisteredChannelSitemaps = channels.filter(
  (id) => !registered.includes(host + '/kanal/' + id + '/sitemap.xml'));
stats.fatalIssues = stats.missingFiles + stats.badCanonical + stats.duplicateUrls
  + stats.noindexInSitemap + stats.unregisteredChannelSitemaps.length;
console.log(JSON.stringify({ summary: stats, errors: errorSamples, warnings: warningSamples }, null, 2));
if (process.argv.includes('--strict') && stats.fatalIssues > 0) process.exitCode = 1;
