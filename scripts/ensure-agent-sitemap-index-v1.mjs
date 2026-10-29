#!/usr/bin/env node
/**
 * Osigurava da sitemap-index.xml navodi agent-reviews-sitemap.xml.
 *
 * Generatori sitemap-indeksa pišu indeks iz vlastitog popisa, pa unos koji
 * dodaje objava pregleda (publish-agent-reviews-v1) može nestati pri
 * sljedećoj sinkronizaciji. Ovaj korak ga vraća. Idempotentan je.
 *
 *   node scripts/ensure-agent-sitemap-index-v1.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const INDEX = join(PORTAL, 'sitemap-index.xml');
const SITE = 'https://gnk-asg.hr';
const SITEMAP = 'agent-reviews-sitemap.xml';

if (!existsSync(join(PORTAL, SITEMAP)) || !existsSync(INDEX)) {
  console.log(JSON.stringify({ ok: true, changed: false, reason: 'nema sitemapa pregleda ili indeksa' }));
  process.exit(0);
}
const text = readFileSync(INDEX, 'utf8');
if (text.includes(SITEMAP)) {
  console.log(JSON.stringify({ ok: true, changed: false }));
  process.exit(0);
}
const today = new Date().toISOString().slice(0, 10);
const entry = `  <sitemap>\n    <loc>${SITE}/${SITEMAP}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
if (!text.includes('</sitemapindex>')) {
  console.error('sitemap-index.xml nema </sitemapindex>');
  process.exit(1);
}
writeFileSync(INDEX, text.replace('</sitemapindex>', `${entry}</sitemapindex>`));
console.log(JSON.stringify({ ok: true, changed: true }));
