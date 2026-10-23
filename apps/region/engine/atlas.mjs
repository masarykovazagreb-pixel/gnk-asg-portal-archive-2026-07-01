/**
 * ATLAS MREŽE — slikovni pregled svih zemalja koje pokrivamo.
 *
 * Zašto zasebna stranica: `/glavni-gradovi/` je ugovor (tablica, kontinenti,
 * status), a čitatelju treba i pregled koji se gleda — 17 gradova kao slike,
 * složene po kontinentima, sa statusom i jezikom. Atlas ne uvodi nove podatke:
 * sve dolazi iz `capitals.json` i `channels.json`, pa se ne može razići s
 * popisom ni sa stranicama gradova.
 *
 * Pravila:
 *   • svaka kartica ima sliku (nijedna „kućica" nije prazna);
 *   • alt imenuje grad i zemlju, potpis ispod slike nosi status;
 *   • zemlja u pripremi ne izgleda kao izdanje — piše što je pokriva danas;
 *   • stranica ima hreflang par (hr/en) i vlastiti kanonski URL.
 */
import { esc } from './lib.mjs';
import { CONTINENT_COLOR } from './capital-detail.mjs';

const CONTINENT_EN = {
  Europa: 'Europe',
  Afrika: 'Africa',
  Azija: 'Asia',
  'Sjeverna Amerika': 'North America',
  'Južna Amerika': 'South America',
  Oceanija: 'Oceania'
};

const ORDER = ['Europa', 'Afrika', 'Azija', 'Sjeverna Amerika', 'Južna Amerika', 'Oceanija'];

const contSlug = (name) => String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, '-');

function langLabel(code, lang) {
  try {
    const name = new Intl.DisplayNames([lang === 'en' ? 'en' : 'hr-HR'], { type: 'language' }).of(code);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
  } catch {
    return code;
  }
}

export const ATLAS_CSS = `
.at-hero{padding:clamp(24px,4vw,44px) 0 18px}
.at-k{font:800 10.5px/1.4 system-ui;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:0 0 10px}
.at-hero h1{font:700 clamp(32px,5.4vw,58px)/1.02 Georgia,serif;letter-spacing:-.02em;margin:0 0 12px;max-width:20ch}
.at-hero p{max-width:72ch;color:var(--muted);margin:0}
.at-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:9px;margin:20px 0 0;padding:0;list-style:none}
.at-stats div{border:1px solid #1e3b58;border-radius:12px;padding:11px 13px;background:linear-gradient(180deg,#0c1e33,#081626)}
.at-stats b{display:block;font:800 22px/1.1 system-ui;color:#f4f7fb}
.at-stats span{display:block;margin-top:3px;font:600 9.5px/1.3 system-ui;letter-spacing:.13em;text-transform:uppercase;color:#8fa3ba}
.at-band{padding:26px 0 6px;border-top:1px solid #17314a;margin-top:22px}
.at-cont{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;margin:0 0 14px}
.at-cont h2{font:700 clamp(20px,2.6vw,28px)/1.15 Georgia,serif;margin:0;color:#f2f6fb}
.at-cont b{font:800 10px/1 system-ui;letter-spacing:.08em;color:#08131f;background:var(--cp,#e0bd69);border-radius:999px;padding:5px 9px}
.at-cont span{font:600 9.5px/1 system-ui;letter-spacing:.13em;text-transform:uppercase;color:#8296ad}
.at-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin:0;padding:0;list-style:none}
.at-card a{display:block;position:relative;border:1px solid #1e3b58;border-radius:14px;overflow:hidden;background:#0a1929;transition:border-color .18s ease,transform .18s ease}
.at-card a:hover{border-color:var(--cp,#e0bd69);transform:translateY(-2px);text-decoration:none}
.at-card figure{margin:0;position:relative}
.at-card img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#12283d;transition:transform .35s ease}
.at-card a:hover img{transform:scale(1.03)}
.at-card figcaption{position:relative;padding:12px 14px 14px;background:linear-gradient(180deg,rgba(4,12,22,.2),#08182a 42%)}
.at-n{display:block;font:700 19px/1.15 Georgia,serif;color:#f4f7fb}
.at-c{display:block;margin-top:2px;font:600 10px/1.4 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#93a7bd}
.at-s{display:block;margin-top:6px;font:600 10.5px/1.4 system-ui;color:#c9d6e4}
.at-s em{font-style:normal;color:var(--cp,#e0bd69)}
.at-flag{position:absolute;top:9px;left:9px;font:800 8.5px/1 system-ui;letter-spacing:.09em;text-transform:uppercase;padding:5px 7px;border-radius:999px;background:rgba(4,12,22,.82);border:1px solid rgba(224,189,105,.45);color:#f0dfb6}
.at-how{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:14px 0 0;padding:0;list-style:none;counter-reset:step}
.at-how li{border:1px solid #1e3b58;border-radius:12px;background:#0b1d31;padding:14px 16px 15px}
.at-how b{display:block;font:700 13px/1.3 system-ui;color:#f2f6fb;margin-bottom:4px}
.at-how p{margin:0;font-size:13px;color:#a9b6c6}
.at-cta{display:flex;flex-wrap:wrap;gap:9px;margin:22px 0 0}
.at-map{margin:20px 0 0;padding:0}
.at-map img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:16px;border:1px solid #1e3b58;background:#0a1726}
.at-map figcaption{margin:9px 2px 0;font:400 12px/1.55 system-ui;color:#8fa3ba;max-width:82ch}
@media (max-width:520px){.at-grid{grid-template-columns:1fr}}
`;

export function buildAtlasPage({ lang, capitals, channels, counts, artMeta, standard, shell, header, footer }) {
  const en = lang === 'en';
  const base = en ? '/en/atlas/' : '/atlas/';
  const all = capitals.filter((c) => c.slug);
  const live = all.filter((c) => c.status === 'live' && c.edition);
  const preparing = all.filter((c) => c.status !== 'live');
  const channelBy = (id) => channels.find((c) => c.id === id) || null;
  const countFor = (id) => (counts && counts[id]) || 0;
  const continents = ORDER.filter((name) => all.some((c) => c.continent === name))
    .concat(all.map((c) => c.continent).filter((name) => !ORDER.includes(name)));
  const languages = new Set(all.map((c) => c.lang));

  const card = (c) => {
    const channel = c.edition ? channelBy(c.edition) : null;
    const seat = !channel && c.seats ? channelBy(c.seats) : null;
    const artId = channel ? channel.id : seat ? seat.id : c.slug;
    const name = en ? c.capitalEn || c.capital : c.capital;
    const country = en ? c.countryEn || c.country : c.country;
    const meta = artMeta ? artMeta(artId) : null;
    const alt = (meta && meta.alt && meta.alt[lang === 'en' ? 'en' : 'hr'])
      || `${name}, ${country} — ${en ? 'cover artwork of the edition' : 'naslovna grafika izdanja'}`;
    const state = channel
      ? `${en ? 'edition' : 'izdanje'} · <em>${countFor(channel.id)}</em> ${en ? 'stories' : 'zapisa'}`
      : `${en ? 'in preparation' : 'u pripremi'} · ${en ? 'covered today from' : 'danas pokriva'} <em>${esc(seat ? seat.city : '—')}</em>`;
    return `<li class="at-card" data-c="${esc(contSlug(c.continent))}" style="--cp:${CONTINENT_COLOR[c.continent] || '#e0bd69'}">
      <a href="/${en ? 'en/capitals' : 'glavni-gradovi'}/${esc(c.slug)}/">
        <figure>
          <img src="/assets/izdanja/${esc(artId)}-440.webp" srcset="/assets/izdanja/${esc(artId)}-440.webp 440w, /assets/izdanja/${esc(artId)}-800.webp 800w, /assets/izdanja/${esc(artId)}-1200.webp 1200w" sizes="(max-width:700px) 100vw, (max-width:1100px) 50vw, 380px" alt="${esc(alt)}" width="440" height="248" loading="lazy" decoding="async">
          <figcaption>
            <span class="at-n">${esc(name)}</span>
            <span class="at-c">${esc(country)} · ${esc(langLabel(c.lang, lang))}</span>
            <span class="at-s">${state}</span>
          </figcaption>
          <span class="at-flag">${esc(en ? CONTINENT_EN[c.continent] || c.continent : c.continent)}</span>
        </figure>
      </a>
    </li>`;
  };

  const sections = continents.map((continent) => {
    const group = all.filter((c) => c.continent === continent);
    const liveCount = group.filter((c) => c.status === 'live').length;
    return `<section class="at-band" aria-labelledby="atc-${contSlug(continent)}">
      <div class="at-cont"><h2 id="atc-${contSlug(continent)}">${esc(en ? CONTINENT_EN[continent] || continent : continent)}</h2><b>${group.length}</b><span>${liveCount}/${group.length} ${en ? 'live' : 'aktivno'}</span></div>
      <ul class="at-grid">${group.map(card).join('')}</ul>
    </section>`;
  }).join('');

  const body = `${header('', { h1: false })}
<main id="sadrzaj" tabindex="-1" class="iz-wrap">
  <p class="at-k">AKTUAL MEDIA · ${en ? 'network atlas' : 'atlas mreže'}</p>
  <section class="at-hero">
    <h1>${en ? 'Every capital, on one page.' : 'Svaka prijestolnica, na jednoj stranici.'}</h1>
    <p>${en
      ? `The network covers ${all.length} countries from ${all.length} capitals: ${live.length} have their own edition today, ${preparing.length} are in preparation. Countries are not covered from wherever it is easiest, but from the capital — and this page shows where each one stands.`
      : `Mreža pokriva ${all.length} zemalja iz ${all.length} prijestolnica: ${live.length} danas ima vlastito izdanje, ${preparing.length} su u pripremi. Zemlja se ne pokriva odakle je najlakše, nego iz prijestolnice — a ova stranica pokazuje gdje je koja.`}</p>
    <ul class="at-stats">
      <li><div><b>${all.length}</b><span>${en ? 'countries' : 'zemalja'}</span></div></li>
      <li><div><b>${continents.length}</b><span>${en ? 'continents' : 'kontinenata'}</span></div></li>
      <li><div><b>${languages.size}</b><span>${en ? 'languages' : 'jezika'}</span></div></li>
      <li><div><b>${live.length}</b><span>${en ? 'live editions' : 'aktivnih izdanja'}</span></div></li>
      <li><div><b>${preparing.length}</b><span>${en ? 'in preparation' : 'u pripremi'}</span></div></li>
    </ul>
    <figure class="at-map">
      <img src="/assets/atlas/aktual-media-atlas-1200.webp" srcset="/assets/atlas/aktual-media-atlas-800.webp 800w, /assets/atlas/aktual-media-atlas-1200.webp 1200w, /assets/atlas/aktual-media-atlas-1600.webp 1600w" sizes="(max-width:760px) 100vw, 1120px" alt="${en ? 'Illustration: a night map of the world, golden lines joining the cities of the network.' : 'Ilustracija: noćna karta svijeta, zlatne linije spajaju gradove u mrežu.'}" width="1200" height="675" fetchpriority="high" decoding="async">
      <figcaption>${en ? 'Every dot is a city with its own address; every line is a two-way link. The drawing shows the network, not real distances.' : 'Svaka točka je grad s vlastitom adresom; svaka linija je obostrana veza. Grafika prikazuje mrežu, ne stvarne udaljenosti.'}</figcaption>
    </figure>
    <div class="at-cta">
      <a class="btn" href="${en ? '/en/capitals/' : '/glavni-gradovi/'}">${en ? 'Table view and contract →' : 'Tablica i ugovor →'}</a>
      <a class="btn ghost" href="/mreza/">${en ? 'All 32 addresses' : 'Sve 32 adrese'}</a>
    </div>
  </section>
  ${sections}
  <section class="at-band" aria-labelledby="atHow">
    <div class="at-cont"><h2 id="atHow">${en ? 'How to read the atlas' : 'Kako čitati atlas'}</h2></div>
    <ul class="at-how">
      <li><b>${en ? '1 · Image' : '1 · Slika'}</b><p>${en ? 'Each card shows the artwork of the capital or of the edition that covers the country today. The caption says which one it is.' : 'Svaka kartica nosi grafiku prijestolnice ili izdanja koje zemlju pokriva danas. Potpis kaže koja je.'}</p></li>
      <li><b>${en ? '2 · Status' : '2 · Status'}</b><p>${en ? '“Edition” means the capital has its own address, feed and sitemap. “In preparation” means it does not yet — and the card names the city that covers the country today.' : '„Izdanje“ znači da prijestolnica ima vlastitu adresu, feed i sitemap. „U pripremi“ znači da još nema — kartica tada imenuje grad koji zemlju pokriva danas.'}</p></li>
      <li><b>${en ? '3 · Language' : '3 · Jezik'}</b><p>${en ? 'Editions are published in the language of the country; English is an addition, not a replacement.' : 'Izdanja se objavljuju na jeziku zemlje; engleski je dodatak, ne zamjena.'}</p></li>
    </ul>
    <ul class="at-how" style="margin-top:12px">
      ${standard.slice(0, 6).map((line, i) => `<li><b>${en ? `Rule ${i + 1}` : `Pravilo ${i + 1}`}</b><p>${esc(line)}</p></li>`).join('')}
    </ul>
  </section>
</main>
${footer()}`;

  const canonical = `https://gnk-asg.hr${base}`;
  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: en ? 'Network atlas — capitals and editions' : 'Atlas mreže — prijestolnice i izdanja',
      url: canonical,
      inLanguage: lang,
      description: en
        ? `Visual atlas of ${all.length} capitals: ${live.length} live editions, ${preparing.length} in preparation.`
        : `Slikovni atlas ${all.length} prijestolnica: ${live.length} aktivnih izdanja, ${preparing.length} u pripremi.`,
      isPartOf: { '@id': 'https://gnk-asg.hr/#website' }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: en ? 'Capitals in the network' : 'Prijestolnice u mreži',
      numberOfItems: all.length,
      itemListElement: all.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `${c.capital}, ${c.country}`,
        url: `https://gnk-asg.hr${en ? '/en/capitals' : '/glavni-gradovi'}/${c.slug}/`
      }))
    }
  ];

  return shell({
    title: en ? 'Atlas of the network — 17 capitals | AKTUAL MEDIA' : 'Atlas mreže — 17 prijestolnica | AKTUAL MEDIA',
    description: en
      ? `All ${all.length} countries the network covers, from ${all.length} capitals: ${live.length} live editions and ${preparing.length} in preparation. Artwork, language, status and the link to each capital page.`
      : `Sve zemlje koje mreža pokriva — ${all.length} prijestolnica, ${live.length} aktivnih izdanja i ${preparing.length} u pripremi. Grafika, jezik, status i veza na stranicu svakog grada.`,
    path: en ? 'en/atlas/' : 'atlas/',
    keywords: [en ? 'atlas' : 'atlas mreže', en ? 'capitals' : 'glavni gradovi', 'AKTUAL MEDIA', 'GNK ASG', ...continents.map((c) => (en ? CONTINENT_EN[c] || c : c))],
    tags: ['#Atlas', '#AktualMedia', '#GNKASG'],
    image: '/assets/atlas/aktual-media-atlas-og.jpg',
    preload: {
      href: '/assets/atlas/aktual-media-atlas-1200.webp',
      imagesrcset: '/assets/atlas/aktual-media-atlas-800.webp 800w, /assets/atlas/aktual-media-atlas-1200.webp 1200w, /assets/atlas/aktual-media-atlas-1600.webp 1600w',
      imagesizes: '(max-width:760px) 100vw, 1120px'
    },
    imageAlt: en ? 'Network atlas — AKTUAL MEDIA' : 'Atlas mreže — AKTUAL MEDIA',
    lang,
    canonicalPath: canonical,
    alternates: [
      { hreflang: 'hr', href: 'https://gnk-asg.hr/atlas/' },
      { hreflang: 'en', href: 'https://gnk-asg.hr/en/atlas/' },
      { hreflang: 'x-default', href: 'https://gnk-asg.hr/atlas/' }
    ],
    jsonld,
    cssExtra: ATLAS_CSS,
    body
  });
}
