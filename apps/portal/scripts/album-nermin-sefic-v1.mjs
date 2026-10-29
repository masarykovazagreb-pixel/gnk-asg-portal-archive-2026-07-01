#!/usr/bin/env node
/**
 * GALERIJA NERMINA SEFIĆA — generator stranica za fotografije 01–26 i
 * postojeće tematske vizuale.
 *
 * Svaka fotografija dobiva vlastiti HTML s punim meta podacima, JSON-LD
 * ImageObject, sitemap zapisom i podacima o dopuštenom korištenju.
 * Fotografije su dostavljeni urednički materijal; opis nikada ne tvrdi više
 * od onoga što je na slici vidljivo (dogаđaj, odjeća, scena).
 *
 *   node apps/portal/scripts/album-nermin-sefic-v1.mjs
 *   node apps/portal/scripts/album-nermin-sefic-v1.mjs --refresh   # ponovno upiše sve stranice
 */
import fs from 'node:fs';
import path from 'node:path';
import { clip } from '../../../scripts/lib/article-meta-v1.mjs';

const ROOT = path.resolve('apps/portal');
const PEOPLE = path.join(ROOT, 'assets/people/nermin-sefic');
const OG = path.join(PEOPLE, 'og');
const OUT = path.join(ROOT, 'galerija');
const BASE = 'https://gnk-asg.hr';
const REFRESH = process.argv.includes('--refresh');
const CONTACT = 'info@gnk-asg.hr';
const SOCIAL = `${BASE}/assets/gnk-asg-social-card.png`;

const SCENES = {
  '01-official-desk-portrait': { title: 'Službeni portret za uredski stol', scene: 'radni stol', tone: 'formalni portret', alt: 'Nermin Sefić u odijelu za službeni portret, mirno gleda u objektiv' },
  '02-panel-discussion': { title: 'Panel rasprava', scene: 'panel rasprava', tone: 'poslovni susret', alt: 'Nermin Sefić na panel raspravi, okružen sugovornicima' },
  '03-event-notebook-portrait': { title: 'Portret s bilježnicom na događanju', scene: 'događanje', tone: 'radni portret', alt: 'Nermin Sefić s bilježnicom u ruci tijekom događanja' },
  '04-strategy-boardroom': { title: 'Strateška sjednica u upravnoj dvorani', scene: 'upravna dvorana', tone: 'strateški sastanak', alt: 'Nermin Sefić za stolom u upravnoj dvorani, okružen materijalima' },
  '05-cafe-interview-portrait': { title: 'Intervju u kafiću', scene: 'kafić', tone: 'opušteni razgovor', alt: 'Nermin Sefić za stolom u kafiću tijekom intervjua' },
  '06-formal-reception': { title: 'Svečani prijem', scene: 'svečani prijem', tone: 'večernji događaj', alt: 'Nermin Sefić na svečanom prijemu u odijelu' },
  '07-gala-dinner': { title: 'Gala večera', scene: 'gala večera', tone: 'svečana atmosfera', alt: 'Nermin Sefić za stolom na gala večeri' },
  '08-coastal-business-lunch': { title: 'Poslovni ručak uz obalu', scene: 'obala', tone: 'poslovni ručak', alt: 'Nermin Sefić na poslovnom ručku u obalnom okruženju' },
  '09-conference-book': { title: 'Konferencija i knjiga', scene: 'konferencija', tone: 'predstavljanje', alt: 'Nermin Sefić na konferenciji s knjigom u ruci' },
  '10-networking-black-shirt': { title: 'Umrežavanje u crnoj košulji', scene: 'umrežavanje', tone: 'neformalni poslovni susret', alt: 'Nermin Sefić u crnoj košulji tijekom umrežavanja' },
  '11-reception-brown-jacket': { title: 'Prijem u smeđoj jakni', scene: 'prijem', tone: 'poslovni prijem', alt: 'Nermin Sefić u smeđoj jakni na prijemu' },
  '12-gnk-asg-reception': { title: 'Prijem GNK ASG', scene: 'prijem GNK ASG', tone: 'korativni događaj', alt: 'Nermin Sefić na prijemu GNK ASG-a' },
  '13-urban-team-walk': { title: 'Gradska šetnja s timom', scene: 'grad', tone: 'timski događaj', alt: 'Nermin Sefić u gradskoj šetnji s članovima tima' },
  '14-executive-table-discussion': { title: 'Razgovor za izvršnim stolom', scene: 'izvršni stol', tone: 'poslovni razgovor', alt: 'Nermin Sefić za izvršnim stolom u razgovoru' },
  '15-city-evening-networking': { title: 'Večernje umrežavanje u gradu', scene: 'grad navečer', tone: 'večernji događaj', alt: 'Nermin Sefić na večernjem umrežavanju u gradu' },
  '16-garden-reception': { title: 'Prijem u vrtu', scene: 'vrt', tone: 'ljetni prijem', alt: 'Nermin Sefić na prijemu u vrtu' },
  '17-restaurant-roundtable': { title: 'Okrugli stol u restoranu', scene: 'restoran', tone: 'radni ručak', alt: 'Nermin Sefić za okruglim stolom u restoranu' },
  '18-business-lunch-blue-suit': { title: 'Poslovni ručak u plavom odijelu', scene: 'poslovni ručak', tone: 'formalni poslovni susret', alt: 'Nermin Sefić u plavom odijelu na poslovnom ručku' },
  '19-conference-standing': { title: 'Konferencija — stojeći portret', scene: 'konferencija', tone: 'događaj', alt: 'Nermin Sefić stoji na konferenciji' },
  '20-official-standing-portrait': { title: 'Službeni stojeći portret', scene: 'studio', tone: 'službeni portret', alt: 'Nermin Sefić u službenom stojećem portretu' },
  '21-atrium-networking': { title: 'Umrežavanje u atriju', scene: 'atrij', tone: 'poslovni događaj', alt: 'Nermin Sefić u razgovoru u atriju' },
  '22-boardroom-presentation': { title: 'Prezentacija u upravnoj dvorani', scene: 'upravna dvorana', tone: 'prezentacija', alt: 'Nermin Sefić tijekom prezentacije u upravnoj dvorani' },
  '23-keynote-speech': { title: 'Glavno izlaganje', scene: 'pozornica', tone: 'keynote', alt: 'Nermin Sefić drži glavno izlaganje na pozornici' },
  '24-executive-meeting-speech': { title: 'Govor na izvršnom sastanku', scene: 'izvršni sastanak', tone: 'govor', alt: 'Nermin Sefić govori na izvršnom sastanku' },
  '25-evening-reception-sunglasses': { title: 'Večernji prijem sa sunčanim naočalama', scene: 'večernji prijem', tone: 'opušteni večernji stil', alt: 'Nermin Sefić na večernjem prijemu sa sunčanim naočalama' },
  '26-outdoor-business-conversation': { title: 'Poslovni razgovor na otvorenom', scene: 'otvoreni prostor', tone: 'razgovor na otvorenom', alt: 'Nermin Sefić u poslovnom razgovoru na otvorenom' }
};

const slugOf = (file) => file.replace(/\.(webp|svg|jpe?g)$/i, '');
const titleOf = (slug) => {
  const key = slug.replace(/^nermin-sefic-/, '');
  if (SCENES[key]) return SCENES[key];
  return null;
};

const prettyFromSlug = (slug) => {
  const core = slug.replace(/^nermin-sefic-\d+-/, '').replace(/-/g, ' ');
  return core.charAt(0).toUpperCase() + core.slice(1);
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const photos = fs.readdirSync(PEOPLE).filter((f) => /^nermin-sefic-(0[1-9]|1\d|2[0-6])-.*\.webp$/i.test(f)).sort();
const vectors = fs.readdirSync(PEOPLE).filter((f) => /^nermin-sefic-\d{2}-.*\.svg$/i.test(f)).sort();

const entries = [
  ...photos.map((file) => {
    const slug = slugOf(file);
    const meta = titleOf(slug) || { title: prettyFromSlug(slug), scene: 'urednički vizual', tone: 'portret', alt: `Nermin Sefić — ${prettyFromSlug(slug)}` };
    return { type: 'photo', file, slug, src: `/assets/people/nermin-sefic/${file}`, og: `/assets/people/nermin-sefic/og/${slug}.jpg`, ...meta };
  }),
  ...vectors.map((file) => {
    const slug = slugOf(file);
    const meta = titleOf(slug) || { title: prettyFromSlug(slug), scene: 'tematski vizual', tone: 'ilustracija', alt: `Nermin Sefić — ${prettyFromSlug(slug)}` };
    return { type: 'vector', file, slug, src: `/assets/people/nermin-sefic/${file}`, og: '', ...meta };
  })
];

const FORCE = process.argv.includes('--force');
const exist = FORCE ? new Set() : new Set(fs.readdirSync(OUT).filter((d) => fs.existsSync(path.join(OUT, d, 'index.html'))));

function page(entry, index) {
  const canonical = `${BASE}/galerija/${entry.slug}/`;
  const title = `Nermin Sefić · ${entry.title} — fotografija ${String(index + 1).padStart(2, '0')} | GNK ASG`;
  const description = `${entry.title}: ${entry.alt}. Službeni urednički materijal GNK ASG-a i izdanja AKTUAL MEDIA. ${entry.type === 'photo' ? 'Fotografija' : 'Tematski vizual'} ${entry.scene}, ${entry.tone}. Podaci o korištenju i atribuciji navedeni su na stranici.`;
  /* Meta opis je sažetak (80–200 znakova); puni tekst s atribucijom ostaje u tijelu stranice. */
  const metaDescription = clip(`${entry.title}: ${entry.alt}. ${entry.type === 'photo' ? 'Fotografija' : 'Tematski vizual'} ${entry.scene}. Službeni materijal GNK ASG-a i AKTUAL MEDIA.`, 200);
  const keywords = ['Nermin Sefić', 'GNK ASG', 'AKTUAL MEDIA', entry.title, entry.scene, 'galerija', 'fotografija', 'portret'];
  const image = entry.og ? `${BASE}${entry.og}` : `${BASE}${entry.src}`;
  const width = 1200; const height = 630;
  const prev = entries[(index - 1 + entries.length) % entries.length];
  const next = entries[(index + 1) % entries.length];

  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDescription)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="keywords" content="${esc(keywords.join(', '))}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="hr" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="GNK ASG · AKTUAL MEDIA">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(metaDescription)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="${width}">
<meta property="og:image:height" content="${height}">
<meta property="og:image:alt" content="${esc(entry.alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(entry.title)} · ${esc(entry.scene)}">
<meta name="twitter:image" content="${image}">
<link rel="sitemap" type="application/xml" href="/galerija/sitemap.xml">
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    '@id': `${canonical}#slika`,
    contentUrl: `${BASE}${entry.src}`,
    url: canonical,
    name: `${entry.title} — Nermin Sefić`,
    description: entry.alt,
    caption: entry.alt,
    encodingFormat: entry.type === 'photo' ? 'image/webp' : 'image/svg+xml',
    width, height,
    representativeOfPage: true,
    creditText: 'Dostavljeni urednički materijal · GNK ASG',
    creator: { '@type': 'Organization', name: 'GNK ASG d.o.o.', url: 'https://gnk-asg.hr/' },
    copyrightNotice: `© GNK ASG d.o.o. · ${new Date().getUTCFullYear()}`,
    license: 'https://gnk-asg.hr/galerija/',
    acquireLicensePage: canonical
  })}</script>
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': canonical,
    url: canonical,
    name: title,
    description,
    inLanguage: 'hr',
    isPartOf: { '@type': 'CollectionPage', name: 'Galerija Nermina Sefića', url: `${BASE}/galerija/` },
    primaryImageOfPage: { '@id': `${canonical}#slika` },
    about: { '@type': 'Person', name: 'Nermin Sefić', url: `${BASE}/nermin-sefic/` }
  })}</script>
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Galerija', item: `${BASE}/galerija/` },
      { '@type': 'ListItem', position: 3, name: entry.title, item: canonical }
    ]
  })}</script>
<style>
:root{--bg:#06101d;--surface:#0d1f33;--gold:#e0bd69;--ink:#eef3f9;--muted:#a9b8c9}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--gold);text-decoration:none}a:hover{text-decoration:underline}
header.top{border-bottom:1px solid #1c3350;padding:14px clamp(16px,4vw,44px);display:flex;flex-wrap:wrap;gap:10px 20px;justify-content:space-between;font:600 11px/1.5 system-ui;letter-spacing:.16em;text-transform:uppercase;color:#93a7bd}
header.top a{color:var(--gold)}
main{max-width:1080px;margin:0 auto;padding:clamp(20px,4vw,44px) clamp(16px,4vw,44px) 60px}
.crumbs{font:600 11px/1.6 system-ui;letter-spacing:.08em;text-transform:uppercase;color:#8fa3ba;margin-bottom:18px}
h1{font:700 clamp(26px,4vw,42px)/1.1 Georgia,"Times New Roman",serif;margin:0 0 8px;letter-spacing:-.01em}
.kicker{font:600 11px/1.4 system-ui;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin:0 0 8px}
figure{margin:22px 0;background:var(--surface);border:1px solid #1e3b58;border-radius:14px;padding:14px}
figure img{display:block;width:100%;height:auto;border-radius:8px;background:#0a1524}
figcaption{font:400 12px/1.6 system-ui;color:var(--muted);padding-top:10px}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:22px 0}
.meta div{background:var(--surface);border:1px solid #1e3b58;border-radius:12px;padding:14px 16px}
.meta h2{font:600 10px/1.4 system-ui;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin:0 0 6px}
.meta p{margin:0;font-size:13.5px;color:#c7d3e0}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0}
.tags span{font:600 10px/1 system-ui;letter-spacing:.06em;text-transform:uppercase;border:1px solid #2a4a6c;border-radius:999px;padding:6px 9px;color:#b7c6d7}
.nav{display:flex;justify-content:space-between;gap:12px;margin-top:26px;border-top:1px solid #1c3350;padding-top:16px;font:600 13px/1.5 system-ui}
.nav a{max-width:46%}
small.note{display:block;color:#8296ad;font:400 12px/1.6 system-ui;margin-top:18px}
</style>
</head>
<body>
<header class="top"><span>GNK ASG · Galerija Nermina Sefića</span><a href="/galerija/">← Sve fotografije</a></header>
<main>
  <p class="crumbs"><a href="/">GNK ASG</a> › <a href="/galerija/">Galerija</a> › ${esc(entry.title)}</p>
  <p class="kicker">${entry.type === 'photo' ? 'Fotografija' : 'Tematski vizual'} · ${String(index + 1).padStart(2, '0')} / ${String(entries.length).padStart(2, '0')}</p>
  <h1>Nermin Sefić · ${esc(entry.title)}</h1>
  <figure>
    <img src="${entry.src}" alt="${esc(entry.alt)}" width="1200" height="800" loading="eager" decoding="async">
    <figcaption>${esc(entry.alt)}. ${esc(entry.scene)} · ${esc(entry.tone)}. Dostavljeni urednički materijal GNK ASG-a.</figcaption>
  </figure>
  <div class="meta">
    <div><h2>Što je na slici</h2><p>${esc(entry.alt)}.</p></div>
    <div><h2>Kontekst</h2><p>${esc(entry.scene)} — ${esc(entry.tone)}. Vizual prati objave GNK ASG-a i izdanja AKTUAL MEDIA.</p></div>
    <div><h2>Korištenje</h2><p>Objavljuje se uz atribuciju „Foto: GNK ASG / AKTUAL MEDIA“. Ne odvaja se od konteksta i ne koristi kao dokaz tvrdnje.</p></div>
    <div><h2>Kontakt</h2><p><a href="mailto:${CONTACT}">${CONTACT}</a> · za medijske upite i dopuštenja.</p></div>
  </div>
  <p class="tags">${['#NerminSefić', '#NerminSefic', '#SeficNermin', '#GNKASG', '#Galerija', '#AktualMedia', '#Fotografija'].map((t) => `<span>${esc(t)}</span>`).join('')}</p>
  <small class="note">Stranica je dio galerije od ${entries.length} vizuala. Svaka fotografija ima vlastitu adresu, opis i podatke o korištenju. Vizuali nisu neovisni dokaz projekata, partnerstava ni statusa; činjenice se provjeravaju u objavljenim izvorima.</small>
  <nav class="nav"><a href="/galerija/${prev.slug}/">← ${esc(prev.title)}</a><a href="/galerija/${next.slug}/">${esc(next.title)} →</a></nav>
</main>
<script src="/assets/public-unified-menu-v6.js?v=20261019-galerija" defer></script>
<script src="/assets/public-contrast-hardening-v1.js?v=20261019-galerija" defer></script>
</body>
</html>`;
}

let created = 0;
for (const [index, entry] of entries.entries()) {
  if (exist.has(entry.slug) && !REFRESH) continue; // --refresh: ponovno upiše postojeće stranice
  const dir = path.join(OUT, entry.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(entry, index));
  created += 1;
}

/* Sitemap galerije ima više pisaca: album piše portrete, a
   scripts/build-brand-gallery-v1.mjs znakove kuće i naslovnice izdanja.
   Zato album mijenja samo svoj označeni blok — ranije je prepisivao cijeli
   sitemap i tiho brisao sve znakove iz njega. */
const MAP = path.join(OUT, 'sitemap.xml');
const ALBUM_START = '<!-- ALBUM-SITEMAP:START -->';
const ALBUM_END = '<!-- ALBUM-SITEMAP:END -->';
const albumBlock = `${ALBUM_START}
${entries.map((e) => `<url><loc>${BASE}/galerija/${e.slug}/</loc><changefreq>monthly</changefreq><priority>0.5</priority><image:image><image:loc>${BASE}${e.src}</image:loc><image:title>${esc(`Nermin Sefić — ${e.title}`)}</image:title><image:caption>${esc(e.alt)}</image:caption></image:image></url>`).join('\n')}
${ALBUM_END}`;
let mapXml = fs.existsSync(MAP)
  ? fs.readFileSync(MAP, 'utf8')
  : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n</urlset>\n`;
if (!mapXml.includes('xmlns:image')) {
  mapXml = mapXml.replace('<urlset ', '<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ');
}
if (mapXml.includes(ALBUM_START) && mapXml.includes(ALBUM_END)) {
  mapXml = mapXml.replace(new RegExp(`${ALBUM_START}[\\s\\S]*?${ALBUM_END}`), () => albumBlock);
} else {
  const open = mapXml.match(/<urlset[^>]*>/)[0];
  const body = mapXml.slice(mapXml.indexOf(open) + open.length, mapXml.indexOf('</urlset>'))
    .replace(/<url>[\s\S]*?<\/url>/g, (url) => (/\/galerija\/nermin-sefic-/.test(url) ? '' : url))
    .trim();
  mapXml = `${mapXml.slice(0, mapXml.indexOf(open) + open.length)}\n${body ? `${body}\n` : ''}${albumBlock}\n</urlset>\n`;
}
fs.writeFileSync(MAP, mapXml);

fs.writeFileSync(path.join(ROOT, 'data', 'nermin-sefic-gallery.json'), `${JSON.stringify({
  version: 'GNK_ASG_NERMIN_SEFIC_GALLERY_V1_20261019',
  subject: 'Nermin Sefić',
  count: entries.length,
  photos: photos.length,
  vectors: vectors.length,
  base: `${BASE}/galerija/`,
  sitemap: `${BASE}/galerija/sitemap.xml`,
  items: entries.map((e) => ({ slug: e.slug, type: e.type, title: e.title, src: `${BASE}${e.src}`, url: `${BASE}/galerija/${e.slug}/`, alt: e.alt, scene: e.scene, tone: e.tone }))
}, null, 2)}\n`);

console.log(JSON.stringify({ ok: true, entries: entries.length, photos: photos.length, vectors: vectors.length, created, skipped: entries.length - created }, null, 2));
