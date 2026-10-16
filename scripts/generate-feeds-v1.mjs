// RSS 2.0 and Atom 1.0 feeds derived from the canonical editorial registry.
// Per-item author attribution is registry-based; editor/publisher roles are not
// copied into per-item author fields. Social hashtags are not feed keywords.
import fs from 'node:fs';
import path from 'node:path';
import {
  SITE,
  PERSON_URL,
  articleAuthorFor,
} from './lib/editorial-attribution-v1.mjs';

const ROOT = 'apps/portal';
const SOCIAL_CARD = `${SITE}/assets/gnk-asg-social-card.png`;
const read = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};
const writeIfChanged = (file, content) => {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
};
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[char]));
const cdata = (value) => String(value ?? '').replace(/\]\]>/g, ']]&gt;');
const readDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
};

const registry = read(`${ROOT}/data/editorial-registry.json`, { items: [] });
const items = (registry.items || []).filter((item) => item?.path && item?.url)
  .sort((a, b) => (readDate(b.publishedAt)?.getTime() || 0) - (readDate(a.publishedAt)?.getTime() || 0));
const byLanguage = { hr: [], en: [] };
for (const item of items) {
  const language = item.language === 'en' || String(item.path).startsWith('/en/') ? 'en' : 'hr';
  byLanguage[language].push(item);
}
const latestTimestamp = items.reduce((latest, item) => {
  const date = readDate(item.modifiedAt) || readDate(item.publishedAt);
  return date && date.getTime() > latest ? date.getTime() : latest;
}, Date.parse('2026-01-01T00:00:00Z'));
const feedUpdated = new Date(latestTimestamp);
const feedUpdatedRss = feedUpdated.toUTCString();
const feedUpdatedAtom = feedUpdated.toISOString();

function authorFor(item) {
  return articleAuthorFor(item);
}

function safeCategories(item) {
  return [...new Set([item.collection, item.section].filter((value) => typeof value === 'string' && value.trim()))]
    .slice(0, 2)
    .map((value) => `      <category>${esc(value)}</category>`)
    .join('\n');
}

function rss(language, list) {
  const isHr = language === 'hr';
  const title = isHr ? 'GNK ASG — najnovije objave' : 'GNK ASG — latest publications';
  const description = isHr
    ? 'Objave, analize, komentari i odabrani urednički sadržaji GNK ASG-a. Svaka stavka zadržava vlastitu atribuciju autora i izvora.'
    : 'Publications, analyses, commentary and selected GNK ASG editorial items. Each entry retains its own author and source attribution.';
  const link = isHr ? `${SITE}/objave/` : `${SITE}/en/publications/`;
  const selfHref = isHr ? `${SITE}/feed.xml` : `${SITE}/en/feed.xml`;
  const entries = list.slice(0, 50).map((item) => {
    const author = authorFor(item);
    const published = readDate(item.publishedAt);
    const image = item.image ? `      <enclosure url="${esc(item.image)}" type="${/\.png(?:$|\?)/i.test(item.image) ? 'image/png' : /\.jpe?g(?:$|\?)/i.test(item.image) ? 'image/jpeg' : 'image/webp'}" length="0"/>\n      <media:content url="${esc(item.image)}" medium="image"/>\n` : '';
    const authorElement = author ? `      <dc:creator>${esc(author.name)}</dc:creator>\n` : '';
    const categories = safeCategories(item);
    return `    <item>
      <title>${esc(item.title || item.slug)}</title>
      <link>${esc(item.url)}</link>
      <guid isPermaLink="true">${esc(item.url)}</guid>
${published ? `      <pubDate>${published.toUTCString()}</pubDate>\n` : ''}${authorElement}      <description><![CDATA[${cdata(item.description || '')}]]></description>
${image}${categories ? `${categories}\n` : ''}    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(link)}</link>
    <description>${esc(description)}</description>
    <language>${isHr ? 'hr-HR' : 'en'}</language>
    <copyright>© GNK ASG d.o.o.</copyright>
    <managingEditor>it@gnk-asg.hr (Nermin Sefić, Editor-in-Chief)</managingEditor>
    <webMaster>it@gnk-asg.hr</webMaster>
    <lastBuildDate>${feedUpdatedRss}</lastBuildDate>
    <generator>GNK ASG feeds v1</generator>
    <atom:link href="${esc(selfHref)}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE}/assets/logo-gnk-asg-canonical.svg</url>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
    </image>
${entries}
  </channel>
</rss>
`;
}

function atom(language, list) {
  const isHr = language === 'hr';
  const title = isHr ? 'GNK ASG — najnovije objave' : 'GNK ASG — latest publications';
  const description = isHr
    ? 'Objave, analize i komentari GNK ASG-a; autor se navodi samo kada ga potvrđuje urednički registar.'
    : 'GNK ASG publications, analyses and commentary; an author is named only when confirmed by the editorial registry.';
  const link = isHr ? `${SITE}/objave/` : `${SITE}/en/publications/`;
  const selfHref = isHr ? `${SITE}/atom.xml` : `${SITE}/en/atom.xml`;
  const entries = list.slice(0, 50).map((item) => {
    const author = authorFor(item);
    const published = readDate(item.publishedAt);
    const updated = readDate(item.modifiedAt) || published || feedUpdated;
    const authorBlock = author
      ? `<author><name>${esc(author.name)}</name>${author.url ? `<uri>${esc(author.url)}</uri>` : ''}</author>`
      : '';
    const categories = [item.collection, item.section]
      .filter((value) => typeof value === 'string' && value.trim())
      .slice(0, 2)
      .map((value) => `<category term="${esc(value)}"/>`).join('');
    return `  <entry>
    <title>${esc(item.title || item.slug)}</title>
    <link href="${esc(item.url)}" rel="alternate"/>
    <id>${esc(item.url)}</id>
    <updated>${esc(updated.toISOString())}</updated>
${published ? `    <published>${esc(published.toISOString())}</published>\n` : ''}${authorBlock ? `    ${authorBlock}\n` : ''}    <summary><![CDATA[${cdata(item.description || '')}]]></summary>
    ${item.image ? `<link rel="enclosure" href="${esc(item.image)}"/>` : ''}
    ${categories}
  </entry>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${isHr ? 'hr' : 'en'}">
  <title>${esc(title)}</title>
  <subtitle>${esc(description)}</subtitle>
  <link href="${esc(link)}" rel="alternate"/>
  <link href="${esc(selfHref)}" rel="self"/>
  <id>${esc(selfHref)}</id>
  <updated>${feedUpdatedAtom}</updated>
  <author><name>GNK ASG d.o.o.</name><uri>${SITE}/</uri></author>
  <rights>© GNK ASG d.o.o.</rights>
  <generator uri="${SITE}/">GNK ASG feeds v1</generator>
  <icon>${SITE}/assets/logo-gnk-asg-canonical.svg</icon>
${entries}
</feed>
`;
}

function feedIndex(language) {
  const isHr = language === 'hr';
  const title = isHr ? 'RSS i Atom feedovi · GNK ASG' : 'RSS and Atom feeds · GNK ASG';
  const description = isHr
    ? 'RSS i Atom kanali GNK ASG-a s najnovijim objavama, komentarima i analizama; svaka stavka zadržava vlastitu atribuciju autora i izvora.'
    : 'GNK ASG RSS and Atom feeds for publications, commentary and analyses; each entry retains its own author and source attribution.';
  const rssPath = isHr ? '/feed.xml' : '/en/feed.xml';
  const atomPath = isHr ? '/atom.xml' : '/en/atom.xml';
  const canonical = isHr ? `${SITE}/feed/` : `${SITE}/en/feed/`;
  const home = isHr ? `${SITE}/` : `${SITE}/en/`;
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    inLanguage: language,
    isPartOf: { '@id': `${SITE}/#website` },
    editor: { '@id': `${SITE}/#nermin-sefic`, '@type': 'Person', name: 'Nermin Sefić', url: PERSON_URL },
    publisher: { '@id': `${SITE}/#gnk-asg`, '@type': 'Organization', name: 'GNK ASG d.o.o.' },
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: isHr ? 'Naslovnica' : 'Home', item: home },
      { '@type': 'ListItem', position: 2, name: isHr ? 'Feedovi' : 'Feeds', item: canonical },
    ],
  };
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="editor" content="Nermin Sefić">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="hr" href="${SITE}/feed/">
<link rel="alternate" hreflang="en" href="${SITE}/en/feed/">
<link rel="alternate" type="application/rss+xml" title="RSS" href="${rssPath}">
<link rel="alternate" type="application/atom+xml" title="Atom" href="${atomPath}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GNK ASG">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SOCIAL_CARD}">
<meta property="og:image:alt" content="GNK ASG d.o.o. corporate editorial card">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SOCIAL_CARD}">
<script type="application/ld+json">${JSON.stringify(pageSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
<style>body{font:16px/1.55 system-ui,Segoe UI,Arial,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;color:#eee;background:#0b0d10}a{color:#8bd}code{background:#151a20;padding:2px 6px;border-radius:4px}</style>
</head>
<body>
<main>
<h1>${esc(title)}</h1>
<p>${esc(description)}</p>
<h2>${isHr ? 'Kanali' : 'Channels'}</h2>
<ul>
<li><strong>RSS 2.0:</strong> <a href="${rssPath}"><code>${rssPath}</code></a></li>
<li><strong>Atom 1.0:</strong> <a href="${atomPath}"><code>${atomPath}</code></a></li>
</ul>
<p>${isHr
    ? 'Autor se prikazuje samo kada ga potvrđuje urednički registar; urednička odgovornost i izdavač nisu osobni autor.'
    : 'An author is shown only when confirmed by the editorial registry; editorial responsibility and publisher are not personal authorship.'}</p>
</main>
</body>
</html>`;
}

const outputs = [
  ['apps/portal/feed.xml', rss('hr', byLanguage.hr)],
  ['apps/portal/en/feed.xml', rss('en', byLanguage.en)],
  ['apps/portal/atom.xml', atom('hr', byLanguage.hr)],
  ['apps/portal/en/atom.xml', atom('en', byLanguage.en)],
  ['apps/portal/feed/index.html', feedIndex('hr')],
  ['apps/portal/en/feed/index.html', feedIndex('en')],
];
let changed = 0;
for (const [file, content] of outputs) if (writeIfChanged(file, content)) changed++;
console.log(JSON.stringify({
  version: 'GNK_ASG_FEEDS_ATTRIBUTION_V2',
  items: items.length,
  hrItems: byLanguage.hr.length,
  enItems: byLanguage.en.length,
  changed,
  perItemAuthorship: 'verified-registry-only',
  wrote: outputs.map(([file]) => `/${path.relative(ROOT, file).replace(/\\/g, '/')}`),
}, null, 2));
