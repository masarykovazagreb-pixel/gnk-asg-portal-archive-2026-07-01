#!/usr/bin/env node
// Ensures a concise, consistent WebSite entity on public static HTML pages.
// Read-only by default; pass --write to update pages. Protected SPT/bank routes
// and noindex/redirect pages are skipped. Article authors/bylines are not rewritten.
import fs from 'node:fs';
import path from 'node:path';
import {
  SITE,
  WEBSITE_ID,
  GNK_ASG_PUBLISHER,
  isNerminPersonReference,
} from './lib/editorial-attribution-v1.mjs';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';

const ROOT = 'apps/portal';
const WRITE = process.argv.includes('--write');
const SKIP_ROOTS = new Set([
  'admin', 'admin-center', 'admin-login', 'control', 'automation-status',
  'webmail', 'mail-studio', 'campaign-mailer', 'email-status', 'worker-ops',
  'operator-dashboard', 'digital-headquarters', 'media-registration-admin',
  'podijeli', 'api', 'assets', 'data', '__preview',
]);

function attrValue(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  return match ? match[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
}

function pageRoute(relative) {
  const normalized = relative.split(path.sep).join('/');
  if (/^index\.html$/i.test(normalized)) return '/';
  if (/\/index\.html$/i.test(normalized)) return `/${normalized.replace(/index\.html$/i, '')}`;
  return `/${normalized}`;
}

function shouldSkipDirectory(relative) {
  const segments = relative.split('/');
  return (segments[0] && SKIP_ROOTS.has(segments[0]))
    || (segments[0] === 'en' && segments[1] && SKIP_ROOTS.has(segments[1]));
}

function isNoindexOrRedirect(html) {
  if (/http-equiv=["']refresh["']/i.test(html)) return true;
  return [...html.matchAll(/<meta\b[^>]*>/gi)].some((match) => {
    const tag = match[0];
    const name = attrValue(tag, 'name').toLowerCase();
    const content = attrValue(tag, 'content');
    return ['robots', 'googlebot', 'bingbot'].includes(name) && /\b(?:noindex|none)\b/i.test(content);
  });
}

function websiteNode() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE}/`,
    name: 'GNK ASG',
    inLanguage: ['hr', 'en'],
    publisher: { ...GNK_ASG_PUBLISHER },
  };
}

function normalizeWebsiteNode(node) {
  node['@id'] = WEBSITE_ID;
  node.url = `${SITE}/`;
  node.name = 'GNK ASG';
  node.inLanguage = ['hr', 'en'];
  node.publisher = { ...GNK_ASG_PUBLISHER };
  delete node.keywords;
  if (Array.isArray(node.author)) {
    const keptAuthors = node.author.filter((author) => !isNerminPersonReference(author));
    if (keptAuthors.length) node.author = keptAuthors;
    else delete node.author;
  } else if (isNerminPersonReference(node.author)) {
    delete node.author;
  }
  return node;
}

const DROP = Symbol('drop');

/* Jedna stranica = jedan WebSite entitet. Kad generator ili starija
   objava ostave drugi (ili treći) WebSite u grafu, ovdje se uklanja —
   nikad se ne mijenja sadržaj stranice, samo JSON-LD. */
function updateWebsiteJsonLd(html) {
  const state = { kept: false, removed: 0, normalized: false };

  function clean(value) {
    if (Array.isArray(value)) {
      return value.map((child) => clean(child)).filter((child) => child !== DROP);
    }
    if (!value || typeof value !== 'object') return value;
    const typeList = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (typeList.includes('WebSite')) {
      if (state.kept) return DROP;
      state.kept = true;
      const before = JSON.stringify(value);
      normalizeWebsiteNode(value);
      if (JSON.stringify(value) !== before) state.normalized = true;
      return value;
    }
    for (const key of Object.keys(value)) {
      const cleaned = clean(value[key]);
      if (cleaned === DROP) delete value[key];
      else value[key] = cleaned;
    }
    return value;
  }

  const updated = html.replace(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    (block, raw) => {
      let schema;
      try { schema = JSON.parse(raw); } catch { return block; }
      const before = JSON.stringify(schema);
      const cleaned = clean(schema);
      if (cleaned === DROP) return '';
      if (JSON.stringify(cleaned) === before) return block;
      return `<script type="application/ld+json">${JSON.stringify(cleaned).replace(/</g, '\\u003c')}</script>`;
    },
  );

  if (state.kept) return { html: updated, added: false, normalized: state.normalized };
  const tag = `<script type="application/ld+json">${JSON.stringify(websiteNode()).replace(/</g, '\\u003c')}</script>`;
  const withNode = /<\/head>/i.test(updated)
    ? updated.replace(/<\/head>/i, (closingTag) => `${tag}${closingTag}`)
    : `${tag}${updated}`;
  return { html: withNode, added: true, normalized: false };
}

const files = [];
(function walk(directory) {
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name);
    let stat;
    try { stat = fs.statSync(file); } catch { continue; }
    if (stat.isDirectory()) {
      const relative = path.relative(ROOT, file).split(path.sep).join('/');
      if (shouldSkipDirectory(relative)) continue;
      walk(file);
    } else if (/\.html$/i.test(name)) {
      files.push(file);
    }
  }
})(ROOT);

const stats = {
  mode: WRITE ? 'write' : 'check',
  scannedHtml: files.length,
  eligiblePublicPages: 0,
  protectedSkipped: 0,
  noindexOrRedirectSkipped: 0,
  added: 0,
  normalized: 0,
  changed: 0,
  changedPages: [],
};

for (const file of files) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const route = pageRoute(relative);
  if (isProtectedEditorialRoute(route)) {
    stats.protectedSkipped++;
    continue;
  }
  const original = fs.readFileSync(file, 'utf8');
  if (isNoindexOrRedirect(original)) {
    stats.noindexOrRedirectSkipped++;
    continue;
  }
  stats.eligiblePublicPages++;
  const result = updateWebsiteJsonLd(original);
  if (result.added) stats.added++;
  if (result.normalized) stats.normalized++;
  if (result.html !== original) {
    stats.changed++;
    stats.changedPages.push(route);
    if (WRITE) fs.writeFileSync(file, result.html, 'utf8');
  }
}

console.log(JSON.stringify({ ...stats, changedPages: WRITE ? stats.changedPages : stats.changedPages.slice(0, 40) }, null, 2));
