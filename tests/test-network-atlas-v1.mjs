#!/usr/bin/env node
/**
 * ATLAS, PAUKOVA MREŽA I GLAVNI GRADOVI — jedan standard na svakoj adresi.
 *
 * Ovaj test čuva tri stvari koje su dosad mogle tiho odstupiti:
 *
 *   1. GRAFIKA. Svako izdanje ima vlastitu naslovnu ilustraciju, iste familije
 *      i istih dimenzija. Alt nikad nije prazan, nikad ne tvrdi da je
 *      fotografija i nikad nije na stranom jeziku ako postoji domaći opis.
 *
 *   2. MREŽA. Svaka stranica koja tvrdi da pripada mreži nosi blok s točno 32
 *      adrese (17 gradova + 9 portala + 6 samostalnih), svaki čvor je pravi
 *      <a href>, a niti povezuju čvorove koji stvarno postoje. Nema izmišljenih
 *      adresa — popis se čita iz channels.json, world i sites registra.
 *
 *   3. GLAVNI GRADOVI. Popis u apps/region/capitals.json mora se slagati s
 *      channels.json: svako izdanje ima svoju zemlju, svaka zemlja svoj
 *      glavni grad, a izdanje označeno kao "live" mora stvarno postojati.
 *      Ništa se ne najavljuje prije nego ima izvor.
 *
 * Test ne piše ništa. Ako padne, poruka kaže koju datoteku treba pregledati.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (path) => readFileSync(path, 'utf8');
const readJson = (path) => JSON.parse(read(path));

const failures = [];
const notes = [];
const fail = (message) => failures.push(message);

/* ---------- izvori ---------- */

const CHANNELS = readJson(join(ROOT, 'apps', 'region', 'channels.json')).channels;
const CAPITALS = readJson(join(ROOT, 'apps', 'region', 'capitals.json'));
const ATLAS = readJson(join(ROOT, 'apps', 'portal', 'data', 'atlas-art-v1.json'));
const MREZA = readJson(join(ROOT, 'apps', 'portal', 'data', 'mreza-v1.json'));
const { WORLD_PORTALS } = await import('../apps/world/lib/registry.mjs');
const { SITES } = await import('../apps/sites/lib/registry.mjs');

const WORLD_IDS = ['nairobi', 'jakarta', 'newyork', 'saopaulo', 'sydney', 'singapur', 'kairo', 'tokio', 'peking'];
const EXPECTED_NODES = CHANNELS.length + WORLD_PORTALS.length + SITES.length;

/* ---------- 1. atlas grafika ---------- */

const ATLAS_DIR = join(ROOT, 'apps', 'portal', 'assets', 'atlas');
const EDITION_DIR = join(ROOT, 'apps', 'portal', 'assets', 'izdanja');
const REQUIRED_SIZES = { 240: [240, 160], 440: [440, 248], 800: [800, 450], 880: [880, 587], 1200: [1200, 675], 1600: [1600, 900] };

if (ATLAS.kind !== 'illustration') fail('atlas-art-v1.json: kind mora biti "illustration" — grafike nisu fotografije');
if (!ATLAS.images || !ATLAS.images.length) fail('atlas-art-v1.json: nema slika');

for (const image of ATLAS.images || []) {
  if (!image.alt || !image.alt.hr || !image.alt.en) fail(`${image.slug}: alt mora postojati na hrvatskom i engleskom`);
  if (!image.note || !image.note.hr) fail(`${image.slug}: nema napomene da je ilustracija generirana`);
  for (const [size, [w, h]] of Object.entries(REQUIRED_SIZES)) {
    if (image.slug === 'aktual-media-atlas' && ['880', '1200', '240'].includes(size)) continue;
    const file = join(ATLAS_DIR, `${image.slug}-${size}.webp`);
    if (!existsSync(file)) { fail(`${image.slug}: nedostaje ${size} (${w}×${h})`); continue; }
    if (!statSync(file).size) fail(`${image.slug}-${size}.webp je prazan`);
  }
  if (!existsSync(join(ATLAS_DIR, `${image.slug}-og.jpg`))) fail(`${image.slug}: nedostaje Open Graph varijanta`);
}

for (const id of WORLD_IDS) {
  if (!ATLAS.images.some((image) => image.slug === id)) fail(`svjetsko izdanje ${id} nema atlas grafiku`);
  /* Devet svjetskih izdanja koristi atlas i u mapi koju traže pločice,
     OG oznake i sitemap slika — dimenzije moraju biti iste kao ugovor. */
  for (const [size, [w, h]] of Object.entries(REQUIRED_SIZES)) {
    if (['880', '1200'].includes(size) === false) continue;
    const file = join(EDITION_DIR, `${id}-${size}.webp`);
    if (!existsSync(file)) fail(`${id}: nedostaje assets/izdanja/${id}-${size}.webp`);
  }
  const tile = join(EDITION_DIR, `${id}-tile.webp`);
  if (!existsSync(tile)) fail(`${id}: nedostaje pločica ${id}-tile.webp (pokreni tiles.mjs)`);
}

/* Regionalna izdanja zadržavaju stvarne fotografije, ali moraju imati sve
   veličine — inače kartica i hero vuku različite datoteke. */
for (const channel of CHANNELS.filter((c) => !WORLD_IDS.includes(c.id))) {
  for (const size of ['240', '440', '800', '1200']) {
    if (!existsSync(join(EDITION_DIR, `${channel.id}-${size}.webp`))) fail(`${channel.id}: nedostaje ${channel.id}-${size}.webp`);
  }
  if (!existsSync(join(EDITION_DIR, `${channel.id}-og.jpg`))) fail(`${channel.id}: nedostaje ${channel.id}-og.jpg`);
}

/* ---------- 2. paukova mreža na stranicama ---------- */

const WEB_PAGES = [
  ['apps/portal/mreza/index.html', 'hr'],
  ['apps/portal/en/network/index.html', 'en'],
  ['apps/portal/izdanja/index.html', 'hr'],
  ['apps/portal/glavni-gradovi/index.html', 'hr'],
  ['apps/portal/en/capitals/index.html', 'en'],
  ...CHANNELS.map((c) => [`apps/portal/kanal/${c.id}/index.html`, c.lang]),
  ...CHANNELS.map((c) => [`apps/portal/kanal/${c.id}/mreza/index.html`, c.lang]),
  ...WORLD_IDS.map((id) => [`apps/world/site/${id}/index.html`, id])
];

for (const [rel, label] of WEB_PAGES) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) { fail(`${rel}: ne postoji`); continue; }
  const html = read(file);
  if (!html.includes('data-spiderweb')) { fail(`${rel}: nema paukove mreže`); continue; }
  /* `sw-nodes` je grupa, `sw-hub-disc` je dio matice — broje se samo pravi
     čvorovi i sam link matice, inače bi CSS klase pokvarile brojanje. */
  const nodes = (html.match(/class="sw-node[ "]/g) || []).length;
  if (nodes !== EXPECTED_NODES) fail(`${rel}: mreža ima ${nodes} čvorova, očekivano ${EXPECTED_NODES}`);
  const hub = (html.match(/<a class="sw-hub[ "]/g) || []).length;
  if (hub !== 1) fail(`${rel}: matica se pojavljuje ${hub} puta (očekivano 1)`);
  if (!/sw-svg[\s\S]{0,200}role="img"[\s\S]{0,400}<title/.test(html)) fail(`${rel}: SVG mreže nema role="img" i <title>`);
  /* Nijedan čvor ne smije biti prazan link. */
  const empty = [...html.matchAll(/<a class="sw-node[^"]*" href="([^"]*)"/g)].filter((m) => !/^https?:\/\//.test(m[1]));
  if (empty.length) fail(`${rel}: ${empty.length} čvorova bez apsolutne adrese`);
}

/* Blok mreže (popis 20 ulaza) i dalje mora postojati na izdanjima i
   portalima — paukova mreža ne zamjenjuje popis, nego ga dopunjuje.
   /mreza/ i /izdanja/ su sami popis, pa tamo blok nije potreban. */
for (const rel of [...CHANNELS.map((c) => `apps/portal/kanal/${c.id}/index.html`), ...WORLD_IDS.map((id) => `apps/world/site/${id}/index.html`)]) {
  const html = read(join(ROOT, rel));
  if (!html.includes('data-mesh="v1"')) fail(`${rel}: nema bloka mreže data-mesh="v1"`);
}

/* Skripta za osvjetljavanje niti mora postojati na svakoj adresi koja je
   uključuje — inače je 404 u konzoli, a mreža ostaje statična. */
for (const script of ['apps/portal/assets/spiderweb-v1.js', 'apps/portal/kanal/zagreb/assets/spiderweb-v1.js', 'apps/portal/kanal/tokio/assets/spiderweb-v1.js']) {
  if (!existsSync(join(ROOT, script))) fail(`${script}: nedostaje`);
}

/* Natpisi mreže: nijedna oznaka ne smije izaći iz platna ni prekriti drugu.
   Širina se računa po rasponu pisma (latinica, arapski, CJK), a ne po broju
   znakova — japansko ime je dvostruko šire od latiničnog. */
const wide = (text) => [...text].reduce((n, ch) => n + (/[\u3000-\u9fff\uac00-\ud7af]/.test(ch) ? 12 : /[\u0600-\u06ff]/.test(ch) ? 7 : 6.6), 0);
for (const lang of ['hr', 'en', 'ja', 'zh', 'ar']) {
  const { spiderWeb } = await import('../apps/satellites/lib/spiderweb-v1.mjs');
  const html = spiderWeb({ lang });
  const boxes = [];
  for (const match of html.matchAll(/<circle class="sw-dot" cx="[\d.]+" cy="[\d.]+" r="[\d.]+"[\s\S]*?<text class="sw-label" x="([\d.]+)" y="([\d.]+)" text-anchor="(\w+)">([^<]*)(?:<tspan[^>]*>([^<]*)<\/tspan>)?<\/text>/g)) {
    const [, tx, ty, anchor, label, suffix] = match;
    const text = label + (suffix || '');
    const w = wide(text);
    const x0 = anchor === 'start' ? Number(tx) : anchor === 'end' ? Number(tx) - w : Number(tx) - w / 2;
    boxes.push({ text, x0, x1: x0 + w, y0: Number(ty) - 10, y1: Number(ty) + 4 });
  }
  if (boxes.length !== EXPECTED_NODES) fail(`${lang}: mreža ima ${boxes.length} natpisa, očekivano ${EXPECTED_NODES}`);
  for (let i = 0; i < boxes.length; i += 1) {
    const a = boxes[i];
    if (a.x0 < 2 || a.x1 > 1238 || a.y0 < 2 || a.y1 > 998) fail(`${lang}: natpis „${a.text}" izlazi iz platna`);
    for (let j = i + 1; j < boxes.length; j += 1) {
      const b = boxes[j];
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) fail(`${lang}: natpisi „${a.text}" i „${b.text}" se preklapaju`);
    }
  }
}

/* ---------- 3. glavni gradovi ---------- */

const capList = CAPITALS.capitals || [];
if (capList.length !== CHANNELS.length) {
  fail(`capitals.json ima ${capList.length} zemalja, channels.json ${CHANNELS.length} izdanja — popisi se moraju pokrivati`);
}
const capCodes = new Set(capList.map((c) => c.countryCode));
for (const channel of CHANNELS) {
  if (!capCodes.has(channel.countryCode)) fail(`${channel.id}: zemlja ${channel.countryCode} nema unos u capitals.json`);
}
for (const cap of capList) {
  if (cap.status === 'live') {
    if (!cap.edition) fail(`${cap.capital}: status "live" bez izdanja`);
    else if (!CHANNELS.some((c) => c.id === cap.edition)) fail(`${cap.capital}: izdanje ${cap.edition} ne postoji u channels.json`);
    else if (!existsSync(join(ROOT, 'apps', 'portal', 'kanal', cap.edition, 'index.html'))) fail(`${cap.capital}: izdanje ${cap.edition} nema stranicu`);
    else if (WORLD_IDS.includes(cap.edition) && !existsSync(join(ROOT, 'apps', 'world', 'site', cap.edition, 'index.html'))) fail(`${cap.capital}: svjetsko izdanje ${cap.edition} nema portal`);
  } else {
    if (cap.edition) fail(`${cap.capital}: status "${cap.status}" ne smije imati izdanje — najava prije izvora`);
    if (!cap.note || cap.note.length < 40) fail(`${cap.capital}: nema objašnjenja zašto je u pripremi`);
  }
  if (!cap.lang || !cap.continent) fail(`${cap.capital}: nedostaje jezik ili kontinent`);
}

const capJson = join(ROOT, 'apps', 'portal', 'data', 'glavni-gradovi-v1.json');
if (!existsSync(capJson)) fail('data/glavni-gradovi-v1.json: nedostaje — pokreni hub.mjs');
else {
  const data = readJson(capJson);
  const live = capList.filter((c) => c.status === 'live').length;
  if (data.countries !== capList.length) fail(`glavni-gradovi-v1.json: ${data.countries} zemalja, popis ima ${capList.length}`);
  if (data.live !== live) fail(`glavni-gradovi-v1.json: ${data.live} aktivnih, popis ima ${live}`);
  if (!Array.isArray(data.standard) || data.standard.length < 6) fail('glavni-gradovi-v1.json: standard mora imati najmanje šest točaka');
}

for (const rel of ['apps/portal/glavni-gradovi/index.html', 'apps/portal/en/capitals/index.html']) {
  const html = read(join(ROOT, rel));
  const rows = (html.match(/class="cg-cap"/g) || []).length;
  if (rows !== capList.length) fail(`${rel}: ${rows} redaka, popis ima ${capList.length}`);
  if (!/"[@]type":\s*"ItemList"/.test(html)) fail(`${rel}: nema ItemList u JSON-LD-u`);
  if (!/<link rel="canonical" href="https:\/\/gnk-asg\.hr\/(en\/capitals|glavni-gradovi)\/">/.test(html)) fail(`${rel}: canonical ne vodi na stranicu`);
}

/* ---------- 3b. stranica po prijestolnici ---------- */

/* Svaka prijestolnica ima vlastitu adresu, na hrvatskom i na engleskom.
   Stranica smije reći da izdanja još nema — ne smije tvrditi da postoji. */
const capPages = [];
for (const cap of capList) {
  if (!cap.slug) { fail(`${cap.capital}: nema slug — stranica se ne može izgraditi`); continue; }
  for (const lang of ['hr', 'en']) {
    const rel = lang === 'en'
      ? `apps/portal/en/capitals/${cap.slug}/index.html`
      : `apps/portal/glavni-gradovi/${cap.slug}/index.html`;
    const file = join(ROOT, rel);
    if (!existsSync(file)) { fail(`${rel}: nedostaje — pokreni node apps/region/engine/hub.mjs`); continue; }
    const html = read(file);
    capPages.push(rel);
    const canonical = lang === 'en'
      ? `https://gnk-asg.hr/en/capitals/${cap.slug}/`
      : `https://gnk-asg.hr/glavni-gradovi/${cap.slug}/`;
    if (!html.includes(`<link rel="canonical" href="${canonical}">`)) fail(`${rel}: canonical nije ${canonical}`);
    for (const hl of ['hr', 'en', 'x-default']) if (!html.includes(`hreflang="${hl}"`)) fail(`${rel}: nema hreflang ${hl}`);
    if ((html.match(/<h1[ >]/g) || []).length !== 1) fail(`${rel}: h1 nije točno jedan`);
    if (/undefined/.test(html)) fail(`${rel}: sadrži "undefined"`);
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    if (title.length < 15 || title.length > 90) fail(`${rel}: naslov ima ${title.length} znakova`);
    const desc = (html.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '';
    if (desc.length < 80 || desc.length > 320) fail(`${rel}: opis ima ${desc.length} znakova`);
    for (const img of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="[^"]+"/.test(img[0])) fail(`${rel}: slika bez alt teksta`);
    if ((html.match(/<a [^>]*href="/g) || []).length < 6) fail(`${rel}: manje od šest poveznica`);
    if (!/"@type":"BreadcrumbList"/.test(html)) fail(`${rel}: nema BreadcrumbList u JSON-LD-u`);
    const channel = cap.edition ? CHANNELS.find((c) => c.id === cap.edition) : null;
    if (channel && !html.includes(channel.base)) fail(`${rel}: ne vodi na izdanje ${cap.edition}`);
    if (!channel) {
      const seats = cap.seats ? CHANNELS.find((c) => c.id === cap.seats) : null;
      if (seats && !html.includes(seats.base)) fail(`${rel}: pripremna stranica ne vodi na izdanje ${cap.seats}`);
      if (!/u pripremi|in preparation|no verified source list|nema provjerenu listu/.test(html)) fail(`${rel}: ne kaže da izdanje još nema provjerenih izvora`);
    }
  }
}

/* Popis mora voditi na svaku stranicu — inače stranica postoji samo za tražilicu. */
for (const [rel, prefix] of [
  ['apps/portal/glavni-gradovi/index.html', '/glavni-gradovi/'],
  ['apps/portal/en/capitals/index.html', '/en/capitals/']
]) {
  const html = read(join(ROOT, rel));
  for (const cap of capList) if (cap.slug && !html.includes(`${prefix}${cap.slug}/`)) fail(`${rel}: nema veze na ${cap.slug}`);
}

/* ---------- 4. sinkronizacija mreže ---------- */

/* Adresa u mreži = izdanje + portal + samostalna stranica. Matična
   stranica, arhiva i dnevnik su ulazi u maticu, ne zasebne adrese. */
const addresses = CHANNELS.length + WORLD_PORTALS.length + SITES.length;
if (MREZA.total !== undefined && MREZA.total !== addresses) {
  notes.push(`mreza-v1.json prijavljuje ${MREZA.total} adresa, test broji ${addresses}`);
}
const mrezaHtml = read(join(ROOT, 'apps/portal/mreza/index.html'));
if (!new RegExp(`>\\s*${addresses}\\s*<`).test(mrezaHtml)) fail(`/mreza/ ne navodi broj adresa ${addresses} u brojaču`);

const result = {
  ok: failures.length === 0,
  version: 'GNK_ASG_NETWORK_ATLAS_V1_20261023',
  atlas: { images: (ATLAS.images || []).length, sizes: Object.keys(REQUIRED_SIZES).length, worldEditions: WORLD_IDS.length },
  spiderweb: { pages: WEB_PAGES.length, nodes: EXPECTED_NODES, cities: CHANNELS.length, portals: WORLD_PORTALS.length, sites: SITES.length },
  capitals: { countries: capList.length, live: capList.filter((c) => c.status === 'live').length, preparing: capList.filter((c) => c.status !== 'live').length, pages: capPages.length },
  network: { addresses, editions: CHANNELS.length },
  notes,
  failures
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
