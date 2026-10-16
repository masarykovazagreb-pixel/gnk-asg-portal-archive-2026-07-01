#!/usr/bin/env node
import fs from 'node:fs';

const PORTAL = 'apps/portal';
const REGISTRY = `${PORTAL}/data/editorial-registry.json`;
const IMAGE_MANIFEST = `${PORTAL}/data/editorial-image-manifest.json`;
const QUEUE = 'content/factory-queue/queue.json';
const QUEUE_STATE = `${PORTAL}/data/content-queue-state.json`;
const PAGES = [
  { language: 'hr', path: `${PORTAL}/gnk-aktual/kolumne/index.html`, prefix: '/gnk-aktual/kolumne/' },
  { language: 'en', path: `${PORTAL}/en/gnk-aktual/columns/index.html`, prefix: '/en/gnk-aktual/columns/' },
];
const SITE = 'https://gnk-asg.hr';
const WRITE = process.argv.includes('--write');
const CHECK = process.argv.includes('--check');
const NOW = new Date(process.env.ASG_EDITORIAL_NOW || Date.now());
if (!Number.isFinite(NOW.getTime())) throw new Error('Invalid ASG_EDITORIAL_NOW');

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const jsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const formatDate = (value, language) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'hr-HR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Zagreb' }).format(parsed);
};
const validCalendarDate = (value) => {
  if (!/^20\d\d-\d\d-\d\d$/.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};
const zagrebNow = () => ({
  date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit' }).format(NOW),
  time: new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zagreb', hour: '2-digit', minute: '2-digit', hour12: false }).format(NOW),
});
const isFutureSlot = (item, now) => item.date > now.date || (item.date === now.date && item.time > now.time);
const formatSlot = (date, time, language) => {
  const [year, month, day] = date.split('-').map(Number);
  const stableDate = new Date(Date.UTC(year, month - 1, day, 12));
  const dateText = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'hr-HR', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(stableDate);
  return `${dateText} ${language === 'en' ? 'at' : 'u'} ${time}`;
};
const zagrebOffset = (date) => {
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zagreb', timeZoneName: 'shortOffset' })
    .formatToParts(new Date(`${date}T12:00:00Z`)).find((part) => part.type === 'timeZoneName')?.value;
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone || '');
  if (!match) throw new Error(`Cannot determine Europe/Zagreb offset for ${date}.`);
  return `${match[1]}${match[2].padStart(2, '0')}:${match[3] || '00'}`;
};
const extractExistingSummaries = (html) => {
  const summaries = new Map();
  for (const match of html.matchAll(/<article\b[^>]*class="[^"]*\bcard\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g)) {
    const body = match[1];
    const link = /<h2>\s*<a\b[^>]*href="([^"]+)"/i.exec(body);
    const summary = /<p class="summary">([\s\S]*?)<\/p>/i.exec(body);
    if (link && summary) summaries.set(link[1], summary[1]);
  }
  return summaries;
};
const card = (item, image, language, priorSummary) => {
  const dateValue = item.publishedAt || item.published_at;
  const date = formatDate(dateValue, language);
  const label = language === 'en' ? 'AKTUAL MEDIA · COLUMN' : 'AKTUAL MEDIA · KOLUMNA';
  const dateText = date ? `<time datetime="${esc(dateValue)}">${esc(date)}</time>` : '';
  const summary = priorSummary ?? esc(item.description || '');
  return `<article class="card"><a href="${esc(item.path)}"><img src="${esc(image.image)}" alt="${esc(image.alt)}" width="1200" height="630" loading="lazy" decoding="async"></a><div class="body"><span class="tag">${label}</span><h2><a href="${esc(item.path)}">${esc(item.title)}</a></h2><p class="summary">${summary}</p><div class="meta">${dateText}${dateText ? ' · ' : ''}Nermin Sefić</div></div></article>`;
};
const upcomingCard = (item, language) => {
  const title = language === 'en' ? item.publicTitleEn : item.publicTitleHr;
  if (!title) return '';
  const teaser = language === 'en' ? item.publicTeaserEn : item.publicTeaserHr;
  const label = language === 'en' ? 'SCHEDULED · SUBJECT TO EDITORIAL RELEASE' : 'PLANIRANO · ČEKA UREDNIČKO ODOBRENJE OBJAVE';
  const dateTime = `${item.date}T${item.time}:00${zagrebOffset(item.date)}`;
  return `<article class="card upcoming-card" data-column-state="scheduled"><div class="body"><span class="tag">${label}</span><h3>${esc(title)}</h3>${teaser ? `<p class="summary">${esc(teaser)}</p>` : ''}<div class="meta"><time datetime="${esc(dateTime)}">${esc(formatSlot(item.date, item.time, language))}</time></div></div></article>`;
};

for (const source of [REGISTRY, IMAGE_MANIFEST, QUEUE, QUEUE_STATE]) {
  if (!fs.existsSync(source)) throw new Error(`Missing columns archive input: ${source}`);
}
const registry = readJson(REGISTRY);
const manifest = readJson(IMAGE_MANIFEST);
const queue = readJson(QUEUE);
const queueState = readJson(QUEUE_STATE);
if (!Array.isArray(registry.items) || !Array.isArray(manifest.items) || !Array.isArray(queue.items)
  || !Array.isArray(queue.skipped) || !queueState.published || typeof queueState.published !== 'object') {
  throw new Error('Invalid canonical registry, cover manifest, content queue or publication state.');
}
const imageByPath = new Map(manifest.items.map((image) => [image.path, image]));
const publishedSlugs = new Set(registry.items.filter((item) => item.type === 'kolumna' && item.status === 'published').map((item) => item.slug));
const skipped = new Set(queue.skipped);
const now = zagrebNow();
const publicSchedule = [];
const announcedIds = new Set();
for (const item of queue.items) {
  if (item?.category !== 'kolumne' || item.publicListingApproved !== true) continue;
  if (!item.id || typeof item.id !== 'string' || announcedIds.has(item.id)) throw new Error(`Public column schedule has a missing or duplicate queue ID: ${item?.id || '(missing)'}`);
  announcedIds.add(item.id);
  if (skipped.has(item.id) || Object.hasOwn(queueState.published, item.id)) continue;
  if (!/^[a-z0-9-]+$/.test(item.slug || '') || publishedSlugs.has(item.slug)) throw new Error(`${item.id}: a publicly scheduled column must have a new, valid slug.`);
  if (!validCalendarDate(item.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time || '')) throw new Error(`${item.id}: public column schedule needs a real Zagreb date and HH:MM time.`);
  if (typeof item.editorialApprovalRef !== 'string' || !item.editorialApprovalRef.trim()) throw new Error(`${item.id}: public schedule needs an editorialApprovalRef.`);
  for (const [key, required, maxLength] of [['publicTitleHr', true, 180], ['publicTitleEn', false, 180], ['publicTeaserHr', false, 320], ['publicTeaserEn', false, 320]]) {
    if (item[key] === undefined && !required) continue;
    if (typeof item[key] !== 'string' || (required && !item[key].trim()) || item[key].length > maxLength) {
      throw new Error(`${item.id}: ${key} must be ${required ? 'a non-empty' : 'a'} public string of at most ${maxLength} characters.`);
    }
  }
  const forbiddenDraftFields = ['body', 'content', 'draft', 'fulltext', 'html', 'markdown', 'text', 'tekst'];
  if (Object.keys(item).some((key) => forbiddenDraftFields.includes(key.toLowerCase()))) throw new Error(`${item.id}: do not put unpublished article text in the public schedule record.`);
  if (isFutureSlot(item, now)) publicSchedule.push(item);
}
publicSchedule.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

let changed = 0;
let total = 0;
for (const page of PAGES) {
  if (!fs.existsSync(page.path)) throw new Error(`Missing columns index: ${page.path}`);
  let html = fs.readFileSync(page.path, 'utf8');
  const before = html;
  const existingSummaries = extractExistingSummaries(html);
  const items = registry.items.filter((item) => item.type === 'kolumna' && item.language === page.language
    && item.status === 'published' && item.path.startsWith(page.prefix));
  if (!items.length) throw new Error(`No published ${page.language} columns found for ${page.prefix}`);
  const seenRoutes = new Set();
  const entries = items.map((item) => {
    if (!item.path || seenRoutes.has(item.path)) throw new Error(`${item.path || '(missing path)'}: duplicate or missing published column route.`);
    seenRoutes.add(item.path);
    const image = imageByPath.get(item.path);
    if (!image) throw new Error(`${item.path}: missing generated cover image`);
    return { item, image };
  });
  const cards = entries.map(({ item, image }) => card(item, image, page.language, existingSummaries.get(item.path))).join('\n');
  const sectionMarkup = `<h2 id="columns-heading" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">${page.language === 'en' ? 'All published columns' : 'Sve objavljene kolumne'}</h2><section id="columns" class="grid" aria-labelledby="columns-heading">${cards}</section>`;
  const upcoming = publicSchedule.map((item) => upcomingCard(item, page.language)).filter(Boolean).join('\n');
  const upcomingMarkup = `<section id="upcoming-columns" aria-labelledby="upcoming-columns-heading"><h2 id="upcoming-columns-heading">${page.language === 'en' ? 'Announced upcoming columns' : 'Najavljene buduće kolumne'}</h2><p class="summary">${page.language === 'en' ? 'Only titles and dates explicitly approved for public announcement appear here. Drafts remain unpublished.' : 'Ovdje se prikazuju samo naslovi i termini izričito odobreni za javnu najavu. Nacrti ostaju neobjavljeni.'}</p>${upcoming ? `<div class="grid">${upcoming}</div>` : `<p class="empty" data-column-schedule-empty>${page.language === 'en' ? 'There are no English-language public announcements for upcoming columns.' : 'Trenutačno nema javno najavljenih budućih kolumni.'}</p>`}</section>`;
  const scheduleStyle = '<style data-column-schedule-style>#upcoming-columns{margin-top:2.5rem}#upcoming-columns .upcoming-card h3{font:900 1.05rem/1.25 Arial Black,Impact,sans-serif;margin:7px 0 9px}#upcoming-columns .upcoming-card .meta{line-height:1.5}</style>';
  if (!html.includes('data-column-schedule-style')) html = html.replace('</head>', `${scheduleStyle}</head>`);
  html = html.replace(/<h2\b[^>]*id=["']columns-heading["'][^>]*>[\s\S]*?<\/h2>/gi, '');
  html = html.replace(/<section\b[^>]*id=["']upcoming-columns["'][^>]*>[\s\S]*?<\/section>/gi, '');
  const sectionPattern = /<section\b[^>]*id=["']columns["'][^>]*>[\s\S]*?<\/section>/i;
  if (!sectionPattern.test(html)) throw new Error(`${page.path}: missing #columns collection slot`);
  html = html.replace(sectionPattern, `${sectionMarkup}${upcomingMarkup}`);
  // An old async renderer replaced the server HTML with a short fetch result.
  html = html.replace(/\s*<script>\s*\(function\(\)\s*\{[\s\S]*?\}\)\(\);\s*<\/script>/i, '');

  const canonical = `${SITE}${page.prefix}`;
  const listNode = {
    '@type': 'ItemList',
    '@id': `${canonical}#columns`,
    name: page.language === 'en' ? 'All published columns by Nermin Sefić' : 'Sve objavljene kolumne Nermina Sefića',
    numberOfItems: entries.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: entries.map(({ item, image }, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE}${item.path}`, name: item.title, image: `${SITE}${image.image}` })),
  };
  let jsonLdChanged = false;
  html = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (block, raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return block; }
    let found = false;
    const visit = (value) => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== 'object') return;
      const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
      if (types.includes('ItemList') && /columns|kolumn/i.test(`${value['@id'] || ''} ${value.name || ''}`)) {
        Object.assign(value, listNode);
        found = true;
      }
      Object.values(value).forEach(visit);
    };
    visit(data);
    if (found) {
      jsonLdChanged = true;
      return `<script type="application/ld+json">${jsonForScript(data)}</script>`;
    }
    return block;
  });
  if (!jsonLdChanged) html = html.replace('</head>', `<script type="application/ld+json">${jsonForScript({ '@context': 'https://schema.org', ...listNode })}</script></head>`);

  const ogAlt = page.language === 'en' ? 'Nermin Sefić, AKTUAL MEDIA columnist' : 'Nermin Sefić, kolumnist AKTUAL MEDIA';
  const meta = (keyAttr, key, value) => `<meta ${keyAttr}="${esc(key)}" content="${esc(value)}">`;
  if (!/<meta\b[^>]*property=["']og:image:alt["']/i.test(html)) html = html.replace('</head>', `${meta('property','og:image:alt',ogAlt)}</head>`);
  if (!/<meta\b[^>]*name=["']twitter:image:alt["']/i.test(html)) html = html.replace('</head>', `${meta('name','twitter:image:alt',ogAlt)}</head>`);
  if (!/<meta\b[^>]*name=["']robots["']/i.test(html)) html = html.replace('</head>', `${meta('name','robots','index,follow,max-image-preview:large,max-snippet:-1')}</head>`);
  if (!html.includes('</head>') || !html.includes('</main>')) throw new Error(`${page.path}: malformed static page shell`);
  if (html !== before) {
    changed++;
    if (WRITE) fs.writeFileSync(page.path, html);
  }
  total += entries.length;
  console.log(`${page.language}: ${entries.length} server-rendered published columns; ${publicSchedule.filter((item) => page.language === 'hr' ? Boolean(item.publicTitleHr) : Boolean(item.publicTitleEn)).length} approved upcoming; ${WRITE ? '' : 'dry-run'}`);
}
const result = { version: 'AKTUAL_COLUMNS_STATIC_INDEX_V2', publishedItems: total, publicScheduleItems: publicSchedule.length, filesChanged: changed, write: WRITE, check: CHECK, noPublishingSideEffects: true };
console.log(JSON.stringify(result, null, 2));
if (CHECK && changed) {
  console.error(`Column indexes are stale: ${changed} file(s) differ. Run node scripts/build-aktual-columns-index-v1.mjs --write and review the exact route diff.`);
  process.exitCode = 1;
}
