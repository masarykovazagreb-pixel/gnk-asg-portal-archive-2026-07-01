/**
 * PRENOS — svaki naš tekst na svakoj povezanoj domeni.
 *
 * Pravilo: čim tekst izađe kod nas, izlazi i na svim webovima sustava —
 * kao zasebna objava s vlastitom adresom, lokalnom slikom, potpisom autora
 * i linkom na izvornik. Ne kao kopirani blok, nego kao stranica koja se
 * može otvoriti, podijeliti i indeksirati.
 *
 * Što se prenosi (vidi corpus-v1):
 *   - kolumne Nermina Sefića,
 *   - autorski tekstovi s portala,
 *   - pojašnjenja i komentari s kanala (uključujući tekst o GNK ASG d.o.o.
 *     i GNK DINAMO Ltd.).
 *
 * Što se čuva:
 *   - `canonical` uvijek pokazuje na izvornik — kopija ne otima matičnu adresu;
 *   - autor je potpisan imenom i fotografijom (ista slika na svakoj domeni);
 *   - izvornik je vidljivo naveden na vrhu i na dnu objave;
 *   - lokalna kopija slike, jer CSP pojedinih domena dopušta samo vlastite
 *     slike; bez kopije slika se ne bi prikazala.
 *
 * Kolumne se ne pišu dvaput: gdje već postoji /kolumna/<slug>/, popis vodi
 * tamo, a ovdje nastaje samo unos. Sve ostalo dobiva /prenos/<slug>/.
 */
import { designTokensCss } from '../../apps/shared/design-system-v1.mjs';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCorpus, corpusImage, authorPortrait, KIND_LABEL } from './corpus-v1.mjs';
import { entityGraphJson } from './entity-graph-v1.mjs';
import { meshBlock } from '../../apps/satellites/lib/network-v1.mjs';
import { HOUSE_CSS, houseRibbon } from '../../apps/satellites/lib/house-style-v1.mjs';
import { refreshTag } from '../../apps/shared/refresh-tag-v1.mjs';

const MAX_ITEMS = 90;

const LABELS = {
  hr: {
    nav: 'Prenos', kicker: 'Prenos · AKTUAL MEDIA', title: 'Naši tekstovi, preneseni ovdje',
    lead: 'Svaki tekst koji objavimo kod nas prenosi se na ovu stranicu kao zasebna objava — s potpisom autora, izvornom slikom i linkom na izvornik. Ništa se ne prepisuje rukom.',
    source: 'Izvor i atribucija',
    intro: 'Ovaj tekst prvi je objavljen na izvorniku ispod. Ovdje je prenesen u cijelosti, s linkom na matičnu adresu.',
    read: 'Pročitaj na izvorniku', all: 'Svi tekstovi', columns: 'Kolumne', authored: 'Autorski tekstovi',
    explanations: 'Pojašnjenja i komentari', company: 'GNK ASG i GNK DINAMO Ltd.', author: 'Autor', editor: 'Glavni urednik',
    image: 'Slika iz izvorne objave.', fromColumns: 'Kolumna', total: 'tekstova'
  },
  en: {
    nav: 'Reprints', kicker: 'Reprints · AKTUAL MEDIA', title: 'Our texts, republished here',
    lead: 'Every text we publish first is republished on this page as a separate post — with the author signature, the original image and a link to the source. Nothing is copied by hand.',
    source: 'Source and attribution',
    intro: 'This text was first published at the source below. It is republished here in full, with a link to the canonical address.',
    read: 'Read at the source', all: 'All texts', columns: 'Columns', authored: 'Authored texts',
    explanations: 'Explanations and comments', company: 'GNK ASG and GNK DINAMO Ltd.', author: 'Author', editor: 'Editor-in-chief',
    image: 'Image from the original post.', fromColumns: 'Column', total: 'texts'
  },
  id: {
    nav: 'Reproduksi', kicker: 'Reproduksi · AKTUAL MEDIA', title: 'Teks kami, diterbitkan ulang di sini',
    lead: 'Setiap teks yang kami terbitkan pertama kali diterbitkan ulang di halaman ini sebagai artikel tersendiri — dengan tanda tangan penulis, gambar asli, dan tautan ke sumbernya.',
    source: 'Sumber dan atribusi',
    intro: 'Teks ini pertama kali diterbitkan di sumber di bawah. Di sini ditampilkan lengkap dengan tautan ke alamat aslinya.',
    read: 'Baca di sumber', all: 'Semua teks', columns: 'Kolom', authored: 'Teks penulis',
    explanations: 'Penjelasan dan komentar', author: 'Penulis', editor: 'Pemimpin redaksi',
    image: 'Gambar dari artikel asli.', fromColumns: 'Kolom', total: 'teks'
  },
  pt: {
    nav: 'Republicações', kicker: 'Republicações · AKTUAL MEDIA', title: 'Nossos textos, republicados aqui',
    lead: 'Cada texto que publicamos primeiro é republicado nesta página como artigo separado — com a assinatura do autor, a imagem original e o link para a fonte.',
    source: 'Fonte e atribuição',
    intro: 'Este texto foi publicado primeiro na fonte abaixo. Aqui aparece na íntegra, com link para o endereço original.',
    read: 'Ler na fonte', all: 'Todos os textos', columns: 'Colunas', authored: 'Textos de autor',
    explanations: 'Explicações e comentários', author: 'Autor', editor: 'Editor-chefe',
    image: 'Imagem do artigo original.', fromColumns: 'Coluna', total: 'textos'
  },
  ar: {
    nav: 'إعادة نشر', kicker: 'إعادة نشر · AKTUAL MEDIA', title: 'نصوصنا، معاد نشرها هنا',
    lead: 'كل نص ننشره أولاً يُعاد نشره في هذه الصفحة كمقال مستقل، مع توقيع الكاتب والصورة الأصلية ورابط المصدر.',
    source: 'المصدر والإسناد',
    intro: 'نُشر هذا النص أولاً في المصدر أدناه، ويُعاد نشره هنا كاملاً مع رابط العنوان الأصلي.',
    read: 'اقرأ في المصدر', all: 'كل النصوص', columns: 'أعمدة', authored: 'نصوص الكاتب',
    explanations: 'توضيحات وتعليقات', author: 'الكاتب', editor: 'رئيس التحرير',
    image: 'الصورة من المقال الأصلي.', fromColumns: 'عمود', total: 'نصوص'
  },
  ja: {
    nav: '転載', kicker: '転載 · AKTUAL MEDIA', title: '私たちの記事（転載）',
    lead: '私たちが最初に公開したすべての記事は、著者署名・元の画像・出典リンクとともに、独立した記事としてこのページに転載されます。',
    source: '出典と帰属',
    intro: 'この記事は下記の出典で最初に公開されました。原文のアドレスへのリンクとともに、ここに全文を掲載しています。',
    read: '出典で読む', all: 'すべての記事', columns: 'コラム', authored: '著者記事',
    explanations: '説明とコメント', author: '著者', editor: '編集長',
    image: '元記事の画像。', fromColumns: 'コラム', total: '記事'
  },
  zh: {
    nav: '转载', kicker: '转载 · AKTUAL MEDIA', title: '我们的文章（转载）',
    lead: '我们首发的每篇文章都会以独立文章形式转载到本页面，附作者署名、原始图片和来源链接。',
    source: '来源与署名',
    intro: '本文首发于下方来源。此处全文转载，并附原文地址链接。',
    read: '在来源处阅读', all: '全部文章', columns: '专栏', authored: '作者文章',
    explanations: '说明与评论', author: '作者', editor: '总编辑',
    image: '图片来自原文。', fromColumns: '专栏', total: '篇文章'
  }
};

const LABEL = (lang) => LABELS[lang] || LABELS.en;

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CSS = `
.pn{max-width:980px;margin:0 auto;padding:30px 20px 10px}
.pn .k{font:800 11px/1.4 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--accent2);margin:0 0 12px}
.pn h1{font:800 clamp(27px,4vw,40px)/1.1 system-ui,sans-serif;margin:0 0 14px}
.pn .lead{font:400 17.5px/1.65 system-ui,sans-serif;opacity:.86;margin:0 0 22px;max-width:72ch}
.pn .author{display:flex;gap:14px;align-items:center;border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:12px 15px;background:rgba(255,255,255,.04);margin:0 0 26px}
.pn .author img{width:58px;height:58px;border-radius:50%;object-fit:cover;flex:0 0 auto}
.pn .author b{display:block;font:800 15px/1.3 system-ui,sans-serif}
.pn .author span{display:block;font:400 12.5px/1.45 system-ui,sans-serif;opacity:.7}
.pn .author a{color:var(--accent2);text-decoration:none}
.pn h2{font:800 21px/1.2 system-ui,sans-serif;margin:30px 0 12px}
.pn .grid{display:grid;gap:14px}
@media(min-width:760px){.pn .grid{grid-template-columns:1fr 1fr}}
.pn .card{display:block;text-decoration:none;color:inherit;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:16px 18px;background:rgba(255,255,255,.03)}
.pn .card b{display:block;font:700 18px/1.3 system-ui,sans-serif;margin:0 0 7px}
.pn .card span{display:block;font:400 13.5px/1.55 system-ui,sans-serif;opacity:.75}
.pn .card i{display:block;margin-top:9px;font:700 10px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;font-style:normal;color:var(--accent2)}
.pn .src{display:block;margin:0 0 24px;padding:13px 16px;border:1px solid rgba(255,255,255,.16);border-inline-start:3px solid var(--accent2);border-radius:10px;font:400 14px/1.6 system-ui,sans-serif;background:rgba(255,255,255,.04)}
.pn .src b{letter-spacing:.06em;text-transform:uppercase;font-size:11px}
.pn .src a{color:var(--accent2);text-decoration:none;border-bottom:1px solid currentColor;word-break:break-all}
.pn .meta{font:700 11px/1.6 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;opacity:.62;margin:0 0 18px}
.pn .hero{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:14px;display:block;margin:0 0 8px;background:rgba(255,255,255,.06)}
.pn .cap{font:400 12.5px/1.5 system-ui,sans-serif;opacity:.6;margin:0 0 22px}
.pn .body p{font:400 18px/1.75 Georgia,"Times New Roman",serif;margin:0 0 18px}
.pn .more{display:inline-block;margin:4px 0 18px;padding:12px 18px;border:1px solid var(--accent2);border-radius:999px;text-decoration:none;font:800 11px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--accent2)}
.pn .hash{font:400 13px/1.7 system-ui,sans-serif;opacity:.7;margin:0 0 26px;word-break:break-word}
.pn .top{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:14px 0 18px;border-bottom:1px solid rgba(255,255,255,.14);margin:0 0 22px;font:700 11px/1.5 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase}
.pn .top a{text-decoration:none;opacity:.85}
.pn .top a:hover{opacity:1}
.pn .count{font:800 11px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin:0 0 6px}
`;

const KIND_HEADING = (lang) => ({
  kolumna: LABEL(lang).columns,
  autor: LABEL(lang).authored,
  kanal: LABEL(lang).explanations,
  objava: LABEL(lang).company
});

const hashtags = (item) => [
  '#AKTUALMEDIA',
  '#GNKASG',
  ...(/gnk\s*dinamo/i.test(`${item.title} ${item.description}`) ? ['#GNKDINAMOLtd'] : []),
  '#NerminSefić',
  ...(item.tags || [])
]
  .map((tag) => String(tag).startsWith('#') ? tag : `#${String(tag).replace(/[^\p{L}\p{N}]+/gu, '')}`)
  .filter((tag, index, list) => tag.length > 2 && list.indexOf(tag) === index)
  .slice(0, 9).join(' · ');

const graphScript = () => `<script type="application/ld+json" id="network-entity-v1">${entityGraphJson({ compact: true }).replace(/</g, '\\u003c')}</script>`;

function shell({ target, title, description, canonical, image, body, jsonld = '' }) {
  const L = LABEL(target.lang);
  const palette = target.palette || {};
  const vars = `--bg:${palette.bg || '#0b0d12'};--surface:${palette.surface || '#141a24'};--accent:${palette.accent || '#c8963c'};--accent2:${palette.accent2 || '#e0bd69'};--ink:${palette.ink || '#f2eee6'}`;
  const home = target.base;
  const dir = /^(ar|he|fa|ur)$/.test(target.lang) ? ' dir="rtl"' : '';

  return `<!doctype html>
<html lang="${target.lang}"${dir}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="${esc(home)}assets/favicon.svg" type="image/svg+xml">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="Nermin Sefić">
<meta name="editor" content="Nermin Sefić">
<link rel="canonical" href="${esc(canonical)}">
<link rel="author" href="https://gnk-asg.hr/nermin-sefic/">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(target.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${(image || target.ogImage) ? `<meta property="og:image" content="${esc(image || target.ogImage)}">\n<meta property="og:image:alt" content="${esc(title)}">` : ''}
<meta property="og:locale" content="${target.lang}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${(image || target.ogImage) ? `<meta name="twitter:image" content="${esc(image || target.ogImage)}">\n<meta name="twitter:image:alt" content="${esc(title)}">` : ''}
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<meta property="article:tag" content="#NerminSefić">
<style>:root{${vars}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:inherit}
${CSS}
${HOUSE_CSS}</style>
${graphScript()}
${jsonld}
${designTokensCss()}
</head>
<body>
<a class="skip" href="#sadrzaj">${esc(LABEL(target.lang).skip || 'Skip to content')}</a>
${houseRibbon({ lang: target.lang, edition: target.name })}
${meshBlock({ lang: target.lang, selfUrl: target.base, theme: 'dark' })}
<main id="sadrzaj">
<div class="pn">
  <nav class="top">
    <a href="${esc(home)}">${esc(target.name)}</a>
    <span><a href="${esc(home)}prenos/">${esc(L.nav)}</a> · <a href="https://gnk-asg.hr/gnk-aktual/">AKTUAL MEDIA</a> · <a href="https://gnk-asg.hr/nermin-sefic/">Nermin Sefić</a></span>
  </nav>
  ${body}
</div>
</main>
${refreshTag()}
</body>
</html>
`;
}

/* `prefix` je put do mape /prenos/img/ s trenutne stranice: s popisa je
   `img/`, s objave `../img/`. Bez toga slika autora gleda u prazno. */
const authorBox = (target, portrait, prefix = '/prenos/img/') => {
  const L = LABEL(target.lang);
  return `<div class="author">
    ${portrait ? `<img src="${prefix}nermin-sefic.webp" alt="Nermin Sefić" width="58" height="58" loading="lazy" decoding="async">` : ''}
    <div>
      <b><a href="https://gnk-asg.hr/nermin-sefic/">Nermin Sefić</a></b>
      <span>${esc(L.editor)} · AKTUAL MEDIA · GNK ASG d.o.o.</span>
    </div>
  </div>`;
};

function itemPage({ target, item, image, portrait }) {
  const L = LABEL(target.lang);
  const kind = (KIND_LABEL[item.kind] || KIND_LABEL.kolumna)[target.lang === 'hr' ? 'hr' : 'en'];
  const canonical = item.canonical;
  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: item.title,
    description: item.description,
    datePublished: item.published || undefined,
    inLanguage: 'hr',
    isBasedOn: canonical,
    author: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
    editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
    publisher: { '@id': 'https://gnk-asg.hr/#gnk-asg' },
    isAccessibleForFree: true,
    keywords: ['AKTUAL MEDIA', 'GNK ASG', 'Nermin Sefić', ...(item.tags || [])].join(', ')
  }).replace(/</g, '\\u003c')}</script>`;

  const body = `<p class="k">${esc(L.kicker)} · ${esc(kind)}</p>
  <h1>${esc(item.title)}</h1>
  ${item.description ? `<p class="lead">${esc(item.description)}</p>` : ''}
  <p class="meta">Nermin Sefić${item.published ? ` · ${esc(item.published)}` : ''} · ${esc(L.author)}</p>

  <div class="src">
    <b>${esc(L.source)}</b><br>
    ${esc(L.intro)}<br>
    <a href="${esc(canonical)}" rel="external noopener">${esc(canonical)}</a>
  </div>

  ${authorBox(target, portrait, '/prenos/img/')}

  ${image ? `<img class="hero" src="${esc(image)}" alt="${esc(item.title)}" loading="eager" fetchpriority="high" decoding="async">` : ''}
  ${image ? `<p class="cap">${esc(L.image)}</p>` : ''}

  <div class="body">
    ${item.paragraphs.map((text) => `<p>${esc(text)}</p>`).join('\n    ')}
  </div>

  <a class="more" href="${esc(canonical)}" rel="external noopener">${esc(L.read)}</a>

  <p class="hash">${esc(hashtags(item))}</p>`;

  return shell({
    target,
    title: `${item.title} — ${target.name}`,
    description: item.description || item.paragraphs[0] || item.title,
    canonical,
    image: image ? `${target.base}prenos/img/${image.split('/').pop()}` : (target.ogImage || ''),
    body,
    jsonld
  });
}

function indexPage({ target, items, portrait, columnBase }) {
  const L = LABEL(target.lang);
  const headings = KIND_HEADING(target.lang);
  const groups = ['kolumna', 'autor', 'objava', 'kanal']
    .map((kind) => ({ kind, list: items.filter((item) => item.kind === kind) }))
    .filter((group) => group.list.length);

  const sections = groups.map((group) => {
    const cards = group.list.map((item) => {
      const href = group.kind === 'kolumna' ? `${columnBase}${item.slug}/` : `/prenos/${item.slug}/`;
      return `      <a class="card" href="${esc(href)}">
        <b>${esc(item.title)}</b>
        <span>${esc((item.description || item.paragraphs[0] || '').slice(0, 165))}</span>
        <i>${esc(item.published || '')} · ${esc(headings[group.kind] || '')}</i>
      </a>`;
    }).join('\n');
    return `  <h2>${esc(headings[group.kind] || group.kind)} <span class="count">${group.list.length}</span></h2>
  <div class="grid">
${cards}
  </div>`;
  }).join('\n');

  const body = `<p class="k">${esc(L.kicker)}</p>
  <h1>${esc(L.title)}</h1>
  <p class="lead">${esc(L.lead)}</p>
  <p class="count">${items.length} ${esc(L.total)}</p>
  ${authorBox(target, portrait, '/prenos/img/')}
${sections}`;

  return shell({
    target,
    title: `${L.title} — ${target.name}`,
    description: L.lead,
    canonical: `${target.base}prenos/`,
    body
  });
}

/**
 * Napiši /prenos/ na jednom cilju.
 * target: { key, name, base, lang, outDir, palette, columnBase }
 */
export function writePrenos({ root, target, dryRun = false, columnBase = '/kolumna/' }) {
  const items = readCorpus(root).slice(0, MAX_ITEMS);
  if (!items.length) return { ok: false, reason: 'prazan korpus', pages: 0, images: 0 };

  const outDir = target.outDir;
  const imgDir = join(outDir, 'prenos', 'img');
  if (!dryRun) mkdirSync(imgDir, { recursive: true });

  let images = 0;
  let pages = 0;

  const portraitSource = authorPortrait(root);
  const portrait = Boolean(portraitSource);
  if (portraitSource && !dryRun && !existsSync(join(imgDir, 'nermin-sefic.webp'))) {
    copyFileSync(portraitSource, join(imgDir, 'nermin-sefic.webp'));
    images += 1;
  }

  /* Popis: jedan za sve zapise; kolumne vode na postojeću sekciju. */
  const indexHtml = indexPage({ target, items, portrait, columnBase });
  if (!dryRun) {
    mkdirSync(join(outDir, 'prenos'), { recursive: true });
    writeFileSync(join(outDir, 'prenos', 'index.html'), indexHtml);
  }
  pages += 1;

  for (const item of items) {
    /* Kolumne već imaju stranicu u /kolumna/ — ne stvaramo drugu. */
    if (item.kind === 'kolumna' && columnBase) continue;

    const dir = join(outDir, 'prenos', item.slug);
    if (!dryRun) mkdirSync(dir, { recursive: true });

    let local = '';
    const source = corpusImage(root, item);
    if (source) {
      const ext = source.slice(source.lastIndexOf('.')).toLowerCase();
      local = `/prenos/img/${item.slug}${ext}`;
      if (!dryRun) copyFileSync(source, join(imgDir, `${item.slug}${ext}`));
      images += 1;
    }

    if (!dryRun) writeFileSync(join(dir, 'index.html'), itemPage({ target, item, image: local, portrait }));
    pages += 1;
  }

  return { ok: true, pages, images, items: items.length };
}

/** Adrese za sitemap cilja. */
export function prenosUrls(root, target, columnBase = '/kolumna/') {
  const items = readCorpus(root).slice(0, MAX_ITEMS);
  return [
    { loc: `${target.base}prenos/`, priority: '0.6', changefreq: 'daily' },
    ...items.filter((item) => !(item.kind === 'kolumna' && columnBase))
      .map((item) => ({ loc: `${target.base}prenos/${item.slug}/`, priority: '0.5', changefreq: 'monthly' }))
  ];
}

/** Dodaj putokaz na naslovnicu cilja (ako ga nema). */
export function linkPrenosOnHome({ homeFile, lang, dryRun = false }) {
  if (!existsSync(homeFile)) return false;
  const html = readFileSync(homeFile, 'utf8');
  if (html.includes('href="prenos/"') || html.includes('href="/prenos/"')) return false;
  const label = LABEL(lang).nav;
  const block = `<a class="column-link" href="prenos/"><b>${esc(label)}</b> — Nermin Sefić · AKTUAL MEDIA</a>`;
  if (!dryRun) writeFileSync(homeFile, html.replace('<footer', `${block}\n<footer`));
  return true;
}

/** Stil za putokaz, ako ga stranica još nema. */
export const PRENOS_LINK_CSS = '.column-link{display:block;max-width:1100px;margin:0 auto 26px;padding:14px 18px;border:1px solid rgba(255,255,255,.16);border-radius:12px;text-decoration:none;color:inherit;font:700 13px/1.4 system-ui,sans-serif;background:rgba(255,255,255,.04)}.column-link b{color:var(--accent2)}';


/**
 * Popis naših tekstova kao veze na kanonske adrese — za domene na kojima se
 * puni prenos ne isplati. Gradska izdanja žive na istoj domeni kao i izvornik,
 * pa bi puna kopija bila dvostruki sadržaj; ovdje stoji naslov, datum i veza
 * na izvornik. Čitatelj dobiva isti popis, a tražilica samo jednu adresu.
 */
export function editorialIndexBlock({ root, lang = 'hr', limit = 8, headingId = 'nasi-tekstovi' } = {}) {
  const items = readCorpus(root).slice(0, limit);
  if (!items.length) return '';
  const en = lang === 'en';
  const heading = en ? 'Our latest texts' : 'Najnoviji naši tekstovi';
  const lead = en
    ? 'Columns, authored texts and explainers published by AKTUAL MEDIA. Every title opens its canonical page at the source.'
    : 'Kolumne, autorski tekstovi i pojašnjenja AKTUAL MEDIA. Svaki naslov vodi na kanonsku stranicu izvornika.';
  const rows = items.map((item) => `<li>
      <a href="${esc(item.canonical)}" rel="external noopener">${esc(item.title)}</a>
      <span class="am-our-meta">${esc(KIND_LABEL[item.kind]?.[en ? 'en' : 'hr'] || '')}${item.published ? ` · <time datetime="${esc(item.published)}">${esc(item.published)}</time>` : ''}</span>
    </li>`).join('\n    ');
  return `<section class="am-our" aria-labelledby="${esc(headingId)}">
  <h2 id="${esc(headingId)}">${esc(heading)}</h2>
  <p class="am-our-lead">${esc(lead)}</p>
  <ul class="am-our-list">
    ${rows}
  </ul>
</section>`;
}

export const EDITORIAL_INDEX_CSS = `
.am-our{max-width:var(--am-measure);margin:clamp(2.4rem,3.6vw,3.6rem) auto;padding-top:clamp(1.2rem,2vw,1.8rem);
  border-top:1px solid var(--am-line);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.am-our h2{margin:0 0 .3em;font-size:clamp(1.1rem,1.5vw,1.4rem)}
.am-our-lead{margin:0 0 1em;color:var(--am-muted);font-size:.92rem;max-width:62ch}
.am-our-list{list-style:none;margin:0;padding:0;display:grid;gap:.7rem}
.am-our-list li{display:grid;gap:.15rem;padding-bottom:.7rem;border-bottom:1px solid var(--am-line-soft)}
.am-our-list a{font-weight:600;line-height:1.35;text-decoration:none}
.am-our-list a:hover{color:var(--accent2,var(--am-gold));text-decoration:underline;text-underline-offset:.18em}
.am-our-meta{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--am-muted)}
`;

export { LABELS as PRENOS_LABELS };

/** Dodaj adrese u sitemap cilja bez duplikata. */
export function appendSitemap(sitemapFile, entries, dryRun = false) {
  if (!existsSync(sitemapFile)) return false;
  let xml = readFileSync(sitemapFile, 'utf8');
  const fresh = entries.filter((entry) => !xml.includes(`<loc>${entry.loc}</loc>`));
  if (!fresh.length) return false;
  const today = new Date().toISOString().slice(0, 10);
  const block = fresh.map((entry) => `  <url><loc>${entry.loc}</loc><lastmod>${today}</lastmod><changefreq>${entry.changefreq || 'monthly'}</changefreq><priority>${entry.priority || '0.5'}</priority></url>`).join('\n');
  if (!dryRun) writeFileSync(sitemapFile, xml.replace('</urlset>', `${block}\n</urlset>`));
  return true;
}
