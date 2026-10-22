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
