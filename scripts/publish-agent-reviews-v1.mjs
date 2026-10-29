#!/usr/bin/env node
/**
 * OBJAVA ODOBRENIH PREGLEDA AI AGENATA.
 *
 * Uzima iz artifacts/agent-editorial/queue-*.json samo stavke koje je AI kontrolni
 * agent odobrio (status approved-by-agent) i od njih izrađuje javne stranice:
 *
 *   HR: apps/portal/agenti/pregledi/<id>/index.html
 *   EN: apps/portal/en/agents/reviews/<id>/index.html
 *   popisi:  /agenti/pregledi/  i  /en/agents/reviews/
 *   sitemap: apps/portal/agent-reviews-sitemap.xml (+ unos u sitemap-index.xml)
 *
 * Pravila:
 *  - Autor u meta podacima i JSON-LD-u je AI agent (AGENT-PISAC-001). Urednik je
 *    Nermin Sefić, kao na svakom uređivačkom webu (autorska traka).
 *  - AI oznaka je vidljiva na stranici, na jeziku te stranice.
 *  - Ako je kill switch isključen (ops/agent-editorial-kill-switch.json), ništa se
 *    ne piše i postojeće stranice ostaju kako jesu.
 *  - Svaka stranica prolazi provjere (opis, poveznice, hashtagovi, JSON-LD, AI oznaka)
 *    prije pisanja; ako neka ne prolazi, ne objavljuje se i razlog se ispisuje.
 *
 *   node scripts/publish-agent-reviews-v1.mjs [--check]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { killSwitchState, WRITER_ID, APPROVER_ID } from '../apps/agents/lib/policy-v1.mjs';
import { authorBand, AUTHOR_BAND_CSS, AUTHOR_PORTRAIT, ensureAuthorPortrait } from '../apps/shared/author-band-v1.mjs';
import { impressumBlock } from '../apps/shared/impressum-v1.mjs';
import { houseRibbonHtml, HOUSE_RIBBON_CSS } from './lib/house-ribbon-v1.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const QUEUE_DIR = join(ROOT, 'artifacts', 'agent-editorial');
const SITE = 'https://gnk-asg.hr';
const CHECK = process.argv.includes('--check');

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const hrefOk = (u) => /^https:\/\//.test(u) || u.startsWith('/');

const HR_PATH = (id) => `/agenti/pregledi/${id}/`;
const EN_PATH = (id) => `/en/agents/reviews/${id}/`;

export function collectApproved(queueDir = QUEUE_DIR) {
  if (!existsSync(queueDir)) return [];
  const out = [];
  for (const file of readdirSync(queueDir).filter((f) => /^queue-.*\.json$/.test(f)).sort()) {
    const queue = JSON.parse(readFileSync(join(queueDir, file), 'utf8'));
    for (const item of queue.items || []) if (item.status === 'approved-by-agent') out.push(item);
  }
  return out;
}

/** Provjere prije objave; vraća popis problema (prazno = prolazi). */
export function reviewProblems(item) {
  const problems = [];
  for (const lang of ['hr', 'en']) {
    const t = item[lang];
    if (!t) { problems.push(`${lang}: nema teksta`); continue; }
    const len = (t.description || '').length;
    if (len < 80 || len > 200) problems.push(`${lang}: opis ${len} znakova (80–200)`);
    if (!t.paragraphs || t.paragraphs.length < 2) problems.push(`${lang}: premalo odlomaka`);
    if (!item.disclosure || !item.disclosure[lang]) problems.push(`${lang}: nema AI oznake`);
  }
  if (!item.hashtags || item.hashtags.length < 3) problems.push('premalo hashtagova');
  const sourceLinks = (item.items || []).map((x) => x.url);
  const links = [...(item.links || []), ...sourceLinks];
  if (links.length < 6) problems.push(`samo ${links.length} poveznica (≥6)`);
  if (!sourceLinks.every(hrefOk)) problems.push('izvor nije HTTPS');
  return problems;
}

const CSS = `<style>
.ag-wrap{max-width:900px;margin:0 auto;padding:28px 20px 8px;font:400 16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}
.ag-wrap h1{font:800 clamp(26px,4vw,36px)/1.15 Georgia,serif;margin:6px 0 10px}
.ag-byline{font:600 14px/1.5 system-ui,sans-serif;margin:0 0 12px;opacity:.9}
.ag-kicker{font:800 11px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8a5a00;margin:0}
.ag-lead{opacity:.85;margin:0 0 16px}
.ag-disclosure{border-left:4px solid #c9962b;background:#fff8e6;padding:10px 14px;font-size:14px;margin:0 0 22px}
.ag-h2{font:800 18px/1.2 Georgia,serif;margin:28px 0 8px}
.ag-wrap ol li,.ag-wrap ul li{margin:0 0 8px}
.ag-tags{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:18px 0}
.ag-tags li{background:#1b3a5c;color:#fff;border-radius:999px;padding:4px 12px;font:700 12px/1.4 system-ui,sans-serif}
.ag-tags li:nth-child(3n+2){background:#8a5a00}
.ag-tags li:nth-child(3n){background:#2e7d5b}
.ag-src{font-size:14px;opacity:.9}
.ag-nav{display:flex;flex-wrap:wrap;gap:10px 16px;font-size:14px;margin:8px 0 24px}
.ag-nav a{color:#1b3a5c;font-weight:700}
.ag-card{border:1px solid rgba(128,128,128,.25);border-radius:12px;padding:14px 16px;margin:0 0 12px}
.ag-card h2{font:800 18px/1.25 Georgia,serif;margin:0 0 6px}
.ag-card p{margin:0;font-size:15px}
</style>`;

function jsonLd({ canonical, title, description, lang, item, city, pathHr, pathEn }) {
  const hashtags = item.hashtags || [];
  const sourceUrls = (item.items || []).map((x) => x.url);
  const crumbs = lang === 'hr'
    ? [['Početna', `${SITE}/`], ['AI agenti', `${SITE}/agenti/`], ['Pregledi', `${SITE}/agenti/pregledi/`], [title, canonical]]
    : [['Home', `${SITE}/en/`], ['AI agents', `${SITE}/agenti/`], ['Reviews', `${SITE}/en/agents/reviews/`], [title, canonical]];
  const graph = [
    {
      '@type': 'Article',
      '@id': `${canonical}#article`,
      headline: title,
      description,
      inLanguage: lang,
      datePublished: item.run_date,
      dateModified: item.run_date,
      mainEntityOfPage: canonical,
      author: { '@type': 'SoftwareApplication', name: WRITER_ID, description: 'AI agent GNK ASG-a: priprema pregled iz javnih izvora' },
      editor: { '@id': `${SITE}/#nermin-sefic` },
      publisher: { '@id': `${SITE}/#gnk-asg` },
      keywords: hashtags.join(', '),
      about: { '@type': 'Place', name: city },
      isBasedOn: sourceUrls,
      citation: sourceUrls,
      contentLocation: { '@type': 'Place', name: city },
      disclaimer: item.disclosure[lang],
      alternativeHeadline: undefined,
      translationOfWork: undefined,
      sameAs: [pathHr && `${SITE}${pathHr}`, pathEn && `${SITE}${pathEn}`].filter(Boolean),
      potentialAction: undefined,
    },
    { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'GNK ASG', inLanguage: ['hr', 'en'], publisher: { '@id': `${SITE}/#gnk-asg` } },
    {
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map(([name, id], i) => ({ '@type': 'ListItem', position: i + 1, name, item: id })),
    },
  ];
  for (const g of graph) for (const k of Object.keys(g)) if (g[k] === undefined) delete g[k];
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

export function renderReview(item, lang) {
  const t = item[lang];
  const isHr = lang === 'hr';
  const pathSelf = isHr ? HR_PATH(item.id) : EN_PATH(item.id);
  const pathAlt = isHr ? EN_PATH(item.id) : HR_PATH(item.id);
  const canonical = `${SITE}${pathSelf}`;
  const title = t.title;
  const description = t.description;
  const hashtags = item.hashtags || [];
  const sources = item.items || [];
  const links = [...new Set(item.links || [])];
  const L = isHr
    ? { kicker: 'AI pregled', sources: 'Izvori (s poveznicama na izdavače)', tags: 'Hashtagovi', related: 'Povezano', list: '← Svi AI pregledi', lang: 'hr', alt: 'English version' }
    : { kicker: 'AI review', sources: 'Sources (linked to publishers)', tags: 'Hashtags', related: 'Related', list: '← All AI reviews', lang: 'en', alt: 'Hrvatska verzija' };
  const city = item.city;
  const band = authorBand(lang, item.channel, { portrait: '/assets/people/nermin-sefic.webp' });
  const body = t.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n');
  const sourceList = sources.map((s) => `<li class="ag-src"><strong>${esc(s.publisher)}</strong>, ${esc(s.date)}: <a href="${esc(s.url)}" rel="nofollow external noopener">${esc(s.title)}</a></li>`).join('\n');
  const tags = hashtags.map((h) => `<li>${esc(h)}</li>`).join('');
  const relatedLinks = links.map((u) => `<a href="${esc(u)}">${esc(u)}</a>`).join(' · ');
  const articleTags = hashtags.map((h) => `<meta property="article:tag" content="${esc(h)}">`).join('\n');
  const alt = isHr ? `<link rel="alternate" hreflang="en" href="${SITE}${EN_PATH(item.id)}">` : `<link rel="alternate" hreflang="hr" href="${SITE}${HR_PATH(item.id)}">`;
  return `<!doctype html>
<html lang="${L.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | AKTUAL MEDIA</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${L.lang}" href="${canonical}">
${alt}
<link rel="alternate" hreflang="x-default" href="${SITE}${HR_PATH(item.id)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="article:published_time" content="${esc(item.run_date)}">
<meta property="article:section" content="${esc(city)}">
${articleTags}
<meta name="keywords" content="${esc(hashtags.join(', '))}">
<meta name="twitter:card" content="summary">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="author" content="${esc(WRITER_ID)} (AI agent)">
<meta name="editor" content="Nermin Sefić">
<meta name="generator" content="${esc(WRITER_ID)}; kontrola ${esc(APPROVER_ID)}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/am-design-v1.css?v=20261024" data-am-design="v1">
<link rel="stylesheet" href="/assets/author-band-v1.css?v=20261025">
<link rel="stylesheet" href="${HOUSE_RIBBON_CSS}">
<script src="/assets/am-refresh-v1.js?v=${item.run_date}" data-am-netday="${item.run_date}" defer></script>
${CSS}
${jsonLd({ canonical, title, description, lang, item, city, pathHr: HR_PATH(item.id), pathEn: EN_PATH(item.id) })}
</head>
<body>
${houseRibbonHtml(lang)}
<main class="ag-wrap" data-agent-review="${esc(item.id)}" data-agent-writer="${esc(WRITER_ID)}" data-agent-approver="${esc(APPROVER_ID)}">
<p class="ag-kicker">${L.kicker} · ${esc(city)} · ${esc(item.run_date)}</p>
<p class="ag-byline">${isHr ? `Autor: AI agent ${esc(WRITER_ID)} (GNK ASG) · Odobrio: AI kontrolni agent ${esc(APPROVER_ID)} · Urednik: Nermin Sefić, direktor GNK ASG d.o.o. i glavni urednik AKTUAL MEDIA` : `Author: AI agent ${esc(WRITER_ID)} (GNK ASG) · Approved by: AI control agent ${esc(APPROVER_ID)} · Editor: Nermin Sefić, director of GNK ASG d.o.o. and editor-in-chief of AKTUAL MEDIA`}</p>
<h1>${esc(title)}</h1>
<p class="ag-lead">${esc(description)}</p>
<p class="ag-disclosure">${esc(item.disclosure[lang])}</p>
${body}
<h2 class="ag-h2">${L.sources}</h2>
<ol>
${sourceList}
</ol>
<h2 class="ag-h2">${L.tags}</h2>
<ul class="ag-tags">${tags}</ul>
<nav class="ag-nav" aria-label="${L.related}">
<a href="${isHr ? '/agenti/pregledi/' : '/en/agents/reviews/'}">${L.list}</a>
<a href="${isHr ? `/kanal/${item.channel}/` : `/en/agents/reviews/`}">${esc(city)}</a>
<a href="${pathAlt}">${L.alt}</a>
</nav>
<p class="ag-src">${esc(relatedLinks)}</p>
${band}
</main>
${impressumBlock(lang)}
</body>
</html>
`;
}

export function renderIndex(items, lang) {
  const isHr = lang === 'hr';
  const ITEMS_DAY = items.map((i) => i.run_date).sort().pop() || new Date().toISOString().slice(0, 10);
  const canonical = isHr ? `${SITE}/agenti/pregledi/` : `${SITE}/en/agents/reviews/`;
  const title = isHr ? 'AI pregledi aktualnih tema — AKTUAL MEDIA' : 'AI reviews of current topics — AKTUAL MEDIA';
  const description = isHr
    ? 'Dnevni pregledi aktualnih tema koje pišu AI agenti iz javnih izvora, s poveznicama na izdavače. Objave odobrava AI kontrolni agent.'
    : 'Daily reviews of current topics written by AI agents from public sources, with links to publishers. Each post is approved by an AI control agent.';
  const cards = items.map((it) => {
    const t = it[lang];
    const href = isHr ? HR_PATH(it.id) : EN_PATH(it.id);
    return `<article class="ag-card"><h2><a href="${href}">${esc(t.title)}</a></h2><p>${esc(t.description)}</p></article>`;
  }).join('\n');
  const alt = isHr ? '/en/agents/reviews/' : '/agenti/pregledi/';
  return `<!doctype html>
<html lang="${isHr ? 'hr' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${isHr ? 'hr' : 'en'}" href="${canonical}">
<link rel="alternate" hreflang="${isHr ? 'en' : 'hr'}" href="${SITE}${alt}">
<link rel="alternate" hreflang="x-default" href="${SITE}/agenti/pregledi/">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="author" content="${esc(WRITER_ID)} (AI)">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/am-design-v1.css?v=20261024" data-am-design="v1">
<link rel="stylesheet" href="/assets/author-band-v1.css?v=20261025">
<link rel="stylesheet" href="${HOUSE_RIBBON_CSS}">
<script src="/assets/am-refresh-v1.js?v=${ITEMS_DAY}" data-am-netday="${ITEMS_DAY}" defer></script>
${CSS}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', '@id': `${canonical}#page`, name: title, description, url: canonical, inLanguage: isHr ? 'hr' : 'en', publisher: { '@id': `${SITE}/#gnk-asg` }, editor: { '@id': `${SITE}/#nermin-sefic` }, hasPart: items.map((it) => ({ '@type': 'Article', headline: it[lang].title, url: `${SITE}${isHr ? HR_PATH(it.id) : EN_PATH(it.id)}`, datePublished: it.run_date })) },
    { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'GNK ASG', inLanguage: ['hr', 'en'], publisher: { '@id': `${SITE}/#gnk-asg` } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: isHr ? 'Početna' : 'Home', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: title, item: canonical }] },
  ] })}</script>
</head>
<body>
${houseRibbonHtml(isHr ? 'hr' : 'en')}
<main class="ag-wrap">
<p class="ag-kicker">${isHr ? 'AI agenti · pregledi' : 'AI agents · reviews'}</p>
<h1>${isHr ? 'AI pregledi aktualnih tema' : 'AI reviews of current topics'}</h1>
<p class="ag-lead">${esc(description)}</p>
<p class="ag-byline">${isHr ? 'Tekstove pišu AI agenti, odobrava AI kontrola, urednik je Nermin Sefić.' : 'Texts are written by AI agents, approved by AI control, editor: Nermin Sefić.'}</p>
<p class="ag-disclosure">${isHr ? 'Tekstove priprema AI agent GNK ASG-a iz javnih izvora. Svaku objavu odobrava AI kontrolni agent AGENT-KONTROLA-001. Izvorni naslovi i sadržaj ostaju vlasništvo izdavača.' : 'Texts are prepared by a GNK ASG AI agent from public sources. Each post is approved by the AI control agent AGENT-KONTROLA-001. Original headlines and content remain the property of their publishers.'}</p>
${cards || `<p>${isHr ? 'Trenutno nema odobrenih pregleda.' : 'There are no approved reviews at the moment.'}</p>`}
<nav class="ag-nav">${isHr ? '<a href="/agenti/">← Agenti mreže</a>' : ''}<a href="${alt}">${isHr ? 'English' : 'Hrvatski'}</a></nav>
${authorBand(lang, undefined, { portrait: '/assets/people/nermin-sefic.webp' })}
</main>
${impressumBlock(lang)}
</body>
</html>
`;
}

function renderSitemap(items) {
  const rows = [];
  for (const it of items) {
    rows.push(`  <url><loc>${SITE}${HR_PATH(it.id)}</loc><lastmod>${it.run_date}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`);
    rows.push(`  <url><loc>${SITE}${EN_PATH(it.id)}</loc><lastmod>${it.run_date}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`);
  }
  rows.push(`  <url><loc>${SITE}/agenti/pregledi/</loc><changefreq>daily</changefreq><priority>0.7</priority></url>`);
  rows.push(`  <url><loc>${SITE}/en/agents/reviews/</loc><changefreq>daily</changefreq><priority>0.7</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

function write(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

export function publish({ queueDir = QUEUE_DIR, portal = PORTAL, check = CHECK } = {}) {
  const ks = killSwitchState();
  if (!ks.enabled) return { paused: true, reason: ks.reason, published: 0 };
  const approved = collectApproved(queueDir);
  const ok = [];
  const rejected = [];
  for (const item of approved) {
    const problems = reviewProblems(item);
    if (problems.length) rejected.push({ id: item.id, problems });
    else ok.push(item);
  }
  if (rejected.length) console.error(`Ne objavljujem (provjere): ${JSON.stringify(rejected)}`);
  if (check) return { paused: false, published: 0, wouldPublish: ok.length, rejected: rejected.length };
  ok.sort((a, b) => (a.id < b.id ? -1 : 1));
  if (existsSync(AUTHOR_PORTRAIT)) ensureAuthorPortrait(AUTHOR_PORTRAIT, portal);
  for (const item of ok) {
    write(join(portal, 'agenti', 'pregledi', item.id, 'index.html'), renderReview(item, 'hr'));
    write(join(portal, 'en', 'agents', 'reviews', item.id, 'index.html'), renderReview(item, 'en'));
  }
  write(join(portal, 'agenti', 'pregledi', 'index.html'), renderIndex(ok, 'hr'));
  write(join(portal, 'en', 'agents', 'reviews', 'index.html'), renderIndex(ok, 'en'));
  write(join(portal, 'agent-reviews-sitemap.xml'), renderSitemap(ok));
  // Glavni sitemap-index: dodaj unos ako ga nema.
  const idx = join(portal, 'sitemap-index.xml');
  if (existsSync(idx)) {
    const text = readFileSync(idx, 'utf8');
    if (!text.includes('agent-reviews-sitemap.xml')) {
      const today = new Date().toISOString().slice(0, 10);
      writeFileSync(idx, text.replace('</sitemapindex>', `<sitemap>\n    <loc>${SITE}/agent-reviews-sitemap.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n</sitemapindex>`));
    }
  }
  return { paused: false, published: ok.length, rejected: rejected.length, ids: ok.map((i) => i.id) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(publish(), null, 2));
}
