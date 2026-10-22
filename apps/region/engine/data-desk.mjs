#!/usr/bin/env node
/**
 * AKTUAL MEDIA — DATA DESK.
 *
 * Četiri stranice koje ne opisuju portal, nego ga mjere. Sve brojke se
 * računaju iz arhive osam gradskih izdanja (apps/region/data/*.json) u
 * trenutku gradnje — ništa se ne upisuje ručno i ništa se ne izmišlja.
 *
 *   /aktual-media/nocna-smjena/   ↔ /en/aktual-media/the-3am-edition/
 *   /aktual-media/jedan-glas/     ↔ /en/aktual-media/one-voice/
 *   /aktual-media/karta-tisine/   ↔ /en/aktual-media/the-silence-map/
 *   /aktual-media/osam-jezika/    ↔ /en/aktual-media/one-vocabulary/
 *
 * Uz stranice:
 *   apps/portal/data/aktual-data-desk-v1.json  — isti brojevi, strojno čitljivi
 *   apps/portal/aktual-media/sitemap.xml       — vlastiti sitemap
 *   apps/portal/sitemap.xml                    — 8 novih URL-ova s hreflangom
 *   /gnk-aktual/ i /en/gnk-aktual/             — traka s četiri poveznice
 *
 * Pokreće ih hub.mjs na kraju dnevnog ciklusa, pa se brojke osvježe kad
 * se osvježi i arhiva izdanja.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHANNELS, HUB } from './build.mjs';
import { logoJsonLd } from './brand.mjs';
import { esc, safeJson } from './lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const ROOT = join(APP, '..', '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const DATA = join(APP, 'data');

const SITE = 'https://gnk-asg.hr';

/* Jedan @id za AKTUAL MEDIA na svim podstranicama podatkovnog deska.
   Prije je ovdje stajao `${SITE}/#gnk-asg`, što je id GNK ASG organizacije —
   dvije različite organizacije dijelile su isti čvor, pa je Google čitao
   AKTUAL MEDIA i GNK ASG kao istu osobu. */
const BRAND_ID = `${SITE}/gnk-aktual/#news-organization`;
const BRAND_NAMES = ['AKTUAL MEDIA', 'Aktual Media', 'Aktual mediji', 'Aktual medija', 'Aktual Media d.o.o.', 'AKTUAL MEDIA KANAL', 'AKTUAL MEDIA KANAL ZAGREB'];

/* Oznake idu u article:tag; u meta keywords ostaju samo riječi. */
const wordsOf = (list) => [...new Map(list
  .map((word) => String(word).replace(/^#/, '').trim())
  .filter((word) => word && !/nermin|sefi[cć]/i.test(word))
  .map((word) => [word.toLowerCase(), word])).values()].join(', ');
const tagMetas = (list) => list
  .filter((word) => String(word).startsWith('#'))
  .map((word) => `<meta property="article:tag" content="${word}">`)
  .join('\n');const SECTION = `${SITE}/aktual-media/`;
const VERSION = 'GNK_ASG_DATA_DESK_V1_20261021';
const MARK_START = '<!-- DATA-DESK-BAND:START -->';
const MARK_END = '<!-- DATA-DESK-BAND:END -->';

const DESKS = [
  { id: 'night', hr: 'nocna-smjena', en: 'the-3am-edition' },
  { id: 'voice', hr: 'jedan-glas', en: 'one-voice' },
  { id: 'silence', hr: 'karta-tisine', en: 'the-silence-map' },
  { id: 'vocabulary', hr: 'osam-jezika', en: 'one-vocabulary' },
];

const route = (desk, lang) => (lang === 'en' ? `/en/aktual-media/${desk.en}/` : `/aktual-media/${desk.hr}/`);
const abs = (desk, lang) => `${SITE}${route(desk, lang)}`;
const cityBase = (channel, lang) => (lang === 'en' ? `${channel.base}en/` : channel.base);

const readJSON = (file, fallback) => {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
};

/* ---------- mjerenja ---------- */

const HOUR = 3600000;
const NIGHT_START = 22;
const NIGHT_END = 6;

const channels = CHANNELS.map((channel) => {
  const file = readJSON(join(DATA, `${channel.id}.json`), { items: [] });
  const items = (file.items || []).filter((item) => item && item.date && item.slug);
  const stamps = items.map((item) => Date.parse(item.date)).filter((value) => Number.isFinite(value));
  const newest = stamps.length ? Math.max(...stamps) : 0;
  return { channel, items, stamps, newest };
}).filter((row) => row.items.length);

const allStamps = channels.flatMap((row) => row.stamps);
const newestOverall = allStamps.length ? Math.max(...allStamps) : Date.now();
const generatedAt = new Date(newestOverall).toISOString();

const isNight = (timestamp) => {
  const hour = new Date(timestamp).getUTCHours();
  return hour >= NIGHT_START || hour < NIGHT_END;
};
const pct = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : 0);
const hoursBetween = (a, b) => Math.round(((b - a) / HOUR) * 10) / 10;
const utcLabel = (timestamp) => `${new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/* 1. noćna smjena */
const night = channels.map((row) => {
  const list = row.items
    .filter((item) => isNight(Date.parse(item.date)))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return {
    id: row.channel.id,
    title: row.channel.title,
    city: row.channel.city,
    base: row.channel.base,
    count: list.length,
    total: row.items.length,
    share: pct(list.length, row.items.length),
    samples: list.slice(0, 3).map((item) => ({ title: item.title, slug: item.slug, date: item.date })),
  };
}).sort((a, b) => b.share - a.share || b.count - a.count);

const nightTotals = {
  items: night.reduce((n, row) => n + row.count, 0),
  all: night.reduce((n, row) => n + row.total, 0),
};
nightTotals.share = pct(nightTotals.items, nightTotals.all);

/* 2. jedan glas — koncentracija izvora */
const voice = channels.map((row) => {
  const bySource = new Map();
  for (const item of row.items) {
    const key = item.sourceName || item.source || 'nepoznat izvor';
    bySource.set(key, (bySource.get(key) || 0) + 1);
  }
  const sorted = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
  const total = row.items.length;
  return {
    id: row.channel.id,
    title: row.channel.title,
    city: row.channel.city,
    base: row.channel.base,
    sources: sorted.length,
    total,
    lead: sorted[0] ? sorted[0][0] : '',
    leadCount: sorted[0] ? sorted[0][1] : 0,
    leadShare: sorted[0] ? pct(sorted[0][1], total) : 0,
    top3Share: pct(sorted.slice(0, 3).reduce((n, [, c]) => n + c, 0), total),
    list: sorted.map(([name, count]) => ({ name, count, share: pct(count, total) })),
  };
}).sort((a, b) => b.leadShare - a.leadShare);

const allSources = new Map();
for (const row of voice) {
  for (const source of row.list) {
    if (!allSources.has(source.name)) allSources.set(source.name, new Set());
    allSources.get(source.name).add(row.id);
  }
}
const sharedSources = [...allSources.entries()].filter(([, cities]) => cities.size > 1);

/* 3. karta tišine — najdulja pauza između dvije objave */
const silence = channels.map((row) => {
  const stamps = [...new Set(row.stamps)].sort((a, b) => a - b);
  let gap = 0;
  let gapStart = 0;
  let gapEnd = 0;
  const longGaps = [];
  for (let i = 1; i < stamps.length; i += 1) {
    const delta = hoursBetween(stamps[i - 1], stamps[i]);
    if (delta > 6) longGaps.push({ hours: delta, start: stamps[i - 1], end: stamps[i] });
    if (delta > gap) { gap = delta; gapStart = stamps[i - 1]; gapEnd = stamps[i]; }
  }
  return {
    id: row.channel.id,
    title: row.channel.title,
    city: row.channel.city,
    base: row.channel.base,
    gap: Math.round(gap * 10) / 10,
    gapStart,
    gapEnd,
    longGaps: longGaps.length,
    oldest: row.oldest ? hoursBetween(row.oldest, newestOverall) : 0,
    oldestAgeHours: stamps.length ? hoursBetween(stamps[0], newestOverall) : 0,
    newestAgeHours: stamps.length ? hoursBetween(stamps[stamps.length - 1], newestOverall) : 0,
    span: stamps.length ? hoursBetween(stamps[0], stamps[stamps.length - 1]) : 0,
  };
}).sort((a, b) => b.gap - a.gap);

/* 4. jedan rječnik — riječi koje dijele sva izdanja */
const STOP = new Set((
  'the and for with from that this will have has are was were you your our their his her its not but all who what ' +
  'when where how why new after before over under into out about more most said says say also than then them they ' +
  'there here can could would should may might must one two three four five six seven eight nine ten top best first ' +
  'last next day week year time city country world today tomorrow yesterday video foto nakon prije samo tako sada ' +
  'kako koje koji koja ali ili nije jesu biti bio bila bilo svoj svoju svoje time sto što više manje nego kroz protiv ' +
  'između tijekom prema nakon dana danas jučer sutra godine godina mjeseca tjedna sati minute ' +
  // gramatika i količine: stvarno se pojavljuju, ali ne nose temu
  'novi nova novo nove novih novom novog veliki velika veliko velikom velike drugi druga drugo drugom drugog ' +
  'pred preko poslije gotovo skoro još jos već vec samo ovo ova ovaj sve svi svih svima nije nisu nema nemaju ' +
  'koliko tolika toliko šest sedam osam devet deset dvije tri četiri casa sati sat vijesti vijest ' +
  'premijer premijerka ministar ministrica predsjednik predsjednica vlada država grad godina dana ' +
  'tisuće milijuna milijarde posto prvi puta put drugi treći'
).split(/\s+/).filter(Boolean));

const tokenForm = (word) => String(word || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z]/g, '');

/* Popis zaustavnih riječi mora biti u istom obliku u kojem se uspoređuje
   (bez dijakritike), inače "šest" prođe kao tema jer je u popisu "šest". */
const STOP_NORM = new Set([...STOP].map(tokenForm).filter(Boolean));
for (const extra of ['sest', 'ligi', 'ligu', 'lige', 'para', 'mora', 'novim', 'novom', 'novog', 'navodno', 'liza']) STOP_NORM.add(extra);

const vocabulary = (() => {
  const byCity = new Map();
  const display = new Map();
  const examples = new Map();
  const upper = new Map();
  const lower = new Map();
  const midUpper = new Map();
  const displayUpper = new Map();

  for (const row of channels) {
    const seen = new Set();
    for (const item of row.items) {
      const title = String(item.title || '');
      const words = [...title.matchAll(/[A-Za-zÀ-ž][A-Za-zÀ-ž'’-]{3,}/g)];
      for (const match of words) {
        const raw = match[0];
        const key = tokenForm(raw);
        if (!key || key.length < 4 || STOP_NORM.has(key)) continue;
        const capitalized = /^[A-ZÀ-Ž]/.test(raw) && match.index > 0;
        if (!display.has(key)) display.set(key, raw.toLowerCase());
        // Ime se ispisuje onako kako izlazi u naslovu, velikim slovom.
        if (capitalized) displayUpper.set(key, raw.replace(/['’-]+$/, ''));
        if (!examples.has(key)) examples.set(key, []);
        // Veliko početno slovo izvan prvog mjesta u naslovu je signal
        // da je riječ vlastito ime, a ne obična riječ na početku rečenice.
        if (capitalized) { upper.set(key, (upper.get(key) || 0) + 1); midUpper.set(key, (midUpper.get(key) || 0) + 1); }
        else lower.set(key, (lower.get(key) || 0) + 1);

        if (!byCity.has(key)) byCity.set(key, new Map());
        const city = byCity.get(key);
        city.set(row.channel.id, (city.get(row.channel.id) || 0) + 1);
        void seen;

        const bucket = examples.get(key);
        if (bucket.length < 2 && !bucket.some((x) => x.slug === item.slug)) {
          bucket.push({ city: row.channel.id, title: item.title, slug: item.slug, base: row.channel.base });
        }
      }
    }
  }

  return [...byCity.entries()]
    .map(([key, cities]) => {
      const up = upper.get(key) || 0;
      const low = lower.get(key) || 0;
      const total = up + low;
      const mid = midUpper.get(key) || 0;
      const isName = mid >= 2 && mid / Math.max(1, total) >= 0.35;
      return {
        token: isName && displayUpper.has(key) ? displayUpper.get(key) : (display.get(key) || key),
        cities: cities.size,
        total,
        name: isName,
        perCity: [...cities.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count })),
        examples: examples.get(key) || [],
      };
    })
    .filter((row) => row.cities >= 4)
    .sort((a, b) => Number(b.name) - Number(a.name) || b.cities - a.cities || b.total - a.total);
})();

const sharedNames = vocabulary.filter((row) => row.name);
const sharedWords = vocabulary.filter((row) => !row.name);

const metrics = {
  version: VERSION,
  generatedAt,
  channels: channels.length,
  items: allStamps.length,
  night: { totals: nightTotals, rows: night },
  voice: { rows: voice, sharedSources: sharedSources.map(([name, cities]) => ({ name, cities: [...cities] })) },
  silence: { rows: silence, newestOverall },
  vocabulary: vocabulary.slice(0, 40),
  vocabularyNames: sharedNames.slice(0, 20).map((row) => row.token),
  vocabularyWords: sharedWords.slice(0, 20).map((row) => row.token),
};

/* ---------- ljuska ---------- */

const CSS = `*{box-sizing:border-box}
body{margin:0;background:#061019;color:#e8edf3;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit;text-decoration:none}
a:hover{text-decoration:underline}
.dd-wrap{max-width:1080px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
.dd-top{background:#04101d;border-bottom:1px solid #1b3550;font:700 11px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#8fa3ba}
.dd-top .dd-wrap{display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:space-between;padding:11px 0}
.dd-top a{color:#e0bd69}
.dd-head{padding:clamp(26px,5vw,52px) 0 20px;border-bottom:1px solid #1b3550}
.dd-kicker{font:700 11px/1.4 system-ui;letter-spacing:.18em;text-transform:uppercase;color:#e0bd69;margin:0 0 8px}
.dd-head h1{font:700 clamp(28px,5vw,46px)/1.06 Georgia,"Times New Roman",serif;margin:0 0 12px;letter-spacing:-.01em}
.dd-lead{max-width:74ch;color:#b9c6d6;margin:0}
.dd-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;padding:26px 0;border-bottom:1px solid #132c44}
.dd-big{background:#0b1d31;border:1px solid #1e3b58;border-radius:16px;padding:22px}
.dd-big b{display:block;font:800 clamp(40px,7vw,66px)/1 Georgia,serif;color:#e0bd69;letter-spacing:-.02em}
.dd-big span{display:block;color:#a9b8cc;font-size:14px;margin-top:6px}
.dd-note{color:#a9b8cc;font-size:14.5px;margin:0}
.dd-section{padding:28px 0;border-bottom:1px solid #132c44}
.dd-section h2{font:700 clamp(20px,2.6vw,28px)/1.2 Georgia,serif;margin:0 0 6px}
.dd-section p{margin:0 0 14px;color:#b9c6d6;max-width:78ch}
.dd-table{width:100%;border-collapse:collapse;font-size:14.5px}
.dd-table th{text-align:left;font:700 10.5px/1.4 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#8fa3ba;padding:8px 10px 8px 0;border-bottom:1px solid #1e3b58}
.dd-table td{padding:9px 10px 9px 0;border-bottom:1px solid #132c44;vertical-align:middle}
.dd-table td.n{font-variant-numeric:tabular-nums;white-space:nowrap}
.dd-bar{display:block;height:8px;border-radius:999px;background:#12283d;min-width:40px}
.dd-bar i{display:block;height:8px;border-radius:999px;background:linear-gradient(90deg,#e0bd69,#c8963c)}
.dd-table a{color:#e0bd69}
.dd-quote{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.dd-quote li{background:#0b1d31;border:1px solid #1e3b58;border-radius:12px;padding:11px 14px;font-size:14.5px}
.dd-quote small{display:block;color:#8fa3ba;font-size:11.5px;margin-top:4px}
.dd-quote a{color:#dbe6f2}
.dd-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.dd-chips li{border:1px solid #25435f;border-radius:999px;padding:6px 11px;font:700 11.5px/1 system-ui;letter-spacing:.04em;color:#cfdbe9}
.dd-chips b{color:#e0bd69;font-size:12.5px}
.dd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.dd-card{display:block;background:#0b1d31;border:1px solid #1e3b58;border-radius:14px;padding:14px 16px}
.dd-card b{display:block;font:700 15.5px/1.3 Georgia,serif;margin-bottom:4px}
.dd-card span{color:#9fb0c4;font-size:12.5px}
.dd-mean{background:#0a1a2c;border-left:3px solid #e0bd69;border-radius:0 12px 12px 0;padding:14px 16px;margin:16px 0 0;color:#cfdbe9;font-size:15px}
.dd-tags{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0 0;padding:0;list-style:none;font:700 10.5px/1 system-ui;letter-spacing:.06em;text-transform:uppercase}
.dd-tags a{border:1px solid #25435f;border-radius:999px;padding:6px 10px;color:#cfdbe9}
.dd-tags a:hover{border-color:#e0bd69;color:#e0bd69;text-decoration:none}
.dd-method{background:#04101d;border:1px solid #1b3550;border-radius:14px;padding:16px 18px;margin:26px 0 0;font-size:13.5px;color:#9fb0c4}
.dd-method strong{color:#dbe6f2}
.dd-next{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;padding:26px 0}
.dd-foot{border-top:1px solid #132c44;padding:22px 0 40px;color:#8fa3ba;font-size:12.5px}
.dd-foot a{color:#cfdbe9}
.dd-city{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:0;padding:0;list-style:none}
.dd-city a{display:block;background:#0b1d31;border:1px solid #1e3b58;border-radius:12px;padding:10px 12px;font:700 13px/1.2 system-ui}
.dd-city span{display:block;color:#8fa3ba;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-top:3px}
.dd-skip{position:absolute;left:-9999px;top:0;z-index:9999;background:#e0bd69;color:#08131f;font:800 13px/1 system-ui;padding:12px 18px;border-radius:0 0 12px 0}
.dd-skip:focus{left:0}
main:focus{outline:none}
main:focus-visible{outline:3px solid #e0bd69;outline-offset:4px}
a:focus-visible,button:focus-visible,[tabindex]:focus-visible{outline:3px solid #e0bd69;outline-offset:3px;border-radius:4px}
@media(max-width:720px){.dd-hero{grid-template-columns:1fr}.dd-table{font-size:13.5px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;

const T = {
  hr: {
    top: 'AKTUAL MEDIA · Podatkovni desk',
    back: 'AKTUAL MEDIA',
    editions: 'Sva izdanja',
    channels: 'Kanali',
    radio: 'Radio',
    agent: 'Pitaj asistenta',
    lang: 'English',
    more: 'Ostala mjerenja',
    cities: 'Osam gradskih izdanja',
    citiesNote: 'Svaka brojka na ovoj stranici dolazi iz arhive tih izdanja.',
    method: 'Kako je izmjereno',
    methodBody: 'Brojke se računaju pri svakoj gradnji stranice iz datoteka arhive osam gradskih izdanja (po 420 zapisa). Ne prepisuju se ručno i ne zaokružuju naviše. Vremena su u UTC-u. Ako se arhiva promijeni, mijenja se i stranica — u istom ciklusu.',
    measured: 'Mjereno',
    items: 'zapisa u arhivi',
    tags: 'Oznake',
    source: 'Izvor',
    city: 'Grad',
    share: 'Udio',
    open: 'Otvori izdanje',
    sitemap: 'Sitemap',
  },
  en: {
    top: 'AKTUAL MEDIA · Data desk',
    back: 'AKTUAL MEDIA',
    editions: 'All editions',
    channels: 'Channels',
    radio: 'Radio',
    agent: 'Ask the assistant',
    lang: 'Hrvatski',
    more: 'Other measurements',
    cities: 'The eight city editions',
    citiesNote: 'Every number on this page comes from the archive of those editions.',
    method: 'How this was measured',
    methodBody: 'Numbers are computed on every build from the archive files of the eight city editions (420 records each). Nothing is typed by hand and nothing is rounded up. Times are UTC. When the archive changes, this page changes in the same cycle.',
    measured: 'Measured',
    items: 'records in the archive',
    tags: 'Tags',
    source: 'Source',
    city: 'City',
    share: 'Share',
    open: 'Open edition',
    sitemap: 'Sitemap',
  },
};

const COPY = {
  night: {
    hr: {
      title: 'Noćna smjena — što osam gradova objavi dok grad spava',
      description: 'Mjerenje iz arhive AKTUAL MEDIA: koliko svako od osam gradskih izdanja objavi između 22:00 i 06:00 UTC, koji naslovi izlaze noću i koji grad stvarno radi treću smjenu.',
      h1: 'Noćna smjena',
      lead: 'Osam gradova, osam jezika, jedan dan. Ovo je mjerenje onoga što izlazi dok grad spava — između 22:00 i 06:00 UTC, iz arhive svih osam izdanja.',
      heroLabel: 'noćnih zapisa u cijeloj arhivi',
      heroNote: (t) => `${t.items} od ${t.all} zapisa (${t.share}%) objavljeno je noću. Najveći noćni udio ima ${night[0].city}, najmanji ${night[night.length - 1].city}.`,
      tableHead: ['Grad', 'Noću', 'Ukupno', 'Udio', ''],
      sectionTitle: 'Naslovi koji su izašli noću',
      sectionLead: 'Stvarni naslovi iz noćne smjene, s poveznicom na izdanje u kojem su objavljeni.',
      meaning: (top, low) => `Noć nije prazna: ${top.city} objavljuje ${top.share}% svog izdanja između 22 i 6 sati, a ${low.city} ${low.share}%. Za čitatelja to znači da se dio izdanja mijenja i prije jutarnje kave — a za redakciju da dežurstvo mora postojati i kad nitko ne gleda.`,
    },
    en: {
      title: 'The 3 a.m. edition — what eight cities publish while the city sleeps',
      description: 'A measurement from the AKTUAL MEDIA archive: how much of each of the eight city editions is published between 22:00 and 06:00 UTC, which headlines come out at night, and which city actually runs a third shift.',
      h1: 'The 3 a.m. edition',
      lead: 'Eight cities, eight languages, one day. This is a measurement of what goes out while the city sleeps — between 22:00 and 06:00 UTC, taken from the archive of all eight editions.',
      heroLabel: 'night records in the whole archive',
      heroNote: (t) => `${t.items} of ${t.all} records (${t.share}%) were published at night. ${night[0].city} has the largest night share, ${night[night.length - 1].city} the smallest.`,
      tableHead: ['City', 'At night', 'Total', 'Share', ''],
      sectionTitle: 'Headlines that went out at night',
      sectionLead: 'Real headlines from the night shift, each linked to the edition that published it.',
      meaning: (top, low) => `The night is not empty: ${top.city} publishes ${top.share}% of its edition between 10 p.m. and 6 a.m., ${low.city} ${low.share}%. For a reader that means part of the edition changes before the morning coffee; for a newsroom it means someone has to be on shift when nobody is watching.`,
    },
  },
  voice: {
    hr: {
      title: 'Jedan glas — koliko je svako izdanje stvarno pluralno',
      description: 'Mjerenje izvora u arhivi AKTUAL MEDIA: koliko medija hrani svako od osam gradskih izdanja i koliki je udio najvećeg pojedinačnog izvora u svakom gradu.',
      h1: 'Jedan glas',
      lead: 'Koliko je izdanje pluralno ne govori popis izvora, nego njihov udio. Ovo je mjerenje koncentracije: koliko svakog gradskog izdanja dolazi iz najvećeg pojedinačnog medija.',
      heroLabel: 'najveći udio jednog izvora',
      heroNote: () => `${voice[0].city}: ${voice[0].leadShare}% izdanja dolazi iz jednog medija (${voice[0].lead}). Najniži udio ima ${voice[voice.length - 1].city} (${voice[voice.length - 1].leadShare}%).`,
      tableHead: ['Grad', 'Izvora', 'Vodeći izvor', 'Udio', ''],
      sectionTitle: 'Tko nosi izdanje',
      sectionLead: 'Svi izvori po gradu, s udjelom. Ista mjera vrijedi za svako izdanje — ništa nije izuzeto.',
      meaning: (top) => `${top.city} ima ${top.sources} izvora, ali ${top.leadShare}% zapisa dolazi iz jednog. To nije greška u prikupljanju, to je stvarna slika tržišta: u nekim gradovima jedan medij pokriva gotovo sve teme, u drugima ih nosi pet ili šest.`,
    },
    en: {
      title: 'One voice — how plural is each edition, really',
      description: 'A source measurement from the AKTUAL MEDIA archive: how many outlets feed each of the eight city editions, and what share of each city comes from its single largest outlet.',
      h1: 'One voice',
      lead: 'How plural an edition is is not answered by a list of outlets, but by their share. This measures concentration: how much of each city edition comes from the single largest outlet.',
      heroLabel: 'largest share of a single outlet',
      heroNote: () => `${voice[0].city}: ${voice[0].leadShare}% of the edition comes from one outlet (${voice[0].lead}). The lowest share is ${voice[voice.length - 1].city} at ${voice[voice.length - 1].leadShare}%.`,
      tableHead: ['City', 'Outlets', 'Leading outlet', 'Share', ''],
      sectionTitle: 'Who carries the edition',
      sectionLead: 'Every outlet per city, with its share. The same measure applies to every edition — nothing is excluded.',
      meaning: (top) => `${top.city} has ${top.sources} outlets, yet ${top.leadShare}% of its records come from one of them. That is not a collection error, it is the shape of the market: in some cities a single outlet covers almost every topic, in others five or six carry it.`,
    },
  },
  silence: {
    hr: {
      title: 'Karta tišine — najdulja pauza u svakom gradu',
      description: 'Mjerenje iz arhive AKTUAL MEDIA: najdulji razmak između dvije objave u svakom od osam gradskih izdanja, koliko puta je pauza prešla šest sati i koliko je star najstariji zapis.',
      h1: 'Karta tišine',
      lead: 'Novosti se ne objavljuju ravnomjerno. Ovo je mjerenje praznina: najdulji razmak između dvije objave u svakom gradu, i koliko puta je ta pauza prešla šest sati.',
      heroLabel: 'najdulja zabilježena pauza',
      heroNote: () => `${silence[0].city}: ${silence[0].gap} h bez nove objave (završila ${utcLabel(silence[0].gapEnd)}). Najkraću pauzu ima ${silence[silence.length - 1].city}: ${silence[silence.length - 1].gap} h.`,
      tableHead: ['Grad', 'Najdulja pauza', 'Pauze > 6 h', 'Raspon arhive', ''],
      sectionTitle: 'Što pauza znači',
      sectionLead: 'Pauza nije kvar. Ona pokazuje ritam izvora, a ne ritam redakcije — i zato je objavljujemo.',
      meaning: (top) => `${top.city} je jedini grad s pauzom duljom od 24 sata: ${top.gap} h između dvije objave. Ostali gradovi drže ritam ispod 17 sati. Kad izvor zaspi, izdanje ne izmišlja vijest da popuni rupu — čeka.`,
    },
    en: {
      title: 'The silence map — the longest gap in every city',
      description: 'A measurement from the AKTUAL MEDIA archive: the longest gap between two publications in each of the eight city editions, how often the gap passed six hours, and how old the oldest record is.',
      h1: 'The silence map',
      lead: 'News does not arrive evenly. This measures the holes: the longest gap between two publications in each city, and how many times that gap passed six hours.',
      heroLabel: 'longest recorded gap',
      heroNote: () => `${silence[0].city}: ${silence[0].gap} h with no new item (ended ${utcLabel(silence[0].gapEnd)}). The shortest gap is ${silence[silence.length - 1].city} at ${silence[silence.length - 1].gap} h.`,
      tableHead: ['City', 'Longest gap', 'Gaps > 6 h', 'Archive span', ''],
      sectionTitle: 'What a gap means',
      sectionLead: 'A gap is not a fault. It shows the rhythm of the sources, not of the newsroom — which is exactly why we publish it.',
      meaning: (top) => `${top.city} is the only city with a gap longer than 24 hours: ${top.gap} h between two publications. Every other city stays under 17 hours. When a source goes quiet, the edition does not invent a story to fill the hole — it waits.`,
    },
  },
  vocabulary: {
    hr: {
      title: 'Osam jezika, jedan rječnik — što stvarno povezuje gradove',
      description: 'Mjerenje iz arhive AKTUAL MEDIA: riječi koje se istog dana pojavljuju u naslovima gotovo svih osam gradskih izdanja, s primjerima stvarnih naslova i poveznicama.',
      h1: 'Osam jezika, jedan rječnik',
      lead: 'Osam izdanja na osam jezika. A ipak, iz dana u dan, iste riječi prolaze kroz sve njih. Ovo je mjerenje zajedničkog rječnika — bez tumačenja, samo brojevi i naslovi.',
      heroLabel: 'imena prisutna u četiri ili više izdanja',
      heroNote: () => `Najviše gradova dijeli ${sharedNames[0].token} (${sharedNames[0].cities}/8). Slijede ${sharedNames.slice(1, 4).map((v) => v.token).join(', ')}. Ukupno ${vocabulary.length} riječi i imena prolazi kroz barem četiri grada.`,
      tableHead: ['Riječ', 'Gradova', 'Pojava', 'Gdje se pojavljuje'],
      sectionTitle: 'Riječi i naslovi koji ih nose',
      sectionLead: 'Svaka riječ ima primjer stvarnog naslova i poveznicu na izdanje u kojem je objavljen.',
      meaning: () => `Rječnik nije tematski popis — to su riječi koje se doista pojavljuju u naslovima. U istom danu kroz osam gradova prolaze ista imena, ista prijevoznička društva i iste institucije. Regionalna povezanost se ne mjeri deklaracijama, nego riječima koje stvarno izlaze.`,
    },
    en: {
      title: 'One vocabulary — what actually connects eight cities',
      description: 'A measurement from the AKTUAL MEDIA archive: the words that appear in the headlines of nearly all eight city editions on the same day, with real example headlines and links.',
      h1: 'One vocabulary',
      lead: 'Eight editions in eight languages. And yet, day after day, the same words pass through all of them. This measures the shared vocabulary — no interpretation, only counts and headlines.',
      heroLabel: 'names present in four or more editions',
      heroNote: () => `Most cities share ${sharedNames[0].token} (${sharedNames[0].cities}/8), then ${sharedNames.slice(1, 4).map((v) => v.token).join(', ')}. In total ${vocabulary.length} words and names pass through at least four cities.`,
      tableHead: ['Word', 'Cities', 'Mentions', 'Where it appears'],
      sectionTitle: 'The words, and the headlines that carry them',
      sectionLead: 'Every word comes with a real headline and a link to the edition that published it.',
      meaning: () => `The vocabulary is not a topic list — these are words that genuinely appear in headlines. Within a single day, the same names, the same carriers and the same institutions move through eight cities. Regional connection is not measured by declarations, but by the words that actually go out.`,
    },
  },
};

/* ---------- dijelovi ---------- */

const cityLinks = (lang) => `<ul class="dd-city">${CHANNELS.map((c) => `<li><a href="${cityBase(c, lang)}" hreflang="${c.lang}">${esc(c.city)}<span>${esc(c.title.replace('AKTUAL MEDIA KANAL ', ''))}</span></a></li>`).join('')}</ul>`;

const deskNav = (current, lang) => `<nav class="dd-chips" aria-label="${lang === 'en' ? 'Data desk pages' : 'Podatkovne stranice'}">${DESKS.filter((d) => d.id !== current.id).map((d) => `<li><a href="${route(d, lang)}">${esc(COPY[d.id][lang].h1)}</a></li>`).join('')}</nav>`;

const table = (lang, head, rows) => {
  const body = Array.isArray(rows) ? rows.join('') : String(rows || '');
  const headHtml = head.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  return `<table class="dd-table"><thead><tr>${headHtml}</tr></thead><tbody>${body}</tbody></table>`;
};

const barRow = (share, total) => `<span class="dd-bar" role="img" aria-label="${share}%"><i style="width:${Math.max(2, Math.min(100, Math.round((share / (total || 100)) * 100)))}%"></i></span>`;

/* ---------- tijelo po stranici ---------- */

function bodyNight(lang) {
  const copy = COPY.night[lang];
  const t = T[lang];
  const rows = night.map((row) => `<tr>
    <td><a href="${cityBase({ base: row.base }, lang)}">${esc(row.city)}</a></td>
    <td class="n">${row.count}</td>
    <td class="n">${row.total}</td>
    <td class="n">${row.share}%</td>
    <td>${barRow(row.share, 100)}</td>
  </tr>`);
  const samples = night.filter((row) => row.samples.length).slice(0, 3).flatMap((row) => row.samples.map((item) => {
    const channel = CHANNELS.find((c) => c.id === row.id);
    return `<li><a href="${channel.base}clanak/${esc(item.slug)}/">${esc(item.title)}</a><small>${esc(channel.title.replace('AKTUAL MEDIA KANAL ', ''))} · ${utcLabel(Date.parse(item.date))}</small></li>`;
  })).slice(0, 8);

  return `<section class="dd-hero">
    <div class="dd-big"><b>${nightTotals.items}</b><span>${esc(copy.heroLabel)}</span></div>
    <p class="dd-note">${esc(copy.heroNote(nightTotals))}</p>
  </section>
  <section class="dd-section">
    <h2>${lang === 'en' ? 'Night share by city' : 'Noćni udio po gradu'}</h2>
    <p>${lang === 'en' ? 'Sorted by the share of each edition published between 22:00 and 06:00 UTC.' : 'Poredano po udjelu izdanja objavljenog između 22:00 i 06:00 UTC.'}</p>
    ${table(lang, copy.tableHead, rows)}
    <p class="dd-mean">${esc(copy.meaning(night[0], night[night.length - 1]))}</p>
  </section>
  <section class="dd-section">
    <h2>${esc(copy.sectionTitle)}</h2>
    <p>${esc(copy.sectionLead)}</p>
    <ul class="dd-quote">${samples.join('')}</ul>
  </section>`;
}

function bodyVoice(lang) {
  const copy = COPY.voice[lang];
  const rows = voice.map((row) => `<tr>
    <td><a href="${cityBase({ base: row.base }, lang)}">${esc(row.city)}</a></td>
    <td class="n">${row.sources}</td>
    <td>${esc(row.lead)}</td>
    <td class="n">${row.leadShare}%</td>
    <td>${barRow(row.leadShare, 100)}</td>
  </tr>`);
  const detail = voice.map((row) => `<li><b>${esc(row.city)}</b> — ${esc(row.list.map((s) => `${s.name} ${s.share}%`).join(' · '))}</li>`).slice(0, 8);
  const shared = metrics.voice.sharedSources.slice(0, 6);
  return `<section class="dd-hero">
    <div class="dd-big"><b>${voice[0].leadShare}%</b><span>${esc(copy.heroLabel)} · ${esc(voice[0].city)}</span></div>
    <p class="dd-note">${esc(copy.heroNote())}</p>
  </section>
  <section class="dd-section">
    <h2>${lang === 'en' ? 'Largest single outlet per city' : 'Najveći pojedinačni izvor po gradu'}</h2>
    <p>${lang === 'en' ? 'Sorted from the most concentrated edition to the most plural one.' : 'Poredano od najkoncentriranijeg izdanja prema najpluralnijem.'}</p>
    ${table(lang, copy.tableHead, rows)}
    <p class="dd-mean">${esc(copy.meaning(voice[0]))}</p>
  </section>
  <section class="dd-section">
    <h2>${lang === 'en' ? 'Every outlet, every share' : 'Svaki izvor, svaki udio'}</h2>
    <ul class="dd-quote">${detail.join('')}</ul>
    ${shared.length ? `<p class="dd-note" style="margin-top:14px">${lang === 'en'
      ? `Outlets that appear in more than one city edition: ${esc(shared.map((s) => `${s.name} (${s.cities.length})`).join(', '))}.`
      : `Izvori koji se pojavljuju u više gradskih izdanja: ${esc(shared.map((s) => `${s.name} (${s.cities.length})`).join(', '))}.`}</p>` : ''}
  </section>`;
}

function bodySilence(lang) {
  const copy = COPY.silence[lang];
  const rows = silence.map((row) => `<tr>
    <td><a href="${cityBase({ base: row.base }, lang)}">${esc(row.city)}</a></td>
    <td class="n">${row.gap} h</td>
    <td class="n">${row.longGaps}</td>
    <td class="n">${Math.round(row.span)} h</td>
    <td>${barRow(row.gap, silence[0].gap)}</td>
  </tr>`);
  return `<section class="dd-hero">
    <div class="dd-big"><b>${silence[0].gap} h</b><span>${esc(copy.heroLabel)} · ${esc(silence[0].city)}</span></div>
    <p class="dd-note">${esc(copy.heroNote())}</p>
  </section>
  <section class="dd-section">
    <h2>${lang === 'en' ? 'Longest silence per city' : 'Najdulja tišina po gradu'}</h2>
    <p>${lang === 'en' ? 'The longest gap between two consecutive publications, and how many gaps passed six hours.' : 'Najdulji razmak između dvije uzastopne objave i koliko je pauza prešlo šest sati.'}</p>
    ${table(lang, copy.tableHead, rows)}
    <p class="dd-mean">${esc(copy.meaning(silence[0]))}</p>
  </section>
  <section class="dd-section">
    <h2>${lang === 'en' ? 'When the quiet hours ended' : 'Kada je tišina završila'}</h2>
    <ul class="dd-quote">${silence.map((row) => `<li><b>${esc(row.city)}</b> — ${esc(utcLabel(row.gapEnd))} · ${row.gap} h<small>${lang === 'en' ? 'previous item' : 'prethodni zapis'}: ${esc(utcLabel(row.gapStart))} · ${lang === 'en' ? 'archive span' : 'raspon arhive'} ${Math.round(row.span)} h</small></li>`).join('')}</ul>
  </section>`;
}

function bodyVocabulary(lang) {
  const copy = COPY.vocabulary[lang];
  const names = sharedNames.slice(0, 12);
  const words = sharedWords.slice(0, 12);
  const rows = (list) => list.map((row) => `<tr>
    <td><strong>${esc(row.token)}</strong></td>
    <td class="n">${row.cities}/8</td>
    <td class="n">${row.total}</td>
    <td>${esc(row.perCity.map((c) => `${CHANNELS.find((x) => x.id === c.id)?.city || c.id} ${c.count}`).join(' · '))}</td>
    <td>${barRow(row.cities, 8)}</td>
  </tr>`).join('');
  const examples = [...names.slice(0, 5), ...words.slice(0, 3)].flatMap((row) => row.examples.slice(0, 1).map((item) => {
    const channel = CHANNELS.find((c) => c.id === item.city);
    return `<li><a href="${channel.base}clanak/${esc(item.slug)}/">${esc(item.title)}</a><small>${esc(row.token)} · ${esc(channel.title.replace('AKTUAL MEDIA KANAL ', ''))}</small></li>`;
  }));
  const tableLead = lang === 'en'
    ? 'A word counts once per edition, no matter how many times it appears in it. Names are words that appear capitalised outside the first position of a headline in at least two cities.'
    : 'Riječ se broji jednom po izdanju, bez obzira na to koliko se puta u njemu pojavljuje. Imena su riječi koje se u najmanje dva grada pojavljuju velikim slovom izvan prvog mjesta u naslovu.';
  return `<section class="dd-hero">
    <div class="dd-big"><b>${sharedNames.length}</b><span>${esc(copy.heroLabel)}</span></div>
    <p class="dd-note">${esc(copy.heroNote())}</p>
  </section>
  <section class="dd-section">
    <h2>${lang === 'en' ? 'Names that travel' : 'Imena koja putuju'}</h2>
    <p>${esc(tableLead)}</p>
    ${table(lang, copy.tableHead, rows(names))}
    <p class="dd-mean">${esc(copy.meaning())}</p>
  </section>
  <section class="dd-section">
    <h2>${lang === 'en' ? 'Words that repeat' : 'Riječi koje se ponavljaju'}</h2>
    <p>${lang === 'en' ? 'The same measure, applied to everything that is not a name.' : 'Ista mjera, primijenjena na sve što nije ime.'}</p>
    ${table(lang, copy.tableHead, rows(words))}
  </section>
  <section class="dd-section">
    <h2>${esc(copy.sectionTitle)}</h2>
    <p>${esc(copy.sectionLead)}</p>
    <ul class="dd-quote">${examples.join('')}</ul>
  </section>`;
}

const BODIES = { night: bodyNight, voice: bodyVoice, silence: bodySilence, vocabulary: bodyVocabulary };

/* ---------- JSON-LD ---------- */

function jsonld(desk, lang, canonical, alternate, keywords) {
  const copy = COPY[desk.id][lang];
  const datasetId = `${canonical}#dataset`;
  const measured = desk.id === 'night'
    ? ['share of edition published between 22:00 and 06:00 UTC', 'night records per city']
    : desk.id === 'voice'
      ? ['number of outlets per city', 'share of the largest single outlet']
      : desk.id === 'silence'
        ? ['longest gap between two publications', 'archive span per city']
        : ['words appearing in four or more editions', 'mentions per word'];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        name: 'GNK ASG',
        url: `${SITE}/`,
        inLanguage: ['hr', 'en'],
        /* WebSite ostaje GNK ASG; AKTUAL MEDIA je izdavač sadržaja, ne
           vlasnik domene. */
        publisher: { '@id': `${SITE}/#gnk-asg` },
      },
      {
        '@type': 'NewsMediaOrganization',
        '@id': BRAND_ID,
        name: 'AKTUAL MEDIA d.o.o.',
        alternateName: BRAND_NAMES,
        url: `${SITE}/gnk-aktual/`,
        /* Znak izdavača: vlastiti wordmark AKTUAL MEDIA, ne znak matičnog društva. */
        logo: logoJsonLd(lang === 'en' ? 'aktual-media-en' : 'aktual-media-hr', { url: SITE }),
        parentOrganization: { '@type': 'Organization', '@id': `${SITE}/#gnk-asg`, name: 'GNK ASG d.o.o.', url: `${SITE}/` },
        editor: { '@id': `${SITE}/#nermin-sefic` },
      },
      {
        '@type': 'Person',
        '@id': `${SITE}/#nermin-sefic`,
        name: 'Nermin Sefić',
        jobTitle: lang === 'en' ? 'Editor and director' : 'Urednik i direktor',
        url: `${SITE}/nermin-sefic/`,
        worksFor: { '@id': BRAND_ID },
      },
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: copy.h1,
        description: copy.description,
        inLanguage: lang,
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': datasetId },
        publisher: { '@id': BRAND_ID },
        editor: { '@id': `${SITE}/#nermin-sefic` },
        mainEntity: { '@id': datasetId },
        keywords: keywords.join(', '),
      },
      {
        '@type': 'Dataset',
        '@id': datasetId,
        name: copy.title,
        description: copy.description,
        creator: { '@id': BRAND_ID },
        isAccessibleForFree: true,
        dateModified: generatedAt,
        temporalCoverage: `${generatedAt.slice(0, 10)}/..`,
        spatialCoverage: CHANNELS.map((c) => ({ '@type': 'Place', name: `${c.city}, ${c.country}` })),
        measurementTechnique: lang === 'en'
          ? 'Computed from the AKTUAL MEDIA city-edition archive on every build.'
          : 'Računa se iz arhive gradskih izdanja AKTUAL MEDIA pri svakoj gradnji.',
        variableMeasured: measured,
        distribution: {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: `${SITE}/data/aktual-data-desk-v1.json`,
        },
        url: alternate,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA d.o.o.', item: `${SITE}/gnk-aktual/` },
          { '@type': 'ListItem', position: 3, name: lang === 'en' ? 'Data desk' : 'Podatkovni desk', item: lang === 'en' ? `${SITE}/en/aktual-media/` : SECTION },
          { '@type': 'ListItem', position: 4, name: copy.h1, item: canonical },
        ],
      },
    ],
  };
}

/* ---------- stranica ---------- */

function page(desk, lang) {
  const copy = COPY[desk.id][lang];
  const t = T[lang];
  const canonical = abs(desk, lang);
  const alternate = abs(desk, lang === 'en' ? 'hr' : 'en');
  const keywords = [
    '#AktualMedia', '#Podaci', '#DataDesk', `#${desk.id === 'night' ? 'NocnaSmjena' : desk.id === 'voice' ? 'Izvori' : desk.id === 'silence' ? 'Tisina' : 'Rjecnik'}`,
    '#GNKASG', '#AKTUALMEDIA', lang === 'en' ? '#EightCities' : '#OsamGradova',
  ];
  const headline = copy.h1;
  const body = `<main id="sadrzaj" tabindex="-1">
  <header class="dd-head">
    <div class="dd-wrap">
      <p class="dd-kicker">${lang === 'en' ? 'Data desk · AKTUAL MEDIA' : 'Podatkovni desk · AKTUAL MEDIA'}</p>
      <h1>${esc(headline)}</h1>
      <p class="dd-lead">${esc(copy.lead)}</p>
      <ul class="dd-tags">${keywords.map((tag) => `<li><a href="${tag === '#GNKASG' ? '/kanal/' : tag === '#AktualMedia' ? '/gnk-aktual/' : '/izdanja/'}">${esc(tag)}</a></li>`).join('')}</ul>
    </div>
  </header>
  <div class="dd-wrap">
    ${BODIES[desk.id](lang)}
    <section class="dd-section">
      <h2>${esc(t.more)}</h2>
      ${deskNav(desk, lang)}
    </section>
    <section class="dd-section">
      <h2>${esc(t.cities)}</h2>
      <p>${esc(t.citiesNote)}</p>
      ${cityLinks(lang)}
    </section>
    <p class="dd-method"><strong>${esc(t.method)}</strong> ${esc(t.methodBody)}<br>
      ${esc(t.measured)}: ${esc(utcLabel(Date.parse(generatedAt)))} · ${allStamps.length} ${esc(t.items)} · ${CHANNELS.length} ${lang === 'en' ? 'editions' : 'izdanja'}.</p>
  </div>
</main>`;

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(copy.title)} | AKTUAL MEDIA</title>
<meta name="description" content="${esc(copy.description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="${esc(wordsOf([...keywords, 'AKTUAL MEDIA', 'Aktual mediji', 'GNK ASG']))}">
<meta name="news_keywords" content="${esc(wordsOf([...keywords, 'AKTUAL MEDIA', 'Aktual mediji', 'GNK ASG']))}">
${tagMetas(keywords)}
<meta name="theme-color" content="#061019">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${lang === 'en' ? 'hr' : 'en'}" href="${alternate}">
<link rel="alternate" hreflang="x-default" href="${abs(desk, 'hr')}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(copy.title)}">
<meta property="og:description" content="${esc(copy.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'hr_HR'}">
<meta property="og:image" content="${SITE}/assets/izdanja/aktual-media-og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(copy.title)}">
<meta name="twitter:description" content="${esc(copy.description)}">
<meta name="twitter:image" content="${SITE}/assets/izdanja/aktual-media-og.jpg">
<script type="application/ld+json">${safeJson(jsonld(desk, lang, canonical, alternate, keywords))}</script>
<style>${CSS}</style>
</head>
<body>
<a class="dd-skip" href="#sadrzaj">${lang === 'en' ? 'Skip to content' : 'Preskoči na sadržaj'}</a>
<div class="dd-top"><div class="dd-wrap">
  <span>${esc(t.top)}</span>
  <span><a href="/gnk-aktual/">${esc(t.back)}</a> · <a href="/izdanja/">${esc(t.editions)}</a> · <a href="/kanal/">${esc(t.channels)}</a> · <a href="${lang === 'en' ? '/en/aktual-media/proizvodi/' : '/aktual-media/proizvodi/'}">${lang === 'en' ? 'All products' : 'Svi proizvodi'}</a> · <a href="/radio/">${esc(t.radio)}</a> · <a href="${lang === 'en' ? '/s-chat/?ctx=%2Fen%2Fgnk-aktual%2F' : '/s-chat/?ctx=%2Fgnk-aktual%2F'}">${esc(t.agent)}</a> · <a href="${alternate}" hreflang="${lang === 'en' ? 'hr' : 'en'}" lang="${lang === 'en' ? 'hr' : 'en'}">${esc(t.lang)}</a></span>
</div></div>
${body}
<footer class="dd-foot"><div class="dd-wrap">
  <p>AKTUAL MEDIA d.o.o. · <a href="/gnk-aktual/">AKTUAL MEDIA</a> · <a href="/izdanja/">${esc(t.editions)}</a> · <a href="/kanal/">${esc(t.channels)}</a> · <a href="/aktual-media/sitemap.xml">${esc(t.sitemap)}</a> · <a href="/nermin-sefic/">Nermin Sefić</a></p>
  <p>${lang === 'en' ? 'Every figure on this page is recomputed from the archive on each build.' : 'Svaka brojka na ovoj stranici ponovno se računa iz arhive pri svakoj gradnji.'}</p>
</div></footer>
<script defer src="/assets/public-contrast-hardening-v1.js?v=20260713-readable"></script>
<script defer src="/assets/public-unified-menu-v6.js?v=20260713-full-navigation"></script>
</body>
</html>`;
}

/* ---------- indeks sekcije /aktual-media/ ---------- */

const SECTION_HERO = {
  hr: {
    title: 'Podatkovni desk — AKTUAL MEDIA, izmjereno',
    description: 'Četiri mjerenja vlastite arhive AKTUAL MEDIA: noćna smjena, koncentracija izvora, pauze u objavljivanju i zajednički rječnik osam gradskih izdanja. Sve brojke računaju se iz arhive, bez procjena.',
    h1: 'Podatkovni desk',
    lead: 'Četiri mjerenja onoga što AKTUAL MEDIA stvarno objavljuje — iz arhive, ne iz dojma. Svaka brojka se ponovno izračuna pri svakoj gradnji stranice i vrijedi za cijelu arhivu osam gradskih izdanja.',
  },
  en: {
    title: 'Data desk — AKTUAL MEDIA, measured',
    description: 'Four measurements of the AKTUAL MEDIA archive: the night shift, source concentration, publishing gaps and the shared vocabulary of eight city editions. Every figure is computed from the archive, none is estimated.',
    h1: 'Data desk',
    lead: 'Four measurements of what AKTUAL MEDIA actually publishes — from the archive, not from impression. Every figure is recomputed on each build and covers the full archive of eight city editions.',
  },
};

const SECTION_CARD = {
  night: { hr: 'Koliko izdanja izlazi dok grad spava, grad po grad.', en: 'How much of each edition goes out while the city sleeps.' },
  voice: { hr: 'Koliki je udio najvećeg pojedinačnog izvora u svakom gradu.', en: 'How much of each city comes from one single outlet.' },
  silence: { hr: 'Najdulji razmak između dvije objave, i koliko puta je prešao šest sati.', en: 'The longest gap between two publications, and how often it passed six hours.' },
  vocabulary: { hr: 'Riječi i imena koja prolaze kroz gotovo sva izdanja.', en: 'The words and names that pass through nearly every edition.' },
};

const SECTION_NUMBER = {
  night: (t) => `${t.items}`,
  voice: () => `${voice[0].leadShare}%`,
  silence: () => `${silence[0].gap} h`,
  vocabulary: () => `${sharedNames.length}`,
};

const SECTION_UNIT = {
  night: { hr: 'noćnih zapisa', en: 'night records' },
  voice: { hr: 'najveći udio', en: 'largest share' },
  silence: { hr: 'najdulja pauza', en: 'longest gap' },
  vocabulary: { hr: 'zajedničkih imena', en: 'shared names' },
};

function sectionPage(lang) {
  const copy = SECTION_HERO[lang];
  const t = T[lang];
  const canonical = lang === 'en' ? `${SITE}/en/aktual-media/` : `${SITE}/aktual-media/`;
  const alternate = lang === 'en' ? `${SITE}/aktual-media/` : `${SITE}/en/aktual-media/`;
  const keywords = ['#AktualMedia', '#Podaci', '#DataDesk', '#OsamGradova', '#GNKASG'];
  const cards = DESKS.map((desk) => {
    const text = COPY[desk.id][lang];
    return `<a class="dd-card" href="${route(desk, lang)}">
      <b>${esc(text.h1)}</b>
      <span>${esc(SECTION_CARD[desk.id][lang])}</span>
      <i>${esc(SECTION_NUMBER[desk.id](nightTotals))} ${esc(SECTION_UNIT[desk.id][lang])}</i>
    </a>`;
  }).join('');

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'GNK ASG', url: `${SITE}/`, inLanguage: ['hr', 'en'], publisher: { '@id': `${SITE}/#gnk-asg` } },
      { '@type': 'NewsMediaOrganization', '@id': BRAND_ID, name: 'AKTUAL MEDIA d.o.o.', alternateName: BRAND_NAMES, url: `${SITE}/gnk-aktual/`, logo: logoJsonLd(lang === 'en' ? 'aktual-media-en' : 'aktual-media-hr', { url: SITE }), editor: { '@id': `${SITE}/#nermin-sefic` } },
      { '@type': 'Person', '@id': `${SITE}/#nermin-sefic`, name: 'Nermin Sefić', jobTitle: lang === 'en' ? 'Editor and director' : 'Urednik i direktor', url: `${SITE}/nermin-sefic/` },
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: copy.title,
        description: copy.description,
        inLanguage: lang,
        isPartOf: { '@id': `${SITE}/#website` },
        publisher: { '@id': BRAND_ID },
        editor: { '@id': `${SITE}/#nermin-sefic` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: DESKS.length,
          itemListElement: DESKS.map((desk, i) => ({ '@type': 'ListItem', position: i + 1, name: COPY[desk.id][lang].h1, url: abs(desk, lang) })),
        },
        keywords: keywords.join(', '),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA d.o.o.', item: `${SITE}/gnk-aktual/` },
          { '@type': 'ListItem', position: 3, name: copy.h1, item: canonical },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(copy.title)} | AKTUAL MEDIA</title>
<meta name="description" content="${esc(copy.description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="${esc(wordsOf([...keywords, 'AKTUAL MEDIA', 'Aktual mediji', 'GNK ASG']))}">
<meta name="news_keywords" content="${esc(wordsOf([...keywords, 'AKTUAL MEDIA', 'Aktual mediji', 'GNK ASG']))}">
${tagMetas(keywords)}
<meta name="theme-color" content="#061019">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${lang === 'en' ? 'hr' : 'en'}" href="${alternate}">
<link rel="alternate" hreflang="x-default" href="${SITE}/aktual-media/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(copy.title)}">
<meta property="og:description" content="${esc(copy.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'hr_HR'}">
<meta property="og:image" content="${SITE}/assets/izdanja/aktual-media-og.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(copy.title)}">
<meta name="twitter:description" content="${esc(copy.description)}">
<meta name="twitter:image" content="${SITE}/assets/izdanja/aktual-media-og.jpg">
<script type="application/ld+json">${safeJson(graph)}</script>
<style>${CSS}
.dd-card i{display:block;margin-top:8px;font:800 12px/1 system-ui;letter-spacing:.06em;text-transform:uppercase;color:#e0bd69;font-style:normal}
</style>
</head>
<body>
<a class="dd-skip" href="#sadrzaj">${lang === 'en' ? 'Skip to content' : 'Preskoči na sadržaj'}</a>
<div class="dd-top"><div class="dd-wrap">
  <span>${esc(t.top)}</span>
  <span><a href="/gnk-aktual/">${esc(t.back)}</a> · <a href="/izdanja/">${esc(t.editions)}</a> · <a href="/kanal/">${esc(t.channels)}</a> · <a href="${lang === 'en' ? '/en/aktual-media/proizvodi/' : '/aktual-media/proizvodi/'}">${lang === 'en' ? 'All products' : 'Svi proizvodi'}</a> · <a href="/radio/">${esc(t.radio)}</a> · <a href="${lang === 'en' ? '/s-chat/?ctx=%2Fen%2Faktual-media%2F' : '/s-chat/?ctx=%2Faktual-media%2F'}">${esc(t.agent)}</a> · <a href="${alternate}" hreflang="${lang === 'en' ? 'hr' : 'en'}" lang="${lang === 'en' ? 'hr' : 'en'}">${esc(t.lang)}</a></span>
</div></div>
<main id="sadrzaj" tabindex="-1">
  <header class="dd-head"><div class="dd-wrap">
    <p class="dd-kicker">${lang === 'en' ? 'Data desk · AKTUAL MEDIA' : 'Podatkovni desk · AKTUAL MEDIA'}</p>
    <h1>${esc(copy.h1)}</h1>
    <p class="dd-lead">${esc(copy.lead)}</p>
    <ul class="dd-tags">${keywords.map((tag) => `<li><a href="${tag === '#GNKASG' ? '/kanal/' : tag === '#AktualMedia' ? '/gnk-aktual/' : '/izdanja/'}">${esc(tag)}</a></li>`).join('')}</ul>
  </div></header>
  <div class="dd-wrap">
    <section class="dd-section" style="border-top:0">
      <h2>${lang === 'en' ? 'Four measurements' : 'Četiri mjerenja'}</h2>
      <p>${lang === 'en' ? 'Each page measures one property of the same archive. Together they answer questions the newsroom cannot answer by opinion.' : 'Svaka stranica mjeri jedno svojstvo iste arhive. Zajedno odgovaraju na pitanja na koja redakcija ne može odgovoriti dojmom.'}</p>
      <div class="dd-grid">${cards}</div>
    </section>
    <section class="dd-section">
      <h2>${esc(t.cities)}</h2>
      <p>${esc(t.citiesNote)}</p>
      ${cityLinks(lang)}
    </section>
    <p class="dd-method"><strong>${esc(t.method)}</strong> ${esc(t.methodBody)}<br>
      ${esc(t.measured)}: ${esc(utcLabel(Date.parse(generatedAt)))} · ${allStamps.length} ${esc(t.items)} · ${CHANNELS.length} ${lang === 'en' ? 'editions' : 'izdanja'}.</p>
  </div>
</main>
<footer class="dd-foot"><div class="dd-wrap">
  <p>AKTUAL MEDIA d.o.o. · <a href="/gnk-aktual/">AKTUAL MEDIA</a> · <a href="/izdanja/">${esc(t.editions)}</a> · <a href="/kanal/">${esc(t.channels)}</a> · <a href="/aktual-media/sitemap.xml">${esc(t.sitemap)}</a> · <a href="/nermin-sefic/">Nermin Sefić</a></p>
  <p>${lang === 'en' ? 'Every figure on these pages is recomputed from the archive on each build.' : 'Svaka brojka na ovim stranicama ponovno se računa iz arhive pri svakoj gradnji.'}</p>
</div></footer>
<script defer src="/assets/public-contrast-hardening-v1.js?v=20260713-readable"></script>
<script defer src="/assets/public-unified-menu-v6.js?v=20260713-full-navigation"></script>
</body>
</html>`;
}

/* ---------- traka na AKTUAL MEDIA ---------- */

function band(lang) {
  const items = DESKS.map((desk) => {
    const copy = COPY[desk.id][lang];
    return `<a href="${route(desk, lang)}"><b>${esc(copy.h1)}</b><span>${esc(copy.title.split('—')[1] ? copy.title.split('—')[1].trim() : copy.title)}</span></a>`;
  }).join('');
  return `${MARK_START}
<section class="dd-band" aria-label="${lang === 'en' ? 'Data desk' : 'Podatkovni desk'}">
<style>
.dd-band{--ddb-line:rgba(233,198,108,.3);margin:26px 0 8px;padding:18px 0 4px;border-top:1px solid var(--ddb-line);border-bottom:1px solid var(--ddb-line)}
.dd-band h2{margin:0 0 4px;font:700 clamp(17px,2vw,21px)/1.2 Georgia,serif;color:#f4f7fc}
.dd-band p{margin:0 0 14px;color:#a9b8cc;font-size:13.5px}
.dd-band .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
.dd-band a{display:block;border:1px solid #25435f;border-radius:12px;padding:11px 13px;text-decoration:none;color:#e8edf3;background:rgba(9,24,40,.6)}
.dd-band a:hover{border-color:#e9c66c;text-decoration:none}
.dd-band b{display:block;font:700 14px/1.25 Georgia,serif;margin-bottom:3px}
.dd-band span{display:block;color:#8fa3ba;font-size:11.5px;line-height:1.4}
</style>
<h2>${lang === 'en' ? 'The newsroom measured' : 'Redakcija, izmjereno'}</h2>
<p>${lang === 'en' ? 'Four pages where AKTUAL MEDIA measures its own archive: night shifts, source concentration, silence gaps and the words all eight cities share.' : 'Četiri stranice na kojima AKTUAL MEDIA mjeri vlastitu arhivu: noćna smjena, koncentracija izvora, pauze u objavljivanju i riječi koje dijele svi gradovi.'}</p>
<div class="row">${items}</div>
</section>
${MARK_END}`;
}

function injectBand(lang) {
  const file = join(PORTAL, lang === 'en' ? 'en/gnk-aktual/index.html' : 'gnk-aktual/index.html');
  if (!existsSync(file)) return false;
  let html = readFileSync(file, 'utf8');
  const block = band(lang);
  const marker = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`, 'm');
  if (marker.test(html)) {
    html = html.replace(marker, () => block);
  } else {
    /* Traka ide odmah ispod rubrika: dovoljno visoko da je čitatelj vidi,
       a dovoljno nisko da ne odgodi prvi naslov. */
    const navOpen = html.indexOf('<nav class="am-sectionnav"');
    const navClose = navOpen >= 0 ? html.indexOf('</nav>', navOpen) : -1;
    if (navClose > 0) {
      const at = navClose + '</nav>'.length;
      html = `${html.slice(0, at)}\n${block}\n${html.slice(at)}`;
    } else {
      html = html.replace('</main>', `${block}\n</main>`);
    }
  }
  writeFileSync(file, html);
  return true;
}

/* ---------- sitemapi ---------- */

function writeSectionSitemap() {
  const sectionLinks = `<url><loc>${SITE}/aktual-media/</loc><lastmod>${generatedAt.slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.9</priority><xhtml:link rel="alternate" hreflang="hr" href="${SITE}/aktual-media/"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/aktual-media/"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/aktual-media/"/></url>
<url><loc>${SITE}/en/aktual-media/</loc><lastmod>${generatedAt.slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.9</priority><xhtml:link rel="alternate" hreflang="hr" href="${SITE}/aktual-media/"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/aktual-media/"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/aktual-media/"/></url>`;
  const productsLinks = `<url><loc>${SITE}/aktual-media/proizvodi/</loc><lastmod>${generatedAt.slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority><xhtml:link rel="alternate" hreflang="hr" href="${SITE}/aktual-media/proizvodi/"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/aktual-media/proizvodi/"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/aktual-media/proizvodi/"/></url>
<url><loc>${SITE}/en/aktual-media/proizvodi/</loc><lastmod>${generatedAt.slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority><xhtml:link rel="alternate" hreflang="hr" href="${SITE}/aktual-media/proizvodi/"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/aktual-media/proizvodi/"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/aktual-media/proizvodi/"/></url>`;
  const entries = DESKS.map((desk) => {
    const hr = abs(desk, 'hr');
    const en = abs(desk, 'en');
    const links = `<xhtml:link rel="alternate" hreflang="hr" href="${hr}"/><xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="x-default" href="${hr}"/>`;
    return `<url><loc>${hr}</loc><lastmod>${generatedAt.slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.8</priority>${links}</url>
<url><loc>${en}</loc><lastmod>${generatedAt.slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.8</priority>${links}</url>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sectionLinks}
${productsLinks}
${entries}
</urlset>
`;
  mkdirSync(join(PORTAL, 'aktual-media'), { recursive: true });
  writeFileSync(join(PORTAL, 'aktual-media', 'sitemap.xml'), xml);
  return DESKS.length * 2 + 4;
}

function upsertMainSitemap() {
  const file = join(PORTAL, 'sitemap.xml');
  if (!existsSync(file)) return 0;
  let xml = readFileSync(file, 'utf8');
  let changed = 0;
  const lastmodAll = generatedAt.slice(0, 10);
  const sectionBlocks = [
    `${SITE}/aktual-media/`, `${SITE}/en/aktual-media/`,
  ];
  for (const loc of sectionBlocks) {
    const block = `  <url><loc>${loc}</loc><lastmod>${lastmodAll}</lastmod><changefreq>daily</changefreq><priority>0.9</priority><xhtml:link rel="alternate" hreflang="hr" href="${SITE}/aktual-media/"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/aktual-media/"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/aktual-media/"/></url>`;
    const existing = new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>[\\s\\S]*?</url>`);
    if (existing.test(xml)) {
      const next = xml.replace(existing, block);
      if (next !== xml) { xml = next; changed += 1; }
    } else {
      xml = xml.replace('</urlset>', `${block}\n</urlset>`);
      changed += 1;
    }
  }
  for (const desk of DESKS) {
    const hr = abs(desk, 'hr');
    const en = abs(desk, 'en');
    const lastmod = generatedAt.slice(0, 10);
    for (const [loc, self, alt, lang] of [[hr, hr, en, 'hr'], [en, en, hr, 'en']]) {
      const block = `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="${lang}" href="${self}"/><xhtml:link rel="alternate" hreflang="${lang === 'hr' ? 'en' : 'hr'}" href="${alt}"/><xhtml:link rel="alternate" hreflang="x-default" href="${hr}"/></url>`;
      const existing = new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>[\\s\\S]*?</url>`);
      if (existing.test(xml)) {
        const next = xml.replace(existing, block);
        if (next !== xml) { xml = next; changed += 1; }
      } else {
        xml = xml.replace('</urlset>', `${block}\n</urlset>`);
        changed += 1;
      }
    }
  }
  if (changed) writeFileSync(file, xml);
  return changed;
}

/* ---------- baza znanja ---------- */

/* Agent mora moći odgovoriti o ovim stranicama istim brojkama koje
   stranice pokazuju. Zato se skupina u bazi znanja ne piše ručno, nego
   se svaki ciklus zamjenjuje iz istih mjerenja. */
const KB_FILE = join(PORTAL, 'data', 'knowledge-base.json');
const KB_GROUP = 'Podatkovni desk';

function kbEntries() {
  const hr = [];
  const en = [];
  const f = (n, lang) => {
    const text = String(n);
    const [whole, fraction] = text.split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : '.');
    return fraction ? `${grouped}${lang === 'en' ? '.' : ','}${fraction}` : grouped;
  };

  hr.push({
    p: 'Što je podatkovni desk AKTUAL MEDIA?',
    o: `Četiri stranice na kojima AKTUAL MEDIA mjeri vlastitu arhivu osam gradskih izdanja: noćna smjena na gnk-asg.hr/aktual-media/nocna-smjena/, jedan glas na gnk-asg.hr/aktual-media/jedan-glas/, karta tišine na gnk-asg.hr/aktual-media/karta-tisine/ i osam jezika na gnk-asg.hr/aktual-media/osam-jezika/. Brojke se računaju pri svakoj gradnji iz arhive od ${f(allStamps.length, 'hr')} zapisa. Engleske verzije su pod gnk-asg.hr/en/aktual-media/.`,
  });
  hr.push({
    p: 'Koliko izdanja AKTUAL MEDIA objavljuje noću?',
    o: `Od ${f(allStamps.length, 'hr')} zapisa u arhivi, ${f(nightTotals.items, 'hr')} (${f(nightTotals.share, 'hr')}%) objavljeno je između 22:00 i 06:00 UTC. Najveći noćni udio ima ${night[0].city} s ${f(night[0].share, 'hr')}%, najmanji ${night[night.length - 1].city} s ${f(night[night.length - 1].share, 'hr')}%. Detalji: gnk-asg.hr/aktual-media/nocna-smjena/`,
  });
  hr.push({
    p: 'Koliko je svako gradsko izdanje pluralno po izvorima?',
    o: `Najveći udio jednog izvora ima ${voice[0].city}: ${f(voice[0].leadShare, 'hr')}% zapisa dolazi iz medija ${voice[0].lead}. Najniži udio ima ${voice[voice.length - 1].city} s ${f(voice[voice.length - 1].leadShare, 'hr')}%. Mjerenje: gnk-asg.hr/aktual-media/jedan-glas/`,
  });
  hr.push({
    p: 'Koja je najdulja pauza u objavljivanju po gradu?',
    o: `Najdulja zabilježena pauza je ${f(silence[0].gap, 'hr')} sata u izdanju ${silence[0].city}, zaključno ${utcLabel(silence[0].gapEnd)}. Najkraća je ${f(silence[silence.length - 1].gap, 'hr')} sati u izdanju ${silence[silence.length - 1].city}. Karta tišine: gnk-asg.hr/aktual-media/karta-tisine/`,
  });
  hr.push({
    p: 'Koje riječi dijele sva gradska izdanja?',
    o: `Kroz barem četiri od osam gradskih izdanja prolazi ${vocabulary.length} riječi i imena. Najviše gradova dijeli ${sharedNames[0].token} (${sharedNames[0].cities} od 8), zatim ${sharedNames.slice(1, 4).map((row) => row.token).join(', ')}. Rječnik: gnk-asg.hr/aktual-media/osam-jezika/`,
  });

  en.push({
    p: 'What is the AKTUAL MEDIA data desk?',
    o: `Four pages where AKTUAL MEDIA measures its own archive of eight city editions: the 3 a.m. edition at gnk-asg.hr/en/aktual-media/the-3am-edition/, one voice at gnk-asg.hr/en/aktual-media/one-voice/, the silence map at gnk-asg.hr/en/aktual-media/the-silence-map/ and one vocabulary at gnk-asg.hr/en/aktual-media/one-vocabulary/. Figures are recomputed on every build from an archive of ${f(allStamps.length, 'en')} records. Croatian versions are under gnk-asg.hr/aktual-media/.`,
  });
  en.push({
    p: 'How much does AKTUAL MEDIA publish at night?',
    o: `Of ${f(allStamps.length, 'en')} records, ${f(nightTotals.items, 'en')} (${f(nightTotals.share, 'en')}%) were published between 22:00 and 06:00 UTC. ${night[0].city} has the largest night share at ${f(night[0].share, 'en')}%, ${night[night.length - 1].city} the smallest at ${f(night[night.length - 1].share, 'en')}%. Details: gnk-asg.hr/en/aktual-media/the-3am-edition/`,
  });
  en.push({
    p: 'How plural is each city edition by source?',
    o: `The largest single-outlet share is ${voice[0].city} at ${f(voice[0].leadShare, 'en')}%, all from ${voice[0].lead}. The lowest is ${voice[voice.length - 1].city} at ${f(voice[voice.length - 1].leadShare, 'en')}%. Measurement: gnk-asg.hr/en/aktual-media/one-voice/`,
  });
  en.push({
    p: 'What is the longest publishing gap per city?',
    o: `The longest recorded gap is ${f(silence[0].gap, 'en')} hours in ${silence[0].city}, ending ${utcLabel(silence[0].gapEnd)}. The shortest is ${f(silence[silence.length - 1].gap, 'en')} hours in ${silence[silence.length - 1].city}. The silence map: gnk-asg.hr/en/aktual-media/the-silence-map/`,
  });
  en.push({
    p: 'Which words do all city editions share?',
    o: `${vocabulary.length} words and names appear in at least four of the eight city editions. Most cities share ${sharedNames[0].token} (${sharedNames[0].cities} of 8), then ${sharedNames.slice(1, 4).map((row) => row.token).join(', ')}. The vocabulary: gnk-asg.hr/en/aktual-media/one-vocabulary/`,
  });

  return [{ naslov: KB_GROUP, pitanja: [...hr, ...en] }];
}

function syncKnowledgeBase() {
  if (!existsSync(KB_FILE)) return 0;
  const kb = JSON.parse(readFileSync(KB_FILE, 'utf8'));
  if (!Array.isArray(kb.skupine)) return 0;
  const fresh = kbEntries()[0];
  const index = kb.skupine.findIndex((group) => String(group.naslov || '').trim() === KB_GROUP);
  if (index >= 0) kb.skupine[index] = fresh;
  else kb.skupine.push(fresh);
  const total = kb.skupine.reduce((n, group) => n + (group.pitanja || []).length, 0);
  kb.ukupnoPitanja = total;
  kb.verzija = generatedAt.slice(0, 10);
  writeFileSync(KB_FILE, `${JSON.stringify(kb, null, 2)}\n`);
  return fresh.pitanja.length;
}

/* ---------- ulaz ---------- */

export async function buildDataDesk() {
  if (!channels.length) throw new Error('Data desk: nema arhive izdanja.');
  if (!vocabulary.length) throw new Error('Data desk: rječnik je prazan.');

  let written = 0;
  for (const lang of ['hr', 'en']) {
    const target = join(PORTAL, lang === 'en' ? 'en/aktual-media' : 'aktual-media', 'index.html');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, sectionPage(lang));
    written += 1;
  }
  for (const desk of DESKS) {
    for (const lang of ['hr', 'en']) {
      const target = join(PORTAL, route(desk, lang).slice(1), 'index.html');
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, page(desk, lang));
      written += 1;
    }
  }

  const dataFile = join(PORTAL, 'data', 'aktual-data-desk-v1.json');
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, `${JSON.stringify(metrics, null, 2)}\n`);

  const kb = syncKnowledgeBase();
  const bands = [injectBand('hr'), injectBand('en')].filter(Boolean).length;
  const sitemapUrls = writeSectionSitemap();
  const sitemapChanges = upsertMainSitemap();

  return {
    version: VERSION,
    pages: written,
    bands,
    sitemapUrls,
    sitemapChanges,
    kb,
    items: allStamps.length,
    nightShare: nightTotals.share,
    topVoice: `${voice[0].city} ${voice[0].leadShare}%`,
    longestSilence: `${silence[0].city} ${silence[0].gap}h`,
    vocabulary: vocabulary.length,
  };
}

if (process.argv[1] && process.argv[1].endsWith('data-desk.mjs')) {
  buildDataDesk().then((report) => console.log(JSON.stringify({ ok: true, ...report }, null, 2)));
}
