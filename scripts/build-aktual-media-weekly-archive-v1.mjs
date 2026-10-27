#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { WEBSITE_ID, GNK_ASG_PUBLISHER } from './lib/editorial-attribution-v1.mjs';
import { refreshTag } from '../apps/shared/refresh-tag-v1.mjs';

const PORTAL = 'apps/portal';
const ISSUE_PATH = `${PORTAL}/data/aktual-weekly.json`;
const ARCHIVE_DIR = `${PORTAL}/data/aktual-weekly-archives`;
const GENERATED_DIR = `${PORTAL}/assets/editorial/generated`;
const SITE = 'https://gnk-asg.hr';
const REFRESH = process.argv.includes('--refresh');
const HR_INDEX = '/gnk-aktual/tjedni/';
const EN_INDEX = '/en/gnk-aktual/weekly/';
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const labels = {
  hr: { 'zene-stil': 'Žene & stil', moda: 'Moda', ljubimci: 'Ljubimci', auto: 'Auto', putovanja: 'Putovanja', sport: 'Sport', hrana: 'Hrana & uživanje', kultura: 'Kultura & scena', 'dobre-price': 'Lijepe priče' },
  en: { 'zene-stil': 'Women & style', moda: 'Fashion', ljubimci: 'Pets', auto: 'Cars', putovanja: 'Travel', sport: 'Sport', hrana: 'Food & pleasure', kultura: 'Culture & scene', 'dobre-price': 'Good stories' },
};
const sectionHeading = { hr: 'Odabrane priče', en: 'Selected stories' };
const publisher = { ...GNK_ASG_PUBLISHER, logo: { '@type': 'ImageObject', url: `${SITE}/assets/logo-gnk-asg-canonical.svg` } };
const absoluteAssetUrl = (value) => String(value || '').startsWith('/') ? `${SITE}${value}` : String(value || '');

function parseWeek(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || date.getUTCDay() !== 1) throw new Error(`issue_week must be a valid Monday in YYYY-MM-DD form: ${value}`);
  return date;
}
function weekEnd(value) { const end = new Date(value); end.setUTCDate(end.getUTCDate() + 6); return end; }
function isoWeek(value) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
function dateRange(issueWeek, language, short = false) {
  const start = parseWeek(issueWeek);
  const end = weekEnd(start);
  if (language === 'hr') {
    const a = new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(start);
    const b = new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(end);
    return `${a} – ${b}`;
  }
  const a = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(start);
  const b = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(end);
  return `${a} – ${b}`;
}
function localized(item, language) {
  return language === 'en' ? { ...item, title: item.title_en || item.title, summary: item.summary_en || item.summary } : item;
}
function formatStoryDate(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'hr-HR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}
function storyCount(count, language) {
  if (language === 'en') return `${count} ${count === 1 ? 'story' : 'stories'}`;
  const lastTwo = count % 100;
  const last = count % 10;
  const noun = last === 1 && lastTwo !== 11 ? 'priča' : last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? 'priče' : 'priča';
  return `${count} ${noun}`;
}
function getIssueItems(issue) { return (issue.sections || []).flatMap((section) => (section.items || []).map((item) => ({ section, item }))); }
function validateIssue(issue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issue.issue_week || '')) throw new Error('Weekly issue is missing its stable issue_week key.');
  parseWeek(issue.issue_week);
  if ((issue.counts?.selected_items || 0) < 8 || getIssueItems(issue).length < 8) throw new Error('A weekly issue needs at least eight selected stories.');
  if ((issue.counts?.sources || 0) < 4) throw new Error('A weekly issue needs at least four distinct sources.');
  const seen = new Set();
  for (const { item } of getIssueItems(issue)) {
    if (!item.title || !item.url || !item.source || !item.image) throw new Error(`Incomplete weekly card: ${item.title || item.url || '(untitled)'}`);
    if (seen.has(item.url)) throw new Error(`Duplicate weekly source URL: ${item.url}`);
    seen.add(item.url);
    if (item.image_policy === 'licensed-source' && (!item.image_credit || !item.image_rights)) throw new Error(`Licensed external image is missing credit or rights note: ${item.url}`);
    if (item.image_policy !== 'licensed-source' && !item.image.startsWith('/assets/')) throw new Error(`Non-licensed weekly images must be local generated assets: ${item.url}`);
  }
}
function storyCard(section, sourceItem, language) {
  const item = localized(sourceItem, language);
  const sectionLabel = labels[language][section.id] || (language === 'en' ? section.label_en : section.label_hr) || section.id;
  const source = item.source || '';
  const date = formatStoryDate(item.published_at, language);
  const byline = language === 'en' ? 'Source' : 'Izvor';
  const illustration = item.image_policy === 'licensed-source'
    ? `${language === 'en' ? 'Image' : 'Fotografija'}: ${item.image_credit || source}`
    : `${language === 'en' ? 'Illustration' : 'Ilustracija'}: AKTUAL MEDIA`;
  const imageAlt = language === 'en'
    ? (item.imageAlt_en || `${item.image_policy === 'licensed-source' ? 'Licensed source photograph' : 'Original AKTUAL MEDIA illustration'} for: ${item.title}`)
    : (item.imageAlt || `Urednička ilustracija AKTUAL MEDIA za: ${item.title}`);
  return `<article class="tw-card"><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer nofollow"><img src="${esc(item.image)}" alt="${esc(imageAlt)}" width="1200" height="630" loading="lazy" decoding="async"></a><div class="tw-card-body"><span class="label">${esc(sectionLabel)} · ${esc(source)}</span><h3><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(item.title)}</a></h3><p>${esc(item.summary || '')}</p><small>${byline}: <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(source)}</a>${date ? ` · <time datetime="${esc(item.published_at)}">${esc(date)}</time>` : ''}<br>${esc(illustration)}</small></div></article>`;
}
function editorSchema() {
  return {
    '@type': 'Person',
    '@id': `${SITE}/#nermin-sefic`,
    name: 'Nermin Sefić',
    url: `${SITE}/nermin-sefic/`,
  };
}

function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE}/`,
    name: 'GNK ASG',
    inLanguage: ['hr', 'en'],
    publisher: { ...GNK_ASG_PUBLISHER },
  };
}

function collectionSchema(issue, language, canonical, description, entries) {
  const title = language === 'en' ? `AKTUAL MEDIA WEEKLY — Issue ${isoWeek(parseWeek(issue.issue_week))} · ${issue.issue_week}` : `AKTUAL MEDIA TJEDNI — izdanje ${isoWeek(parseWeek(issue.issue_week))} · ${issue.issue_week}`;
  const range = dateRange(issue.issue_week, language);
  const indexPath = language === 'en' ? EN_INDEX : HR_INDEX;
  const coverImage = language === 'en' ? issue.cover_image_en : issue.cover_image_hr;
  const coverAlt = language === 'en' ? issue.cover_alt_en : issue.cover_alt_hr;
  const itemList = {
    '@type': 'ItemList', '@id': `${canonical}#stories`, name: language === 'en' ? 'Selected source-linked stories' : 'Odabrane source-linked priče',
    numberOfItems: entries.length, itemListOrder: 'https://schema.org/ItemListOrderUnordered',
    itemListElement: entries.map(({ item }, index) => ({ '@type': 'ListItem', position: index + 1, name: localized(item, language).title, url: item.url, image: absoluteAssetUrl(item.image) })),
  };
  const breadcrumb = { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: [
    { '@type': 'ListItem', position: 1, name: language === 'en' ? 'Home' : 'Naslovnica', item: `${SITE}${language === 'en' ? '/en/' : '/'}` },
    { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA', item: `${SITE}${language === 'en' ? '/en/gnk-aktual/' : '/gnk-aktual/'}` },
    { '@type': 'ListItem', position: 3, name: language === 'en' ? 'Weekly archive' : 'Arhiva tjednika', item: `${SITE}${indexPath}` },
    { '@type': 'ListItem', position: 4, name: title, item: canonical },
  ] };
  const collection = {
    '@type': 'CollectionPage', '@id': `${canonical}#page`, name: title, url: canonical,
    description, inLanguage: language === 'en' ? 'en' : 'hr', datePublished: issue.issue_week, mainEntity: { '@id': `${canonical}#stories` },
    image: { '@type': 'ImageObject', url: `${SITE}${coverImage}`, width: 1200, height: 630, caption: coverAlt },
    breadcrumb: { '@id': `${canonical}#breadcrumb` },
    isPartOf: { '@type': 'CollectionPage', '@id': `${SITE}${indexPath}#archive`, name: language === 'en' ? 'AKTUAL MEDIA WEEKLY archive' : 'Arhiva AKTUAL MEDIA TJEDNI', url: `${SITE}${indexPath}` },
    editor: editorSchema(), publisher, creator: { '@type': 'Organization', name: 'AKTUAL MEDIA Editorial Desk' },
  };
  return { '@context': 'https://schema.org', '@graph': [collection, itemList, breadcrumb, websiteSchema()] };
}
function articlePage(issue, language) {
  const isEn = language === 'en';
  const canonicalPath = `${isEn ? '/en/gnk-aktual/weekly/' : '/gnk-aktual/tjedni/'}${issue.issue_week}/`;
  const alternateHr = `${SITE}/gnk-aktual/tjedni/${issue.issue_week}/`;
  const alternateEn = `${SITE}/en/gnk-aktual/weekly/${issue.issue_week}/`;
  const canonical = `${SITE}${canonicalPath}`;
  const week = isoWeek(parseWeek(issue.issue_week));
  const range = dateRange(issue.issue_week, language);
  const title = isEn ? `Issue ${week}: AKTUAL MEDIA WEEKLY · ${issue.issue_week}` : `Izdanje ${week}: AKTUAL MEDIA TJEDNI · ${issue.issue_week}`;
  const intro = isEn ? (issue.editorial_intro_en || issue.editorial_intro) : issue.editorial_intro;
  const note = isEn ? (issue.editorial_note_en || issue.editorial_note) : issue.editorial_note;
  const sourceCount = issue.counts?.sources || new Set(getIssueItems(issue).map(({ item }) => item.source)).size;
  const itemCount = getIssueItems(issue).length;
  const description = isEn
    ? `${itemCount} selected stories for ${range}, with short editorial summaries, original publisher links and original AKTUAL MEDIA illustrations.`
    : `${itemCount} odabranih priča za tjedan ${range}, s uredničkim sažecima, poveznicama na izvorne izdavače i izvornim ilustracijama AKTUAL MEDIA.`;
  const coverImage = isEn ? issue.cover_image_en : issue.cover_image_hr;
  const coverAlt = isEn ? issue.cover_alt_en : issue.cover_alt_hr;
  if (!coverImage || !coverAlt) throw new Error(`${issue.issue_week}: missing localized weekly cover image/alt.`);
  const entries = getIssueItems(issue);
  const schemas = collectionSchema(issue, language, canonical, description, entries);
  const sectionNav = (issue.sections || []).map((section) => `<a href="#tw-${esc(section.id)}">${esc(labels[language][section.id] || (isEn ? section.label_en : section.label_hr))}</a>`).join('');
  const sections = (issue.sections || []).map((section) => {
    const label = labels[language][section.id] || (isEn ? section.label_en : section.label_hr);
    const items = (section.items || []).map((item) => storyCard(section, item, language)).join('\n');
    return `<section class="tw-section" id="tw-${esc(section.id)}"><div class="tw-head"><h2>${esc(label)}</h2><span>${esc(storyCount(section.items.length, language))}</span></div><div class="tw-grid">${items}</div></section>`;
  }).join('\n');
  const jsonld = safeJson(schemas);
  const mastSideLeft = isEn ? 'STYLE · TRAVEL · PETS · CARS · SPORT' : 'STIL · PUTOVANJA · LJUBIMCI · AUTO · SPORT';
  const mastSideRight = isEn ? 'A source-transparent weekly selection' : 'Tjedni izbor uz transparentne izvore';
  const storyLabel = isEn ? 'stories' : 'priča';
  const sourceLabel = isEn ? 'sources' : 'izvora';
  const issueKicker = isEn ? `ISSUE ${week} · ${issue.issue_week}` : `IZDANJE ${week} · ${issue.issue_week}`;
  const policyHeading = isEn ? 'Editorial method' : 'Urednički pristup';
  const policyText = isEn
    ? 'Each card is a concise editorial summary and links to the original publisher. Full external articles and photographs are not republished without documented permission.'
    : 'Svaka kartica donosi kratak urednički sažetak i vodi na izvornog izdavača. Cijeli vanjski članci i fotografije ne prenose se bez dokumentiranog dopuštenja.';
  const brand = isEn ? 'AKTUAL MEDIA WEEKLY' : 'AKTUAL MEDIA TJEDNI';
  const menuToggle = isEn ? 'MENU' : 'IZBORNIK';
  const menuHome = isEn ? '/en/gnk-aktual/' : '/gnk-aktual/';
  const menuLang = isEn ? `<a href="${esc(`/gnk-aktual/tjedni/${issue.issue_week}/`)}">HR</a><a href="${esc(`/en/gnk-aktual/weekly/${issue.issue_week}/`)}" aria-current="page">EN</a>` : `<a href="${esc(`/gnk-aktual/tjedni/${issue.issue_week}/`)}" aria-current="page">HR</a><a href="${esc(`/en/gnk-aktual/weekly/${issue.issue_week}/`)}">EN</a>`;
  const noteHeading = isEn ? 'A note on this edition' : 'Napomena uz izdanje';
  const originalLinkLabel = isEn ? 'Browse the full archive' : 'Pregledaj cijelu arhivu';
  const navLabel = isEn ? 'Weekly sections' : 'Rubrike tjednog izdanja';
  const newsroomLink = isEn ? '/en/gnk-aktual/' : '/gnk-aktual/';
  const columnsLink = isEn ? '/en/gnk-aktual/columns/' : '/gnk-aktual/kolumne/';
  const columnsText = isEn ? 'Columns' : 'Kolumne';
  const today = new Intl.DateTimeFormat(isEn ? 'en-GB' : 'hr-HR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(parseWeek(issue.issue_week));
  const breadcrumb = `<nav class="tw-breadcrumb" aria-label="${esc(isEn ? 'Breadcrumb' : 'Krušne mrvice')}"><a href="${isEn ? '/en/' : '/'}">${esc(isEn ? 'Home' : 'Naslovnica')}</a><span aria-hidden="true">›</span><a href="${esc(newsroomLink)}">AKTUAL MEDIA</a><span aria-hidden="true">›</span><a href="${esc(isEn ? EN_INDEX : HR_INDEX)}">${esc(isEn ? 'Weekly archive' : 'Arhiva tjednika')}</a><span aria-hidden="true">›</span><span aria-current="page">${esc(isEn ? `Issue ${week}` : `Izdanje ${week}`)}</span></nav>`;
  const nav = `<nav class="tw-deck" aria-label="${esc(navLabel)}">${sectionNav}<a href="#editorial-notes">${esc(isEn ? 'Editorial note' : 'Urednička napomena')}</a></nav>`;
  const cover = `<section class="tw-cover"><article class="tw-cover-main"><img src="${esc(coverImage)}" alt="${esc(coverAlt)}" width="1200" height="630" fetchpriority="high" decoding="async"><div class="tw-cover-copy"><span class="tw-kicker">${esc(issueKicker)}</span><h2>${esc(brand)}</h2><p>${esc(intro || '')}</p><small>${itemCount} ${storyLabel} · ${sourceCount} ${sourceLabel} · ${esc(range)}</small></div></article><aside class="tw-cover-side"><section class="tw-note"><span class="tw-kicker">${esc(policyHeading)}</span><h3>${esc(isEn ? 'Original sources, concise summaries' : 'Izvorni izvori, sažeti prikaz')}</h3><p>${esc(policyText)}</p><div class="tw-stat"><div><b>${itemCount}</b><span>${storyLabel}</span></div><div><b>${sourceCount}</b><span>${sourceLabel}</span></div></div></section><section class="tw-note" id="editorial-notes"><h3>${esc(noteHeading)}</h3><p>${esc(note || '')}</p><p>${esc(isEn ? 'Editorial desk: AKTUAL MEDIA · GNK ASG' : 'Uredništvo: AKTUAL MEDIA · GNK ASG')}</p><a href="${esc(isEn ? EN_INDEX : HR_INDEX)}">${esc(originalLinkLabel)} →</a></section></aside></section>`;
  const footerText = isEn ? 'AKTUAL MEDIA WEEKLY is a source-linked editorial selection. Selection does not imply endorsement of a publisher or a story.' : 'AKTUAL MEDIA TJEDNI je urednički izbor s poveznicama na izvore. Odabir ne znači preporuku izdavača ni pojedine priče.';
  const crossLinks = `<section class="tw-editor"><div><h2>${esc(isEn ? 'Explore AKTUAL MEDIA' : 'Istraži AKTUAL MEDIA')}</h2><p>${esc(isEn ? 'Discover more reporting, analysis and original columns.' : 'Otkrij još vijesti, analiza i izvornih kolumni.')}</p></div><div><a href="${esc(newsroomLink)}">${esc(isEn ? 'Newsroom' : 'Redakcija')} →</a><a href="${esc(columnsLink)}">${esc(columnsText)} →</a></div></section>`;
  return `<!doctype html><html lang="${language}" class="gnk-unified-shell"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${esc(canonical)}"><link rel="alternate" hreflang="hr" href="${esc(alternateHr)}"><link rel="alternate" hreflang="en" href="${esc(alternateEn)}"><link rel="alternate" hreflang="x-default" href="${esc(alternateHr)}"><meta property="og:type" content="website"><meta property="og:site_name" content="AKTUAL MEDIA"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(SITE + coverImage)}"><meta property="og:image:alt" content="${esc(coverAlt)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/webp"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(SITE + coverImage)}"><meta name="twitter:image:alt" content="${esc(coverAlt)}"><script type="application/ld+json">${jsonld}</script><link rel="stylesheet" href="/assets/public-unified-menu-v6.css?v=20260723-header-transparent-v3"><link rel="stylesheet" href="/assets/aktual-media-weekly-v1.css?v=20261013-static-archive"></head><body><header id="gnk-unified-header" data-gnk-unified-shell="v6-static"><div class="inner"><a class="brand" href="${menuHome}" aria-label="${esc(brand)}"><img src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG" width="110" height="68"></a><div id="gnk-unified-menu"><div class="actions"><div class="lang">${menuLang}</div><button class="toggle" type="button" aria-expanded="false" aria-controls="gnk-unified-nav">${menuToggle}</button></div><nav id="gnk-unified-nav"></nav></div></div></header><main class="tw-wrap"><div class="tw-topline"><time datetime="${esc(issue.issue_week)}">${esc(range)}</time><span>${itemCount} ${storyLabel} · ${sourceCount} ${sourceLabel}</span></div>${breadcrumb}<section class="tw-mast"><div class="side">${mastSideLeft}</div><h1>AKTUAL MEDIA <span>${isEn ? 'WEEKLY' : 'TJEDNI'}</span></h1><div class="side">${mastSideRight}</div></section><p class="tw-foot">${esc(isEn ? 'Edition date' : 'Datum izdanja')}: <time datetime="${esc(issue.issue_week)}">${esc(today)}</time> · ${esc(dateRange(issue.issue_week, language, true))}</p>${nav}${cover}${sections}${crossLinks}<p class="tw-foot">${esc(footerText)}</p></main><script src="/assets/public-unified-menu-v6.js?v=20260728-restaurants-contrast" defer></script>${refreshTag()}</body></html>`;
}
function archiveIndexSchema(issues, language, canonical, description) {
  const indexName = language === 'en' ? 'AKTUAL MEDIA WEEKLY archive' : 'Arhiva AKTUAL MEDIA TJEDNI';
  const itemList = {
    '@type': 'ItemList', '@id': `${canonical}#issues`, name: indexName, numberOfItems: issues.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: issues.map((issue, index) => {
      const pagePath = language === 'en' ? issue.issue_path_en : issue.issue_path_hr;
      const pageCover = language === 'en' ? issue.cover_image_en : issue.cover_image_hr;
      const week = isoWeek(parseWeek(issue.issue_week));
      return { '@type': 'ListItem', position: index + 1, url: `${SITE}${pagePath}`, name: language === 'en' ? `Issue ${week} · ${issue.issue_week}` : `Izdanje ${week} · ${issue.issue_week}`, image: `${SITE}${pageCover}` };
    }),
  };
  const latest = issues[0];
  const latestImage = language === 'en' ? latest.cover_image_en : latest.cover_image_hr;
  const latestAlt = language === 'en' ? latest.cover_alt_en : latest.cover_alt_hr;
  const breadcrumb = { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: [
    { '@type': 'ListItem', position: 1, name: language === 'en' ? 'Home' : 'Naslovnica', item: `${SITE}${language === 'en' ? '/en/' : '/'}` },
    { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA', item: `${SITE}${language === 'en' ? '/en/gnk-aktual/' : '/gnk-aktual/'}` },
    { '@type': 'ListItem', position: 3, name: indexName, item: canonical },
  ] };
  return { '@context': 'https://schema.org', '@graph': [{ '@type': 'CollectionPage', '@id': `${canonical}#archive`, name: indexName, url: canonical, description, inLanguage: language === 'en' ? 'en' : 'hr', mainEntity: { '@id': `${canonical}#issues` }, primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE}${latestImage}`, width: 1200, height: 630, caption: latestAlt }, breadcrumb: { '@id': `${canonical}#breadcrumb` }, isPartOf: { '@id': WEBSITE_ID }, editor: editorSchema(), publisher, creator: { '@type': 'Organization', name: 'AKTUAL MEDIA Editorial Desk' } }, itemList, breadcrumb, websiteSchema()] };
}
function archiveCard(issue, language) {
  const isEn = language === 'en';
  const route = isEn ? issue.issue_path_en : issue.issue_path_hr;
  const image = isEn ? issue.cover_image_en : issue.cover_image_hr;
  const alt = isEn ? issue.cover_alt_en : issue.cover_alt_hr;
  const week = isoWeek(parseWeek(issue.issue_week));
  const range = dateRange(issue.issue_week, language);
  const date = formatStoryDate(issue.issue_week, language);
  const title = isEn ? `Issue ${week} · ${issue.issue_week}` : `Izdanje ${week} · ${issue.issue_week}`;
  const stats = `${storyCount(issue.counts.selected_items, language)} · ${issue.counts.sources} ${isEn ? 'sources' : 'izvora'}`;
  return `<article class="tw-card"><a href="${esc(route)}"><img src="${esc(image)}" alt="${esc(alt)}" width="1200" height="630" loading="lazy" decoding="async"></a><div class="tw-card-body"><span class="label">${esc(isEn ? 'WEEKLY EDITION' : 'TJEDNO IZDANJE')} · ${esc(issue.issue_week)}</span><h3><a href="${esc(route)}">${esc(title)}</a></h3><p>${esc(isEn ? (issue.editorial_intro_en || issue.editorial_intro) : issue.editorial_intro)}</p><small><time datetime="${esc(issue.issue_week)}">${esc(range)}</time><br>${esc(stats)}</small></div></article>`;
}
function archiveIndexPage(issues, language) {
  const isEn = language === 'en';
  const route = isEn ? EN_INDEX : HR_INDEX;
  const canonical = `${SITE}${route}`;
  const alternateHr = `${SITE}${HR_INDEX}`;
  const alternateEn = `${SITE}${EN_INDEX}`;
  const latest = issues[0];
  const latestImage = isEn ? latest.cover_image_en : latest.cover_image_hr;
  const latestAlt = isEn ? latest.cover_alt_en : latest.cover_alt_hr;
  const latestPage = isEn ? latest.issue_path_en : latest.issue_path_hr;
  const week = isoWeek(parseWeek(latest.issue_week));
  const dateRangeText = dateRange(latest.issue_week, language);
  const title = isEn ? 'AKTUAL MEDIA WEEKLY — source-linked editorial editions' : 'AKTUAL MEDIA TJEDNI — izdanja i arhiva';
  const description = isEn
    ? 'Explore the permanent AKTUAL MEDIA WEEKLY archive: dated editions with selected stories, concise editorial summaries and links to original publishers.'
    : 'Pregledajte trajnu arhivu AKTUAL MEDIA TJEDNIKA: datirana izdanja s odabranim pričama, kratkim uredničkim sažecima i poveznicama na izvorne izdavače.';
  const intro = isEn
    ? 'A permanent, week-by-week collection of selected stories. Each edition preserves its own date, cover, editorial note and original source links.'
    : 'Trajna zbirka odabranih priča, izdanje po izdanje. Svako izdanje čuva vlastiti datum, naslovnicu, uredničku napomenu i poveznice na izvorne izvore.';
  const note = isEn
    ? 'External stories are summarized, not republished in full. Source photographs are used only with documented permission; otherwise the edition uses original AKTUAL MEDIA illustrations.'
    : 'Vanjske priče sažimaju se, ne prenose u cijelosti. Fotografije izvora koriste se samo uz dokumentirano dopuštenje; u suprotnom izdanje koristi izvorne ilustracije AKTUAL MEDIA.';
  const current = isEn ? 'LATEST EDITION' : 'NAJNOVIJE IZDANJE';
  const archiveLabel = isEn ? 'Issue archive' : 'Arhiva izdanja';
  const stories = isEn ? 'stories' : 'priča';
  const sources = isEn ? 'sources' : 'izvora';
  const mastOne = isEn ? 'STYLE · TRAVEL · PETS · CARS · SPORT' : 'STIL · PUTOVANJA · LJUBIMCI · AUTO · SPORT';
  const mastTwo = isEn ? 'A source-transparent weekly selection' : 'Tjedni izbor uz transparentne izvore';
  const cards = issues.map((issue) => archiveCard(issue, language)).join('\n');
  const schemas = safeJson(archiveIndexSchema(issues, language, canonical, description));
  const crosslinks = isEn ? `<a href="/en/gnk-aktual/">Newsroom →</a><a href="/en/gnk-aktual/columns/">Columns →</a>` : `<a href="/gnk-aktual/">Redakcija →</a><a href="/gnk-aktual/kolumne/">Kolumne →</a>`;
  return `<!doctype html><html lang="${language}" class="gnk-unified-shell"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><meta name="editor" content="Nermin Sefić"><link rel="canonical" href="${esc(canonical)}"><link rel="alternate" hreflang="hr" href="${esc(alternateHr)}"><link rel="alternate" hreflang="en" href="${esc(alternateEn)}"><link rel="alternate" hreflang="x-default" href="${esc(alternateHr)}"><meta property="og:type" content="website"><meta property="og:site_name" content="GNK ASG"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(SITE + latestImage)}"><meta property="og:image:alt" content="${esc(latestAlt)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/webp"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(SITE + latestImage)}"><meta name="twitter:image:alt" content="${esc(latestAlt)}"><script type="application/ld+json">${schemas}</script><link rel="stylesheet" href="/assets/public-unified-menu-v6.css?v=20260723-header-transparent-v3"><link rel="stylesheet" href="/assets/aktual-media-weekly-v1.css?v=20261013-static-archive"></head><body><header id="gnk-unified-header" data-gnk-unified-shell="v6-static"><div class="inner"><a class="brand" href="${isEn ? '/en/gnk-aktual/' : '/gnk-aktual/'}" aria-label="AKTUAL MEDIA"><img src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG" width="110" height="68"></a><div id="gnk-unified-menu"><div class="actions"><div class="lang">${isEn ? `<a href="${HR_INDEX}">HR</a><a href="${EN_INDEX}" aria-current="page">EN</a>` : `<a href="${HR_INDEX}" aria-current="page">HR</a><a href="${EN_INDEX}">EN</a>`}</div><button class="toggle" type="button" aria-expanded="false" aria-controls="gnk-unified-nav">${isEn ? 'MENU' : 'IZBORNIK'}</button></div><nav id="gnk-unified-nav"></nav></div></div></header><main class="tw-wrap"><div class="tw-topline"><span>${esc(isEn ? 'PERMANENT ARCHIVE' : 'TRAJNA ARHIVA')}</span><span>${issues.length} ${esc(isEn ? 'editions' : 'izdanja')}</span></div><nav class="tw-breadcrumb" aria-label="${esc(isEn ? 'Breadcrumb' : 'Krušne mrvice')}"><a href="${isEn ? '/en/' : '/'}">${esc(isEn ? 'Home' : 'Naslovnica')}</a><span aria-hidden="true">›</span><a href="${isEn ? '/en/gnk-aktual/' : '/gnk-aktual/'}">AKTUAL MEDIA</a><span aria-hidden="true">›</span><span aria-current="page">${esc(isEn ? 'Weekly archive' : 'Arhiva tjednika')}</span></nav><section class="tw-mast"><div class="side">${mastOne}</div><h1>AKTUAL MEDIA <span>${isEn ? 'WEEKLY' : 'TJEDNI'}</span></h1><div class="side">${mastTwo}</div></section><nav class="tw-deck" aria-label="${esc(isEn ? 'Weekly archive' : 'Arhiva tjednika')}"><a href="#latest">${esc(isEn ? 'Latest issue' : 'Najnovije izdanje')}</a><a href="#weekly-archive">${esc(archiveLabel)}</a><a href="${isEn ? '/en/gnk-aktual/' : '/gnk-aktual/'}">${esc(isEn ? 'Newsroom' : 'Redakcija')}</a><a href="${isEn ? '/en/gnk-aktual/columns/' : '/gnk-aktual/kolumne/'}">${esc(isEn ? 'Columns' : 'Kolumne')}</a></nav><section class="tw-cover" id="latest"><article class="tw-cover-main"><a href="${esc(latestPage)}"><img src="${esc(latestImage)}" alt="${esc(latestAlt)}" width="1200" height="630" fetchpriority="high" decoding="async"></a><div class="tw-cover-copy"><span class="tw-kicker">${esc(current)} · ${week} · ${esc(latest.issue_week)}</span><h2><a href="${esc(latestPage)}">${esc(isEn ? `Issue ${week} · ${latest.issue_week}` : `Izdanje ${week} · ${latest.issue_week}`)}</a></h2><p>${esc(isEn ? latest.editorial_intro_en || latest.editorial_intro : latest.editorial_intro)}</p><small>${esc(dateRangeText)} · ${latest.counts.selected_items} ${stories} · ${latest.counts.sources} ${sources}</small></div></article><aside class="tw-cover-side"><section class="tw-note"><span class="tw-kicker">${esc(archiveLabel)}</span><h3>${esc(isEn ? 'Every week, kept' : 'Svaki tjedan sačuvan')}</h3><p>${esc(intro)}</p><div class="tw-stat"><div><b>${issues.length}</b><span>${esc(isEn ? 'editions' : 'izdanja')}</span></div><div><b>${latest.counts.selected_items}</b><span>${esc(stories)}</span></div></div></section><section class="tw-note"><h3>${esc(isEn ? 'Source and image policy' : 'Izvori i slike')}</h3><p>${esc(note)}</p></section></aside></section><section class="tw-section" id="weekly-archive"><div class="tw-head"><h2>${esc(archiveLabel)}</h2><span>${issues.length} ${esc(isEn ? 'editions' : 'izdanja')}</span></div><div class="tw-grid">${cards}</div></section><section class="tw-editor"><div><h2>${esc(isEn ? 'More from AKTUAL MEDIA' : 'Više iz AKTUAL MEDIA')}</h2><p>${esc(isEn ? 'Continue to reporting, analysis and original columns.' : 'Nastavite na vijesti, analize i izvorne kolumne.')}</p></div><div>${crosslinks}</div></section><p class="tw-foot">${esc(isEn ? 'Each edition is a dated CollectionPage with its own permanent URL. Selected external reports link to the original publisher.' : 'Svako izdanje je datirana CollectionPage stranica sa svojim trajnim URL-om. Odabrani vanjski tekstovi vode na izvornog izdavača.')}</p></main><script src="/assets/public-unified-menu-v6.js?v=20260728-restaurants-contrast" defer></script>${refreshTag()}</body></html>`;
}

if (!fs.existsSync(ISSUE_PATH)) throw new Error(`Missing built weekly data ${ISSUE_PATH}`);
fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
const currentData = JSON.parse(fs.readFileSync(ISSUE_PATH, 'utf8'));
validateIssue(currentData);
const currentWeek = currentData.issue_week;
const currentArchiveData = path.join(ARCHIVE_DIR, `${currentWeek}.json`);
let currentIssue;
if (fs.existsSync(currentArchiveData) && !REFRESH) currentIssue = JSON.parse(fs.readFileSync(currentArchiveData, 'utf8'));
else {
  currentIssue = { ...currentData, issue_id: `aktual-media-tjedni-${currentWeek}`, issue_path_hr: `/gnk-aktual/tjedni/${currentWeek}/`, issue_path_en: `/en/gnk-aktual/weekly/${currentWeek}/`, archive_key: currentWeek };
  fs.writeFileSync(currentArchiveData, JSON.stringify(currentIssue, null, 2) + '\n');
}
validateIssue(currentIssue);
for (const { item } of getIssueItems(currentIssue)) {
  if (item.image.startsWith('/assets/')) {
    const imagePath = path.join(PORTAL, item.image.replace(/^\//, ''));
    if (!fs.existsSync(imagePath)) throw new Error(`${item.url}: generated/licensed image missing on disk (${item.image})`);
  }
}
for (const image of [currentIssue.cover_image_hr, currentIssue.cover_image_en]) {
  if (!image || !fs.existsSync(path.join(PORTAL, image.replace(/^\//, '')))) throw new Error(`Weekly cover asset missing: ${image}`);
}
for (const language of ['hr', 'en']) {
  const route = language === 'en' ? currentIssue.issue_path_en : currentIssue.issue_path_hr;
  const file = path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const html = articlePage(currentIssue, language);
  if (!fs.existsSync(file) || REFRESH) fs.writeFileSync(file, html);
}

const issues = fs.readdirSync(ARCHIVE_DIR).filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file)).map((file) => JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, file), 'utf8'))).sort((a, b) => b.issue_week.localeCompare(a.issue_week));
for (const language of ['hr', 'en']) {
  const route = language === 'en' ? EN_INDEX : HR_INDEX;
  const file = path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
  const html = archiveIndexPage(issues, language);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
console.log(JSON.stringify({ version: 'AKTUAL_WEEKLY_STATIC_ARCHIVE_V1', issue_week: currentWeek, issue_date: currentIssue.issue_date, stableRoutes: [currentIssue.issue_path_hr, currentIssue.issue_path_en], archiveCount: issues.length, selectedItems: currentIssue.counts.selected_items, sources: currentIssue.counts.sources, refreshed: REFRESH, staticHtml: true }, null, 2));
