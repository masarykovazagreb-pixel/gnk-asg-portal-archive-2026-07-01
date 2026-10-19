#!/usr/bin/env node
/**
 * AKTUAL MEDIA — pločice s tekstom u slici.
 *
 * Za svako izdanje gradi naslovnu pločicu 880×587 na kojoj je već ispisan
 * naziv izdanja, zemlja i jezik, jedna rečenica što se klikom dobije te
 * poziv "Klik → otvara se izdanje". Tekst je dio slike (tako izgleda kao
 * naslovnica), a isti tekst stoji i u HTML-u i u alt atributu, pa je
 * čitljiv čitačima ekrana i tražilicama.
 *
 * Pokretanje:
 *   node apps/region/engine/tiles.mjs              # sve pločice
 *   node apps/region/engine/tiles.mjs --only rim
 *
 * Zahtijeva ImageMagick (`convert`) i DejaVu fontove.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHANNELS } from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const ROOT = join(APP, '..', '..');
const OUT = join(ROOT, 'apps', 'portal', 'assets', 'izdanja');

const W = 880;
const H = 587;

const arg = (name, fallback = '') => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] ?? fallback;
};
const ONLY = arg('--only', '');

/* Naslov na pločici, zemlja, jezik i rečenica "što klikom dobijete". */
const SPEC = {
  zagreb: { title: 'KANAL ZAGREB', sub: 'Hrvatska · hrvatski', line: 'Dnevni pregled domaćih medija i deset provjerljivih tekstova.' },
  beograd: { title: 'KANAL BEOGRAD', sub: 'Srbija · srpski', line: 'N1, Danas, Nova i Politika — osvrti s linkom na izvornik.' },
  sarajevo: { title: 'KANAL SARAJEVO', sub: 'Bosna i Hercegovina · bosanski', line: 'N1 BiH, Klix, Oslobođenje i Avaz — politika i sigurnost regije.' },
  budimpesta: { title: 'KANAL BUDAPEST', sub: 'Mađarska · mađarski', line: 'Telex, 444, HVG i Portfolio — proračun, inflacija, energetika.' },
  ljubljana: { title: 'KANAL LJUBLJANA', sub: 'Slovenija · slovenski', line: 'Delo, Večer, 24ur i Slovenske novice — gospodarstvo i politika.' },
  rim: { title: 'KANAL ROMA', sub: 'Italija · talijanski', line: 'ANSA, la Repubblica, Il Post i Il Sole 24 Ore — tržišta i EU.' },
  sofija: { title: 'KANAL SOFIJA', sub: 'Bugarska · bugarski', line: 'BTA, Capital, Mediapool i Dnevnik — energetika i fondovi.' },
  bukurest: { title: 'KANAL BUCUREȘTI', sub: 'Rumunjska · rumunjski', line: 'Agerpres, HotNews, Ziarul Financiar i Profit.ro — ekonomija.' },
};

const DESK = [
  { id: 'sport', title: 'SPORT', kicker: 'DESK · REZULTATI I OSVRTI', line: 'Sportske tekstove iz svih osam kanala na jednom mjestu.', cta: 'Klik → otvara se sportski desk' },
  { id: 'politika', title: 'POLITIKA', kicker: 'DESK · ODLUKE I IZBORI', line: 'Ista odluka u osam zemalja ne izgleda jednako.', cta: 'Klik → otvara se politički desk' },
  { id: 'sigurnost', title: 'SIGURNOST', kicker: 'DESK · KIBERNETIKA I PREUZIMANJA', line: 'Obavještajne teme, incidenti i spajanja tvrtki.', cta: 'Klik → otvara se sigurnosni desk' },
  { id: 'biznis', title: 'BUSINESS', kicker: 'DESK · TRŽIŠTA I BILANCE', line: 'Tržišta, bilance i kapital iz osam zemalja regije.', cta: 'Klik → otvara se business desk' },
  { id: 'tehnologija', title: 'TEHNOLOGIJA', kicker: 'DESK · AI I INFRASTRUKTURA', line: 'Umjetna inteligencija, platforme i podatkovni centri.', cta: 'Klik → otvara se tehnološki desk' },
  { id: 'moda', title: 'MODA', kicker: 'DESK · STIL I DIZAJN', line: 'Kolekcije, brendovi i poslovni modeli iza njih.', cta: 'Klik → otvara se modni desk' }
];

const run = (args) => execFileSync('convert', args, { stdio: 'pipe' });
const font = (bold, serif) => (serif ? (bold ? 'DejaVu-Serif-Bold' : 'DejaVu-Serif') : (bold ? 'DejaVu-Sans-Bold' : 'DejaVu-Sans'));

function wrap(text, max) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > max) { if (line) lines.push(line.trim()); line = word; }
    else line = `${line} ${word}`;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/* Gradijent: gornji dio slike ostaje čist, donji potamni da tekst bude čitljiv. */
function shade(base, out) {
  run([
    base, '-resize', `${W}x${H}^`, '-gravity', 'center', '-extent', `${W}x${H}`,
    '(', '-size', `${W}x${H}`, 'gradient:rgba(4,11,22,0)-rgba(4,11,22,0.95)', ')',
    '-compose', 'over', '-composite',
    '(', '-size', `${W}x${H}`, 'xc:rgba(4,11,22,0.28)', ')', '-compose', 'over', '-composite',
    out
  ]);
}

/* Tekstualna pločica bez fotografije (za deskove): tamna podloga i zlatne linije. */
function poster(out, kicker) {
  run([
    '-size', `${W}x${H}`, 'xc:#071322',
    '-fill', '#0b1d33', '-draw', `rectangle 0,0 ${W},${Math.round(H * 0.62)}`,
    '-fill', '#050d18', '-draw', `rectangle 0,${Math.round(H * 0.62)} ${W},${H}`,
    '-stroke', '#e9c66c', '-strokewidth', '1', '-fill', 'none',
    '-draw', `circle ${W - 120},120 ${W - 40},120`,
    '-draw', `line 0,${Math.round(H * 0.62)} ${W},${Math.round(H * 0.62)}`,
    '-draw', `line 44,${Math.round(H * 0.62) - 16} ${W - 300},${Math.round(H * 0.62) - 16}`,
    '-stroke', 'none',
    '-font', font(true, false), '-pointsize', '15', '-kerning', '4', '-fill', '#e9c66c',
    '-annotate', '+44+52', 'AKTUAL MEDIA',
    '-pointsize', '13', '-kerning', '3', '-fill', '#8fa3bd',
    '-annotate', '+44+78', kicker,
    '-blur', '0x0.4',
    out
  ]);
}

function bakeCity(id, spec, photo) {
  const tmp = join(OUT, `.tmp-${id}.png`);
  shade(photo, tmp);
  const lines = wrap(spec.line, 46);
  const ctaY = H - 32;
  const bodyLast = ctaY - 44;
  const bodyFirst = bodyLast - (lines.length - 1) * 26;
  const cityY = bodyFirst - 50;
  const brandY = cityY - 64;
  const ruleY = brandY - 42;
  run([
    tmp,
    '-font', font(true, false), '-pointsize', '13', '-kerning', '3', '-fill', '#c3d0e2',
    '-annotate', '+44+52', spec.sub.toUpperCase(),
    '-stroke', '#e9c66c', '-strokewidth', '2', '-fill', 'none',
    '-draw', `line 44,${ruleY} ${W - 44},${ruleY}`,
    '-stroke', 'none',
    '-font', font(true, false), '-pointsize', '19', '-kerning', '9', '-fill', '#e9c66c',
    '-annotate', `+44+${brandY}`, 'AKTUAL MEDIA',
    '-font', font(true, true), '-pointsize', '50', '-kerning', '0', '-fill', '#ffffff',
    '-annotate', `+44+${cityY}`, spec.title,
    '-font', font(false, false), '-pointsize', '19', '-kerning', '0', '-fill', '#dfe8f4',
    ...lines.map((l, i) => ['-annotate', `+44+${bodyFirst + i * 26}`, l]).flat(),
    '-font', font(true, false), '-pointsize', '15', '-kerning', '1', '-fill', '#e9c66c',
    '-annotate', `+44+${ctaY}`, 'KLIK → OTVARA SE IZDANJE',
    '-quality', '84', '-strip',
    join(OUT, `${id}-tile.webp`)
  ]);
  rmSync(tmp, { force: true });
}

function bakeDesk(desk) {
  const tmp = join(OUT, `.tmp-${desk.id}.png`);
  poster(tmp, desk.kicker);
  const lines = wrap(desk.line, 42);
  const ctaY = H - 34;
  const bodyLast = ctaY - 44;
  const bodyFirst = bodyLast - (lines.length - 1) * 27;
  const titleY = bodyFirst - 52;
  run([
    tmp,
    '-font', font(true, true), '-pointsize', '64', '-kerning', '0', '-fill', '#ffffff',
    '-annotate', `+44+${titleY}`, desk.title,
    '-font', font(false, false), '-pointsize', '20', '-fill', '#cfdaea',
    ...lines.map((l, i) => ['-annotate', `+44+${bodyFirst + i * 27}`, l]).flat(),
    '-font', font(true, false), '-pointsize', '15', '-kerning', '1', '-fill', '#e9c66c',
    '-annotate', `+44+${ctaY}`, desk.cta.toUpperCase(),
    '-quality', '86', '-strip',
    join(OUT, `${desk.id}-tile.webp`)
  ]);
  rmSync(tmp, { force: true });
}

function bakeFeature({ id, kicker, title, line, cta, photo, lead }) {
  const tmp = join(OUT, `.tmp-${id}.png`);
  shade(photo, tmp);
  const lines = wrap(line, 44);
  const ctaY = H - 32;
  const bodyLast = ctaY - 44;
  const bodyFirst = bodyLast - (lines.length - 1) * 27;
  const titleY = bodyFirst - 52;
  const ruleY = titleY - 56;
  run([
    tmp,
    '-font', font(true, false), '-pointsize', '15', '-kerning', '4', '-fill', '#e9c66c',
    '-annotate', '+44+56', 'AKTUAL MEDIA',
    '-pointsize', '13', '-kerning', '2', '-fill', '#c3d0e2',
    '-annotate', '+44+82', kicker.toUpperCase(),
    '-stroke', '#e9c66c', '-strokewidth', '2', '-fill', 'none',
    '-draw', `line 44,${ruleY} ${W - 44},${ruleY}`,
    '-stroke', 'none',
    '-font', font(true, true), '-pointsize', '48', '-kerning', '0', '-fill', '#ffffff',
    '-annotate', `+44+${titleY}`, title,
    '-font', font(false, false), '-pointsize', '19', '-fill', '#dfe8f4',
    ...lines.map((l, i) => ['-annotate', `+44+${bodyFirst + i * 27}`, l]).flat(),
    '-font', font(true, false), '-pointsize', '15', '-kerning', '1', '-fill', '#e9c66c',
    '-annotate', `+44+${ctaY}`, cta.toUpperCase(),
    ...(lead ? ['-fill', '#e9c66c', '-draw', `rectangle 0,0 ${W},6`] : []),
    '-quality', '84', '-strip',
    join(OUT, `${id}-tile.webp`)
  ]);
  rmSync(tmp, { force: true });
}

function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  for (const channel of CHANNELS) {
    if (ONLY && ONLY !== channel.id) continue;
    const spec = SPEC[channel.id];
    if (!spec) continue;
    const photo = join(OUT, `${channel.id}-880.webp`);
    if (!existsSync(photo)) { console.log(`::warning::nema fotografije za ${channel.id}`); continue; }
    bakeCity(channel.id, spec, photo);
    console.log(`[tile] ${channel.id}`);
  }

  if (!ONLY || ONLY === 'desks') {
    for (const desk of DESK) {
      bakeDesk(desk);
      console.log(`[tile] ${desk.id}`);
    }
  }

  const extras = [
    { id: 'galerija', kicker: 'Vizuali · vlastite stranice', title: 'GALERIJA', line: 'Portreti, događanja i tematski vizuali Nermina Sefića.', cta: 'Klik → otvara se galerija' },
    { id: 'radio', kicker: 'Radio · diskretni player', title: 'RADIO', line: 'Šest streamova i javne radijske kuće osam zemalja.', cta: 'Klik → otvara se radio' },
    { id: 'znanje', kicker: 'Centar znanja', title: 'ZNANJE', line: 'Odgovori o grupi, projektima, financijama i kontaktima.', cta: 'Klik → otvara se centar znanja' }
  ];
  for (const x of extras) {
    bakeDesk({ id: x.id, title: x.title, kicker: x.kicker, line: x.line, cta: x.cta });
    console.log(`[tile] ${x.id}`);
  }

  const features = [
    { id: 'tjednik', kicker: 'Tjednik · kritički osvrti', title: 'BUSINESS TJEDNIK', line: 'Lider, Jutarnji, Poslovni i Forbes kroz tjednu kritiku.', cta: 'Klik → otvara se tjednik', photo: 'tjednik-880.webp' },
    { id: 'aktual-media', kicker: 'Središnje mjesto', title: 'AKTUAL MEDIA', line: 'Sve što imamo: izdanja, deskovi, tjednik, galerija, radio.', cta: 'Klik → otvara se pregled', photo: 'aktual-media-880.webp', lead: true }
  ];
  for (const f of features) {
    const photo = join(OUT, f.photo);
    if (!existsSync(photo)) { console.log(`::warning::nema fotografije za ${f.id}`); continue; }
    bakeFeature({ ...f, photo });
    console.log(`[tile] ${f.id}`);
  }

  writeFileSync(join(OUT, 'tiles.json'), `${JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    note: 'Pločice s ugrađenim tekstom; isti tekst stoji u HTML-u i alt atributu.',
    tiles: [...Object.keys(SPEC).map((id) => `${id}-tile.webp`), ...DESK.map((d) => `${d.id}-tile.webp`), 'galerija-tile.webp', 'radio-tile.webp', 'znanje-tile.webp', 'tjednik-tile.webp', 'aktual-media-tile.webp']
  }, null, 2)}\n`);
  console.log(`[tiles] gotovo · ${OUT}`);
}

if (process.argv[1] && /tiles\.mjs$/.test(process.argv[1])) {
  try { main(); } catch (error) { console.error(error.message); process.exit(1); }
}
