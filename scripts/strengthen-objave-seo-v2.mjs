import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('apps/portal/objave/index.html');
const CHECK_ONLY = process.argv.includes('--check');
const CANONICAL = 'https://gnk-asg.hr/objave/';
const DESCRIPTION = 'Autorske korporativne objave Nermina Sefića za GNK ASG d.o.o. o financijama, upravljanju, tehnologiji, sigurnosti i odgovornom poslovanju.';
const IMAGE = 'https://gnk-asg.hr/assets/gnk-asg-social-card.png';

if (!fs.existsSync(FILE)) throw new Error(`Missing ${FILE}`);
let html = fs.readFileSync(FILE, 'utf8');

const escapeText = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const absolute = href => new URL(href, CANONICAL).href;

const cards = [...html.matchAll(/<article\b[^>]*class="[^"]*editorial-card[^"]*"[^>]*>([\s\S]*?)<\/article>/gi)]
  .map((match, index) => {
    const block = match[1];
    const href = block.match(/<a\b[^>]*href="([^"]+)"/i)?.[1];
    const title = escapeText(block.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
    const image = block.match(/<img\b[^>]*src="([^"]+)"/i)?.[1];
    if (!href || !title) return null;
    return {
      '@type': 'ListItem',
      position: index + 1,
      url: absolute(href),
      name: title,
      ...(image ? { image: absolute(image) } : {})
    };
  })
  .filter(Boolean);

if (cards.length < 10) throw new Error(`Expected at least 10 publication cards, found ${cards.length}`);

const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': `${CANONICAL}#collection`,
      name: 'Objave Nermina Sefića i GNK ASG d.o.o.',
      description: DESCRIPTION,
      url: CANONICAL,
      inLanguage: 'hr-HR',
      isPartOf: { '@type': 'WebSite', '@id': 'https://gnk-asg.hr/#website', name: 'GNK ASG', url: 'https://gnk-asg.hr/' },
      about: [
        { '@type': 'Person', '@id': 'https://gnk-asg.hr/nermin-sefic/#person', name: 'Nermin Sefić', url: 'https://gnk-asg.hr/nermin-sefic/' },
        { '@type': 'Organization', '@id': 'https://gnk-asg.hr/#organization', name: 'GNK ASG d.o.o.', url: 'https://gnk-asg.hr/' }
      ],
      primaryImageOfPage: { '@type': 'ImageObject', url: IMAGE },
      mainEntity: { '@id': `${CANONICAL}#itemlist` },
      breadcrumb: { '@id': `${CANONICAL}#breadcrumb` }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${CANONICAL}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: 'https://gnk-asg.hr/' },
        { '@type': 'ListItem', position: 2, name: 'Objave', item: CANONICAL }
      ]
    },
    {
      '@type': 'ItemList',
      '@id': `${CANONICAL}#itemlist`,
      name: 'Najnovije objave GNK ASG',
      numberOfItems: cards.length,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: cards
    }
  ]
};

const upsertMeta = (name, content) => {
  const re = new RegExp(`<meta\\s+name="${name}"[^>]*>`, 'i');
  const tag = `<meta name="${name}" content="${content}">`;
  html = re.test(html) ? html.replace(re, tag) : html.replace('</head>', `${tag}</head>`);
};
const upsertProperty = (property, content) => {
  const re = new RegExp(`<meta\\s+property="${property.replace(':', '\\:')}"[^>]*>`, 'i');
  const tag = `<meta property="${property}" content="${content}">`;
  html = re.test(html) ? html.replace(re, tag) : html.replace('</head>', `${tag}</head>`);
};
const upsertLink = (rel, hreflang, href) => {
  const re = new RegExp(`<link\\s+rel="${rel}"\\s+hreflang="${hreflang}"[^>]*>`, 'i');
  const tag = `<link rel="${rel}" hreflang="${hreflang}" href="${href}">`;
  html = re.test(html) ? html.replace(re, tag) : html.replace('</head>', `${tag}</head>`);
};

upsertMeta('description', DESCRIPTION);
upsertMeta('keywords', 'Nermin Sefić, GNK ASG d.o.o., objave, financije, korporativno upravljanje, tehnologija, sigurnost, poslovna analiza');
upsertMeta('twitter:card', 'summary_large_image');
upsertMeta('twitter:title', 'Objave Nermina Sefića | GNK ASG d.o.o.');
upsertMeta('twitter:description', DESCRIPTION);
upsertMeta('twitter:image', IMAGE);
upsertProperty('og:type', 'website');
upsertProperty('og:title', 'Objave Nermina Sefića | GNK ASG d.o.o.');
upsertProperty('og:description', DESCRIPTION);
upsertProperty('og:url', CANONICAL);
upsertProperty('og:image', IMAGE);
upsertProperty('og:locale', 'hr_HR');
upsertLink('alternate', 'hr', CANONICAL);
upsertLink('alternate', 'x-default', CANONICAL);

const schemaTag = `<script type="application/ld+json">${JSON.stringify(graph)}</script>`;
const schemaRe = /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i;
html = schemaRe.test(html) ? html.replace(schemaRe, schemaTag) : html.replace('</head>', `${schemaTag}</head>`);

const required = [
  'twitter:title', 'twitter:description', 'twitter:image', 'og:type', 'og:locale',
  'hreflang="hr"', 'hreflang="x-default"', 'BreadcrumbList', 'ItemList', 'numberOfItems'
];
for (const token of required) {
  if (!html.includes(token)) throw new Error(`Missing SEO token: ${token}`);
}
if (/Sefić Nermin|Sefic Nermin/.test(html.match(/<meta name="keywords"[^>]*>/i)?.[0] || '')) {
  throw new Error('Reversed-name keyword stuffing remains in meta keywords');
}

if (CHECK_ONLY) {
  console.log(JSON.stringify({ ok: true, file: FILE, cards: cards.length, schemaNodes: graph['@graph'].length }, null, 2));
} else {
  fs.writeFileSync(FILE, html);
  console.log(JSON.stringify({ ok: true, updated: FILE, cards: cards.length }, null, 2));
}
