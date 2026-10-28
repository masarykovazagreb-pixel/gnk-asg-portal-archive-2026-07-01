#!/usr/bin/env node
/**
 * MREŽA ENTITETA — `network-entity v1`.
 *
 * Dodaje svakoj javnoj stranici ono što tražilici treba da poveže imena:
 *
 *   1. entitetski graf (GNK ASG d.o.o., GNK DINAMO Ltd., AKTUAL MEDIA,
 *      Nermin Sefić kao glavni urednik) — vidi scripts/lib/entity-graph-v1.mjs;
 *   2. `<meta name="editor" content="Nermin Sefić">` i `<link rel="author">`;
 *   3. `article:tag` za tri stalne oznake, ako ih stranica još nema;
 *   4. vidljiv red oznaka s linkovima (#AKTUALMEDIA · #GNKASG · #NerminSefić).
 *
 * Skript je idempotentan: blokovi su omeđeni oznakama `entity:v1`, pa se pri
 * ponovnom pokretanju zamjenjuju, a ne umnožavaju. Pokreće se nakon svake
 * gradnje, pa i buduće stranice odmah nose isti graf — bez ručnog rada.
 *
 * Pokretanje:
 *   node scripts/apply-network-entity-v1.mjs             # primijeni
 *   node scripts/apply-network-entity-v1.mjs --check     # samo izvijesti
 *   node scripts/apply-network-entity-v1.mjs --only apps/tjednik
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entityGraphJson, HASHTAGS, PERSON, ORG_AKTUAL, ORG_ASG, ORG_DINAMO, EXPLAINER } from './lib/entity-graph-v1.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const PORTAL = join(ROOT, 'apps', 'portal');
const CHECK = process.argv.includes('--check');
const arg = (name, fallback = '') => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] ?? fallback;
};
const ONLY = arg('--only', '');

const MARK_GRAPH = '<!-- entity:v1 -->';
/* Graf prepoznajemo i kad ga je izgenerirala sama stranica (hub, mreža,
   kolumne) — inače bi applier dodao drugi graf uz postojeći, pa bi stranica
   nosila dva različita entitetska bloka. */
const hasGraph = (html) => has(html, '"nermin-sefic"') || /id="network-entity-v1"/.test(html);
const MARK_FOOT = '<!-- entity-foot:v1 -->';
const CLOSE = '<!-- /entity:v1 -->';
const EDITOR = 'Nermin Sefić';

/* Popis odobrenih stranica za autorski hashtag. Pravilo je starije od ove
   skripte i ne mijenja se: ime autora u oznaci stoji samo na stranicama koje
   su za to odobrene (kolumne, autorski tekstovi, analize). Na ostalim
   stranicama ostaju entitetski graf i `meta editor` — dovoljno za SEO, bez
   tvrdnje da je tekst njegov. */
function approvedRoutes() {
  const file = join(ROOT, 'apps', 'portal', 'data', 'approved_mentions.json');
  if (!existsSync(file)) return new Set();
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const norm = (value) => {
      try {
        const raw = String(value || '').trim();
        const pathname = /^https?:\/\//i.test(raw) ? new URL(raw).pathname : raw;
        return pathname.replace(/\/+$/, '') + '/';
      } catch { return ''; }
    };
    return new Set([...(data.approved_urls || []), ...(data.approved_items || [])]
      .map((entry) => norm(typeof entry === 'string' ? entry : entry?.url || entry?.route || ''))
      .filter(Boolean));
  } catch { return new Set(); }
}

/* Provjereno autorstvo iz uredničkog registra ima prednost pred starijim
   popisom odobrenih stranica: registar zna i autora i vrstu teksta, pa se
   autorski link ne stavlja na objavu koja nije njegova. */
function verifiedAuthorRoutes() {
  const file = join(ROOT, 'apps', 'portal', 'data', 'editorial-registry.json');
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const rows = Array.isArray(data) ? data : (data.items || data.entries || []);
    const set = new Set();
    for (const item of rows) {
      if (!item || item.author !== 'Nermin Sefić' || item.authorSchemaVerified !== true) continue;
      if (!['komentar', 'kolumna', 'analiza'].includes(item.type)) continue;
      const raw = String(item.path || item.route || item.url || '').trim();
      if (!raw) continue;
      const pathname = /^https?:\/\//i.test(raw) ? new URL(raw).pathname : raw;
      set.add(pathname.replace(/\/+$/, '') + '/');
    }
    return set;
  } catch { return null; }
}

const APPROVED = approvedRoutes();
const VERIFIED = verifiedAuthorRoutes();
const AUTHOR_HASHTAG = '#NerminSefić';
/* Autor-link (`rel=author`) traži potvrđeno autorstvo u registru.
   #NerminSefić traži i drugo odobrenje — popis odobrenih stranica.
   Presjek je jedini skup koji prolazi i audit cjelovitosti objava i audit
   AKTUAL MEDIA stranica; sam registar je preširok za hashtag. */
const normRoute = (route) => (route.endsWith('/') ? route : `${route}/`);
/* Arhiv vlastitih objava autora (HR/EN) je autorstvo po definiciji: stranica je popis njegovih tekstova. */
const AUTHOR_ARCHIVE = new Set(['/autorske-objave/', '/en/autorske-objave/']);
const isVerified = (route) => AUTHOR_ARCHIVE.has(normRoute(route)) || (VERIFIED ? VERIFIED.has(normRoute(route)) : APPROVED.has(normRoute(route)));
const isApproved = (route) => {
  const normalized = normRoute(route);
  if (!APPROVED.has(normalized)) return false;
  return VERIFIED ? VERIFIED.has(normalized) : true;
};

/* Stranice koje ne dobivaju blok: alati, administracija, API i datoteke
   koje nisu stranice. */
const SKIP_SEGMENTS = new Set(['admin', 'admin-center', 'tools', 'api', 'assets', 'node_modules', '.git', 'data', 'app']);
const SKIP_NAMES = /^(404|50\d)\.html$/;

const url = (route) => `https://gnk-asg.hr${route}`;

function entityBlocks({ full }) {
  const json = entityGraphJson({ compact: !full })
    .replace(/</g, '\\u003c');
  return `${MARK_GRAPH}
<script type="application/ld+json" id="network-entity-v1">${json}</script>
${CLOSE}`;
}

function footBlock(allowAuthorTag = true) {
  return `${MARK_FOOT}
<nav class="ne-tags" aria-label="Mreža AKTUAL MEDIA">
  <p class="ne-label">AKTUAL MEDIA · GNK ASG d.o.o. · urednik Nermin Sefić</p>
  <ul class="ne-list">
    <li><a href="${url('/gnk-aktual/')}">AKTUAL MEDIA</a></li>
    <li><a href="${url('/')}">GNK ASG</a></li>
    <li><a href="${url('/nermin-sefic/')}">Nermin Sefić</a></li>
    <li><a href="${url('/izdanja/')}">Izdanja</a></li>
    <li><a href="${url('/mreza/')}">Mreža</a></li>
    <li><a href="${EXPLAINER}">GNK ASG i GNK DINAMO Ltd.</a></li>
  </ul>
  <p class="ne-hash">${HASHTAGS.filter((tag) => allowAuthorTag || tag !== AUTHOR_HASHTAG).map((tag) => `<a href="${url('/nermin-sefic/')}">${tag}</a>`).join(' · ')}</p>
</nav>
<!-- /entity-foot:v1 -->`;
}

const CSS = `<style id="network-entity-css">
.ne-tags{margin:2.2rem auto 0;max-width:1180px;padding:1.1rem 1.25rem 1.4rem;border-top:1px solid rgba(128,128,128,.28);font:400 .82rem/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:inherit;opacity:.86}
.ne-tags .ne-label{margin:0 0 .5rem;letter-spacing:.12em;text-transform:uppercase;font-size:.68rem;font-weight:700;opacity:.75}
.ne-tags .ne-list{display:flex;flex-wrap:wrap;gap:.35rem 1rem;list-style:none;margin:0 0 .5rem;padding:0}
.ne-tags .ne-list a,.ne-tags .ne-hash a{color:inherit;text-decoration:none;border-bottom:1px solid currentColor}
.ne-tags a:hover{opacity:.75}
.ne-tags .ne-hash{margin:0;font-size:.78rem;letter-spacing:.02em;opacity:.8}
@media print{.ne-tags{display:none}}
</style>`;

const isPublic = (file) => {
  const segments = relative(ROOT, file).split('/');
  if (segments.some((s) => SKIP_SEGMENTS.has(s))) return false;
  if (SKIP_NAMES.test(segments[segments.length - 1])) return false;
  const html = readFileSync(file, 'utf8');
  if (!/<html[\s>]/i.test(html)) return false;
  if (/name="robots"[^>]*content="[^"]*noindex/i.test(html)) return false;
  return true;
};

const has = (html, needle) => html.includes(needle);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

/* Samo rukom pisane stranice portala. Generatori (sites, world, kanal, arhiva,
   dnevnik) sami ispisuju entitetski graf — da bi izlaz bio reproducibilan i da
   ponovna gradnja ne bi izgledala kao „zastario izlaz" u testu svježine. */
const APPS = ONLY ? [ONLY] : ['apps/portal'];

/* Stranice koje dobivaju puni opis entiteta — s njih tražilica uči tko je tko. */
const FULL = new Set([
  'apps/portal/index.html', 'apps/portal/en/index.html',
  'apps/portal/nermin-sefic/index.html', 'apps/portal/en/nermin-sefic/index.html',
  'apps/portal/gnk-aktual/index.html', 'apps/portal/en/gnk-aktual/index.html',
  'apps/portal/izdanja/index.html', 'apps/portal/mreza/index.html',
  'apps/portal/en/network/index.html'
]);

let changed = 0;
let added = 0;
const problems = [];
const files = APPS.flatMap((app) => {
  const dir = join(ROOT, app);
  return existsSync(dir) ? walk(dir) : [];
}).sort();

/* Sloj kao čista funkcija: ulaz HTML i datoteka, izlaz HTML (ili null ako
   stranica nema </head>). Generatori koji sami pišu stranice (npr. prijenos)
   pozivaju je da njihov izlaz bude isti kao izlaz sloja — inače provjera
   svježine vidi razliku koju nitko nije napravio. */
export function entityHtml(input, file) {
  const rel = relative(ROOT, file).split('\\').join('/');
  let html = input;
  const original = html;

  const full = FULL.has(rel);
  if (has(html, MARK_GRAPH)) {
    html = html.replace(new RegExp(`${MARK_GRAPH}[\\s\\S]*?${CLOSE}`), entityBlocks({ full }));
  } else if (!hasGraph(html)) {
    if (!has(html, '</head>')) { problems.push(`${rel}: nema </head>`); return null; }
    html = html.replace('</head>', `${entityBlocks({ full })}\n</head>`);
    added += 1;
  }

  /* Urednička uloga (meta editor) nije tvrdnja o autorstvu, pa stoji svugdje.
     Autor-link i autorska oznaka idu samo na odobrene stranice: urednik nije
     autor svakog teksta, a provjera cjelovitosti to strogo razlikuje. */
  const route = `/${relative(PORTAL, dirname(file)).split('\\').join('/')}/`;
  const allowAuthorTag = isApproved(route) || !file.startsWith(PORTAL);
  const allowAuthorLink = isVerified(route) || !file.startsWith(PORTAL);
  if (!/name="editor"/i.test(html)) {
    html = html.replace('</head>', `<meta name="editor" content="${EDITOR}">\n</head>`);
  }
  if (allowAuthorLink) {
    if (!/rel="author"/i.test(html)) {
      html = html.replace('</head>', `<link rel="author" href="${url('/nermin-sefic/')}">\n</head>`);
    }
  } else {
    /* Zaostatak ranijih prolaza: autor-link na tekstu koji nije njegov. */
    html = html.replace(/<link rel="author" href="[^"]*\/nermin-sefic\/"[^>]*>\n?/gi, '');
  }

  /* Stalne oznake u article:tag — bez njih hashtag postoji samo vizualno.
     Autorski hashtag samo na odobrenim stranicama; ostale nose #AKTUALMEDIA
     i #GNKASG, koji nisu tvrdnja o autorstvu. */
  for (const tag of HASHTAGS) {
    if (tag === AUTHOR_HASHTAG && !allowAuthorTag) continue;
    if (!has(html, `content="${tag}"`)) {
      html = html.replace('</head>', `<meta property="article:tag" content="${tag}">\n</head>`);
    }
  }
  if (!allowAuthorTag) {
    /* Ukloni ranije dodanu oznaku, da ponovno pokretanje ne ostavi zaostatak. */
    html = html.replace(/<meta property="article:tag" content="#NerminSefić">\n?/g, '');
  }

  /* Vidljivi red oznaka: samo ako stranica nema svoj blok s #AKTUALMEDIA. */
  if (has(html, MARK_FOOT)) {
    html = html.replace(new RegExp(`${MARK_FOOT}[\\s\\S]*?<!-- /entity-foot:v1 -->`), footBlock(allowAuthorTag));
  } else if (!has(html, '#AKTUALMEDIA') && has(html, '</body>')) {
    html = html.replace('</body>', `${footBlock(allowAuthorTag)}\n</body>`);
    if (!has(original, 'id="network-entity-css"')) html = html.replace('</head>', `${CSS}\n</head>`);
  }

  return html;
}

const RUN = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (RUN) {
for (const file of files) {
  if (!isPublic(file)) continue;
  const input = readFileSync(file, 'utf8');
  const html = entityHtml(input, file);
  if (html === null || html === input) continue;
  if (!CHECK) writeFileSync(file, html);
  changed += 1;
  if (CHECK && changed <= 5) console.log(`  · ${relative(ROOT, file)}`);
}

/* Provjera karte: stranice koje moraju nositi puni graf. */
for (const rel of FULL) {
  if (!existsSync(join(ROOT, rel))) problems.push(`puni graf: nema ${rel}`);
}

if (problems.length) {
  console.error(`network-entity — ${problems.length} problema:`);
  for (const p of problems.slice(0, 20)) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(CHECK
  ? `network-entity — provjera: ${changed} stranica treba dopunu (${added} bez entitetskog grafa).`
  : `network-entity — gotovo: ${changed} stranica dopunjeno (${added} dobilo graf).`);
}
