#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('apps/portal');
const ORIGIN = 'https://gnk-asg.hr';
const EXCLUDED_SEGMENTS = new Set(['admin-center', 'admin-login', 'app', 'private', 'staging']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name === 'index.html') out.push(full);
  }
  return out;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1].trim() : '';
}

function links(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
}

function normalizeUrl(raw) {
  if (!raw) return '';
  try {
    const u = new URL(raw, ORIGIN);
    if (u.origin !== ORIGIN) return u.href;
    u.hash = '';
    u.search = '';
    let p = u.pathname.replace(/\/+/g, '/');
    if (!path.posix.extname(p) && !p.endsWith('/')) p += '/';
    return `${ORIGIN}${p}`;
  } catch {
    return raw;
  }
}

function routeForFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  return `/${rel.replace(/index\.html$/, '')}`;
}

function fileForUrl(raw) {
  const href = normalizeUrl(raw);
  if (!href.startsWith(ORIGIN)) return null;
  const u = new URL(href);
  const rel = decodeURIComponent(u.pathname).replace(/^\/+|\/+$/g, '');
  if (!rel) return path.join(ROOT, 'index.html');
  if (path.posix.extname(rel)) return path.join(ROOT, rel);
  return path.join(ROOT, rel, 'index.html');
}

function isExcluded(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  return rel.split('/').some(s => EXCLUDED_SEGMENTS.has(s));
}

function isNoindex(html) {
  return /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html) ||
    /<meta\b[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(html);
}

function hasLanguageUi(html) {
  return /data-lang=["'](?:hr|en)["']/i.test(html) ||
    /class=["'][^"']*\blang(?:uage-switch)?\b[^"']*["']/i.test(html);
}

const pages = new Map();
const errors = [];

for (const file of walk(ROOT)) {
  if (isExcluded(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (isNoindex(html)) continue;

  const relLinks = links(html);
  const canonicalTag = relLinks.find(t => /\brel=["'][^"']*\bcanonical\b[^"']*["']/i.test(t));
  const canonical = canonicalTag ? normalizeUrl(attr(canonicalTag, 'href')) : '';
  const alternates = new Map();
  for (const tag of relLinks) {
    if (!/\brel=["'][^"']*\balternate\b[^"']*["']/i.test(tag)) continue;
    const lang = attr(tag, 'hreflang').toLowerCase();
    if (!lang) continue;
    alternates.set(lang, normalizeUrl(attr(tag, 'href')));
  }

  const route = routeForFile(file);
  const expectsParity = hasLanguageUi(html) || alternates.has('hr') || alternates.has('en') || alternates.has('x-default');
  pages.set(file, { file, route, canonical, alternates, expectsParity });
}

for (const page of pages.values()) {
  const label = path.relative(ROOT, page.file).split(path.sep).join('/');

  if (page.canonical && page.canonical.includes('/en/en/')) {
    errors.push(`${label}: canonical contains /en/en/: ${page.canonical}`);
  }

  for (const [lang, href] of page.alternates) {
    if (href.includes('/en/en/')) errors.push(`${label}: hreflang ${lang} contains /en/en/: ${href}`);
  }

  if (!page.expectsParity) continue;

  for (const lang of ['hr', 'en', 'x-default']) {
    if (!page.alternates.has(lang)) errors.push(`${label}: missing hreflang=${lang}`);
  }
  if (!page.canonical) errors.push(`${label}: missing canonical`);

  const hr = page.alternates.get('hr');
  const en = page.alternates.get('en');
  const xd = page.alternates.get('x-default');

  if (xd) {
    if (!xd.startsWith(ORIGIN)) {
      errors.push(`${label}: hreflang x-default points off-origin: ${xd}`);
    } else {
      const target = fileForUrl(xd);
      if (!target || !fs.existsSync(target)) {
        errors.push(`${label}: hreflang x-default target missing locally: ${xd}`);
      }
    }
  }

  for (const [lang, href] of [['hr', hr], ['en', en]]) {
    if (!href) continue;
    if (!href.startsWith(ORIGIN)) {
      errors.push(`${label}: hreflang ${lang} points off-origin: ${href}`);
      continue;
    }
    const target = fileForUrl(href);
    if (!target || !fs.existsSync(target)) {
      errors.push(`${label}: hreflang ${lang} target missing locally: ${href}`);
      continue;
    }
    const targetPage = pages.get(target);
    if (!targetPage) {
      errors.push(`${label}: hreflang ${lang} target is excluded/noindex or not audited: ${href}`);
      continue;
    }
    const ownLang = page.route.startsWith('/en/') ? 'en' : 'hr';
    const backlink = targetPage.alternates.get(ownLang);
    const selfCanonical = page.canonical || `${ORIGIN}${page.route}`;
    if (!backlink) {
      errors.push(`${label}: reciprocal hreflang ${ownLang} missing on ${path.relative(ROOT, target).split(path.sep).join('/')}`);
    } else if (normalizeUrl(backlink) !== normalizeUrl(selfCanonical)) {
      errors.push(`${label}: reciprocal hreflang mismatch on ${path.relative(ROOT, target).split(path.sep).join('/')} -> ${backlink}; expected ${selfCanonical}`);
    }
  }

  if (page.canonical) {
    const own = page.route.startsWith('/en/') ? en : hr;
    if (own && normalizeUrl(page.canonical) !== normalizeUrl(own)) {
      errors.push(`${label}: canonical does not match own-language hreflang (${page.canonical} != ${own})`);
    }
  }
}

const audited = [...pages.values()].filter(p => p.expectsParity).length;
console.log(`HR/EN parity audit: ${pages.size} public indexable pages scanned; ${audited} parity-enabled pages checked.`);
if (errors.length) {
  console.error(`Parity errors (${errors.length}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('HR/EN reciprocal parity: OK');
