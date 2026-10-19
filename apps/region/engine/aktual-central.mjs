#!/usr/bin/env node
/**
 * AKTUAL MEDIA — središnji pregled.
 *
 * Gradi veliki blok na /gnk-aktual/ koji na jednom mjestu pokazuje sve što
 * AKTUAL MEDIA ima: osam gradskih kanala, poslovni tjednik, sportske,
 * političke i sigurnosne tekstove, galeriju, radio, centar znanja i
 * digitalnu radnu snagu. Blok se ubacuje između markera i ne dira ostatak
 * stranice. Sve poveznice vode na stvarni izvor: kanal, tjednik ili arhivu.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, shortDate, truncate } from './lib.mjs';
import { CHANNELS, HUB } from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const ROOT = join(APP, '..', '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const DATA = join(APP, 'data');
const FILE = join(PORTAL, 'gnk-aktual', 'index.html');

const START = '<!-- AKTUAL-CENTRAL:START -->';
const END = '<!-- AKTUAL-CENTRAL:END -->';

const readJSON = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};

const HASHTAGS = [
  '#NerminSefić', '#NerminSefic', '#AKTUALMEDIA', '#GNKASG', '#Našaizdanja',
  '#KanalZagreb', '#KanalBeograd', '#KanalSarajevo', '#KanalBudimpesta',
  '#KanalLjubljana', '#CanaleRoma', '#KanalSofija', '#CanalulBucuresti',
  '#BusinessTjednik', '#RegionalneVijesti', '#Sport', '#Politika', '#Sigurnost'
];

function allItems() {
  const out = [];
  for (const channel of CHANNELS) {
    const data = readJSON(join(DATA, `${channel.id}.json`), { items: [] });
    for (const item of data.items || []) {
      if (!item?.title || !item?.slug) continue;
      out.push({ ...item, channel });
    }
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

const linkFor = (item) => `${item.channel.base}clanak/${item.slug}/`;

function list(items, limit = 12) {
  return items.slice(0, limit).map((item) => `<li>
      <time datetime="${esc(item.date)}">${esc(shortDate(item.date.slice(0, 10)))}</time>
      <a href="${esc(linkFor(item))}">${esc(truncate(item.title, 120))}</a>
      <span class="amc-src">${esc(item.sourceName)} · ${esc(item.channel.title)}</span>
    </li>`).join('');
}

function channelCards(cards) {
  const wanted = ['zagreb', 'beograd', 'sarajevo', 'budimpesta', 'ljubljana', 'rim', 'sofija', 'bukurest'];
  return wanted.map((id) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return '';
    return `<li class="amc-card">
      <span class="amc-flag">${esc(card.country)} · ${esc(card.city)}</span>
      <h4><a href="${esc(card.url)}" rel="external noopener">${esc(card.name)}</a></h4>
      <p>${esc(card.count)} zapisa · jezik ${esc(card.lang)}</p>
      <a class="amc-go" href="${esc(card.url)}" rel="external noopener">Otvori izdanje ↗</a>
    </li>`;
  }).join('');
}

function section(title, kicker, items, limit = 12) {
  return `<section class="amc-block">
    <header><span>${esc(kicker)}</span><h3>${esc(title)}</h3></header>
    <ol class="amc-list">${list(items, limit) || '<li class="amc-empty">Nema zapisa u ovom ciklusu.</li>'}</ol>
  </section>`;
}

export function buildAktualCentral({ cards = [] } = {}) {
  if (!existsSync(FILE)) return { ok: false, reason: 'nema gnk-aktual/index.html' };
  let html = readFileSync(FILE, 'utf8');

  const items = allItems();
  const channels = CHANNELS.length;
  const sources = new Set(items.map((i) => i.sourceName)).size;
  const gallery = readJSON(join(PORTAL, 'data', 'nermin-sefic-gallery.json'), { items: [] });
  const tjednik = readJSON(join(ROOT, 'apps', 'tjednik', 'site', 'feed.json'), { items: [] });

  const sport = items.filter((i) => i.theme === 'sport');
  const politics = items.filter((i) => i.theme === 'politika');
  const security = items.filter((i) => ['sigurnost', 'rat', 'potres'].includes(i.theme));

  const galleryItems = (gallery.items || []).filter((g) => g.type === 'photo').slice(0, 4).map((g) => `<li>
      <a href="${esc(g.url)}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" width="220" height="220" loading="lazy" decoding="async"><span>${esc(g.title)}</span></a>
    </li>`).join('');

  const tjednikItems = (tjednik.items || []).slice(0, 6).map((i) => `<li>
      <time datetime="${esc(i.date_published)}">${esc(shortDate(String(i.date_published).slice(0, 10)))}</time>
      <a href="${esc(i.url)}" rel="external noopener">${esc(truncate(i.title.replace(/^Kritički osvrt:\s*/, ''), 110))}</a>
      <span class="amc-src">BUSINESS TJEDNIK</span>
    </li>`).join('');

  const platforms = [
    ['BUSINESS TJEDNIK', 'https://gnk-asg-tjednik.pages.dev/', 'Poslovni tjednik s kritičkim osvrtima na Lider, Jutarnji list, Poslovni dnevnik i Forbes.'],
    ['GALERIJA NERMINA SEFIĆA', 'https://gnk-asg.hr/galerija/', `${gallery.count || 63} stranica: portreti, događanja i tematski vizuali.`],
    ['AKTUAL MEDIA RADIO', 'https://gnk-asg.hr/radio/', 'Diskretni player i popis javnih radijskih kuća osam zemalja.'],
    ['CENTAR ZNANJA', 'https://gnk-asg.hr/knowledge-center/', 'Odgovori o grupi, projektima, financijama i kontaktima.'],
    ['DIGITALNA RADNA SNAGA', 'https://gnk-asg.hr/digital-workforce/', 'Javna simulacija s katalogom sintetičkih workera.'],
    ['NAŠA IZDANJA', 'https://gnk-asg.hr/izdanja/', 'Sva izdanja s karticama od 5–6 rečenica i vlastitim linkovima.'],
    ['OBJAVE', 'https://gnk-asg.hr/objave/', 'Arhiva objava, analiza i priopćenja s izvorima i datumima.'],
    ['KOMENTARI', 'https://gnk-asg.hr/komentari/', 'Stavovi uredništva, jasno odvojeni od vijesti i osvrta.'],
    ['AUTORSKE OBJAVE', 'https://gnk-asg.hr/autorske-objave/', 'Potpisani tekstovi i duži formati AKTUAL MEDIA.']
  ].map(([name, url, desc]) => `<li class="amc-card">
      <span class="amc-flag">Platforma</span>
      <h4><a href="${esc(url)}" rel="external noopener">${esc(name)}</a></h4>
      <p>${esc(desc)}</p>
      <a class="amc-go" href="${esc(url)}" rel="external noopener">Otvori ↗</a>
    </li>`).join('');

  const sourceCloud = CHANNELS.map((channel) => {
    const data = readJSON(join(DATA, `${channel.id}.json`), { items: [] });
    const ids = new Set((data.items || []).map((i) => i.source));
    const names = channel.sources.filter((src) => ids.has(src.id));
    if (!names.length) return '';
    return `<li><strong>${esc(channel.title)}</strong> ${names.map((src) => `<a href="${esc(channel.base)}izvor/${esc(src.id)}/" rel="external noopener">${esc(src.name)}</a>`).join(' · ')}</li>`;
  }).join('');

  const tabloids = [
    ['Lider', 'lider'], ['Jutarnji list', 'jutarnji'], ['Poslovni dnevnik', 'poslovni'], ['Forbes', 'forbes']
  ].map(([name, id]) => `<a href="https://gnk-asg-tjednik.pages.dev/izvori/${id}/" rel="external noopener">${esc(name)}</a>`).join(' · ');

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AKTUAL MEDIA — sve na jednom mjestu',
    url: 'https://gnk-asg.hr/gnk-aktual/',
    inLanguage: 'hr',
    about: { '@type': 'Organization', name: 'AKTUAL MEDIA d.o.o.', url: 'https://gnk-asg.hr/' },
    editor: { '@type': 'Person', name: 'Nermin Sefić', jobTitle: 'Urednik i direktor', url: 'https://gnk-asg.hr/nermin-sefic/' },
    hasPart: CHANNELS.map((c) => ({ '@type': 'WebSite', name: c.title, url: c.base })),
    isBasedOn: items.slice(0, 30).map((i) => i.url)
  };

  const block = `${START}
<style id="amc-style">
.am-central{--amc-ink:#eef3f8;--amc-muted:#a9b8cc;--amc-gold:#e0bd69;--amc-line:rgba(224,189,105,.28);background:#071426;color:var(--amc-ink);border:1px solid rgba(224,189,105,.24);border-radius:22px;padding:clamp(18px,3vw,34px);margin:28px 0;font-family:inherit}
.am-central *{box-sizing:border-box}
.am-central h2{font:700 clamp(24px,3.4vw,38px)/1.12 Georgia,serif;letter-spacing:-.01em;margin:6px 0 10px}
.am-central h3{font:700 clamp(18px,2vw,22px)/1.2 Georgia,serif;margin:0 0 10px}
.am-central h4{font:700 16px/1.25 Inter,system-ui,sans-serif;margin:0 0 6px}
.am-central a{color:inherit}
.amc-kicker{font:700 11px/1.4 Inter,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--amc-gold);margin:0}
.amc-lead{color:var(--amc-muted);max-width:78ch;margin:0 0 16px}
.amc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;list-style:none;padding:0;margin:0 0 22px}
.amc-stats li{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 14px}
.amc-stats b{display:block;font:700 26px/1 Georgia,serif;color:var(--amc-gold)}
.amc-stats span{font-size:12px;color:var(--amc-muted)}
.amc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;list-style:none;padding:0;margin:0 0 26px}
.amc-card{background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:14px}
.amc-card p{color:var(--amc-muted);font-size:13px;margin:0 0 10px}
.amc-flag{display:inline-block;font:600 10px/1.4 Inter,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--amc-gold);margin-bottom:8px}
.amc-go{font:600 13px/1 Inter,system-ui,sans-serif;color:var(--amc-gold);text-decoration:none}
.amc-block{border-top:1px solid var(--amc-line);padding-top:18px;margin-top:22px}
.amc-block header span{font:600 10px/1.4 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--amc-gold)}
.amc-block header h3{margin:4px 0 12px}
.amc-list{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:4px 22px}
.amc-list li{display:grid;grid-template-columns:64px 1fr;gap:2px 10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:14px;line-height:1.4}
.amc-list time{color:var(--amc-gold);font-size:11px;padding-top:3px}
.amc-list a{text-decoration:none}
.amc-list a:hover{text-decoration:underline}
.amc-src{grid-column:2;color:var(--amc-muted);font-size:11px}
.amc-empty{color:var(--amc-muted);display:block!important}
.amc-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;list-style:none;padding:0;margin:0}
.amc-gallery img{width:100%;height:auto;border-radius:12px;display:block}
.amc-gallery span{display:block;font-size:12px;color:var(--amc-muted);margin-top:6px}
.amc-rubrike{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px}
.amc-rubrike a{font:600 12px/1 Inter,system-ui,sans-serif;text-decoration:none;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:7px 11px;color:var(--amc-ink)}
.amc-rubrike a:hover{border-color:var(--amc-gold);color:var(--amc-gold)}
.amc-sources{list-style:none;padding:0;margin:0;display:grid;gap:8px;font-size:13px}
.amc-sources li{color:var(--amc-muted);border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:7px}
.amc-sources strong{color:var(--amc-ink);margin-right:6px}
.amc-sources a{color:var(--amc-gold);text-decoration:none}
.amc-sources a:hover{text-decoration:underline}
.amc-tags{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:10px 0 0}
.amc-tags li{font:600 12px/1 Inter,system-ui,sans-serif;color:var(--amc-gold);border:1px solid var(--amc-line);border-radius:999px;padding:6px 10px}
.am-central .amc-note{color:var(--amc-muted);font-size:12px;margin:18px 0 0}
@media (max-width:640px){.amc-list{grid-template-columns:1fr}}
</style>
<section class="am-central" id="sve-aktual-media" aria-labelledby="amcTitle">
  <p class="amc-kicker">AKTUAL MEDIA · sve na jednom mjestu</p>
  <h2 id="amcTitle">Sve što smo napravili — izdanja, deskovi, tjednik, galerija i radio</h2>
  <p class="amc-lead">Osam gradskih kanala na osam jezika, ${items.length} zapisa iz ${sources} medija, ${gallery.count || 63} stranica galerije i poslovni tjednik. Urednik i direktor izdanja je Nermin Sefić. Svaki zapis vodi na izvornik; tvrdnje izvora nisu tvrdnje redakcije, a automatski sastavljeni dijelovi nisu pojedinačno urednički pregledani.</p>
  <ul class="amc-stats">
    <li><b>${channels}</b><span>gradskih izdanja</span></li>
    <li><b>${items.length}</b><span>zapisa u arhivi</span></li>
    <li><b>${sources}</b><span>medijskih izvora</span></li>
    <li><b>${(gallery.count || 63)}</b><span>stranica galerije</span></li>
    <li><b>8</b><span>jezika</span></li>
  </ul>

  <ul class="amc-grid">${channelCards(cards)}${platforms}</ul>
  <nav class="amc-rubrike" aria-label="Rubrike AKTUAL MEDIA">
    <a href="/objave/">Objave</a><a href="/komentari/">Komentari</a><a href="/autorske-objave/">Autorske objave</a>
    <a href="/izdanja/sport/">Sport</a><a href="/izdanja/politika/">Politika</a><a href="/izdanja/sigurnost/">Sigurnost</a>
    <a href="/spt/">SPT</a><a href="/bank/">Adria Bank</a><a href="/digital-workforce/">Digitalna radna snaga</a>
    <a href="/knowledge-center/">Centar znanja</a><a href="/galerija/">Galerija</a><a href="/radio/">Radio</a>
  </nav>

  ${section('Najnovije iz svih izdanja', 'Pregled · 30 najnovijih', items, 30)}

  ${section('Sport', 'Desk · rezultati i osvrti', sport, 12)}
  ${section('Politika', 'Desk · odluke i izbori', politics, 12)}
  ${section('Sigurnost, kibernetika i preuzimanja', 'Desk · obavještajne teme, rat i potresi', security, 14)}

  <section class="amc-block">
    <header><span>BUSINESS TJEDNIK · kritički osvrti</span><h3>Poslovni tjednik na AKTUAL MEDIA</h3></header>
    <ol class="amc-list">${tjednikItems || '<li class="amc-empty">Tjednik još nema zapisa u ovom ciklusu.</li>'}</ol>
    <p class="amc-note">Prate se: ${tabloids} · <a href="https://gnk-asg-tjednik.pages.dev/" rel="external noopener">svi osvrti tjednika ↗</a></p>
  </section>

  <section class="amc-block">
    <header><span>MEDIJI · ${sources} izvora</span><h3>Koje medije čitamo</h3></header>
    <ul class="amc-sources">${sourceCloud}</ul>
  </section>

  <section class="amc-block">
    <header><span>GALERIJA · Nermin Sefić</span><h3>Vizuali s vlastitim stranicama</h3></header>
    <ul class="amc-gallery">${galleryItems}</ul>
  </section>

  <section class="amc-block">
    <header><span>Oznake</span><h3>Hashtagovi izdanja</h3></header>
    <ul class="amc-tags">${HASHTAGS.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    <p class="amc-note">Za autora se koriste oznake <strong>#NerminSefić</strong> i <strong>#NerminSefic</strong>; ostale kombinacije imena nisu dio uređivačkog standarda. <a href="/izdanja/">Sva izdanja →</a></p>
  </section>
</section>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
${END}`;

  if (html.includes(START) && html.includes(END)) {
    html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => block);
  } else {
    const anchor = '<!-- IZDANJA-BAND:END -->';
    if (!html.includes(anchor)) return { ok: false, reason: 'nema IZDANJA-BAND markera' };
    html = html.replace(anchor, `${anchor}\n${block}`);
  }

  const desc = `AKTUAL MEDIA na jednom mjestu: ${channels} gradskih izdanja na 8 jezika, ${items.length} zapisa iz ${sources} medija, poslovni tjednik, sport, politika, sigurnost, galerija Nermina Sefića i radio. Urednik i direktor: Nermin Sefić.`;
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(truncate(desc, 300))}">`);
  if (!/<meta name="keywords"/.test(html)) {
    html = html.replace('</title>', `</title>\n<meta name="keywords" content="${esc(HASHTAGS.concat(['AKTUAL MEDIA', 'regionalne vijesti']).join(', '))}">`);
  }

  writeFileSync(FILE, html);
  return { ok: true, items: items.length, sources, channels, sport: sport.length, politics: politics.length, security: security.length };
}
