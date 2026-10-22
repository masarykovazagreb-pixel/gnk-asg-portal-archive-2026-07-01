/**
 * SEO sloj mreže — hashtagovi i ključne riječi po stranici.
 *
 * Pravilo: hashtagovi se ne izmišljaju po vijesti, nego se izvode iz onoga
 * što stranica stvarno jest — imena izdanja, rubrike (nav) i registriranih
 * tema izdanja. Zato je rezultat stabilan, ponovljiv i jednak na svakom
 * build-u: isti sadržaj uvijek daje isti skup oznaka.
 *
 * Ovdje nema vanjskih poziva ni slučajnosti. Sve što ova datoteka vrati
 * završava u meta oznakama, JSON-LD-u i vidljivim oznakama stranice.
 */

/** Javni IndexNow ključ matične domene; isti ključ vrijedi za svaku domenu mreže. */
export const INDEXNOW_KEY = '2396905717b36885586139576d11142f';

const HOME_LABELS = new Set([
  'pocetna', 'početna', 'naslovnica', 'home', 'homepage', 'start', 'index',
]);

const STOPWORDS = new Set([
  'i', 'u', 'na', 'za', 'od', 'do', 'se', 'je', 'su', 's', 'sa', 'iz', 'po',
  'koji', 'koja', 'koje', 'kako', 'sto', 'što', 'bez', 'uz', 'ili', 'ali',
  'the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'to', 'for', 'with',
  'how', 'what', 'why', 'when', 'from', 'under', 'every', 'all', 'its',
]);

const ACRONYMS = new Set(['nba', 'mma', 'ufc', 'usa', 'sad', 'eu', 'ai', 'hr', 'en', 'gnk', 'asg']);

/** Skini dijakritiku i sve što nije slovo/broj, da hashtag bude stabilan. */
export function fold(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim();
}

function word(value) {
  const lower = value.toLowerCase();
  if (ACRONYMS.has(lower)) return value.toUpperCase();
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * "Karta borbe" → "#KartaBorbe"; "Fight card" → "#FightCard";
 * "KOŠARKA 360" → "#Kosarka360"; "NBA sezona" → "#NBASezona".
 */
export function hashtagFrom(label, { maxWords = 3, maxLength = 32 } = {}) {
  const parts = fold(label).split(/\s+/).filter(Boolean);
  const picked = [];
  for (const part of parts) {
    if (!part) continue;
    if (picked.length && STOPWORDS.has(part.toLowerCase())) continue;
    if (picked.length >= maxWords) break;
    picked.push(part);
    if (picked.join('').length >= maxLength) break;
  }
  if (!picked.length) return '';
  let body = picked.map(word).join('');
  if (body.length > maxLength) body = body.slice(0, maxLength).replace(/[a-z0-9]$/i, '');
  return `#${body}`;
}

/** "#BorUSA" → "borusa" — sidro na stranici oznaka. */
export const tagSlug = (tag) => String(tag || '').replace(/^#/, '').toLowerCase();

const dedupe = (tags) => {
  const seen = new Set();
  const out = [];
  for (const tag of tags) {
    if (!tag || !/^#[A-Za-z0-9]+$/.test(tag)) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
};

/**
 * Oznake jedne stranice izdanja: registrirani hashtagovi izdanja, oznaka
 * imena izdanja i oznaka rubrike. Najviše osam, bez dvostrukih.
 */
export function pageHashtags(site, page, lang = 'hr') {
  const tags = [...(site.hashtags || [])];
  const edition = hashtagFrom(site.name);
  if (edition) tags.push(edition);
  const nav = page?.nav?.[lang] || page?.nav?.hr || '';
  if (!HOME_LABELS.has(fold(nav).toLowerCase().replace(/\s+/g, ''))) {
    const navTag = hashtagFrom(nav);
    if (navTag) tags.push(navTag);
  }
  return dedupe(tags).slice(0, 8);
}

/** Iste oznake, ali bez # — za meta keywords i JSON-LD keywords. */
export function keywordsFor(site, page, lang = 'hr') {
  const tags = pageHashtags(site, page, lang).map((tag) => tag.replace('#', ''));
  const nav = page?.nav?.[lang] || '';
  const words = [
    ...tags,
    ...(lang === 'hr' ? (site.topics || []) : []),
    site.name,
    nav,
    'AKTUAL MEDIA',
    'GNK ASG mreža',
    lang === 'en' ? 'independent edition' : 'neovisno izdanje',
  ].filter(Boolean);
  return [...new Set(words)].join(', ');
}

/** Oznake za deskove pod AKTUAL MEDIA (zajednički indeks i indeks izdanja). */
export function deskHashtags(sites, editionSlug = null) {
  const tags = ['#AktualMedia', '#MrezaIzdanja'];
  if (editionSlug) {
    const site = sites.find((item) => item.slug === editionSlug);
    if (site) tags.push(...(site.hashtags || []), hashtagFrom(site.name));
  } else {
    tags.push('#GNKASG');
    for (const site of sites) tags.push(hashtagFrom(site.name));
  }
  return dedupe(tags).slice(0, 10);
}
