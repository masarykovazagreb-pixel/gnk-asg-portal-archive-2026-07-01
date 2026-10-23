#!/usr/bin/env node
/**
 * AKTUAL MEDIA — atlas grafika.
 *
 * Zašto: svako izdanje ima vlastitu naslovnu grafiku, ali dosad su svjetska
 * izdanja imala samo generirane apstraktne plohe bez prepoznatljivog grada.
 * Ovaj skript iz jednog izvora (`assets/atlas/src/<slug>.webp`, 1600 px)
 * pravi sve veličine koje stranice traže — i to na jednom mjestu, pa se ne
 * dogodi da kartica ima 440 px, a hero 800 px i da se slika razmazuje.
 *
 * Pravila:
 *   • grafika je ILUSTRACIJA, ne fotografija — alt to mora reći;
 *   • u slici nema teksta (ime izdanja stoji u HTML-u, ne u rasteru), pa
 *     slika ostaje čitljiva i za čitače ekrana i za tražilice;
 *   • ista familija za sve: noćni grad u paleti izdanja, zlatna mreža meridijana;
 *   • veličine su fiksne i dokumentirane u manifestu, da ih CSS može rezervirati.
 *
 * Izlaz (apps/portal/assets/atlas/):
 *   <slug>-240.webp    240×160    mini traka izdanja
 *   <slug>-440.webp    440×248    kartice (/izdanja/, /mreza/, /kanal/)
 *   <slug>-480.webp    480×270    uske kolone
 *   <slug>-800.webp    800×450    srcset
 *   <slug>-880.webp    880×587    pločice s tekstom (tiles.mjs)
 *   <slug>-1200.webp  1200×675    naslovnica izdanja (/kanal/<grad>/)
 *   <slug>-1600.webp  1600×900    hero / naslovnica
 *   <slug>-og.jpg     1200×630    Open Graph / Twitter
 *
 * Pokretanje:
 *   node scripts/build-atlas-art-v1.mjs            # sve
 *   node scripts/build-atlas-art-v1.mjs --only tokio
 *   node scripts/build-atlas-art-v1.mjs --check    # samo provjeri manifest
 *
 * Zahtijeva ImageMagick 6 (`convert`) s WebP podrškom.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SRC = join(ROOT, 'assets', 'atlas', 'src');
const OUT = join(ROOT, 'apps', 'portal', 'assets', 'atlas');
const MANIFEST = join(ROOT, 'apps', 'portal', 'data', 'atlas-art-v1.json');

const arg = (name, fallback = '') => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] ?? fallback;
};
const ONLY = arg('--only', '');
const CHECK = process.argv.includes('--check');

/* Naslovi i opisi su dio ugovora: alt nikad nije prazan i nikad ne tvrdi da
   je slika fotografija. Ključ je slug datoteke. */
const META = {
  'aktual-media-atlas': {
    title: { hr: 'AKTUAL MEDIA — atlas mreže', en: 'AKTUAL MEDIA — network atlas' },
    alt: {
      hr: 'Ilustracija: noćni atlas svijeta sa zlatnim meridijanima, gradskim svjetlima i linijama koje se spajaju u jedno središte — mreža AKTUAL MEDIA.',
      en: 'Illustration: a night atlas of the world with gold meridians, city lights and lines converging into one centre — the AKTUAL MEDIA network.'
    },
    note: {
      hr: 'Generirana ilustracija, ne fotografija. Bez teksta u slici.',
      en: 'Generated illustration, not a photograph. No text inside the image.'
    }
  },
  washington: {
    title: { hr: 'Washington, D.C. — noćna silueta', en: 'Washington, D.C. — night skyline' },
    alt: {
      hr: 'Ilustracija: silueta Washingtona noću, kupola Kapitola, obelisk Washington Monuments i niski savezni blokovi, zlatna svjetla prozora i meridijani u plavoj izmaglici.',
      en: 'Illustration: the Washington, D.C. skyline at night, the Capitol dome, the Washington Monument obelisk and low federal blocks, gold window lights and meridians in blue haze.'
    },
    note: { hr: 'Generirana ilustracija prijestolnice, ne fotografija. Bez teksta u slici.', en: 'Generated illustration of the capital, not a photograph. No text inside the image.' }
  },
  brasilia: {
    title: { hr: 'Brasília — noćna os', en: 'Brasília — night axis' },
    alt: {
      hr: 'Ilustracija: silueta Brasílie noću, dva tornja Kongresa, kupola i zdjela, kruna katedrale i duga niska ministarstva, zlatna svjetla u zelenoj izmaglici.',
      en: 'Illustration: the Brasília skyline at night, the two Congress towers, the dome and the bowl, the cathedral crown and long low ministries, gold lights in green haze.'
    },
    note: { hr: 'Generirana ilustracija prijestolnice, ne fotografija. Bez teksta u slici.', en: 'Generated illustration of the capital, not a photograph. No text inside the image.' }
  },
  canberra: {
    title: { hr: 'Canberra — noćno jezero', en: 'Canberra — night lake' },
    alt: {
      hr: 'Ilustracija: silueta Canberre noću, zgrada parlamenta u brežuljku s visokim jarbolom, jezero s odsjajem i mostom, eukaliptusi uz obalu.',
      en: 'Illustration: the Canberra skyline at night, Parliament House set into a hill with a tall flag mast, a lake with reflection and a bridge, eucalyptus trees along the shore.'
    },
    note: { hr: 'Generirana ilustracija prijestolnice, ne fotografija. Bez teksta u slici.', en: 'Generated illustration of the capital, not a photograph. No text inside the image.' }
  },
  nairobi: {
    title: { hr: 'Nairobi — noćna silueta', en: 'Nairobi — night skyline' },
    alt: {
      hr: 'Ilustracija: silueta Nairobija noću, akacije i tornjevi, zlatna svjetla prozora i meridijani u pozadini.',
      en: 'Illustration: the Nairobi skyline at night, acacias and towers, gold window lights and meridians behind.'
    },
    note: { hr: 'Generirana ilustracija, ne fotografija.', en: 'Generated illustration, not a photograph.' }
  },
  jakarta: {
    title: { hr: 'Jakarta — noćna silueta', en: 'Jakarta — night skyline' },
    alt: {
      hr: 'Ilustracija: silueta Jakarte noću, gusti blokovi, antena i nadzemne ceste, zlatna svjetla u plavoj izmaglici.',
      en: 'Illustration: the Jakarta skyline at night, dense blocks, an antenna and elevated roads, gold lights in blue haze.'
    },
    note: { hr: 'Generirana ilustracija, ne fotografija.', en: 'Generated illustration, not a photograph.' }
  },
  newyork: {
    title: { hr: 'New York — noćna silueta', en: 'New York — night skyline' },
    alt: {
      hr: 'Ilustracija: silueta New Yorka noću, stepenasti neboderi i rešetka požarnih stuba, zlatna svjetla prozora.',
      en: 'Illustration: the New York skyline at night, stepped towers and fire-escape lattice, gold window lights.'
    },
    note: { hr: 'Generirana ilustracija, ne fotografija.', en: 'Generated illustration, not a photograph.' }
  },
  saopaulo: {
    title: { hr: 'São Paulo — noćna silueta', en: 'São Paulo — night skyline' },
    alt: {
      hr: 'Ilustracija: silueta São Paula noću, nepregledno more stambenih blokova i vodotornjeva, zlatna svjetla u zelenoj izmaglici.',
      en: 'Illustration: the São Paulo skyline at night, an endless sea of apartment blocks and water tanks, gold lights in green haze.'
    },
    note: { hr: 'Generirana ilustracija, ne fotografija.', en: 'Generated illustration, not a photograph.' }
  },
  sydney: {
    title: { hr: 'Sydney — noćna luka', en: 'Sydney — night harbour' },
    alt: {
      hr: 'Ilustracija: silueta sydneyske luke noću, luk mosta i jedra opere među obalnim blokovima, tirkizni odsjaj u vodi.',
      en: 'Illustration: the Sydney harbour at night, a bridge arch and opera sails among waterfront blocks, turquoise reflection in the water.'
    },
    note: { hr: 'Generirana ilustracija, ne fotografija.', en: 'Generated illustration, not a photograph.' }
  },
  singapur: {
    title: { hr: 'Singapur — noćna silueta', en: 'Singapore — night skyline' },
    alt: {
      hr: 'Ilustracija: silueta Singapura noću, tri tornja spojena dugom terasom, krošnje i kontejnerska luka, zlatna svjetla.',
      en: 'Illustration: the Singapore skyline at night, three towers joined by a long sky terrace, canopies and a container port, gold lights.'
    },
    note: { hr: 'Generirana ilustracija, ne fotografija.', en: 'Generated illustration, not a photograph.' }
  },
  kairo: {
    title: { hr: 'Kairo — noćna silueta', en: 'Cairo — night skyline' },
    alt: {
      hr: 'Ilustracija: silueta Kaira noću, minareti i kupole nad niskim blokovima, piramide na obzoru i zlatne zrake u nebu.',
      en: 'Illustration: the Cairo skyline at night, minarets and domes above low blocks, pyramids on the horizon and gold rays in the sky.'
    },
    note: { hr: 'Generirana ilustracija, ne fotografija.', en: 'Generated illustration, not a photograph.' }
  },
  tokio: {
    title: { hr: 'Tokio — noćna silueta', en: 'Tokyo — night skyline' },
    alt: {
      hr: 'Ilustracija: silueta Tokija noću, rešetkasti toranj, nadzemne željeznice i gusto tkivo tornjeva u ružičastoj izmaglici.',
      en: 'Illustration: the Tokyo skyline at night, a lattice tower, elevated rail curves and dense towers in pink haze.'
    },
    note: { hr: 'Generirana ilustracija, ne fotografija.', en: 'Generated illustration, not a photograph.' }
  },
  peking: {
    title: { hr: 'Peking — noćna silueta', en: 'Beijing — night skyline' },
    alt: {
      hr: 'Ilustracija: silueta Pekinga noću, strehe i velika vrata među dugim dvorištima i suvremenim blokovima u grimiznoj izmaglici.',
      en: 'Illustration: the Beijing skyline at night, tiered eaves and a great gate among long courtyards and modern blocks in crimson haze.'
    },
    note: { hr: 'Generirana ilustracija, ne fotografija.', en: 'Generated illustration, not a photograph.' }
  }
};

const SIZES = [
  ['240', 240, 160],
  ['440', 440, 248],
  ['480', 480, 270],
  ['800', 800, 450],
  ['880', 880, 587],
  ['1200', 1200, 675],
  ['1600', 1600, 900]
];

const dims = (file) => {
  const [w, h] = execFileSync('identify', ['-format', '%w %h', file], { encoding: 'utf8' }).trim().split(' ').map(Number);
  return { w, h };
};

const run = (args) => execFileSync('convert', args, { stdio: 'pipe' });

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const slugs = readdirSync(SRC)
  .filter((file) => file.endsWith('.webp'))
  .map((file) => basename(file, '.webp'))
  .filter((slug) => !ONLY || slug === ONLY)
  .sort();

if (!slugs.length) {
  console.error(`[atlas] nema izvora u assets/atlas/src/`);
  process.exit(1);
}

const manifest = {
  version: 'AKTUAL_MEDIA_ATLAS_ART_V1_20261023',
  generatedBy: 'scripts/build-atlas-art-v1.mjs',
  source: 'assets/atlas/src/<slug>.webp (1600 px)',
  kind: 'illustration',
  note: {
    hr: 'Naslovne grafike izdanja su generirane ilustracije, ne fotografije. U slici nema teksta; ime izdanja nosi HTML i alt atribut.',
    en: 'Edition cover art are generated illustrations, not photographs. No text is baked into the image; the edition name lives in HTML and alt text.'
  },
  sizes: Object.fromEntries(SIZES.map(([name, w, h]) => [name, { w, h }])),
  images: []
};

for (const slug of slugs) {
  const src = join(SRC, `${slug}.webp`);
  if (!existsSync(src)) {
    console.error(`[atlas] nema izvora za ${slug}`);
    process.exit(1);
  }
  const meta = META[slug];
  if (!meta) {
    console.error(`[atlas] ${slug}: nema alt teksta u META — alt nikad ne smije biti izmišljen ni prazan`);
    process.exit(1);
  }
  if (!CHECK) {
    for (const [name, w, h] of SIZES) {
      run([src, '-resize', `${w}x${h}^`, '-gravity', 'center', '-extent', `${w}x${h}`,
        '-quality', name === '240' ? '80' : '82', '-strip', join(OUT, `${slug}-${name}.webp`)]);
    }
    run([src, '-resize', '1200x630^', '-gravity', 'center', '-extent', '1200x630',
      '-quality', '86', '-strip', join(OUT, `${slug}-og.jpg`)]);
    console.log(`[atlas] ${slug} → 240/440/480/800/1600 + og.jpg`);
  }

  const full = join(OUT, `${slug}-1600.webp`);
  const card = join(OUT, `${slug}-440.webp`);
  for (const file of [full, card, join(OUT, `${slug}-og.jpg`)]) {
    if (!existsSync(file)) {
      console.error(`[atlas] nedostaje ${file} — pokreni bez --check`);
      process.exit(1);
    }
  }
  manifest.images.push({
    slug,
    title: meta.title,
    alt: meta.alt,
    note: meta.note,
    src: `/assets/atlas/${slug}-1600.webp`,
    card: `/assets/atlas/${slug}-440.webp`,
    og: `/assets/atlas/${slug}-og.jpg`,
    width: 1600,
    height: 900,
    bytes: statSync(full).size
  });
}

const payload = JSON.stringify(manifest, null, 2) + '\n';
if (CHECK) {
  const current = existsSync(MANIFEST) ? readFileSync(MANIFEST, 'utf8') : '';
  if (current !== payload) {
    console.error('[atlas] manifest nije osvježen — pokreni bez --check');
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, images: manifest.images.length, version: manifest.version }, null, 2));
} else {
  writeFileSync(MANIFEST, payload);
  console.log(`[atlas] gotovo · ${manifest.images.length} grafika · manifest ${MANIFEST.replace(ROOT + '/', '')}`);
}
