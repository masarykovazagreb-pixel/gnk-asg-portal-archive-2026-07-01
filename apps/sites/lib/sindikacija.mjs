/**
 * SINDIKACIJA — `sindikacija v1`.
 *
 * Pravilo koje ovaj modul provodi: svaki Nermin Sefićev tekst na hrvatskom,
 * objavljen na AKTUAL MEDIA, putuje na sve povezane stranice mreže kao
 * zasebna objava — kolumna s vlastitom adresom, vlastitim naslovom i vlastitim
 * opisom. Ne kao kopirani blok u podnožju, nego kao stranica koja se može
 * otvoriti, podijeliti i indeksirati.
 *
 * Kako se čuva poštenje sadržaja:
 *
 *  - izvornik je uvijek naveden na vrhu i u podnožju, s apsolutnim linkom;
 *  - `<link rel="canonical">` pokazuje na izvornik, pa tražilica zna koji je
 *    tekst prvi i gdje mu je matična adresa; kopija ne otima poziciju;
 *  - objava nosi oznaku da je prenesena automatski i kada;
 *  - svaka stranica ima svoj uvodni red (jedinstven za tu stranicu), pa
 *    kopija nije prazan duplikat;
 *  - citira se samo ono što stvarno stoji u izvorniku — bez dodavanja
 *    tvrdnji, brojeva ili citata kojih u tekstu nema.
 *
 * Izvor: apps/portal/gnk-aktual/kolumne/<slug>/index.html
 * Izlaz: apps/sites/site/<slug>/kolumna/... + sitemap + link s naslovnice.
 *
 * Test: tests/test-sindikacija-v1.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SITES } from './registry.mjs';
import { entityGraphJson } from '../../../scripts/lib/entity-graph-v1.mjs';

const MAX_ITEMS = 60;
const EXCERPT_PARAGRAPHS = 3;

const strip = (value) => String(value || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const attr = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : '';
};

/** Pročitaj jednu izvornu kolumnu sa portala. */
function readColumn(dir) {
  const file = join(dir, 'index.html');
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');

  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/i);
  const title = strip(attr(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  if (!canonical || !title) return null;

  const description = strip(attr(html, /<meta name="description" content="([^"]*)"/i)).slice(0, 300);
  const published = attr(html, /<meta property="article:published_time" content="([^"]+)"/i)
    || attr(html, /<time[^>]*datetime="([^"]+)"/i);
  const image = attr(html, /<meta property="og:image" content="([^"]+)"/i);
  const tags = [...html.matchAll(/<meta property="article:tag" content="([^"]+)"/gi)].map((m) => m[1]);

  /* Tijelo: prvi odlomci unutar <article>, bez navigacije i potpisa. */
  const article = (html.match(/<article[\s\S]*?<\/article>/i) || [html])[0];
  const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => strip(m[1]))
    .filter((text) => text.length >= 90 && !/^(Foto|Ilustracija|Izvor|Pročitajte|Ovo je tekst)/i.test(text))
    .slice(0, EXCERPT_PARAGRAPHS);

  return {
    slug: dir.split('/').pop(),
    canonical,
    title,
    description,
    published,
    image,
    tags: [...new Set(tags)].slice(0, 8),
    paragraphs
  };
}

/** Uvodni red koji svaka stranica dobiva svoj — bez izmišljenih tvrdnji. */
function localLead(site, column) {
  const name = site.name;
  const who = 'Nermin Sefić';
  return site.lang === 'en'
    ? `This column by ${who} was first published on AKTUAL MEDIA and is republished here, on ${name}, in the original Croatian with the source link.`
    : `Ovu kolumnu ${who}a prvi je objavio AKTUAL MEDIA; ovdje je prenosimo na ${name}, u izvornom hrvatskom tekstu i s linkom na izvor.`;
}

const CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.65 Georgia,"Times New Roman",serif}
a{color:inherit}
.wrap{max-width:820px;margin:0 auto;padding:0 22px}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 0;border-bottom:1px solid var(--line);font:700 11px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase}
.top a{text-decoration:none;opacity:.8}
.top .brand{font-family:Georgia,serif;letter-spacing:.18em;font-size:13px;opacity:1}
main{padding:38px 0 10px}
.kicker{font:800 11px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--accent2);margin:0 0 12px}
h1{font:400 clamp(30px,4.4vw,46px)/1.12 Georgia,serif;margin:0 0 14px;letter-spacing:-.01em}
.dek{font:400 19px/1.55 Georgia,serif;opacity:.86;margin:0 0 20px}
.meta{font:700 11px/1.5 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;opacity:.62;margin:0 0 22px}
.src{display:block;margin:0 0 26px;padding:14px 16px;border:1px solid var(--line);border-left:3px solid var(--accent2);border-radius:10px;font:400 14.5px/1.55 system-ui,sans-serif;background:var(--panel)}
.src b{letter-spacing:.06em;text-transform:uppercase;font-size:11px}
.src a{color:var(--accent2);text-decoration:none;border-bottom:1px solid currentColor}
.hero{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:14px;display:block;margin:0 0 8px;background:rgba(255,255,255,.06)}
.cap{font:400 12.5px/1.5 system-ui,sans-serif;opacity:.6;margin:0 0 26px}
.body p{margin:0 0 18px;font-size:18.5px}
.body p:first-of-type::first-letter{float:left;font-size:58px;line-height:.9;padding:6px 10px 0 0;color:var(--accent2)}
.more{display:inline-block;margin:6px 0 30px;padding:12px 18px;border:1px solid var(--accent2);border-radius:999px;text-decoration:none;font:800 11px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--accent2)}
.hash{font:400 13px/1.7 system-ui,sans-serif;opacity:.7;margin:0 0 34px;word-break:break-word}
footer{border-top:1px solid var(--line);margin-top:20px;padding:22px 0 40px;font:400 13px/1.6 system-ui,sans-serif;opacity:.7}
.grid{display:grid;gap:18px;margin:26px 0 40px}
.card{display:block;text-decoration:none;border:1px solid var(--line);border-radius:14px;padding:18px 20px;background:var(--panel)}
.card b{display:block;font:400 21px/1.3 Georgia,serif;margin:0 0 8px}
.card span{display:block;font:400 14.5px/1.55 system-ui,sans-serif;opacity:.75}
.card i{display:block;margin-top:10px;font:700 10.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;font-style:normal;color:var(--accent2)}
@media(max-width:560px){.body p{font-size:17.5px}.dek{font-size:17.5px}}
`;

function themeVars(site) {
  return `--bg:${site.bg || '#0b0d12'};--ink:#f2eee6;--line:rgba(255,255,255,.16);--panel:rgba(255,255,255,.04);--accent:${site.accent || '#c8963c'};--accent2:${site.accent2 || '#e0bd69'}`;
}

function head({ site, title, description, canonical, image, published, extraGraph = '' }) {
  const graph = entityGraphJson({ compact: true }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="${site.lang || 'hr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Nermin Sefić">
<meta name="editor" content="Nermin Sefić">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}">
<link rel="author" href="https://gnk-asg.hr/nermin-sefic/">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta property="og:locale" content="${site.lang === 'en' ? 'en_GB' : 'hr_HR'}">
<meta property="article:author" content="Nermin Sefić">
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<meta property="article:tag" content="#NerminSefić">
${published ? `<meta property="article:published_time" content="${esc(published)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${image ? `<meta name="twitter:image" content="${esc(image)}">` : ''}
<style>${CSS}</style>
<style>:root{${themeVars(site)}}body{background:var(--bg);color:var(--ink)}</style>
${extraGraph}
<script type="application/ld+json" id="network-entity-v1">${graph}</script>
</head>
<body>
<div class="wrap">
  <nav class="top">
    <a class="brand" href="${site.base || '/'}">${esc(site.name)}</a>
    <span><a href="/kolumna/">${site.lang === 'en' ? 'Columns' : 'Kolumne'}</a> · <a href="https://gnk-asg.hr/gnk-aktual/">AKTUAL MEDIA</a> · <a href="https://gnk-asg.hr/nermin-sefic/">Nermin Sefić</a></span>
  </nav>
  <main>`;
}

const foot = (site) => `  </main>
  <footer>
    <p><b>${esc(site.name)}</b> · ${site.lang === 'en' ? 'part of the AKTUAL MEDIA network' : 'dio mreže AKTUAL MEDIA'} · <a href="https://gnk-asg.hr/nermin-sefic/">Nermin Sefić</a> · <a href="https://gnk-asg.hr/gnk-aktual/">AKTUAL MEDIA</a> · <a href="https://gnk-asg.hr/mreza/">${site.lang === 'en' ? 'Network' : 'Mreža'}</a></p>
    <p>#AKTUALMEDIA · #GNKASG · #NerminSefić</p>
  </footer>
</div>
</body>
</html>
`;

function itemPage(site, column, localImage, localCaption = false) {
  const date = column.published
    ? new Date(column.published).toLocaleDateString(site.lang === 'en' ? 'en-GB' : 'hr-HR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const body = column.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n      ');
  const articleGraph = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: column.title,
    description: column.description,
    datePublished: column.published || undefined,
    inLanguage: 'hr',
    isBasedOn: column.canonical,
    author: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
    editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
    publisher: { '@id': 'https://gnk-asg.hr/#gnk-asg' },
    isAccessibleForFree: true,
    keywords: ['AKTUAL MEDIA', 'GNK ASG', 'Nermin Sefić', ...column.tags].join(', ')
  }).replace(/</g, '\\u003c')}</script>`;

  return head({
    site,
    title: `${column.title} — ${site.name}`,
    description: column.description || column.paragraphs[0] || column.title,
    canonical: column.canonical,
    image: column.image,
    published: column.published,
    extraGraph: articleGraph
  }) + `
    <p class="kicker">${site.lang === 'en' ? 'Column · syndicated' : 'Kolumna · preneseno'}</p>
    <h1>${esc(column.title)}</h1>
    ${column.description ? `<p class="dek">${esc(column.description)}</p>` : ''}
    <p class="meta">Nermin Sefić${date ? ` · ${esc(date)}` : ''} · ${site.lang === 'en' ? 'source: AKTUAL MEDIA' : 'izvor: AKTUAL MEDIA'}</p>

    <div class="src">
      <b>${site.lang === 'en' ? 'Source and attribution' : 'Izvor i atribucija'}</b><br>
      ${esc(localLead(site, column))}<br>
      <a href="${esc(column.canonical)}" rel="noopener">${esc(column.canonical)}</a>
    </div>

    ${localImage ? `<img class="hero" src="${esc(localImage)}" alt="${esc(column.title)}" loading="eager" fetchpriority="high" decoding="async">` : ''}
    <p class="cap">${localCaption
      ? (site.lang === 'en' ? `Illustration: ${site.name}.` : `Ilustracija: ${site.name}.`)
      : (site.lang === 'en' ? 'Image from the source column, AKTUAL MEDIA.' : 'Slika iz izvorne kolumne, AKTUAL MEDIA.')}</p>

    <div class="body">
      ${body}
    </div>

    <a class="more" href="${esc(column.canonical)}" rel="noopener">${site.lang === 'en' ? 'Read the full text at the source' : 'Pročitaj cijeli tekst na izvoru'}</a>

    <p class="hash">${['#AKTUALMEDIA', '#GNKASG', '#NerminSefić', ...column.tags.map((t) => `#${String(t).replace(/[^\p{L}\p{N}]+/gu, '')}`)].filter(Boolean).join(' · ')}</p>
` + foot(site);
}

function indexPage(site, columns) {
  const list = columns.map((column) => {
    const date = column.published ? new Date(column.published).toISOString().slice(0, 10) : '';
    return `      <a class="card" href="/kolumna/${esc(column.slug)}/">
        <b>${esc(column.title)}</b>
        <span>${esc((column.description || column.paragraphs[0] || '').slice(0, 180))}</span>
        <i>${esc(date)} · ${site.lang === 'en' ? 'column' : 'kolumna'}</i>
      </a>`;
  }).join('\n');

  return head({
    site,
    title: site.lang === 'en' ? `Columns by Nermin Sefić — ${site.name}` : `Kolumne Nermina Sefića — ${site.name}`,
    description: site.lang === 'en'
      ? `Every column Nermin Sefić publishes in Croatian on AKTUAL MEDIA is republished here as a separate post, with the source link.`
      : `Svaka kolumna koju Nermin Sefić objavi na hrvatskom na AKTUAL MEDIA prenosi se ovdje kao zasebna objava, s linkom na izvor.`,
    canonical: `${site.base}kolumna/`
  }) + `
    <p class="kicker">${site.lang === 'en' ? 'Columns · AKTUAL MEDIA network' : 'Kolumne · mreža AKTUAL MEDIA'}</p>
    <h1>${site.lang === 'en' ? 'Columns by Nermin Sefić' : 'Kolumne Nermina Sefića'}</h1>
    <p class="dek">${site.lang === 'en'
      ? 'Each text is first published on AKTUAL MEDIA and republished here automatically, with the source link and the original date.'
      : 'Svaki tekst prvi objavljuje AKTUAL MEDIA, a ovdje se prenosi automatski — s linkom na izvor i izvornim datumom.'}</p>
    <div class="grid">
${list}
    </div>
` + foot(site);
}

/**
 * Glavni posao: pročitaj kolumne, napiši ih na svaku stranicu mreže.
 * Vraća brojke za izvještaj.
 */
export function buildSyndication({ root, outRoot, dryRun = false }) {
  const sourceDir = join(root, 'apps', 'portal', 'gnk-aktual', 'kolumne');
  if (!existsSync(sourceDir)) return { ok: false, reason: 'nema izvornih kolumni', items: 0, pages: 0 };

  const columns = readdirSync(sourceDir)
    .map((name) => join(sourceDir, name))
    .filter((dir) => statSync(dir).isDirectory())
    .map(readColumn)
    .filter(Boolean)
    .sort((a, b) => String(b.published).localeCompare(String(a.published)))
    .slice(0, MAX_ITEMS);

  if (!columns.length) return { ok: false, reason: 'nijedna kolumna nije pročitana', items: 0, pages: 0 };

  let pages = 0;
  let images = 0;

  for (const site of SITES) {
    const dist = join(outRoot, site.slug);
    if (!existsSync(dist)) continue;

    const write = (file, body) => {
      mkdirSync(join(file, '..'), { recursive: true });
      if (!dryRun) writeFileSync(file, body);
      pages += 1;
    };

    write(join(dist, 'kolumna', 'index.html'), indexPage(site, columns));

    for (const column of columns) {
      const dir = join(dist, 'kolumna', column.slug);
      mkdirSync(dir, { recursive: true });

      /* Slika mora biti lokalna: CSP mreže dopušta samo vlastite slike.
         Opća društvena kartica nije slika teksta, pa se u tom slučaju
         koristi ilustracija same stranice. */
      let localImage = '';
      let localCaption = false;
      if (column.image && !/gnk-asg-social-card/.test(column.image)) {
        const rel = column.image.replace(/^https:\/\/gnk-asg\.hr\//, '');
        const found = join(root, 'apps', 'portal', rel);
        if (existsSync(found)) {
          const ext = found.slice(found.lastIndexOf('.')).toLowerCase();
          if (!dryRun) copyFileSync(found, join(dir, `slika${ext}`));
          localImage = `slika${ext}`;
          images += 1;
        }
      }
      if (!localImage) {
        localImage = `/img/${site.slug}-art-1.svg`;
        localCaption = true;
      }

      write(join(dir, 'index.html'), itemPage(site, column, localImage, localCaption));
    }

    /* Sitemap: dodaj nove adrese, bez duplikata. */
    const sitemapFile = join(dist, 'sitemap.xml');
    if (existsSync(sitemapFile) && !dryRun) {
      let xml = readFileSync(sitemapFile, 'utf8');
      xml = xml.replace(/\s*<url><loc>[^<]*\/kolumna\/[^<]*<\/loc>[\s\S]*?<\/url>/g, '');
      const today = new Date().toISOString().slice(0, 10);
      const entries = [
        `<url><loc>${site.base}kolumna/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`,
        ...columns.map((column) => `<url><loc>${site.base}kolumna/${column.slug}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`)
      ].join('\n  ');
      xml = xml.replace('</urlset>', `  ${entries}\n</urlset>`);
      writeFileSync(sitemapFile, xml);
    }

    /* Putokaz s naslovnice: bez njega nova sekcija nema unutarnjih linkova. */
    const home = join(dist, 'index.html');
    if (existsSync(home) && !dryRun) {
      const html = readFileSync(home, 'utf8');
      if (!html.includes('/kolumna/')) {
        const label = site.lang === 'en' ? 'Columns by Nermin Sefić' : 'Kolumne Nermina Sefića';
        const block = `<nav class="syn-link" aria-label="Kolumne"><a href="/kolumna/">${label}</a></nav>`;
        writeFileSync(home, html.replace('</body>', `${block}\n</body>`));
      }
    }
  }

  return { ok: true, items: columns.length, pages, images };
}

export const SYNDICATION_COLUMNS = () => {
  const sourceDir = join(process.cwd(), 'apps', 'portal', 'gnk-aktual', 'kolumne');
  if (!existsSync(sourceDir)) return [];
  return readdirSync(sourceDir)
    .map((name) => join(sourceDir, name))
    .filter((dir) => statSync(dir).isDirectory())
    .map(readColumn)
    .filter(Boolean);
};
