#!/usr/bin/env node
/**
 * GNK ASG MREŽA — generator šest neovisnih stranica.
 *
 * Ulaz: lib/registry.mjs (identiteti), lib/kit.mjs (SEO + izgled),
 * content/*.mjs (tekstovi) i lib/elections.mjs (živi desk za izbore).
 * Izlaz: apps/sites/site/<slug>/ — svaka mapa je samostalna stranica s
 * vlastitim sitemapom, feedom, robots.txt, manifestom i OG slikom.
 *
 * Ništa se ne piše rukom u izlaz: ako treba promjena, mijenja se generator
 * ili sadržaj, pa se build ponovno pokrene.
 */
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES, siteBySlug, siteBase, pagePath, NETWORK_HUB_HR, NETWORK_HUB_EN, MAIN_SITE } from './lib/registry.mjs';
import { esc, artSvg, artPath, css, networkBar, siteHeader, head, jsonLd, footer, sitemap, robots, feed } from './lib/kit.mjs';
import { ogPng } from './lib/png.mjs';
import { buildElectionDesk } from './lib/elections.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = process.env.SITES_OUT ? resolve(process.env.SITES_OUT) : join(HERE, 'site');
const ART = 6;

const write = (file, body) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
};

const paragraph = (value, lang) => {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  const picked = value[lang] ?? value.hr ?? value.en ?? [];
  if (Array.isArray(picked)) return picked;
  return picked ? [picked] : [];
};

const plain = (value, lang) => paragraph(value, lang).join(' ');

/* Kratki opis za karticu: reži na granici riječi, nikad usred sloga. */
const clip = (text, limit = 150) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > 60 ? space : limit).replace(/[\s,;:–-]+$/, '')}…`;
};

/* Adrese medija koje desk može sresti u feedovima; koriste se samo za
   poveznicu na izvornik, nikad kao tvrdnja o sadržaju. */
const OUTLET_HOME = {
  'Danas': 'https://www.danas.rs/',
  'N1 Srbija': 'https://n1info.rs/',
  'Nova.rs': 'https://nova.rs/',
  'Jutarnji list': 'https://www.jutarnji.hr/',
  'Index.hr': 'https://www.index.hr/',
  'N1 BiH': 'https://n1info.ba/',
  'N1 Hrvatska': 'https://n1info.hr/',
  'Buka': 'https://www.6yka.com/',
  'RTS': 'https://www.rts.rs/',
  'B92': 'https://www.b92.net/',
  'Politika': 'https://www.politika.rs/',
  'BBC News': 'https://www.bbc.com/news',
  'The Guardian': 'https://www.theguardian.com/',
  'The New York Times': 'https://www.nytimes.com/',
  'Al Jazeera': 'https://www.aljazeera.com/',
  'Deutsche Welle': 'https://www.dw.com/',
};

/* Sadržaj: pet stranica ima fiksne module, izbori se grade iz arhive i
   javnih feedova. Popis izvora na izbornom desku nije statičan: prikazuje
   samo medije čije zapise desk stvarno ima, da nitko ne glumi pokrivenost. */
async function loadContent(site) {
  const base = (await import(`./content/${site.slug}.mjs`)).default;
  if (site.slug !== 'izbori-srbija') return base;
  const desk = buildElectionDesk(ROOT);
  const present = [...new Set(desk.items.map((item) => item.source))];
  const sources = base.sources.filter((source) => present.includes(source.name));
  for (const name of present) {
    if (sources.some((source) => source.name === name)) continue;
    const url = OUTLET_HOME[name];
    if (!url) continue;
    sources.push({
      name,
      url,
      what: {
        hr: 'Medij čije je objave desk zabilježio u promatranom razdoblju.',
        en: 'An outlet whose items the desk recorded during the observed period.',
      },
    });
  }
  sources.push(base.sources.find((source) => source.id === 'arhiva'));
  return { ...base, ...desk, sources, pages: desk.pages };
}

const ORDER_LAST = new Set(['metodologija']);

function normalizePages(content) {
  const entries = Object.entries(content.pages || {});
  const index = new Map(entries.map(([slug], i) => [slug, i]));
  return entries
    .map(([slug, page]) => ({ slug, ...page }))
    .sort((a, b) => {
      if (a.slug === b.slug) return 0;
      if (a.slug === '') return -1;
      if (b.slug === '') return 1;
      const al = ORDER_LAST.has(a.slug) ? 1 : 0;
      const bl = ORDER_LAST.has(b.slug) ? 1 : 0;
      if (al !== bl) return al - bl;
      return index.get(a.slug) - index.get(b.slug);
    });
}

function imageList(site, page) {
  const list = (page.images && page.images.length ? page.images : [0, 1]).map((entry) =>
    typeof entry === 'number' ? artPath(site.slug, entry) : entry);
  return list;
}

function heroArt(site, page) {
  return imageList(site, page)[0] || artPath(site.slug, 0);
}

/* ---------- dijelovi stranice ---------- */

function chips(site, lang, pages) {
  const hub = lang === 'en' ? NETWORK_HUB_EN : NETWORK_HUB_HR;
  const topics = site.topics
    .filter((topic) => pages.some((page) => page.slug === topic))
    .map((topic) => `<li><a href="${pagePath(topic, lang)}">${esc(pages.find((page) => page.slug === topic).nav[lang])}</a></li>`)
    .join('');
  const tags = site.hashtags
    .map((tag) => `<li><a href="${hub}#${site.slug}" rel="external noopener">${esc(tag)}</a></li>`)
    .join('');
  return `<ul class="chips">${topics}${tags}</ul>`;
}

function notice(site, lang, page) {
  const hub = lang === 'en' ? NETWORK_HUB_EN : NETWORK_HUB_HR;
  const extra = {
    zdravlje: {
      hr: 'Ovo nije medicinski savjet. Tekstovi objašnjavaju javnozdravstvene smjernice i način čitanja studija; za odluku o liječenju potreban je liječnik.',
      en: 'This is not medical advice. The texts explain public-health guidance and how to read a study; decisions about treatment need a physician.',
    },
    'scena-znanosti': {
      hr: 'Desk ne provodi istraživanja i ne recenzira radove. Prenosi objavljene dokumente i označava što je recenzirano, a što nije.',
      en: 'The desk does not run research or peer-review papers. It carries published documents and marks what is peer-reviewed and what is not.',
    },
    'izbori-srbija': {
      hr: 'Privremeno izdanje. Desk se gasi i arhivira završetkom izbornog procesa; do tada se brojke osvježavaju iz arhive gradskih izdanja, a ne iz pamćenja.',
      en: 'A temporary edition. The desk is switched off and archived when the electoral process ends; until then its figures refresh from the city editions’ archive, not from memory.',
    },
  }[site.slug]?.[lang];

  return `<div class="note"><strong>${lang === 'en' ? 'Network notice.' : 'Obavijest mreže.'}</strong>
    ${lang === 'en'
      ? `This is an independent edition inside the GNK ASG network. The main site is <a href="${MAIN_SITE}" rel="external noopener">gnk-asg.hr</a>; the list of all editions is at <a href="${hub}">gnk-asg.hr/en/network</a>. Editor and director: <a href="https://gnk-asg.hr/nermin-sefic/" rel="external noopener">Nermin Sefić</a>.`
      : `Ovo je neovisno izdanje u mreži GNK ASG. Matična stranica je <a href="${MAIN_SITE}" rel="external noopener">gnk-asg.hr</a>, a popis svih izdanja na <a href="${hub}">gnk-asg.hr/mreza</a>. Urednik i direktor: <a href="https://gnk-asg.hr/nermin-sefic/" rel="external noopener">Nermin Sefić</a>.`}
    ${extra ? `<br><br>${esc(extra)}` : ''}</div>`;
}

function sectionHtml(section, lang, index) {
  const heading = section.h ? `<h2><span class="num">${String(index + 1).padStart(2, '0')}</span>${esc(section.h[lang])}</h2>` : '';
  const body = paragraph(section.p, lang).map((text) => `<p>${esc(text)}</p>`).join('');
  const list = section.list?.[lang]?.length
    ? `<ul>${section.list[lang].map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
    : '';
  const raw = section.html?.[lang] || '';
  return `<section class="band"><div class="wrap"><div class="prose">${heading}${body}${list}${raw}</div></div></section>`;
}

function cards(site, pages, lang, skip, limit = 4) {
  return pages
    .filter((page) => page.slug !== '' && page.slug !== skip.slug)
    .slice(0, limit)
    .map((page) => `<a class="card" href="${pagePath(page.slug, lang)}">
      <img src="${imageList(site, page)[0]}" alt="${esc(site.name)} — ${esc(page.nav[lang])}" loading="lazy" width="1200" height="800">
      <div class="body"><span class="tag">${esc(page.nav[lang])}</span><h3>${esc(page.title[lang])}</h3><p>${esc(clip(plain(page.lead, lang)))}</p></div>
    </a>`)
    .join('');
}

function mosaic(site, pages, lang) {
  const shots = [];
  for (const page of pages) for (const image of imageList(site, page)) if (!shots.includes(image)) shots.push(image);
  while (shots.length < 6) shots.push(artPath(site.slug, shots.length % ART));
  return `<section class="band"><div class="wrap">
    <h2>${lang === 'en' ? 'The edition in images' : 'Izdanje u slikama'}</h2>
    <p>${lang === 'en'
      ? 'Every graphic is generated for this edition from its own palette — no stock photography, no borrowed portraits, no text burned into the image.'
      : 'Svaka grafika je generirana za ovo izdanje iz njegove palete — bez stock fotografija, bez posuđenih portreta i bez teksta upečenog u sliku.'}</p>
    <div class="mosaic">${shots.slice(0, 7).map((image, i) => `<a href="${image}" aria-label="${lang === 'en' ? 'Open graphic' : 'Otvori grafiku'} ${i + 1}"><img src="${image}" alt="${esc(site.name)} — ${lang === 'en' ? 'generated graphic' : 'generirana grafika'} ${i + 1}" loading="lazy" width="1200" height="800"></a>`).join('')}</div>
  </div></section>`;
}

function sourcesBlock(content, lang, page) {
  if (!content.sources?.length) return '';
  return `<section class="band" id="izvori"><div class="wrap">
    <h2>${lang === 'en' ? 'Sources' : 'Izvori'}</h2>
    <p>${lang === 'en'
      ? 'Every source below is public and checkable. Where a page cites a figure, the figure comes from one of these documents — and the document has a date.'
      : 'Svaki izvor ispod je javan i provjerljiv. Gdje stranica navodi brojku, brojka dolazi iz jednog od ovih dokumenata — i dokument ima datum.'}</p>
    <ol class="src">${content.sources.map((source) => `<li><div><a href="${source.url}" target="_blank" rel="external noopener">${esc(source.name)}</a><small>${esc(source.what?.[lang] || '')}</small></div></li>`).join('')}</ol>
    ${page?.slug === 'metodologija' ? '' : `<p style="margin-top:18px"><a href="${pagePath('metodologija', lang)}">${lang === 'en' ? 'How this edition is made →' : 'Kako nastaje ovo izdanje →'}</a></p>`}
  </div></section>`;
}

function glossaryBlock(content, lang) {
  if (!content.glossary?.length) return '';
  return `<section class="band"><div class="wrap">
    <h2>${lang === 'en' ? 'Terms, without fog' : 'Pojmovi, bez magle'}</h2>
    <p>${lang === 'en' ? 'Ten terms that decide how a story reads. Each definition is short on purpose.' : 'Deset pojmova koji odlučuju kako se vijest čita. Svaka definicija je kratka namjerno.'}</p>
    <div class="grid g2">${content.glossary.map((item) => `<div class="card"><div class="body"><h3>${esc(item.t[lang])}</h3><p>${esc(item.d[lang])}</p></div></div>`).join('')}</div>
  </div></section>`;
}

function faqBlock(page, lang) {
  if (!page.faq?.length) return '';
  return `<section class="band"><div class="wrap">
    <h2>${lang === 'en' ? 'Questions that keep coming back' : 'Pitanja koja se vraćaju'}</h2>
    <div class="faq">${page.faq.map((item) => `<details><summary>${esc(item.q[lang])}</summary><p>${esc(item.a[lang])}</p></details>`).join('')}</div>
  </div></section>`;
}

function siblingBlock(site, lang) {
  const others = SITES.filter((item) => item.slug !== site.slug).slice(0, 5);
  return `<section class="band"><div class="wrap">
    <h2>${lang === 'en' ? 'Other editions in the network' : 'Ostala izdanja u mreži'}</h2>
    <p>${lang === 'en'
      ? 'Each edition has its own domain, its own archive and its own editor’s signature — and all of them point back to the same source of record.'
      : 'Svako izdanje ima vlastitu domenu, vlastitu arhivu i vlastiti potpis urednika — i sva vode natrag na isti izvor provjere.'}</p>
    <div class="grid g3">${others.map((item) => `<a class="card" href="${item.base}" rel="external noopener" hreflang="hr" lang="hr" style="border-top:4px solid ${item.accent}">
      <div class="body"><span class="tag" style="color:${item.accent2}">${esc(item.domain)}</span><h3>${esc(item.name)}</h3><p>${esc(item.tagline.hr)}</p></div>
    </a>`).join('')}</div>
    <p style="margin-top:16px"><a href="${lang === 'en' ? NETWORK_HUB_EN : NETWORK_HUB_HR}">${lang === 'en' ? 'The whole network →' : 'Cijela mreža →'}</a></p>
  </div></section>`;
}

/* ---------- jedna stranica ---------- */

function renderPage(site, content, pages, page, lang, base) {
  const others = lang === 'en' ? 'hr' : 'en';
  const canonical = `${base}${pagePath(page.slug, lang)}`;
  const alternate = `${base}${pagePath(page.slug, others)}`;
  const image = `${base}/img/${site.slug}-og.png`;
  const description = plain(page.lead, lang).replace(/\s+/g, ' ').slice(0, 300);
  const title = page.title[lang].includes(site.name) ? page.title[lang] : `${page.title[lang]} · ${site.name}`;
  const keywords = [...site.hashtags.map((tag) => tag.replace('#', '')), ...site.topics, site.name, 'GNK ASG mreža', 'AKTUAL MEDIA'].join(', ');
  const faq = page.faq || [];
  const jsonld = jsonLd({ site, lang, page: page.slug === '' ? 'home' : 'page', title: page.title[lang], description, canonical, alternate, image, imageW: 1200, imageH: 630, pages, sources: content.sources || [], faq });

  const sections = page.sections.map((section, index) => sectionHtml(section, lang, index)).join('');
  const hero = `<div class="hero"><div class="wrap">
    <p class="kicker">${esc(page.kicker[lang])}${site.temporary ? ` · <span class="live"><i></i>${lang === 'en' ? 'live desk' : 'desk uživo'}</span>` : ''}</p>
    <h2>${esc(page.title[lang])}</h2>
    <p class="lead">${esc(page.lead[lang])}</p>
    ${chips(site, lang, pages)}
    <figure style="margin:26px 0 0;border:1px solid var(--line);border-radius:18px;overflow:hidden">
      <img src="${heroArt(site, page)}" alt="${esc(site.name)} — ${esc(page.nav[lang])}" width="1200" height="800" fetchpriority="high" style="width:100%">
    </figure>
    ${notice(site, lang, page)}
  </div></div>`;

  const homeCards = page.slug === '' ? `<section class="band"><div class="wrap">
    <h2>${lang === 'en' ? 'What this edition follows' : 'Što ovo izdanje prati'}</h2>
    <div class="grid g2">${cards(site, pages, lang, page, 4)}</div>
  </div></section>` : '';

  const back = `<section class="band"><div class="wrap"><p><a href="${pagePath('', lang)}">← ${lang === 'en' ? 'Back to the front page' : 'Natrag na naslovnicu'}</a> · <a href="${lang === 'en' ? NETWORK_HUB_EN : NETWORK_HUB_HR}">${lang === 'en' ? 'Network hub' : 'Mrežni hub'}</a></p></div></section>`;

  return `<!doctype html>
<html lang="${lang}">
<head>
${head({ site, lang, page: page.slug === '' ? 'home' : 'page', title, description, canonical, alternate, image, imageW: 1200, imageH: 630, keywords, jsonld, extra: `<meta name="format-detection" content="telephone=no">\n<style>${css(site)}</style>` })}
</head>
<body>
<a class="skip" href="#main">${lang === 'en' ? 'Skip to content' : 'Preskoči na sadržaj'}</a>
${networkBar(site, lang)}
${siteHeader(site, lang, pages, page.slug)}
<main id="main" tabindex="-1">
${hero}
${homeCards}
${sections}
${page.slug === '' ? glossaryBlock(content, lang) : ''}
${page.slug === 'step-buducnosti' || site.slug === 'step-buducnosti' ? mosaic(site, pages, lang) : ''}
${faqBlock(page, lang)}
${sourcesBlock(content, lang, page)}
${back}
${siblingBlock(site, lang)}
</main>
${footer(site, lang, pages)}
</body>
</html>`;
}

function manifest(site) {
  return JSON.stringify({
    name: `${site.name} — GNK ASG mreža`,
    short_name: site.name,
    description: site.tagline.hr,
    lang: 'hr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: site.bg,
    theme_color: site.bg,
    icons: [
      { src: '/img/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/img/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, null, 2);
}

function notFound(site) {
  return `<!doctype html>
<html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 — ${esc(site.name)}</title><meta name="robots" content="noindex"><link rel="canonical" href="${siteBase(site)}/">
<style>${css(site)}</style></head>
<body><main id="main"><div class="hero"><div class="wrap">
<p class="kicker">404</p><h2>Ove stranice nema.</h2>
<p class="lead">Možda je poveznica stara ili je stranica premještena. Naslovnica je ovdje, a popis svih izdanja na <a href="${NETWORK_HUB_HR}">gnk-asg.hr/mreza</a>.</p>
<p><a href="/" style="border:1px solid var(--accent);border-radius:999px;padding:10px 16px;font:800 12px/1 system-ui;letter-spacing:.1em;text-transform:uppercase">${esc(site.name)} →</a></p>
</div></div></main></body></html>`;
}

function headers() {
  return `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=31536000; includeSubDomains

/img/*
  Cache-Control: public, max-age=31536000, immutable

/*.svg
  Cache-Control: public, max-age=31536000, immutable
`;
}

/* ---------- build ---------- */

async function buildSite(site) {
  const content = await loadContent(site);
  const pages = normalizePages(content);
  const base = siteBase(site);
  const dist = join(OUT, site.slug);
  rmSync(dist, { recursive: true, force: true });

  // grafike
  for (let i = 0; i < ART; i += 1) {
    write(join(dist, 'img', `${site.slug}-art-${i + 1}.svg`), artSvg({ seed: site.slug, accent: site.accent, accent2: site.accent2, bg: site.bg, variant: i }));
  }
  write(join(dist, 'img', `${site.slug}-og.png`), ogPng({ seed: site.slug, bg: site.bg, accent: site.accent, accent2: site.accent2, variant: 0 }));
  write(join(dist, 'img', 'icon-192.png'), ogPng({ seed: `${site.slug}-icon`, bg: site.bg, accent: site.accent, accent2: site.accent2, variant: 2, width: 192, height: 192 }));
  write(join(dist, 'img', 'icon-512.png'), ogPng({ seed: `${site.slug}-icon`, bg: site.bg, accent: site.accent, accent2: site.accent2, variant: 2, width: 512, height: 512 }));

  // stranice, dva jezika
  const written = [];
  for (const page of pages) {
    for (const lang of ['hr', 'en']) {
      const rel = pagePath(page.slug, lang).replace(/^\//, '');
      const file = join(dist, rel, 'index.html');
      write(file, renderPage(site, content, pages, page, lang, base));
      written.push(`${rel}index.html`);
    }
  }

  write(join(dist, 'sitemap.xml'), sitemap(site, pages.map((page) => ({ ...page, images: imageList(site, page) }))));
  write(join(dist, 'robots.txt'), robots(site));
  write(join(dist, 'feed.xml'), feed(site, pages, 'hr'));
  write(join(dist, 'en', 'feed.xml'), feed(site, pages, 'en'));
  write(join(dist, 'manifest.webmanifest'), manifest(site));
  write(join(dist, '404.html'), notFound(site));
  write(join(dist, '_headers'), headers());
  write(join(dist, '.nojekyll'), '');

  return { site, pages: pages.length, files: written.length, items: content.items?.length || 0, updated: pages.map((page) => page.updated).filter(Boolean).sort().pop() || '2026-10-22' };
}

async function buildNetwork() {
  const results = [];
  for (const site of SITES) results.push(await buildSite(site));

  const network = {
    version: 1,
    updatedAt: new Date().toISOString(),
    editor: { name: 'Nermin Sefić', url: 'https://gnk-asg.hr/nermin-sefic/', role: 'Urednik i direktor' },
    publisher: { name: 'AKTUAL MEDIA d.o.o.', url: 'https://gnk-asg.hr/gnk-aktual/' },
    network: { hr: NETWORK_HUB_HR, en: NETWORK_HUB_EN },
    sites: SITES.map((site) => ({
      slug: site.slug,
      name: site.name,
      url: siteBase(site) + '/',
      domain: site.domain,
      accent: site.accent,
      tagline: site.tagline,
      hashtags: site.hashtags,
      topics: site.topics,
      temporary: Boolean(site.temporary),
      outputs: {
        sitemap: `${siteBase(site)}/sitemap.xml`,
        feed: `${siteBase(site)}/feed.xml`,
        robots: `${siteBase(site)}/robots.txt`,
      },
    })),
  };
  write(join(OUT, 'network.json'), JSON.stringify(network, null, 2));

  const table = results.map((r) => `  ${r.site.slug.padEnd(18)} ${String(r.pages).padStart(2)} pages ×2  ${String(r.files).padStart(3)} files  ${r.updated}`).join('\n');
  console.log(`GNK ASG mreža — ${results.length} stranica\n${table}\n  hub: ${NETWORK_HUB_HR}`);
  return results;
}

buildNetwork().catch((error) => {
  console.error(error);
  process.exit(1);
});
