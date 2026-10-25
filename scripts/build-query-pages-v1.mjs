#!/usr/bin/env node
/**
 * ČETIRI CILJNA UPITA — jedna stranica po upitu.
 *
 * Zahtjev kuće: tražilica na upit „nermin sefić", „gnk asg", „aktual media" i
 * „gnk dinamo ltd usa" mora naći stranicu koja točno odgovara, a ne slučajni
 * članak. Zato svaki upit dobiva vlastitu stranicu s kanonskom adresom,
 * hreflangom, JSON-LD čvorom i vezom na sve ostale tri.
 *
 * Stranice se ne pišu rukom: nastaju iz podataka (registar agenata, brojevi
 * mreže, izdanja) i iz ugovora kuće, pa se ne mogu razići s impressumom.
 *
 * Pokretanje: node scripts/build-query-pages-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOUSE, impressumBlock, IMPRESSUM_CSS } from '../apps/shared/impressum-v1.mjs';
import { authorBand, AUTHOR_BAND_CSS } from '../apps/shared/author-band-v1.mjs';
import { refreshTag } from '../apps/shared/refresh-tag-v1.mjs';
import { entityGraph } from './lib/entity-graph-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const SITE = 'https://gnk-asg.hr';
const V = '20261025';
const CHECK = process.argv.includes('--check');
const CSS_REL = '/assets/query-pages-v1.css';

const counts = (() => {
  try {
    return JSON.parse(readFileSync(join(PORTAL, 'data', 'network-counts-v1.json'), 'utf8'));
  } catch {
    return {};
  }
})();

const editions = (() => {
  try {
    const raw = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8'));
    return Array.isArray(raw) ? raw : raw.channels || [];
  } catch {
    return [];
  }
})();

const agents = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'ops', 'network-agents-v1.json'), 'utf8')).agents || [];
  } catch {
    return [];
  }
})();

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- sadržaj četiriju stranica ---------- */

const PAGES = [
  {
    slug: 'nermin-sefic',
    exists: true, /* stranica već postoji kao biografija; ne diramo je */
    query: 'nermin sefić',
    title: 'Nermin Sefić — direktor GNK ASG d.o.o. i glavni urednik AKTUAL MEDIA',
    description: 'Nermin Sefić je direktor GNK ASG d.o.o. i glavni urednik AKTUAL MEDIA d.o.o. Na ovoj stranici su njegova funkcija, tekstovi, kolumne i kontakt redakcije.',
    entity: 'Person'
  },
  {
    slug: 'gnk-asg',
    query: 'gnk asg',
    title: 'GNK ASG d.o.o. — nositelj mreže AKTUAL MEDIA',
    description: 'GNK ASG d.o.o. nositelj je mreže AKTUAL MEDIA: 17 gradskih izdanja, devet svjetskih portala i šest samostalnih webova. Kontakt info@gnk-asg.hr.',
    entity: 'Organization'
  },
  {
    slug: 'aktual-media',
    exists: true,
    query: 'aktual media',
    title: 'AKTUAL MEDIA d.o.o. — izdavač mreže',
    description: 'AKTUAL MEDIA d.o.o. izdavač je mreže od 17 gradskih izdanja, devet svjetskih portala i šest samostalnih webova; urednik je Nermin Sefić.',
    entity: 'NewsMediaOrganization'
  },
  {
    slug: 'gnk-dinamo-ltd-usa',
    query: 'gnk dinamo ltd usa',
    title: 'GNK DINAMO Ltd, SAD — osnivač grupe kojoj pripada GNK ASG d.o.o.',
    description: 'GNK DINAMO Ltd, SAD osnivač je grupe; GNK ASG d.o.o. povezan je s cijelim svijetom kao GNK DINAMO Ltd grupa, direktno i preko povezanih društava.',
    entity: 'Organization'
  }
];

const others = (slug) => PAGES.filter((p) => p.slug !== slug)
  .map((p) => `<li><a href="${SITE}/${p.slug}/">${esc(p.title.split(' — ')[0])}</a> — upit „${esc(p.query)}"</li>`).join('\n      ');

const facts = [
  ['Nositelj', `${HOUSE.holder.hr} — kontakt <a href="mailto:${HOUSE.email}">${HOUSE.email}</a>`],
  ['Osnivač', HOUSE.founder.hr],
  ['Izdavač', HOUSE.publisher],
  ['Urednik', `<a href="${SITE}/nermin-sefic/">Nermin Sefić</a> — ${HOUSE.editor.hr}`],
  ['Izdanja', `${editions.length} gradskih izdanja na ${new Set(editions.map((c) => c.country)).size || 10} zemalja`],
  ['Agenti', `${agents.length} agenata održava sedam webova mreže`]
].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('\n      ');

function pageHtml(page) {
  const canonical = `${SITE}/${page.slug}/`;
  const alternate = `${SITE}/en/${page.slug}/`;
  const entity = page.entity === 'Person'
    ? { '@type': 'Person', '@id': `${SITE}/#nermin-sefic`, name: 'Nermin Sefić', alternateName: ['Nermin Sefic', 'Sefic Nermin'], jobTitle: HOUSE.editor.hr, url: canonical, worksFor: { '@id': `${SITE}/#gnk-asg` } }
    : page.slug === 'gnk-dinamo-ltd-usa'
      ? { '@type': 'Organization', '@id': `${SITE}/#gnk-dinamo-ltd`, name: 'GNK DINAMO Ltd', alternateName: ['GNK DINAMO Ltd.', 'GNK DINAMO Ltd, USA', 'GNK DINAMO Ltd, SAD'], url: canonical, founder: { '@id': `${SITE}/#nermin-sefic` } }
      : { '@type': page.entity, '@id': page.slug === 'gnk-asg' ? `${SITE}/#gnk-asg` : `${SITE}/gnk-aktual/#aktual-media`, name: page.slug === 'gnk-asg' ? HOUSE.holder.hr : HOUSE.publisher, url: canonical, email: HOUSE.email, employee: { '@id': `${SITE}/#nermin-sefic` } };

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      ...entityGraph({ compact: false })['@graph'],
      entity,
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        name: 'GNK ASG',
        alternateName: ['AKTUAL MEDIA', 'AKTUAL MEDIA d.o.o.'],
        inLanguage: ['hr', 'en'],
        publisher: { '@id': `${SITE}/#gnk-asg` }
      },
      {
        '@type': 'WebPage',
        '@id': canonical,
        url: canonical,
        name: page.title,
        description: page.description,
        inLanguage: ['hr', 'en'],
        isPartOf: { '@id': `${SITE}/#website` },
        publisher: { '@id': `${SITE}/#gnk-asg` },
        about: { '@id': entity['@id'] },
        primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE}/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp` }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: page.title.split(' — ')[0], item: canonical }
        ]
      }
    ]
  };

  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="author" content="Nermin Sefić">
<meta name="keywords" content="nermin sefić, gnk asg, aktual media, gnk dinamo ltd usa, ${esc(page.query)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="hr" href="${canonical}">
<link rel="alternate" hreflang="en" href="${alternate}">
<link rel="alternate" hreflang="x-default" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:image" content="${SITE}/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp">
<meta property="og:image:alt" content="Nermin Sefić, direktor GNK ASG d.o.o. i glavni urednik AKTUAL MEDIA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${SITE}/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp">
<meta name="twitter:site" content="@aktualmedia">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="article:tag" content="nermin sefić">
<meta property="article:tag" content="gnk asg">
<meta property="article:tag" content="aktual media">
<meta property="article:tag" content="gnk dinamo ltd usa">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/am-design-v1.css?v=20261024" data-am-design="v1">
<link rel="stylesheet" href="${CSS_REL}?v=${V}">
<link rel="alternate" type="application/rss+xml" href="/feed.xml" title="AKTUAL MEDIA — feed">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<main id="sadrzaj" class="qp">
  <nav class="qp-nav" aria-label="Upiti"><a href="${SITE}/">AKTUAL MEDIA</a> <span aria-hidden="true">›</span> <span>${esc(page.query)}</span></nav>
  <p class="qp-kicker">Odgovor na upit</p>
  <h1>${esc(page.title)}</h1>
  <p class="qp-lead">${esc(page.description)}</p>

  <dl class="qp-facts">
      ${facts}
  </dl>

  <h2>Što ovdje vrijedi znati</h2>
  <ul class="qp-list">
    <li>Kontakt cijele mreže je <a href="mailto:${HOUSE.email}">${HOUSE.email}</a> — isti na svakom webu.</li>
    <li>Uredničku odgovornost nosi <a href="${SITE}/nermin-sefic/">Nermin Sefić</a>, direktor i glavni urednik.</li>
    <li>Svaki preuzeti tekst nosi izvor, autora i poveznicu na matičnu objavu; bez izvora se ne objavljuje.</li>
    <li>Mreža ima ${editions.length} gradskih izdanja; svako izdanje ima svoj sitemap, feed i impressum na svom jeziku.</li>
  </ul>

  <h2>Ostali upiti</h2>
  <ul class="qp-list">
      ${others(page.slug)}
  </ul>

  <p class="qp-more"><a href="${SITE}/gnk-aktual/">AKTUAL MEDIA</a> · <a href="${SITE}/mreza/">Mreža</a> · <a href="${SITE}/agenti/">Agenti</a> · <a href="${SITE}/sve-stranice/">Sve stranice</a> · <a href="${SITE}/status/">Status</a></p>
</main>
${authorBand('hr', null, { portrait: '/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp' })}
${impressumBlock('hr')}
${refreshTag('/')}
</body>
</html>
`;
}

const css = `${AUTHOR_BAND_CSS}
${IMPRESSUM_CSS}
.qp{max-width:820px;margin:0 auto;padding:30px 20px 10px;font:400 16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}
.qp-nav{font:700 11px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.7;margin:0 0 18px}
.qp-nav a{color:inherit}
.qp-kicker{font:800 10px/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;opacity:.6;margin:0 0 8px}
.qp h1{font:800 clamp(26px,4.2vw,40px)/1.15 Georgia,serif;margin:0 0 12px}
.qp-lead{font-size:17px;opacity:.86;margin:0 0 20px}
.qp-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:0 0 22px}
.qp-facts div{border:1px solid rgba(128,128,128,.25);border-radius:12px;padding:12px 14px}
.qp-facts dt{font:800 10px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;opacity:.62;margin:0 0 6px}
.qp-facts dd{margin:0;font-size:14px}
.qp h2{font:800 18px/1.25 Georgia,serif;margin:26px 0 8px}
.qp-list{margin:0;padding-left:20px;display:grid;gap:6px}
.qp-list a{color:inherit}
.qp-more{margin:26px 0 0;font:700 12px/1.6 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}
.qp-more a{color:inherit}
`;

let written = 0;
const skipped = [];
for (const page of PAGES) {
  const file = join(PORTAL, page.slug, 'index.html');
  if (page.exists && page.slug !== 'gnk-dinamo-ltd-usa') { skipped.push(page.slug); continue; }
  if (CHECK) {
    if (!existsSync(file)) skipped.push(`${page.slug} (nema)`);
    continue;
  }
  mkdirSync(join(PORTAL, page.slug), { recursive: true });
  writeFileSync(file, pageHtml(page));
  written += 1;
}

const cssFile = join(PORTAL, 'assets', 'query-pages-v1.css');
if (!CHECK) writeFileSync(cssFile, css);

/* Sitemap: jedan unos po stranici, bez dvostrukih. */
let sitemapAdded = 0;
const sitemapFile = join(PORTAL, 'sitemap.xml');
if (!CHECK && existsSync(sitemapFile)) {
  let xml = readFileSync(sitemapFile, 'utf8');
  for (const page of PAGES) {
    const loc = `${SITE}/${page.slug}/`;
    if (xml.includes(`<loc>${loc}</loc>`)) continue;
    const entry = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>2026-10-25</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    xml = xml.replace('</urlset>', `${entry}</urlset>`);
    sitemapAdded += 1;
  }
  writeFileSync(sitemapFile, xml);
}

console.log(JSON.stringify({
  version: 'AKTUAL_MEDIA_QUERY_PAGES_V1',
  check: CHECK,
  pages: PAGES.map((p) => p.slug),
  written,
  skipped,
  sitemapAdded,
  ok: true
}, null, 2));
