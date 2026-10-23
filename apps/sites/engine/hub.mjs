#!/usr/bin/env node
/**
 * MREŽA — matična stranica mreže neovisnih izdanja.
 *
 * Gradi:
 *   apps/portal/mreza/index.html          — hrvatski hub
 *   apps/portal/en/network/index.html     — engleski hub
 *   apps/portal/data/mreza-v1.json        — strojni popis (već ga traže sve stranice)
 *   apps/portal/mreza/sitemap.xml         — vlastiti sitemap huba
 *   apps/portal/sitemap.xml               — upsert dva URL-a s hreflangom
 *   apps/portal/assets/mreza/*.svg        — grafike huba (lokalno, bez vanjskih slika)
 *
 * Hub nije šablona: svaka kartica nosi boju svog izdanja, a podaci dolaze iz
 * lib/registry.mjs — istog popisa iz kojeg se grade same stranice.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES, NETWORK_HUB_HR, NETWORK_HUB_EN, siteBase, siteBySlug, pagePath } from '../lib/registry.mjs';
import { WORLD_PORTALS } from '../../world/lib/registry.mjs';
import { artSvg } from '../lib/kit.mjs';
import { SATELLITE_ART } from '../lib/satellite-art.mjs';
import { spiderWeb, SPIDER_CSS, SPIDER_JS } from '../../satellites/lib/spiderweb-v1.mjs';
import { buildElectionDesk } from '../lib/elections.mjs';
import { buildAktualNetwork } from './aktual-network.mjs';
import { buildSeoMatrix } from './seo-matrix.mjs';

/* Gradska izdanja su dio iste mreže, ali žive na gnk-asg.hr/kanal/<grad>/.
   Hub ih mora pokazati; dosad je brojao samo samostalne stranice i portale. */
const CHANNELS = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'apps', 'region', 'channels.json'), 'utf8')).channels;
const CONTINENT_COUNT = 6;

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const TODAY = new Date().toISOString().slice(0, 10);
const OG = 'https://gnk-asg.hr/assets/izdanja/aktual-media-og.jpg';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const write = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };

const T = {
  hr: {
    lang: 'hr', other: 'en', title: 'Mreža AKTUAL MEDIA — 32 adrese, jedan izvor | GNK ASG',
    description: 'Mreža GNK ASG i AKTUAL MEDIA: šest samostalnih tematskih stranica, devet svjetskih portala i 17 gradskih izdanja na šest kontinenata. Svaka adresa ima sitemap i feed.',
    kicker: 'GNK ASG · mreža', h1: 'Trideset i dvije adrese. Jedan izvor provjere.', hub: NETWORK_HUB_HR,
    lead: 'Mreža neovisnih izdanja nastala je zato što su neke teme na matičnoj stranici bile prekratko obrađene: borilački sport u SAD-u, košarka, način na koji znanost nastaje, ples i pokret, svakodnevno zdravlje — i izbori u Srbiji, koji se prate samo dok traju.',
    meta: [
      ['32', 'adrese u mreži'], ['6', 'kontinenata'], ['1', 'uredništvo'],
    ],
    cardsTitle: 'Samostalne stranice', cardsLead: 'Svaka kartica vodi na vlastitu domenu. Boja je identitet izdanja, struktura je zajednička.',
    worldTitle: 'Svjetska izdanja', worldLead: 'Devet portala pokriva pet kontinenata: Afriku, Aziju, Sjevernu Ameriku, Južnu Ameriku i Oceaniju. Svaki je ulaz u svoje izdanje — puni osvrti ostaju na gnk-asg.hr, a portal vraća link na maticu.',
    cityTitle: 'Gradska izdanja', cityLead: 'Sedamnaest gradskih izdanja na četrnaest jezika živi na gnk-asg.hr/kanal/<grad>/: osam regionalnih i devet svjetskih. Isti dizajn, isti SEO sloj, isti urednik — svako sa svojim sitemapom, feedom i arhivom.',
    whyTitle: 'Zašto odvojene stranice, a ne rubrike', why: [
      'Tema koja ima vlastitu domenu ima i vlastiti sitemap, feed i arhivu. Kad se jedna stranica promijeni, ostale ne trpe — i obratno. To je razlika između mreže i jedne velike stranice koja se raspada pod vlastitom težinom.',
      'Veza je obostrana: svako izdanje u traci i podnožju nosi poveznicu na gnk-asg.hr i na ovaj hub, a hub nosi poveznicu na svako izdanje. Tako se backlink ne moli — on je dio strukture.',
      'Uredništvo je jedno. Potpis je isti, standard je isti, a pogreška se ispravlja na stranici na kojoj je nastala.',
    ],
    rulesTitle: 'Što mreža jest, a što nije', rules: [
      ['Jest', 'šest samostalnih stranica s vlastitim hostingom, sitemapom, feedom i robots.txt te 17 gradskih izdanja na gnk-asg.hr — svaka adresa s vlastitim SEO slojem: canonical, hreflang, OG, Twitter kartica, JSON-LD i hashtagovi.'],
      ['Jest', 'mreža s obostranim poveznicama: izdanja vode na maticu, matica vodi na izdanja, a hub je popis koji se može provjeriti.'],
      ['Nije', 'farmom linkova. Nijedna stranica ne postoji samo da bi nosila poveznicu; svaka ima sadržaj, izvore i metodologiju.'],
      ['Nije', 'automatom za vijesti. Pet stalnih izdanja ne ovise o dnevnom feedu. Samo izborni desk je živ i privremen.'],
    ],
    sourcesTitle: 'Izvori i provjera', sourcesLead: 'Svaka stranica ima popis izvora i stranicu metodologije. Ovdje su dva zajednička dokumenta.',
    dataLink: 'Strojni popis mreže (JSON)', editorTitle: 'Urednik i direktor', editorText: 'Nermin Sefić potpisuje izdanja AKTUAL MEDIA i GNK ASG mreže. Izdanja objavljuju pod istom dozvolom i istim pravilima: izvor za svaku brojku, datum za svaki izvor, ispravak na mjestu pogreške.',
    monitorTitle: 'Privremeni desk: izbori u Srbiji', monitorLead: 'Jedino izdanje s rokom trajanja. Prati što mediji u Srbiji, Hrvatskoj, BiH, Britaniji, SAD-u i drugdje objavljuju o izborima — broji objave, ne glasove, i svaki zapis povezuje na izvornik.',
    monitorCta: 'Otvori desk', footer: 'Mreža je dio GNK ASG. Matična stranica je gnk-asg.hr; sva izdanja objavljuju pod AKTUAL MEDIA d.o.o.',
  },
  en: {
    lang: 'en', other: 'hr', title: 'AKTUAL MEDIA network — 32 addresses, one source of record | GNK ASG',
    description: 'The GNK ASG and AKTUAL MEDIA network: six standalone topical sites, nine world portals and 17 city editions across six continents. Every address has a sitemap and feed.',
    kicker: 'GNK ASG · network', h1: 'Thirty-two addresses. One source of record.', hub: NETWORK_HUB_EN,
    lead: 'The network exists because some topics were covered too briefly on the main site: combat sports in the US, basketball, how science is actually made, dance and movement, everyday health — and Serbia’s election, which is followed only while it lasts.',
    meta: [['32', 'addresses in the network'], ['6', 'continents'], ['1', 'newsroom']],
    cardsTitle: 'Standalone sites', cardsLead: 'Every card opens its own domain. The colour is the edition’s identity; the structure is shared.',
    cityTitle: 'City editions', cityLead: 'Seventeen city editions in fourteen languages live at gnk-asg.hr/kanal/<city>/: eight regional and nine world editions. Same design, same SEO layer, same editor — each with its own sitemap, feed and archive.',
    worldTitle: 'World editions', worldLead: 'Nine portals cover five continents: Africa, Asia, North America, South America and Oceania. Each is the entrance to its edition — the full reviews stay on gnk-asg.hr, and the portal links back to the parent site.',
    whyTitle: 'Why separate sites, not sections', why: [
      'A topic with its own domain has its own sitemap, feed and archive. When one site changes, the others do not suffer — and the reverse holds too. That is the difference between a network and one large site buckling under its own weight.',
      'The link is mutual: every edition carries gnk-asg.hr and this hub in its bar and footer, and the hub links to every edition. The backlink is not begged for — it is structural.',
      'There is one newsroom. The signature is the same, the standard is the same, and a correction is published where the error was made.',
    ],
    rulesTitle: 'What the network is — and is not', rules: [
      ['It is', 'six standalone sites with their own hosting, sitemap, feed and robots.txt, plus 17 city editions on gnk-asg.hr — every address with the full SEO layer: canonical, hreflang, OG, Twitter card, JSON-LD and hashtags.'],
      ['It is', 'a network of reciprocal links: editions point to the parent site, the parent points to the editions, and the hub is a list anyone can check.'],
      ['It is not', 'a link farm. No site exists only to carry a link; each has content, sources and a method page.'],
      ['It is not', 'a news robot. The five permanent editions do not depend on a daily feed. Only the election desk is live, and only temporarily.'],
    ],
    sourcesTitle: 'Sources and checks', sourcesLead: 'Every site carries a source list and a method page. Here are the two shared documents.',
    dataLink: 'Machine-readable network list (JSON)', editorTitle: 'Editor and director', editorText: 'Nermin Sefić signs the AKTUAL MEDIA and GNK ASG network editions. They publish under the same permission and the same rules: a source for every figure, a date for every source, a correction where the error was made.',
    monitorTitle: 'Temporary desk: Serbia’s election', monitorLead: 'The only edition with an expiry date. It follows what media in Serbia, Croatia, Bosnia, Britain, the US and elsewhere publish about the election — counting items, not votes, and linking every item to its original.',
    monitorCta: 'Open the desk', footer: 'The network is part of GNK ASG. The main site is gnk-asg.hr; all editions publish under AKTUAL MEDIA d.o.o.',
  },
};

const CSS = `*{box-sizing:border-box}
:root{--bg:#04080f;--ink:#eef3f9;--soft:#a9bad0;--gold:#e8c56a;--line:rgba(232,197,106,.22)}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:radial-gradient(1200px 620px at 78% -12%,rgba(232,197,106,.12),transparent 62%),radial-gradient(900px 520px at 8% 6%,rgba(116,182,255,.10),transparent 60%),var(--bg);color:var(--ink);font:16px/1.66 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit;text-decoration:none}a:hover{text-decoration:underline;text-underline-offset:3px}
img{max-width:100%;display:block;height:auto}
.wrap{max-width:1140px;margin:0 auto;padding:0 clamp(16px,4vw,44px)}
.top{background:rgba(3,8,15,.86);border-bottom:1px solid #16304a;font:700 10.5px/1.4 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#8ba1b8}
.top .wrap{display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:space-between;padding:11px 0}
.top a{color:var(--gold)}
.hero{padding:clamp(32px,6vw,72px) 0 28px;border-bottom:1px solid var(--line);position:relative;overflow:hidden}
.hero .house{margin:0 0 16px}.hero .house img{height:48px;width:auto;max-width:220px;border-radius:6px}
.hero:after{content:"";position:absolute;inset:auto -10% -55% 40%;height:560px;background:radial-gradient(circle,rgba(232,197,106,.13),transparent 62%);pointer-events:none}
.k{font:800 11px/1.4 system-ui;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin:0 0 12px}
h1{font:800 clamp(34px,6.2vw,72px)/1.02 Georgia,"Times New Roman",serif;letter-spacing:-.025em;margin:0 0 16px;max-width:18ch}
.sub{max-width:72ch;color:#c3d0e0;font-size:clamp(15px,1.5vw,18px);margin:0 0 22px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0;padding:0;list-style:none}
.stats div{border:1px solid var(--line);border-radius:14px;padding:13px 15px;background:linear-gradient(180deg,rgba(12,26,44,.9),rgba(7,16,28,.7))}
.stats b{display:block;font:800 clamp(22px,3vw,32px)/1 Georgia,serif;color:var(--gold)}
.stats span{display:block;color:#93a7bf;font-size:11.5px;margin-top:6px}
section{padding:clamp(26px,4.5vw,48px) 0;border-bottom:1px solid #132840}
h2{font:800 clamp(24px,3.4vw,38px)/1.1 Georgia,serif;letter-spacing:-.015em;margin:0 0 10px}
section>p.lead{color:var(--soft);max-width:80ch;margin:0 0 18px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin:22px 0 0}
.card{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012));transition:transform .18s,border-color .18s;display:block}
.card:hover{transform:translateY(-3px);border-color:var(--gold);text-decoration:none}
.card img{aspect-ratio:16/9;object-fit:cover;width:100%}
.card .b{padding:15px 17px 19px}
.card .tag{font:800 10px/1 system-ui;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px;display:inline-block}
.card h3{font:800 20px/1.2 Georgia,serif;margin:0 0 6px}
.card p{margin:0;color:var(--soft);font-size:13.5px}
.card .dom{display:block;color:#7f93ab;font-size:11px;margin-top:10px;letter-spacing:.04em}
.wmedia{position:relative;display:block;line-height:0}.wband{position:absolute;left:12px;bottom:12px;display:inline-flex;align-items:center;padding:7px 11px;border-radius:8px;background:rgba(4,10,18,.74);border:1px solid rgba(255,255,255,.16);font:800 12px/1 Georgia,serif;letter-spacing:.14em}
.two{display:grid;grid-template-columns:1.2fr .8fr;gap:26px;align-items:start}
@media(max-width:820px){.two{grid-template-columns:1fr}}
.prose p{color:#cbd7e4;margin:0 0 13px;max-width:76ch}
.prose ul{margin:0;padding-left:18px;color:#cbd7e4}
.prose li{margin:0 0 9px}
.rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:20px 0 0;padding:0;list-style:none}
.rules li{border:1px solid #1b3852;border-radius:14px;padding:14px 16px;background:rgba(9,20,34,.6);font-size:13.5px;color:#b9c8d8}
.rules b{display:block;color:var(--gold);font:800 10.5px/1 system-ui;letter-spacing:.14em;text-transform:uppercase;margin-bottom:7px}
.note{border-left:3px solid var(--gold);background:rgba(232,197,106,.06);padding:16px 18px;border-radius:0 14px 14px 0;color:#c6d2df;font-size:14px;margin:18px 0}
.live-card{border:1px solid #7a2424;border-radius:18px;padding:20px;background:linear-gradient(160deg,rgba(239,68,68,.14),rgba(9,15,24,.7));margin-top:18px}
.live-card .live{display:inline-flex;align-items:center;gap:8px;font:800 10.5px/1 system-ui;letter-spacing:.16em;text-transform:uppercase;color:#ffb4a8}
.live-card .live i{width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,.22);animation:p 1.8s infinite}
@keyframes p{50%{opacity:.35}}
.live-card b.n{display:block;font:800 38px/1 Georgia,serif;color:#ffd9d2;margin:10px 0 2px}
.live-card span.l{color:#c9a9a4;font-size:12px}
.btn{display:inline-block;border:1px solid var(--gold);border-radius:999px;padding:10px 16px;font:800 11.5px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#0a0d12;background:var(--gold);margin-top:14px}
.btn:hover{text-decoration:none;filter:brightness(1.06)}
.btn.ghost{background:transparent;color:var(--gold)}
footer{padding:30px 0 54px;color:#8496ab;font-size:13px}
footer a{color:#d6e0ea}
footer .fcols{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}
footer h3{font:800 10.5px/1.4 system-ui;letter-spacing:.16em;text-transform:uppercase;color:#dbe4ee;margin:0 0 8px}
footer ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.skip{position:absolute;left:-9999px;top:0;background:var(--gold);color:#08090c;font:800 13px/1 system-ui;padding:12px 18px}
.skip:focus{left:0}
:focus-visible{outline:3px solid #74b6ff;outline-offset:3px}
`;

function card(site, lang) {
  const art = SATELLITE_ART[site.slug];
  const image = art
    ? `<img src="/assets/mreza/${site.slug}-800.webp" srcset="/assets/mreza/${site.slug}-440.webp 440w, /assets/mreza/${site.slug}-800.webp 800w, /assets/mreza/${site.slug}-1200.webp 1200w" sizes="(max-width:700px) 100vw, (max-width:1100px) 45vw, 360px" alt="${esc(art[lang] || art.hr)}" width="1200" height="670" loading="lazy" decoding="async">`
    : `<img src="/assets/mreza/${site.slug}-art-1.svg" alt="${esc(site.name)}" width="1200" height="675" loading="lazy">`;
  return `<a class="card" id="${site.slug}" href="${siteBase(site)}/" rel="external noopener" hreflang="${site.lang}" lang="${site.lang}">
    ${image}
    <div class="b">
      <span class="tag" style="color:${site.accent2}">${site.temporary ? (lang === 'en' ? 'temporary desk' : 'privremeni desk') : (lang === 'en' ? 'independent edition' : 'neovisno izdanje')}</span>
      <h3>${esc(site.name)}</h3>
      <p>${esc(site.tagline[lang])}</p>
      <span class="dom">${esc(new URL(siteBase(site)).host)} · ${site.hashtags.join(' ')}</span>
    </div>
  </a>`;
}

/* Kartica grada nudi sve širine koje postoje. Nema izmišljanja veće
   slike: ako izdanje ima samo 440, srcset ima samo 440. */
function editionImage(id) {
  const widths = [440, 800, 1200].filter((width) => existsSync(join(PORTAL, 'assets', 'izdanja', `${id}-${width}.webp`)));
  const widest = widths[widths.length - 1] || 440;
  return {
    src: `/assets/izdanja/${id}-${widest}.webp`,
    srcset: widths.map((width) => `/assets/izdanja/${id}-${width}.webp ${width}w`).join(', '),
    width: widest,
    height: Math.round((widest * 9) / 16)
  };
}

function cityCard(channel, lang) {
  const city = lang === 'en' ? (channel.cityEn || channel.city) : channel.city;
  const country = lang === 'en' ? (channel.countryEn || channel.country) : channel.country;
  const image = editionImage(channel.id);
  return `<a class="card ccard" id="${channel.id}" href="${channel.base}" hreflang="${channel.lang}" lang="${channel.lang}">
    <img src="${image.src}" srcset="${image.srcset}" sizes="(max-width:700px) 100vw, (max-width:1100px) 45vw, 360px" alt="${esc(city)}, ${esc(country)} — ${esc(channel.title)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async">
    <div class="b">
      <span class="tag" style="color:${channel.palette.accent}">${lang === 'en' ? 'city edition' : 'gradsko izdanje'}</span>
      <h3>${esc(channel.title)}</h3>
      <p>${esc(city)}, ${esc(country)} · ${esc(channel.lang)} · ${esc(channel.continent || '')}</p>
      <span class="dom">${esc(new URL(channel.base).host)}/kanal/${esc(channel.id)}/ · ${esc((channel.hashtags || []).slice(0, 3).join(' '))}</span>
    </div>
  </a>`;
}

function worldCard(portal, lang) {
  const city = lang === 'en' ? portal.cityEn : portal.city;
  const country = lang === 'en' ? portal.countryEn : portal.country;
  const note = lang === 'en' ? portal.note.en : portal.note.hr;
  const image = editionImage(portal.id);
  return `<a class="card wcard" id="world-${portal.id}" href="${portal.base}" rel="external noopener" hreflang="${portal.lang}" lang="${portal.lang}">
    <span class="wmedia"><img src="${image.src}" srcset="${image.srcset}" sizes="(max-width:700px) 100vw, (max-width:1100px) 45vw, 360px" alt="${esc(city)}, ${esc(country)} — ${esc(portal.name)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async"><span class="wband" style="color:${portal.palette.accent2}">${esc(city.toUpperCase())}</span></span>
    <div class="b">
      <span class="tag" style="color:${portal.palette.accent2}">${lang === 'en' ? 'world edition' : 'svjetsko izdanje'}</span>
      <h3>${esc(portal.name)}</h3>
      <p>${esc(note)} · ${esc(lang === 'en' ? portal.continent.en : portal.continent.hr)}</p>
      <span class="dom">${esc(portal.domain)} · ${esc(portal.hashtags.join(' '))}</span>
    </div>
  </a>`;
}

function page(lang) {
  const t = T[lang];
  const canonical = lang === 'en' ? NETWORK_HUB_EN : NETWORK_HUB_HR;
  const alternate = lang === 'en' ? NETWORK_HUB_HR : NETWORK_HUB_EN;
  const title = t.title;
  const cards = SITES.map((site) => card(site, lang)).join('');
  const worldCards = WORLD_PORTALS.map((portal) => worldCard(portal, lang)).join('');
  const cityCards = CHANNELS.map((channel) => cityCard(channel, lang)).join('');
  const listItems = [
    ...SITES.map((site, i) => ({ '@type': 'ListItem', position: i + 1, name: site.name, url: `${siteBase(site)}/`, description: site.tagline[lang] })),
    ...WORLD_PORTALS.map((portal, i) => ({ '@type': 'ListItem', position: SITES.length + i + 1, name: `${portal.name} — ${lang === 'en' ? 'world portal' : 'svjetski portal'}`, url: portal.base, description: lang === 'en' ? portal.note.en : portal.note.hr })),
    ...CHANNELS.map((channel, i) => ({ '@type': 'ListItem', position: SITES.length + WORLD_PORTALS.length + i + 1, name: `${channel.title} — ${lang === 'en' ? 'city edition' : 'gradsko izdanje'}`, url: channel.base, description: `${channel.city}, ${channel.country} · ${channel.lang}` }))
  ];

  let monitor = '';
  try {
    const desk = buildElectionDesk(ROOT);
    const m = desk.metrics;
    monitor = `<div class="live-card">
      <span class="live"><i></i>${lang === 'en' ? 'live · temporary' : 'uživo · privremeno'}</span>
      <b class="n">${m.total}</b><span class="l">${lang === 'en' ? `items from ${m.sources} outlets, ${m.incidents} mentioning incidents` : `zapisa iz ${m.sources} medija, ${m.incidents} spominje incident`}</span>
      <p style="color:#d8c2be;font-size:13.5px;margin:12px 0 0">${esc(t.monitorLead)}</p>
      <a class="btn" href="${siteBase(SITES.find((s) => s.slug === 'izbori-srbija'))}/">${esc(t.monitorCta)} →</a>
    </div>`;
  } catch { /* bez podataka hub ostaje bez brojke */ }

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': 'https://gnk-asg.hr/#website', name: 'GNK ASG', url: 'https://gnk-asg.hr/', inLanguage: ['hr', 'en'], publisher: { '@id': 'https://gnk-asg.hr/#gnk-asg' } },
      { '@type': 'Organization', '@id': 'https://gnk-asg.hr/#gnk-asg', name: 'GNK ASG d.o.o.', url: 'https://gnk-asg.hr/' },
      { '@type': 'NewsMediaOrganization', '@id': 'https://gnk-asg.hr/#aktual-media', name: 'AKTUAL MEDIA d.o.o.', url: 'https://gnk-asg.hr/gnk-aktual/', parentOrganization: { '@id': 'https://gnk-asg.hr/#gnk-asg' }, editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' } },
      { '@type': 'Person', '@id': 'https://gnk-asg.hr/#nermin-sefic', name: 'Nermin Sefić', jobTitle: lang === 'en' ? 'Editor and director' : 'Urednik i direktor', url: 'https://gnk-asg.hr/nermin-sefic/', worksFor: { '@id': 'https://gnk-asg.hr/#aktual-media' } },
      {
        '@type': 'CollectionPage', '@id': `${canonical}#page`, url: canonical, name: title, headline: t.h1, description: t.description, inLanguage: lang,
        datePublished: '2026-10-22', dateModified: TODAY, isPartOf: { '@id': 'https://gnk-asg.hr/#website' },
        author: { '@id': 'https://gnk-asg.hr/#aktual-media' }, editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' }, publisher: { '@id': 'https://gnk-asg.hr/#aktual-media' },
        image: { '@type': 'ImageObject', url: OG, width: 1200, height: 630 },
        mainEntity: { '@id': `${canonical}#lista` },
      },
      { '@type': 'ItemList', '@id': `${canonical}#lista`, name: t.cardsTitle, numberOfItems: listItems.length, itemListElement: listItems },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: 'https://gnk-asg.hr/' },
          { '@type': 'ListItem', position: 2, name: lang === 'en' ? 'Network' : 'Mreža', item: canonical },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(t.description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="GNK ASG mreža, neovisna izdanja, BOR USA, KOŠARKA 360, SCENA ZNANOSTI, STEP BUDUĆNOSTI, ZDRAVLJE 360, IZBORI U SRBIJI, AKTUAL MEDIA">
<meta name="news_keywords" content="GNK ASG mreža, neovisna izdanja, AKTUAL MEDIA">
<meta name="theme-color" content="#04080f">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${t.other}" href="${alternate}">
<link rel="alternate" hreflang="x-default" href="${NETWORK_HUB_HR}">
<link rel="alternate" type="application/json" title="Mreža" href="/data/mreza-v1.json">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GNK ASG · Mreža">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(t.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'hr_HR'}">
<meta property="og:image" content="${OG}">
<meta property="og:image:alt" content="AKTUAL MEDIA — mreža neovisnih izdanja">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(t.description)}">
<meta name="twitter:image" content="${OG}">
<meta name="twitter:image:alt" content="GNK ASG mreža">
<style>${CSS}\n${SPIDER_CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<a class="skip" href="#main">${lang === 'en' ? 'Skip to content' : 'Preskoči na sadržaj'}</a>
<div class="top"><div class="wrap"><span>AKTUAL MEDIA · ${esc(t.kicker)}</span><span><a href="https://gnk-asg.hr/">gnk-asg.hr</a> · <a href="/izdanja/">${lang === 'en' ? 'Our editions' : 'Naša izdanja'}</a> · <a href="/gnk-aktual/">AKTUAL MEDIA</a> · <a href="${alternate}" hreflang="${t.other}" lang="${t.other}">${lang === 'en' ? 'Hrvatski' : 'English'}</a></span></div></div>
<main id="main">
<div class="hero"><div class="wrap">
  <div class="house"><img src="/assets/brand/aktual-media-en-1200.webp" alt="AKTUAL MEDIA — world edition" width="167" height="48" decoding="async"></div>
  <p class="k">${esc(t.kicker)}</p>
  <h1>${esc(t.h1)}</h1>
  <p class="sub">${esc(t.lead)}</p>
  <ul class="stats">${t.meta.map(([n, l]) => `<li><div><b>${esc(n)}</b><span>${esc(l)}</span></div></li>`).join('')}</ul>
</div></div>

<section class="wrap sw-band" aria-labelledby="swTitle">
  ${spiderWeb({ lang, selfUrl: canonical, theme: 'dark' })}
</section>

<section><div class="wrap">
  <h2>${esc(t.cardsTitle)}</h2>
  <p class="lead">${esc(t.cardsLead)}</p>
  <div class="grid">${cards}</div>
  <h2 style="margin-top:34px">${esc(t.worldTitle)}</h2>
  <p class="lead">${esc(t.worldLead)}</p>
  <div class="grid">${worldCards}</div>
  <h2 style="margin-top:34px">${esc(t.cityTitle)}</h2>
  <p class="lead">${esc(t.cityLead)}</p>
  <div class="grid">${cityCards}</div>
  <p class="lead" style="margin-top:16px">${lang === 'en'
    ? 'The network follows one rule: a country is covered from its capital. <a href="/en/capitals/">See the capitals, country by country</a> — including the three still in preparation.'
    : 'Mreža slijedi jedno pravilo: zemlja se pokriva iz svoje prijestolnice. <a href="/glavni-gradovi/">Pogledajte glavne gradove, zemlja po zemlja</a> — uključujući tri koja su još u pripremi.'}</p>
  <div class="note">${lang === 'en' ? 'Each edition’s protocol is <code>https://&lt;edition&gt;/sitemap.xml</code> and <code>/feed.xml</code>. The machine-readable list of all 32 addresses is' : 'Svaka adresa ima svoj <code>/sitemap.xml</code> i <code>/feed.xml</code>. Strojni popis svih 32 adresa je'} <a href="/data/mreza-v1.json">/data/mreza-v1.json</a>.</div>
</div></section>

<section><div class="wrap two">
  <div class="prose">
    <h2>${esc(t.whyTitle)}</h2>
    ${t.why.map((p) => `<p>${esc(p)}</p>`).join('')}
    <h2 style="margin-top:26px">${esc(t.rulesTitle)}</h2>
    <ul class="rules">${t.rules.map(([b, p]) => `<li><b>${esc(b)}</b>${esc(p)}</li>`).join('')}</ul>
  </div>
  <div>
    <div class="live-card" style="border-color:#1b3852;background:linear-gradient(160deg,rgba(116,182,255,.10),rgba(9,15,24,.7))">
      <span class="k" style="color:#74b6ff">${esc(t.sourcesTitle)}</span>
      <p style="color:#c6d2df;font-size:13.5px;margin:6px 0 12px">${esc(t.sourcesLead)}</p>
      <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px;font-size:13.5px">
        <li><a href="/data/mreza-v1.json">${esc(t.dataLink)}</a></li>
        <li><a href="/aktual-media/">${lang === 'en' ? 'The data desk' : 'Podatkovni desk'}</a></li>
        <li><a href="/nermin-sefic/">${esc(t.editorTitle)}</a></li>
      </ul>
    </div>
    <div class="live-card">
      <span class="live"><i></i>${lang === 'en' ? 'temporary edition' : 'privremeno izdanje'}</span>
      <h3 style="font:800 19px/1.25 Georgia,serif;margin:10px 0 4px">${esc(t.monitorTitle)}</h3>
      ${monitor || `<p style="color:#d8c2be;font-size:13.5px">${esc(t.monitorLead)}</p><a class="btn" href="${siteBase(SITES.find((s) => s.slug === 'izbori-srbija'))}/">${esc(t.monitorCta)} →</a>`}
    </div>
    <div class="live-card" style="border-color:#1b3852;background:rgba(9,20,34,.6)">
      <span class="k" style="color:#74b6ff">${esc(t.editorTitle)}</span>
      <p style="color:#c6d2df;font-size:13.5px;margin:6px 0 0">${esc(t.editorText)}</p>
    </div>
  </div>
</div></section>
</main>
<footer><div class="wrap">
  <div class="fcols">
    <div><h3>GNK ASG</h3><p>${esc(t.footer)}</p></div>
    <div><h3>${lang === 'en' ? 'Editions and portals' : 'Izdanja i portali'}</h3><ul>${[...SITES.map((site) => `<li><a href="${siteBase(site)}/" rel="external noopener" hreflang="${site.lang}" lang="${site.lang}">${esc(site.name)}</a></li>`), ...WORLD_PORTALS.map((portal) => `<li><a href="${portal.base}" rel="external noopener" hreflang="${portal.lang}" lang="${portal.lang}">${esc(portal.name)}</a></li>`)].join('')}</ul></div>
    <div><h3>${lang === 'en' ? 'Main site' : 'Matična stranica'}</h3><ul>
      <li><a href="https://gnk-asg.hr/">gnk-asg.hr</a></li>
      <li><a href="/izdanja/">${lang === 'en' ? 'All editions' : 'Sva izdanja'}</a></li>
      <li><a href="/gnk-aktual/">AKTUAL MEDIA</a></li>
      <li><a href="/nermin-sefic/">Nermin Sefić</a></li>
      <li><a href="/aktual-media/">${lang === 'en' ? 'Data desk' : 'Podatkovni desk'}</a></li>
      <li><a href="/tehnologija-buducnosti/">${lang === 'en' ? 'Future technology' : 'Tehnologija budućnosti'}</a></li>
    </ul></div>
    <div><h3>${lang === 'en' ? 'Protocol' : 'Protokol'}</h3><ul>
      <li><a href="/mreza/sitemap.xml">Sitemap</a></li>
      <li><a href="/data/mreza-v1.json">mreza-v1.json</a></li>
      <li><a href="/contact/">${lang === 'en' ? 'Contact' : 'Kontakt'}</a></li>
      <li><a href="/legal/">${lang === 'en' ? 'Legal notices' : 'Pravne napomene'}</a></li>
    </ul></div>
  </div>
  <p style="margin-top:22px;border-top:1px solid #132840;padding-top:16px">© 2026 AKTUAL MEDIA d.o.o. · ${esc(t.editorTitle)}: <a href="/nermin-sefic/">Nermin Sefić</a> · ${lang === 'en' ? 'Every claim carries a source; every source has a date.' : 'Svaka tvrdnja nosi izvor; svaki izvor ima datum.'}</p>
</div></footer>
<script src="/assets/spiderweb-v1.js" defer></script>
</body>
</html>`;
}

function sitemap() {
  const entry = (loc, alt, lang) => `  <url><loc>${loc}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority><xhtml:link rel="alternate" hreflang="${lang}" href="${loc}"/><xhtml:link rel="alternate" hreflang="${lang === 'hr' ? 'en' : 'hr'}" href="${alt}"/><xhtml:link rel="alternate" hreflang="x-default" href="${NETWORK_HUB_HR}"/></url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entry(NETWORK_HUB_HR, NETWORK_HUB_EN, 'hr')}
${entry(NETWORK_HUB_EN, NETWORK_HUB_HR, 'en')}
</urlset>
`;
}

function upsertMasterSitemap() {
  const file = join(PORTAL, 'sitemap.xml');
  if (!existsSync(file)) return 0;
  let xml = readFileSync(file, 'utf8');
  const DESK_HR = 'https://gnk-asg.hr/gnk-aktual/mreza/';
  const DESK_EN = 'https://gnk-asg.hr/en/gnk-aktual/network/';
  const TAG_HR = `${DESK_HR}oznake/`;
  const TAG_EN = `${DESK_EN}tags/`;
  const urls = [
    { loc: NETWORK_HUB_HR, alt: NETWORK_HUB_EN, lang: 'hr', x: NETWORK_HUB_HR },
    { loc: NETWORK_HUB_EN, alt: NETWORK_HUB_HR, lang: 'en', x: NETWORK_HUB_HR },
    { loc: DESK_HR, alt: DESK_EN, lang: 'hr', x: DESK_HR },
    { loc: DESK_EN, alt: DESK_HR, lang: 'en', x: DESK_HR },
    { loc: TAG_HR, alt: TAG_EN, lang: 'hr', x: TAG_HR },
    { loc: TAG_EN, alt: TAG_HR, lang: 'en', x: TAG_HR },
    ...SITES.flatMap((site) => {
      const hr = `${DESK_HR}${site.slug}/`;
      const en = `${DESK_EN}${site.slug}/`;
      return [
        { loc: hr, alt: en, lang: 'hr', x: hr },
        { loc: en, alt: hr, lang: 'en', x: hr },
      ];
    }),
  ];
  let changed = 0;
  for (const { loc, alt, lang, x } of urls) {
    const row = `  <url><loc>${loc}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="${lang}" href="${loc}"/><xhtml:link rel="alternate" hreflang="${lang === 'hr' ? 'en' : 'hr'}" href="${alt}"/><xhtml:link rel="alternate" hreflang="x-default" href="${x}"/></url>`;
    if (xml.includes(row)) continue;
    const existing = new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>[\\s\\S]*?</url>`);
    if (existing.test(xml)) xml = xml.replace(existing, row);
    else xml = xml.replace('</urlset>', `${row}\n</urlset>`);
    changed += 1;
  }
  if (changed) writeFileSync(file, xml);
  return changed;
}

function build() {
  write(join(PORTAL, 'mreza/index.html'), page('hr'));
  write(join(PORTAL, 'en/network/index.html'), page('en'));
  write(join(PORTAL, 'mreza/sitemap.xml'), sitemap());
  write(join(PORTAL, 'assets/spiderweb-v1.js'), SPIDER_JS);

  for (const site of SITES) {
    write(join(PORTAL, 'assets/mreza', `${site.slug}-art-1.svg`), artSvg({ seed: site.slug, accent: site.accent, accent2: site.accent2, bg: site.bg, variant: 1 }));
  }

  const data = {
    version: 'GNK_ASG_MREZA_V1_20261022',
    updatedAt: new Date().toISOString(),
    hub: { hr: NETWORK_HUB_HR, en: NETWORK_HUB_EN, json: 'https://gnk-asg.hr/data/mreza-v1.json', sitemap: 'https://gnk-asg.hr/mreza/sitemap.xml' },
    editor: { name: 'Nermin Sefić', role: 'Urednik i direktor', url: 'https://gnk-asg.hr/nermin-sefic/' },
    publisher: { name: 'AKTUAL MEDIA d.o.o.', url: 'https://gnk-asg.hr/gnk-aktual/' },
    count: SITES.length,
    sites: SITES.map((site) => ({
      slug: site.slug, name: site.name, url: `${siteBase(site)}/`, domain: site.domain,
      accent: site.accent, accent2: site.accent2, tagline: site.tagline, hashtags: site.hashtags,
      topics: site.topics, temporary: Boolean(site.temporary),
      outputs: { sitemap: `${siteBase(site)}/sitemap.xml`, feed: `${siteBase(site)}/feed.xml`, robots: `${siteBase(site)}/robots.txt`, manifest: `${siteBase(site)}/manifest.webmanifest` },
      relations: { parent: 'https://gnk-asg.hr/', hub: NETWORK_HUB_HR, siblings: SITES.filter((s) => s.slug !== site.slug).map((s) => `${siteBase(s)}/`) },
    })),
    editionCount: CHANNELS.length,
    editions: CHANNELS.map((channel) => ({
      id: channel.id, name: channel.title, url: channel.base, lang: channel.lang,
      city: channel.city, cityEn: channel.cityEn || channel.city,
      country: channel.country, countryEn: channel.countryEn || channel.country,
      continent: channel.continent || null,
      outputs: { sitemap: `${channel.base}sitemap.xml`, feed: `${channel.base}feed.xml`, robots: `${channel.base}robots.txt`, manifest: `${channel.base}manifest.webmanifest` }
    })),
    worldCount: WORLD_PORTALS.length,
    world: WORLD_PORTALS.map((portal) => ({
      id: portal.id, name: portal.name, url: portal.base, domain: portal.domain,
      city: portal.city, cityEn: portal.cityEn, country: portal.country, continent: portal.continent,
      lang: portal.lang, palette: portal.palette, hashtags: portal.hashtags,
      canonicalEdition: portal.sourceBase,
      outputs: { sitemap: `${portal.base}sitemap.xml`, feed: `${portal.base}feed.xml`, robots: `${portal.base}robots.txt`, manifest: `${portal.base}manifest.webmanifest` }
    })),
  };
  write(join(PORTAL, 'data/mreza-v1.json'), JSON.stringify(data, null, 2) + '\n');

  /* AKTUAL MEDIA — mreža izdanja: indeks svih stranica pod matičnom domenom.
     Stranice dolaze iz apps/sites/site/network.json, kojeg je upravo napisao
     build.mjs, pa indeks ne može odstupiti od objavljenog izdanja. */
  let networkDesk = null;
  let seoMatrix = null;
  let siteList = [];
  let builtPages = [];
  try {
    const built = JSON.parse(readFileSync(join(HERE, '..', 'site', 'network.json'), 'utf8'));
    builtPages = built.pages;
    siteList = built.sites.map((site) => ({
      ...site,
      url: siteBase(siteBySlug(site.slug) || site).replace(/\/$/, ''),
      outputs: site.outputs,
    }));
    networkDesk = buildAktualNetwork(PORTAL, { sites: siteList, pages: built.pages, today: TODAY });

    /* SEO stroj: matrica se gradi iz izgrađenih datoteka, ne iz popisa želja. */
    const viaPages = SITES.map((site) => ({ site, base: siteBase(site) }));
    const routes = [
      ...built.pages.map((page) => {
        const pair = viaPages.find((item) => item.site.slug === page.edition);
        return {
          url: page.url,
          file: join(HERE, '..', 'site', page.edition, pagePath(page.slug, page.lang), 'index.html'),
          kind: page.slug === '' ? 'home' : 'article',
          edition: page.edition,
          editionName: page.editionName,
          lang: page.lang,
        };
      }),
      { url: 'https://gnk-asg.hr/gnk-aktual/mreza/', file: join(PORTAL, 'gnk-aktual/mreza/index.html'), kind: 'desk', edition: null, editionName: 'AKTUAL MEDIA', lang: 'hr' },
      { url: 'https://gnk-asg.hr/en/gnk-aktual/network/', file: join(PORTAL, 'en/gnk-aktual/network/index.html'), kind: 'desk', edition: null, editionName: 'AKTUAL MEDIA', lang: 'en' },
      { url: 'https://gnk-asg.hr/gnk-aktual/mreza/oznake/', file: join(PORTAL, 'gnk-aktual/mreza/oznake/index.html'), kind: 'desk', edition: null, editionName: 'AKTUAL MEDIA', lang: 'hr' },
      { url: 'https://gnk-asg.hr/en/gnk-aktual/network/tags/', file: join(PORTAL, 'en/gnk-aktual/network/tags/index.html'), kind: 'desk', edition: null, editionName: 'AKTUAL MEDIA', lang: 'en' },
      ...siteList.flatMap((site) => ['hr', 'en'].map((lang) => ({
        url: `https://gnk-asg.hr/${lang === 'en' ? `en/gnk-aktual/network/${site.slug}` : `gnk-aktual/mreza/${site.slug}`}/`,
        file: join(PORTAL, lang === 'en' ? `en/gnk-aktual/network/${site.slug}/index.html` : `gnk-aktual/mreza/${site.slug}/index.html`),
        kind: 'edition-desk', edition: site.slug, editionName: site.name, lang,
      }))),
      /* Prijestolnice su javne stranice kao i sve druge: prolaze isti popis
         provjera. Popis dolazi iz istog capitals.json iz kojeg ih gradi
         regionalni hub, pa matrica ne može zaostati za stvarnim stranicama. */
      ...(() => {
        const list = JSON.parse(readFileSync(join(HERE, '..', '..', 'region', 'capitals.json'), 'utf8')).capitals || [];
        const rows = [];
        for (const capital of list) {
          rows.push({
            url: `https://gnk-asg.hr/glavni-gradovi/${capital.slug}/`,
            file: join(PORTAL, 'glavni-gradovi', capital.slug, 'index.html'),
            kind: 'capital', edition: null, editionName: `${capital.capital}, ${capital.country}`, lang: 'hr',
          });
          rows.push({
            url: `https://gnk-asg.hr/en/capitals/${capital.slug}/`,
            file: join(PORTAL, 'en', 'capitals', capital.slug, 'index.html'),
            kind: 'capital', edition: null, editionName: `${capital.capitalEn || capital.capital}, ${capital.countryEn || capital.country}`, lang: 'en',
          });
        }
        for (const [url, file, lang] of [
          ['https://gnk-asg.hr/glavni-gradovi/', join(PORTAL, 'glavni-gradovi', 'index.html'), 'hr'],
          ['https://gnk-asg.hr/en/capitals/', join(PORTAL, 'en', 'capitals', 'index.html'), 'en'],
          ['https://gnk-asg.hr/atlas/', join(PORTAL, 'atlas', 'index.html'), 'hr'],
          ['https://gnk-asg.hr/en/atlas/', join(PORTAL, 'en', 'atlas', 'index.html'), 'en'],
        ]) {
          rows.push({ url, file, kind: 'capital-index', edition: null, editionName: 'AKTUAL MEDIA', lang });
        }
        return rows;
      })(),
    ];
    seoMatrix = buildSeoMatrix(PORTAL, { routes, sites: siteList, today: TODAY });
  } catch (error) {
    console.log(`::warning::AKTUAL MEDIA mreža nije izgrađena: ${error.message}`);
  }

  const sitemapChanges = upsertMasterSitemap();
  console.log(`[mreza] hub HR/EN + ${SITES.length + WORLD_PORTALS.length} kartica + data/mreza-v1.json; sitemap +${sitemapChanges}${networkDesk ? `; AKTUAL MEDIA indeks ${networkDesk.pages} stranica` : ''}${seoMatrix ? `; SEO matrica ${seoMatrix.totals.ok}/${seoMatrix.totals.routes} (${seoMatrix.totals.score}%)` : ''}`);
}

build();
