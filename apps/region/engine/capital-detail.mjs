/**
 * Glavni gradovi — jedna stranica po prijestolnici.
 *
 * Zašto zasebna stranica, a ne samo redak u tablici: grad koji mreža pokriva
 * mora imati vlastitu adresu na kojoj se vidi jezik, izvori, najnoviji zapisi
 * i mjesto u mreži. Kad se pojavi novi glavni grad, ovaj modul ga izgradi iz
 * istog ugovora (`capitals.json` + `channels.json`), bez ručnog rada.
 *
 * Pravilo koje se ne krši: stranica prijestolnice koja još nema izdanje NE
 * izmišlja sadržaj. Ona kaže što nedostaje i vodi na izdanje koje tu zemlju
 * pokriva danas.
 */
import { esc, shortDate, stampLocal } from './lib.mjs';
import { spiderWeb, SPIDER_CSS } from '../../satellites/lib/spiderweb-v1.mjs';

/* Boja kontinenta nije dekoracija: ista boja stoji na kartici i na stranici
   grada, pa se Europа, Afrika i Azija razlikuju i prije nego se pročita tekst. */
export const CONTINENT_COLOR = {
  Europa: '#6ea8ff', Afrika: '#f0b26a', Azija: '#e0bd69',
  'Sjeverna Amerika': '#7fd1c1', 'Južna Amerika': '#8ddf8d', Oceanija: '#74d9e0'
};

export const CAPITAL_CSS = `.cp-crumb{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:0 0 18px;font:600 10.5px/1.6 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#8296ad}
.cp-crumb a{color:#e0bd69;text-decoration:none;border-bottom:1px solid rgba(224,189,105,.35)}
.cp-hero{padding:2px 0 10px 16px;border-left:3px solid var(--cp,#e0bd69)}
.cp-kicker{margin:0 0 10px;font:700 10.5px/1.4 system-ui;letter-spacing:.18em;text-transform:uppercase;color:#e0bd69}
.cp-hero h1{font:700 clamp(30px,5vw,54px)/1.02 Georgia,"Times New Roman",serif;letter-spacing:-.022em;margin:0 0 8px;max-width:22ch;color:#f4f7fb}
.cp-local{margin:0 0 12px;font:700 15px/1.4 system-ui;color:#a9b6c6}
.cp-lead{max-width:78ch;color:#bccbdb;font-size:clamp(15px,1.6vw,17px);margin:0 0 16px}
.cp-badges{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0 0 20px;padding:0}
.cp-badges li{border:1px solid #25435f;border-radius:999px;padding:6px 11px;font:700 10px/1.2 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#c3cede;background:#08182a}
.cp-badges b{color:#e0bd69;font-weight:800}
.cp-art{margin:0 0 24px;border:1px solid #1e3b58;border-radius:16px;overflow:hidden;background:#0b1d31}
.cp-art img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}
.cp-art figcaption{padding:11px 15px;font:400 12px/1.55 system-ui;color:#9fb0c4;border-top:1px solid #1e3b58;background:#08182a}
.cp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:16px;margin:0 0 24px}
.cp-box{border:1px solid #1e3b58;border-radius:14px;background:#0b1d31;padding:16px 18px}
.cp-box h2{font:700 clamp(17px,2vw,21px)/1.25 Georgia,serif;margin:0 0 10px;color:#f2f6fb}
.cp-box h3{font:700 12px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#8fa3ba;margin:14px 0 6px}
.cp-box p{margin:0 0 8px;color:#bccbdb;font-size:14px}
.cp-box ul,.cp-box ol{margin:0;padding-left:18px;display:grid;gap:7px;font-size:14px;color:#bccbdb}
.cp-box li::marker{color:#e0bd69;font-weight:700}
.cp-links{list-style:none;margin:0;padding:0;display:grid;gap:7px;font-size:14px}
.cp-links a{color:#e0bd69}
.cp-src{list-style:none;margin:0;padding:0;display:grid;gap:0}
.cp-src li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:baseline;padding:8px 0;border-top:1px solid #16304a;font-size:14px}
.cp-src li:first-child{border-top:0}
.cp-src a{color:#eaf1f8}
.cp-src .t{font:700 9.5px/1.5 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#8296ad;white-space:nowrap}
.cp-items{list-style:none;margin:0;padding:0;display:grid;gap:0}
.cp-items li{display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:12px;padding:10px 0;border-top:1px solid #16304a;font-size:14.5px}
.cp-items li:first-child{border-top:0}
.cp-items time{font:600 10.5px/1.7 system-ui;color:#8fa3ba}
.cp-items a{color:#eaf1f8}
.cp-items .s{font:600 9.5px/1.7 system-ui;text-transform:uppercase;letter-spacing:.09em;color:#e0bd69;white-space:nowrap}
.cp-note{font-size:12.5px;color:#94a8bd;margin:8px 0 0}
.cp-soon{display:inline-block;font:800 9.5px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#f0dfb6;background:#3a2f14;border:1px dashed #8c6a1f;border-radius:999px;padding:5px 9px}
.cp-near{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;list-style:none;margin:0;padding:0}
.cp-near a{display:grid;gap:2px;padding:10px 12px;border:1px solid #1e3b58;border-radius:11px;background:#08182a;text-decoration:none}
.cp-near a:hover{border-color:#e0bd69}
.cp-near b{font:700 14px/1.25 Georgia,serif;color:#f2f6fb}
.cp-near span{font:600 9.5px/1.3 system-ui;letter-spacing:.09em;text-transform:uppercase;color:#8fa3ba}
.cp-next{display:flex;flex-wrap:wrap;gap:10px 18px;justify-content:space-between;align-items:center;margin:26px 0 0;border-top:1px solid #1e3b58;padding-top:16px;font-size:14px}
.cp-next a{color:#e0bd69}
.cp-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;list-style:none;margin:14px 0 26px;padding:0}
.cp-cards li{border:1px solid #1e3b58;border-radius:14px;overflow:hidden;background:#0b1d31;display:grid}
.cp-cards img{display:block;width:100%;height:auto;aspect-ratio:440/248;object-fit:cover}
.cp-cards .b{padding:10px 12px 12px;display:grid;gap:4px}
.cp-cards .n{font:700 15px/1.25 Georgia,serif;color:#f2f6fb}
.cp-cards .c{font:600 9.5px/1.3 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#8fa3ba}
.cp-cards li[data-c="europa"]{border-top:3px solid #6ea8ff}
.cp-cards li[data-c="afrika"]{border-top:3px solid #f0b26a}
.cp-cards li[data-c="azija"]{border-top:3px solid #e0bd69}
.cp-cards li[data-c="sjeverna-amerika"]{border-top:3px solid #7fd1c1}
.cp-cards li[data-c="juzna-amerika"]{border-top:3px solid #8ddf8d}
.cp-cards li[data-c="oceanija"]{border-top:3px solid #74d9e0}
.cp-cards a{text-decoration:none}
.cp-cards a:hover .n{color:#e0bd69}
@media(max-width:700px){.cp-items li{grid-template-columns:76px minmax(0,1fr)}.cp-items .s{display:none}}`;

const LANG_PLURAL = { hr: 'hrvatski', en: 'engleski' };

/* Naziv jezika dolazi iz Intl-a, ne iz ručne tablice: za svaki jezik u mreži
   postoji ispravan naziv, i na hrvatskom i na engleskom. */
function langName(code, uiLang) {
  try {
    const name = new Intl.DisplayNames([uiLang], { type: 'language' }).of(code) || code;
    return uiLang === 'en' ? name.charAt(0).toUpperCase() + name.slice(1) : name;
  } catch {
    return code;
  }
}

const initials = (text) => String(text || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 18) || 'Grad';

export function buildCapitalPage(capital, ctx) {
  const {
    lang = 'hr', capitals = [], channelBy, channelData, portalShell, portalHeader, portalFooter, MEDIA_ID, artAlt: artAltByLang, feeds = []
  } = ctx;
  const en = lang === 'en';
  const channel = capital.edition ? channelBy(capital.edition) : null;
  const seats = !channel && capital.seats ? channelBy(capital.seats) : null;
  const slug = capital.slug;
  const canonical = en
    ? `https://gnk-asg.hr/en/capitals/${slug}/`
    : `https://gnk-asg.hr/glavni-gradovi/${slug}/`;
  const alternate = en ? `https://gnk-asg.hr/glavni-gradovi/${slug}/` : `https://gnk-asg.hr/en/capitals/${slug}/`;
  const city = en ? (capital.capitalEn || capital.capital) : capital.capital;
  const country = en ? (capital.countryEn || capital.country) : capital.country;
  const indexHref = en ? '/en/capitals/' : '/glavni-gradovi/';
  const language = langName(capital.lang, lang);

  const data = channel ? channelData(channel.id) : { items: [], updatedAt: '' };
  const sources = channel && Array.isArray(channel.sources) ? channel.sources : [];
  const items = (data.items || []).slice(0, 4);
  const artId = channel ? channel.id : capital.slug;
  /* Alt iz atlasa je specifičan (kupola, obelisk, jezero), pa ima prednost
     pred generičkim opisom; generički ostaje kad grafike nema u manifestu. */
  const artAlt = (artAltByLang && artAltByLang[lang])
    || (channel
      ? (en
        ? `${city}, ${country} — cover artwork of the edition`
        : `${city}, ${country} — naslovna grafika izdanja`)
      : (en
        ? `${city} — illustration of the capital`
        : `${city} — ilustracija prijestolnice`));
  const artCaption = channel
    ? (en
      ? `Cover artwork of the ${channel.city} edition. Illustration for the edition, not a documentary photograph.`
      : `Naslovna grafika izdanja ${channel.city}. Grafika za izdanje, ne dokumentarna fotografija.`)
    : (en
      ? `Illustration of the capital. There is no edition here yet, so the image shows the city — not published content.`
      : `Ilustracija prijestolnice. Izdanja ovdje još nema, pa slika prikazuje grad — ne objavljeni sadržaj.`);

  const stats = [
    [en ? 'Country' : 'Zemlja', country],
    [en ? 'Continent' : 'Kontinent', capital.continent],
    [en ? 'Language' : 'Jezik', language],
    [en ? 'Time zone' : 'Vremenska zona', capital.timezone],
    [en ? 'Status' : 'Status', channel ? (en ? 'live' : 'aktivno') : (en ? 'in preparation' : 'u pripremi')],
    ...(channel ? [[en ? 'Sources' : 'Izvora', String(sources.length)], [en ? 'Records stored' : 'Zapisa u arhivi', String((data.items || []).length)]] : [])
  ];
  const badgeList = stats.map(([k, v]) => `<li>${esc(k)}: <b>${esc(v)}</b></li>`).join('');

  const lead = channel
    ? (en
      ? `Capital: ${city}. Country: ${country}. The ${channel.title} edition follows ${sources.length} sources and links every record back to its original; the edition language is ${language}. This page shows what the edition publishes, which sources it follows and where it sits in the network.`
      : `Glavni grad: ${city}. Zemlja: ${country}. Izdanje ${channel.title} prati ${sources.length} izvora i svaki zapis vraća na izvornik; jezik izdanja je ${language}. Ova stranica pokazuje što izdanje objavljuje, koje izvore prati i gdje se nalazi u mreži.`)
    : (en
      ? `Capital: ${city}. Country: ${country}. The capital still has no verified source list of its own, so no edition is published here — nothing is announced before it exists. The country is covered today by the ${seats ? seats.city : ''} edition, which keeps its own address.`
      : `Glavni grad: ${city}. Zemlja: ${country}. Prijestolnica još nema vlastitu, provjerenu listu izvora, pa se izdanje ovdje ne objavljuje — ništa se ne najavljuje prije nego postoji. Zemlju danas pokriva izdanje ${seats ? seats.city : ''}, koje zadržava svoju adresu.`);

  const sourceList = sources.length
    ? `<ul class="cp-src">${sources.map((source) => `<li><a href="${esc(source.url || (source.urls || [])[0] || '#')}" rel="external noopener">${esc(source.name)}</a><span class="t">${esc(String(source.type || 'rss').toUpperCase())}${source.optional ? ` · ${en ? 'optional' : 'opcionalno'}` : ''}${source.cap ? ` · ${source.cap} ${en ? 'items' : 'zapisa'}` : ''}</span></li>`).join('')}</ul>`
    : `<p>${en ? 'No verified source list yet.' : 'Provjerena lista izvora još ne postoji.'}</p>`;

  const itemList = items.length
    ? `<ul class="cp-items">${items.map((item) => `<li><time datetime="${esc(item.date || '')}">${esc(item.date ? shortDate(String(item.date).slice(0, 10), lang) : '')}</time><a href="${esc(channel.base)}clanak/${esc(item.slug)}/">${esc(item.title)}</a><span class="s">${esc(item.sourceName || '')}</span></li>`).join('')}</ul>`
    : `<p>${en ? 'No records stored yet. The edition does not fill the gap with invented content.' : 'Zapisa još nema. Izdanje prazninu ne popunjava izmišljenim sadržajem.'}</p>`;

  const stamp = data.updatedAt ? stampLocal(data.updatedAt, capital.lang, capital.timezone) : null;

  const liveBoxes = () => `<div class="cp-grid">
    <section class="cp-box" aria-labelledby="cpSrc">
      <h2 id="cpSrc">${en ? 'Sources the edition follows' : 'Izvori koje izdanje prati'}</h2>
      ${sourceList}
      <p class="cp-note">${en ? "Every record keeps its original title, summary and a direct link. Claims made by a source remain that source's claims, never the newsroom's." : 'Svaki zapis zadržava naslov, sažetak i izravnu poveznicu na izvornik. Tvrdnje izvornika su tvrdnje izvornika, ne redakcije.'}</p>
    </section>
    <section class="cp-box" aria-labelledby="cpHow">
      <h2 id="cpHow">${en ? 'How to check the edition yourself' : 'Kako sami provjeriti izdanje'}</h2>
      <ul class="cp-links">
        <li><a href="${esc(channel.base)}feed.xml" rel="external noopener">${en ? 'Feed' : 'Feed'} ↗</a> — ${en ? 'every record with its date' : 'svaki zapis s datumom'}</li>
        <li><a href="${esc(channel.base)}sitemap.xml" rel="external noopener">${en ? 'Sitemap' : 'Sitemap'} ↗</a> — ${en ? 'all published pages' : 'sve objavljene stranice'}</li>
        <li><a href="${esc(channel.base)}metodologija/" rel="external noopener">${en ? 'Methodology' : 'Metodologija'} ↗</a> — ${en ? 'what is checked and what is not' : 'što se provjerava, a što ne'}</li>
        <li><a href="${esc(channel.base)}izvori/" rel="external noopener">${en ? 'Source list' : 'Popis izvora'} ↗</a> — ${en ? 'the same list, page by page' : 'isti popis, stranica po stranica'}</li>
      </ul>
      <p class="cp-note">${stamp ? (en ? `Edition last refreshed: ${stamp.stamp}, ${stamp.dayLabel || stamp.day}.` : `Izdanje posljednji put osvježeno: ${stamp.stamp}, ${stamp.dayLabel || stamp.day}.`) : (en ? 'Refresh time is not recorded for this edition.' : 'Vrijeme osvježavanja nije zabilježeno za ovo izdanje.')}</p>
    </section>
  </div>`;

  const soonBoxes = `<div class="cp-grid">
    <section class="cp-box" aria-labelledby="cpWhy">
      <h2 id="cpWhy">${en ? 'Why there is no edition here yet' : 'Zašto ovdje još nema izdanja'}</h2>
      <p>${esc(capital.note || '')}</p>
      <p>${en ? 'An edition opens only when the whole contract exists:' : 'Izdanje se otvara tek kad postoji cijeli ugovor:'}</p>
      <ol>${(ctx.standard || []).map((line) => `<li>${esc(line)}</li>`).join('')}</ol>
    </section>
    <section class="cp-box" aria-labelledby="cpNow">
      <h2 id="cpNow">${en ? 'Where the country stands today' : 'Gdje je zemlja danas u mreži'}</h2>
      ${seats ? `<p><a href="${esc(seats.base)}" rel="external noopener"><b>${esc(seats.title)}</b></a> — ${en ? 'the edition that covers' : 'izdanje koje pokriva'} ${esc(country)}.</p>
      <ul class="cp-links">
        <li><a href="${esc(seats.base)}" rel="external noopener">${en ? 'Open the edition' : 'Otvori izdanje'} ↗</a></li>
        <li><a href="/kanal/${esc(seats.id)}/">${en ? 'About the edition in the network' : 'O izdanju u mreži'} →</a></li>
        <li><a href="${esc(seats.base)}izvori/" rel="external noopener">${en ? 'Sources of that edition' : 'Izvori tog izdanja'} ↗</a></li>
      </ul>` : ''}
      <p class="cp-note">${en ? "The capital does not take over the address of the other city: when the edition opens, it gets its own folder, sitemap and feed." : 'Prijestolnica ne preuzima adresu drugoga grada: kad se izdanje otvori, dobiva vlastitu mapu, sitemap i feed.'}</p>
    </section>
  </div>`;

  const index = capitals.findIndex((entry) => entry.slug === slug);
  const prev = index > 0 ? capitals[index - 1] : null;
  const next = index >= 0 && index < capitals.length - 1 ? capitals[index + 1] : null;
  const linkFor = (entry, dir) => {
    if (!entry) return '<span></span>';
    const name = en ? entry.capitalEn || entry.capital : entry.capital;
    return `<a href="${en ? '/en/capitals' : '/glavni-gradovi'}/${esc(entry.slug)}/" rel="${dir === 'prev' ? 'prev' : 'next'}">${dir === 'prev' ? '←' : ''} ${esc(name)}${dir === 'next' ? ' →' : ''}</a>`;
  };

  const continentColor = CONTINENT_COLOR[capital.continent] || '#e0bd69';
  const body = `${portalHeader('glavni-gradovi/', { h1: false })}
<main id="sadrzaj" tabindex="-1" class="iz-wrap">
  <nav class="cp-crumb" aria-label="${en ? 'Breadcrumb' : 'Putanja'}"><a href="/gnk-aktual/">AKTUAL MEDIA</a><span aria-hidden="true">›</span><a href="${indexHref}">${en ? 'Capitals' : 'Glavni gradovi'}</a><span aria-hidden="true">›</span><span>${esc(city)}</span></nav>
  <section class="cp-hero" style="--cp:${continentColor}">
    <p class="cp-kicker">${en ? 'Capital' : 'Glavni grad'} · ${esc(capital.continent)} · ${esc(country)}</p>
    <h1>${esc(city)} — ${esc(country)}</h1>
    ${capital.capitalLocal && capital.capitalLocal !== city ? `<p class="cp-local" lang="${esc(capital.lang)}">${esc(capital.capitalLocal)}</p>` : ''}
    <p class="cp-lead">${esc(lead)}</p>
    <ul class="cp-badges">${badgeList}</ul>
  </section>

  ${artId ? `<figure class="cp-art">
    <img src="/assets/izdanja/${esc(artId)}-1200.webp" srcset="/assets/izdanja/${esc(artId)}-440.webp 440w, /assets/izdanja/${esc(artId)}-800.webp 800w, /assets/izdanja/${esc(artId)}-1200.webp 1200w" sizes="(max-width:760px) 100vw, 1100px" width="1200" height="675" alt="${esc(artAlt)}" decoding="async" fetchpriority="high">
    <figcaption>${esc(artCaption)}</figcaption>
  </figure>` : ''}

  ${channel ? liveBoxes() : soonBoxes}

  ${channel ? `<section aria-labelledby="cpLatest" style="margin-top:24px">
    <h2 id="cpLatest" style="font:700 clamp(19px,2.2vw,24px)/1.25 Georgia,serif;margin:0 0 6px">${en ? 'Latest from the edition' : 'Najnovije iz izdanja'}</h2>
    ${itemList}
    <p class="cp-note"><a href="${esc(channel.base)}" rel="external noopener">${en ? 'All records in the edition' : 'Svi zapisi u izdanju'} ↗</a></p>
  </section>
  <section style="margin-top:8px" aria-labelledby="cpSeats">${seats ? `<h2 id="cpSeats" style="font:700 clamp(19px,2.2vw,24px)/1.25 Georgia,serif;margin:18px 0 6px">${en ? 'The country is also in the network through' : 'Zemlja je u mreži i preko izdanja'}</h2>
    <p class="cp-note"><a href="${esc(seats.base)}" rel="external noopener">${esc(seats.title)}</a> — ${en ? 'the city that keeps its own edition while the capital is covered from here.' : 'grada koji zadržava svoje izdanje dok se prijestolnica pokriva odavde.'}</p>` : ''}</section>` : `<section style="margin-top:8px" aria-labelledby="cpSeats2">
    <h2 id="cpSeats2" style="font:700 clamp(19px,2.2vw,24px)/1.25 Georgia,serif;margin:18px 0 6px">${en ? 'Today from the edition that covers this country' : 'Danas iz izdanja koje pokriva ovu zemlju'}</h2>
    ${seats ? `<ul class="cp-items">${(channelData(seats.id).items || []).slice(0, 3).map((item) => `<li><time datetime="${esc(item.date || '')}">${esc(item.date ? shortDate(String(item.date).slice(0, 10), lang) : '')}</time><a href="${esc(seats.base)}clanak/${esc(item.slug)}/">${esc(item.title)}</a><span class="s">${esc(item.sourceName || '')}</span></li>`).join('')}</ul>` : ''}
  </section>`}

  <section aria-labelledby="cpWebTitle" style="margin-top:20px">
    <h2 id="cpWebTitle" style="font:700 clamp(19px,2.2vw,24px)/1.25 Georgia,serif;margin:0 0 6px">${en ? 'This capital in the web' : 'Ovaj glavni grad u mreži'}</h2>
    ${spiderWeb({ lang, selfUrl: canonical, theme: 'dark', compact: true })}
    <p class="cp-note"><a href="/mreza/">${en ? 'The whole web' : 'Cijela mreža'} →</a> · <a href="/kanal/">${en ? 'All channels' : 'Svi kanali'} →</a> · <a href="/izdanja/">${en ? 'All editions' : 'Sva izdanja'} →</a></p>
  </section>

  ${(ctx.capitals || []).filter((entry) => entry.continent === capital.continent && entry.slug !== slug).length ? `<section aria-labelledby="cpNear" style="margin-top:22px">
    <h2 id="cpNear" style="font:700 clamp(19px,2.2vw,24px)/1.25 Georgia,serif;margin:0 0 10px">${en ? `Other capitals in ${capital.continent}` : `Ostali glavni gradovi — ${capital.continent}`}</h2>
    <ul class="cp-near">${(ctx.capitals || []).filter((entry) => entry.continent === capital.continent && entry.slug !== slug).map((entry) => `<li><a href="${en ? '/en/capitals' : '/glavni-gradovi'}/${esc(entry.slug)}/"><b>${esc(en ? entry.capitalEn || entry.capital : entry.capital)}</b><span>${esc(en ? entry.countryEn || entry.country : entry.country)}</span></a></li>`).join('')}</ul>
  </section>` : ''}

  <nav class="cp-next" aria-label="${en ? 'Other capitals' : 'Ostali glavni gradovi'}">
    ${linkFor(prev, 'prev')}
    <a href="${indexHref}">${en ? 'All capitals' : 'Svi glavni gradovi'}</a>
    ${linkFor(next, 'next')}
  </nav>
</main>
${portalFooter()}`;

  const description = channel
    ? (en
      ? `Capital: ${city}. Country: ${country}. The ${channel.title} edition follows ${sources.length} verified sources in ${language} and links every record back to the original. The page lists the sources, the latest records and the place of this capital in the network.`
      : `Glavni grad ${city} · ${country}. Izdanje ${channel.title} prati ${sources.length} provjerenih izvora; jezik izdanja je ${language} i svaki zapis vraća na izvornik. Stranica navodi izvore, najnovije zapise i mjesto ovog glavnog grada u mreži.`)
    : (en
      ? `Capital: ${city}. Country: ${country}. The capital still has no verified source list, so no edition is published there. The country is covered today by the ${seats ? seats.city : ''} edition; the page explains what is missing and what the capital gets when it opens.`
      : `Glavni grad ${city} · ${country}. Prijestolnica još nema provjerenu listu izvora, pa se izdanje ondje ne objavljuje. Zemlju danas pokriva izdanje ${seats ? seats.city : ''}; stranica objašnjava što nedostaje i što glavni grad dobiva kad se otvori.`);

  const title = en
    ? `${city}, ${country} — capital edition | AKTUAL MEDIA`
    : `${city} — glavni grad · ${country} | AKTUAL MEDIA`;

  /* Ključne riječi moraju opisati mjesto, izdanje i vrstu stranice — dvadeset
     pojmova je prag SEO matrice, a ne ukras. */
  const keywords = [
    city, capital.capitalLocal, capital.capitalEn, country, capital.countryEn, capital.continent,
    capital.lang, language, capital.countryCode,
    channel ? channel.title : '', channel ? channel.city : '', channel ? channel.country : '',
    seats ? seats.title : '', seats ? seats.city : '',
    en ? 'capital' : 'glavni grad', en ? 'capital city' : 'prijestolnica',
    en ? 'news' : 'vijesti', en ? 'sources' : 'izvori', en ? 'verification' : 'provjera',
    en ? 'edition' : 'izdanje', en ? 'media network' : 'medijska mreža',
    'AKTUAL MEDIA', 'Aktual Media', 'glavni gradovi', 'capitals', 'GNK ASG',
    en ? 'feed' : 'feed', 'sitemap', 'atlas'
  ].filter(Boolean);

  const tags = [`#${initials(capital.capitalEn || capital.capital)}`, `#${initials(capital.countryEn || capital.country)}`, '#GlavniGradovi', '#AktualMedia', '#GNKASG'];

  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'City',
      '@id': `${canonical}#city`,
      name: city,
      alternateName: [capital.capitalLocal, capital.capital, capital.capitalEn].filter(Boolean).filter((v, i, all) => all.indexOf(v) === i),
      url: canonical,
      containedInPlace: { '@type': 'Country', name: country },
      address: { '@type': 'PostalAddress', addressCountry: capital.countryCode, addressLocality: city }
    },
    {
      '@context': 'https://schema.org', '@type': 'WebPage',
      '@id': `${canonical}#webpage`, url: canonical, name: title,
      description, inLanguage: lang,
      isPartOf: { '@id': 'https://gnk-asg.hr/#website' },
      about: { '@id': `${canonical}#city` },
      publisher: { '@id': MEDIA_ID },
      primaryImageOfPage: artId ? { '@type': 'ImageObject', url: `https://gnk-asg.hr/assets/izdanja/${artId}-1200.webp`, caption: artAlt, width: 1200, height: 675 } : undefined
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: 'https://gnk-asg.hr/gnk-aktual/' },
        { '@type': 'ListItem', position: 2, name: en ? 'Capitals' : 'Glavni gradovi', item: en ? 'https://gnk-asg.hr/en/capitals/' : 'https://gnk-asg.hr/glavni-gradovi/' },
        { '@type': 'ListItem', position: 3, name: city, item: canonical }
      ]
    },
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      '@id': `${canonical}#page`, url: canonical, name: title, description, inLanguage: lang,
      about: { '@id': `${canonical}#city` }, publisher: { '@id': MEDIA_ID },
      isPartOf: { '@id': 'https://gnk-asg.hr/#website' }
    }
  ];

  return portalShell({
    title,
    description,
    path: '',
    canonicalPath: canonical,
    lang,
    alternates: [
      { hreflang: 'hr', href: `https://gnk-asg.hr/glavni-gradovi/${slug}/` },
      { hreflang: 'en', href: `https://gnk-asg.hr/en/capitals/${slug}/` },
      { hreflang: 'x-default', href: `https://gnk-asg.hr/glavni-gradovi/${slug}/` }
    ],
    keywords,
    tags,
    geo: { placename: city, country: capital.countryCode },
    logos: ['aktual-media-hr', 'aktual-media-en'],
    feeds,
    preload: artId ? {
      href: `/assets/izdanja/${artId}-1200.webp`,
      imagesrcset: `/assets/izdanja/${artId}-800.webp 800w, /assets/izdanja/${artId}-1200.webp 1200w`,
      imagesizes: '(max-width:760px) 100vw, 1100px'
    } : null,
    cssExtra: `${SPIDER_CSS}\n${CAPITAL_CSS}`,
    image: artId ? `/assets/izdanja/${artId}-og.jpg` : undefined,
    imageAlt: artAlt,
    jsonld,
    body
  });
}
