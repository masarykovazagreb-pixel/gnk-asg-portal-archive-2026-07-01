#!/usr/bin/env node
/**
 * SVJETSKA IZDANJA — generator devet samostalnih portala.
 *
 * Ulaz:  apps/world/lib/registry.mjs  (devet gradova izvan regije)
 *        apps/region/data/<grad>.json (zapisi koje svakodnevno piše region engine)
 *        apps/region/engine/build.mjs (CSS i tipografija — isto izdanje, ista kuća)
 * Izlaz: apps/world/site/<grad>/      (svaka mapa je samostalna stranica)
 *
 * Što portal jest: ulaz u svjetsko izdanje. Pregled po temama i izvorima,
 * s izravnim linkom na svaki osvrt i svaki izvornik. Puni tekstovi ostaju
 * na gnk-asg.hr/kanal/<grad>/ — portal ih ne kopira, pa nema dvostrukog
 * sadržaja među domenama, a čitatelj s portala uvijek dođe do izvora.
 *
 * Što portal ima: vlastiti sitemap, RSS i JSON feed, robots.txt, llms.txt,
 * manifest, sigurnosna zaglavlja i blok mreže s dvadeset ulaza u maticu.
 *
 * Pokretanje:
 *   node apps/world/build.mjs                 svih devet portala
 *   node apps/world/build.mjs --only tokio    jedan portal
 *   WORLD_OUT=/tmp/world node apps/world/build.mjs --only kairo
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { esc, longDate, shortDate, truncate, safeJson } from '../region/engine/lib.mjs';
import { t } from '../region/src/strings.mjs';
import { chromeOf } from '../region/src/chrome.mjs';
import { NETWORK_PRODUCTS } from '../shared/network-products-v1.mjs';import { CSS } from '../region/engine/build.mjs';
import { logoFor, channelLogoSlug } from '../region/engine/brand.mjs';
import { designTokensCss } from '../shared/design-system-v1.mjs';
import { FAVICON_SVG } from '../shared/brand/brand-mark-v1.mjs';
import { meshBlock, MESH_CSS } from '../satellites/lib/network-v1.mjs';
import { HOUSE_CSS, houseRibbon } from '../satellites/lib/house-style-v1.mjs';
import { exchangeBlock, writeExchangeJson, EXCHANGE_CSS } from '../satellites/lib/razmjena-v1.mjs';
import { spiderWeb, SPIDER_CSS } from '../satellites/lib/spiderweb-v1.mjs';
import { WORLD_PORTALS, WORLD_BY_ID, portalBase, portalUrl, reviewUrl, HUB_HR, HUB_EN, MAIN, AKTUAL } from './lib/registry.mjs';
import { writeColumns, columnsNavLabel, columnUrls, linkFromHome } from './lib/kolumne.mjs';
import { writePrenos, prenosUrls, appendSitemap, linkPrenosOnHome } from '../../scripts/lib/prenos-v1.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
/* Svaki svjetski portal pripada zemlji; zemlja se pokriva iz svoje
   prijestolnice (ili iz grada koji je pokriva dok prijestolnica čeka izvore).
   Veza ide na stranicu prijestolnice, na jeziku portala kad ta stranica
   postoji — inače na hrvatsku. */
const CAPITALS = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'capitals.json'), 'utf8')).capitals || [];
const CAPITAL_LABEL = { hr: 'Glavni grad', en: 'Capital', pt: 'Capital', id: 'Ibu kota', ar: 'العاصمة', ja: '首都', zh: '首都', sw: 'Mji mkuu' };
const capitalForPortal = (portal) => CAPITALS.find((c) => c.edition === portal.id) || CAPITALS.find((c) => c.seats === portal.id) || null;
const DATA = join(ROOT, 'apps', 'region', 'data');
const BRAND = join(ROOT, 'apps', 'portal', 'assets', 'brand');
const OUT = process.env.WORLD_OUT ? resolve(process.env.WORLD_OUT) : join(HERE, 'site');
const TODAY = new Date().toISOString().slice(0, 10);
const RTL = new Set(['ar', 'he', 'fa', 'ur']);
const CONTACT = 'info@gnk-asg.hr';

/* Atlas grafika: jedna ilustracija po izdanju, s alt tekstom koji je dio
   manifesta (nikad izmišljen u šabloni). Ako grafike nema, hero je izostavljen
   — portalu je bolje bez slike nego sa slikom bez opisa. */
const ATLAS = JSON.parse(readFileSync(join(ROOT, 'apps', 'portal', 'data', 'atlas-art-v1.json'), 'utf8'));
const atlasFor = (id) => ATLAS.images.find((image) => image.slug === id) || null;
const atlasEdition = (portal) => {
  const image = atlasFor(portal.id);
  if (!image) return '';
  /* Alt na jeziku izdanja: ime grada dolazi iz registra, opis iz jezičnog
     paketa. Manifest nosi hrvatski i engleski opis kao rezervu. */
  const chrome = chromeOf(portal.lang);
  const alt = chrome.artAlt ? chrome.artAlt(displayCity(portal)) : (image.alt[portal.lang] || image.alt.en);
  const note = chrome.artNote || (image.note && (image.note[portal.lang] || image.note.en)) || '';
  return `<figure class="hero-art">
    <img src="https://gnk-asg.hr${image.src}" srcset="https://gnk-asg.hr${image.src.replace('-1600', '-800')} 800w, https://gnk-asg.hr${image.src} 1600w" sizes="(max-width: 760px) 100vw, 1080px" alt="${esc(alt)}" width="${image.width}" height="${image.height}" loading="eager" decoding="async" fetchpriority="high">
    <figcaption>${esc(note)}</figcaption>
  </figure>`;
};

/* Portal-specifican tekst. Opći natpisi dolaze iz apps/region/src/strings.mjs
   (isti prijevodi koje koristi izdanje), a ovo su rečenice koje postoje samo
   na svjetskom portalu. Za jezike bez vlastitog paketa koristi se engleski —
   nikad se ne izmišlja prijevod u letu. */
const W = {
  hr: {
    kicker: 'AKTUAL MEDIA · svjetska izdanja',
    worldEdition: 'Svjetsko izdanje',
    readReview: 'Pročitaj osvrt na gnk-asg.hr',
    original: 'Izvornik',
    portalNote: 'Ovo je ulaz u svjetsko izdanje. Puni osvrti, arhiva i pretraga stoje na gnk-asg.hr; ovdje je pregled po temama i izvorima, s izravnim linkom na svaki osvrt i izvornik.',
    sourcesNote: 'Popis medija koje ovo izdanje stvarno čita. Svaki zapis nosi poveznicu na izvornik i datum objave.',
    sourceRecords: 'zapisa',
    network: 'Mreža',
    portalsTitle: 'Svjetska izdanja',
    allNetwork: 'Cijela mreža — 20 ulaza i svi portali',
    english: 'English overview',
    backHome: 'Natrag na naslovnicu',
    leadLabel: 'Vodeći osvrt',
    noRecords: 'Izvor u ovom ciklusu nije dao zapise. Izdanje ne izmišlja — objavljuje ono što je stvarno pronađeno.',
    feedsTitle: 'Pretplatite se',
    feedNote: 'RSS i JSON feed nose iste zapise kao stranica; svaki vodi na osvrt na gnk-asg.hr.',
    worldNote: 'Devet svjetskih izdanja pokriva pet kontinenata: Afriku, Aziju, Sjevernu Ameriku, Južnu Ameriku i Oceaniju. Svako ima vlastitu adresu, sitemap i feed, a sva vraćaju link na maticu.',
    language: 'Jezik izdanja',
    spiderTitle: 'Paukova mreža'
  },
  en: {
    kicker: 'AKTUAL MEDIA · world editions',
    worldEdition: 'World edition',
    readReview: 'Read the review on gnk-asg.hr',
    original: 'Original',
    portalNote: 'This is the entrance to a world edition. The full reviews, the archive and search live on gnk-asg.hr; here is the view by theme and by source, with a direct link to every review and every original.',
    sourcesNote: 'The outlets this edition actually reads. Every record carries a link to the original and its publication date.',
    sourceRecords: 'records',
    network: 'Network',
    portalsTitle: 'World editions',
    allNetwork: 'The whole network — 20 entrances and every portal',
    english: 'English overview',
    backHome: 'Back to the front page',
    leadLabel: 'Lead review',
    noRecords: 'The source produced no records in this cycle. The edition does not invent — it publishes what was actually found.',
    feedsTitle: 'Subscribe',
    feedNote: 'The RSS and JSON feeds carry the same records as the page; each one leads to the review on gnk-asg.hr.',
    worldNote: 'Nine world editions cover five continents: Africa, Asia, North America, South America and Oceania. Each has its own address, sitemap and feed, and every one links back to the parent site.',
    language: 'Edition language',
    spiderTitle: 'The spider web'
  },
  id: {
    kicker: 'AKTUAL MEDIA · edisi dunia',
    worldEdition: 'Edisi dunia',
    readReview: 'Baca tinjauan di gnk-asg.hr',
    original: 'Sumber asli',
    portalNote: 'Ini pintu masuk edisi dunia. Tinjauan lengkap, arsip dan pencarian ada di gnk-asg.hr; di sini tampilan menurut tema dan sumber, dengan tautan langsung ke setiap tinjauan dan sumber asli.',
    sourcesNote: 'Media yang benar-benar dibaca edisi ini. Setiap catatan membawa tautan ke sumber asli dan tanggal terbit.',
    sourceRecords: 'catatan',
    network: 'Jaringan',
    portalsTitle: 'Edisi dunia',
    allNetwork: 'Seluruh jaringan — 20 pintu masuk dan semua portal',
    english: 'Ringkasan bahasa Inggris',
    backHome: 'Kembali ke halaman depan',
    leadLabel: 'Tinjauan utama',
    noRecords: 'Sumber tidak menghasilkan catatan pada siklus ini. Edisi tidak mengarang — yang terbit adalah apa yang benar-benar ditemukan.',
    feedsTitle: 'Berlangganan',
    feedNote: 'Feed RSS dan JSON membawa catatan yang sama seperti halaman; setiap catatan menuju tinjauan di gnk-asg.hr.',
    worldNote: 'Sembilan edisi dunia mencakup lima benua: Afrika, Asia, Amerika Utara, Amerika Selatan dan Oseania. Setiap edisi punya alamat, sitemap dan feed sendiri, dan semuanya menautkan kembali ke situs induk.',
    language: 'Bahasa edisi',
    spiderTitle: 'Jaring laba-laba'
  },
  pt: {
    kicker: 'AKTUAL MEDIA · edições mundiais',
    worldEdition: 'Edição mundial',
    readReview: 'Ler a análise em gnk-asg.hr',
    original: 'Original',
    portalNote: 'Esta é a entrada de uma edição mundial. As análises completas, o arquivo e a busca ficam em gnk-asg.hr; aqui está a visão por tema e por fonte, com link direto para cada análise e cada original.',
    sourcesNote: 'Os veículos que esta edição realmente lê. Cada registro traz um link para o original e a data de publicação.',
    sourceRecords: 'registos',
    network: 'Rede',
    portalsTitle: 'Edições mundiais',
    allNetwork: 'A rede inteira — 20 entradas e todos os portais',
    english: 'Visão geral em inglês',
    backHome: 'Voltar à primeira página',
    leadLabel: 'Análise principal',
    noRecords: 'A fonte não produziu registos neste ciclo. A edição não inventa — publica o que foi realmente encontrado.',
    feedsTitle: 'Subscrever',
    feedNote: 'Os feeds RSS e JSON trazem os mesmos registos da página; cada um leva à análise em gnk-asg.hr.',
    worldNote: 'Nove edições mundiais cobrem cinco continentes: África, Ásia, América do Norte, América do Sul e Oceânia. Cada uma tem endereço, sitemap e feed próprios, e todas ligam de volta ao site principal.',
    language: 'Idioma da edição',
    spiderTitle: 'A teia'
  },
  ar: {
    kicker: 'AKTUAL MEDIA · طبعات عالمية',
    worldEdition: 'طبعة عالمية',
    readReview: 'اقرأ المراجعة على gnk-asg.hr',
    original: 'المصدر الأصلي',
    portalNote: 'هذا مدخل إلى طبعة عالمية. المراجعات الكاملة والأرشيف والبحث على gnk-asg.hr؛ وهنا عرض حسب الموضوع والمصدر، مع رابط مباشر لكل مراجعة وأصل.',
    sourcesNote: 'الوسائل التي تقرأها هذه الطبعة فعلاً. كل سجل يحمل رابطاً إلى الأصل وتاريخ النشر.',
    sourceRecords: 'سجلات',
    network: 'الشبكة',
    portalsTitle: 'طبعات عالمية',
    allNetwork: 'الشبكة كاملة — 20 مدخلاً وكل البوابات',
    english: 'نظرة عامة بالإنجليزية',
    backHome: 'العودة إلى الصفحة الأولى',
    leadLabel: 'المراجعة الرئيسية',
    noRecords: 'لم ينتج المصدر سجلات في هذه الدورة. الطبعة لا تختلق — تنشر ما وُجد فعلاً.',
    feedsTitle: 'الاشتراك',
    feedNote: 'تغذيتا RSS وJSON تحملان السجلات نفسها؛ كل سجل يقود إلى المراجعة على gnk-asg.hr.',
    worldNote: 'تغطي تسع طبعات عالمية خمس قارات: أفريقيا وآسيا وأمريكا الشمالية وأمريكا الجنوبية وأوقيانوسيا. لكل طبعة عنوانها وخريطة موقعها وتغذيتها، وكلها تعود بالرابط إلى الموقع الأم.',
    language: 'لغة الطبعة',
    spiderTitle: 'شبكة العنكبوت'
  },
  ja: {
    kicker: 'AKTUAL MEDIA · 世界版',
    worldEdition: '世界版',
    readReview: 'gnk-asg.hr でレビューを読む',
    original: '原文',
    portalNote: 'これは世界版への入口です。全文のレビュー、アーカイブ、検索は gnk-asg.hr にあります。ここではテーマ別・提供元別の一覧と、各レビュー・原文への直接リンクを掲載します。',
    sourcesNote: 'この版が実際に読んでいる媒体の一覧です。各記録には原文へのリンクと公開日が付きます。',
    sourceRecords: '件',
    network: 'ネットワーク',
    portalsTitle: '世界版',
    allNetwork: 'ネットワーク全体 — 20の入口とすべてのポータル',
    english: '英語版の概要',
    backHome: 'トップページに戻る',
    leadLabel: '主要レビュー',
    noRecords: 'このサイクルでは記録がありませんでした。版は作り話をせず、実際に見つかったものだけを掲載します。',
    feedsTitle: '購読',
    feedNote: 'RSS と JSON のフィードはページと同じ記録を配信し、それぞれが gnk-asg.hr のレビューへ導きます。',
    worldNote: '9つの世界版が5つの大陸をカバーします。アフリカ、アジア、北アメリカ、南アメリカ、オセアニア。各版は独自のアドレス、サイトマップ、フィードを持ち、すべてが親サイトへリンクします。',
    language: '版の言語',
    spiderTitle: '蜘蛛の巣'
  },
  zh: {
    kicker: 'AKTUAL MEDIA · 世界版',
    worldEdition: '世界版',
    readReview: '在 gnk-asg.hr 阅读评论',
    original: '原文',
    portalNote: '这是世界版的入口。完整评论、存档与搜索都在 gnk-asg.hr；这里按主题和来源浏览，并直接链接到每条评论和原文。',
    sourcesNote: '本版实际阅读的媒体。每条记录都附有原文链接和发布日期。',
    sourceRecords: '条记录',
    network: '网络',
    portalsTitle: '世界版',
    allNetwork: '整个网络 — 20 个入口和全部门户',
    english: '英文概览',
    backHome: '返回首页',
    leadLabel: '头条评论',
    noRecords: '本轮来源没有产生记录。本版不编造——只发布真实找到的内容。',
    feedsTitle: '订阅',
    feedNote: 'RSS 和 JSON 订阅与页面内容一致，每条都通往 gnk-asg.hr 上的评论。',
    worldNote: '九个世界版覆盖五大洲：非洲、亚洲、北美洲、南美洲和大洋洲。每个版本都有自己的地址、站点地图和订阅源，并全部链接回主站。',
    language: '版本语言',
    spiderTitle: '蛛网'
  }
};

/* Navigacijske riječi koje nisu dio sadržaja izdanja. */
const CHROME = {
  hr: { skip: 'Preskoči na sadržaj', nav: 'Glavna navigacija', crumbs: 'Putanja' },
  en: { skip: 'Skip to content', nav: 'Main navigation', crumbs: 'Breadcrumb' },
  id: { skip: 'Lewati ke konten', nav: 'Navigasi utama', crumbs: 'Remah roti' },
  pt: { skip: 'Pular para o conteúdo', nav: 'Navegação principal', crumbs: 'Trilha de navegação' },
  ar: { skip: 'تخطَّ إلى المحتوى', nav: 'التنقل الرئيسي', crumbs: 'مسار التنقل' },
  ja: { skip: '本文へスキップ', nav: 'メインナビゲーション', crumbs: 'パンくず' },
  zh: { skip: '跳到正文', nav: '主导航', crumbs: '面包屑导航' }
};
const chrome = (portal) => CHROME[portal.lang] || CHROME.en;

const displayCity = (portal) => portal.cityNative || portal.city;
const wl = (portal, key) => (W[portal.lang] || W.en)[key] ?? W.en[key];
const continentName = (portal) => portal.continent[portal.lang === 'hr' ? 'hr' : 'en'];
const cityLabel = (portal) => (portal.lang === 'hr' ? portal.city : (portal.cityEn || portal.city));
const ui = (portal) => t(portal.lang).ui;

const write = (file, body) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
};

const loadData = (portal) => {
  const file = join(DATA, `${portal.id}.json`);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const items = [...(data.items || [])]
    .filter((item) => item && item.slug && item.title)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { ...data, items };
};

/* ---------- dijelovi stranice ---------- */

const themeOf = (item) => item.theme || 'drustvo';

function header(portal, active = '') {
  const words = ui(portal);
  const logo = logoFor(channelLogoSlug(portal.id));
  const nav = [
    ['', words.latest],
    ['izvori/', words.sources],
    ['metodologija/', words.methodology],
    ['mreza/', wl(portal, 'network')],
    ['kolumne/', columnsNavLabel(portal)]
  ].map(([href, label]) => `<a href="${href}"${href === active ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');

  return `<header class="top">
  <div class="topbar"><span>${esc(wl(portal, 'worldEdition'))} · ${esc(continentName(portal))}</span><a class="topback" href="${AKTUAL}" rel="external noopener">← AKTUAL MEDIA</a></div>
  <div class="masthead">
    <div class="brand">
      ${logo ? `<a class="ed-logo" href="./" aria-label="${esc(portal.name)} — ${esc(wl(portal, 'backHome'))}"><img src="assets/brand.webp" alt="${esc(portal.name)}" width="244" height="70" loading="eager" decoding="async" fetchpriority="high"></a>` : ''}
      <span class="kicker">${esc(portal.countryNative)} · ${esc(portal.cityNative)}</span>
      <a class="logo" href="./">${esc(portal.name)}</a>
      <p class="strap">${esc(words.aboutText)}</p>
    </div>
    <div class="mastmeta">
      <span>${esc(words.editor)}: <strong>Nermin Sefić</strong></span>
      <span>${esc(words.publisher)}: AKTUAL MEDIA d.o.o.</span>
      <span>${esc(wl(portal, 'language'))}: ${esc(portal.locale)}</span>
      ${portal.lang === 'en' ? '' : `<a href="${portal.englishBase}" hreflang="en" lang="en" rel="external noopener">${esc(wl(portal, 'english'))} ↗</a>`}
    </div>
  </div>
  <nav class="mainnav" aria-label="${esc(chrome(portal).nav)}">${nav}</nav>
</header>`;
}

function footer(portal) {
  const words = ui(portal);
  const others = WORLD_PORTALS.filter((item) => item.id !== portal.id);
  const links = others.map((item) => `<a href="${portalBase(item)}/" rel="external noopener" hreflang="${item.lang}" lang="${item.lang}">${esc(item.label[portal.lang === 'hr' ? 'hr' : 'en'])}</a>`).join('');
  const tags = [...new Set([...portal.hashtags, '#AktualMedia', '#GNKASG'])].map((tag) => `<li class="tag">${esc(tag)}</li>`).join('');
  const capital = capitalForPortal(portal);
  const capitalEn = portal.lang === 'en';
  const capitalHref = capital
    ? `https://gnk-asg.hr/${capitalEn ? 'en/capitals' : 'glavni-gradovi'}/${capital.slug}/`
    : '';
  const capitalLink = capital
    ? `<a href="${capitalHref}" rel="external noopener" hreflang="${capitalEn ? 'en' : 'hr'}">${esc(CAPITAL_LABEL[portal.lang] || CAPITAL_LABEL.en)}: ${esc(portal.lang === 'en' ? capital.capitalEn || capital.capital : capital.capital)}</a>`
    : '';
  return `<footer class="foot">
  <div class="footgrid">
    <div>
      <h2>${esc(wl(portal, 'portalsTitle'))}</h2>
      <p class="footlinks">${links}${capitalLink}<a href="${portal.lang === 'en' ? HUB_EN : HUB_HR}">${esc(words.hub)} →</a>
        ${NETWORK_PRODUCTS.map((product) => `<a href="${product.url}" rel="external noopener">${esc(product[portal.lang === 'en' ? 'en' : 'hr'])}</a>`).join('')}</p>
    </div>
    <div>
      <h2>${esc(words.publisher)}</h2>
      <p>AKTUAL MEDIA d.o.o. · GNK ASG<br>${esc(words.editor)}: Nermin Sefić<br><a href="mailto:${CONTACT}">${CONTACT}</a></p>
      <p class="small">${esc(wl(portal, 'worldNote'))}</p>
    </div>
    <div>
      <h2>${esc(words.hashtags)}</h2>
      <ul class="tags">${tags}</ul>
    </div>
  </div>
  <p class="disclaimer">${esc(words.autoNote)}</p>
</footer>`;
}

function card(portal, item) {
  const label = new Date(item.date).toISOString().slice(0, 10);
  return `<article class="card">
  <div class="cardmeta"><span class="src">${esc(item.sourceName || item.source || '')}</span><span>·</span><time datetime="${label}">${esc(shortDate(label, portal.lang))}</time></div>
  <h3 class="cardtitle"><a href="${reviewUrl(portal, item)}" rel="external noopener">${esc(item.title)}</a></h3>
  ${item.summary ? `<p class="cardsum">${esc(truncate(item.summary, 190))}</p>` : ''}
  <a class="more" href="${reviewUrl(portal, item)}" rel="external noopener">${esc(wl(portal, 'readReview'))} →</a>
</article>`;
}

const cards = (portal, items) => items.map((item) => card(portal, item)).join('');

function themeChips(portal, items) {
  const labels = ui(portal).themeNames || {};
  const counts = new Map();
  for (const item of items) counts.set(themeOf(item), (counts.get(themeOf(item)) || 0) + 1);
  return `<p class="chips">${[...counts.entries()].sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `<a class="chip" href="tema/${id}/">${esc(labels[id] || id)} <strong>${n}</strong></a>`).join('')}</p>`;
}

/* ---------- HTML okvir ---------- */

function shell(portal, { title, description, path = '', body, robots = 'index,follow,max-image-preview:large', jsonld = [], ogImage = '' }) {
  const base = portalBase(portal);
  const canonical = portalUrl(portal, path);
  const words = ui(portal);
  const desc = truncate(String(description || words.aboutText).replace(/\s+/g, ' '), 160);
  const image = ogImage || `https://gnk-asg.hr/assets/izdanja/${portal.id}-og.jpg`;
  const dir = RTL.has(portal.lang) ? ' dir="rtl"' : '';
  const locale = String(portal.locale || portal.lang).replace('-', '_');
  const tags = [...new Set(portal.hashtags.filter((tag) => !/nermin|sefi[cć]/i.test(tag)))].slice(0, 12);
  const keywords = tags.map((tag) => tag.replace(/^#/, '')).join(', ');

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite', '@id': `${base}/#website`,
        url: `${base}/`, name: portal.name, inLanguage: portal.lang,
        publisher: { '@id': 'https://gnk-asg.hr/#aktual-media' }
      },
      {
        '@type': 'NewsMediaOrganization', '@id': 'https://gnk-asg.hr/#aktual-media',
        name: 'AKTUAL MEDIA d.o.o.', url: AKTUAL,
        logo: { '@type': 'ImageObject', url: 'https://gnk-asg.hr/assets/brand/aktual-media-hr-1200.webp', width: 1200, height: 345 },
        editor: { '@type': 'Person', name: 'Nermin Sefić', jobTitle: 'Urednik i direktor', url: 'https://gnk-asg.hr/nermin-sefic/' },
        publishingPrinciples: `${AKTUAL}metodologija/`
      },
      {
        '@type': path ? 'WebPage' : 'CollectionPage',
        '@id': `${canonical}#page`, url: canonical, name: title, description: desc,
        inLanguage: portal.lang, isPartOf: { '@id': `${base}/#website` },
        publisher: { '@id': 'https://gnk-asg.hr/#aktual-media' },
        about: { '@type': 'Place', name: `${portal.city}, ${portal.country}` }
      },
      ...jsonld
    ]
  };

  return `<!doctype html>
<html lang="${portal.lang}"${dir}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${esc(robots)}">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="${esc(keywords)}">
<meta name="theme-color" content="${esc(portal.palette.bg)}">
<link rel="author" href="https://gnk-asg.hr/nermin-sefic/">
<link rel="canonical" href="${canonical}">
<script type="application/ld+json" id="network-entity-v1">${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', '@id': 'https://gnk-asg.hr/#gnk-asg', name: 'GNK ASG d.o.o.', url: 'https://gnk-asg.hr/', parentOrganization: { '@id': 'https://gnk-asg.hr/#gnk-dinamo-ltd' }, founder: { '@id': 'https://gnk-asg.hr/#nermin-sefic' } },
        { '@type': 'Organization', '@id': 'https://gnk-asg.hr/#gnk-dinamo-ltd', name: 'GNK DINAMO Ltd.', url: 'https://gnk-asg.hr/pojasnjenje-gnk-asg-i-gnk-dinamo-ltd/' },
        { '@type': 'NewsMediaOrganization', '@id': 'https://gnk-asg.hr/gnk-aktual/#aktual-media', name: 'AKTUAL MEDIA', url: 'https://gnk-asg.hr/gnk-aktual/', parentOrganization: { '@id': 'https://gnk-asg.hr/#gnk-asg' }, editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' } },
        { '@type': 'Person', '@id': 'https://gnk-asg.hr/#nermin-sefic', name: 'Nermin Sefić', alternateName: ['Nermin Sefic', 'Sefic Nermin'], jobTitle: 'Glavni urednik AKTUAL MEDIA, direktor GNK ASG d.o.o.', url: 'https://gnk-asg.hr/nermin-sefic/', worksFor: [{ '@id': 'https://gnk-asg.hr/#gnk-asg' }, { '@id': 'https://gnk-asg.hr/gnk-aktual/#aktual-media' }], affiliation: { '@id': 'https://gnk-asg.hr/#gnk-dinamo-ltd' } }
      ]
    }).replace(/</g, '\\u003c')}</script>
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<meta property="article:tag" content="#NerminSefić">
<link rel="alternate" type="application/rss+xml" title="${esc(portal.name)}" href="${base}/feed.xml">
<link rel="alternate" type="application/feed+json" title="${esc(portal.name)}" href="${base}/feed.json">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(portal.name)}">
<meta property="og:locale" content="${locale}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:site" content="@aktualmedia">
<script type="application/ld+json">${safeJson(graph)}</script>
<style>:root{--bg:${portal.palette.bg};--surface:${portal.palette.surface};--accent:${portal.palette.accent};--accent2:${portal.palette.accent2};--ink:${portal.palette.ink}}</style>
<link rel="stylesheet" href="/assets/region.css">
${designTokensCss()}
</head>
<body data-channel="${portal.id}" data-lang="${portal.lang}">
<a class="skip" href="#sadrzaj">${esc(chrome(portal).skip)}</a>
${houseRibbon({ lang: portal.lang, edition: `${portal.city} · ${portal.country}` })}
${body}
${exchangeBlock({ root: ROOT, lang: portal.lang, selfHome: portalBase(portal), selfNames: [portal.city, portal.cityEn].filter(Boolean), limit: 6 })}
</body>
</html>`;
}

/* ---------- stranice ---------- */

function homePage(portal, data) {
  const words = ui(portal);
  const items = data.items;
  const lead = items[0];
  const rest = items.slice(1, 13);
  const sources = portal.sources || [];
  const sourceList = sources.map((source) => {
    const count = items.filter((item) => item.source === source.id).length;
    return `<li><a href="izvor/${source.id}/">${esc(source.name)}</a><span class="src">${count} ${esc(wl(portal, 'sourceRecords'))}</span></li>`;
  }).join('');

  const body = `${header(portal, '')}
<main id="sadrzaj" class="page">
  <p class="dateline">${esc(wl(portal, 'worldEdition'))} · ${esc(continentName(portal))} · <time datetime="${TODAY}">${esc(longDate(TODAY, portal.lang))}</time></p>
  <h1>${esc(displayCity(portal))}</h1>
  <p class="lead">${esc(words.aboutText)}</p>
  ${atlasEdition(portal)}
  ${themeChips(portal, items)}
  ${lead ? `<section class="band">
    <div class="bandhead"><h2>${esc(wl(portal, 'leadLabel'))}</h2><span class="count">${esc(shortDate(new Date(lead.date).toISOString().slice(0, 10), portal.lang))}</span></div>
    <article class="card card--lead">
      <div class="cardmeta"><span class="src">${esc(lead.sourceName || '')}</span><span>·</span><span>${esc((words.themeNames || {})[themeOf(lead)] || themeOf(lead))}</span></div>
      <h3 class="cardtitle"><a href="${reviewUrl(portal, lead)}" rel="external noopener">${esc(lead.title)}</a></h3>
      ${lead.summary ? `<p class="cardsum">${esc(truncate(lead.summary, 320))}</p>` : ''}
      <p><a class="more" href="${reviewUrl(portal, lead)}" rel="external noopener">${esc(wl(portal, 'readReview'))} →</a> · <a class="more" href="${esc(lead.url)}" rel="external noopener">${esc(wl(portal, 'original'))} ↗</a></p>
    </article>
  </section>` : ''}
  <section class="band">
    <div class="bandhead"><h2>${esc(words.latest)}</h2><span class="count">${items.length}</span></div>
    ${items.length ? `<div class="grid">${cards(portal, rest.length ? rest : items.slice(0, 12))}</div>` : `<p class="empty">${esc(wl(portal, 'noRecords'))}</p>`}
  </section>
  <section class="band">
    <div class="bandhead"><h2>${esc(words.sources)}</h2><a href="izvori/">${esc(words.sources)} →</a></div>
    <p class="small">${esc(wl(portal, 'sourcesNote'))}</p>
    <ul class="list">${sourceList}</ul>
  </section>
  <section class="band">
    <div class="bandhead"><h2>${esc(wl(portal, 'feedsTitle'))}</h2></div>
    <p class="small">${esc(wl(portal, 'feedNote'))}</p>
    <p class="chips"><a class="chip" href="feed.xml">RSS</a><a class="chip" href="feed.json">JSON</a><a class="chip" href="sitemap.xml">Sitemap</a></p>
  </section>
  <p class="note">${esc(wl(portal, 'portalNote'))}</p>
</main>
<section class="page" aria-labelledby="swBandTitle">
  <h2 class="band-title" id="swBandTitle">${esc(wl(portal, 'spiderTitle'))}</h2>
  ${spiderWeb({ lang: portal.lang, selfUrl: portalBase(portal), theme: 'dark' })}
</section>
${meshBlock({ lang: portal.lang, selfUrl: portalBase(portal), theme: 'dark' })}
${footer(portal)}`;

  const jsonld = [{
    '@type': 'ItemList',
    name: `${displayCity(portal)} — ${words.latest}`,
    numberOfItems: Math.min(items.length, 13),
    itemListElement: items.slice(0, 13).map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.title, url: reviewUrl(portal, item)
    }))
  }];

  return shell(portal, {
    title: `${displayCity(portal)} — ${portal.name}`,
    description: words.aboutText,
    body,
    jsonld
  });
}

function themePage(portal, data, themeId, items) {
  const words = ui(portal);
  const label = (words.themeNames || {})[themeId] || themeId;
  const body = `${header(portal, '')}
<main id="sadrzaj" class="page">
  <nav class="crumbs" aria-label="${esc(chrome(portal).crumbs)}"><a href="./">${esc(displayCity(portal))}</a> · ${esc(label)}</nav>
  <h1>${esc(label)}</h1>
  <p class="lead">${items.length} ${esc(wl(portal, 'sourceRecords'))} · ${esc(portal.city)} · ${esc(portal.country)}</p>
  <div class="grid">${cards(portal, items)}</div>
  <p class="backlink"><a href="./">← ${esc(wl(portal, 'backHome'))}</a></p>
</main>
${meshBlock({ lang: portal.lang, selfUrl: portalBase(portal), theme: 'light' })}
${footer(portal)}`;
  return shell(portal, {
    title: `${label} — ${displayCity(portal)} · AKTUAL MEDIA`,
    description: `${label}: ${items.length} ${wl(portal, 'sourceRecords')} — ${portal.city}, ${portal.country}. ${words.aboutText}`,
    path: `tema/${themeId}/`,
    body,
    jsonld: [{ '@type': 'CollectionPage', name: `${label} — ${portal.city}`, url: portalUrl(portal, `tema/${themeId}/`), inLanguage: portal.lang }]
  });
}

function sourcePage(portal, data, source, items) {
  const words = ui(portal);
  const body = `${header(portal, '')}
<main id="sadrzaj" class="page">
  <nav class="crumbs" aria-label="${esc(chrome(portal).crumbs)}"><a href="./">${esc(displayCity(portal))}</a> · <a href="izvori/">${esc(words.sources)}</a> · ${esc(source.name)}</nav>
  <h1>${esc(source.name)}</h1>
  <p class="lead">${items.length} ${esc(wl(portal, 'sourceRecords'))} · ${esc(source.type ? source.type.toUpperCase() : 'RSS')}</p>
  ${items.length ? `<div class="grid">${cards(portal, items)}</div>` : `<p class="empty">${esc(wl(portal, 'noRecords'))}</p>`}
  <p class="backlink"><a href="izvori/">← ${esc(words.sources)}</a></p>
</main>
${meshBlock({ lang: portal.lang, selfUrl: portalBase(portal), theme: 'light' })}
${footer(portal)}`;
  return shell(portal, {
    title: `${source.name} — ${displayCity(portal)} · AKTUAL MEDIA`,
    description: `Osvrti na tekstove izvora ${source.name} u izdanju ${portal.city}. ${items.length} ${wl(portal, 'sourceRecords')}.`,
    path: `izvor/${source.id}/`,
    body,
    jsonld: [{ '@type': 'CollectionPage', name: `${source.name} — ${portal.city}`, url: portalUrl(portal, `izvor/${source.id}/`), inLanguage: portal.lang }]
  });
}

function sourcesPage(portal, data) {
  const words = ui(portal);
  const rows = (portal.sources || []).map((source) => {
    const count = data.items.filter((item) => item.source === source.id).length;
    return `<li><a href="izvor/${source.id}/">${esc(source.name)}</a><span class="src">${esc(source.type ? source.type.toUpperCase() : 'RSS')} · ${count} ${esc(wl(portal, 'sourceRecords'))}</span></li>`;
  }).join('');
  const body = `${header(portal, 'izvori/')}
<main id="sadrzaj" class="page">
  <h1>${esc(words.sources)}</h1>
  <p class="lead">${esc(words.sourcesLead)}</p>
  <ul class="list">${rows}</ul>
  <h2>${esc(words.methodology)}</h2>
  <p>${esc(words.methodLead)}</p>
  <p class="backlink"><a href="metodologija/">${esc(words.methodology)} →</a> · <a href="./">← ${esc(wl(portal, 'backHome'))}</a></p>
</main>
${meshBlock({ lang: portal.lang, selfUrl: portalBase(portal), theme: 'light' })}
${footer(portal)}`;
  return shell(portal, {
    title: `${words.sources} — ${displayCity(portal)} · AKTUAL MEDIA`,
    description: words.sourcesLead,
    path: 'izvori/',
    body
  });
}

function methodPage(portal, data) {
  const words = ui(portal);
  const body = `${header(portal, 'metodologija/')}
<main id="sadrzaj" class="page">
  <h1>${esc(words.methodology)}</h1>
  <p class="lead">${esc(words.methodLead)}</p>
  <ol class="rules">${(words.methodPoints || []).map((point) => `<li>${esc(point)}</li>`).join('')}</ol>
  <h2>${esc(words.sources)}</h2>
  <ul class="list">${(portal.sources || []).map((source) => `<li><a href="izvor/${source.id}/">${esc(source.name)}</a><span class="src">${source.type ? esc(source.type.toUpperCase()) : 'RSS'}</span></li>`).join('')}</ul>
  <h2>${esc(words.contact)}</h2>
  <p><a href="mailto:${CONTACT}">${CONTACT}</a> · AKTUAL MEDIA d.o.o. · ${esc(words.editor)}: Nermin Sefić</p>
  <p class="small">${esc(words.autoNote)}</p>
  <p class="backlink"><a href="./">← ${esc(wl(portal, 'backHome'))}</a></p>
</main>
${meshBlock({ lang: portal.lang, selfUrl: portalBase(portal), theme: 'light' })}
${footer(portal)}`;
  return shell(portal, {
    title: `${words.methodology} — ${displayCity(portal)} · AKTUAL MEDIA`,
    description: words.methodLead,
    path: 'metodologija/',
    body,
    jsonld: [{ '@type': 'AboutPage', name: words.methodology, url: portalUrl(portal, 'metodologija/'), inLanguage: portal.lang }]
  });
}

function networkPage(portal) {
  const words = ui(portal);
  const body = `${header(portal, 'mreza/')}
<main id="sadrzaj" class="page">
  <h1>${esc(wl(portal, 'network'))}</h1>
  <p class="lead">${esc(wl(portal, 'worldNote'))}</p>
  ${meshBlock({ lang: portal.lang, selfUrl: portalBase(portal), theme: 'light' })}
  <p class="backlink"><a href="${portal.lang === 'en' ? HUB_EN : HUB_HR}" rel="external noopener">${esc(wl(portal, 'allNetwork'))} ↗</a> · <a href="./">← ${esc(wl(portal, 'backHome'))}</a></p>
</main>
${footer(portal)}`;
  return shell(portal, {
    title: `${wl(portal, 'network')} — ${displayCity(portal)} · AKTUAL MEDIA`,
    description: wl(portal, 'worldNote'),
    path: 'mreza/',
    body
  });
}

function notFound(portal) {
  const words = ui(portal);
  const body = `${header(portal, '')}
<main id="sadrzaj" class="page">
  <h1>404</h1>
  <p class="lead">${esc(words.emptyText)}</p>
  <p><a href="/">← ${esc(wl(portal, 'backHome'))}</a></p>
</main>
${meshBlock({ lang: portal.lang, selfUrl: portalBase(portal), theme: 'light' })}
${footer(portal)}`;
  return shell(portal, {
    title: `404 — ${portal.name}`,
    description: words.emptyText,
    path: '404.html',
    robots: 'noindex,follow',
    body
  });
}

/* ---------- feedovi, sitemap, roboti ---------- */

const feedItems = (portal, data) => data.items.slice(0, 100).map((item) => ({
  id: reviewUrl(portal, item),
  url: reviewUrl(portal, item),
  title: item.title,
  content_text: item.summary || item.title,
  summary: truncate(item.summary || item.title, 240),
  date_published: item.date,
  tags: [item.sourceName, (ui(portal).themeNames || {})[themeOf(item)] || themeOf(item)].filter(Boolean),
  _original: item.url
}));

function writeFeeds(portal, data) {
  const dir = join(OUT, portal.id);
  const items = feedItems(portal, data);
  const words = ui(portal);
  const json = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${portal.name} — ${wl(portal, 'worldEdition')}`,
    home_page_url: `${portalBase(portal)}/`,
    feed_url: `${portalBase(portal)}/feed.json`,
    description: words.aboutText,
    language: portal.lang,
    _publisher: { name: 'AKTUAL MEDIA d.o.o.', editor: 'Nermin Sefić', hub: HUB_HR, canonical: portal.sourceBase },
    items: items.map(({ _original, ...rest }) => rest)
  };
  writeFileSync(join(dir, 'feed.json'), `${JSON.stringify(json, null, 2)}\n`);
  writeExchangeJson(dir, { root: ROOT, selfHome: portalBase(portal), limit: 12 });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${esc(portal.name)} — ${esc(wl(portal, 'worldEdition'))}</title>
<link>${portalBase(portal)}/</link>
<atom:link href="${portalBase(portal)}/feed.xml" rel="self" type="application/rss+xml"/>
<description>${esc(words.aboutText)}</description>
<language>${portal.lang}</language>
<managingEditor>${CONTACT} (Nermin Sefić)</managingEditor>
<webMaster>${CONTACT} (Nermin Sefić)</webMaster>
<lastBuildDate>${new Date(data.updatedAt || Date.now()).toUTCString()}</lastBuildDate>
${items.map((item) => `<item>
<title>${esc(item.title)}</title>
<link>${item.url}</link>
<guid isPermaLink="true">${item.url}</guid>
<pubDate>${new Date(item.date_published).toUTCString()}</pubDate>
<description>${esc(item.summary)}</description>
<dc:creator>AKTUAL MEDIA</dc:creator>
${item.tags.map((tag) => `<category>${esc(tag)}</category>`).join('\n')}
</item>`).join('\n')}
</channel>
</rss>
`;
  writeFileSync(join(dir, 'feed.xml'), xml);
}

function writeSitemap(portal, data, themes) {
  const lastmod = String(data.updatedAt || TODAY).slice(0, 10);
  const urls = [
    { loc: `${portalBase(portal)}/`, priority: '1.0', changefreq: 'hourly' },
    { loc: portalUrl(portal, 'izvori/'), priority: '0.6', changefreq: 'weekly' },
    { loc: portalUrl(portal, 'metodologija/'), priority: '0.5', changefreq: 'monthly' },
    { loc: portalUrl(portal, 'mreza/'), priority: '0.7', changefreq: 'weekly' },
    ...[...themes.keys()].map((id) => ({ loc: portalUrl(portal, `tema/${id}/`), priority: '0.6', changefreq: 'daily' })),
    ...(portal.sources || []).map((source) => ({ loc: portalUrl(portal, `izvor/${source.id}/`), priority: '0.4', changefreq: 'daily' })),
    /* Kolumne: popis i svaka objava zasebno. Bez ovoga preneseni tekst
       postoji, ali tražilica za njega ne zna. */
    ...[
      { loc: portalUrl(portal, 'kolumne/'), priority: '0.6', changefreq: 'daily' },
      ...columnUrls(ROOT, portal).map((entry) => ({ loc: entry.loc, priority: '0.5', changefreq: 'monthly' }))
    ]
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((entry) => `<url><loc>${entry.loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`).join('\n')}
</urlset>
`;
  writeFileSync(join(OUT, portal.id, 'sitemap.xml'), xml);
}

const HEADERS = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; img-src 'self' https://gnk-asg.hr data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
`;

function writeStatics(portal, data, themes) {
  const dir = join(OUT, portal.id);
  const words = ui(portal);
  writeFileSync(join(dir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${portalBase(portal)}/sitemap.xml\n`);
  writeFileSync(join(dir, '_headers'), HEADERS);
  writeFileSync(join(dir, 'llms.txt'), `# ${portal.name}\n\n> ${words.aboutText}\n\nWorld edition: ${portal.city}, ${portal.country}. Publisher: AKTUAL MEDIA d.o.o. Editor and director: Nermin Sefić. Contact: ${CONTACT}\nLanguage: ${portal.lang} · Canonical reviews: ${portal.sourceBase}\nStatus: automatically assembled overview of published sources; every record links to the original.\n\n## Sources\n${(portal.sources || []).map((source) => `- ${source.name}`).join('\n')}\n\n## Pages\n- ${portalBase(portal)}/\n- ${portalUrl(portal, 'izvori/')}\n- ${portalUrl(portal, 'metodologija/')}\n- ${portalUrl(portal, 'mreza/')}\n- ${portalUrl(portal, 'feed.json')}\n- ${portalUrl(portal, 'sitemap.xml')}\n- ${HUB_HR}\n`);
  writeFileSync(join(dir, 'manifest.webmanifest'), `${JSON.stringify({
    name: `${portal.name} — ${wl(portal, 'worldEdition')}`,
    short_name: portal.city,
    description: words.aboutText,
    lang: portal.lang,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: portal.palette.bg,
    theme_color: portal.palette.bg,
    icons: [{ src: '/assets/icon.svg', sizes: 'any', type: 'image/svg+xml' }]
  }, null, 2)}\n`);

  const icon = FAVICON_SVG;
  writeFileSync(join(dir, 'assets', 'favicon.svg'), icon);
  writeFileSync(join(dir, 'assets', 'icon.svg'), icon);

  const logo = logoFor(channelLogoSlug(portal.id));
  if (logo) {
    const source = join(ROOT, 'apps', 'portal', logo.webp.replace(/^\//, ''));
    if (existsSync(source)) copyFileSync(source, join(dir, 'assets', 'brand.webp'));
  }
  const houseMark = join(ROOT, 'apps', 'portal', 'assets', 'brand', 'aktual-media-mark.svg');
  if (existsSync(houseMark)) {
    mkdirSync(join(dir, 'assets', 'brand'), { recursive: true });
    copyFileSync(houseMark, join(dir, 'assets', 'brand', 'aktual-media-mark.svg'));
  }

  writeFileSync(join(dir, 'assets', 'region.css'), `${CSS}\n${MESH_CSS}\n${SPIDER_CSS}\n${WORLD_CSS}\n${HOUSE_CSS}\n${EXCHANGE_CSS}`);
  writeSitemap(portal, data, themes);
}

const WORLD_CSS = `.crumbs{font:600 11px/1.6 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8a7c62;padding:0 0 14px}
.crumbs a{color:#5b6472}
.note{margin:26px 0 0;padding:16px 18px;border-left:4px solid var(--accent);background:#fff;font-size:15px;color:#3d4753}
.list li{align-items:center}
.card--lead .cardtitle{font-size:clamp(24px,3vw,34px)}
.grid{gap:26px 28px}
.mesh{margin-top:0}
.page > .sw{margin-top:8px}
.hero-art{margin:20px 0 0;border-radius:14px;overflow:hidden;background:#08131c}
.hero-art img{width:100%;height:auto;display:block}
.hero-art figcaption{padding:8px 12px;background:#0d1622;color:#8fa3ba;font-size:11px;letter-spacing:.02em}
.band-title{margin:34px 0 0}
`;

/* ---------- jedan portal ---------- */

export function buildPortal(portal) {
  const data = loadData(portal);
  /* Izvor koji u ovom ciklusu nije dao nijedan zapis nema svoju stranicu —
     portal ne prikazuje praznu policu da bi izgledao veći. */
  const activeSources = portal.sources.filter((source) => !source.optional || data.items.some((item) => item.source === source.id));
  portal = { ...portal, sources: activeSources };
  const dir = join(OUT, portal.id);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'assets'), { recursive: true });

  const writePage = (path, html) => write(join(dir, path), html);
  const themes = new Map();
  for (const item of data.items) {
    const id = themeOf(item);
    if (!themes.has(id)) themes.set(id, []);
    themes.get(id).push(item);
  }

  writePage('index.html', homePage(portal, data));
  for (const [id, items] of themes) writePage(`tema/${id}/index.html`, themePage(portal, data, id, items));
  for (const source of portal.sources || []) {
    writePage(`izvor/${source.id}/index.html`, sourcePage(portal, data, source, data.items.filter((item) => item.source === source.id)));
  }
  writePage('izvori/index.html', sourcesPage(portal, data));
  writePage('metodologija/index.html', methodPage(portal, data));
  writePage('mreza/index.html', networkPage(portal));
  writePage('404.html', notFound(portal));

  /* Kolumne: Sefićev tekst s matice, u izvornom hrvatskom, s uvodom na jeziku
     izdanja i linkom na izvor. Pišu se nakon ostalih stranica da im shell
     (navigacija, podnožje, graf) bude isti kao na cijelom izdanju. */
  const columns = writeColumns(portal, {
    root: ROOT,
    shell,
    header,
    footer,
    writePage,
    style: `:root{--bg:${portal.palette.bg};--surface:${portal.palette.surface};--accent:${portal.palette.accent};--accent2:${portal.palette.accent2};--ink:${portal.palette.ink}}`
  });
  linkFromHome(portal, join(dir, 'index.html'), columnsNavLabel(portal));

  /* Prenos na svjetsko izdanje: svi naši tekstovi, sa slikom autora i
     linkom na izvornik. Kolumne ostaju u /kolumne/, ostalo ide u /prenos/. */
  const prenos = writePrenos({
    root: ROOT,
    target: {
      key: portal.id,
      name: portal.name,
      base: portal.base,
      lang: portal.lang,
      outDir: dir,
      palette: portal.palette,
      ogImage: `https://gnk-asg.hr/assets/izdanja/${portal.id}-og.jpg`
    },
    columnBase: '/kolumne/'
  });
  if (prenos.ok) {
    appendSitemap(join(dir, 'sitemap.xml'), prenosUrls(ROOT, { base: portal.base }, '/kolumne/'));
  }
  linkPrenosOnHome({ homeFile: join(dir, 'index.html'), lang: portal.lang });

  writeFeeds(portal, data);
  writeStatics(portal, data, themes);

  return {
    portal: portal.id,
    pages: 5 + themes.size + portal.sources.length + (columns.count ? 1 + columns.count : 0) + (prenos.ok ? prenos.pages : 0),
    columns: columns.count,
    prenos: prenos.ok ? prenos.pages : 0,
    items: data.items.length
  };
}

/* Gradi samo kad je OVA datoteka ulazna točka (uvoz iz testa ne piše ništa). */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
  const targets = ONLY ? [WORLD_BY_ID.get(ONLY)].filter(Boolean) : WORLD_PORTALS;
  if (!targets.length) {
    console.error(JSON.stringify({ ok: false, reason: `nepoznat portal: ${ONLY}`, known: [...WORLD_BY_ID.keys()] }, null, 2));
    process.exit(2);
  }
  const report = targets.map((portal) => buildPortal(portal));
  console.log(JSON.stringify({ ok: true, out: OUT, portals: report }, null, 2));
}
