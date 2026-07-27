// Generira statičke, SEO-optimizirane stranice za svaki OBJAVLJENI Digital
// Workforce newsroom clanak (HR+EN), na temelju stvarnih podataka iz
// digital-workforce-suite-v1.js. Idempotentno - siguran za ponovljeno
// pokretanje (npr. cron), stvara samo stranice koje jos ne postoje ili
// cija naslovna vrijednost (title) se promijenila.
import { handleDigitalWorkforceSuite } from '../workers/gnk-asg-direct-operator/src/digital-workforce-suite-v1.js';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('../apps/portal', import.meta.url).pathname;

async function fetchNewsroom(lang) {
  const req = new Request(`https://gnk-asg.hr/api/public/digital-workforce/newsroom?lang=${lang}`, { method: 'GET' });
  const resp = await handleDigitalWorkforceSuite(req);
  const data = await resp.json();
  return data.items;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso, lang) {
  const d = new Date(iso);
  return lang === 'en'
    ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function buildPage(item, lang) {
  const isEn = lang === 'en';
  const langPrefix = isEn ? 'en/' : '';
  const otherLangUrl = isEn
    ? `https://gnk-asg.hr/digital-workforce/newsroom/${item.slug}/`
    : `https://gnk-asg.hr/en/digital-workforce/newsroom/${item.slug}/`;
  const simulationNotice = isEn
    ? 'This article is part of a public illustrative simulation of the GNK ASG Digital Workforce operating system. It does not represent real business data.'
    : 'Ovaj članak je dio javne ilustrativne simulacije operativnog sustava GNK ASG Digital Workforce. Ne predstavlja stvarne poslovne podatke.';
  const backToNewsroom = isEn ? 'Back to Newsroom' : 'Natrag na Newsroom';
  const kicker = isEn ? 'Digital Workforce · Newsroom' : 'Digitalna radna snaga · Newsroom';
  const byline = isEn
    ? `By ${esc(item.author)} · Edited by ${esc(item.editor)} · ${formatDate(item.publishedAt, lang)}`
    : `${esc(item.author)} · Urednik: ${esc(item.editor)} · ${formatDate(item.publishedAt, lang)}`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: item.title,
    description: item.excerpt,
    author: { '@type': 'Organization', name: item.author },
    editor: item.editor,
    datePublished: item.publishedAt,
    image: `https://gnk-asg.hr${item.seo.image}`,
    publisher: { '@type': 'Organization', name: 'GNK ASG d.o.o.' },
    mainEntityOfPage: item.seo.canonical,
  });

  return `<!doctype html><html lang="${isEn ? 'en' : 'hr'}" class="gnk-unified-shell"><head><!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-TCCJJVP4P0"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TCCJJVP4P0');</script><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(item.seo.title)}</title><meta name="description" content="${esc(item.seo.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${item.seo.canonical}"><link rel="alternate" hreflang="${isEn ? 'en' : 'hr'}" href="${item.seo.canonical}"><link rel="alternate" hreflang="${isEn ? 'hr' : 'en'}" href="${otherLangUrl}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(item.seo.title)}"><meta property="og:description" content="${esc(item.seo.description)}"><meta property="og:url" content="${item.seo.canonical}"><meta property="og:image" content="https://gnk-asg.hr${item.seo.image}"><script type="application/ld+json">${jsonLd}</script><link rel="stylesheet" href="/assets/style.css?v=20260723-dark-gold-theme-v1"><link rel="stylesheet" href="/assets/public-sections-v1.css?v=20260721-header-fulltransparent-v1"><link rel="stylesheet" href="/assets/editorial-content-v2.css?v=20260713-contrast"><link rel="stylesheet" href="/assets/public-unified-menu-v6.css?v=20260723-header-transparent-v3"></head><body><header id="gnk-unified-header" data-gnk-unified-shell="v6-static"><div class="inner"><a class="brand" href="/" aria-label="GNK ASG"><img src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG" width="110" height="68" data-gnk-canonical-logo="1"></a><div id="gnk-unified-menu"><div class="actions"><div class="lang"><a href="https://gnk-asg.hr/digital-workforce/newsroom/${item.slug}/" aria-label="Hrvatski"${!isEn ? ' aria-current="page"' : ''}>HR</a><a href="https://gnk-asg.hr/en/digital-workforce/newsroom/${item.slug}/" aria-label="English"${isEn ? ' aria-current="page"' : ''}>EN</a></div><button class="toggle" type="button" aria-expanded="false" aria-controls="gnk-unified-nav">${isEn ? 'MENU' : 'IZBORNIK'}</button></div><nav id="gnk-unified-nav"></nav></div></div></header><main class="editorial-wrap"><img class="editorial-logo" src="/assets/logo-gnk-asg-canonical.svg?v=20260713-standard-64" alt="GNK ASG"><article><p class="eyebrow">${esc(kicker)}</p><h1>${esc(item.title)}</h1><p class="lead">${esc(byline)}</p><div class="dw-sim-notice" style="background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.35);border-radius:12px;padding:12px 16px;margin:20px 0;font-size:.85rem;color:#e8dcc0">${esc(simulationNotice)}</div><img src="${item.seo.image}" alt="${esc(item.title)}" style="width:100%;border-radius:16px;margin:20px 0;border:1px solid rgba(212,175,55,.25)"><p style="font-size:1.05rem;line-height:1.7">${esc(item.excerpt)}</p><p><a href="https://gnk-asg.hr/${langPrefix}digital-workforce/newsroom/">← ${esc(backToNewsroom)}</a></p></article></main><script src="/assets/app.js?v=20260727-asg-bot-fixes-v1" defer></script></body></html>`;
}

async function main() {
  let written = 0, skipped = 0;
  for (const lang of ['hr', 'en']) {
    const items = await fetchNewsroom(lang);
    const baseDir = lang === 'en' ? path.join(ROOT, 'en/digital-workforce/newsroom') : path.join(ROOT, 'digital-workforce/newsroom');
    for (const item of items) {
      const dir = path.join(baseDir, item.slug);
      const file = path.join(dir, 'index.html');
      const html = buildPage(item, lang);
      if (fs.existsSync(file)) {
        const existing = fs.readFileSync(file, 'utf8');
        if (existing.includes(esc(item.title))) { skipped++; continue; }
      }
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, html, 'utf8');
      written++;
      console.log(`wrote: ${lang}/${item.slug}`);
    }
  }
  console.log(JSON.stringify({ ok: true, written, skipped }));
}

main();
