#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { WEBSITE_ID, ORGANIZATION_ID, PERSON_ID } from './lib/editorial-attribution-v1.mjs';

const failures = [];
const fail = (message) => failures.push(message);
const read = (file) => fs.readFileSync(file, 'utf8');
const readJson = (file) => JSON.parse(read(file));
const exists = (file) => fs.existsSync(file);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const typesOf = (node) => (Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']]).filter(Boolean);
function schemasOf(html) {
  const schemas = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { schemas.push(JSON.parse(match[1])); }
    catch { fail('weekly page contains malformed JSON-LD'); }
  }
  return schemas;
}
function canonicalOf(html) {
  return html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] || '';
}
function metaContent(html, key, attr = 'name') {
  const matches = [...html.matchAll(/<meta\b[^>]*>/gi)].map(found => found[0])
    .filter(tag => new RegExp(`\\b${attr}=["']${key}["']`, 'i').test(tag));
  if (matches.length !== 1) return '';
  return matches[0].match(/\bcontent=["']([^"']*)["']/i)?.[1] || '';
}
// Social previews are public editorial artifacts: the precise image, description,
// alt text and dimensions must match the canonical materialized weekly cover.
function verifySocialPreview(html, label, canonical, expectedImage) {
  const coverUrl = `https://gnk-asg.hr${expectedImage}`;
  for (const [key, attr] of [['og:image', 'property'], ['twitter:image', 'name']]) {
    if (metaContent(html, key, attr) !== coverUrl) fail(`${label}: ${key} does not match current weekly cover`);
  }
  if (metaContent(html, 'og:url', 'property') !== canonical) fail(`${label}: Open Graph URL differs from canonical`);
  if (metaContent(html, 'twitter:card') !== 'summary_large_image') fail(`${label}: missing large-image X/Twitter card`);
  const ogAlt = metaContent(html, 'og:image:alt', 'property');
  const twitterAlt = metaContent(html, 'twitter:image:alt');
  if (!ogAlt || ogAlt !== twitterAlt) fail(`${label}: missing or mismatched OG/Twitter image alt text`);
  if (metaContent(html, 'og:image:width', 'property') !== '1200' ||
      metaContent(html, 'og:image:height', 'property') !== '630') fail(`${label}: incorrect OG image dimensions`);
  if (metaContent(html, 'og:description', 'property') !== metaContent(html, 'description') ||
      metaContent(html, 'twitter:description') !== metaContent(html, 'description')) fail(`${label}: inconsistent preview and canonical descriptions`);
}
function verifyHreflang(html, hr, en, label) {
  const alternates = new Map([...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => [match[1].toLowerCase(), match[2]]));
  if (alternates.get('hr') !== hr) fail(`${label}: hr hreflang mismatch`);
  if (alternates.get('en') !== en) fail(`${label}: en hreflang mismatch`);
  if (alternates.get('x-default') !== hr) fail(`${label}: x-default must resolve to the Croatian page`);
}
function schemaNodes(schemas) {
  const nodes = [];
  for (const schema of schemas) {
    if (Array.isArray(schema?.['@graph'])) nodes.push(...schema['@graph']);
    else nodes.push(schema);
  }
  return nodes;
}
function verifyArchivePage({ html, file, canonical, hr, en, expectedItems, expectedDate, expectedImage, label, archiveIndex = false }) {
  if (!html.includes('<title>') || !html.includes('AKTUAL MEDIA')) fail(`${label}: branded title is missing`);
  if (canonicalOf(html) !== canonical) fail(`${label}: canonical mismatch`);
  if (!/<meta\s+name=["']description["'][^>]*content=["'][^"']{45,}/i.test(html)) fail(`${label}: useful meta description is missing`);
  if (!/<meta\s+name=["']robots["'][^>]*content=["'][^"']*\bindex\b[^"']*\bfollow\b/i.test(html)) fail(`${label}: must remain indexable/followable`);
  verifyHreflang(html, hr, en, label);
  if (!html.includes(`content="https://gnk-asg.hr${expectedImage}"`)) fail(`${label}: social cover does not match the materialized issue`);
  if (!exists(path.join('apps/portal', expectedImage.replace(/^\//, '')))) fail(`${label}: cover file is missing (${expectedImage})`);
  verifySocialPreview(html, label, canonical, expectedImage);
  const schemas = schemasOf(html);
  const nodes = schemaNodes(schemas);
  const collections = nodes.filter((node) => typesOf(node).includes('CollectionPage'));
  const lists = nodes.filter((node) => typesOf(node).includes('ItemList'));
  const websites = nodes.filter((node) => typesOf(node).includes('WebSite'));
  if (websites.length !== 1) fail(`${label}: expected one shared WebSite node; found ${websites.length}`);
  if (websites.length && websites[0]['@id'] !== WEBSITE_ID) fail(`${label}: WebSite ID does not use the canonical shared entity`);
  if (websites.length && websites[0].url !== 'https://gnk-asg.hr/') fail(`${label}: WebSite URL must be the GNK ASG root`);
  if (websites.length && websites[0].publisher?.['@id'] !== ORGANIZATION_ID) fail(`${label}: WebSite publisher must be GNK ASG d.o.o.`);
  const articles = nodes.filter((node) => typesOf(node).some((type) => ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting'].includes(type)));
  if (collections.length !== 1) fail(`${label}: expected one CollectionPage schema; found ${collections.length}`);
  if (lists.length !== 1) fail(`${label}: expected one ItemList schema; found ${lists.length}`);
  if (articles.length) fail(`${label}: syndicated weekly material must not be typed as authored Article content`);
  if (lists.length && lists[0].numberOfItems !== expectedItems) fail(`${label}: ItemList count does not match the rendered issue`);
  if (!archiveIndex) {
    const cardAlts = [...html.matchAll(/<article class=["']tw-card["'][^>]*>[\s\S]*?<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/gi)].map((match) => match[1].trim());
    if (cardAlts.length !== expectedItems || cardAlts.some((alt) => !alt)) fail(`${label}: each source card must have meaningful image alt text (${cardAlts.length}/${expectedItems})`);
  }
  if (expectedDate && collections.length && collections[0].datePublished !== expectedDate) fail(`${label}: CollectionPage datePublished does not match issue_week`);
  if (collections.length && collections[0].url !== canonical) fail(`${label}: CollectionPage URL does not match canonical`);
  if (collections.length && collections[0].editor?.['@id'] !== PERSON_ID) fail(`${label}: Nermin must be an editor, not an inferred article author`);
  if (collections.length && collections[0].author !== undefined) fail(`${label}: weekly selection must not claim an individual article author`);
  if (collections.length && collections[0].publisher?.['@id'] !== ORGANIZATION_ID) fail(`${label}: CollectionPage publisher must be GNK ASG d.o.o.`);
  if (archiveIndex && collections.length && collections[0].isPartOf?.['@id'] !== WEBSITE_ID) fail(`${label}: archive index must reference the shared WebSite entity`);
  if (!archiveIndex) {
    if (!html.includes('Source:') && !html.includes('Izvor:')) fail(`${label}: source attribution labels are missing`);
    if (!html.includes('AKTUAL MEDIA Editorial Desk') && !html.includes('Uredništvo: AKTUAL MEDIA')) fail(`${label}: editorial publisher attribution is missing`);
    const nerminPerson = nodes.some((node) => typesOf(node).includes('Person') && /nermin\s+sefi[cć]/i.test(String(node.name || '')));
    if (/<meta\s+name=["']author["']\s+content=["']Nermin Sefić["']/i.test(html) || /<link\b[^>]*rel=["']author["']/i.test(html) || nerminPerson
        || /data-author-mark=["']nermin-sefic["']|#NerminSefic|#NerminSefić/i.test(html)) {
      fail(`${label}: syndicated weekly page contains personal Nermin authorship metadata`);
    }
  } else {
    if (!html.includes('PERMANENT ARCHIVE') && !html.includes('TRAJNA ARHIVA')) fail(`${label}: permanent archive label is missing`);
    if (!/<meta\s+name=["']editor["']\s+content=["']Nermin Sefić["']/i.test(html)) fail(`${label}: editor metadata must be explicit and distinct from authorship`);
    if (!/<meta\s+property=["']og:site_name["']\s+content=["']GNK ASG["']/i.test(html)) fail(`${label}: Open Graph site name must match the shared GNK ASG entity`);
  }
  if (!exists(file)) fail(`${label}: static HTML output is missing`);
}

execFileSync(process.execPath, ['scripts/build-aktual-media-weekly-v1.mjs'], {
  env: { ...process.env, AKTUAL_WEEKLY_FORCE: '1' }, stdio: 'inherit',
});
execFileSync(process.execPath, ['scripts/build-aktual-media-weekly-archive-v1.mjs', '--refresh'], { stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/enforce-nermin-author-seo-v1.mjs'], { stdio: 'inherit' });

const files = {
  data: 'apps/portal/data/aktual-weekly.json',
  curation: 'apps/portal/data/aktual-weekly-curation.json',
  newsroomHr: 'apps/portal/gnk-aktual/index.html',
  newsroomEn: 'apps/portal/en/gnk-aktual/index.html',
  hrIndex: 'apps/portal/gnk-aktual/tjedni/index.html',
  enIndex: 'apps/portal/en/gnk-aktual/weekly/index.html',
  worldJs: 'apps/portal/assets/aktual-media-world-v1.js',
  menu: 'apps/portal/assets/public-unified-menu-v6.js',
  sitemap: 'apps/portal/sitemap.xml',
  editorialSitemap: 'apps/portal/editorial-sitemap.xml',
  workflow: '.github/workflows/editorial-scheduled-publish.yml',
};
for (const [name, file] of Object.entries(files)) if (!exists(file)) fail(`${name}: missing ${file}`);
if (failures.length) { console.error(JSON.stringify({ version: 'AKTUAL_MEDIA_WEEKLY_CONTRACT_V2', failures }, null, 2)); process.exit(1); }

const issue = readJson(files.data);
const curation = readJson(files.curation);
if (issue.version !== 'AKTUAL_MEDIA_WEEKLY_V2') fail('data: expected current AKTUAL_MEDIA_WEEKLY_V2 format');
if (!/^\d{4}-\d{2}-\d{2}$/.test(issue.issue_week || '')) fail('data: issue_week is missing or malformed');
if (curation.version !== 'AKTUAL_MEDIA_WEEKLY_CURATION_V1') fail('curation: version mismatch');
if (curation.issue_week !== issue.issue_week) fail('curation: issue_week differs from generated issue');
if (!Array.isArray(curation.items) || curation.items.length < 8) fail('curation: at least eight hand-curated source items are required');
const digest = createHash('sha256').update(JSON.stringify(curation)).digest('hex');
if (issue.curation_digest !== digest) fail('data: curation digest does not match the reviewed seed');

const selected = (issue.sections || []).flatMap((section) => (section.items || []).map((item) => ({ ...item, section: section.id })));
const sourceUrls = new Set(selected.map((item) => item.url));
const sources = new Set(selected.map((item) => item.source).filter(Boolean));
if (issue.counts?.selected_items !== selected.length) fail('data: selected_items must equal rendered stories');
if (selected.length < 8) fail('data: fewer than eight curated stories');
if (sources.size < 4 || issue.counts?.sources !== sources.size) fail('data: source diversity count is incorrect or too low');
if ((issue.sections || []).length < 5 || issue.counts?.sections !== issue.sections.length) fail('data: expected at least five correctly counted sections');
if (sourceUrls.size !== selected.length) fail('data: duplicate source URL found');

const sectionIds = new Set();
const heavy = /\b(war|ukraine|russia|attack|attacker|killed|dies|death|dead|rape|sexual assault|assault|murder|crime|criminal|cancer|disease|poison|poisoned|crisis|accident|injury|injured|hospital|funeral|ceasefire|shooting|bomb|flood|wildfire|lawsuit|trial|court|police|gambling|casino|prediction market|betting|derailment|homeless|abuse|neglect|missing person|missing people|fine|ban|sanction|recall|leak oil|poplava|poginuo|poginula|stravičn|nesreć|rat|ubojstvo|bolnica|ozlijeđen|ozlijeđena)\b/i;
for (const section of issue.sections || []) {
  if (!section.id || !section.label_hr || !section.label_en || sectionIds.has(section.id)) fail('data: malformed or duplicate bilingual section');
  sectionIds.add(section.id);
  for (const item of section.items || []) {
    if (!item.title || !item.title_en || !item.summary || !item.summary_en || !item.source) fail(`data: incomplete bilingual source item (${item.title || item.url || 'untitled'})`);
    if (!/^https:\/\//.test(item.url || '')) fail(`data: source URL must be HTTPS (${item.title || item.url})`);
    if (heavy.test([item.title, item.title_en, item.summary, item.summary_en, item.category, item.group].join(' '))) fail(`data: heavy/non-lifestyle item leaked into ${section.id}: ${item.title}`);
    if (item.image_policy === 'licensed-source') {
      if (!item.image_credit || !item.image_rights) fail(`data: licensed image is missing credit/rights (${item.url})`);
    } else {
      if (!String(item.image || '').startsWith('/assets/')) fail(`data: non-licensed images must be local generated assets (${item.url})`);
      else if (!exists(path.join('apps/portal', item.image.replace(/^\//, '')))) fail(`data: local generated image is missing (${item.image})`);
      if (!item.imageAlt) fail(`data: generated illustration requires Croatian alt text (${item.url})`);
    }
  }
}
if (!issue.cover || !sourceUrls.has(issue.cover.url)) fail('data: issue cover must promote one selected source-linked story');
for (const image of [issue.cover_image_hr, issue.cover_image_en]) {
  if (!image || !exists(path.join('apps/portal', String(image).replace(/^\//, '')))) fail(`data: localized weekly cover asset is missing (${image})`);
}

const archiveDataFile = `apps/portal/data/aktual-weekly-archives/${issue.issue_week}.json`;
const issueHrPath = `/gnk-aktual/tjedni/${issue.issue_week}/`;
const issueEnPath = `/en/gnk-aktual/weekly/${issue.issue_week}/`;
const issueHrFile = `apps/portal${issueHrPath}index.html`;
const issueEnFile = `apps/portal${issueEnPath}index.html`;
for (const file of [archiveDataFile, issueHrFile, issueEnFile]) if (!exists(file)) fail(`archive: missing generated output ${file}`);
const archived = readJson(archiveDataFile);
if (archived.issue_week !== issue.issue_week || archived.curation_digest !== issue.curation_digest) fail('archive: stored issue does not match current curation snapshot');
if (archived.counts?.selected_items !== issue.counts?.selected_items) fail('archive: stored story count differs from current issue');

const hrIndexHtml = read(files.hrIndex);
const enIndexHtml = read(files.enIndex);
const hrIssueHtml = read(issueHrFile);
const enIssueHtml = read(issueEnFile);
const indexIssues = (fs.readdirSync('apps/portal/data/aktual-weekly-archives') || []).filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name));
verifyArchivePage({
  html: hrIssueHtml, file: issueHrFile, canonical: `https://gnk-asg.hr${issueHrPath}`,
  hr: `https://gnk-asg.hr${issueHrPath}`, en: `https://gnk-asg.hr${issueEnPath}`,
  expectedItems: selected.length, expectedDate: issue.issue_week, expectedImage: issue.cover_image_hr,
  label: 'HR weekly issue',
});
verifyArchivePage({
  html: enIssueHtml, file: issueEnFile, canonical: `https://gnk-asg.hr${issueEnPath}`,
  hr: `https://gnk-asg.hr${issueHrPath}`, en: `https://gnk-asg.hr${issueEnPath}`,
  expectedItems: selected.length, expectedDate: issue.issue_week, expectedImage: issue.cover_image_en,
  label: 'EN weekly issue',
});
verifyArchivePage({
  html: hrIndexHtml, file: files.hrIndex, canonical: 'https://gnk-asg.hr/gnk-aktual/tjedni/',
  hr: 'https://gnk-asg.hr/gnk-aktual/tjedni/', en: 'https://gnk-asg.hr/en/gnk-aktual/weekly/',
  expectedItems: indexIssues.length, expectedImage: issue.cover_image_hr, label: 'HR weekly archive index', archiveIndex: true,
});
verifyArchivePage({
  html: enIndexHtml, file: files.enIndex, canonical: 'https://gnk-asg.hr/en/gnk-aktual/weekly/',
  hr: 'https://gnk-asg.hr/gnk-aktual/tjedni/', en: 'https://gnk-asg.hr/en/gnk-aktual/weekly/',
  expectedItems: indexIssues.length, expectedImage: issue.cover_image_en, label: 'EN weekly archive index', archiveIndex: true,
});
if (!hrIndexHtml.includes(issueHrPath) || !enIndexHtml.includes(issueEnPath)) fail('archive: index pages must expose the stable current issue routes in static HTML');
for (const item of selected) {
  if (!hrIssueHtml.includes(esc(item.url)) || !enIssueHtml.includes(esc(item.url))) fail(`issue page: source link is missing from HR/EN static HTML (${item.url})`);
}
if (!read(files.newsroomHr).includes('/gnk-aktual/tjedni/')) fail('HR newsroom: weekly archive link is missing');
if (!read(files.newsroomEn).includes('/en/gnk-aktual/weekly/')) fail('EN newsroom: weekly archive link is missing');
if (!read(files.worldJs).includes("'/gnk-aktual/tjedni/'")) fail('world navigation: HR weekly archive route is missing');
if (!read(files.menu).includes("['AKTUAL MEDIA TJEDNI','AKTUAL MEDIA WEEKLY'")) fail('unified menu: bilingual weekly archive entry is missing');
for (const url of ['https://gnk-asg.hr/gnk-aktual/tjedni/', 'https://gnk-asg.hr/en/gnk-aktual/weekly/']) {
  if (!read(files.sitemap).includes(`<loc>${url}</loc>`)) fail(`sitemap.xml: archive index route missing (${url})`);
}
for (const url of [`https://gnk-asg.hr${issueHrPath}`, `https://gnk-asg.hr${issueEnPath}`]) {
  if (!read(files.editorialSitemap).includes(`<loc>${url}</loc>`)) fail(`editorial sitemap: issue route missing (${url})`);
}
const workflow = read(files.workflow);
if (!workflow.includes('build-aktual-media-weekly-v1.mjs')) fail('scheduled workflow: weekly data builder is not integrated');
if (!workflow.includes('build-aktual-media-weekly-archive-v1.mjs')) fail('scheduled workflow: static archive materializer is not integrated');
if (!workflow.includes('apps/portal/data/aktual-weekly-curation.json')) fail('scheduled workflow: curation seed is not watched');
if (!workflow.includes('notify_search_engines=false')) fail('scheduled workflow: automated deploy must suppress search-engine notifications');

console.log(JSON.stringify({
  version: 'AKTUAL_MEDIA_WEEKLY_CONTRACT_V2',
  issue_week: issue.issue_week,
  counts: issue.counts,
  archive_editions: indexIssues.length,
  failures,
}, null, 2));
if (failures.length) process.exit(1);
