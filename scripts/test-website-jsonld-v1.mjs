#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SITE, WEBSITE_ID, ORGANIZATION_ID, isNerminPersonReference } from './lib/editorial-attribution-v1.mjs';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';

const ROOT = 'apps/portal';
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
function routeFor(relative) {
  const normalized = relative.split(path.sep).join('/');
  if (/^index\.html$/i.test(normalized)) return '/';
  if (/\/index\.html$/i.test(normalized)) return `/${normalized.replace(/index\.html$/i, '')}`;
  return `/${normalized}`;
}
function skipDirectory(relative) {
  const parts = relative.split('/');
  return (parts[0] && SKIP_ROOTS.has(parts[0])) || (parts[0] === 'en' && parts[1] && SKIP_ROOTS.has(parts[1]));
}
function isNoindexOrRedirect(html) {
  if (/http-equiv=["']refresh["']/i.test(html)) return true;
  return [...html.matchAll(/<meta\b[^>]*>/gi)].some(({ 0: tag }) => {
    const name = attrValue(tag, 'name').toLowerCase();
    return ['robots', 'googlebot', 'bingbot'].includes(name)
      && /\b(?:noindex|none)\b/i.test(attrValue(tag, 'content'));
  });
}
function collectWebsiteNodes(value, result) {
  if (Array.isArray(value)) {
    for (const child of value) collectWebsiteNodes(child, result);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.includes('WebSite')) result.push(value);
  for (const child of Object.values(value)) collectWebsiteNodes(child, result);
}
function jsonLdBodies(html) {
  const bodies = [];
  const source = String(html || '');
  const lower = source.toLowerCase();
  let cursor = 0;
  while (cursor < source.length) {
    const openStart = lower.indexOf('<script', cursor);
    if (openStart < 0) break;
    const openEnd = source.indexOf('>', openStart);
    if (openEnd < 0) break;
    const openTag = source.slice(openStart, openEnd + 1);
    const closeStart = lower.indexOf('</script', openEnd + 1);
    if (closeStart < 0) break;
    const closeEnd = source.indexOf('>', closeStart);
    if (closeEnd < 0) break;
    if (/\btype=["']application\/ld\+json["']/i.test(openTag)) {
      bodies.push(source.slice(openEnd + 1, closeStart));
    }
    cursor = closeEnd + 1;
  }
  return bodies;
}

const files = [];
(function walk(directory) {
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      const relative = path.relative(ROOT, file).split(path.sep).join('/');
      if (!skipDirectory(relative)) walk(file);
    } else if (/\.html$/i.test(name)) files.push(file);
  }
})(ROOT);

const stats = { audited: 0, protectedSkipped: 0, noindexOrRedirectSkipped: 0, malformedJsonLdBlocks: 0, websiteNodes: 0 };
const failures = [];
for (const file of files) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  if (isProtectedEditorialRoute(routeFor(relative))) {
    stats.protectedSkipped++;
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  if (isNoindexOrRedirect(html)) {
    stats.noindexOrRedirectSkipped++;
    continue;
  }
  stats.audited++;
  const websites = [];
  for (const raw of jsonLdBodies(html)) {
    try { collectWebsiteNodes(JSON.parse(raw), websites); }
    catch { stats.malformedJsonLdBlocks++; }
  }
  if (websites.length !== 1) {
    failures.push(`${routeFor(relative)}: expected exactly 1 WebSite node, found ${websites.length}`);
    continue;
  }
  stats.websiteNodes++;
  const website = websites[0];
  if (website['@id'] !== WEBSITE_ID) failures.push(`${routeFor(relative)}: unexpected WebSite @id`);
  if (website.name !== 'GNK ASG' || /nermin\s+sefi[cć]/i.test(String(website.name))) failures.push(`${routeFor(relative)}: incorrect or person-derived WebSite name`);
  if (website.url !== `${SITE}/`) failures.push(`${routeFor(relative)}: incorrect WebSite url`);
  if (website.keywords !== undefined) failures.push(`${routeFor(relative)}: WebSite carries keywords`);
  const languages = Array.isArray(website.inLanguage) ? website.inLanguage : [website.inLanguage];
  if (!languages.includes('hr') || !languages.includes('en')) failures.push(`${routeFor(relative)}: WebSite language coverage is incomplete`);
  if (website.publisher?.['@id'] !== ORGANIZATION_ID) failures.push(`${routeFor(relative)}: publisher is not the GNK ASG organization`);
  if (isNerminPersonReference(website.author)) failures.push(`${routeFor(relative)}: Nermin is incorrectly marked as WebSite author`);
}

assert.equal(failures.length, 0, failures.slice(0, 30).join('\n') || 'WebSite JSON-LD audit failed');
console.log(JSON.stringify({ ok: true, ...stats, failures: 0 }, null, 2));
