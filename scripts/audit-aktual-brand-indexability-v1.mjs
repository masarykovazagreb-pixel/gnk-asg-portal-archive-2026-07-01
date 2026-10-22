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
const channels = ['zagreb', 'beograd', 'sarajevo', 'budimpesta',
  'ljubljana', 'rim', 'sofija', 'bukurest'];
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
  missingBrandNavigation: 0, duplicateUrls: 0,
  mismatchedOpenGraphPublisher: 0, missingOpenGraphPublisher: 0,
  unverifiedPersonalAuthorLink: 0, mismatchedRegionalLocale: 0,
  sourceOnlyAttributionWarnings: 0
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
    // A media network must consistently identify itself in preview cards, irrespective
    // of the GNK ASG parent company and the page's local language.
    const ogSiteName = html.match(/<meta\b[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';
    if (!ogSiteName) {
      stats.missingOpenGraphPublisher++;
      shown(warningSamples, { url: loc, warning: 'Open Graph site name missing' });
    } else if (ogSiteName !== 'AKTUAL MEDIA') {
      stats.mismatchedOpenGraphPublisher++;
      shown(warningSamples, { url: loc, warning: 'Expected AKTUAL MEDIA social preview identity; received ' + ogSiteName });
    }
    const localeFor = { zagreb:'hr_HR',beograd:'sr_RS',sarajevo:'bs_BA',budimpesta:'hu_HU',
      ljubljana:'sl_SI',rim:'it_IT',sofija:'bg_BG',bukurest:'ro_RO' }[id];
    const htmlLang = html.match(/<html\b[^>]*lang=["']([^"']+)["']/i)?.[1] || '';
    const ogLocale = html.match(/<meta\b[^>]*property=["']og:locale["'][^>]*content=["']([^"']+)["']/i)?.[1] || '';
    // English edition landing pages use en_US and are not national articles.
    if (htmlLang && htmlLang !== 'en' && ogLocale && ogLocale !== localeFor) {
      stats.mismatchedRegionalLocale++;
      shown(warningSamples, { url: loc, warning: 'Mismatched localized Open Graph locale: ' + ogLocale });
    }
    if (isArticle(loc) && /<link\b[^>]*rel=["']author["'][^>]*href=["']https:\/\/gnk-asg\.hr\/nermin-sefic\/?["']/i.test(html)) {
      stats.unverifiedPersonalAuthorLink++;
      shown(warningSamples, { url: loc, warning: 'Automated source commentary incorrectly declares personal rel=author' });
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
// Opt-in strict branding after a fresh source regeneration. The existing --strict
// behavior is unchanged for historical snapshots to avoid unexpected release churn.
stats.brandIdentityIssues = stats.mismatchedOpenGraphPublisher + stats.missingOpenGraphPublisher
  + stats.unverifiedPersonalAuthorLink + stats.mismatchedRegionalLocale;
console.log(JSON.stringify({ summary: stats, errors: errorSamples, warnings: warningSamples }, null, 2));
if (process.argv.includes('--strict') && stats.fatalIssues > 0) process.exitCode = 1;
if (process.argv.includes('--brand-strict') && (stats.fatalIssues > 0 || stats.brandIdentityIssues > 0))
  process.exitCode = 1;
