/**
 * PAUKOVA MREŽA — jedna grafika za sve 32 adrese.
 *
 * Zašto poseban modul: mreža se dosad dokazivala popisom linkova. Popis je
 * točan, ali ne pokazuje oblik. Ovaj modul crta isti popis kao paukvu mrežu:
 * matica u sredini, sedamnaest gradskih izdanja u prvom prstenu, devet
 * svjetskih portala u drugom i šest samostalnih stranica u trećem. Svaki čvor
 * je stvarni <a href> — dakle link koji tražilica vidi, a ne slika.
 *
 * Pravila:
 *   • nula izmišljenih adresa: sve dolazi iz channels.json, world registra i
 *     sites registra — istih popisa iz kojih se grade stranice;
 *   • ista grafika na svakoj stranici, samo se označi gdje je čitatelj;
 *   • SVG nema tekst u rasteru: natpisi su <text>, pa se prevode i čitaju;
 *   • ispod grafike stoji i tekstualni popis svih adresa — bez njega bi
 *     mreža ovisila o tome je li se SVG učitao;
 *   • nikakav vanjski skript ni font: radi s CSP-om `script-src 'self'`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_PORTALS } from '../../world/lib/registry.mjs';
import { SITES } from '../../sites/lib/registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHANNELS = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;

export const HOME = 'https://gnk-asg.hr/gnk-aktual/';
export const HUB = 'https://gnk-asg.hr/mreza/';
export const EDITIONS_HUB = 'https://gnk-asg.hr/izdanja/';
export const CAPITALS = 'https://gnk-asg.hr/glavni-gradovi/';

const ESC = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Boja čvora = boja izdanja. Za gradska izdanja dolazi iz palete kanala;
   za portale i samostalne stranice iz registara. */
const WORLD_COLOR = {
  nairobi: '#7fe0a6', jakarta: '#79c7ff', newyork: '#8ab4ff', saopaulo: '#8ddf8d',
  sydney: '#74d9e0', singapur: '#79e0c8', kairo: '#f0b27a', tokio: '#f2a0c0', peking: '#f08a8a'
};
const SITE_COLOR = {
  'bor-usa': '#e2836a', kosarka: '#e8a24a', 'scena-znanosti': '#7cc6e8',
  'step-buducnosti': '#c79bff', zdravlje: '#7ed6a8', 'izbori-srbija': '#e0bd69'
};

const MESH_TEXT = {
hr: {
    kicker: 'Mreža AKTUAL MEDIA', title: 'Paukova mreža — sve adrese na jednoj slici',
    lead: (c, p, s) => `${c} gradskih izdanja, ${p} svjetskih portala i ${s} samostalnih stranica oko jedne matice. Svaki čvor je link; nit vodi od izdanja do matice i natrag.`,
    hub: 'matica', cities: 'gradska izdanja', portals: 'svjetski portali', sites: 'samostalne stranice',
    portalShort: 'portal', cityShort: 'kanal', siteShort: 'stranica',
    here: 'ovdje ste', hint: 'Prijeđite mišem preko čvora ili ga otvorite tipkom Enter — niti se osvijetle.',
    list: 'Sve adrese, redom', open: 'otvori izdanje'
  },
sr: {
    kicker: 'Mreža AKTUAL MEDIA', title: 'Paukova mreža — sve adrese na jednoj slici',
    lead: (c, p, s) => `${c} gradskih izdanja, ${p} svetskih portala i ${s} samostalnih stranica oko jedne matice. Svaki čvor je link; nit vodi od izdanja do matice i nazad.`,
    hub: 'matica', cities: 'gradska izdanja', portals: 'svetski portali', sites: 'samostalne stranice',
    portalShort: 'portal', cityShort: 'kanal', siteShort: 'stranica',
    here: 'ovde ste', hint: 'Pređite mišem preko čvora ili ga otvorite tipkom Enter — niti se osvetle.',
    list: 'Sve adrese, redom', open: 'otvori izdanje'
  },
bs: {
    kicker: 'Mreža AKTUAL MEDIA', title: 'Paukova mreža — sve adrese na jednoj slici',
    lead: (c, p, s) => `${c} gradskih izdanja, ${p} svjetskih portala i ${s} samostalnih stranica oko jedne matice. Svaki čvor je link; nit vodi od izdanja do matice i natrag.`,
    hub: 'matica', cities: 'gradska izdanja', portals: 'svjetski portali', sites: 'samostalne stranice',
    portalShort: 'portal', cityShort: 'kanal', siteShort: 'stranica',
    here: 'ovdje ste', hint: 'Pređite mišem preko čvora ili ga otvorite tipkom Enter — niti se osvijetle.',
    list: 'Sve adrese, redom', open: 'otvori izdanje'
  },
hu: {
    kicker: 'AKTUAL MEDIA hálózat', title: 'Pókháló — minden cím egy képen',
    lead: (c, p, s) => `${c} városi kiadás, ${p} világportál és ${s} önálló oldal egy középpont körül. Minden csomópont link; a szál a kiadástól a központhoz vezet és vissza.`,
    hub: 'központ', cities: 'városi kiadások', portals: 'világportálok', sites: 'önálló oldalak',
    portalShort: 'portál', cityShort: 'kiadás', siteShort: 'oldal',
    here: 'itt van', hint: 'Vigye az egeret egy csomópontra, vagy nyissa meg Enterrel — a szálak kivilágosodnak.',
    list: 'Minden cím sorban', open: 'kiadás megnyitása'
  },
sl: {
    kicker: 'Mreža AKTUAL MEDIA', title: 'Pajkova mreža — vsi naslovi na eni sliki',
    lead: (c, p, s) => `${c} mestnih izdaj, ${p} svetovnih portalov in ${s} samostojnih strani okoli enega središča. Vsako vozlišče je povezava; nit vodi od izdaje do središča in nazaj.`,
    hub: 'središče', cities: 'mestne izdaje', portals: 'svetovni portali', sites: 'samostojne strani',
    portalShort: 'portal', cityShort: 'izdaja', siteShort: 'stran',
    here: 'tukaj ste', hint: 'Podrsajte z miško čez vozlišče ali ga odprite z Enter — niti se osvetlijo.',
    list: 'Vsi naslovi po vrsti', open: 'odpri izdajo'
  },
it: {
    kicker: 'Rete AKTUAL MEDIA', title: 'Ragnatela — tutti gli indirizzi in un’immagine',
    lead: (c, p, s) => `${c} edizioni cittadine, ${p} portali mondiali e ${s} siti indipendenti attorno a un centro. Ogni nodo è un link; il filo porta dall’edizione al centro e ritorno.`,
    hub: 'centro', cities: 'edizioni cittadine', portals: 'portali mondiali', sites: 'siti indipendenti',
    portalShort: 'portale', cityShort: 'edizione', siteShort: 'sito',
    here: 'sei qui', hint: 'Passa il mouse su un nodo o aprilo con Invio — i fili si illuminano.',
    list: 'Tutti gli indirizzi, in ordine', open: 'apri l’edizione'
  },
bg: {
    kicker: 'Мрежа на AKTUAL MEDIA', title: 'Паяжина — всички адреси в една картина',
    lead: (c, p, s) => `${c} градски издания, ${p} световни портала и ${s} самостоятелни страници около един център. Всяко възел е връзка; нишката води от изданието до центъра и обратно.`,
    hub: 'център', cities: 'градски издания', portals: 'световни портали', sites: 'самостоятелни страници',
    portalShort: 'портал', cityShort: 'издание', siteShort: 'страница',
    here: 'вие сте тук', hint: 'Минете с мишката върху възел или го отворете с Enter — нишките светват.',
    list: 'Всички адреси по ред', open: 'отвори изданието'
  },
ro: {
    kicker: 'Rețeaua AKTUAL MEDIA', title: 'Pânza de păianjen — toate adresele într-o imagine',
    lead: (c, p, s) => `${c} ediții orășenești, ${p} portaluri mondiale și ${s} site-uri independente în jurul unui centru. Fiecare nod este un link; firul duce de la ediție la centru și înapoi.`,
    hub: 'centru', cities: 'ediții orășenești', portals: 'portaluri mondiale', sites: 'site-uri independente',
    portalShort: 'portal', cityShort: 'ediție', siteShort: 'site',
    here: 'sunteți aici', hint: 'Treceți cu mouse-ul peste un nod sau deschideți-l cu Enter — firele se aprind.',
    list: 'Toate adresele, în ordine', open: 'deschide ediția'
  },
en: {
    kicker: 'AKTUAL MEDIA network', title: 'The spider web — every address in one picture',
    lead: (c, p, s) => `${c} city editions, ${p} world portals and ${s} standalone sites around one centre. Every node is a link; the thread runs from the edition to the centre and back.`,
    hub: 'the centre', cities: 'city editions', portals: 'world portals', sites: 'standalone sites',
    portalShort: 'portal', cityShort: 'edition', siteShort: 'site',
    here: 'you are here', hint: 'Hover a node or open it with Enter — the threads light up.',
    list: 'Every address, in order', open: 'open the edition'
  },
id: {
    kicker: 'Jaringan AKTUAL MEDIA', title: 'Jaring laba-laba — semua alamat dalam satu gambar',
    lead: (c, p, s) => `${c} edisi kota, ${p} portal dunia, dan ${s} situs mandiri di sekitar satu pusat. Setiap simpul adalah tautan; benangnya berjalan dari edisi ke pusat dan kembali.`,
    hub: 'pusat', cities: 'edisi kota', portals: 'portal dunia', sites: 'situs mandiri',
    portalShort: 'portal', cityShort: 'edisi', siteShort: 'situs',
    here: 'Anda di sini', hint: 'Arahkan kursor ke simpul atau buka dengan Enter — benangnya menyala.',
    list: 'Semua alamat, berurutan', open: 'buka edisi'
  },
pt: {
    kicker: 'Rede AKTUAL MEDIA', title: 'A teia — todos os endereços numa imagem',
    lead: (c, p, s) => `${c} edições urbanas, ${p} portais mundiais e ${s} sites independentes em torno de um centro. Cada nó é um link; o fio vai da edição ao centro e de volta.`,
    hub: 'centro', cities: 'edições urbanas', portals: 'portais mundiais', sites: 'sites independentes',
    portalShort: 'portal', cityShort: 'edição', siteShort: 'site',
    here: 'você está aqui', hint: 'Passe o rato sobre um nó ou abra-o com Enter — os fios acendem.',
    list: 'Todos os endereços, por ordem', open: 'abrir a edição'
  },
ar: {
    kicker: 'شبكة أكتوال ميديا', title: 'شبكة العنكبوت — كل العناوين في صورة واحدة',
    lead: (c, p, s) => `${c} إصدارًا مدينيًا، و${p} بوابة عالمية، و${s} موقعًا مستقلًا حول مركز واحد. كل عقدة رابط؛ والخيط يمتد من الإصدار إلى المركز ويعود.`,
    hub: 'المركز', cities: 'الإصدارات المدينية', portals: 'البوابات العالمية', sites: 'المواقع المستقلة',
    portalShort: 'بوابة', cityShort: 'إصدار', siteShort: 'موقع',
    here: 'أنت هنا', hint: 'مرّر المؤشر فوق عقدة أو افتحها بمفتاح Enter — تضيء الخيوط.',
    list: 'كل العناوين بالترتيب', open: 'افتح الإصدار'
  },
ja: {
    kicker: 'AKTUAL MEDIA ネットワーク', title: '蜘蛛の巣 — すべてのアドレスを一枚に',
    lead: (c, p, s) => `ひとつの中心のまわりに ${c} の都市版、${p} の世界ポータル、${s} の独立サイト。どのノードもリンクで、糸は版から中心へ、そして戻ります。`,
    hub: '中心', cities: '都市版', portals: '世界ポータル', sites: '独立サイト',
    portalShort: 'ポータル', cityShort: '版', siteShort: 'サイト',
    here: '現在地', hint: 'ノードにカーソルを合わせるか Enter で開くと、糸が光ります。',
    list: 'すべてのアドレス（順番）', open: '版を開く'
  },
zh: {
    kicker: 'AKTUAL MEDIA 网络', title: '蛛网 — 所有地址汇于一张图',
    lead: (c, p, s) => `围绕一个中心：${c} 个城市版、${p} 个世界门户和 ${s} 个独立站点。每个节点都是链接，丝线从版本通向中心，再返回。`,
    hub: '中心', cities: '城市版', portals: '世界门户', sites: '独立站点',
    portalShort: '门户', cityShort: '版本', siteShort: '站点',
    here: '当前位置', hint: '将鼠标移到节点上，或按 Enter 打开——丝线会亮起。',
    list: '全部地址（按顺序）', open: '打开版本'
  }
};

const textOf = (lang) => MESH_TEXT[lang] || MESH_TEXT.en;

/* ---------- čvorovi ---------- */

const cityNode = (channel) => ({
  id: channel.id,
  url: channel.base,
  label: channel.city,
  labelEn: channel.cityEn || channel.city,
  sub: `${channel.lang} · ${channel.country}`,
  color: channel.palette.accent2,
  ring: 1
});

export const WEB_CITIES = CHANNELS.map(cityNode);
export const WEB_PORTALS = WORLD_PORTALS.map((portal) => ({
  id: `world-${portal.id}`,
  url: portal.base,
  label: portal.city,
  labelEn: portal.cityEn || portal.city,
  sub: `${portal.lang} · ${portal.countryEn || portal.country}`,
  color: WORLD_COLOR[portal.id] || '#e0bd69',
  ring: 2
}));
export const WEB_SITES = SITES.map((site) => ({
  id: site.slug,
  url: site.base,
  label: site.name,
  labelEn: site.name,
  sub: site.tagline?.hr || '',
  color: SITE_COLOR[site.slug] || '#e0bd69',
  ring: 3
}));

const key = (url) => String(url || '').replace(/\/+$/, '').toLowerCase();

/* ---------- geometrija ---------- */

/* Platno je šire od visine jer natpisi izlaze izvan prstena: čvor na tri
   sata nosi ime desno od sebe. Bez tog prostora imena bi izlazila iz slike. */
const W = 1240;
const H = 1000;
const CX = W / 2;
const CY = H / 2;
const RINGS = { 1: 226, 2: 330, 3: 420 };

const pos = (index, count, radius, offset = -Math.PI / 2) => {
  const angle = offset + (index / count) * Math.PI * 2;
  return {
    angle,
    x: CX + Math.cos(angle) * radius,
    y: CY + Math.sin(angle) * radius
  };
};

/* Nit od matice do čvora nije ravna crta: blago se savija, pa mreža izgleda
   kao tkana, a ne kao zvijezda. Savoj je stalan za isti čvor. */
const thread = (p, bend = 0.18) => {
  const mx = (CX + p.x) / 2;
  const my = (CY + p.y) / 2;
  const nx = -(p.y - CY);
  const ny = p.x - CX;
  const len = Math.hypot(nx, ny) || 1;
  const cx = mx + (nx / len) * 120 * bend;
  const cy = my + (ny / len) * 120 * bend;
  return `M${CX},${CY} Q${cx.toFixed(1)},${cy.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
};

/* Prsten spaja susjede lkom blago izbačenim prema van — to je „tkanje". */
const ringArc = (a, b) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = mx - CX;
  const dy = my - CY;
  const len = Math.hypot(dx, dy) || 1;
  const ox = mx + (dx / len) * 26;
  const oy = my + (dy / len) * 26;
  return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${ox.toFixed(1)},${oy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
};

const ringNodes = (nodes) => nodes.map((node, i) => ({ ...node, ...pos(i, nodes.length, RINGS[node.ring]) }));

/**
 * Paukova mreža.
 * @param {{lang?: string, selfUrl?: string, theme?: 'light'|'dark', compact?: boolean}} options
 */
export function spiderWeb({ lang = 'hr', selfUrl = '', theme = 'light', compact = false } = {}) {
  const t = textOf(lang);
  const self = key(selfUrl);
  const cities = ringNodes(WEB_CITIES);
  const portals = ringNodes(WEB_PORTALS);
  const sites = ringNodes(WEB_SITES);
  const all = [...cities, ...portals, ...sites];

  const isSelf = (node) => !!self && key(node.url) === self;

  const node = (n) => {
    const active = isSelf(n);
    const label = lang === 'en' ? n.labelEn : n.label;
    /* Oznaku dobiva samo drugi prsten: grad koji ima i izdanje i portal.
       Samostalne stranice imaju vlastita imena i oznaka bi ih samo zgusnula. */
    const suffix = n.ring === 2 ? ` · ${t.portalShort}` : '';

    /* Natpis ide u smjeru u kojem ima mjesta:
         • prvi prsten — prema sredini (izvan njega su portali i njihovi natpisi),
         • drugi prsten — prema van,
         • treći prsten — iznad ili ispod čvora, centrirano, jer su imena
           samostalnih stranica dugačka i na rubu bi izašla iz slike. */
    const horizontal = Math.abs(n.x - CX) >= 40;
    let anchor;
    let lx;
    let ly;
    if (n.ring === 3) {
      anchor = 'middle';
      lx = n.x;
      ly = n.y < CY ? n.y - 18 : n.y + 28;
    } else if (horizontal) {
      const outward = n.x > CX;
      anchor = outward ? 'start' : 'end';
      lx = n.x + (outward ? 1 : -1) * 16;
      ly = n.y + 4;
    } else {
      anchor = 'middle';
      lx = n.x;
      const above = n.y < CY;
      ly = above ? n.y - 18 : n.y + 28;
    }

    return `<a class="sw-node${active ? ' is-self' : ''}" href="${ESC(n.url)}" data-node="${ESC(n.id)}" style="--c:${n.color}"${active ? ' aria-current="page"' : ''}>
      <title>${ESC(label)} — ${ESC(active ? t.here : t.open)}</title>
      <circle class="sw-halo" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="15"></circle>
      <circle class="sw-dot" cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="6.5"></circle>
      <text class="sw-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}">${ESC(label)}${suffix ? `<tspan class="sw-suffix" dx="2">${ESC(suffix)}</tspan>` : ''}</text>
    </a>`;
  };

  const threads = [
    ...all.map((n) => `<path class="sw-thread" data-a="hub" data-b="${ESC(n.id)}" d="${thread(n)}"></path>`),
    ...[[cities, 1], [portals, 2], [sites, 3]].flatMap(([list]) => list.map((n, i) => {
      const next = list[(i + 1) % list.length];
      return `<path class="sw-ring" data-a="${ESC(n.id)}" data-b="${ESC(next.id)}" d="${ringArc(n, next)}"></path>`;
    }))
  ].join('');

  /* Kratke spojnice među prstenovima: tri gradska izdanja s istog kontinenta
     pokazuju da mreža nije samo zvijezda oko matice. */
  const bridges = [
    ['nairobi', 'kairo'], ['jakarta', 'singapur'], ['tokio', 'peking'], ['newyork', 'saopaulo']
  ].map(([a, b]) => {
    const na = all.find((n) => n.id === a);
    const nb = all.find((n) => n.id === b);
    if (!na || !nb) return '';
    const mx = (na.x + nb.x) / 2 + (CX - (na.x + nb.x) / 2) * 0.22;
    const my = (na.y + nb.y) / 2 + (CY - (na.y + nb.y) / 2) * 0.22;
    return `<path class="sw-bridge" data-a="${ESC(a)}" data-b="${ESC(b)}" d="M${na.x.toFixed(1)},${na.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${nb.x.toFixed(1)},${nb.y.toFixed(1)}"></path>`;
  }).join('');

  const hubActive = !!self && key(HOME) === self;

  const wrapOpen = `<div class="sw sw--${theme}${compact ? ' sw--compact' : ''}" data-spiderweb data-lang="${ESC(lang)}">`;
  const head = compact ? '' : `<div class="sw-head">
      <p class="sw-k">${ESC(t.kicker)}</p>
      <h2>${ESC(t.title)}</h2>
      <p class="sw-lead">${ESC(t.lead(cities.length, portals.length, sites.length))}</p>
    </div>`;

  const svg = `<figure class="sw-fig">
    <svg class="sw-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="swTitle swDesc">
      <title id="swTitle">${ESC(t.title)}</title>
      <desc id="swDesc">${ESC(t.lead(cities.length, portals.length, sites.length))}</desc>
      <defs>
        <radialGradient id="swGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#e0bd69" stop-opacity=".28"></stop>
          <stop offset="60%" stop-color="#e0bd69" stop-opacity=".06"></stop>
          <stop offset="100%" stop-color="#e0bd69" stop-opacity="0"></stop>
        </radialGradient>
      </defs>
      <circle cx="${CX}" cy="${CY}" r="470" fill="url(#swGlow)"></circle>
      <circle class="sw-orbit" cx="${CX}" cy="${CY}" r="${RINGS[1]}"></circle>
      <circle class="sw-orbit" cx="${CX}" cy="${CY}" r="${RINGS[2]}"></circle>
      <circle class="sw-orbit" cx="${CX}" cy="${CY}" r="${RINGS[3]}"></circle>
      <g class="sw-lines">${threads}${bridges}</g>
      <g class="sw-nodes">${[...cities, ...portals, ...sites].map(node).join('')}</g>
      <a class="sw-hub${hubActive ? ' is-self' : ''}" href="${ESC(HOME)}" data-node="hub">
        <title>AKTUAL MEDIA — ${ESC(t.hub)}</title>
        <circle class="sw-hub-disc" cx="${CX}" cy="${CY}" r="72"></circle>
        <circle class="sw-hub-ring" cx="${CX}" cy="${CY}" r="86"></circle>
        <text class="sw-hub-a" x="${CX}" y="${CY - 8}" text-anchor="middle">AKTUAL</text>
        <text class="sw-hub-b" x="${CX}" y="${CY + 22}" text-anchor="middle">MEDIA</text>
        <text class="sw-hub-s" x="${CX}" y="${CY + 50}" text-anchor="middle">${ESC(t.hub)}</text>
      </a>
    </svg>
    <figcaption>${compact ? '' : `<span class="sw-hint">${ESC(t.hint)}</span>`}</figcaption>
  </figure>`;

  const list = compact ? '' : `<div class="sw-lists">
    <div class="sw-list-block"><h3>${ESC(t.cities)} <span>${cities.length}</span></h3><ul>${cities.map((n) => `<li><a href="${ESC(n.url)}"${isSelf(n) ? ' aria-current="page"' : ''}>${ESC(lang === 'en' ? n.labelEn : n.label)} <span>${ESC(n.sub)}</span></a></li>`).join('')}</ul></div>
    <div class="sw-list-block"><h3>${ESC(t.portals)} <span>${portals.length}</span></h3><ul>${portals.map((n) => `<li><a href="${ESC(n.url)}"${isSelf(n) ? ' aria-current="page"' : ''}>${ESC(lang === 'en' ? n.labelEn : n.label)} <span>${ESC(n.sub)}</span></a></li>`).join('')}</ul></div>
    <div class="sw-list-block"><h3>${ESC(t.sites)} <span>${sites.length}</span></h3><ul>${sites.map((n) => `<li><a href="${ESC(n.url)}"${isSelf(n) ? ' aria-current="page"' : ''}>${ESC(n.label)} <span>${ESC(n.sub)}</span></a></li>`).join('')}</ul></div>
  </div>`;

  return `${wrapOpen}${head}${svg}${list}</div>`;
}

export const SPIDER_CSS = `/* paukova mreža — jedna grafika, sve adrese */
.sw{--sw-ink:#15191f;--sw-muted:#4a5158;--sw-line:rgba(21,25,31,.16);--sw-panel:#fff;--sw-gold:#8c6a1f;
  padding:clamp(26px,4vw,46px) clamp(14px,3vw,28px);border:1px solid var(--sw-line);border-radius:18px;background:var(--sw-panel);margin:clamp(26px,4vw,44px) 0}
.sw--dark{--sw-ink:#eef3f8;--sw-muted:#a9bad0;--sw-line:rgba(255,255,255,.14);--sw-panel:rgba(255,255,255,.035);--sw-gold:#e0bd69}
.sw-head{max-width:74ch;margin:0 auto clamp(10px,2vw,18px)}
.sw-k{margin:0 0 6px;font:800 10.5px/1.4 system-ui;letter-spacing:.2em;text-transform:uppercase;color:var(--sw-gold)}
.sw-head h2{margin:0 0 8px;font:800 clamp(22px,3.2vw,34px)/1.1 Georgia,"Times New Roman",serif;letter-spacing:-.02em;color:var(--sw-ink)}
.sw-lead{margin:0;color:var(--sw-muted);font-size:clamp(13px,1.4vw,15px);line-height:1.6}
.sw-fig{margin:0}
.sw-svg{display:block;width:100%;height:auto;max-width:820px;margin:0 auto;overflow:visible}
.sw-orbit{fill:none;stroke:var(--sw-line);stroke-width:1;stroke-dasharray:2 6}
.sw-thread,.sw-ring,.sw-bridge{fill:none;stroke:var(--sw-gold);stroke-opacity:.30;stroke-width:1.1;transition:stroke-opacity .18s ease,stroke-width .18s ease}
.sw-ring{stroke-opacity:.17}
.sw-bridge{stroke-opacity:.22;stroke-dasharray:3 5}
.sw-thread.is-on,.sw-ring.is-on,.sw-bridge.is-on{stroke-opacity:.95;stroke-width:1.9}
.sw-node{color:var(--c,var(--sw-gold));text-decoration:none}
.sw-node .sw-dot{fill:currentColor;stroke:var(--sw-panel);stroke-width:1.4;transition:r .18s ease}
.sw-node .sw-halo{fill:currentColor;fill-opacity:0;stroke:currentColor;stroke-width:1.2;stroke-opacity:.55;transition:fill-opacity .18s ease}
.sw-node .sw-label{fill:var(--sw-ink);font:600 12px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.01em;paint-order:stroke;stroke:var(--sw-panel);stroke-width:3px;stroke-linejoin:round}
.sw-node .sw-suffix{fill:var(--sw-muted);font-weight:500;font-size:10.5px}
.sw-node:hover .sw-halo,.sw-node:focus-visible .sw-halo{fill-opacity:.22}
.sw-node:hover .sw-dot,.sw-node:focus-visible .sw-dot{r:8.5}
.sw-node:focus-visible{outline:none}
.sw-node.is-self .sw-dot{stroke-dasharray:2 2;stroke-width:2.4}
.sw-hub{color:var(--sw-gold);text-decoration:none}
.sw-hub-disc{fill:var(--sw-panel);stroke:var(--sw-gold);stroke-width:1.6}
.sw-hub-ring{fill:none;stroke:var(--sw-gold);stroke-opacity:.45;stroke-width:1;stroke-dasharray:3 5}
.sw-hub-a,.sw-hub-b{font:800 21px/1 Georgia,"Times New Roman",serif;letter-spacing:.04em;fill:var(--sw-ink)}
.sw-hub-b{fill:var(--sw-gold)}
.sw-hub-s{font:700 9.5px/1 system-ui;letter-spacing:.18em;text-transform:uppercase;fill:var(--sw-muted)}
.sw-hub:hover .sw-hub-ring,.sw-hub:focus-visible .sw-hub-ring{stroke-opacity:.9}
.sw-fig figcaption{text-align:center;margin:6px 0 0}
.sw-hint{color:var(--sw-muted);font-size:12px}
.sw-lists{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px 26px;margin:clamp(14px,2.4vw,22px) auto 0;max-width:1000px}
.sw-list-block h3{margin:0 0 8px;font:800 11px/1.4 system-ui;letter-spacing:.14em;text-transform:uppercase;color:var(--sw-gold)}
.sw-list-block h3 span{color:var(--sw-muted);font-weight:700}
.sw-list-block ul{list-style:none;margin:0;padding:0;display:grid;gap:3px}
.sw-list-block a{display:flex;justify-content:space-between;gap:8px;align-items:baseline;padding:4px 7px;border-radius:7px;color:var(--sw-ink);font-size:13px;text-decoration:none}
.sw-list-block a span{color:var(--sw-muted);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52%}
.sw-list-block a:hover,.sw-list-block a:focus-visible{background:rgba(140,106,31,.1)}
.sw-list-block a[aria-current="page"]{font-weight:700;background:rgba(140,106,31,.08)}
.sw--compact .sw-svg{max-width:560px}
@media (max-width:640px){
  .sw{padding:18px 10px;border-radius:14px}
  .sw-node .sw-label{font-size:14px}
  .sw-svg{max-width:none}
  .sw-lists{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){.sw *{transition:none!important}}`;

/**
 * Skripta za osvjetljavanje niti — progresivno poboljšanje.
 * Bez nje mreža radi (linkovi i fokus), samo niti ne svijetle.
 * Uključuje se na stranicu kao /assets/spiderweb-v1.js i ne traži ništa osim DOM-a.
 */
export const SPIDER_JS = `/* paukova mreža — osvjetljavanje niti; bez ove skripte linkovi rade isto */
(function(){
  var roots=document.querySelectorAll('[data-spiderweb]');
  Array.prototype.forEach.call(roots,function(root){
    var svg=root.querySelector('.sw-svg');
    if(!svg)return;
    var lines=svg.querySelectorAll('.sw-thread,.sw-ring,.sw-bridge');
    function clear(){Array.prototype.forEach.call(lines,function(l){l.classList.remove('is-on')});}
    function light(id){
      clear();
      if(!id)return;
      Array.prototype.forEach.call(lines,function(l){
        if(l.getAttribute('data-a')===id||l.getAttribute('data-b')===id)l.classList.add('is-on');
      });
    }
    Array.prototype.forEach.call(svg.querySelectorAll('[data-node]'),function(node){
      var id=node.getAttribute('data-node');
      node.addEventListener('mouseenter',function(){light(id)});
      node.addEventListener('focus',function(){light(id)});
      node.addEventListener('mouseleave',clear);
      node.addEventListener('blur',clear);
    });
    svg.addEventListener('mouseleave',clear);
  });
})();`;
