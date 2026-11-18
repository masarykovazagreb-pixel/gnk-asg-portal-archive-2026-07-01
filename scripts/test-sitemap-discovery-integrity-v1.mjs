import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Validate discoverability without fabricating pages, URLs, rankings or metadata.
const root = path.resolve('apps/portal');
const origin = 'https://gnk-asg.hr';
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
const index = fs.readFileSync(path.join(root, 'sitemap-index.xml'), 'utf8');
const declared = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gm)].map(m => m[1]);
const indexed = [...index.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m => m[1].trim());
assert.ok(declared.length, 'robots.txt must declare sitemaps');
assert.ok(indexed.length, 'sitemap index must list sitemaps');
assert.equal(new Set(declared).size, declared.length, 'duplicate robots sitemap declaration');
assert.equal(new Set(indexed).size, indexed.length, 'duplicate sitemap index URL');
const failures = [];
function validate(url, context) {
  let parsed;
  try { parsed = new URL(url); } catch { failures.push(`${context}: invalid URL ${url}`); return; }
  if (parsed.origin !== origin || parsed.search || parsed.hash) {
    failures.push(`${context}: noncanonical sitemap URL ${url}`); return;
  }
  const relative = decodeURIComponent(parsed.pathname).replace(/^\//, '');
  if (!relative || relative.includes('..') || !relative.endsWith('.xml')) {
    failures.push(`${context}: unsafe sitemap path ${url}`); return;
  }
  if (!fs.existsSync(path.join(root, relative))) failures.push(`${context}: missing file ${relative}`);
}
declared.forEach(url => validate(url, 'robots'));
indexed.forEach(url => validate(url, 'index'));
if (!declared.includes(origin + '/sitemap-index.xml')) failures.push('robots: missing primary sitemap index');
// A sitemap index is sufficient discovery: children need not repeat in robots.txt.
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(JSON.stringify({ok:true,robotsSitemaps:declared.length,indexedSitemaps:indexed.length}));
