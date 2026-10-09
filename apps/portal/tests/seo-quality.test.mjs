// SEO and editorial regression checks for the public portal.
// Run: node --test apps/portal/tests/seo-quality.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const SKIP_DIRS = new Set(['node_modules', 'tests', 'assets', '__preview']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', deg: '°', times: '×', copy: '©', reg: '®', trade: '™', euro: '€' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return NAMED[e.toLowerCase()] ?? m;
});
const attr = (html, re) => { const m = html.match(re); return m ? decode(m[1]) : null; };

const pages = walk(root).filter((full) => !/\/google[0-9a-f]+\.html$/.test(full)).map((full) => {
  const html = readFileSync(full, 'utf8');
  return {
    rel: relative(root, full).split('\\').join('/'),
    ownUrl: 'https://gnk-asg.hr/' + relative(root, dirname(full)).split('\\').join('/').replace(/^\.$/, '').replace(/\/?$/, '/').replace(/^\/+/, ''),
    html,
    noindex: /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html),
    title: attr(html, /<title>([^<]*)<\/title>/),
    description: attr(html, /<meta name="description" content="([^"]*)"/),
    canonical: attr(html, /<link rel="canonical" href="([^"]+)"/),
  };
});
const indexable = pages.filter((p) => !p.noindex);

test('indexable pages have title, description and canonical', () => {
  // Known generated gallery/vendor exceptions are handled upstream; these must stay at zero.
  const missing = indexable.filter((p) => !p.title || !p.description || !p.canonical).map((p) => p.rel);
  assert.deepEqual(missing, []);
});

test('meta descriptions are readable length (decoded, <=160 chars)', () => {
  const long = indexable.filter((p) => p.description && p.description.length > 160).map((p) => p.rel);
  assert.deepEqual(long, []);
});

test('hashtags never appear in title or meta description', () => {
  const bad = indexable.filter((p) =>
    /(^|\s)#[\p{L}]/u.test(p.title || '') || /(^|\s)#[\p{L}]/u.test(p.description || '')
  ).map((p) => p.rel);
  assert.deepEqual(bad, []);
});

test('article hashtag blocks have 5-10 visible hashtags', () => {
  const bad = [];
  for (const p of indexable) {
    const m = p.html.match(/<p class="article-hashtags">([\s\S]*?)<\/p>/);
    if (!m) continue;
    const count = (m[1].match(/#[\p{L}][\p{L}\p{N}_]*/gu) || []).length;
    if (count < 5 || count > 10) bad.push(`${p.rel}:${count}`);
  }
  assert.deepEqual(bad, []);
});

test('author box appears only on articles approved in approved_mentions.json', () => {
  const approved = JSON.parse(readFileSync(join(root, 'data/approved_mentions.json'), 'utf8'));
  const set = new Set(approved.approved_urls || []);
  const bad = [];
  for (const p of pages) {
    if (!p.html.includes('class="author-box"')) continue;
    if (!p.canonical || !set.has(p.canonical)) bad.push(p.rel);
  }
  assert.deepEqual(bad, []);
});

test('every author-box page is an approved URL and every approved URL has a box', () => {
  const approved = JSON.parse(readFileSync(join(root, 'data/approved_mentions.json'), 'utf8'));
  const withBox = new Set(pages.filter((p) => p.html.includes('class="author-box"')).map((p) => p.canonical));
  const missing = [...(approved.approved_urls || [])].filter((u) => !withBox.has(u));
  // Approved URLs whose page has no box are reported, not silently accepted.
  assert.deepEqual(missing, []);
});

test('static JSON-LD blocks parse (runtime-built blocks are excluded)', () => {
  const bad = [];
  for (const p of pages) {
    for (const m of p.html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      const body = m[1].trim();
      if (!body.startsWith('{') && !body.startsWith('[')) continue; // built at runtime
      try { JSON.parse(body); } catch (e) { bad.push(`${p.rel}: ${e.message.slice(0, 60)}`); }
    }
  }
  assert.deepEqual(bad, []);
});

test('sitemap lists no noindex page', () => {
  const sm = readFileSync(join(root, 'sitemap.xml'), 'utf8');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  // Compare each page's own URL (not its canonical) against the sitemap.
  const noindexOwn = new Set(pages.filter((p) => p.noindex).map((p) => p.ownUrl));
  const bad = locs.filter((l) => noindexOwn.has(l));
  assert.deepEqual(bad, []);
});

test('ratchet: duplicate title groups and long titles do not grow', () => {
  const groups = new Map();
  for (const p of indexable) {
    if (!p.title) continue;
    groups.set(p.title, (groups.get(p.title) || 0) + 1);
  }
  const dupGroups = [...groups.values()].filter((n) => n > 1).length;
  const longTitles = indexable.filter((p) => p.title && p.title.length > 60).length;
  assert.ok(dupGroups <= 6, `duplicate title groups grew to ${dupGroups} (max 6)`);
  assert.ok(longTitles <= 110, `titles over 60 chars grew to ${longTitles} (max 110)`);
});

test('sadrzaj hub links only to existing section pages', () => {
  const html = readFileSync(join(root, 'sadrzaj/index.html'), 'utf8');
  const hub = html.slice(html.indexOf('HUB:BEGIN'), html.indexOf('HUB:END'));
  const hrefs = [...hub.matchAll(/<a href="\/([^"]+)\/">/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 20, 'hub should list at least 20 sections');
  const missing = hrefs.filter((h) => !existsSync(join(root, h, 'index.html')));
  assert.deepEqual(missing, []);
});
