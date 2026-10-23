/**
 * KOLUMNE NA SVJETSKIM IZDANJIMA — `kolumne v1`.
 *
 * Sefićev tekst nastaje na portalu na hrvatskom. Do sada je išao samo na
 * regionalnu mrežu (šest samostalnih stranica). Ovaj modul ga vodi i na
 * svjetska izdanja: Jakarta, Kairo, Tokio, Peking, Nairobi, New York,
 * São Paulo, Sydney i Singapur.
 *
 * Pravilo koje se ne mijenja: tekst se NE prevodi strojno i ne izmišlja se
 * lokalna inačica. Na svakom izdanju stoji izvorni hrvatski tekst, s uvodnim
 * redom na jeziku tog izdanja koji jasno kaže da je tekst izvorno hrvatski i
 * gdje je prvi objavljen. Tako čitatelj u Jakarti zna što gleda, a tražilica
 * zna koji je tekst matični (`rel=canonical` na izvornik).
 *
 * Izlaz po izdanju:
 *   /kolumne/                  popis, s opisom na jeziku izdanja
 *   /kolumne/<slug>/           zasebna objava, s lokalnom slikom i izvorom
 *
 * Slika se kopira u mapu objave: CSP izdanja dopušta vlastite slike.
 */
import { copyFileSync, mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readColumns, columnImagePath } from '../../../scripts/lib/kolumne-source-v1.mjs';
import { authorPortrait } from '../../../scripts/lib/corpus-v1.mjs';
import { meshBlock } from '../../satellites/lib/network-v1.mjs';
import { entityGraphJson } from '../../../scripts/lib/entity-graph-v1.mjs';

const MAX_COLUMNS = 40;

/* Uvodni red po jeziku izdanja. Kratko, točno i bez tvrdnje da je tekst
   preveden — jer nije. */
const FRAME = {
  en: {
    nav: 'Columns',
    kicker: 'Column · first published on AKTUAL MEDIA',
    title: 'Columns by Nermin Sefić',
    lead: 'Every text is written in Croatian and first published on AKTUAL MEDIA. It is republished here in the original language, with the source link and the original date.',
    intro: 'This column by Nermin Sefić was first published in Croatian on AKTUAL MEDIA. It is republished here in the original language, with the source link.',
    source: 'Source',
    read: 'Read the full text at the source',
    original: 'Original language: Croatian',
    image: 'Image from the source column, AKTUAL MEDIA.',
    list: 'All columns'
  },
  id: {
    nav: 'Kolom',
    kicker: 'Kolom · pertama terbit di AKTUAL MEDIA',
    title: 'Kolom Nermin Sefić',
    lead: 'Setiap teks ditulis dalam bahasa Kroasia dan pertama kali diterbitkan di AKTUAL MEDIA. Di sini teks tampil dalam bahasa aslinya, dengan tautan ke sumber dan tanggal asli.',
    intro: 'Kolom ini ditulis dalam bahasa Kroasia dan pertama kali diterbitkan di AKTUAL MEDIA. Teks asli ditampilkan dengan tautan ke sumbernya.',
    source: 'Sumber',
    read: 'Baca teks lengkap di sumber',
    original: 'Bahasa asli: Kroasia',
    image: 'Gambar dari kolom sumber, AKTUAL MEDIA.',
    list: 'Semua kolom'
  },
  pt: {
    nav: 'Colunas',
    kicker: 'Coluna · publicada primeiro na AKTUAL MEDIA',
    title: 'Colunas de Nermin Sefić',
    lead: 'Cada texto é escrito em croata e publicado primeiro na AKTUAL MEDIA. Aqui aparece no idioma original, com o link para a fonte e a data original.',
    intro: 'Esta coluna foi escrita em croata e publicada primeiro na AKTUAL MEDIA. O texto original aparece aqui com o link para a fonte.',
    source: 'Fonte',
    read: 'Ler o texto completo na fonte',
    original: 'Idioma original: croata',
    image: 'Imagem da coluna original, AKTUAL MEDIA.',
    list: 'Todas as colunas'
  },
  ar: {
    nav: 'أعمدة',
    kicker: 'عمود · نُشر أولاً على AKTUAL MEDIA',
    title: 'أعمدة نرمين سيفيتش',
    lead: 'كل نص مكتوب بالكرواتية ويُنشر أولاً على AKTUAL MEDIA. يُعاد نشره هنا باللغة الأصلية مع رابط المصدر والتاريخ الأصلي.',
    intro: 'هذا العمود مكتوب باللغة الكرواتية ونُشر أولاً على AKTUAL MEDIA، ويُعاد نشره هنا مع رابط المصدر.',
    source: 'المصدر',
    read: 'اقرأ النص الكامل في المصدر',
    original: 'اللغة الأصلية: الكرواتية',
    image: 'الصورة من العمود الأصلي، AKTUAL MEDIA.',
    list: 'كل الأعمدة'
  },
  ja: {
    nav: 'コラム',
    kicker: 'コラム · AKTUAL MEDIA 初出',
    title: 'ネルミン・セフィッチのコラム',
    lead: 'すべてのテキストはクロアチア語で書かれ、AKTUAL MEDIA で最初に公開されます。ここでは原文のまま、出典へのリンクと元の日付とともに掲載します。',
    intro: 'このコラムはクロアチア語で書かれ、AKTUAL MEDIA で最初に公開されました。原文のまま、出典へのリンクとともに掲載しています。',
    source: '出典',
    read: '出典で全文を読む',
    original: '原文の言語：クロアチア語',
    image: '画像は出典コラム（AKTUAL MEDIA）より。',
    list: 'すべてのコラム'
  },
  zh: {
    nav: '专栏',
    kicker: '专栏 · 首发于 AKTUAL MEDIA',
    title: '内尔明·塞菲奇专栏',
    lead: '所有文章均以克罗地亚语撰写，并首先发表于 AKTUAL MEDIA。此处保留原文，并附来源链接与原始日期。',
    intro: '本专栏以克罗地亚语撰写，最初发表于 AKTUAL MEDIA。此处保留原文，并附来源链接。',
    source: '来源',
    read: '在来源处阅读全文',
    original: '原文语言：克罗地亚语',
    image: '图片来自来源专栏，AKTUAL MEDIA。',
    list: '全部专栏'
  }
};

const frame = (portal) => FRAME[portal.lang] || FRAME.en;

/* Navigacija izdanja piše relativne adrese (izvori/, mreza/). Na stranici
   koja je dvije razine duboko to vodi u prazno, pa se za te stranice adrese
   prevode u apsolutne. */
const absoluteLinks = (html) => html
  .replace(/href="(izvori|metodologija|mreza|kolumne|tema)\/"/g, 'href="/$1/"')
  .replace(/href=""([^>]*)>(?=[^<]*)/g, 'href="/"$1>')
  .replace(/href="\.\/"/g, 'href="/"')
  .replace(/src="assets\//g, 'src="/assets/');

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const shortDate = (iso, lang) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

const CSS = `
.kx{max-width:900px;margin:0 auto;padding:34px 20px 10px}
.kx .kickerx{font:800 11px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--accent2);margin:0 0 12px}
.kx h1{font:800 clamp(28px,4vw,42px)/1.1 system-ui,sans-serif;margin:0 0 14px}
.kx .leadx{font:400 18px/1.6 system-ui,sans-serif;opacity:.85;margin:0 0 22px;max-width:70ch}
.kx .note{display:block;margin:0 0 26px;padding:13px 16px;border:1px solid rgba(255,255,255,.16);border-inline-start:3px solid var(--accent2);border-radius:10px;font:400 14px/1.6 system-ui,sans-serif;background:rgba(255,255,255,.04)}
.kx .note a{color:var(--accent2);text-decoration:none;border-bottom:1px solid currentColor}
.kx .gridx{display:grid;gap:16px;margin:0 0 30px}
@media(min-width:720px){.kx .gridx{grid-template-columns:1fr 1fr}}
.kx .cardx{display:block;text-decoration:none;color:inherit;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px 20px;background:rgba(255,255,255,.03)}
.kx .cardx b{display:block;font:700 19px/1.3 system-ui,sans-serif;margin:0 0 8px}
.kx .cardx span{display:block;font:400 14px/1.55 system-ui,sans-serif;opacity:.75}
.kx .cardx i{display:block;margin-top:10px;font:700 10.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;font-style:normal;color:var(--accent2)}
.kx article{padding:0 0 10px}
.kx .metax{font:700 11px/1.6 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;opacity:.62;margin:0 0 18px}
.kx .herox{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:14px;display:block;margin:0 0 8px;background:rgba(255,255,255,.06)}
.kx .capx{font:400 12.5px/1.5 system-ui,sans-serif;opacity:.6;margin:0 0 24px}
.kx .bodyx p{font:400 18px/1.75 Georgia,"Times New Roman",serif;margin:0 0 18px}
.kx .morex{display:inline-block;margin:6px 0 20px;padding:12px 18px;border:1px solid var(--accent2);border-radius:999px;text-decoration:none;font:800 11px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--accent2)}
.kx .hashx{font:400 13px/1.7 system-ui,sans-serif;opacity:.7;margin:0 0 30px;word-break:break-word}
.kx .authorx{display:flex;gap:13px;align-items:center;border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:11px 14px;background:rgba(255,255,255,.04);margin:0 0 22px}
.kx .authorx img{width:54px;height:54px;border-radius:50%;object-fit:cover;flex:0 0 auto}
.kx .authorx b{display:block;font:800 14.5px/1.3 system-ui,sans-serif}
.kx .authorx b a{text-decoration:none;color:inherit}
.kx .authorx span{display:block;font:400 12px/1.45 system-ui,sans-serif;opacity:.7}
.column-link{display:block;max-width:1100px;margin:0 auto 26px;padding:14px 18px;border:1px solid rgba(255,255,255,.16);border-radius:12px;text-decoration:none;color:inherit;font:700 13px/1.4 system-ui,sans-serif;background:rgba(255,255,255,.04)}
.column-link:hover{border-color:var(--accent2)}
.column-link b{color:var(--accent2)}
`;

const hashtagsOf = (column) => [
  '#AKTUALMEDIA', '#GNKASG', '#NerminSefić',
  ...column.tags.map((tag) => `#${String(tag).replace(/[^\p{L}\p{N}]+/gu, '')}`).filter((tag) => tag.length > 2)
].join(' · ');

/** Jedna objava na jednom izdanju. */
function itemPage({ portal, column, image, shell, header, footer, path, style, portrait = false }) {
  const f = frame(portal);
  const date = shortDate(column.published, portal.lang);

  const body = `${absoluteLinks(header(portal, 'kolumne/'))}
<main id="sadrzaj">
<div class="kx">
  <style>${style}${CSS}</style>
  <p class="kickerx">${esc(f.kicker)}</p>
  <h1>${esc(column.title)}</h1>
  ${column.description ? `<p class="leadx">${esc(column.description)}</p>` : ''}
  <p class="metax">Nermin Sefić${date ? ` · ${esc(date)}` : ''} · ${esc(f.original)}</p>

  <div class="note">
    <b>${esc(f.source)}</b><br>
    ${esc(f.intro)}<br>
    <a href="${esc(column.canonical)}" rel="external noopener">${esc(column.canonical)}</a>
  </div>

  <div class="authorx">
    ${portrait ? `<img src="../img/nermin-sefic.webp" alt="Nermin Sefić" width="54" height="54" loading="lazy" decoding="async">` : ''}
    <div>
      <b><a href="https://gnk-asg.hr/nermin-sefic/">Nermin Sefić</a></b>
      <span>AKTUAL MEDIA · GNK ASG d.o.o.</span>
    </div>
  </div>

  <article>
    ${image ? `<img class="herox" src="${esc(image)}" alt="${esc(column.title)}" loading="eager" fetchpriority="high" decoding="async">` : ''}
    ${image ? `<p class="capx">${esc(f.image)}</p>` : ''}
    <div class="bodyx">
      ${column.paragraphs.map((text) => `<p>${esc(text)}</p>`).join('\n      ')}
    </div>
    <a class="morex" href="${esc(column.canonical)}" rel="external noopener">${esc(f.read)}</a>
    <p class="hashx">${esc(hashtagsOf(column))}</p>
  </article>
</div>
</main>
${meshBlock({ lang: portal.lang, selfUrl: portal.base, theme: 'dark' })}
${absoluteLinks(footer(portal))}`;

  const page = shell(portal, {
    title: `${column.title} — ${portal.name}`,
    description: column.description || column.paragraphs[0] || column.title,
    path,
    body,
    jsonld: [{
      '@type': 'NewsArticle',
      headline: column.title,
      description: column.description,
      datePublished: column.published || undefined,
      inLanguage: 'hr',
      isBasedOn: column.canonical,
      author: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
      editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
      publisher: { '@id': 'https://gnk-asg.hr/#aktual-media' },
      isAccessibleForFree: true,
      keywords: ['AKTUAL MEDIA', 'GNK ASG', 'Nermin Sefić', ...column.tags].join(', ')
    }]
  });

  /* Canonical ide na izvornik, ne na ovu kopiju: tražilica mora znati gdje
     je tekst prvi objavljen, inače deset domena konkurira jedna drugoj. */
  return page
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(column.canonical)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(column.canonical)}">`)
    .replace('name="author" content="AKTUAL MEDIA d.o.o."', 'name="author" content="Nermin Sefić"');

}

/** Popis kolumni na jednom izdanju. */
function listPage({ portal, columns, shell, header, footer, style, portrait = false }) {
  const f = frame(portal);
  const cards = columns.map((column) => {
    const date = column.published ? new Date(column.published).toISOString().slice(0, 10) : '';
    return `    <a class="cardx" href="${esc(column.slug)}/">
      <b>${esc(column.title)}</b>
      <span>${esc((column.description || column.paragraphs[0] || '').slice(0, 170))}</span>
      <i>${esc(date)} · ${esc(f.original)}</i>
    </a>`;
  }).join('\n');

  const body = `${absoluteLinks(header(portal, 'kolumne/'))}
<main id="sadrzaj">
<div class="kx">
  <style>${style}${CSS}</style>
  <p class="kickerx">${esc(f.kicker)}</p>
  <h1>${esc(f.title)}</h1>
  <p class="leadx">${esc(f.lead)}</p>
  <div class="authorx">
    ${portrait ? `<img src="img/nermin-sefic.webp" alt="Nermin Sefić" width="54" height="54" loading="lazy" decoding="async">` : ''}
    <div>
      <b><a href="https://gnk-asg.hr/nermin-sefic/">Nermin Sefić</a></b>
      <span>AKTUAL MEDIA · GNK ASG d.o.o.</span>
    </div>
  </div>
  <div class="gridx">
${cards}
  </div>
</div>
</main>
${meshBlock({ lang: portal.lang, selfUrl: portal.base, theme: 'dark' })}
${absoluteLinks(footer(portal))}`;

  return shell(portal, {
    title: `${f.title} — ${portal.name}`,
    description: f.lead,
    path: 'kolumne/',
    body,
    jsonld: [{
      '@type': 'CollectionPage',
      name: f.title,
      description: f.lead,
      inLanguage: portal.lang,
      about: { '@id': 'https://gnk-asg.hr/gnk-aktual/#aktual-media' }
    }]
  });
}

/**
 * Napiši kolumne na jedno izdanje.
 * `shell` i `writePage` dolaze iz build.mjs (bez kružnog uvoza).
 */
export function writeColumns(portal, { root, shell, header, footer, writePage, style = '' }) {
  const columns = readColumns(root, { max: MAX_COLUMNS });
  if (!columns.length) return { count: 0, dir: 'kolumne' };

  /* Slika autora, lokalno kopirana: CSP izdanja dopušta samo vlastite slike. */
  const portraitSource = authorPortrait(root);
  let portrait = false;
  if (portraitSource) {
    const imgDir = join(root, 'apps', 'world', 'site', portal.id, 'kolumne', 'img');
    mkdirSync(imgDir, { recursive: true });
    copyFileSync(portraitSource, join(imgDir, 'nermin-sefic.webp'));
    portrait = true;
  }

  writePage('kolumne/index.html', listPage({ portal, columns, shell, header, footer, style, portrait }));

  for (const column of columns) {
    const dir = `kolumne/${column.slug}`;
    const abs = join(root, 'apps', 'world', 'site', portal.id, dir);
    mkdirSync(abs, { recursive: true });

    let image = '';
    const source = columnImagePath(root, column);
    if (source) {
      const ext = source.slice(source.lastIndexOf('.')).toLowerCase();
      copyFileSync(source, join(abs, `slika${ext}`));
      image = `slika${ext}`;
    }
    writePage(`${dir}/index.html`, itemPage({ portal, column, image, shell, header, footer, path: `${dir}/`, style, portrait }));
  }

  return { count: columns.length, dir: 'kolumne' };
}

/** Natpis za navigaciju izdanja. */
export const columnsNavLabel = (portal) => frame(portal).nav;

/** Adrese kolumni za sitemap i feed. */
export function columnUrls(root, portal) {
  return readColumns(root, { max: MAX_COLUMNS }).map((column) => ({
    loc: `${portal.base}kolumne/${column.slug}/`,
    lastmod: column.published ? String(column.published).slice(0, 10) : new Date().toISOString().slice(0, 10)
  }));
}

/** Entitetski graf za stranice kolumni (isti čvorovi kao na matici). */
export const columnsEntityGraph = () => entityGraphJson({ compact: true }).replace(/</g, '\\u003c');

/** Dodaj putokaz na naslovnicu izdanja ako ga još nema. */
export function linkFromHome(portal, homeFile, label) {
  if (!existsSync(homeFile)) return false;
  const html = readFileSync(homeFile, 'utf8');
  if (html.includes('class="column-link"')) return false;
  const block = `<a class="column-link" href="kolumne/"><b>${esc(label)}</b> — Nermin Sefić · AKTUAL MEDIA</a>`;
  writeFileSync(homeFile, html.replace('<footer', `${block}\n<footer`));
  return true;
}
