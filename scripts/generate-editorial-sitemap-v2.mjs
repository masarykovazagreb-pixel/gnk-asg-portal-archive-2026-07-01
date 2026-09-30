#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { publishedItems, canonicalUrl } from './lib/publication-gate-v2.mjs';

const portal = 'apps/portal';
const registryPath = `${portal}/data/editorial-registry.json`;
const sitemapPath = `${portal}/editorial-sitemap.xml`;
const indexPath = `${portal}/sitemap-index.xml`;
const now = new Date(process.env.PUBLICATION_NOW || Date.now());
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const items = publishedItems(registry, now);
const esc = (v) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const fallbackDate = (() => {
  const parsed = new Date(registry.generatedAt || now);
  return Number.isNaN(parsed.getTime()) ? now.toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
})();
const dateOf = (value, fallback = fallbackDate) => {
  const parsed = new Date(value || '');
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
};
const registryDate = (item) => dateOf(item.publishedAt || item.datePublished);
const canonicalFromHtml = (html) => {
  const tag = html.match(/<link\b[^>]*\brel=["'][^"']*\bcanonical\b[^"']*["'][^>]*>/i)?.[0]
    || html.match(/<link\b[^>]*\bhref=["'][^"']+["'][^>]*\brel=["'][^"']*\bcanonical\b[^"']*["'][^>]*>/i)?.[0];
  return tag?.match(/\bhref=["']([^"']+)["']/i)?.[1]?.trim() || '';
};
const publishedDateFromHtml = (html) => {
  const meta = html.match(/<meta\b[^>]*\bproperty=["']article:published_time["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/i)?.[1]
    || html.match(/<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bproperty=["']article:published_time["'][^>]*>/i)?.[1]
    || html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1];
  return dateOf(meta);
};
const enRoots = ['publications', 'analyses', 'commentary'];
const enSeoItems = [];
for (const section of enRoots) {
  const base = join(portal, 'en', section);
  if (!existsSync(base)) continue;
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(base, entry.name, 'index.html');
    if (!existsSync(file)) continue;
    const html = readFileSync(file, 'utf8');
    if (/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*\bnoindex\b/i.test(html)) continue;
    const expected = `https://gnk-asg.hr/en/${section}/${entry.name}/`;
    const canonical = canonicalFromHtml(html);
    if (!canonical) throw new Error(`EN editorial page has no canonical: ${file}`);
    if (canonical !== expected) throw new Error(`EN editorial canonical mismatch: ${file} -> ${canonical}; expected ${expected}`);
    enSeoItems.push({ url: canonical, lastmod: fallbackDate });
  }
}

// HR distribution registry and EN SEO inventory are intentionally separate.
// The registry remains the source for external blog distribution; scanning EN
// pages here prevents an SEO fix from accidentally mirroring the EN backlog.
const canonicalRows = new Map();
for (const item of items) {
  const url = canonicalUrl(item);
  const lastmod = registryDate(item);
  const previous = canonicalRows.get(url);
  if (!previous || lastmod > previous.lastmod) canonicalRows.set(url, { url, lastmod, source: 'registry' });
}
for (const item of enSeoItems) {
  const previous = canonicalRows.get(item.url);
  if (!previous || item.lastmod > previous.lastmod) canonicalRows.set(item.url, { ...item, source: 'en-file-tree' });
}
const canonicalItems = [...canonicalRows.values()].sort((a, b) => a.url.localeCompare(b.url));
const rows = canonicalItems.map(({ url, lastmod }) => `  <url><loc>${esc(url)}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.65</priority></url>`);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
writeFileSync(sitemapPath, xml, 'utf8');
const corpusLastmod = canonicalItems.reduce((latest, item) => item.lastmod > latest ? item.lastmod : latest, '1970-01-01');
let index = readFileSync(indexPath, 'utf8');
index = index.replace(/(<loc>https:\/\/gnk-asg\.hr\/editorial-sitemap\.xml<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/, `$1${corpusLastmod}$2`);
writeFileSync(indexPath, index, 'utf8');
console.log(JSON.stringify({
  version:'GNK_ASG_EDITORIAL_SITEMAP_V4_HYBRID_SEO_INVENTORY',
  publishedRegistryItems:items.length,
  enSeoOnlyItems:enSeoItems.length,
  canonicalUrls:canonicalItems.length,
  dedupedRegistryAliases:items.length-new Set(items.map(canonicalUrl)).size,
  excluded:(registry.items||[]).length-items.length,
  corpusLastmod,
  sha256:createHash('sha256').update(xml).digest('hex')
}, null, 2));
