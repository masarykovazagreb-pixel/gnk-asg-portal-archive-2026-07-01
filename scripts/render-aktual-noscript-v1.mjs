#!/usr/bin/env node
/**
 * Statički AKTUAL feed — verzija koja radi bez JavaScripta.
 *
 * Zašto: /gnk-aktual/ je do sada bio prazan bez skripte. Čitači bez JS-a,
 * arhivski crawleri i spori uređaji vidjeli su naslove u navigaciji i ništa
 * ispod njih. Ovdje se iz istog, već provjerenog feeda (data/news.json)
 * upliće statični blok u HR i EN stranicu, s istim izvorima i istim
 * vanjskim poveznicama koje renderira skripta.
 *
 * Pravila:
 *  - bez izmišljanja: samo polja iz feeda (title, url, source, image, summary),
 *  - bez kadence: rečenice koje normalize-aktual-hourly-contract.mjs mijenja
 *    ne smiju se pojaviti u ovom bloku,
 *  - blok je omeđen markerima i zamjenjuje se u cijelosti, nikad ne duplicira,
 *  - `--check` ne piše, samo javlja je li blok u skladu s feedom (koristi test).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const NEWS = 'apps/portal/data/news.json';
const HR_PAGE = 'apps/portal/gnk-aktual/index.html';
const EN_PAGE = 'apps/portal/en/gnk-aktual/index.html';

const MARK_START = '<!-- NEWS-NOSCRIPT:START -->';
const MARK_END = '<!-- NEWS-NOSCRIPT:END -->';
const ASK_START = '<!-- ASK-AGENT:START -->';
const ASK_END = '<!-- ASK-AGENT:END -->';
const CSS_START = '<!-- NEWS-NOSCRIPT:CSS:START -->';
const CSS_END = '<!-- NEWS-NOSCRIPT:CSS:END -->';

const LEAD_COUNT = 1;
const LIST_COUNT = 7;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const clean = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const absolute = (url) => typeof url === 'string' && /^https:\/\/[^\s]+$/i.test(url.trim());

const proxy = (url) => (absolute(url) ? `/api/img?u=${encodeURIComponent(url.trim())}` : '');

const TIME_HR = new Intl.DateTimeFormat('hr-HR', {
  timeZone: 'Europe/Zagreb', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const TIME_EN = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Zagreb', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const stamp = (item, lang) => {
  const when = Date.parse(item.published_at || item.publishedAt || '');
  if (Number.isNaN(when)) return null;
  const date = new Date(when);
  return { iso: date.toISOString(), label: (lang === 'hr' ? TIME_HR : TIME_EN).format(date) };
};

const CSS = `${CSS_START}
<style id="amn-style">
.amn{--amn-ink:#f2f6fc;--amn-muted:#9fb0c6;--amn-gold:#e9c66c;--amn-line:rgba(233,198,108,.26);--amn-card:#0a1524;margin:26px 0;padding:clamp(14px,2.6vw,26px);border:1px solid var(--amn-line);border-radius:22px;background:linear-gradient(160deg,rgba(233,198,108,.10),rgba(6,12,22,.92) 58%),#060c16;color:var(--amn-ink)}
.amn *{box-sizing:border-box}
.amn a{color:inherit;text-decoration:none}
.amn a:hover,.amn a:focus-visible{color:var(--amn-gold);text-decoration:underline;text-underline-offset:3px}
.amn-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px 16px;margin-bottom:18px}
.amn-kicker{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--amn-gold);font-weight:700}
.amn h2{margin:0;font-size:clamp(19px,2.4vw,27px);line-height:1.2}
.amn-note{margin:0;flex:1 1 320px;font-size:13px;color:var(--amn-muted)}
.amn-lead{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:clamp(12px,2vw,22px);align-items:center;padding-bottom:18px;border-bottom:1px solid var(--amn-line);margin-bottom:16px}
.amn-lead-media{display:block;border-radius:16px;overflow:hidden;background:#0d1a2b;aspect-ratio:16/9}
.amn-lead-media img{width:100%;height:100%;object-fit:cover;display:block}
.amn-source{display:inline-block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--amn-gold);font-weight:700}
.amn-lead h3{margin:8px 0 8px;font-size:clamp(17px,2.1vw,24px);line-height:1.25}
.amn-lead p{margin:0 0 10px;color:#c8d4e4;font-size:14px;line-height:1.5}
.amn time{display:block;font-size:12px;color:var(--amn-muted);font-variant-numeric:tabular-nums}
.amn-list{list-style:none;margin:0 0 18px;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px 20px}
.amn-list li{padding:10px 0 10px 14px;border-left:2px solid rgba(233,198,108,.35)}
.amn-list a{display:block;font-size:14.5px;line-height:1.35;margin:4px 0 6px;font-weight:600}
.amn-more{display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid var(--amn-line);padding-top:14px}
.amn-more a{font-size:12.5px;padding:7px 12px;border:1px solid var(--amn-line);border-radius:999px;color:#dbe6f4}
@media (max-width:720px){.amn-lead{grid-template-columns:1fr}.amn-lead-media{aspect-ratio:16/10}}
@media (prefers-reduced-motion:reduce){.amn *{transition:none!important}}
/* Ulaz u asistenta s kontekstom ove stranice. */
.am-ask{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin:0 0 14px;font-family:inherit}
.am-ask-link{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border:1px solid rgba(233,198,108,.42);border-radius:999px;background:rgba(233,198,108,.10);color:#f4e7c6;font:700 12.5px/1.2 system-ui,sans-serif;letter-spacing:.01em;text-decoration:none}
.am-ask-link:hover,.am-ask-link:focus-visible{border-color:#e9c66c;background:rgba(233,198,108,.20);color:#fff8e6}
.am-ask-mark{color:#e9c66c}
.am-ask-hint{font:500 12px/1.4 system-ui,sans-serif;color:#9fb0c6}
</style>
${CSS_END}`;

const COPY = {
  hr: {
    kicker: 'AKTUAL MEDIA',
    heading: 'Najnovije u ovom trenutku',
    note: 'Statična verzija feeda za čitatelje bez JavaScripta — isti izvori i iste poveznice kao u interaktivnoj verziji.',
    moreLabel: 'Više iz AKTUAL MEDIA',
    askLabel: 'Pitaj asistenta o AKTUAL MEDIA',
    askHint: 'Odgovor dolazi iz baze znanja portala, s poveznicom na izvor.',
    nav: [
      ['/objave/', 'Sve vijesti'],
      ['/analize/', 'Sve analize'],
      ['/izdanja/', 'Izdanja'],
      ['/gnk-aktual/tjedni/', 'Tjednik'],
      ['/komentari/', 'Komentari'],
      ['/radio/', 'Radio'],
    ],
  },
  en: {
    kicker: 'AKTUAL MEDIA',
    heading: 'Latest right now',
    note: 'Static version of the feed for readers without JavaScript — the same sources and the same links as the interactive view.',
    moreLabel: 'More from AKTUAL MEDIA',
    askLabel: 'Ask the assistant about AKTUAL MEDIA',
    askHint: 'The answer comes from the portal knowledge base, with a link to the source.',
    nav: [
      ['/en/publications/', 'All news'],
      ['/en/analyses/', 'All analyses'],
      ['/izdanja/', 'Editions'],
      ['/en/gnk-aktual/weekly/', 'Weekly'],
      ['/en/commentary/', 'Commentary'],
      ['/en/radio/', 'Radio'],
    ],
  },
};

const pickItems = (news) => news
  .filter((item) => item && clean(item.title) && absolute(item.url))
  .slice(0, LEAD_COUNT + LIST_COUNT);

function leadBlock(item, copy, lang) {
  const time = stamp(item, lang);
  const image = proxy(item.image);
  const alt = clean(item.imageAlt) || clean(item.title);
  const source = clean(item.source) || 'AKTUAL MEDIA';
  const credit = clean(item.imageCredit || '');
  const showCredit = credit && credit.toLowerCase() !== source.toLowerCase();
  const summary = clean(item.summary).slice(0, 190);
  const media = image
    ? `<a class="amn-lead-media" href="${esc(item.url)}" target="_blank" rel="external noopener noreferrer nofollow"><img src="${esc(image)}" alt="${esc(alt)}" width="640" height="360" loading="eager" fetchpriority="high" decoding="async" referrerpolicy="no-referrer"></a>`
    : '';
  return `<article class="amn-lead">${media}<div class="amn-lead-body"><span class="amn-source">${esc(source)}</span><h3><a href="${esc(item.url)}" target="_blank" rel="external noopener noreferrer nofollow">${esc(clean(item.title))}</a></h3>${summary ? `<p>${esc(summary)}${clean(item.summary).length > 190 ? '…' : ''}</p>` : ''}<time datetime="${esc(time ? time.iso : '')}">${esc(time ? time.label : '')}</time>${showCredit ? `<span class="amn-source" style="margin-top:6px">${esc(credit)}</span>` : ''}</div></article>`;
}

function listBlock(items, lang) {
  return `<ol class="amn-list">${items.map((item) => {
    const time = stamp(item, lang);
    return `<li><span class="amn-source">${esc(clean(item.source) || 'AKTUAL MEDIA')}</span><a href="${esc(item.url)}" target="_blank" rel="external noopener noreferrer nofollow">${esc(clean(item.title))}</a>${time ? `<time datetime="${esc(time.iso)}">${esc(time.label)}</time>` : ''}</li>`;
  }).join('')}</ol>`;
}

export function renderAskAgent(lang = 'hr') {
  const copy = COPY[lang];
  const href = lang === 'hr'
    ? '/s-chat/?ctx=%2Fgnk-aktual%2F'
    : '/en/s-chat/?ctx=%2Fen%2Fgnk-aktual%2F';
  return `${ASK_START}
<p class="am-ask"><a class="am-ask-link" href="${href}"><span class="am-ask-mark" aria-hidden="true">✦</span>${esc(copy.askLabel)}<span aria-hidden="true"> →</span></a><span class="am-ask-hint">${esc(copy.askHint)}</span></p>
${ASK_END}`;
}

export function renderNoscript(news, lang = 'hr') {
  const copy = COPY[lang];
  const items = pickItems(news);
  if (items.length < 3) throw new Error('feed too small for a static block');
  const [lead, ...rest] = items;
  return `${MARK_START}
<noscript>
<section class="amn" aria-labelledby="amn-heading">
  <div class="amn-head">
    <span class="amn-kicker">${esc(copy.kicker)}</span>
    <h2 id="amn-heading">${esc(copy.heading)}</h2>
    <p class="amn-note">${esc(copy.note)}</p>
  </div>
  ${leadBlock(lead, copy, lang)}
  ${rest.length ? listBlock(rest, lang) : ''}
  <nav class="amn-more" aria-label="${esc(copy.moreLabel)}">${copy.nav.map(([href, label]) => `<a href="${esc(href)}">${esc(label)}</a>`).join('')}</nav>
</section>
</noscript>
${MARK_END}`;
}

function upsert(page, newBlock, start, end, anchor) {
  if (page.includes(start) && page.includes(end)) {
    return page.replace(new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), () => newBlock);
  }
  if (!page.includes(anchor)) throw new Error(`anchor not found: ${anchor}`);
  return page.replace(anchor, `${newBlock}\n\n${anchor}`);
}

export function renderPage(page, news, lang) {
  // Redoslijed: ulaz u asistenta (vidi se uvijek), pa statični feed
  // (vidi se bez JavaScripta), pa interaktivni lead.
  let next = upsert(page, renderNoscript(news, lang), MARK_START, MARK_END, '<section class="am-breaking"');
  // Stari blok se uklanja prije umetanja, da mjesto bude stalno isto
  // neovisno o tome gdje je bio u prethodnoj verziji stranice.
  next = next.replace(new RegExp(`${ASK_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${ASK_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`), '');
  next = upsert(next, renderAskAgent(lang), ASK_START, ASK_END, MARK_START);
  next = upsert(next, CSS, CSS_START, CSS_END, '</head>');
  return next;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  if (!existsSync(NEWS)) {
    console.log('news.json missing — static block skipped');
    return;
  }
  const news = JSON.parse(readFileSync(NEWS, 'utf8'));
  if (!Array.isArray(news) || news.length < 10) {
    console.log(`news.json has only ${Array.isArray(news) ? news.length : 0} items — static block skipped`);
    return;
  }
  const pages = [[HR_PAGE, 'hr'], [EN_PAGE, 'en']];
  const stale = [];
  for (const [file, lang] of pages) {
    const page = readFileSync(file, 'utf8');
    const next = renderPage(page, news, lang);
    if (next !== page) stale.push(file);
    if (!checkOnly && next !== page) writeFileSync(file, next);
  }
  const summary = {
    ok: stale.length === 0 || !checkOnly,
    mode: checkOnly ? 'check' : 'write',
    items: LEAD_COUNT + LIST_COUNT,
    stale,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (checkOnly && stale.length) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
