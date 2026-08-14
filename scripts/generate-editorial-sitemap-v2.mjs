#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { publishedItems, canonicalUrl } from './lib/publication-gate-v2.mjs';

const portal = 'apps/portal';
const registryPath = `${portal}/data/editorial-registry.json`;
const sitemapPath = `${portal}/editorial-sitemap.xml`;
const indexPath = `${portal}/sitemap-index.xml`;
const now = new Date(process.env.PUBLICATION_NOW || Date.now());
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const items = publishedItems(registry, now).sort((a, b) => a.path.localeCompare(b.path));
const esc = (v) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const date = (item) => {
  const parsed = new Date(item.publishedAt || item.datePublished || registry.generatedAt || now);
  return Number.isNaN(parsed.getTime()) ? now.toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
};
const rows = items.map((item) => `  <url><loc>${esc(canonicalUrl(item))}</loc><lastmod>${date(item)}</lastmod><changefreq>monthly</changefreq><priority>0.65</priority></url>`);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
writeFileSync(sitemapPath, xml, 'utf8');
const corpusLastmod = items.reduce((latest, item) => date(item) > latest ? date(item) : latest, '1970-01-01');
let index = readFileSync(indexPath, 'utf8');
index = index.replace(/(<loc>https:\/\/gnk-asg\.hr\/editorial-sitemap\.xml<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/, `$1${corpusLastmod}$2`);
writeFileSync(indexPath, index, 'utf8');
console.log(JSON.stringify({version:'GNK_ASG_EDITORIAL_SITEMAP_V2',published:items.length,excluded:(registry.items||[]).length-items.length,corpusLastmod,sha256:createHash('sha256').update(xml).digest('hex')}, null, 2));
