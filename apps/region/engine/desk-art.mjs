/**
 * Grafičke plohe za deskove /izdanja/*.
 *
 * Zašto postoji: minijatura u popisu osvrta prikazivala se samo kad je izvor
 * u feedu dao sliku, a sliku ima oko 23 % zapisa. Ostale ćelije bile su
 * prazne, pa je stranica izgledala kao da se slike nisu učitala.
 *
 * Pravila:
 *   • stvarna slika izvora uvijek ima prednost;
 *   • kad slike nema, prikazuje se apstraktna ploha u paleti svog deska —
 *     bez teksta, bez ljudi, bez lažne scene, dakle ništa što bi se moglo
 *     pročitati kao fotografija događaja;
 *   • ploha je ista za isti zapis na svakom build-u (varijanta se računa iz
 *     sluga), pa nema treperenja ni praznih okvira pri ponovnom posjetu;
 *   • plohe se pišu kao SVG u /assets/desk/, ne kao vanjski zahtjev.
 */
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { artSvg } from '../../sites/lib/kit.mjs';

/** Paleta po desku — ista obitelj boja kao kartica deska na /izdanja/. */
export const DESK_PALETTE = {
  sport: { accent: '#e0bd69', accent2: '#4f9de0', bg: '#061019' },
  politika: { accent: '#d9c27a', accent2: '#7d8ec9', bg: '#070f1c' },
  biznis: { accent: '#e3c887', accent2: '#59a887', bg: '#04110f' },
  tehnologija: { accent: '#8fd0ff', accent2: '#b07bff', bg: '#050b18' },
  putovanja: { accent: '#f0c98a', accent2: '#63c2c9', bg: '#05121a' },
  ljubimci: { accent: '#e8c56a', accent2: '#9ad06b', bg: '#08130d' },
  svijet: { accent: '#cbd6e6', accent2: '#6f8fbf', bg: '#050a14' },
  moda: { accent: '#e9c9a8', accent2: '#c98fb0', bg: '#0a0a12' },
  sigurnost: { accent: '#e0bd69', accent2: '#e0705f', bg: '#0b0a10' },
};

const FALLBACK = { accent: '#e0bd69', accent2: '#4f9de0', bg: '#061019' };
const VARIANTS = 6;
const W = 172;
const H = 116;

/**
 * Naslovne ilustracije deskova (scripts/build-desk-art-v1.mjs).
 *
 * Alt opisuje ono što se na slici vidi — nikad ne tvrdi da je riječ o
 * fotografiji događaja. Isti tekst koristi se na kartici, u heroju i u
 * Open Graph slici, pa se opisi ne mogu razići između stranica.
 */
export const DESK_ART = {
  sport: {
    title: { hr: 'Sport — noćni stadion', en: 'Sport — night stadium' },
    alt: {
      hr: 'Ilustracija: nogometni stadion noću pod reflektorima, prazne tribine, lopta na sredini terena.',
      en: 'Illustration: a football stadium at night under floodlights, empty stands, the ball on the centre spot.'
    }
  },
  politika: {
    title: { hr: 'Politika — saborska dvorana', en: 'Politics — the chamber' },
    alt: {
      hr: 'Ilustracija: prazna saborska dvorana noću, govornica u snopu svjetla, mikrofoni u prvom planu.',
      en: 'Illustration: an empty parliamentary chamber at night, a lectern in a shaft of light, microphones in the foreground.'
    }
  },
  biznis: {
    title: { hr: 'Business — ured prije zore', en: 'Business — before dawn' },
    alt: {
      hr: 'Ilustracija: ured na visokom katu prije zore, knjiga i olovka na stolu, grad i burzovni grafikoni kroz staklo.',
      en: 'Illustration: a high-floor office before dawn, a ledger and pen on the desk, the city and market charts through glass.'
    }
  },
  tehnologija: {
    title: { hr: 'Tehnologija — niti podataka', en: 'Technology — threads of data' },
    alt: {
      hr: 'Ilustracija: tamna server sala, zlatne niti podataka i prozirna mrežasta figura u središtu.',
      en: 'Illustration: a dark server hall, golden threads of data and a translucent lattice figure at the centre.'
    }
  },
  putovanja: {
    title: { hr: 'Putovanja — obalni grad', en: 'Travel — the coastal town' },
    alt: {
      hr: 'Ilustracija: obalni grad noću, lučka svjetla na rivi i barka na mirnoj vodi pod planinama.',
      en: 'Illustration: a coastal town at night, harbour lights along the promenade and a boat on calm water beneath mountains.'
    }
  },
  ljubimci: {
    title: { hr: 'Ljubimci — soba navečer', en: 'Pets — evening room' },
    alt: {
      hr: 'Ilustracija: dnevna soba navečer, pas spava u fotelji, mačka na prozorskoj dasci, topla svjetiljka.',
      en: 'Illustration: a living room in the evening, a dog asleep in an armchair, a cat on the windowsill, a warm lamp.'
    }
  },
  svijet: {
    title: { hr: 'Svijet — globus u redakciji', en: 'World — the newsroom globe' },
    alt: {
      hr: 'Ilustracija: globus na radnom stolu noćne redakcije, zlatne rute preko oceana, naslovi u fokusu.',
      en: 'Illustration: a globe on a night newsroom desk, golden routes across the oceans, headlines out of focus.'
    }
  },
  moda: {
    title: { hr: 'Moda — atelje noću', en: 'Fashion — the atelier' },
    alt: {
      hr: 'Ilustracija: atelje noću, lutka s drapiranom svilom, konci i škare na tamnom stolu pod svjetlom.',
      en: 'Illustration: an atelier at night, a dress form draped in silk, threads and scissors on a dark table under light.'
    }
  },
  sigurnost: {
    title: { hr: 'Sigurnost — noćna soba', en: 'Security — the night room' },
    alt: {
      hr: 'Ilustracija: noćna soba u staroj zgradi, papirnata karta, radio i lampa na drvenom stolu, kroz gotičke prozore nazire se grad.',
      en: 'Illustration: a night room in an old building, a paper map, a radio and a lamp on a wooden table, the city faintly visible through gothic windows.'
    }
  }
};

/** Metapodaci ilustracije; null ako desk još nema svoju sliku. */
export function deskArt(id) {
  return DESK_ART[id] || null;
}

/** Putanja izvedenice: `art: '1200'` → /assets/desk/art/<id>-1200.webp. */
export function deskArtPath(id, size = '1200', ext = 'webp') {
  return `/assets/desk/art/${id}-${size}.${ext}`;
}

/** srcset za <img>/<source> — samo veličine koje skripta stvarno piše. */
export function deskArtSrcset(id, sizes = ['440', '640', '800', '1200', '1600']) {
  return sizes.map((size) => `${deskArtPath(id, size)} ${size}w`).join(', ');
}

/** Stabilan izbor varijante iz sluga — isti zapis, ista ploha. */
export function variantFor(slug) {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % VARIANTS;
}

export function tilePath(deskId, variant) {
  return `/assets/desk/${deskId}-${(variant % VARIANTS) + 1}.svg`;
}

/**
 * Zapiše plohe za sve deskove. Vraća mapu desk → putanja prve varijante
 * (koristi se za naslovnicu i JSON-LD), a plohe su spremne prije HTML-a.
 */
export function ensureDeskTiles(portalRoot, deskIds) {
  const dir = join(portalRoot, 'assets', 'desk');
  mkdirSync(dir, { recursive: true });

  const map = {};
  for (const id of deskIds) {
    const palette = DESK_PALETTE[id] || FALLBACK;
    for (let variant = 0; variant < VARIANTS; variant += 1) {
      const svg = artSvg({ seed: `${id}-desk`, ...palette, variant, w: W, h: H });
      writeFileSync(join(dir, `${id}-${variant + 1}.svg`), svg);
    }
    map[id] = tilePath(id, 0);
  }

  const stale = readdirSync(dir).filter((name) => {
    if (!name.endsWith('.svg')) return false;
    const id = name.replace(/-\d+\.svg$/, '');
    return !deskIds.includes(id);
  });
  for (const name of stale) unlinkSync(join(dir, name));

  return map;
}
