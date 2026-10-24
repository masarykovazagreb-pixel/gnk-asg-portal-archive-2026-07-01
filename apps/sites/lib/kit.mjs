/**
 * Zajednički sloj neovisnih stranica GNK ASG mreže.
 *
 * Jedan izgled, šest identiteta: struktura je ista (mrežna traka, veliki
 * naslov, numerirane sekcije, izvori, podnožje), a boja, motiv i sadržaj
 * pripadaju stranici. Tako mreža izgleda kao obitelj, a ne kao šablona.
 *
 * SEO ugovor svake stranice:
 *   title, description, keywords/news_keywords, canonical, hreflang hr/en/
 *   x-default, robots, author, editor, OG (uključujući image:alt), Twitter,
 *   JSON-LD (WebSite, Organization, Person, Article/CollectionPage,
 *   BreadcrumbList, FAQPage), vlastiti sitemap.xml, robots.txt i feed.xml.
 */
import { designTokensCss } from '../../shared/design-system-v1.mjs';
import { SITES, MAIN_SITE, NETWORK_HUB_HR, NETWORK_HUB_EN, pagePath, siteBase } from './registry.mjs';
import { meshBlock, MESH_CSS } from '../../satellites/lib/network-v1.mjs';
import { HOUSE_CSS } from '../../satellites/lib/house-style-v1.mjs';

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const srDate = (iso) => {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-');
  return `${Number(d)}. ${Number(m)}. ${y}.`;
};

/* ---------- grafika ----------
   Generirana apstrakcija, bez teksta i bez lažnih scena. Svaka stranica
   dobiva šest varijanti u svojoj paleti; iste se koriste u herou, karticama
   i galeriji, pa je vizual dosljedan i bez vanjskih fotografija. */
export function artSvg({ seed, accent, accent2, bg, variant = 0, w = 1200, h = 800 }) {
  const rnd = (() => {
    let x = 2166136261 ^ seed.charCodeAt(0);
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return Math.abs(x % 1000) / 1000;
    };
  })();
  const dots = Array.from({ length: 26 }, () => {
    const x = Math.round(rnd() * w);
    const y = Math.round(rnd() * h);
    const r = (1 + rnd() * 3).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${accent2}" opacity="${(0.18 + rnd() * 0.5).toFixed(2)}"/>`;
  }).join('');
  const forms = [
    `<g fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width="2">
       ${Array.from({ length: 9 }, (_, i) => `<circle cx="${w * 0.62}" cy="${h * 0.46}" r="${60 + i * 52}" stroke-opacity="${(0.5 - i * 0.045).toFixed(2)}"/>`).join('')}
       <circle cx="${w * 0.62}" cy="${h * 0.46}" r="16" fill="${accent2}" stroke="none"/>
     </g>`,
    `<g stroke="${accent}" stroke-opacity=".35">
       ${Array.from({ length: 16 }, (_, i) => `<line x1="${(i * w) / 15}" y1="0" x2="${(i * w) / 15 - 220}" y2="${h}" stroke-width="1.2"/>`).join('')}
       ${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${(i * h) / 7}" x2="${w}" y2="${(i * h) / 7}" stroke-opacity=".18" stroke-width="1"/>`).join('')}
     </g>
     <circle cx="${w * 0.28}" cy="${h * 0.62}" r="${Math.min(w, h) * 0.19}" fill="${accent}" opacity=".16"/>`,
    `<g>
       ${Array.from({ length: 7 }, (_, i) => {
         const y = h * (0.3 + i * 0.08);
         const amp = 40 + i * 13;
         const d = `M0 ${y} C ${w * 0.2} ${y - amp}, ${w * 0.32} ${y + amp}, ${w * 0.5} ${y} S ${w * 0.78} ${y - amp}, ${w} ${y + amp / 2}`;
         return `<path d="${d}" fill="none" stroke="${i % 2 ? accent2 : accent}" stroke-opacity="${(0.55 - i * 0.05).toFixed(2)}" stroke-width="${2 + i * 0.4}"/>`;
       }).join('')}
     </g>`,
    `<g>
       <polygon points="${w * 0.18},${h * 0.82} ${w * 0.46},${h * 0.18} ${w * 0.58},${h * 0.82}" fill="${accent}" opacity=".18"/>
       <polygon points="${w * 0.42},${h * 0.86} ${w * 0.66},${h * 0.28} ${w * 0.9},${h * 0.86}" fill="${accent2}" opacity=".14"/>
       <polygon points="${w * 0.3},${h * 0.88} ${w * 0.5},${h * 0.36} ${w * 0.72},${h * 0.88}" fill="none" stroke="${accent}" stroke-opacity=".6" stroke-width="2"/>
     </g>`,
    `<g>
       <circle cx="${w * 0.36}" cy="${h * 0.5}" r="${h * 0.3}" fill="${accent}" opacity=".22"/>
       <circle cx="${w * 0.56}" cy="${h * 0.44}" r="${h * 0.24}" fill="${accent2}" opacity=".18"/>
       <circle cx="${w * 0.5}" cy="${h * 0.56}" r="${h * 0.3}" fill="none" stroke="${accent2}" stroke-opacity=".55" stroke-width="2"/>
     </g>`,
    `<g>
       <path d="M ${-w * 0.1} ${h * 0.86} L ${w * 0.5} ${-h * 0.05} L ${w * 0.62} ${-h * 0.05} L ${w * 0.02} ${h * 0.86} Z" fill="${accent}" opacity=".3"/>
       <path d="M ${w * 0.28} ${h * 0.9} L ${w * 0.88} ${-h * 0.02} L ${w * 0.96} ${-h * 0.02} L ${w * 0.36} ${h * 0.9} Z" fill="${accent2}" opacity=".18"/>
       <line x1="0" y1="${h * 0.92}" x2="${w}" y2="${h * 0.92}" stroke="${accent2}" stroke-opacity=".45" stroke-width="2"/>
     </g>`,
  ][variant % 6];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Apstraktna grafika">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${bg}"/><stop offset=".55" stop-color="${bg}"/>
    <stop offset="1" stop-color="${accent}" stop-opacity=".24"/>
  </linearGradient>
  <radialGradient id="r" cx=".72" cy=".24" r=".8">
    <stop offset="0" stop-color="${accent2}" stop-opacity=".22"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/>
  </radialGradient>
  <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect width="${w}" height="${h}" fill="url(#r)"/>
${forms}
<g>${dots}</g>
<rect width="${w}" height="${h}" filter="url(#n)" opacity=".05"/>
</svg>`;
}

export const artPath = (slug, index) => `/img/${slug}-art-${index + 1}.svg`;

/* ---------- stil ---------- */

export function css(site) {
  return `*{box-sizing:border-box}
:root{--bg:${site.bg};--ink:#f2f5f9;--soft:#a9b6c6;--line:rgba(255,255,255,.10);--accent:${site.accent};--accent2:${site.accent2};--max:1180px}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:16.5px/1.68 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
 background-image:radial-gradient(900px 520px at 82% -8%,color-mix(in srgb,var(--accent) 18%,transparent),transparent 62%),radial-gradient(700px 420px at 4% 2%,color-mix(in srgb,var(--accent2) 10%,transparent),transparent 60%)}
a{color:inherit;text-decoration:none}
a:hover{text-decoration:underline;text-underline-offset:3px}
img{max-width:100%;height:auto;display:block}
.wrap{max-width:var(--max);margin:0 auto;padding:0 clamp(16px,4vw,40px)}
.net{background:rgba(3,6,10,.78);border-bottom:1px solid var(--line);font:700 10.5px/1.5 system-ui;letter-spacing:.13em;text-transform:uppercase;color:#93a3b5;backdrop-filter:blur(8px);position:sticky;top:0;z-index:40}
.net .wrap{display:flex;gap:8px 18px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:10px 0}
.net b{color:var(--accent2)}
.net a{color:var(--accent)}
header.site{padding:clamp(26px,5vw,58px) 0 22px;border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.brand .mark{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 10px 30px -10px var(--accent)}
.brand h1{font:800 clamp(24px,3.2vw,34px)/1 Georgia,"Times New Roman",serif;letter-spacing:-.01em;margin:0}
.brand p{margin:2px 0 0;color:var(--soft);font-size:12.5px}
nav.pages{margin-top:20px;display:flex;gap:6px;flex-wrap:wrap}
nav.pages a{border:1px solid var(--line);border-radius:999px;padding:7px 13px;font:700 11.5px/1 system-ui;letter-spacing:.07em;text-transform:uppercase;color:#c7d3e0}
nav.pages a:hover{border-color:var(--accent);color:var(--accent);text-decoration:none}
nav.pages a[aria-current="page"]{background:var(--accent);border-color:var(--accent);color:#0a0b0f}
.hero{padding:clamp(30px,6vw,74px) 0 30px;position:relative;overflow:hidden}
.hero:after{content:"";position:absolute;inset:-20% -10% auto 45%;height:520px;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 22%,transparent),transparent 65%);pointer-events:none}
.kicker{font:800 11px/1.4 system-ui;letter-spacing:.22em;text-transform:uppercase;color:var(--accent2);margin:0 0 12px}
.hero h2{font:800 clamp(34px,6vw,72px)/1.02 Georgia,"Times New Roman",serif;letter-spacing:-.02em;margin:0 0 16px;max-width:17ch}
.hero h2 em{font-style:normal;color:var(--accent)}
.hero .lead{max-width:70ch;color:#cdd8e4;font-size:clamp(15.5px,1.6vw,18.5px);margin:0 0 22px}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin:18px 0 0;padding:0;list-style:none;font:700 10.5px/1 system-ui;letter-spacing:.08em;text-transform:uppercase}
.chips a{border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);border-radius:999px;padding:6px 10px;color:#dbe4ee}
.chips a:hover{border-color:var(--accent);color:var(--accent);text-decoration:none}
.grid{display:grid;gap:14px;margin:26px 0 0}
.g3{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.g2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.card{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012));transition:transform .18s ease,border-color .18s ease}
.card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--accent) 60%,transparent);text-decoration:none}
.card img{aspect-ratio:16/10;object-fit:cover;width:100%}
.card .body{padding:14px 16px 18px}
.card h3{font:700 17px/1.3 Georgia,serif;margin:0 0 6px}
.card p{margin:0;color:var(--soft);font-size:13.5px}
.card .tag{display:inline-block;font:800 10px/1 system-ui;letter-spacing:.14em;text-transform:uppercase;color:var(--accent2);margin-bottom:8px}
section.band{padding:clamp(26px,4vw,46px) 0;border-bottom:1px solid var(--line)}
section.band h2{font:800 clamp(24px,3.4vw,38px)/1.1 Georgia,serif;letter-spacing:-.015em;margin:0 0 10px}
section.band > .wrap > p{color:var(--soft);max-width:80ch;margin:0 0 8px}
.num{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;border:1px solid color-mix(in srgb,var(--accent) 55%,transparent);color:var(--accent);font:800 12px/1 system-ui;margin-right:10px;vertical-align:middle}
.prose p{color:#d3dde8;margin:0 0 13px;max-width:78ch}
.prose ul{margin:0 0 16px;padding-left:20px;color:#d3dde8}
.prose li{margin:0 0 7px}
.stat{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:22px 0}
.stat div{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:rgba(255,255,255,.03)}
.stat b{display:block;font:800 clamp(26px,3.6vw,40px)/1 Georgia,serif;color:var(--accent2);letter-spacing:-.02em}
.stat span{display:block;color:var(--soft);font-size:12px;margin-top:5px;line-height:1.35}
table{width:100%;border-collapse:collapse;font-size:14px;margin:16px 0}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font:800 10.5px/1.3 system-ui;letter-spacing:.12em;text-transform:uppercase;color:var(--accent2)}
td time{white-space:nowrap;color:var(--soft);font-size:12.5px}
td a{color:#eaf1f8;text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--accent) 60%,transparent);text-underline-offset:3px}
.faq details{border:1px solid var(--line);border-radius:14px;padding:13px 16px;margin:0 0 10px;background:rgba(255,255,255,.025)}
.faq summary{cursor:pointer;font:700 16px/1.4 Georgia,serif}
.faq p{margin:9px 0 0;color:var(--soft);font-size:14.5px}
.src{list-style:none;margin:16px 0 0;padding:0;counter-reset:s;display:grid;gap:9px}
.src li{counter-increment:s;display:grid;grid-template-columns:34px 1fr;gap:10px;font-size:14px;color:#cdd8e4}
.src li:before{content:counter(s);height:26px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);border-radius:8px;color:var(--accent);font:800 11px/1 system-ui}
.src a{color:#eef4fa;border-bottom:1px solid color-mix(in srgb,var(--accent2) 55%,transparent)}
.src small{display:block;color:#8b9bad;font-size:11.5px;margin-top:2px}
.note{border-left:3px solid var(--accent);background:rgba(255,255,255,.035);padding:14px 16px;border-radius:0 12px 12px 0;color:#c6d2df;font-size:14px;margin:20px 0}
.live{display:inline-flex;align-items:center;gap:8px;font:800 10.5px/1 system-ui;letter-spacing:.16em;text-transform:uppercase;color:var(--accent2)}
.live i{width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 25%,transparent);animation:p 1.8s infinite}
@keyframes p{50%{opacity:.35}}
footer.site{border-top:1px solid var(--line);padding:30px 0 54px;color:#93a3b5;font-size:13px}
footer.site h2{font:800 11px/1.4 system-ui;letter-spacing:.16em;text-transform:uppercase;color:#dbe4ee;margin:0 0 8px}
footer.site .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:20px}
footer.site a{color:#d6e0ea}
footer.site ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.skip{position:absolute;left:-9999px;top:0;z-index:99;background:var(--accent);color:#08090c;font:800 13px/1 system-ui;padding:12px 18px;border-radius:0 0 12px 0}
.skip:focus{left:0}
:focus-visible{outline:3px solid var(--accent2);outline-offset:3px;border-radius:5px}
main:focus{outline:none}
.mosaic{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:24px 0 0}
.mosaic img{aspect-ratio:1;object-fit:cover;border-radius:12px;border:1px solid var(--line)}
.mosaic a:nth-child(1){grid-column:span 2;grid-row:span 2}
.mosaic a:nth-child(1) img{aspect-ratio:auto;height:100%}
@media(max-width:760px){.mosaic{grid-template-columns:repeat(2,1fr)}.mosaic a:nth-child(1){grid-column:span 2;grid-row:auto}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto}}\n${MESH_CSS}\n${HOUSE_CSS}`;
}

/* ---------- mrežna traka i navigacija ---------- */

export function networkBar(site, lang) {
  const others = SITES.filter((item) => item.slug !== site.slug);
  const hub = lang === 'en' ? NETWORK_HUB_EN : NETWORK_HUB_HR;
  const siblings = others
    .map((item) => `<a href="${item.base}" hreflang="hr" lang="hr" rel="external noopener">${esc(item.name)}</a>`)
    .join(' · ');
  return `<div class="net"><div class="wrap">
    <span>${lang === 'en' ? 'AKTUAL MEDIA network' : 'AKTUAL MEDIA MREŽA'} · <b>${esc(site.name)}</b> · ${lang === 'en' ? 'independent edition' : 'neovisno izdanje'}</span>
    <span><a href="${MAIN_SITE}" rel="external noopener">gnk-asg.hr</a> · <a href="https://gnk-asg.hr/gnk-aktual/" rel="external noopener">AKTUAL MEDIA</a> · <a href="${hub}"${lang === 'en' ? ' hreflang="en"' : ''}>${lang === 'en' ? 'Network' : 'Mreža'}</a> · ${siblings}</span>
  </div></div>`;
}

export function siteHeader(site, lang, pages, current) {
  const nav = pages
    .map((page) => `<a href="${pagePath(page.slug, lang)}"${page.slug === current ? ' aria-current="page"' : ''}>${esc(page.nav[lang])}</a>`)
    .join('');
  const other = lang === 'en' ? 'hr' : 'en';
  return `<header class="site"><div class="wrap">
    <div class="brand">
      <span class="mark" aria-hidden="true"></span>
      <div>
        <h1>${esc(site.name)}</h1>
        <p>${esc(site.tagline[lang])}</p>
        <p style="margin-top:4px;color:#7f8fa1;font:700 10px/1.4 system-ui;letter-spacing:.14em;text-transform:uppercase">${lang === 'en' ? 'An AKTUAL MEDIA edition · GNK ASG network' : 'Izdanje AKTUAL MEDIA · GNK ASG mreža'}</p>
      </div>
      <span style="margin-left:auto"><a href="${pagePath(current, other)}" hreflang="${other}" lang="${other}" style="border:1px solid var(--line);border-radius:999px;padding:7px 12px;font:800 11px/1 system-ui;letter-spacing:.1em;text-transform:uppercase">${other === 'en' ? 'English' : 'Hrvatski'}</a></span>
    </div>
    <nav class="pages" aria-label="${lang === 'en' ? 'Pages' : 'Stranice'}">${nav}</nav>
  </div></header>`;
}

/* ---------- head ---------- */

/* Entitetski graf mreže: isti čvorovi i isti @id na svakoj domeni, pa se
   GNK ASG, GNK DINAMO Ltd., AKTUAL MEDIA i urednik spajaju u jedan entitet
   bez obzira na to s koje je adrese čitatelj došao. */
const ENTITY_GRAPH = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': 'https://gnk-asg.hr/#gnk-asg', name: 'GNK ASG d.o.o.', url: 'https://gnk-asg.hr/', parentOrganization: { '@id': 'https://gnk-asg.hr/#gnk-dinamo-ltd' }, founder: { '@id': 'https://gnk-asg.hr/#nermin-sefic' } },
    { '@type': 'Organization', '@id': 'https://gnk-asg.hr/#gnk-dinamo-ltd', name: 'GNK DINAMO Ltd.', url: 'https://gnk-asg.hr/pojasnjenje-gnk-asg-i-gnk-dinamo-ltd/' },
    { '@type': 'NewsMediaOrganization', '@id': 'https://gnk-asg.hr/gnk-aktual/#aktual-media', name: 'AKTUAL MEDIA', url: 'https://gnk-asg.hr/gnk-aktual/', parentOrganization: { '@id': 'https://gnk-asg.hr/#gnk-asg' }, editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' } },
    { '@type': 'Person', '@id': 'https://gnk-asg.hr/#nermin-sefic', name: 'Nermin Sefić', alternateName: ['Nermin Sefic', 'Sefic Nermin'], jobTitle: 'Glavni urednik AKTUAL MEDIA, direktor GNK ASG d.o.o.', url: 'https://gnk-asg.hr/nermin-sefic/', worksFor: [{ '@id': 'https://gnk-asg.hr/#gnk-asg' }, { '@id': 'https://gnk-asg.hr/gnk-aktual/#aktual-media' }], affiliation: { '@id': 'https://gnk-asg.hr/#gnk-dinamo-ltd' } }
  ]
}).replace(/</g, '\\u003c');

export function head({ site, lang, page, title, description, canonical, alternate, image, imageW = 1200, imageH = 800, keywords, jsonld, hashtags = [], section = '', published = '2026-10-22', modified = published, extra = '' }) {
  const locale = lang === 'en' ? 'en_GB' : 'hr_HR';
  const articleTags = page === 'home' ? '' : hashtags.map((tag) => `<meta property="article:tag" content="${esc(tag)}">`).join('\n');
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="copyright" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="${esc(keywords)}">
<meta name="news_keywords" content="${esc(keywords)}">
<meta name="hashtags" content="${esc(hashtags.join(' '))}">
<meta name="theme-color" content="${site.bg}">
<link rel="author" href="https://gnk-asg.hr/nermin-sefic/">
<link rel="canonical" href="${canonical}">
<script type="application/ld+json" id="network-entity-v1">${ENTITY_GRAPH}</script>
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<meta property="article:tag" content="#NerminSefić">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${lang === 'en' ? 'hr' : 'en'}" href="${alternate}">
<link rel="alternate" hreflang="x-default" href="${lang === 'en' ? alternate : canonical}">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="/feed.xml">
<link rel="alternate" type="application/json" title="Network" href="https://gnk-asg.hr/data/mreza-v1.json">
<link rel="sitemap" type="application/xml" title="Sitemap" href="https://gnk-asg.hr/mreza/sitemap.xml">
<link rel="hub" href="https://pubsubhubbub.appspot.com/">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:type" content="${page === 'home' ? 'website' : 'article'}">
<meta property="og:site_name" content="${esc(site.name)} · GNK ASG mreža">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${locale}">
<meta property="og:updated_time" content="${esc(modified)}T07:00:00+02:00">
<meta property="og:image" content="${image}">
<meta property="og:image:alt" content="${esc(title)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="${imageW}">
<meta property="og:image:height" content="${imageH}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${esc(title)}">
<meta name="twitter:url" content="${canonical}">
${articleTags}${articleTags && section ? '\n' : ''}${page === 'home' ? '' : `<meta property="article:section" content="${esc(section)}">\n<meta property="article:published_time" content="${esc(published)}T07:00:00+02:00">\n<meta property="article:modified_time" content="${esc(modified)}T07:00:00+02:00">`}
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
${designTokensCss()}
${extra}`;
}

/* ---------- JSON-LD ---------- */

export function jsonLd({ site, lang, page, title, description, canonical, alternate, image, imageW = 1200, imageH = 800, pages, sources, faq, keywords = [], section = '', published = '2026-10-22', modified = published }) {
  const orgId = 'https://gnk-asg.hr/#aktual-media';
  const graph = [
    { '@type': 'WebSite', '@id': `${canonical}#website`, name: site.name, url: `${canonical}`, inLanguage: [lang], publisher: { '@id': orgId } },
    { '@type': 'Organization', '@id': orgId, name: 'AKTUAL MEDIA d.o.o.', url: 'https://gnk-asg.hr/gnk-aktual/', brand: { '@type': 'Brand', name: 'AKTUAL MEDIA', url: 'https://gnk-asg.hr/gnk-aktual/mreza/' }, parentOrganization: { '@type': 'Organization', name: 'GNK ASG d.o.o.', url: 'https://gnk-asg.hr/' }, editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' } },
    { '@type': 'Person', '@id': 'https://gnk-asg.hr/#nermin-sefic', name: 'Nermin Sefić', jobTitle: lang === 'en' ? 'Editor and director' : 'Urednik i direktor', url: 'https://gnk-asg.hr/nermin-sefic/', worksFor: { '@id': orgId } },
    {
      '@type': page === 'home' ? 'CollectionPage' : 'Article',
      '@id': `${canonical}#page`,
      url: canonical,
      headline: title,
      name: title,
      description,
      inLanguage: lang,
      datePublished: published,
      dateModified: modified,
      keywords: keywords.join(', '),
      isAccessibleForFree: true,
      copyrightNotice: '© 2026 AKTUAL MEDIA d.o.o.',
      creditText: 'AKTUAL MEDIA d.o.o.',
      ...(page === 'home' ? {} : { articleSection: section }),
      isPartOf: [{ '@id': `${canonical}#website` }, { '@id': 'https://gnk-asg.hr/gnk-aktual/mreza/#page' }],
      copyrightHolder: { '@id': orgId },
      author: { '@id': orgId },
      editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
      publisher: { '@id': orgId },
      image: { '@type': 'ImageObject', url: image, width: imageW, height: imageH },
      ...(page === 'home'
        ? { mainEntity: { '@type': 'ItemList', numberOfItems: pages.length, itemListElement: pages.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.nav[lang], url: `${canonical.replace(/\/$/, '')}${pagePath(item.slug, lang)}` })) } }
        : { about: site.topics.map((topic) => ({ '@type': 'Thing', name: topic })), citation: sources.map((source) => ({ '@type': 'CreativeWork', name: source.name, url: source.url })) }),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: 'https://gnk-asg.hr/' },
        { '@type': 'ListItem', position: 2, name: lang === 'en' ? 'Network' : 'Mreža', item: lang === 'en' ? NETWORK_HUB_EN : NETWORK_HUB_HR },
        { '@type': 'ListItem', position: 3, name: site.name, item: `https://gnk-asg.hr/mreza/#${site.slug}` },
        { '@type': 'ListItem', position: 4, name: title, item: canonical },
      ],
    },
  ];
  if (faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.q[lang], acceptedAnswer: { '@type': 'Answer', text: item.a[lang] } })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

/* ---------- podnožje ---------- */

export function footer(site, lang, pages) {
  const siblings = SITES.filter((item) => item.slug !== site.slug)
    .map((item) => `<li><a href="${item.base}" rel="external noopener" hreflang="hr" lang="hr">${esc(item.name)}<span style="color:#7f8fa1"> · ${esc(item.domain)}</span></a></li>`)
    .join('');
  return `${meshBlock({ lang, selfUrl: siteBase(site) })}\n<footer class="site"><div class="wrap">
    <div class="cols">
      <div>
        <h2>${esc(site.name)}</h2>
        <p>${esc(site.tagline[lang])}</p>
        <p style="color:#7f8fa1">${lang === 'en' ? 'Part of the GNK ASG network of independent editions.' : 'Dio GNK ASG mreže neovisnih izdanja.'}</p>
      </div>
      <div>
        <h2>${lang === 'en' ? 'Pages' : 'Stranice'}</h2>
        <ul>${pages.map((page) => `<li><a href="${pagePath(page.slug, lang)}">${esc(page.nav[lang])}</a></li>`).join('')}</ul>
      </div>
      <div>
        <h2>${lang === 'en' ? 'Network' : 'Mreža'}</h2>
        <ul>
          <li><a href="https://gnk-asg.hr/" rel="external noopener">gnk-asg.hr</a></li>
          <li><a href="${lang === 'en' ? NETWORK_HUB_EN : NETWORK_HUB_HR}">${lang === 'en' ? 'Network hub' : 'Mrežni hub'}</a></li>
          <li><a href="https://gnk-asg.hr/izdanja/" rel="external noopener">${lang === 'en' ? 'Editions' : 'Izdanja'}</a></li>
          <li><a href="https://gnk-asg.hr/kanal/" rel="external noopener">${lang === 'en' ? 'Channels' : 'Kanali'}</a></li>
          <li><a href="https://gnk-asg.hr/tehnologija-buducnosti/" rel="external noopener" hreflang="hr" lang="hr">Tehnologija budućnosti</a></li>
          <li><a href="https://gnk-asg.hr/gnk-aktual/" rel="external noopener">AKTUAL MEDIA</a></li>
          <li><a href="https://gnk-asg.hr/${lang === 'en' ? `en/gnk-aktual/network/${site.slug}/` : `gnk-aktual/mreza/${site.slug}/`}" rel="external noopener">${lang === 'en' ? 'This edition under AKTUAL MEDIA' : 'Ovo izdanje pod AKTUAL MEDIA'}</a></li>
          <li><a href="https://gnk-asg.hr/aktual-media/" rel="external noopener" hreflang="hr" lang="hr">Podatkovni desk</a></li>
          <li><a href="https://gnk-asg.hr/radio/" rel="external noopener" hreflang="hr" lang="hr">Radio</a></li>
          <li><a href="https://gnk-asg.hr/nermin-sefic/" rel="external noopener">Nermin Sefić</a></li>
        </ul>
      </div>
      <div>
        <h2>${lang === 'en' ? 'Other editions' : 'Ostala izdanja'}</h2>
        <ul>${siblings}</ul>
      </div>
    </div>
    <p style="margin-top:22px;border-top:1px solid var(--line);padding-top:16px">
      © 2026 AKTUAL MEDIA d.o.o. · ${lang === 'en' ? 'Editor and director' : 'Urednik i direktor'}: <a href="https://gnk-asg.hr/nermin-sefic/" rel="external noopener">Nermin Sefić</a> ·
      ${lang === 'en' ? 'Every claim carries a source; every source has a date.' : 'Svaka tvrdnja nosi izvor; svaki izvor ima datum.'}
    </p>
  </div></footer>`;
}

/* ---------- sitemap, robots, feed ---------- */

export function sitemap(site, pages) {
  const base = siteBase(site);
  const urls = pages.flatMap((page) => ['hr', 'en'].map((lang) => {
    const lastmod = page.updated || '2026-10-22';
    const canonical = `${base}${pagePath(page.slug, lang)}`;
    const alt = `${base}${pagePath(page.slug, lang === 'en' ? 'hr' : 'en')}`;
    const images = (page.images || []).map((image) => `<image:image><image:loc>${base}${image}</image:loc></image:image>`).join('');
    return `  <url><loc>${canonical}</loc><lastmod>${lastmod}</lastmod><changefreq>${page.slug === '' ? 'daily' : 'weekly'}</changefreq><priority>${page.slug === '' ? '1.0' : '0.8'}</priority><xhtml:link rel="alternate" hreflang="${lang}" href="${canonical}"/><xhtml:link rel="alternate" hreflang="${lang === 'en' ? 'hr' : 'en'}" href="${alt}"/><xhtml:link rel="alternate" hreflang="x-default" href="${base}${pagePath(page.slug, 'hr')}"/>${images}</url>`;
  })).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
}

export function robots(site) {
  return `User-agent: *
Allow: /
Disallow: /404.html

Sitemap: https://${site.domain}/sitemap.xml
`;
}

export function feed(site, pages, lang = 'hr') {
  const base = siteBase(site);
  const newest = pages.map((page) => page.updated).filter(Boolean).sort().pop() || '2026-10-22';
  const stamp = `${newest}T06:00:00Z`;
  const entries = pages.map((page) => ({
    title: page.title[lang],
    link: `${base}${pagePath(page.slug, lang)}`,
    id: `${base}${pagePath(page.slug, lang)}`,
    summary: page.lead[lang],
    updated: `${page.updated || newest}T07:00:00Z`,
  }));
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(site.name)}</title>
  <subtitle>${esc(site.tagline[lang])}</subtitle>
  <link href="${base}/feed.xml" rel="self"/>
  <link href="${base}/"/>
  <link rel="hub" href="https://pubsubhubbub.appspot.com/"/>
  <id>${base}/</id>
  <updated>${stamp}</updated>
  <author><name>AKTUAL MEDIA · Nermin Sefić</name></author>
${entries.map((entry) => `  <entry>
    <title>${esc(entry.title)}</title>
    <link href="${entry.link}"/>
    <id>${entry.id}</id>
    <updated>${entry.updated}</updated>
    <summary>${esc(entry.summary)}</summary>
  </entry>`).join('\n')}
</feed>
`;
}
