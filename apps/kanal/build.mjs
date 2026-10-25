#!/usr/bin/env node
/**
 * GNK ASG KANAL — generator statičkog kanala.
 *
 * Ulaz:  apps/kanal/src/{site.json, articles/*.json, pages/*.json, assets/*}
 * Izlaz: apps/kanal/site/  (spremno za GitHub Pages / Cloudflare Pages)
 *
 * Pokretanje:
 *   node apps/kanal/build.mjs
 *   node apps/kanal/build.mjs --base https://gnk-asg-kanal.pages.dev/
 */
import { designTokensCss } from '../shared/design-system-v1.mjs';
import { FAVICON_SVG } from '../shared/brand/brand-mark-v1.mjs';
import { NETWORK_PRODUCTS } from '../shared/network-products-v1.mjs';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entityGraphJson } from '../../scripts/lib/entity-graph-v1.mjs';
import { refreshTag, ensureRefreshModule } from '../shared/refresh-tag-v1.mjs';
import { authorBand, AUTHOR_BAND_CSS, ensureAuthorPortrait, AUTHOR_PORTRAIT } from '../shared/author-band-v1.mjs';
import { impressumBlock, IMPRESSUM_CSS } from '../shared/impressum-v1.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(HERE, 'src');
/* KANAL_OUT pušta test determinizma da gradi u privremenu mapu i usporedi
   bajtove dviju gradnji — ista ulaza moraju dati isti izlaz. */
const OUT = process.env.KANAL_OUT ? resolve(process.env.KANAL_OUT) : join(HERE, 'site');

/* Registar mreže drži jedini popis svih adresa; KANAL ga čita, ne prepisuje. */
const NETWORK = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'apps/portal/data/mreza-v1.json'), 'utf8'));
  } catch {
    return { editions: [], world: [], sites: [] };
  }
})();

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
/* Kanonska adresa KANALA je Cloudflare Pages. GitHub Pages je zrcalo za
   arhivu starih adresa i nikad nije kanonski host — dosad je bio zadana
   vrijednost, pa je lokalni build pisao `canonical` na tuđi host, a svaki
   prenos na mreži preuzimao je tu grešku kao "izvornik". */
const BASE = (arg('--base', process.env.KANAL_BASE || 'https://gnk-asg-kanal.pages.dev/')).replace(/\/+$/, '') + '/';
const SITE = JSON.parse(readFileSync(join(SRC, 'site.json'), 'utf8'));

/* POPIS PRIJENOSA: matica gradi /prenos/ i JSON s matricom kopija. Kanal
   čita isti zapis, pa svaki tekst na kanalu pokaže gdje još stoji — i time
   uzvrati vezom onome koji je na njega već stavio atribuciju. Ako zapisa
   nema (svjež checkout bez portala), blok se jednostavno ne ispisuje. */
const PRENOS = (() => {
  const file = join(HERE, '..', 'portal', 'data', 'prenos-network-v1.json');
  if (!existsSync(file)) return new Map();
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const map = new Map();
    for (const item of data.texts) {
      const path = new URL(item.canonical).pathname.replace(/^\//, '');
      map.set(path, {
        copies: item.copies.map((copy) => ({
          url: copy.url,
          lang: copy.lang,
          name: data.targets.find((target) => target.key === copy.key)?.name || copy.key
        }))
      });
    }
    return map;
  } catch {
    return new Map();
  }
})();

const PRENOS_MARK = 'data-prenos-crosslinks';
function prenosBlock(canonical, root) {
  const entry = PRENOS.get(String(canonical || '').replace(/^\//, ''));
  if (!entry || !entry.copies.length) return '';
  const links = entry.copies
    .map((copy) => `<a href="${esc(copy.url)}" rel="external noopener" hreflang="${esc(copy.lang)}" lang="${esc(copy.lang)}">${esc(copy.name)}</a>`)
    .join(' · ');
  return `<aside class="article-meta am-prenos" ${PRENOS_MARK}="v1">
<p><b>Ovaj tekst objavljen je i na:</b> ${links} — <a href="https://gnk-asg.hr/prenos/">svi prijenosi</a></p>
</aside>`;
}

/* Vrijeme gradnje ne ulazi u izlaz. Umjesto sata uzima se datum najnovije
   objave — isti podaci moraju dati iste bajtove pri svakoj gradnji. */
const ENV = { base: BASE, get generated() { return LATEST; } };

/* ---------- pomoćnici ---------- */
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p = '') => BASE + String(p).replace(/^\/+/, '');
/* Kanonski entiteti žive na glavnoj domeni, ne na zrcalnoj domeni kanala. */
const ORG_ID = 'https://gnk-asg.hr/#gnk-asg';
const WEBSITE_ID = 'https://gnk-asg.hr/#website';
const rootFor = (p = '') => {
  const clean = String(p).replace(/^\/+|\/+$/g, '');
  const depth = clean === '' ? 0 : clean.split('/').length;
  return '../'.repeat(depth);
};
const jsonld = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
const stripTags = (html = '') =>
  html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
const words = (html = '') => stripTags(html).split(/\s+/).filter(Boolean).length;
const readingTime = (html) => Math.max(1, Math.round(words(html) / 220));
const hrDate = (iso) => {
  const d = new Date(`${iso}T09:00:00+02:00`);
  return new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
};
const isoDate = (s) => new Date(`${s}T09:00:00+02:00`).toISOString();
const slugify = (s) =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

/* ---------- učitavanje sadržaja ---------- */
const readAll = (dir) =>
  readdirSync(join(SRC, dir)).filter((f) => f.endsWith('.json')).map((f) => {
    const data = JSON.parse(readFileSync(join(SRC, dir, f), 'utf8'));
    return { ...data, _file: f };
  });

const ARTICLES = readAll('articles')
  .map((a) => ({ ...a, readingTime: readingTime(a.body), words: words(a.body) }))
  .sort((a, b) => (a.date === b.date ? (b.priority || 0) - (a.priority || 0) : b.date.localeCompare(a.date)));

/* Najnoviji datum u podacima — jedini dopušteni izvor vremena u izlazu. */
const LATEST = ARTICLES.map((a) => a.updated || a.date).filter(Boolean).sort().pop() || '2026-01-01T00:00:00.000Z';
const PAGES = readAll('pages');
const SECTIONS = SITE.sections;

/* ---------- komentari (broj po članku) ---------- */
const commentCounts = {};
for (const a of [...ARTICLES, ...PAGES]) {
  const p = join(SRC, 'data', 'comments', `${a.slug}.json`);
  commentCounts[a.slug] = existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')).comments || []).length : 0;
}

/* ---------- oznake / SEO ---------- */
const org = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'GNK ASG d.o.o.',
  legalName: SITE.publisher.legalName,
  url: SITE.publisher.url,
  logo: { '@type': 'ImageObject', url: abs('assets/logo-gnk-asg-gold.svg'), width: 512, height: 512 },
  address: { '@type': 'PostalAddress', addressLocality: 'Zagreb', addressCountry: 'HR' },
  sameAs: ['https://gnk-asg.hr/', 'https://gnk-asg.hr/gnk-aktual/', SITE.author.linkedin]
};
const person = {
  '@type': 'Person',
  '@id': abs('#nermin-sefic'),
  name: SITE.author.name,
  alternateName: [SITE.author.nameAscii, 'Sefic Nermin', 'Sefić Nermin'],
  jobTitle: SITE.author.role,
  url: SITE.author.url,
  image: abs('assets/nermin-sefic-portrait.webp'),
  worksFor: { '@id': ORG_ID },
  sameAs: [SITE.author.url, SITE.author.linkedin, SITE.publisher.url, 'https://gnk-asg.hr/gnk-aktual/'],
  knowsAbout: ['financije', 'revizija', 'korporativno upravljanje', 'umjetna inteligencija', 'izvoz softvera', 'tržišna analiza']
};
const workerAuthor = { '@type': 'Organization', '@id': abs('#worker'), name: 'Worker', description: 'AI urednički sustav AKTUAL MEDIA KANAL', parentOrganization: { '@id': ORG_ID } };
const website = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: 'https://gnk-asg.hr/',
  name: 'GNK ASG',
  alternateName: [SITE.brand, SITE.brandFull],
  description: SITE.description,
  inLanguage: ['hr', 'en'],
  publisher: { '@id': ORG_ID }
};

/* ---------- HTML layout ---------- */
function head({ title, description, canonical, root, og, ogAlt, type = 'website', published, modified, section, tags = [], faq, graphExtra = [], noindex = false, authorName = 'Nermin Sefić', authorId = abs('#nermin-sefic') }) {
  const pageUrl = canonical === '' ? BASE : abs(canonical);
  const image = og ? abs(og) : abs('assets/og/naslovnica.png');
  const articleTags = tags.map((t) => `\n<meta property="article:tag" content="${esc(t)}">`).join('');
  const graph = [
    org,
    person,
    workerAuthor,
    website,
    {
      '@type': type === 'article' || type === 'news' ? 'NewsArticle' : 'WebPage',
      '@id': pageUrl + '#clanak',
      isPartOf: { '@id': WEBSITE_ID },
      mainEntityOfPage: pageUrl,
      headline: title,
      name: title,
      description,
      url: pageUrl,
      inLanguage: 'hr-HR',
      image: [{ '@type': 'ImageObject', url: image, width: 1200, height: 630 }],
      author: { '@id': authorId },
      editor: { '@id': authorId },
      publisher: { '@id': ORG_ID },
      ...(published ? { datePublished: isoDate(published), dateModified: isoDate(modified || published) } : {}),
      ...(section ? { articleSection: section } : {}),
      ...(tags.length ? { keywords: tags.join(', ') } : {}),
      ...(type === 'article' || type === 'news' ? { isAccessibleForFree: true, speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.dek'] } } : {}),
      ...(faq && faq.length ? { mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : {})
    },
    ...graphExtra
  ];
  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(authorName)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}">
<meta name="theme-color" content="#101114">
<link rel="canonical" href="${esc(pageUrl)}">
<link rel="alternate" hreflang="hr" href="${esc(pageUrl)}">
<link rel="alternate" hreflang="x-default" href="${esc(pageUrl)}">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.brandFull)} — RSS" href="${abs('feed.xml')}">
<link rel="alternate" type="application/atom+xml" title="${esc(SITE.brandFull)} — Atom" href="${abs('atom.xml')}">
<link rel="alternate" type="application/feed+json" title="${esc(SITE.brandFull)} — JSON Feed" href="${abs('feed.json')}">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${root}assets/logo-gnk-asg-gold.svg">
<link rel="manifest" href="${root}manifest.webmanifest">
<link rel="stylesheet" href="${root}assets/kanal.css">
<!-- entity:v1 -->
<script type="application/ld+json" id="network-entity-v1">${entityGraphJson()}</script>
<!-- /entity:v1 -->
<meta name="editor" content="Nermin Sefić">
<link rel="author" href="https://gnk-asg.hr/nermin-sefic/">
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<meta property="article:tag" content="#NerminSefić">
<meta property="og:site_name" content="${esc(SITE.brandFull)}">
<meta property="og:locale" content="hr_HR">
<meta property="og:type" content="${type === 'news' ? 'article' : type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogAlt || title)}">${published ? `\n<meta property="article:published_time" content="${isoDate(published)}">\n<meta property="article:modified_time" content="${isoDate(modified || published)}">\n<meta property="article:author" content="${esc(authorName)}">` : ''}${section ? `\n<meta property="article:section" content="${esc(section)}">` : ''}${articleTags}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(ogAlt || title)}">
<meta name="twitter:label1" content="Autor">
<meta name="twitter:data1" content="${esc(authorName)}">
${published ? `<meta name="twitter:label2" content="Objavljeno">\n<meta name="twitter:data2" content="${hrDate(published)}">` : ''}
<meta name="format-detection" content="telephone=no">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<link rel="dns-prefetch" href="//gnk-asg.hr">
<script type="application/ld+json">${jsonld({ '@context': 'https://schema.org', '@graph': graph })}</script>
${designTokensCss()}
</head>`;
}

function header({ active = '', root }) {
  const nav = SITE.nav.map((n) => {
    const href = root + n.href;
    const cur = n.href === active ? ' aria-current="page"' : '';
    return `<li><a href="${href}"${cur}>${esc(n.label)}</a></li>`;
  }).join('');
  return `<a class="skip" href="#sadrzaj">Preskoči na sadržaj</a>
<div id="progress" aria-hidden="true"></div>
<header class="masthead">
  <div class="wrap mast-top">
    <a class="brand" href="${root}" aria-label="${esc(SITE.brandFull)} — naslovnica">
      <img src="${root}assets/logo-gnk-asg-gold.svg" alt="GNK ASG" width="42" height="42">
      <span class="brand-word"><b>${esc(SITE.brand)}</b><span>GNK ASG · Zagreb</span></span>
    </a>
    <div class="mast-tools">
      <span class="mast-date">${new Intl.DateTimeFormat('hr-HR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(LATEST))}</span>
      <button class="icon-btn" type="button" data-theme-toggle aria-label="Promijeni temu">☾</button>
    </div>
  </div>
  <nav class="nav" aria-label="Glavna navigacija"><div class="wrap"><ul>${nav}</ul></div></nav>
</header>`;
}

function disclosure(root = '', desk = false) {
  const pending = desk || SITE.editorial.status !== 'approved';
  const label = desk ? 'Automatski sastavljeno · Dnevni desk' : SITE.editorial.statusLabel;
  return `<div class="status-strip"><div class="wrap">
  <a class="badge ${pending ? 'badge--pending' : ''}" href="${root}${desk ? 'dnevnik/' : 'metodologija/'}"><span class="dot"></span>${esc(label)}</a>
  <span>Izvori su navedeni uz svaki tekst · ispravci se objavljuju javno</span>
</div></div>`;
}

function ticker(items, root) {
  if (!items.length) return '';
  const one = items.map((a) => `<a href="${root}${a.slug}/">${esc(a.title)}</a>`).join('');
  return `<div class="ticker" aria-label="Najnovije"><div class="wrap"><span class="ticker-label">Najnovije</span><div class="ticker-track">${one}${one}</div></div></div>`;
}

/* Mreža iz jednog registra: svih 17 izdanja, 9 svjetskih portala, 6 webova i
   proizvodi koji nisu izdanja. Do 24. 10. 2026. KANAL nije vodio ni na jedno
   izdanje — čitatelj koji je došao na dnevni pregled nije imao kamo dalje, a
   izdanja nisu vodila na KANAL. */
function networkList() {
  const items = [];
  const seen = new Set();
  for (const webs of Object.values(NETWORK)) {
    if (!Array.isArray(webs)) continue;
    for (const web of webs) {
      if (!web || !web.url || seen.has(web.url)) continue;
      seen.add(web.url);
      items.push(`<li><a href="${esc(web.url)}" rel="external noopener">${esc(web.name || web.id)}</a></li>`);
    }
  }
  for (const product of NETWORK_PRODUCTS) {
    if (seen.has(product.url)) continue;
    seen.add(product.url);
    items.push(`<li><a href="${esc(product.url)}" rel="external noopener">${esc(product.hr)}</a></li>`);
  }
  return items.join('\n      ');
}

function footer(root) {
  const year = new Date(LATEST).getUTCFullYear();
  return `<footer>
  <div class="wrap foot-grid">
    <div class="foot-brand">
      <img src="${root}assets/aktual-media-mark.svg" alt="AKTUAL MEDIA" width="34" height="34" loading="lazy" decoding="async">
      <b>${esc(SITE.brand)}</b><span>GNK ASG KANAL · AKTUAL MEDIA d.o.o.</span>
      <p>${esc(SITE.tagline)}</p>
      <p class="fine-print">Glavni urednik: Nermin Sefić · ${esc(SITE.publisher.address)}</p>
    </div>
    <div><h3>Rubrike</h3><ul>
      ${Object.entries(SECTIONS).map(([k, s]) => `<li><a href="${root}tema/${k}/">${esc(s.label)}</a></li>`).join('')}
    </ul></div>
    <div><h3>Kanal</h3><ul>
      <li><a href="${root}o-kanalu/">O kanalu</a></li>
      <li><a href="${root}nermin-sefic/">Nermin Sefić</a></li>
      <li><a href="${root}pojasnjenja/">Pojašnjenja</a></li>
      <li><a href="${root}metodologija/">Metodologija i ispravci</a></li>
      <li><a href="${root}objave/">Sve objave</a></li>
    </ul></div>
    <div><h3>Mreža AKTUAL MEDIA</h3><ul>
      ${networkList()}
    </ul></div>
    <div><h3>Vanjski linkovi</h3><ul>
      ${(SITE.partners || []).map((p) => `<li><a href="${esc(p.url)}" rel="external noopener">${esc(p.name)}</a> <span class="fine-print">— ${esc(p.role)}</span></li>`).join('')}
    </ul></div>
    <div><h3>Kontakt i pravila</h3><ul>
      <li><a href="${root}kontakt/">Kontakt za medije</a></li>
      <li><a href="${root}komentari/">Pravila komentiranja</a></li>
      <li><a href="${root}privatnost/">Privatnost</a></li>
      <li><a href="${root}feed.xml">RSS</a></li>
      <li><a href="${root}feed.json">JSON feed (AKTUAL)</a></li>
    </ul></div>
  </div>
  <div class="wrap foot-bottom">
    <p>© ${year} GNK ASG d.o.o. Materijali na ovom kanalu mogu se preuzimati uz obveznu atribuciju: „Izvor: GNK ASG KANAL".</p>
    <p>${esc(SITE.aiDisclosure)}</p>
  </div>
</footer>
<script src="${root}assets/kanal.js" defer></script>`;
}

function page({ title, description, canonical, content, active = '', type = 'website', og, ogAlt, published, modified, section, tags, faq, graphExtra, noindex, bodyAttrs = '', rootOverride, authorName, authorId, desk = false }) {
  const root = rootOverride !== undefined ? rootOverride : rootFor(canonical);
  return `${head({ title, description, canonical, root, og, ogAlt, type, published, modified, section, tags, faq, graphExtra, noindex, authorName, authorId })}
<body ${bodyAttrs}>
${header({ active, root })}
${disclosure(root, desk)}
<main id="sadrzaj">
${content}
${prenosBlock(canonical, root)}
</main>
${footer(root)}
${authorBand('hr', null, { portrait: '/assets/nermin-sefic-portrait.webp' })}
${impressumBlock('hr')}
${refreshTag('/')}
</body>
</html>`;
}

/* ---------- dijelovi ---------- */
const isDesk = (a) => a.kind === 'desk';
const authorOf = (a) => a.author === 'Worker' ? { name: 'Worker', url: abs('dnevnik/'), id: abs('#worker') } : isDesk(a)
  ? { name: 'GNK ASG KANAL · Dnevni desk', url: abs('dnevnik/'), id: ORG_ID }
  : { name: 'Nermin Sefić', url: SITE.author.url, id: abs('#nermin-sefic') };
const statusOf = (a) => a.author === 'Worker' ? { label: 'Worker · AI autor', full: 'Autor: Worker · AI pripremljen informativni tekst, s navedenim javnim izvorima' } : isDesk(a)
  ? { label: 'Automatski sastavljeno', full: 'Automatski sastavljeno iz strukturiranih podataka · nije pojedinačno urednički pregledano' }
  : { label: SITE.editorial.statusLabel, full: SITE.editorial.statusLabel };

const kicker = (section, root, kind) => {
  if (kind === 'desk') return `<a class="kicker" href="${root}dnevnik/">Dnevni desk</a>`;
  const s = SECTIONS[section];
  return s ? `<a class="kicker" href="${root}tema/${section}/">${esc(s.label)}</a>` : '';
};

function articleCard(a, root, opts = {}) {
  const img = a.og || a.image;
  return `<article class="card" data-card="${esc([a.title, a.dek, SECTIONS[a.section]?.label, ...(a.tags || [])].join(' '))}">
  <a class="card-media" href="${root}${a.slug}/" tabindex="-1" aria-hidden="true"><img src="${root}${img}" alt="${esc(a.title)}" width="1200" height="630" loading="lazy" decoding="async"></a>
  <div class="card-body">
    ${kicker(a.section, root, a.kind)}
    <h3><a href="${root}${a.slug}/">${esc(a.title)}</a></h3>
    <p>${esc(a.dek)}</p>
    <div class="card-foot"><span>${hrDate(a.date)}</span><span>${a.readingTime} min</span></div>
  </div>
</article>`;
}

function articleListRow(a, root) {
  const img = a.og || a.image;
  return `<article data-card="${esc([a.title, a.dek, SECTIONS[a.section]?.label, ...(a.tags || [])].join(' '))}">
  <a href="${root}${a.slug}/" tabindex="-1" aria-hidden="true"><img src="${root}${img}" alt="${esc(a.title)}" width="1200" height="630" loading="lazy"></a>
  <div>
    ${kicker(a.section, root, a.kind)}
    <h2><a href="${root}${a.slug}/">${esc(a.title)}</a></h2>
    <p>${esc(a.dek)}</p>
    <div class="byline"><b>${esc(authorOf(a).name)}</b><span class="sep">·</span><time datetime="${a.date}">${hrDate(a.date)}</time><span class="sep">·</span><span>${a.readingTime} min čitanja</span><span class="sep">·</span><span>${commentCounts[a.slug] || 0} komentara</span></div>
  </div>
</article>`;
}

/* ---------- TOC ---------- */
function withHeadingIds(html) {
  const toc = [];
  const out = html.replace(/<h2(?![^>]*id=)([^>]*)>([\s\S]*?)<\/h2>/g, (m, attrs, inner) => {
    const text = stripTags(inner);
    const id = slugify(text);
    toc.push({ id, text });
    return `<h2${attrs} id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

/* ---------- konstrukcija članka ---------- */
function buildArticle(a) {
  const root = rootFor(`${a.slug}/`);
  const sectionLabel = SECTIONS[a.section]?.label || '';
  const path = `${a.slug}/`;
  const { html: bodyHtml, toc } = withHeadingIds(a.body);
  const shareUrl = abs(path);
  const shareText = encodeURIComponent(`${a.title} — ${SITE.brandFull}`);
  const xShare = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`;
  const liShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const mailShare = `mailto:?subject=${encodeURIComponent(a.title)}&body=${encodeURIComponent(`${a.dek}\n\n${shareUrl}`)}`;

  const latest = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 5);
  const related = ARTICLES.filter((x) => x.slug !== a.slug && x.section === a.section).slice(0, 3);
  const relatedFallback = related.length ? related : ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3);
  const idx = ARTICLES.findIndex((x) => x.slug === a.slug);
  const newer = idx > 0 ? ARTICLES[idx - 1] : null;
  const older = idx < ARTICLES.length - 1 ? ARTICLES[idx + 1] : null;

  const keyfacts = (a.keyFacts || []).length
    ? `<aside class="keyfacts"><h2>Ključne činjenice</h2><ul>${a.keyFacts.map((k) => `<li>${k}</li>`).join('')}</ul></aside>`
    : '';
  const editorNote = a.editorNote
    ? `<div class="editor-note"><h2>Komentar urednika</h2>${a.editorNote.map((p) => `<p>${p}</p>`).join('')}<p class="sig">— Nermin Sefić, glavni urednik</p></div>`
    : '';
  const sources = (a.sources || []).length
    ? `<section class="sources"><h2>Izvori i provjera</h2><ol>${a.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>${s.note ? ` — ${esc(s.note)}` : ''}` : esc(s.label)}</li>`).join('')}</ol></section>`
    : '';
  const faq = (a.faq || []).length
    ? `<section class="faq"><h2>Česta pitanja</h2>${a.faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="answer"><p>${esc(f.a)}</p></div></details>`).join('')}</section>`
    : '';
  const xdraft = (a.x || []).length
    ? `<section class="xdraft"><h2>Predložak za X / Twitter</h2>${a.x.map((t) => `<div class="xdraft-row"><p>${esc(t)}</p><button type="button" data-copy="${esc(t)}" class="btn btn--sm btn--ghost">Kopiraj</button></div>`).join('')}<p class="fine">Objava je pripremljena za ručno objavljivanje na računu. Dodajte poveznicu: <a href="${esc(shareUrl)}">${esc(shareUrl)}</a></p></section>`
    : '';
  const tags = (a.tags || []).length
    ? `<div class="tags">${a.tags.map((t) => `<a href="${root}objave/?tema=${encodeURIComponent(slugify(t))}" rel="tag">#${esc(t)}</a>`).join('')}</div>`
    : '';
  const tocHtml = toc.length
    ? `<nav class="side-card" aria-label="Sadržaj teksta"><h2>U ovom tekstu</h2><ol>${toc.map((t) => `<li><h3><a href="#${t.id}">${esc(t.text)}</a></h3></li>`).join('')}</ol></nav>`
    : '';

  const content = `<article itemscope itemtype="https://schema.org/NewsArticle">
  <div class="wrap">
    <header class="article-head">
      <nav class="crumbs" aria-label="Putanja"><a href="${root}">Naslovnica</a><span>/</span><a href="${root}tema/${a.section}/">${esc(sectionLabel)}</a><span>/</span><span aria-current="page">${esc(a.shortTitle || a.title).slice(0, 60)}</span></nav>
      ${kicker(a.section, root, a.kind)}
      <h1 itemprop="headline">${esc(a.title)}</h1>
      <p class="dek" itemprop="description">${esc(a.dek)}</p>
      <div class="article-meta">
        ${a.author === 'Worker' ? `<div class="author-chip author-chip--desk"><span class="chip-mark" aria-hidden="true">W</span><span><b>Worker</b><span>AI autor · javni izvori</span></span></div>` : isDesk(a)
          ? `<a class="author-chip author-chip--desk" href="${root}dnevnik/">
          <span class="chip-mark" aria-hidden="true">K</span>
          <span><b>GNK ASG KANAL</b><span>Dnevni desk · automatski sastavljeno</span></span>
        </a>`
          : `<a class="author-chip" href="${root}nermin-sefic/">
          <img src="${root}assets/nermin-sefic-portrait.webp" alt="Nermin Sefić" width="40" height="40">
          <span><b>Nermin Sefić</b><span>Glavni urednik · GNK ASG</span></span>
        </a>`}
        <div class="byline">
          <time datetime="${isoDate(a.date)}">${hrDate(a.date)}</time>
          <span class="sep">·</span><span class="reading">${a.readingTime} min čitanja</span>
          <span class="sep">·</span><span>${a.words.toLocaleString('hr-HR')} riječi</span>
        </div>
        <div class="share" aria-label="Podijeli">
          <a href="${xShare}" rel="noopener nofollow" target="_blank" aria-label="Podijeli na X" title="Podijeli na X">X</a>
          <a href="${liShare}" rel="noopener nofollow" target="_blank" aria-label="Podijeli na LinkedIn" title="Podijeli na LinkedIn">in</a>
          <a href="${fbShare}" rel="noopener nofollow" target="_blank" aria-label="Podijeli na Facebook" title="Podijeli na Facebook">f</a>
          <a href="${mailShare}" aria-label="Pošalji e-poštom" title="Pošalji e-poštom">@</a>
          <button type="button" data-copy="${esc(shareUrl)}" aria-label="Kopiraj poveznicu" title="Kopiraj poveznicu">⧉</button>
        </div>
      </div>
    </header>
    <figure class="hero-figure">
      <img src="${root}${a.og || a.image}" alt="${esc(a.imageAlt || a.title)}" width="1200" height="630" fetchpriority="high" decoding="async">
      <figcaption>${esc(a.imageCaption || `Ilustracija: ${SITE.brandFull}`)}</figcaption>
    </figure>
    <div class="layout">
      <div>
        <div class="article-body" itemprop="articleBody">
          ${keyfacts}
          ${bodyHtml}
          ${editorNote}
          ${xdraft}
          ${sources}
          ${tags}
          ${faq}
        </div>
        ${a.author === 'Worker' ? `<div class="authorbox authorbox--desk"><div><h2>Worker</h2><div class="role">AI autor · GNK ASG KANAL</div><p>Tekst pripremljen automatiziranim sustavom iz navedenih javno dostupnih izvora. Ispravke i dopune moguće je dostaviti uredništvu.</p></div></div>` : isDesk(a)
          ? `<div class="authorbox authorbox--desk">
          <div>
            <h2>Dnevni desk</h2>
            <div class="role">GNK ASG KANAL · automatski sastavljeno</div>
            <p>Ovaj tekst sastavljen je iz strukturiranih podataka i objavljenih izvora. Nije pojedinačno urednički pregledan i ne prenosi odgovornost glavnog urednika na izvor podataka. Ispravci se objavljuju javno.</p>
            <a href="${root}dnevnik/">Sve objave Dnevnog deska →</a>
          </div>
        </div>`
          : `<div class="authorbox">
          <img src="${root}assets/nermin-sefic-portrait.webp" alt="Nermin Sefić" width="88" height="88" loading="lazy">
          <div>
            <h2>Nermin Sefić</h2>
            <div class="role">Direktor GNK ASG d.o.o. · glavni urednik</div>
            <p>Autor je knjiga „Osnove revizije" (2003.) i „Financije za poduzetnike i menadžere nefinancijaše" (2003.) te priručnika „Poduzetnik" (2006.). Piše o financijama, izvozu softvera, korporativnom upravljanju i primjeni umjetne inteligencije u poslovanju.</p>
            <a href="${root}nermin-sefic/">Javni profil i svi tekstovi →</a>
          </div>
        </div>`}
        <section class="comments" id="komentari" aria-labelledby="komentari-naslov">
          <div class="comments-head"><h2 id="komentari-naslov">Komentari</h2><span class="count" id="comment-count">${commentCounts[a.slug] || 0} komentara</span></div>
          <ul class="comment-list" id="comment-list"><li class="comment-empty">Još nema objavljenih komentara. Prvi komentar postaje dio javne rasprave — potpišite se imenom ili inicijalom.</li></ul>
          <form class="comment-form" data-comment-form novalidate>
            <h3>Pošalji komentar</h3>
            <p>Komentari se objavljuju nakon uredničke provjere. Bez uvreda, bez osobnih podataka trećih osoba i bez tvrdnji koje se ne mogu provjeriti. Potpis je obavezan.</p>
            <label for="c-name">Ime ili inicijal</label>
            <input id="c-name" name="name" type="text" maxlength="60" autocomplete="name" required>
            <label for="c-text">Komentar</label>
            <textarea id="c-text" name="text" maxlength="1200" required></textarea>
            <button class="btn btn--sm" type="submit">Pošalji na uredništvo</button>
            <p class="fine">Obrazac otvara vaš e-mail program i šalje komentar na ${esc(SITE.contact.email)}. Ne pohranjujemo podatke na poslužitelju.</p>
          </form>
        </section>
        <aside class="backlink" aria-label="Gdje se objava preuzima">
          <div>
            <span class="backlink-label">Vanjski linkovi</span>
            <p>Ovaj tekst je dio kanala koji preuzima <a href="https://gnk-asg.hr/gnk-aktual/" rel="external noopener">AKTUAL MEDIA</a>. Izvorni korporativni kontekst dostupan je na <a href="https://gnk-asg.hr/" rel="external noopener">gnk-asg.hr</a>, a profil autora na <a href="https://gnk-asg.hr/nermin-sefic/" rel="external noopener">gnk-asg.hr/nermin-sefic</a>.</p>
          </div>
          <div class="backlink-links">
            <a class="btn btn--sm btn--ghost" href="https://gnk-asg.hr/gnk-aktual/" rel="external noopener">AKTUAL MEDIA →</a>
            <a class="btn btn--sm btn--ghost" href="${esc(abs( 'feed.json' ))}" rel="alternate">Feed za preuzimanje</a>
          </div>
        </aside>
        <nav class="pager" aria-label="Prethodni i sljedeći tekst">
          ${older ? `<a href="${root}${older.slug}/"><small>← Starije</small><b>${esc(older.title)}</b></a>` : '<span></span>'}
          ${newer ? `<a href="${root}${newer.slug}/"><small>Novije →</small><b>${esc(newer.title)}</b></a>` : '<span></span>'}
        </nav>
      </div>
      <aside class="sidebar">
        ${tocHtml}
        <div class="side-card"><h2>Najnovije</h2><ol>${latest.map((l) => `<li><div><h3><a href="${root}${l.slug}/">${esc(l.title)}</a></h3><time datetime="${l.date}">${hrDate(l.date)}</time></div></li>`).join('')}</ol></div>
        <div class="factbox">
          <dl>
            <dt>Izdavač</dt><dd>${esc(SITE.publisher.name)}</dd>
            ${isDesk(a)
              ? `<dt>Priprema</dt><dd>GNK ASG KANAL · Dnevni desk</dd>`
              : `<dt>Glavni urednik</dt><dd>Nermin Sefić</dd>`}
            <dt>Status provjere</dt><dd>${esc(statusOf(a).full)}</dd>
            <dt>Ispravci</dt><dd><a href="${root}metodologija/">Pravila i kontakt</a></dd>
          </dl>
        </div>
        <div class="side-card"><h2>Preuzimanje</h2><p>Redakcije mogu preuzeti tekst uz atribuciju „Izvor: GNK ASG KANAL". Za intervju ili podatke pišite na <a href="mailto:${esc(SITE.contact.pressEmail)}">${esc(SITE.contact.pressEmail)}</a>.</p></div>
      </aside>
    </div>
  </div>
</article>
<section class="related"><div class="wrap"><h2>Povezano</h2><div class="grid grid--3">${relatedFallback.map((r) => articleCard(r, root)).join('')}</div></div></section>`;

  const graphExtra = [];
  if (a.faq && a.faq.length) {
    graphExtra.push({
      '@type': 'FAQPage',
      '@id': abs(`${path}#faq`),
      mainEntity: a.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });
  }
  graphExtra.push({
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Naslovnica', item: BASE },
      { '@type': 'ListItem', position: 2, name: sectionLabel, item: abs(`tema/${a.section}/`) },
      { '@type': 'ListItem', position: 3, name: a.title, item: abs(path) }
    ]
  });

  return page({
    title: a.seoTitle || `${a.title} | ${SITE.brand}`,
    description: a.description || a.dek,
    canonical: path,
    content,
    active: '',
    type: 'news',
    og: a.og || a.image,
    ogAlt: a.imageAlt || a.title,
    published: a.date,
    modified: a.updated || a.date,
    section: sectionLabel,
    tags: a.tags || [],
    faq: a.faq,
    graphExtra,
    noindex: isDesk(a),
    desk: isDesk(a),
    authorName: authorOf(a).name,
    authorId: authorOf(a).id,
    bodyAttrs: `data-slug="${a.slug}" data-root="${root}" data-title="${esc(a.title)}"`
  });
}

/* ---------- statične stranice ---------- */
function buildPage(p) {
  const root = rootFor(p.slug + '/');
  let body = p.body;
  if (p.collection === 'pojasnjenja') {
    const items = ARTICLES.filter((a) => a.section === 'pojasnjenje' || a.kind === 'pojasnjenje');
    body = body.replace('{{LIST}}', items.map((a) => articleCard(a, root)).join(''));
  }
  if (p.collection === 'objave') {
    body = body.replace('{{LIST}}', `<div class="list">${ARTICLES.map((a) => articleListRow(a, root)).join('')}</div>`);
  }
  if (body.includes('{{AUTOR_LIST}}')) {
    body = body.replace('{{AUTOR_LIST}}', `<div class="grid grid--3 mt-sm">${ARTICLES.map((a) => articleCard(a, root)).join('')}</div>`);
  }
  const { html } = withHeadingIds(body);
  const faq = p.faq || [];
  return page({
    title: p.seoTitle || `${p.title} | ${SITE.brand}`,
    description: p.description || p.dek,
    canonical: `${p.slug}/`,
    content: `<div class="wrap">
      <header class="page-head">
        <nav class="crumbs" aria-label="Putanja"><a href="${root}">Naslovnica</a><span>/</span><span aria-current="page">${esc(p.title)}</span></nav>
        <h1>${esc(p.title)}</h1>
        <p class="dek">${esc(p.dek)}</p>
      </header>
      <div class="page-body">${html}</div>
    </div>`,
    active: p.navActive || '',
    og: p.og || 'assets/og/naslovnica.png',
    ogAlt: p.title,
    modified: p.updated,
    faq,
    graphExtra: faq.length ? [{
      '@type': 'FAQPage',
      '@id': abs(`${p.slug}/#faq`),
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    }, {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Naslovnica', item: BASE },
        { '@type': 'ListItem', position: 2, name: p.title, item: abs(`${p.slug}/`) }
      ]
    }] : [{
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Naslovnica', item: BASE },
        { '@type': 'ListItem', position: 2, name: p.title, item: abs(`${p.slug}/`) }
      ]
    }],
    bodyAttrs: `data-slug="${p.slug}" data-root="${root}"`
  });
}

/* ---------- naslovnica ---------- */
function buildHome() {
  const root = '';
  const lead = ARTICLES[0];
  const latest = ARTICLES.slice(1, 6);
  const analysis = ARTICLES.filter((a) => a.section === 'analiza').slice(0, 3);
  const regulation = ARTICLES.filter((a) => ['regulacija', 'gospodarstvo'].includes(a.section)).slice(0, 3);
  const explanation = ARTICLES.find((a) => a.section === 'pojasnjenje' && a.kind !== 'desk')
    || ARTICLES.find((a) => a.kind !== 'desk')
    || ARTICLES[1];
  const comments = ARTICLES.filter((a) => a.section === 'komentar').slice(0, 2);

  const content = `<div class="wrap">
  <section class="home-hero">
    <article class="lead">
      <a class="lead-media" href="${lead.slug}/"><img src="${lead.og || lead.image}" alt="${esc(lead.imageAlt || lead.title)}" width="1200" height="630" fetchpriority="high" decoding="async"></a>
      <div class="lead-body">
        ${kicker(lead.section, root)}
        <h1><a href="${lead.slug}/">${esc(lead.title)}</a></h1>
        <p class="dek">${esc(lead.dek)}</p>
        <div class="byline"><b>Nermin Sefić</b><span class="sep">·</span><time datetime="${lead.date}">${hrDate(lead.date)}</time><span class="sep">·</span><span>${lead.readingTime} min čitanja</span></div>
      </div>
    </article>
    <aside class="latest">
      <div class="latest-head"><h2>Najnovije objave</h2><a href="objave/">Sve →</a></div>
      <ol>${latest.map((a) => `<li><div><h3><a href="${a.slug}/">${esc(a.title)}</a></h3><div class="meta">${esc(SECTIONS[a.section]?.label || '')} · ${hrDate(a.date)}</div></div></li>`).join('')}</ol>
    </aside>
  </section>

  <div class="stats">
    <div class="stat"><b>10</b><span>objava u prvom izdanju</span></div>
    <div class="stat"><b>6</b><span>rubrika i format pojašnjenja</span></div>
    <div class="stat"><b>0</b><span>trackera i kolačića</span></div>
    <div class="stat"><b>100%</b><span>tekstova s navedenim izvorima</span></div>
  </div>

  <section class="band">
    <div class="band-head"><div><h2>Analize</h2><p>Brojke, bilance i poslovni modeli — bez uljepšavanja.</p></div><a href="tema/analiza/">Sve analize</a></div>
    <div class="grid grid--3">${analysis.map((a) => articleCard(a, root)).join('')}</div>
  </section>

  <section class="band">
    <div class="feature">
      <img src="${explanation.og || explanation.image}" alt="${esc(explanation.imageAlt || explanation.title)}" width="1200" height="630" loading="lazy">
      <div class="feature-body">
        ${kicker(explanation.section, root, explanation.kind)}
        <h2><a href="${explanation.slug}/">${esc(explanation.title)}</a></h2>
        <p>${esc(explanation.dek)}</p>
        <div class="byline"><b>${esc(authorOf(explanation).name)}</b><span class="sep">·</span><time datetime="${explanation.date}">${hrDate(explanation.date)}</time></div>
      </div>
    </div>
  </section>

  <section class="band">
    <div class="band-head"><div><h2>Regulacija i gospodarstvo</h2><p>Što pravila i brojke znače za tvrtke koje posluju preko granice.</p></div><a href="tema/regulacija/">Više</a></div>
    <div class="grid grid--3">${regulation.map((a) => articleCard(a, root)).join('')}</div>
  </section>

  <section class="band">
    <div class="channel">
      <div>
        <h2>Kanal koji AKTUAL MEDIA preuzima</h2>
        <p>Objave s ovog kanala namijenjene su preuzimanju. Redakcija može svaki tekst preuzeti uz atribuciju „Izvor: GNK ASG KANAL" — bez traženja dopuštenja za svaki pojedini slučaj.</p>
        <ol>
          <li><b>Objavljujemo prvo ovdje.</b> Svaki tekst ima vlastiti HTML, kanonsku adresu, autora, datum i izvore.</li>
          <li><b>AKTUAL preuzima kroz strojni feed.</b> JSON feed sadrži naslov, sažetak, autora, datum i poveznicu na izvornik.</li>
          <li><b>Ispravci idu u isti tekst.</b> Datum i status provjere vidljivi su u zaglavlju, a ispravci se bilježe na stranici metodologije.</li>
        </ol>
        <div class="channel-cta">
          <a class="btn" href="feed.json">Json feed za AKTUAL</a>
          <a class="btn btn--ghost" href="o-kanalu/">Kako funkcionira kanal</a>
        </div>
      </div>
      <div class="factbox">
        <dl>
          <dt>Izdavač</dt><dd>GNK ASG d.o.o., Zagreb</dd>
          <dt>Glavni urednik</dt><dd>Nermin Sefić</dd>
          <dt>Kontakt</dt><dd><a href="mailto:${esc(SITE.contact.email)}">${esc(SITE.contact.email)}</a></dd>
          <dt>Atribucija</dt><dd>„Izvor: GNK ASG KANAL"</dd>
          <dt>Licenca</dt><dd>Preuzimanje uz atribuciju</dd>
        </dl>
      </div>
    </div>
  </section>

  <section class="band">
    <div class="band-head"><div><h2>Komentari i pojašnjenja</h2><p>Stav urednika je jasno odvojen od vijesti. Pojašnjenja odgovaraju na pitanja koja se ponavljaju.</p></div><a href="pojasnjenja/">Pojašnjenja</a></div>
    <div class="grid grid--3">${[...comments, ...ARTICLES.filter((a) => a.section === 'vodic').slice(0, 1)].map((a) => articleCard(a, root)).join('')}</div>
  </section>

  <section class="cta-strip">
    <div>
      <h2>Imate pitanje, ispravak ili prijedlog teme?</h2>
      <p>Odgovaramo na sve medijske upite. Ispravci se objavljuju javno, s datumom i objašnjenjem izmjene.</p>
    </div>
    <div class="cta-actions">
      <a class="btn" href="kontakt/">Kontakt</a>
      <a class="btn btn--ghost" href="metodologija/">Metodologija</a>
    </div>
  </section>
</div>`;

  return page({
    title: SITE.seoTitle || `${SITE.brandFull}: ${SITE.tagline}`,
    description: SITE.seoDescription || SITE.description,
    canonical: '',
    content,
    og: 'assets/og/naslovnica.png',
    ogAlt: `${SITE.brandFull} — objave, analize i pojašnjenja`,
    graphExtra: [{
      '@type': 'ItemList',
      '@id': abs('#objave'),
      itemListElement: ARTICLES.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`${a.slug}/`), name: a.title }))
    }, {
      '@type': 'BreadcrumbList',
      itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Naslovnica', item: BASE }]
    }],
    bodyAttrs: 'data-slug="naslovnica" data-root=""'
  });
}

/* ---------- teme ---------- */
function buildTopic(key) {
  const s = SECTIONS[key];
  const items = ARTICLES.filter((a) => a.section === key);
  const root = rootFor(`tema/${key}/`);
  const content = `<div class="wrap">
    <header class="topic-head">
      <nav class="crumbs" aria-label="Putanja"><a href="${root}">Naslovnica</a><span>/</span><span aria-current="page">${esc(s.label)}</span></nav>
      <h1>${esc(s.label)}</h1>
      <p>${esc(s.description)}</p>
    </header>
    <div class="list">${items.length ? items.map((a) => articleListRow(a, root)).join('') : '<p class="muted-empty">U ovoj rubrici još nema objava.</p>'}</div>
  </div>`;
  return {
    path: `tema/${key}/`,
    html: page({
      title: `${s.label} — ${SITE.brandFull}`,
      description: s.description,
      canonical: `tema/${key}/`,
      content,
      og: items[0] ? items[0].og || items[0].image : 'assets/og/naslovnica.png',
      ogAlt: s.label,
      graphExtra: [{
        '@type': 'CollectionPage',
        '@id': abs(`tema/${key}/`),
        name: s.label,
        description: s.description,
        hasPart: items.map((a) => ({ '@type': 'NewsArticle', headline: a.title, url: abs(`${a.slug}/`), datePublished: isoDate(a.date) }))
      }],
      bodyAttrs: `data-root="${root}"`
    })
  };
}

/* ---------- feedovi ---------- */
function buildFeeds() {
  const root = '';
  const items = ARTICLES;
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${esc(SITE.brandFull)}</title>
<link>${BASE}</link>
<atom:link href="${abs('feed.xml')}" rel="self" type="application/rss+xml"/>
<description>${esc(SITE.description)}</description>
<language>hr-hr</language>
<lastBuildDate>${new Date(LATEST).toUTCString()}</lastBuildDate>
<managingEditor>${esc(SITE.contact.email)} (Nermin Sefić)</managingEditor>
<copyright>© ${new Date(LATEST).getUTCFullYear()} GNK ASG d.o.o.</copyright>
<image><url>${abs('assets/logo-gnk-asg-gold.svg')}</url><title>${esc(SITE.brandFull)}</title><link>${BASE}</link></image>
${items.map((a) => `<item>
  <title>${esc(a.title)}</title>
  <link>${abs(a.slug + '/')}</link>
  <guid isPermaLink="true">${abs(a.slug + '/')}</guid>
  <pubDate>${new Date(isoDate(a.date)).toUTCString()}</pubDate>
  <dc:creator>${esc(authorOf(a).name)}</dc:creator>
  <category>${esc(SECTIONS[a.section]?.label || '')}</category>
  <description>${esc(a.dek)}</description>
</item>`).join('\n')}
</channel>
</rss>`;

  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>${esc(SITE.brandFull)}</title>
<subtitle>${esc(SITE.tagline)}</subtitle>
<link href="${BASE}" rel="alternate"/>
<link href="${abs('atom.xml')}" rel="self"/>
<id>${BASE}</id>
<updated>${ENV.generated}</updated>
<author><name>GNK ASG KANAL</name><uri>${BASE}</uri></author>
${items.map((a) => `<entry>
  <title>${esc(a.title)}</title>
  <link href="${abs(a.slug + '/')}"/>
  <id>${abs(a.slug + '/')}</id>
  <published>${isoDate(a.date)}</published>
  <updated>${isoDate(a.updated || a.date)}</updated>
  <summary>${esc(a.dek)}</summary>
  <author><name>${esc(authorOf(a).name)}</name><uri>${esc(authorOf(a).url)}</uri></author>
  <category term="${esc(SECTIONS[a.section]?.label || '')}"/>
</entry>`).join('\n')}
</feed>`;

  const jsonfeed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE.brandFull,
    home_page_url: BASE,
    feed_url: abs('feed.json'),
    description: SITE.description,
    language: 'hr-HR',
    icon: abs('assets/logo-gnk-asg-gold.svg'),
    authors: [{ name: SITE.author.name, url: SITE.author.url }],
    _kanal: {
      publisher: SITE.publisher.name,
      attribution: 'Izvor: GNK ASG KANAL',
      license: 'Preuzimanje dopušteno uz atribuciju.',
      editorialStatus: SITE.editorial.statusLabel,
      contact: SITE.contact.email,
      schema: 'kanal-feed-v1'
    },
    items: items.map((a) => ({
      id: abs(a.slug + '/'),
      url: abs(a.slug + '/'),
      title: a.title,
      summary: a.dek,
      content_text: stripTags(a.body).slice(0, 5000),
      date_published: isoDate(a.date),
      date_modified: isoDate(a.updated || a.date),
      authors: [{ name: authorOf(a).name, url: authorOf(a).url }],
      tags: [SECTIONS[a.section]?.label, ...(a.tags || [])].filter(Boolean),
      image: abs(a.og || a.image),
      language: 'hr-HR',
      _kanal: {
        section: a.section,
        sectionLabel: SECTIONS[a.section]?.label,
        readingMinutes: a.readingTime,
        words: a.words,
        sources: (a.sources || []).filter((s) => s.url).map((s) => s.url),
        sourcesNote: (a.sources || []).map((s) => s.label),
        editorialStatus: isDesk(a) ? 'auto-assembled' : SITE.editorial.status
      }
    }))
  };

  return { rss, atom, jsonfeed };
}

/* ---------- sitemap, robots, llms ---------- */
function buildSitemap() {
  const urls = [
    { loc: BASE, lastmod: ARTICLES[0]?.updated || ARTICLES[0]?.date, priority: '1.0', changefreq: 'daily' },
    ...ARTICLES.map((a) => ({ loc: abs(a.slug + '/'), lastmod: a.updated || a.date, priority: '0.9', changefreq: 'monthly' })),
    ...PAGES.map((p) => ({ loc: abs(p.slug + '/'), lastmod: p.updated || ARTICLES[0]?.date, priority: '0.6', changefreq: 'monthly' })),
    ...Object.keys(SECTIONS).map((k) => ({ loc: abs(`tema/${k}/`), lastmod: ARTICLES[0]?.date, priority: '0.5', changefreq: 'weekly' }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;
}

function buildRobots() {
  return `# GNK ASG KANAL — robots.txt
User-agent: *
Allow: /

# Redakcije i AI sustavi: sadržaj je slobodan za indeksiranje uz atribuciju.
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: ${abs('sitemap.xml')}
Sitemap: ${abs('sitemap-objave.xml')}
`;
}

function buildLlms() {
  return `# ${SITE.brandFull}

> ${SITE.description}

Kanal objavljuje tekstove u vlastitom HTML formatu, s otvorenim izvorima i navedenim autorom.
Izdavač: ${SITE.publisher.name}, ${SITE.publisher.address}. Glavni urednik: Nermin Sefić.
Kontakt: ${SITE.contact.email}
Atribucija pri preuzimanju: „Izvor: GNK ASG KANAL".
Status provjere: ${SITE.editorial.statusLabel}.

## Strojevi čitljivi izvori
- [JSON feed (preporučeno za preuzimanje)](${abs('feed.json')})
- [RSS](${abs('feed.xml')})
- [Atom](${abs('atom.xml')})
- [Sitemap](${abs('sitemap.xml')})

## Objave
${ARTICLES.map((a) => `- [${a.title}](${abs(a.slug + '/')}) — ${SECTIONS[a.section]?.label}, ${a.date}. ${a.dek}`).join('\n')}

## Ključne stranice
- [O kanalu](${abs('o-kanalu/')}): uređivački model, vlasništvo i pravila preuzimanja.
- [Nermin Sefić](${abs('nermin-sefic/')}): javni profil autora i glavnog urednika.
- [Metodologija i ispravci](${abs('metodologija/')}): razine provjere izvora i postupak ispravka.
- [Pojašnjenja](${abs('pojasnjenja/')}): odgovori na učestala pitanja o grupi i objavama.
- [Kontakt](${abs('kontakt/')}): medijski upiti.

## Napomena o AI sadržaju
${SITE.aiDisclosure}
`;
}

/* ---------- 404 / manifest / headers ---------- */
function build404() {
  const root = '';
  return page({
    title: `Stranica nije pronađena — ${SITE.brandFull}`,
    description: 'Tražena stranica ne postoji ili je premještena. Vratite se na naslovnicu ili pretražite sve objave.',
    canonical: '404.html',
    noindex: true,
    content: `<div class="wrap"><header class="page-head"><h1>404 — stranica nije pronađena</h1><p class="dek">Adresa je promijenjena ili tekst više nije dostupan. Pokušajte preko popisa svih objava.</p></header>
    <div class="page-body"><p><a class="btn" href="${root}objave/">Sve objave</a> <a class="btn btn--ghost" href="${root}">Naslovnica</a></p>
    <p>Tražite određeni tekst? Pošaljite naslov na <a href="mailto:${esc(SITE.contact.email)}">${esc(SITE.contact.email)}</a>.</p></div></div>`,
    bodyAttrs: 'data-root=""',
    rootOverride: ''
  });
}

const manifest = {
  name: SITE.brandFull,
  short_name: SITE.brand,
  description: SITE.description,
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#0b0c0f',
  theme_color: '#101114',
  lang: 'hr',
  icons: [{ src: 'assets/logo-gnk-asg-gold.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
};

/* ---------- pisanje ---------- */
function write(path, content) {
  const full = join(OUT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/* asseti */
const assetSrc = join(SRC, 'assets');
const copyTree = (from, to) => {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    const dst = join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dst);
    else if (entry.name.endsWith('.webp') && entry.name.startsWith('nermin-sefic-0')) copyFileSync(src, join(to, entry.name === 'nermin-sefic-01-official-desk-portrait.webp' ? 'nermin-sefic-portrait.webp' : entry.name));
    else copyFileSync(src, dst);
  }
};
copyTree(assetSrc, join(OUT, 'assets'));
/* Isti modul osvježavanja kao na portalu — bez njega natpis vodi u 404. */
ensureRefreshModule(OUT);
/* Znak mreže za sve kanale — isto kao na svakom drugom webu. */
write('assets/favicon.svg', FAVICON_SVG);

/* komentari */
for (const slug of new Set([...ARTICLES.map((a) => a.slug), ...PAGES.map((p) => p.slug)])) {
  const p = join(SRC, 'data', 'comments', `${slug}.json`);
  const data = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { slug, comments: [] };
  write(`data/comments/${slug}.json`, JSON.stringify(data, null, 2));
}

/* stranice */
write('index.html', buildHome());
for (const a of ARTICLES) write(`${a.slug}/index.html`, buildArticle(a));
for (const p of PAGES) write(`${p.slug}/index.html`, buildPage(p));
for (const key of Object.keys(SECTIONS)) {
  const t = buildTopic(key);
  write(`${t.path}index.html`, t.html);
}

const { rss, atom, jsonfeed } = buildFeeds();
write('feed.xml', rss);
write('atom.xml', atom);
write('feed.json', JSON.stringify(jsonfeed, null, 2));
write('sitemap.xml', buildSitemap());
write('sitemap-objave.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ARTICLES.map((a) => `<url><loc>${abs(a.slug + '/')}</loc><lastmod>${a.updated || a.date}</lastmod></url>`).join('\n')}
</urlset>`);
write('robots.txt', buildRobots());
write('llms.txt', buildLlms());
write('manifest.webmanifest', JSON.stringify(manifest, null, 2));
write('404.html', build404());

/* Cloudflare Pages konfiguracija (GitHub Pages ih ignorira) */
write('_headers', `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; form-action 'self' mailto:; base-uri 'self'; frame-ancestors 'self'
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);
write('_redirects', `# Cloudflare Pages — trajne preusmjerivače za preuzete tekstove
/objava/:slug /:slug/ 301
/feed /feed.json 301
`);

/* izvještaj za build */
const report = {
  base: BASE,
  generated: ENV.generated,
  pages: 1 + ARTICLES.length + PAGES.length + Object.keys(SECTIONS).length + 1,
  articles: ARTICLES.map((a) => ({ slug: a.slug, title: a.title, words: a.words, readingTime: a.readingTime, section: a.section, date: a.date })),
  pagesList: PAGES.map((p) => p.slug)
};
write('build-report.json', JSON.stringify(report, null, 2));

console.log(`KANAL izgrađen: ${report.pages} stranica, ${ARTICLES.length} objava.`);
console.log(`Osnovni URL: ${BASE}`);
for (const a of ARTICLES) console.log(`  • ${a.slug}/  (${a.words} riječi, ${a.readingTime} min)`);
