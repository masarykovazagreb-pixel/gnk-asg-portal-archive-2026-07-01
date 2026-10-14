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
const existingSitemap = readFileSync(sitemapPath, 'utf8');
const items = publishedItems(registry, now).sort((a, b) => a.path.localeCompare(b.path));
const esc = (v) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const existingLastmodByUrl = new Map(
  [...existingSitemap.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)]
    .map((match) => [match[1], match[2]])
);
const date = (item) => {
  const explicit = item.modifiedAt || item.dateModified || item.publishedAt || item.datePublished || null;
  const parsed = explicit ? new Date(explicit) : null;
  const explicitDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : '';
  const stableExisting = existingLastmodByUrl.get(esc(canonicalUrl(item)));
  const existingDate = /^\d{4}-\d{2}-\d{2}$/.test(stableExisting || '') ? stableExisting : '';
  // A recovered publication date must not regress an already newer lastmod value.
  if (explicitDate && existingDate) return explicitDate > existingDate ? explicitDate : existingDate;
  if (explicitDate) return explicitDate;
  if (existingDate) return existingDate;
  const seeded = new Date(registry.generatedAt || now);
  return Number.isNaN(seeded.getTime()) ? now.toISOString().slice(0, 10) : seeded.toISOString().slice(0, 10);
};
const rows = items.map((item) => {
  const image = item.image ? `<image:image><image:loc>${esc(item.image)}</image:loc><image:title>${esc(item.title || '')}</image:title></image:image>` : '';
  return `  <url><loc>${esc(canonicalUrl(item))}</loc><lastmod>${date(item)}</lastmod><changefreq>monthly</changefreq><priority>0.65</priority>${image}</url>`;
});
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows.join('\n')}\n</urlset>\n`;
writeFileSync(sitemapPath, xml, 'utf8');
const corpusLastmod = items.reduce((latest, item) => date(item) > latest ? date(item) : latest, '1970-01-01');
let index = readFileSync(indexPath, 'utf8');
index = index.replace(/(<loc>https:\/\/gnk-asg\.hr\/editorial-sitemap\.xml<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/, `$1${corpusLastmod}$2`);
writeFileSync(indexPath, index, 'utf8');
console.log(JSON.stringify({version:'GNK_ASG_EDITORIAL_SITEMAP_V2',published:items.length,excluded:(registry.items||[]).length-items.length,corpusLastmod,sha256:createHash('sha256').update(xml).digest('hex')}, null, 2));
