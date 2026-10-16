#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://gnk-asg.hr';
const PORTAL = 'apps/portal';
const PATHS = {
  registry: `${PORTAL}/data/editorial-registry.json`,
  queue: 'content/factory-queue/queue.json',
  state: `${PORTAL}/data/content-queue-state.json`,
  legacyQueue: `${PORTAL}/data/kolumne-red`,
  legacyFeed: `${PORTAL}/data/kolumne.json`,
  indexes: {
    hr: `${PORTAL}/gnk-aktual/kolumne/index.html`,
    en: `${PORTAL}/en/gnk-aktual/columns/index.html`,
  },
};
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];
const fail = (message) => errors.push(message);
const now = new Date(process.env.ASG_EDITORIAL_NOW || Date.now());
if (!Number.isFinite(now.getTime())) throw new Error('Invalid ASG_EDITORIAL_NOW');
const nowZagreb = {
  date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now),
  time: new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zagreb', hour: '2-digit', minute: '2-digit', hour12: false }).format(now),
};
const isFuture = (item) => item.date > nowZagreb.date || (item.date === nowZagreb.date && item.time > nowZagreb.time);
const validDate = (date) => {
  if (!/^20\d\d-\d\d-\d\d$/.test(date || '')) return false;
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
};
const sectionSource = (html, id) => html.match(new RegExp(`<section\\b[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/section>`, 'i'))?.[1] || '';
const routesIn = (source, prefix) => [...new Set([...source.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
  .map((match) => match[1]).filter((href) => href.startsWith(prefix)))];
const publicContentKeys = new Set(['body', 'content', 'draft', 'fulltext', 'html', 'markdown', 'text', 'tekst']);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

for (const file of [PATHS.registry, PATHS.queue, PATHS.state, PATHS.legacyFeed, ...Object.values(PATHS.indexes)]) {
  if (!fs.existsSync(file)) throw new Error(`Missing columns lifecycle input: ${file}`);
}
const registry = readJson(PATHS.registry);
const queue = readJson(PATHS.queue);
const state = readJson(PATHS.state);
if (!Array.isArray(registry.items) || !Array.isArray(queue.items) || !Array.isArray(queue.skipped)
  || !state.published || typeof state.published !== 'object' || Array.isArray(state.published)) {
  throw new Error('Invalid editorial registry, content queue or publication state.');
}
const published = registry.items.filter((item) => item?.type === 'kolumna' && item.status === 'published' && ['hr', 'en'].includes(item.language));
const legacyFeedSource = readJson(PATHS.legacyFeed);
const legacyFeedItems = Array.isArray(legacyFeedSource) ? legacyFeedSource : legacyFeedSource?.items;
if (!Array.isArray(legacyFeedItems)) throw new Error('Legacy kolumne.json must remain an array or an object with an items array.');
let legacyPublicFeedColumns = 0;
for (const item of legacyFeedItems) {
  let urlPath = '';
  try { if (item?.url) urlPath = new URL(item.url, SITE).pathname; } catch { fail(`Legacy mixed feed has an invalid URL for ${item?.slug || '(unknown)'}.`); }
  const pathValue = typeof item?.path === 'string' ? item.path : '';
  if (!urlPath.startsWith('/gnk-aktual/kolumne/') && !pathValue.startsWith('/gnk-aktual/kolumne/')) continue;
  legacyPublicFeedColumns++;
  const route = urlPath || pathValue;
  if (urlPath !== pathValue) fail(`${item.slug || '(unknown)'}: legacy feed column path and URL must agree.`);
  if (!published.some((entry) => entry.language === 'hr' && entry.path === route)) {
    fail(`${item.slug || route}: a non-published column record remains in the public legacy feed.`);
  }
}
const routeByLanguage = Object.fromEntries(['hr', 'en'].map((language) => [language, new Set()]));
const slugByLanguage = Object.fromEntries(['hr', 'en'].map((language) => [language, new Set()]));
for (const item of published) {
  const expectedPrefix = item.language === 'en' ? '/en/gnk-aktual/columns/' : '/gnk-aktual/kolumne/';
  if (typeof item.path !== 'string' || !item.path.startsWith(expectedPrefix) || !item.slug) {
    fail(`${item.slug || '(missing slug)'}: published ${item.language} route does not belong to the canonical columns collection.`);
    continue;
  }
  if (routeByLanguage[item.language].has(item.path)) fail(`${item.path}: duplicate published route in registry.`);
  routeByLanguage[item.language].add(item.path);
  slugByLanguage[item.language].add(item.slug);
  const file = path.join(PORTAL, item.path.replace(/^\/+|\/+$/g, ''), 'index.html');
  if (!fs.existsSync(file)) fail(`${item.path}: registry says published but the static article page is missing.`);
}

const pageData = {};
for (const [language, file] of Object.entries(PATHS.indexes)) {
  const html = fs.readFileSync(file, 'utf8');
  const publishedSection = sectionSource(html, 'columns');
  const upcomingSection = sectionSource(html, 'upcoming-columns');
  if (!publishedSection) fail(`${file}: missing server-rendered #columns archive.`);
  if (!upcomingSection) fail(`${file}: missing #upcoming-columns schedule section.`);
  const prefix = language === 'en' ? '/en/gnk-aktual/columns/' : '/gnk-aktual/kolumne/';
  const actual = routesIn(publishedSection, prefix).sort();
  const expected = [...routeByLanguage[language]].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${file}: archive links do not exactly match published registry routes.`);
  const itemListCount = Number(html.match(/"numberOfItems"\s*:\s*(\d+)/)?.[1] || 0);
  if (itemListCount !== expected.length) fail(`${file}: ItemList JSON-LD count ${itemListCount} differs from ${expected.length} published routes.`);
  pageData[language] = { file, html, publishedSection, upcomingSection, cards: actual.length };
}

const ids = new Set();
const queueSlugs = new Set();
const skipped = new Set(queue.skipped);
const columnQueue = queue.items.filter((item) => item?.category === 'kolumne');
const publishedQueue = [];
const unpublishedQueue = [];
const publicUpcoming = [];
const overdue = [];
for (const item of columnQueue) {
  if (!item?.id || ids.has(item.id)) fail(`${item?.id || '(missing ID)'}: duplicate/missing column queue ID.`);
  ids.add(item?.id);
  if (!/^[a-z0-9-]+$/.test(item.slug || '') || !validDate(item.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time || '')) {
    fail(`${item.id || item.slug || '(unknown)'}: invalid column queue slug or schedule.`);
    continue;
  }
  if (queueSlugs.has(item.slug)) fail(`${item.slug}: duplicate slug in the Content Factory column queue.`);
  queueSlugs.add(item.slug);
  const publishedState = state.published[item.id];
  if (skipped.has(item.id)) continue;
  if (publishedState) {
    const matches = published.some((entry) => entry.slug === item.slug && entry.path === publishedState.path && entry.language === 'hr');
    if (!matches) fail(`${item.id}: published queue state does not match a published Croatian registry route.`);
    else publishedQueue.push(item);
    continue;
  }
  unpublishedQueue.push(item);
  if (!isFuture(item)) overdue.push(item);
  if (item.publicListingApproved === true) {
    const invalidPublicText = [
      ['publicTitleHr', true, 180], ['publicTitleEn', false, 180],
      ['publicTeaserHr', false, 320], ['publicTeaserEn', false, 320],
    ].some(([key, required, limit]) => {
      if (item[key] === undefined && !required) return false;
      return typeof item[key] !== 'string' || (required && !item[key].trim()) || item[key].length > limit;
    });
    if (typeof item.editorialApprovalRef !== 'string' || !item.editorialApprovalRef.trim() || invalidPublicText
      || Object.keys(item).some((key) => publicContentKeys.has(key.toLowerCase()))) {
      fail(`${item.id}: public schedule lacks approval/title metadata, exceeds public-copy limits or contains unpublished article text.`);
    } else if (isFuture(item)) publicUpcoming.push(item);
  }
}

// The legacy Markdown directory lives under the served portal root. Its current
// three records are already published; any new, unregistered draft there would
// be publicly retrievable and is therefore a fail-closed error.
let legacySourceCount = 0;
let legacyAlreadyPublished = 0;
if (fs.existsSync(PATHS.legacyQueue)) {
  for (const file of fs.readdirSync(PATHS.legacyQueue).filter((name) => name.endsWith('.md'))) {
    legacySourceCount++;
    const source = fs.readFileSync(path.join(PATHS.legacyQueue, file), 'utf8');
    const slug = source.match(/^slug:\s*([a-z0-9-]+)\s*$/m)?.[1] || file.replace(/\.md$/, '');
    if (slugByLanguage.hr.has(slug)) legacyAlreadyPublished++;
    else fail(`${file}: unregistered legacy Markdown remains under the public portal data path.`);
  }
}

for (const [language, data] of Object.entries(pageData)) {
  const shown = language === 'hr' ? publicUpcoming : publicUpcoming.filter((item) => item.publicTitleEn);
  for (const item of shown) {
    const title = language === 'hr' ? item.publicTitleHr : item.publicTitleEn;
    if (!data.upcomingSection.includes(escapeHtml(title))) fail(`${data.file}: approved upcoming title is missing from the public schedule.`);
  }
  for (const item of unpublishedQueue) {
    if (item.publicListingApproved === true) continue;
    if (item.title && !published.some((entry) => entry.slug === item.slug || entry.title === item.title) && data.html.includes(escapeHtml(item.title))) {
      fail(`${data.file}: unapproved draft title appears in the public schedule.`);
    }
  }
}

const result = {
  ok: errors.length === 0,
  version: 'GNK_ASG_AKTUAL_COLUMNS_LIFECYCLE_V1',
  asOf: now.toISOString(),
  zagrebNow: nowZagreb,
  published: {
    uniqueSlugs: new Set(published.filter((item) => item.language === 'hr').map((item) => item.slug)).size,
    routesByLanguage: { hr: routeByLanguage.hr.size, en: routeByLanguage.en.size },
    archiveCardsByLanguage: { hr: pageData.hr?.cards || 0, en: pageData.en?.cards || 0 },
  },
  queue: {
    scheduledColumnRecords: columnQueue.length,
    alreadyPublished: publishedQueue.length,
    unpublished: unpublishedQueue.length,
    overdueBacklog: overdue.length,
    publiclyAnnouncedUpcoming: publicUpcoming.filter(isFuture).length,
  },
  legacyPublicPortalMarkdown: { files: legacySourceCount, alreadyPublished: legacyAlreadyPublished, unpublished: legacySourceCount - legacyAlreadyPublished },
  legacyPublicMixedFeed: { records: legacyFeedItems.length, publishedColumnRecords: legacyPublicFeedColumns },
  safety: { draftBodiesRendered: false, auditIsReadOnly: true, externalCalls: 0, publicListRequiresApproval: true, publicationAuthority: 'existing guarded Content Queue workflow' },
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
