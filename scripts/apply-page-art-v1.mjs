#!/usr/bin/env node
/**
 * NASLOVNA SLIKA STRANICE — `page-art v1`.
 *
 * Pravilo koje ova skript provodi: nijedna javna stranica ne ostaje bez
 * slike. Stranica bez slike izgleda prazno bez obzira na to koliko teksta
 * ima — čitatelj prvo vidi bjelinu, a ne sadržaj.
 *
 * Skript radi u dva koraka:
 *
 *   1. Za stranice iz karte (CURATED) umetne pravu fotografiju ili
 *      ilustraciju s vlastitim opisom (alt) i potpisom (figcaption).
 *   2. Za svaku drugu javnu stranicu bez slike umetne zadanu sliku portala,
 *      da nova stranica nikad ne izađe prazna — i to bez ručnog rada.
 *
 * Umetanje je idempotentno: blok je omeđen oznakama `<!-- page-art:v1 -->`
 * i `<!-- /page-art:v1 -->`, pa se pri ponovnom pokretanju zamjenjuje, a ne
 * umnožava. Skript također uskladi `og:image` / `twitter:image` s tom
 * slikom kad je stranica još nosila samo opću društvenu karticu.
 *
 * Pokretanje:
 *   node scripts/apply-page-art-v1.mjs            # primijeni
 *   node scripts/apply-page-art-v1.mjs --check    # samo izvijesti
 *   node scripts/apply-page-art-v1.mjs --only /zdravlje/
 *
 * Zahtijeva da slike postoje u apps/portal/assets (provjerava ih).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORTAL = join(ROOT, 'apps', 'portal');

const CHECK = process.argv.includes('--check');
const arg = (name, fallback = '') => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] ?? fallback;
};
const ONLY = arg('--only', '');

const SITE = 'https://gnk-asg.hr';
const GENERIC_CARD = '/assets/gnk-asg-social-card.png';
const CSS_HREF = '/assets/page-art-v1.css';
const OPEN = '<!-- page-art:v1 -->';
const CLOSE = '<!-- /page-art:v1 -->';

/* Prava slika za stranicu. `art` je osnovno ime bez veličine; skript sam
   pronađe koje veličine postoje (440/800/1200) i složi srcset. */
const CURATED = [
  /* --- AKTUAL MEDIA i podatkovni desk ---------------------------------- */
  ['/aktual-media/', 'izdanja/jakarta', 'Jakarta: gradska panorama s visine, u prvom planu autocestovni čvor', 'Jakarta, Indonezija. Gradsko izdanje koje hrani podatkovni desk.'],
  ['/en/aktual-media/', 'izdanja/jakarta', 'Jakarta: city skyline from above, a highway interchange in the foreground', 'Jakarta, Indonesia. A city edition feeding the data desk.'],
  ['/aktual-media/nocna-smjena/', 'izdanja/zagreb', 'Zagreb noću: katedrala i Trg bana Jelačića pod uličnim svjetlima', 'Zagreb noću. Noćna smjena mjeri što izlazi dok grad spava.'],
  ['/en/aktual-media/the-3am-edition/', 'izdanja/zagreb', 'Zagreb at night: the cathedral and Ban Jelačić Square under street lights', 'Zagreb after dark. The 3 a.m. edition measures what goes out while the city sleeps.'],
  ['/aktual-media/jedan-glas/', 'izdanja/rim', 'Rim: gradski krovovi i kupole u sumrak', 'Rim, Italija. Jedan glas mjeri udio najvećeg izvora u svakom gradu.'],
  ['/en/aktual-media/one-voice/', 'izdanja/rim', 'Rome: city rooftops and domes at dusk', 'Rome, Italy. One voice measures the largest single source in each city.'],
  ['/aktual-media/karta-tisine/', 'izdanja/sofija', 'Sofija: gradska panorama s visine', 'Sofija, Bugarska. Karta tišine mjeri najdulje pauze između objava.'],
  ['/en/aktual-media/the-silence-map/', 'izdanja/sofija', 'Sofia: city panorama from above', 'Sofia, Bulgaria. The silence map measures the longest gaps between posts.'],
  ['/aktual-media/osam-jezika/', 'izdanja/bukurest', 'Bukurešt: gradska panorama s visine', 'Bukurešt, Rumunjska. Rječnik uspoređuje naslove svih gradskih izdanja.'],
  ['/en/aktual-media/one-vocabulary/', 'izdanja/bukurest', 'Bucharest: city panorama from above', 'Bucharest, Romania. The vocabulary compares headlines across every city edition.'],
  ['/aktual-media/proizvodi/', 'editorial/newsroom-poster-hr', 'Ilustracija AKTUAL MEDIA redakcije: slojevi izvora i objava', 'Proizvodi AKTUAL MEDIA: što nastaje iz gradskih izdanja.'],

  /* --- kanali i mreža --------------------------------------------------- */
  ['/kanal/', 'izdanja/newyork', 'New York: gradska panorama s visine', 'Gradski kanali AKTUAL MEDIA — jedan grad, jedan feed, jedan izvor provjere.'],
  ['/izdanja/', 'izdanja/tokio', 'Tokio: gradsko svjetlo u sumrak, u prvom planu tornjevi', 'Svjetska izdanja AKTUAL MEDIA.'],

  /* --- portali i alati -------------------------------------------------- */
  ['/ai-visibility/', 'izdanja/tokio', 'Tokio u sumrak: gusto gradsko tkivo i osvijetljeni tornjevi', 'Vidljivost u AI odgovorima mjeri se na javnim stranicama, ne na procjenama.'],
  ['/en/s-chat/', 'izdanja/singapur', 'Singapur: gradska panorama i luka u sumrak', 'The assistant answers only from pages published on the portal.'],
  ['/s-chat/', 'izdanja/singapur', 'Singapur: gradska panorama i luka u sumrak', 'Asistent odgovara samo iz objavljenih stranica portala.'],
  ['/gnk-navigator/', 'izdanja/kairo', 'Kairo: gradska panorama uz rijeku', 'Navigator vodi kroz arhivu, deskové i izdanja.'],
  ['/usa/', 'izdanja/newyork', 'New York: gradska panorama s visine', 'Sjedinjene Američke Države u mreži AKTUAL MEDIA — izdanje New York.'],
  ['/en/future-technology/', 'izdanja/peking', 'Peking: gradska panorama s visine', 'Tehnologija budućnosti: teme koje prate izdanja mreže.'],
  ['/tehnologija-buducnosti/', 'desk/art/tehnologija', 'Ilustracija deska Tehnologija: slojevi sustava i sučelja', 'Desk Tehnologija prati alate, infrastrukturu i ono što iza njih stoji.'],

  /* --- deskovi i redakcija --------------------------------------------- */
  ['/editor-desk/', 'izdanja/sarajevo', 'Sarajevo: gradska panorama u dolini', 'Urednički desk: kako se tekst prima, provjerava i objavljuje.'],
  ['/medijska-kritika/', 'izdanja/sydney', 'Sydney: gradska panorama i luka', 'Medijska kritika: što stoji iza naslova koje druge redakcije prenose.'],
  ['/medijska-kritika/en/', 'izdanja/sydney', 'Sydney: city panorama and harbour', 'Media criticism: what stands behind the headlines other newsrooms pick up.'],
  ['/top-teme/', 'desk/art/svijet', 'Ilustracija deska Svijet: zemljovid i slojevi', 'Teme koje se ponavljaju kroz izdanja, poredane po broju objava.'],
  ['/top-teme/en/', 'desk/art/svijet', 'World desk illustration: map and layers', 'Themes repeated across editions, ordered by the number of posts.'],
  ['/telegraph-clanci/', 'izdanja/nairobi', 'Nairobi: gradska panorama s visine', 'Pregled objava i tekstova preuzetih iz mreže.'],
  ['/projects/selected-projects/', 'topic-media/projects-infrastructure', 'Infrastrukturni projekti: mostovi i prometnice gledani s visine', 'Odabrani projekti: što je ugovoreno, što je izgrađeno i što se može provjeriti.'],
  ['/en/projects/selected-projects/', 'topic-media/projects-infrastructure', 'Infrastructure projects: bridges and roads seen from above', 'Selected projects: what was contracted, what was built, and what can be verified.'],
  ['/digital-workforce/knjiga/', 'desk/art/biznis', 'Ilustracija deska Biznis: poslovni slojevi i brojke', 'Digitalna radna snaga: knjiga o promjeni zanimanja, s izvorima uz svaki broj.'],

  /* --- sustav ----------------------------------------------------------- */
  ['/autonomija/', 'desk/art/tehnologija', 'Ilustracija deska Tehnologija: slojevi sustava i sučelja', 'Autonomija 365: što se popravlja samo i gdje se to vidi.'],
  ['/en/autonomy/', 'desk/art/tehnologija', 'Technology desk illustration: system layers and interfaces', 'Autonomy 365: what repairs itself and where that is visible.'],
  ['/bank/', 'desk/art/biznis', 'Ilustracija deska Biznis: poslovni slojevi i brojke', 'Bankovni projekt: dokumenti, brojke i provjerljivi izvori.'],
  ['/en/bank/', 'desk/art/biznis', 'Business desk illustration: business layers and figures', 'The bank project: documents, figures and verifiable sources.'],
  ['/zdravlje/', 'desk/art/svijet', 'Ilustracija deska Svijet: zemljovid i slojevi', 'Ploča zdravlja računa se iz datoteka u repozitoriju pri svakoj gradnji.'],
  ['/en/zdravlje/', 'desk/art/svijet', 'World desk illustration: map and layers', 'The health board is computed from repository files on every build.'],
  ['/workers/grupacije/', 'desk/art/biznis', 'Ilustracija deska Biznis: poslovni slojevi i brojke', 'Radne skupine: koja automatizacija pripada kojem dijelu redakcije.'],
  ['/workers/grupacije/en/', 'desk/art/biznis', 'Business desk illustration: business layers and figures', 'Worker groups: which automation belongs to which part of the newsroom.'],
  ['/aktual-sova/', 'izdanja/ljubljana', 'Ljubljana: gradska panorama s utvrdom na brdu', 'AKTUAL SOVA: noćni pregled koji nastaje iz arhive izdanja.'],
  ['/feed/', 'izdanja/tokio', 'Tokio: gradsko svjetlo u sumrak, u prvom planu tornjevi', 'Središnji feed portala: sve objave na jednom mjestu.'],
  ['/en/feed/', 'izdanja/tokio', 'Tokyo at dusk: dense city fabric and lit towers', 'The portal central feed: every post in one place.']
];

/* Zadana slika za stranicu koje nema u karti. */
const FALLBACK = {
  art: 'izdanja/zagreb',
  alt: 'Zagreb noću: katedrala i Trg bana Jelačića pod uličnim svjetlima',
  caption: 'AKTUAL MEDIA — gradsko izdanje Zagreb.'
};

const EXCLUDE_SEGMENTS = new Set(['admin', 'admin-center', 'tools', 'api', '.github', 'data', 'assets', 'app']);
const EXCLUDE_PREFIXES = ['google', 'BingSiteAuth', 'yandex'];

const SIZES = [440, 800, 1200];

const esc = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const dimensions = (file) => {
  /* WebP/JPEG zaglavlje: dovoljno je pročitati širinu i visinu bez ovisnosti. */
  try {
    const buf = readFileSync(file);
    if (buf.slice(0, 4).toString('ascii') === 'RIFF') {
      const sig = buf.slice(12, 16).toString('ascii');
      if (sig === 'VP8X') {
        const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
        const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
        return [w, h];
      }
      if (sig === 'VP8 ') {
        const w = buf.readUInt16LE(26) & 0x3fff;
        const h = buf.readUInt16LE(28) & 0x3fff;
        return [w, h];
      }
      if (sig === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1];
      }
    }
  } catch { /* nastavi na zadanu veličinu */ }
  return [1200, 675];
};

const buildFigure = (art, alt, caption) => {
  const base = join(PORTAL, 'assets', art);
  const available = SIZES.filter((size) => existsSync(`${base}-${size}.webp`));
  /* Neke slike postoje u jednoj veličini (JPG/WebP bez izvedenica) — i one
     su dovoljne; bolje jedna prava slika nego prazna ploha. */
  const single = available.length ? null : ['.webp', '.jpg', '.png']
    .map((ext) => `${base}${ext}`)
    .find((file) => existsSync(file));
  const src = available.length ? `${base}-${available[available.length - 1]}.webp` : single ?? null;
  if (!src) return null;

  const web = (file) => `/assets/${relative(join(PORTAL, 'assets'), file).split('\\\\').join('/')}`;
  const [width, height] = dimensions(src);
  const srcset = available.length > 1
    ? ` srcset="${available.map((size) => `${web(`${base}-${size}.webp`)} ${size}w`).join(', ')}" sizes="(max-width: 720px) 100vw, 900px"`
    : '';

  return `<figure class="page-art" data-art="page-art-v1">
  <img src="${web(src)}"${srcset} width="${width}" height="${height}" alt="${esc(alt)}" loading="eager" decoding="async" fetchpriority="high">
  <figcaption>${esc(caption)}</figcaption>
</figure>`;
};

const insertBlock = (html, block) => {
  const wrapper = `${OPEN}\n${block}\n${CLOSE}`;
  if (html.includes(OPEN)) {
    return html.replace(new RegExp(`${OPEN}[\\s\\S]*?${CLOSE}`), wrapper);
  }
  /* Mjesto: nakon uvodnog odlomka ako postoji, inače odmah nakon naslova. */
  const h1 = html.match(/<\/h1>/i);
  if (!h1) return null;
  const after = html.slice(h1.index + h1[0].length);
  const lead = after.match(/^\s*(<p class="[^"]*lead[^"]*"[^>]*>[\s\S]*?<\/p>)/i);
  const anchor = lead ? h1.index + h1[0].length + after.indexOf(lead[1]) + lead[1].length : h1.index + h1[0].length;
  return `${html.slice(0, anchor)}\n\n${wrapper}${html.slice(anchor)}`;
};

const ensureCss = (html) => {
  if (html.includes(CSS_HREF)) return html;
  if (!html.includes('</head>')) return html;
  return html.replace('</head>', `<link rel="stylesheet" href="${CSS_HREF}">\n</head>`);
};

const alignOpenGraph = (html, imageUrl, alt) => {
  /* Mijenjamo samo ono što je još općenito: ako stranica već ima svoju
     društvenu karticu, njezin opis ostaje njezin. */
  if (!html.includes(`content="${SITE}${GENERIC_CARD}"`)) return html;
  const absolute = `${SITE}${imageUrl}`;
  let out = html.split(`content="${SITE}${GENERIC_CARD}"`).join(`content="${absolute}"`);
  out = out.replace(/(<meta property="og:image:alt" content=")[^"]*(">)/i, (m, a, b) => `${a}${esc(alt)}${b}`);
  out = out.replace(/(<meta name="twitter:image:alt" content=")[^"]*(>)/i, (m, a, b) => `${a}${esc(alt)}${b}`);
  return out;
};

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name === 'index.html') out.push(full);
  }
  return out;
};

const isPublic = (file) => {
  const rel = relative(PORTAL, file);
  const segments = rel.split('/');
  if (segments.some((s) => EXCLUDE_SEGMENTS.has(s))) return false;
  if (EXCLUDE_PREFIXES.some((p) => segments[segments.length - 2]?.startsWith(p))) return false;
  const html = readFileSync(file, 'utf8');
  if (/name="robots" content="[^"]*noindex/i.test(html)) return false;
  return true;
};

const routeOf = (file) => `/${relative(PORTAL, dirname(file)).split('\\\\').join('/')}/`.replace(/^\/\/$/, '/');

const curated = new Map(CURATED.map(([route, ...rest]) => [route, rest]));
const files = walk(PORTAL).filter(isPublic).sort();

let touched = 0;
const problems = [];

for (const file of files) {
  const route = routeOf(file);
  if (ONLY && route !== ONLY) continue;
  let html = readFileSync(file, 'utf8');
  const hasImage = /<img\b/i.test(html);
  const hadImage = hasImage;
  const hasBlock = html.includes(OPEN);
  if (hasImage && !hasBlock) continue;

  const entry = curated.get(route);
  const [art, alt, caption] = entry ?? [FALLBACK.art, FALLBACK.alt, FALLBACK.caption];
  const figure = buildFigure(art, alt, caption);
  if (!figure) { problems.push(`${route}: nema slike ${art}-{440,800,1200}.webp`); continue; }

  const next = insertBlock(html, figure);
  if (!next) { problems.push(`${route}: nema </h1> za umetanje`); continue; }

  let finalHtml = alignOpenGraph(ensureCss(next), figure.match(/src="([^"]+)"/)[1], alt);
  if (finalHtml === html && !hasBlock) { problems.push(`${route}: umetanje nije promijenilo datoteku`); continue; }
  if (!CHECK) writeFileSync(file, finalHtml);
  if (!hadImage) touched += 1;
}

/* Stranice iz karte koje nisu pronađene — karta mora ostati točna. */
for (const [route] of curated) {
  const file = join(PORTAL, route.slice(1), 'index.html');
  if (!existsSync(file)) problems.push(`karta: ${route} nema index.html`);
}

if (problems.length) {
  console.error(`page-art — ${problems.length} problema:`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(CHECK
  ? `page-art — provjera: ${touched} javnih stranica još nema sliku.`
  : `page-art — gotovo: ${touched} stranica dobilo je naslovnu sliku.`);
