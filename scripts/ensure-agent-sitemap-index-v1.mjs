#!/usr/bin/env node
/**
 * Ensures canonical published sub-sitemaps survive sitemap-index regeneration.
 * Idempotent: existing entries are never duplicated. Only local XML files can
 * be registered; missing files are intentionally skipped.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const INDEX = join(PORTAL, 'sitemap-index.xml');
const SITE = 'https://gnk-asg.hr';
const SITEMAPS = ['agent-reviews-sitemap.xml', 'gnk-aktual/media/sitemap.xml'];

if (!existsSync(INDEX)) {
  console.log(JSON.stringify({ ok: true, changed: false, reason: 'nema sitemap indeksa' }));
  process.exit(0);
}
let content = readFileSync(INDEX, 'utf8');
if (!content.includes('</sitemapindex>')) {
  console.error('sitemap-index.xml nema </sitemapindex>');
  process.exit(1);
}
const today = new Date().toISOString().slice(0, 10);
const added = [];
for (const sitemap of SITEMAPS) {
  if (!existsSync(join(PORTAL, sitemap))) continue;
  const loc = `${SITE}/${sitemap}`;
  if (content.includes(`<loc>${loc}</loc>`)) continue;
  const entry = `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
  content = content.replace('</sitemapindex>', `${entry}</sitemapindex>`);
  added.push(sitemap);
}
if (added.length) writeFileSync(INDEX, content, 'utf8');
console.log(JSON.stringify({ ok: true, changed: added.length > 0, added }));
