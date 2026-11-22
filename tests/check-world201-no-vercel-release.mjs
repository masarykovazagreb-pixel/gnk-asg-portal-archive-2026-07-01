#!/usr/bin/env node
// Read-only release gate. Does not publish, fetch RSS, or change production.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const base = join(root, 'apps/portal/gnk-aktual');
const registry = JSON.parse(readFileSync(join(root, 'apps/portal/data/world-countries-v1.json'), 'utf8'));
const countries = registry.countries ?? [];
const sitemapPath = join(base, 'media/sitemap.xml');
assert.equal(registry.count, 201, 'registry count must be 201');
assert.equal(countries.length, 201, 'must contain exactly 201 country entries');
assert.equal(new Set(countries.map(c => c.slug)).size, 201, 'country slugs must be unique');
assert.equal(new Set(countries.map(c => c.code)).size, 201, 'country codes must be unique');
assert(existsSync(sitemapPath), 'world sitemap is missing');
const sitemap = readFileSync(sitemapPath, 'utf8');
for (const c of countries) {
  assert(/^[a-z0-9-]+$/.test(c.slug), 'invalid country slug');
  const dir = join(base, 'media', c.slug);
  const html = join(dir, 'index.html');
  const rss = join(dir, 'feed.xml');
  assert(existsSync(html), 'missing country page: ' + c.slug);
  assert(existsSync(rss), 'missing RSS: ' + c.slug);
  const canonical = 'https://gnk-asg.hr/gnk-aktual/media/' + c.slug + '/';
  assert(readFileSync(html, 'utf8').includes(canonical), 'missing canonical: ' + c.slug);
  assert(sitemap.includes('<loc>' + canonical + '</loc>'), 'missing sitemap entry: ' + c.slug);
  assert(readFileSync(rss, 'utf8').includes('<rss'), 'invalid RSS structure: ' + c.slug);
}
console.log('PASS: 201 unique countries, HTML, RSS, canonical and sitemap references.');
console.log('NOT VERIFIED: source licenses, headline freshness, public hosting, DNS, database or LIVE.');
