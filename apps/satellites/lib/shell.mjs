/**
 * Zajednička ljuska za samostalne portale AKTUAL MEDIA.
 *
 * Svaki portal je zasebna domena (Cloudflare Pages) i zaseban sitemap, ali
 * svi dijele isti SEO ugovor: canonical, hreflang par, OG/Twitter sliku,
 * JSON-LD graf, opis u granicama i alt na svakoj slici.
 */
import { meshBlock, MESH_CSS, EDITIONS } from './network-v1.mjs';
import { exchangeBlock, EXCHANGE_CSS } from './razmjena-v1.mjs';
import { designTokensCss } from '../../shared/design-system-v1.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshTag } from '../../shared/refresh-tag-v1.mjs';

export const MAIN = 'https://gnk-asg.hr';
export const ARHIVA = 'https://gnk-asg-arhiva.pages.dev';
export const DNEVNIK = 'https://gnk-asg-dnevnik.pages.dev';
export const BRAND_OG = `${MAIN}/assets/brand/aktual-media`;

export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* Razmjena čita feedove s diska; ljuska zna gdje je korijen repozitorija. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const pad = (n) => String(n).padStart(2, '0');

export function fmtDate(iso, lang = 'hr') {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  if (lang === 'en') {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month];
    return `${day} ${m} ${year} · ${time} UTC`;
  }
  return `${day}. ${month + 1}. ${year}. · ${time} UTC`;
}

export function fmtDay(iso, lang = 'hr') {
  const d = new Date(`${iso}T00:00:00Z`);
  if (lang === 'en') {
    const m = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getUTCMonth()];
    return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`;
  }
  return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}.`;
}

export const proxyImg = (url) => `${MAIN}/api/img?u=${encodeURIComponent(url)}`;

export const SITE_CSS = `*,*::before,*::after{box-sizing:border-box}
:root{--bg:#050d18;--panel:#0a1725;--line:#1d3a55;--ink:#e9f0f8;--muted:#9fb2c8;--gold:#e9c66c}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit;text-decoration:none}
a:hover{text-decoration:underline}
img{max-width:100%;height:auto;display:block}
.wrap{max-width:1120px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
.skip{position:absolute;left:-9999px}
.skip:focus{left:8px;top:8px;z-index:99;background:var(--gold);color:#06111f;padding:10px 14px;border-radius:8px}
.top{border-bottom:1px solid var(--line);background:#08131f;font-size:12.5px}
.top .wrap{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;justify-content:space-between;padding:12px 0}
.brand{display:inline-flex;align-items:center;gap:9px;font:800 11px/1 system-ui;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);text-decoration:none}
.brand img{display:block;width:30px;height:30px;border-radius:7px;flex:0 0 auto}
.brand:hover{color:#fff}
.nav{display:flex;flex-wrap:wrap;gap:6px 14px}
.nav a{color:#cfe0f2;border-bottom:1px solid transparent;padding:2px 0}
.nav a:hover,.nav a:focus-visible{border-bottom-color:var(--gold);text-decoration:none}
header.hero{padding:34px 0 8px}
.kicker{margin:0 0 8px;font:800 11px/1.3 system-ui;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
h1{margin:0 0 12px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(30px,4.6vw,50px);line-height:1.03;letter-spacing:-.02em}
.lead{margin:0;max-width:72ch;color:#bccbdb}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;list-style:none;margin:22px 0 0;padding:0}
.stats li{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.stats b{display:block;font:700 24px/1 Georgia,serif;color:var(--gold)}
.stats span{display:block;margin-top:5px;font-size:11.5px;color:var(--muted);line-height:1.3}
section{padding:26px 0;border-top:1px solid var(--line)}
h2{margin:0 0 6px;font-family:Georgia,serif;font-size:clamp(21px,2.5vw,29px);letter-spacing:-.01em}
h3{margin:0 0 4px;font-size:16px;line-height:1.25}
.sub{margin:0 0 16px;color:var(--muted);font-size:14px;max-width:70ch}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px;list-style:none;margin:0;padding:0}
.card{display:block;height:100%;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--panel);transition:border-color .18s ease,transform .18s ease}
.card:hover,.card:focus-visible{border-color:var(--gold);transform:translateY(-2px);text-decoration:none}
.card b{display:block;font-size:15px;margin-bottom:2px}
.card span{display:block;font-size:12px;color:var(--muted);line-height:1.4}
.card em{display:inline-block;margin-top:8px;font:800 9.5px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#0a1522;background:var(--gold);border-radius:999px;padding:3px 7px;font-style:normal}
.list{list-style:none;margin:0;padding:0}
.item{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;padding:12px 0;border-bottom:1px solid rgba(29,58,85,.6)}
.item.noimg{grid-template-columns:minmax(0,1fr)}
.item img{width:64px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:#0b1a29}
.item h3 a{font-size:15.5px;line-height:1.3}
.meta{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:4px;font-size:11.5px;color:var(--muted)}
.meta a{color:#cfe0f2;text-decoration:underline;text-decoration-color:rgba(233,198,108,.5)}
.meta a:hover{color:var(--gold)}
.pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 8px;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:14px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:10px;border:1px solid rgba(233,198,108,.55);color:var(--gold);font:700 13px/1 system-ui}
.btn:hover{background:var(--gold);color:#06111f;text-decoration:none}
.btn.solid{background:var(--gold);color:#06111f}
.note{margin:22px 0 0;padding:14px 16px;border:1px solid var(--line);border-radius:12px;color:var(--muted);font-size:13px}
footer{padding:26px 0 48px;border-top:1px solid var(--line);color:var(--muted);font-size:12.5px}
footer a{color:#cfe0f2}
.footlinks{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0 0 10px;padding:0;list-style:none}
.search{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 0}
.search input{flex:1 1 240px;min-width:0;padding:11px 13px;border-radius:10px;border:1px solid var(--line);background:#08131f;color:var(--ink);font:inherit}
.search input:focus{outline:2px solid var(--gold);outline-offset:1px}
#results{margin-top:8px}
.days{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.days a{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:space-between;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
.days a:hover{border-color:var(--gold);text-decoration:none}
.days b{font-size:14.5px}
.days span{font-size:12px;color:var(--muted)}
.bars{display:flex;gap:2px;align-items:flex-end;height:42px;margin:10px 0 0;list-style:none;padding:0}
.bars li{flex:1;background:linear-gradient(180deg,#e9c66c,#8a6f2c);border-radius:2px 2px 0 0;min-height:2px}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}
.col h3{font-family:Georgia,serif;font-size:17px;border-bottom:1px solid var(--line);padding-bottom:6px}
.col ul{list-style:none;margin:0;padding:0}
.col li{padding:7px 0;border-bottom:1px solid rgba(29,58,85,.45);font-size:13.5px;line-height:1.35}
.col li time{display:block;font-size:10.5px;color:var(--muted);letter-spacing:.03em}
@media (max-width:620px){.item{grid-template-columns:minmax(0,1fr)}.item img{display:none}}
@media (prefers-reduced-motion:reduce){.card{transition:none}.card:hover{transform:none}}
@media print{.top,.nav,.btn,.search{display:none}body{background:#fff;color:#000}}
${MESH_CSS}
${EXCHANGE_CSS}
`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * @param {object} o
 * @param {'hr'|'en'} o.lang
 * @param {string} o.siteName
 * @param {string} o.siteUrl
 * @param {string} o.path  putanja bez domena, npr. '/' ili '/grad/zagreb/'
 * @param {string} o.title
 * @param {string} o.desc
 * @param {string} o.body
 * @param {string} [o.altUrl]  par na drugom jeziku (apsolutni)
 * @param {object|object[]} [o.jsonld]
 * @param {string} [o.ogImage]
 * @param {string} [o.navHtml]
 * @param {Array<[string,string]>} [o.alternates] dodatni <link rel=alternate>
 */
export function page(o) {
  const {
    lang, siteName, siteUrl, path, title, desc, body,
    altUrl = '', jsonld = null, ogImage = `${BRAND_OG}-hr-og.jpg`,
    ogImageAlt = '', iconUrl = `${siteUrl}/assets/brand/favicon.svg`,
    navHtml = '', alternates = []
  } = o;
  const canonical = `${siteUrl}${path}`;
  const graph = (Array.isArray(jsonld) ? jsonld : jsonld ? [jsonld] : []);
  const ld = graph.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>` : '';
  // Svaki jezik mora navesti i sebe: par je tada uzajaman, a ne jednosmjeran.
  const alternateLinks = [
    `<link rel="alternate" hreflang="${lang}" href="${canonical}">`,
    altUrl ? `<link rel="alternate" hreflang="${lang === 'hr' ? 'en' : 'hr'}" href="${altUrl}">` : '',
    `<link rel="alternate" hreflang="x-default" href="${canonical}">`,
    ...alternates.map(([rel, href]) => `<link rel="alternate" type="${rel}" href="${href}">`)
  ].filter(Boolean).join('\n');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="theme-color" content="#050d18">
<link rel="canonical" href="${canonical}">
${alternateLinks}
<link rel="icon" href="${iconUrl}" type="image/svg+xml">
<link rel="alternate" type="image/svg+xml" href="${iconUrl}" title="${esc(siteName)}">
<link rel="stylesheet" href="/assets/site.css?v=20261022">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(siteName)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === 'hr' ? 'hr_HR' : 'en_GB'}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogImageAlt || title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:image:alt" content="${esc(ogImageAlt || title)}">
${ld}
${designTokensCss()}
</head>
<body>
<a class="skip" href="#sadrzaj">${lang === 'hr' ? 'Preskoči na sadržaj' : 'Skip to content'}</a>
<div class="top"><div class="wrap">
  <a class="brand" href="/"><img src="/assets/brand/aktual-media-mark.svg" alt="AKTUAL MEDIA" width="30" height="30" loading="eager" decoding="async"><span>${esc(siteName)}</span></a>
  <nav class="nav" aria-label="${lang === 'hr' ? 'Glavna navigacija' : 'Main navigation'}">${navHtml}</nav>
</div></div>
<main id="sadrzaj" class="wrap">
${body}
</main>
${exchangeBlock({ root: ROOT, lang, selfHome: siteUrl, selfNames: [siteName], limit: 6 })}
${meshBlock({ lang, selfUrl: siteUrl })}
<footer><div class="wrap">
  <ul class="footlinks">
    <li><a href="${MAIN}/gnk-aktual/">AKTUAL MEDIA</a></li>
    <li><a href="${MAIN}/">GNK ASG</a></li>
    <li><a href="${ARHIVA}/">${lang === 'hr' ? 'ARHIVA' : 'ARCHIVE'}</a></li>
    <li><a href="${DNEVNIK}/">${lang === 'hr' ? 'DNEVNIK' : 'DAILY'}</a></li>
    <li><a href="https://gnk-asg-kanal.pages.dev/">KANAL — ${lang === 'hr' ? 'dnevni pregled' : 'daily brief'}</a></li>
    <li><a href="https://gnk-asg-tjednik.pages.dev/">BUSINESS ${lang === 'hr' ? 'TJEDNIK' : 'WEEKLY'}</a></li>
    <li><a href="${MAIN}/status/">${lang === 'hr' ? 'Status ažurnosti' : 'Freshness status'}</a></li>
    <li><a href="/sitemap.xml">Sitemap</a></li>
    <li><a href="/feed.xml">Feed</a></li>
    <li><a href="mailto:info@gnk-asg.hr">info@gnk-asg.hr</a></li>
  </ul>
  <p>${lang === 'hr'
    ? `Automatski sastavljeno iz javnih izvora ${EDITIONS.length} gradskih izdanja AKTUAL MEDIA. Svaki zapis vodi na izvornik; tvrdnje izvora nisu tvrdnje redakcije.`
    : `Automatically assembled from public sources of the ${EDITIONS.length} AKTUAL MEDIA city editions. Every record links to the original; claims from sources are not the claims of the newsroom.`}</p>
  <p>AKTUAL MEDIA d.o.o. · ${lang === 'hr' ? 'Urednik i direktor' : 'Editor and director'}: Nermin Sefić · <a href="${MAIN}/nermin-sefic/">${lang === 'hr' ? 'profil' : 'profile'}</a></p>
</div></footer>
${refreshTag()}
</body>
</html>`;
}

/** Kartica izdanja za naslovnice. */
export function cityCard(c, count, lang) {
  const name = lang === 'en' ? c.cityEn : c.city;
  const country = lang === 'en' ? c.countryEn : c.country;
  return `<li><a class="card" href="${lang === 'hr' ? `/grad/${c.id}/` : `/en/city/${c.id}/`}"><b>${esc(name)}</b><span>${esc(c.lang)} · ${esc(country)} · ${count}</span></a></li>`;
}

export function storyRow(it, lang, opts = {}) {
  // cityBase: portal na kojem gradske stranice stvarno postoje (ARHIVA).
  const { showImage = true, city = null, cityBase = '' } = opts;
  const img = showImage && it.image ? `<img src="${proxyImg(it.image)}" alt="${esc(it.imageAlt || it.title)}" width="64" height="48" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '';
  const cityLabel = city ? `<a href="${cityBase}${lang === 'hr' ? `/grad/${city.id}/` : `/en/city/${city.id}/`}">${esc(lang === 'en' ? city.cityEn : city.city)}</a>` : '';
  return `<li class="item${img ? '' : ' noimg'}">${img}<div>
  <h3><a href="${esc(it.url)}" target="_blank" rel="external noopener noreferrer nofollow">${esc(it.title)}</a></h3>
  <div class="meta">${cityLabel}<span>${esc(it.sourceName || it.source)}</span><time datetime="${esc(it.date)}">${fmtDate(it.date, lang)}</time><a href="${MAIN}/kanal/${city ? city.id : 'zagreb'}/clanak/${esc(it.slug)}/">${lang === 'hr' ? 'na portalu' : 'on the portal'}</a></div>
</div></li>`;
}

export function sitemap(entries) {
  const urls = entries.map(({ loc, lastmod, changefreq = 'daily', priority = '0.7', alternates = [] }) => {
    const links = alternates.map(([hrefl, href]) => `<xhtml:link rel="alternate" hreflang="${hrefl}" href="${href}"/>`).join('');
    return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${links}</url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export function robots(siteUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
}

export function rss({ siteUrl, siteName, desc, items, lang = 'hr' }) {
  const rows = items.map((it) => `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(it.url)}</link>
      <guid isPermaLink="false">${esc(it.slug)}</guid>
      <pubDate>${new Date(it.date).toUTCString()}</pubDate>
      <description>${esc(it.summary || '')}</description>
      <source url="${esc(it.url)}">${esc(it.sourceName || it.source)}</source>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(siteName)}</title>
    <link>${siteUrl}/</link>
    <description>${esc(desc)}</description>
    <language>${lang}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${rows}
  </channel>
</rss>
`;
}

export function breadcrumb(siteUrl, lang, path, name, label) {
  const homePath = lang === 'hr' ? '/' : '/en/';
  const root = `${siteUrl}${homePath}`;
  // Na naslovnici nema drugog koraka: ponavljanje iste adrese dvaput nije breadcrumb.
  if (path === homePath || path === '/') {
    return {
      '@type': 'BreadcrumbList',
      '@id': `${siteUrl}${path}#breadcrumb`,
      itemListElement: [{ '@type': 'ListItem', position: 1, name: label, item: root }],
    };
  }
  return {
    '@type': 'BreadcrumbList',
    '@id': `${siteUrl}${path}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: label, item: root },
      { '@type': 'ListItem', position: 2, name, item: `${siteUrl}${path}` },
    ],
  };
}

/** Broj u hrvatskom ili engleskom zapisu: 3360 -> "3.360" / "3,360". */
export function fmtNum(n, lang = 'hr') {
  return Number(n).toLocaleString(lang === 'hr' ? 'hr-HR' : 'en-US');
}

export function siteName(lang) {
  return lang === 'hr' ? 'AKTUAL ARHIVA' : 'AKTUAL ARCHIVE';
}

export function publisherNode() {
  return {
    '@type': 'NewsMediaOrganization',
    '@id': `${MAIN}/gnk-aktual/#news-organization`,
    name: 'AKTUAL MEDIA d.o.o.',
    url: `${MAIN}/gnk-aktual/`,
    logo: {
      '@type': 'ImageObject',
      url: `${MAIN}/assets/brand/aktual-media-hr.svg`,
      contentUrl: `${MAIN}/assets/brand/aktual-media-hr-1200.webp`,
      width: 1200,
      height: 345,
    },
    editor: { '@id': `${MAIN}/#nermin-sefic` },
  };
}

export function websiteNode(siteUrl, lang) {
  return {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: `${siteUrl}/`,
    name: siteName(lang),
    inLanguage: ['hr', 'en'],
    publisher: { '@id': `${MAIN}/gnk-aktual/#news-organization` },
  };
}

export const monthShort = (m) => MONTHS[m];
