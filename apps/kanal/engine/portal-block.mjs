#!/usr/bin/env node
/**
 * Upisuje blok "Iz kanala" u AKTUAL MEDIA (apps/portal/gnk-aktual/index.html)
 * i podatke u apps/portal/data/kanal-latest.json.
 *
 * Blok sadrži vanjske linkove na kanal (rel="external noopener"), pa je istovremeno
 * inkorporacija kanala u AKTUAL i backlink s portala na kanal.
 *
 * Pokretanje:
 *   node apps/kanal/engine/portal-block.mjs
 *   node apps/kanal/engine/portal-block.mjs --feed apps/kanal/site/feed.json --limit 6
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const FEED = join(REPO, 'apps', 'kanal', 'site', 'feed.json');
const PORTAL_PAGE = join(REPO, 'apps', 'portal', 'gnk-aktual', 'index.html');
const PORTAL_DATA = join(REPO, 'apps', 'portal', 'data', 'kanal-latest.json');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const LIMIT = Number(arg('--limit', '6'));
const START = '<!-- KANAL-BAND:START -->';
const END = '<!-- KANAL-BAND:END -->';

if (!existsSync(FEED)) {
  console.error('Nema feeda. Prvo pokreni build: node apps/kanal/build.mjs');
  process.exit(1);
}

const feed = JSON.parse(readFileSync(FEED, 'utf8'));
const items = (feed.items || []).slice(0, LIMIT);

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hrDate = (iso) => new Date(iso).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long' });

const listFor = (lang = 'hr') => {
  const en = lang === 'en';
  return items.map((it, i) => {
    const isDesk = it._kanal?.section === 'desk' || /dnevnik-/.test(it.url) || it._kanal?.editorialStatus === 'auto-assembled';
    const sec = isDesk ? (en ? 'Daily desk' : 'Dnevni desk') : (it._kanal?.sectionLabel || (en ? 'Channel' : 'Kanal'));
    const date = en
      ? new Date(it.date_published).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
      : hrDate(it.date_published);
    return `      <li class="kanal-item">
        <span class="kanal-num">${String(i + 1).padStart(2, '0')}</span>
        <div>
          <h3><a href="${esc(it.url)}" target="_blank" rel="external noopener">${esc(it.title)}</a></h3>
          <div class="kanal-meta"><span class="sec">${esc(sec)}</span><span>${date}</span><span class="kanal-ext">${isDesk ? (en ? 'auto-assembled' : 'automatski sastavljeno') : (en ? 'external link ↗' : 'vanjski link ↗')}</span></div>
        </div>
      </li>`;
  }).join('\n');
};

const stamp = new Date().toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const bandFor = (lang = 'hr') => {
  const en = lang === 'en';
  const stampLocal = en
    ? new Date().toLocaleString('en-GB', { timeZone: 'Europe/Zagreb', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : stamp;
  return `${START}
  <section class="kanal-band" aria-labelledby="kanalBandTitle">
    <div class="kanal-band-head">
      <div>
        <h2 class="kanal-band-title" id="kanalBandTitle">${en ? 'From the GNK ASG channel' : '<span class="kanal-mark" aria-hidden="true">K</span> Iz GNK ASG KANALA'}</h2>
        <p class="kanal-sub">${en
          ? 'Ten new posts every day: analyses, explainers, deadlines, numbers and claim checks. Texts are reused with the attribution “Source: GNK ASG KANAL”.'
          : 'Deset novih objava svakoga dana: analize, pojašnjenja, rokovi, brojke i provjere tvrdnji. Tekstovi se preuzimaju uz atribuciju „Izvor: GNK ASG KANAL".'}</p>
      </div>
      <a class="kanal-band-all" href="https://gnk-asg-kanal.pages.dev/" target="_blank" rel="external noopener">${en ? 'All posts on the channel ↗' : 'Sve objave na kanalu ↗'}</a>
    </div>
    <ol class="kanal-list">
${listFor(lang)}
    </ol>
    <div class="kanal-foot">
      <span>${en ? `This block refreshes automatically · last change ${esc(stampLocal)}` : `Blok se osvježava automatski · zadnja izmjena ${esc(stampLocal)}`}</span>
      <span><a href="https://gnk-asg-kanal.pages.dev/dnevnik/" target="_blank" rel="external noopener">${en ? 'Daily desk ↗' : 'Dnevni desk ↗'}</a> · <a href="https://gnk-asg-kanal.pages.dev/feed.json" target="_blank" rel="external noopener">${en ? 'Feed' : 'Feed za preuzimanje'}</a> · <a href="https://gnk-asg-kanal.pages.dev/metodologija/" target="_blank" rel="external noopener">${en ? 'Methodology' : 'Metodologija'}</a></span>
    </div>
  </section>
  ${END}`;
};
const band = bandFor('hr');

/* 1) podaci za portal */
const data = {
  version: 'kanal-latest-v1',
  updatedAt: new Date().toISOString(),
  source: 'https://gnk-asg-kanal.pages.dev/',
  feed: 'https://gnk-asg-kanal.pages.dev/feed.json',
  attribution: 'Izvor: GNK ASG KANAL',
  items: (feed.items || []).slice(0, 20).map((it) => ({
    title: it.title,
    url: it.url,
    section: it._kanal?.sectionLabel || null,
    published: it.date_published,
    summary: it.summary,
    image: it.image,
    status: it._kanal?.editorialStatus || null,
    external: true
  }))
};
writeFileSync(PORTAL_DATA, JSON.stringify(data, null, 2) + '\n', 'utf8');

/* 2) blok u AKTUAL stranici */
let html = readFileSync(PORTAL_PAGE, 'utf8');
if (html.includes(START) && html.includes(END)) {
  html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), band);
  console.log('Portal: postojeći blok zamijenjen.');
} else {
  const anchor = '  <section class="am-spt" aria-labelledby="amSptTitle">';
  if (!html.includes(anchor)) {
    console.error('Ne mogu naći mjesto za umetanje (am-spt). Blok nije upisan.');
    process.exit(1);
  }
  html = html.replace(anchor, `${band}\n\n${anchor}`);
  console.log('Portal: blok umetnut nakon glavnih vijesti (prije SPT sekcije).');
}
writeFileSync(PORTAL_PAGE, html, 'utf8');

/* 3) isti blok na engleskoj stranici — engleski okvir, isti izvorni naslovi */
const PORTAL_PAGE_EN = join(REPO, 'apps', 'portal', 'en', 'gnk-aktual', 'index.html');
if (existsSync(PORTAL_PAGE_EN)) {
  let en = readFileSync(PORTAL_PAGE_EN, 'utf8');
  const enBand = bandFor('en');
  if (en.includes(START) && en.includes(END)) {
    en = en.replace(new RegExp(`${START}[\\s\\S]*?${END}`), enBand);
  } else {
    if (/<section class="am-spt"[^>]*>/.test(en)) {
      en = en.replace(/<section class="am-spt"[^>]*>/, (m) => `${enBand}\n\n${m}`);
    } else {
      const mreza = '<!-- AKTUAL-MREZA-BAND:START -->';
      if (en.includes(mreza)) en = en.replace(mreza, `${enBand}\n${mreza}`);
      else console.error('EN: ne mogu naći mjesto za blok kanala.');
    }
  }
  writeFileSync(PORTAL_PAGE_EN, en, 'utf8');
}

console.log(`Portal data: ${PORTAL_DATA} (${data.items.length} stavki)`);
console.log(`AKTUAL blok: ${items.length} vanjskih linkova`);
