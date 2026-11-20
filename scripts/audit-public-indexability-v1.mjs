// Read-only SEO indexability preflight. No publishing or network requests.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('apps/portal');
const routes = [
  ['/', 'index.html'],
  ['/gnk-aktual/', 'gnk-aktual/index.html'],
  ['/en/gnk-aktual/', 'en/gnk-aktual/index.html']
];
const errors = [];
const seen = new Set();
for (const [route, file] of routes) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  const expected = 'https://gnk-asg.hr' + route;
  if (!title || title.length < 12) errors.push(route + ': missing/short title');
  if (!desc || desc.length < 50) errors.push(route + ': missing/short description');
  if (canonical !== expected) errors.push(route + ': incorrect canonical ' + canonical);
  if (/noindex/i.test(html.match(/<meta\s+name="robots"[^>]*>/i)?.[0] ?? '')) errors.push(route + ': noindex');
  if (seen.has(title)) errors.push(route + ': duplicate title');
  seen.add(title);
  for (const lang of ['hr', 'en', 'x-default']) {
    if (!new RegExp('hreflang="' + lang + '"').test(html)) errors.push(route + ': missing hreflang ' + lang);
  }
  for (const field of ['og:title', 'og:description', 'og:url', 'og:image']) {
    if (!html.includes('property="' + field + '"')) errors.push(route + ': missing ' + field);
  }
}
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap-index.xml'), 'utf8');
if (!robots.includes('Sitemap: https://gnk-asg.hr/sitemap-index.xml')) errors.push('robots: sitemap-index missing');
if (!sitemap.includes('<sitemapindex')) errors.push('sitemap-index: invalid root');
for (const e of errors) console.error('SEO FAIL:', e);
assert.equal(errors.length, 0, errors.length + ' SEO indexability failures');
console.log('SEO PASS: three key routes and sitemap discovery; production indexing not asserted');
