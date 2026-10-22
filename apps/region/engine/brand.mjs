/**
 * AKTUAL MEDIA — brend na stranicama.
 *
 * Jedno mjesto gdje se zna koji logo pripada kojoj stranici, kako se ispisuje
 * i što o njemu piše u strukturiranim podacima. Stranice ne sastavljaju <img>
 * same: ako se promijeni putanja ili omjer, mijenja se ovdje.
 *
 * Pravila koja modul čuva:
 *   • logo nosi alt s punim imenom izdanja — nikad alt="" (nije dekoracija,
 *     to je potpis izdavača);
 *   • svaki logo ima i tekstualni naziv uz sebe, pa stranica ostaje čitljiva
 *     i kad se slika ne učita;
 *   • logo uvijek vodi na matičnu stranicu izdanja (ili na /gnk-aktual/ za
 *     matični brend), s jasnim naslovom linka;
 *   • u JSON-LD logo ide kao ImageObject s url, width i height.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORTAL = join(HERE, '..', '..', 'portal');

let cache = null;

/** Manifest piše scripts/build-aktual-media-logos-v1.py. */
export function brandLogos() {
  if (cache) return cache;
  const file = join(PORTAL, 'data', 'aktual-logos-v1.json');
  cache = JSON.parse(readFileSync(file, 'utf8'));
  return cache;
}

export function logoFor(slug) {
  return brandLogos().logos.find((logo) => logo.slug === slug) || null;
}

/** Slug logotipa za gradski kanal: zagreb → kanal-zagreb. */
export const channelLogoSlug = (id) => `kanal-${id}`;

/** Slug logotipa za desk: moda → desk-moda. */
export const deskLogoSlug = (id) => `desk-${id}`;

/** Veličine: logo je 1200×345, pa visina u CSS-u daje i rezervirano mjesto. */
export const LOGO_W = 1200;
export const LOGO_H = 345;

/**
 * <img> za logo.
 * @param {string} slug  ključ iz manifesta
 * @param {object} opts  size (visina u px), cls, href, priority, eager
 */
export function logoImg(slug, { cls = 'brand-logo', size = 40, href = '', priority = false } = {}) {
  const logo = logoFor(slug);
  if (!logo) return '';
  const w = Math.round((size * LOGO_W) / LOGO_H);
  const loading = priority ? 'eager' : 'lazy';
  const fetch = priority ? ' fetchpriority="high"' : '';
  const img = `<img class="${cls}" src="${logo.webp}" srcset="${logo.webp} 1200w" `
    + `sizes="${w}px" width="${w}" height="${size}" alt="${escapeHtml(logo.title)}" `
    + `loading="${loading}" decoding="async"${fetch}>`;
  if (!href) return img;
  return `<a class="${cls}-link" href="${href}" aria-label="${escapeHtml(logo.title)} — otvori izdanje">${img}</a>`;
}

/** Logo kao ImageObject za JSON-LD. */
export function logoJsonLd(slug, { url = 'https://gnk-asg.hr' } = {}) {
  const logo = logoFor(slug);
  if (!logo) return null;
  return {
    '@type': 'ImageObject',
    '@id': `${url}/assets/brand/${slug}.svg#logo`,
    url: `${url}${logo.svg}`,
    contentUrl: `${url}${logo.webp}`,
    width: LOGO_W,
    height: LOGO_H,
    caption: logo.title,
    encodingFormat: 'image/svg+xml',
  };
}

/** Organisation node koji nosi logo — za izdanja pod AKTUAL MEDIA. */
export function editionOrganization(slug, { name, url, parentId = 'https://gnk-asg.hr/gnk-aktual/#news-organization', inLanguage = 'hr' } = {}) {
  const logo = logoFor(slug);
  return {
    '@type': 'NewsMediaOrganization',
    '@id': `${url}#organization`,
    name,
    url,
    inLanguage,
    logo: logo ? { '@type': 'ImageObject', url: `https://gnk-asg.hr${logo.webp}`, width: LOGO_W, height: LOGO_H, caption: logo.title } : undefined,
    parentOrganization: { '@id': parentId },
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
