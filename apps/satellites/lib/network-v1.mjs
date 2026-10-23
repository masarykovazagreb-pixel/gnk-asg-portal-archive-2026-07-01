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
import { WORLD_PORTALS } from '../../world/lib/registry.mjs';

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

/** Samostalni portali: šest neovisnih stranica, arhiva, dnevnik, tjednik i
    devet svjetskih portala. Svjetski portal je ulaz u izdanje — puni osvrti
    ostaju na gnk-asg.hr, a portal vraća link na maticu. */
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
  },
  ...WORLD_PORTALS.map((portal) => ({
    /* ID nosi prefiks world- jer gradsko izdanje istog imena već stoji u
       jezgri; dva različita linka ne smiju imati istu oznaku. */
    id: `world-${portal.id}`,
    url: portal.base,
    name: portal.city.toUpperCase(),
    world: true,
    country: portal.country,
    countryEn: portal.countryEn,
    note: {
      hr: `svjetski portal · ${portal.country}`,
      en: `world portal · ${portal.countryEn}`
    }
  }))
];

const KEY = (url) => String(url || '').replace(/\/+$/, '').toLowerCase();

/**
 * Natpisi bloka mreže po jeziku izdanja. Imena izdanja i portala se ne
 * prevode — prevodi se samo okvir (naslov, objašnjenje, "ovdje ste").
 * Nepoznat jezik dobiva engleski, nikada hrvatski: hrvatski okvir na
 * japanskoj stranici bio bi upravo greška koju ovaj modul sprječava.
 */
const MESH_TEXT = {
  hr: {
    aria: 'Mreža AKTUAL MEDIA', title: 'Mreža AKTUAL MEDIA',
    lead: (n) => `${n} ulaza pod jednim izdavačem. Svaka stranica vodi na svaku drugu; nijedan link nije slijepa ulica.`,
    self: 'ovdje ste', portals: 'Samostalni portali',
    foot: 'Svaki portal ima vlastitu domenu, sitemap i feed, i istog urednika. Veze su obostrane: ova stranica vodi tamo, a ona vraća ovamo.',
    worldPortal: 'svjetski portal'
  },
  sr: {
    aria: 'Mreža AKTUAL MEDIA', title: 'Mreža AKTUAL MEDIA',
    lead: (n) => `${n} ulaza pod jednim izdavačem. Svaka stranica vodi na svaku drugu; nijedan link nije slepa ulica.`,
    self: 'ovde ste', portals: 'Samostalni portali',
    foot: 'Svaki portal ima sopstveni domen, sitemap i feed, i istog urednika. Veze su obostrane: ova stranica vodi tamo, a ona vraća ovamo.',
    worldPortal: 'svetski portal'
  },
  bs: {
    aria: 'Mreža AKTUAL MEDIA', title: 'Mreža AKTUAL MEDIA',
    lead: (n) => `${n} ulaza pod jednim izdavačem. Svaka stranica vodi na svaku drugu; nijedan link nije slijepa ulica.`,
    self: 'ovdje ste', portals: 'Samostalni portali',
    foot: 'Svaki portal ima vlastitu domenu, sitemap i feed, i istog urednika. Veze su obostrane: ova stranica vodi tamo, a ona vraća ovamo.',
    worldPortal: 'svjetski portal'
  },
  hu: {
    aria: 'AKTUAL MEDIA hálózat', title: 'Az AKTUAL MEDIA hálózata',
    lead: (n) => `${n} belépő egy kiadónál. Minden oldal minden másikra vezet; egyetlen hivatkozás sem zsákutca.`,
    self: 'itt van', portals: 'Önálló portálok',
    foot: 'Minden portálnak saját domainje, sitemapje és feedje van, és ugyanaz a szerkesztő. A hivatkozások kölcsönösek: ez az oldal odavezet, az pedig vissza.',
    worldPortal: 'világportál'
  },
  sl: {
    aria: 'Mreža AKTUAL MEDIA', title: 'Mreža AKTUAL MEDIA',
    lead: (n) => `${n} vhodov pri enem založniku. Vsaka stran povezuje na vsako drugo; nobena povezava ni slepa ulica.`,
    self: 'tukaj ste', portals: 'Samostojni portali',
    foot: 'Vsak portal ima svojo domeno, sitemap in feed ter istega urednika. Povezave so vzajemne: ta stran vodi tja, tista pa vrača sem.',
    worldPortal: 'svetovni portal'
  },
  it: {
    aria: 'Rete AKTUAL MEDIA', title: 'La rete AKTUAL MEDIA',
    lead: (n) => `${n} ingressi sotto un solo editore. Ogni pagina porta a ogni altra; nessun link è un vicolo cieco.`,
    self: 'sei qui', portals: 'Portali indipendenti',
    foot: 'Ogni portale ha il proprio dominio, sitemap e feed, e lo stesso direttore. I link sono reciproci: questa pagina porta lì, quella riporta qui.',
    worldPortal: 'portale mondiale'
  },
  bg: {
    aria: 'Мрежа на AKTUAL MEDIA', title: 'Мрежата на AKTUAL MEDIA',
    lead: (n) => `${n} входа при един издател. Всяка страница води към всяка друга; нито един линк не е задънена улица.`,
    self: 'вие сте тук', portals: 'Самостоятелни портали',
    foot: 'Всеки портал има собствен домейн, sitemap и feed и същия редактор. Връзките са взаимни: тази страница води там, а онази връща обратно.',
    worldPortal: 'световен портал'
  },
  ro: {
    aria: 'Rețeaua AKTUAL MEDIA', title: 'Rețeaua AKTUAL MEDIA',
    lead: (n) => `${n} intrări sub un singur editor. Fiecare pagină duce către oricare alta; niciun link nu este o fundătură.`,
    self: 'sunteți aici', portals: 'Portaluri independente',
    foot: 'Fiecare portal are propriul domeniu, sitemap și feed, și același editor. Legăturile sunt reciproce: această pagină duce acolo, iar aceea revine aici.',
    worldPortal: 'portal mondial'
  },
  en: {
    aria: 'AKTUAL MEDIA network', title: 'The AKTUAL MEDIA network',
    lead: (n) => `${n} entrances under one publisher. Every page links to every other; nothing here is a dead end.`,
    self: 'you are here', portals: 'Independent portals',
    foot: 'Every portal keeps its own domain, sitemap and feed, and the same editor. The links are mutual: this page points there, and that page points back.',
    worldPortal: 'world portal'
  },
  id: {
    aria: 'Jaringan AKTUAL MEDIA', title: 'Jaringan AKTUAL MEDIA',
    lead: (n) => `${n} pintu masuk di bawah satu penerbit. Setiap halaman menaut ke semua halaman lain; tidak ada tautan buntu.`,
    self: 'Anda di sini', portals: 'Portal mandiri',
    foot: 'Setiap portal punya domain, sitemap, dan feed sendiri, serta editor yang sama. Tautannya timbal balik: halaman ini menaut ke sana, dan halaman itu menaut kembali.',
    worldPortal: 'portal dunia'
  },
  pt: {
    aria: 'Rede AKTUAL MEDIA', title: 'A rede AKTUAL MEDIA',
    lead: (n) => `${n} entradas sob um só editor. Cada página leva a todas as outras; nenhum link é um beco sem saída.`,
    self: 'você está aqui', portals: 'Portais independentes',
    foot: 'Cada portal tem o seu próprio domínio, sitemap e feed, e o mesmo editor. Os links são mútuos: esta página aponta para lá, e aquela aponta de volta para cá.',
    worldPortal: 'portal mundial'
  },
  ar: {
    aria: 'شبكة أكتوال ميديا', title: 'شبكة أكتوال ميديا',
    lead: (n) => `${n} مدخلًا تحت ناشر واحد. كل صفحة تصل إلى كل صفحة أخرى؛ ولا رابط يؤدي إلى طريق مسدود.`,
    self: 'أنت هنا', portals: 'بوابات مستقلة',
    foot: 'لكل بوابة نطاقها وخريطة موقعها وتغذيتها، والمحرر نفسه. الروابط متبادلة: هذه الصفحة تشير إلى هناك، وتلك تعود إلى هنا.',
    worldPortal: 'بوابة عالمية'
  },
  ja: {
    aria: 'AKTUAL MEDIA ネットワーク', title: 'AKTUAL MEDIA ネットワーク',
    lead: (n) => `ひとつの発行者による ${n} の入口。どのページからも他のすべてのページへ移動でき、行き止まりのリンクはありません。`,
    self: '現在地', portals: '独立ポータル',
    foot: '各ポータルは独自のドメイン、サイトマップ、フィードを持ち、編集者は同じです。リンクは相互的で、このページはあちらへ、あちらはこちらへ戻ります。',
    worldPortal: '世界ポータル'
  },
  zh: {
    aria: 'AKTUAL MEDIA 网络', title: 'AKTUAL MEDIA 网络',
    lead: (n) => `同一出版者下的 ${n} 个入口。每个页面都通向其他所有页面，没有死链。`,
    self: '当前位置', portals: '独立门户',
    foot: '每个门户都有自己的域名、网站地图和订阅源，编辑也是同一人。链接是双向的：本页指向那边，那边指回这里。',
    worldPortal: '世界门户'
  }
};

/** Kratke napomene za tri središnja ulaza: izdavač, arhiva, dnevnik. */
const CORE_NOTE = {
  hr: ['izdavač', 'svi zapisi', 'jedan dan'],
  sr: ['izdavač', 'svi zapisi', 'jedan dan'],
  bs: ['izdavač', 'svi zapisi', 'jedan dan'],
  hu: ['kiadó', 'minden rekord', 'egy nap'],
  sl: ['založnik', 'vsi zapisi', 'en dan'],
  it: ['editore', 'tutti i record', 'un giorno'],
  bg: ['издател', 'всички записи', 'един ден'],
  ro: ['editor', 'toate înregistrările', 'o zi'],
  en: ['publisher', 'all records', 'one day'],
  id: ['penerbit', 'semua catatan', 'satu hari'],
  pt: ['editor', 'todos os registos', 'um dia'],
  ar: ['الناشر', 'كل السجلات', 'يوم واحد'],
  ja: ['発行者', 'すべての記録', '一日'],
  zh: ['出版者', '全部记录', '一天']
};

const meshText = (lang) => MESH_TEXT[lang] || MESH_TEXT.en;

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
export function meshBlock({ lang = 'hr', selfUrl = '', theme = '' } = {}) {
  const text = meshText(lang);
  const self = KEY(selfUrl);
  const core = coreTargets(lang);
  const portals = portalTargets(selfUrl);

  /* Napomena uz portal: vlastiti prijevod ako postoji, inače engleski —
     nikada hrvatski na stranici koja nije hrvatska. */
  const noteOf = (portal) => {
    if (portal.note && portal.note[lang]) return portal.note[lang];
    if (portal.world) {
      const country = lang === 'hr' ? portal.country : (portal.countryEn || portal.country);
      return `${text.worldPortal} · ${country}`;
    }
    return (portal.note && (portal.note.en || portal.note.hr)) || '';
  };

  const coreNote = CORE_NOTE[lang] || CORE_NOTE.en;
  const coreNoteOf = (target) => {
    if (target.id === 'aktual-media') return coreNote[0];
    if (target.id === 'arhiva') return coreNote[1];
    if (target.id === 'dnevnik') return coreNote[2];
    const edition = EDITIONS.find((e) => KEY(e.url) === KEY(target.url));
    if (!edition) return target.note;
    const country = lang === 'hr' ? edition.country : (edition.countryEn || edition.country);
    return `${country} · ${edition.lang}`;
  };

  const coreItems = core.map((target) => (KEY(target.url) === self
    ? `<li class="is-self" data-mesh-item="${esc(target.id)}"><span aria-current="page"><b>${esc(target.name)}</b><span>${esc(text.self)}</span></span></li>`
    : `<li data-mesh-item="${esc(target.id)}">${link(target, coreNoteOf(target))}</li>`)).join('');

  const portalItems = portals.map((portal) => `<li data-mesh-item="${esc(portal.id)}">${link(portal, noteOf(portal))}</li>`).join('');

  return `<nav class="mesh${theme === 'light' ? ' mesh--light' : ''}" aria-label="${esc(text.aria)}" data-mesh="v1">
  <div class="wrap">
    <div class="mesh-head">
      <h2>${esc(text.title)}</h2>
      <p>${esc(text.lead(core.length))}</p>
    </div>
    <ul class="mesh-grid mesh-core" data-mesh-group="core">${coreItems}</ul>
    <p class="mesh-k">${esc(text.portals)}</p>
    <ul class="mesh-grid mesh-sites" data-mesh-group="portals">${portalItems}</ul>
    <p class="mesh-foot">${esc(text.foot)}</p>
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
/* Svijetla podloga (npr. /kanal/ hub): iste kartice, tamno pismo. */
.mesh--light{--ink:#15191f;--muted:#4a5158;--line:#ddd6c8;--panel:#fff;--gold:#8c6a1f;background:#efece4}
.mesh--light .mesh-head h2{color:#15191f}
@media (max-width:520px){.mesh-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}}`;
