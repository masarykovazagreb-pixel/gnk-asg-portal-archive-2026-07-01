/**
 * MREŽA AKTUAL MEDIA — jedan popis, svi smjerovi.
 *
 * Zašto zaseban modul: samostalni portali (šest stranica, arhiva, dnevnik,
 * tjednik) i gradska izdanja na gnk-asg.hr dosad su se povezivali svaki na
 * svoj način. Nekima je nedostajao put do arhive, nekima do sestre stranice,
 * a matica je bila samo jednosmjerna veza. Ovaj modul je jedini popis:
 * iz njega se gradi blok „Mreža AKTUAL MEDIA" koji stoji na svakoj stranici
 * i vodi na svaku drugu — maticu, arhivu, dnevnik i sva gradska izdanja.
 *
 * Pravila:
 *  - svaki link je apsolutan i https, jer se stranice služe s različitih domena;
 *  - self link se ne ispisuje kao link, nego kao označena vlastita stavka;
 *  - jezik bloka prati jezik stranice (hr/en), ali imena izdanja ostaju
 *    onakva kakva su u channels.json — ne prevode se naslovi izdanja;
 *  - dvadeset ulaza u maticu je fiksno: AKTUAL MEDIA + arhiva + dnevnik +
 *    17 gradskih izdanja. Portali su drugi sloj i vode jedan na drugoga.
 *
 * Test: tests/test-network-mesh-v1.mjs. Ako se doda izdanje ili portal,
 * mijenja se channels.json odnosno apps/sites/lib/registry.mjs — ne ovaj
 * popis i ne HTML pojedine stranice.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES } from '../../sites/lib/registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { channels } = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8'));

export const MAIN = 'https://gnk-asg.hr';
export const AKTUAL = `${MAIN}/gnk-aktual/`;
export const ARHIVA = 'https://gnk-asg-arhiva.pages.dev/';
export const DNEVNIK = 'https://gnk-asg-dnevnik.pages.dev/';
export const TJEDNIK = 'https://gnk-asg-tjednik.pages.dev/';
export const HUB_HR = `${MAIN}/mreza/`;
export const HUB_EN = `${MAIN}/en/network/`;

/** Gradska izdanja — ime i adresa dolaze iz channels.json. */
export const EDITIONS = channels.map((channel) => ({
  id: channel.id,
  url: channel.base,
  name: channel.title,
  city: channel.city,
  cityEn: channel.cityEn || channel.city,
  country: channel.country,
  countryEn: channel.countryEn || channel.country,
  lang: channel.lang
}));

/** Samostalni portali: šest neovisnih stranica, arhiva, dnevnik i tjednik. */
export const PORTALS = [
  ...SITES.map((site) => ({
    id: site.slug,
    url: site.base,
    name: site.name,
    note: { hr: site.tagline.hr, en: site.tagline.en }
  })),
  {
    id: 'arhiva',
    url: ARHIVA,
    name: 'AKTUAL ARHIVA',
    note: {
      hr: 'Pretraživa arhiva svih gradskih izdanja, s izvornikom uz svaki zapis.',
      en: 'Searchable archive of every city edition, with the original next to each record.'
    }
  },
  {
    id: 'dnevnik',
    url: DNEVNIK,
    name: 'AKTUAL DNEVNIK',
    note: {
      hr: 'Jedan dan mreže: što je izašlo, u kojem satu i iz kojeg medija.',
      en: 'One day of the network: what came out, at which hour, from which outlet.'
    }
  },
  {
    id: 'tjednik',
    url: TJEDNIK,
    name: 'BUSINESS TJEDNIK',
    note: {
      hr: 'Tjedni pregled poslovnog izvještavanja, s kritičkim osvrtom.',
      en: 'Weekly review of business reporting, with a critical reading.'
    }
  }
];

const KEY = (url) => String(url || '').replace(/\/+$/, '').toLowerCase();

/** Dvadeset ulaza u maticu: AKTUAL MEDIA, arhiva, dnevnik i 17 izdanja. */
export function coreTargets(lang = 'hr') {
  const en = lang === 'en';
  return [
    { id: 'aktual-media', url: AKTUAL, name: 'AKTUAL MEDIA', note: en ? 'publisher' : 'izdavač' },
    { id: 'arhiva', url: ARHIVA, name: en ? 'AKTUAL ARCHIVE' : 'AKTUAL ARHIVA', note: en ? 'all records' : 'svi zapisi' },
    { id: 'dnevnik', url: DNEVNIK, name: en ? 'AKTUAL DAILY' : 'AKTUAL DNEVNIK', note: en ? 'one day' : 'jedan dan' },
    ...EDITIONS.map((edition) => ({
      id: edition.id,
      url: edition.url,
      name: en ? edition.cityEn : edition.city,
      note: en ? `${edition.countryEn} · ${edition.lang}` : `${edition.country} · ${edition.lang}`
    }))
  ];
}

/* Arhiva i dnevnik su već u jezgri (među 20 ulaza), pa se u drugom sloju
   ne ponavljaju — inače bi ista adresa stajala dva puta na istoj stranici. */
const CORE_PORTALS = new Set([KEY(ARHIVA), KEY(DNEVNIK)]);

export function portalTargets(selfUrl = '') {
  const self = KEY(selfUrl);
  return PORTALS.filter((portal) => !CORE_PORTALS.has(KEY(portal.url)) && KEY(portal.url) !== self);
}

const esc = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const link = (target, note) => [
  `<a href="${esc(target.url)}" rel="external noopener" data-mesh-link="${esc(target.id)}">`,
  `<b>${esc(target.name)}</b>`,
  note ? `<span>${esc(note)}</span>` : '',
  '</a>'
].join('');

/**
 * Blok mreže. Stoji na svakoj stranici, prije podnožja.
 * @param {{lang?: 'hr'|'en', selfUrl?: string}} options
 */
export function meshBlock({ lang = 'hr', selfUrl = '' } = {}) {
  const en = lang === 'en';
  const self = KEY(selfUrl);
  const core = coreTargets(lang);
  const portals = portalTargets(selfUrl);

  const coreItems = core.map((target) => (KEY(target.url) === self
    ? `<li class="is-self" data-mesh-item="${esc(target.id)}"><span aria-current="page"><b>${esc(target.name)}</b><span>${esc(en ? 'you are here' : 'ovdje ste')}</span></span></li>`
    : `<li data-mesh-item="${esc(target.id)}">${link(target, target.note)}</li>`)).join('');

  const portalItems = portals.map((portal) => `<li data-mesh-item="${esc(portal.id)}">${link(portal, portal.note[lang] || portal.note.hr)}</li>`).join('');

  return `<nav class="mesh" aria-label="${en ? 'AKTUAL MEDIA network' : 'Mreža AKTUAL MEDIA'}" data-mesh="v1">
  <div class="wrap">
    <div class="mesh-head">
      <h2>${en ? 'The AKTUAL MEDIA network' : 'Mreža AKTUAL MEDIA'}</h2>
      <p>${en ? `${core.length} entrances under one publisher. Every page links to every other; nothing here is a dead end.` : `${core.length} ulaza pod jednim izdavačem. Svaka stranica vodi na svaku drugu; nijedan link nije slijepa ulica.`}</p>
    </div>
    <ul class="mesh-grid mesh-core" data-mesh-group="core">${coreItems}</ul>
    <p class="mesh-k">${en ? 'Independent portals' : 'Samostalni portali'}</p>
    <ul class="mesh-grid mesh-sites" data-mesh-group="portals">${portalItems}</ul>
    <p class="mesh-foot">${en
      ? 'Every portal keeps its own domain, sitemap and feed, and the same editor. The links are mutual: this page points there, and that page points back.'
      : 'Svaki portal ima vlastitu domenu, sitemap i feed, i istog urednika. Veze su obostrane: ova stranica vodi tamo, a ona vraća ovamo.'}</p>
  </div>
</nav>`;
}

export const MESH_CSS = `/* mreža — zajednički blok na svim portalima */
.mesh{padding:30px 0 34px;border-top:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.16)}
.mesh .wrap{max-width:1180px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
.mesh-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 18px;margin-bottom:12px}
.mesh-head h2{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(19px,2.3vw,26px);letter-spacing:-.01em;color:var(--ink,#eef3f8)}
.mesh-head p{margin:0;color:var(--muted,var(--soft,#9fb2c8));font-size:12.5px;max-width:70ch}
.mesh-k{margin:16px 0 8px;font:800 10px/1.4 system-ui;letter-spacing:.16em;text-transform:uppercase;color:var(--accent,var(--gold,#e0bd69))}
.mesh-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:7px}
.mesh-grid a,.mesh-grid .is-self span{display:block;height:100%;padding:9px 11px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:10px;background:var(--panel,rgba(255,255,255,.04))}
.mesh-grid a:hover,.mesh-grid a:focus-visible{border-color:var(--accent,var(--gold,#e0bd69));text-decoration:none}
.mesh-grid b{display:block;font:700 12.5px/1.25 system-ui;letter-spacing:.02em;color:var(--ink,#eef3f8)}
.mesh-grid span{display:block;margin-top:2px;font-size:10.5px;line-height:1.35;color:var(--muted,var(--soft,#9fb2c8))}
.mesh-grid .is-self{opacity:.6}
.mesh-grid .is-self span{border-style:dashed}
.mesh-foot{margin:14px 0 0;font-size:11.5px;color:var(--muted,var(--soft,#9fb2c8));max-width:80ch}
@media (max-width:520px){.mesh-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}}`;
