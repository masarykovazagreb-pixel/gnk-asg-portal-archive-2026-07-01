#!/usr/bin/env node
/**
 * DRUŠTVENA KARTICA NA SVAKOJ JAVNOJ STRANICI.
 *
 * Gate `tests/test-social-cards-v1.mjs` traži pet stvari: og:image (https i
 * stvarna datoteka), og:image:alt, twitter:card, twitter:image i
 * twitter:image:alt. Generatori ih uglavnom pišu, ali ne uvijek isto —
 * osobito nakon vanjskih izmjena meta sloja. Ovaj skript dopunjuje samo ono
 * što nedostaje:
 *
 *   - alt se uzima iz `og:image:alt`, inače iz naslova stranice;
 *   - kad slike nema, koristi se kućna kartica /assets/gnk-asg-social-card.png;
 *   - `twitter:image` i `twitter:image:alt` slijede `og:` vrijednosti;
 *   - postojeći alt koji je prekratak zamjenjuje se (ne dodaje drugi), a
 *     dvostruke oznake se uklanjaju — zato drugi prolaz ne mijenja ništa.
 *
 *   node scripts/apply-social-card-meta-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const CHECK = process.argv.includes('--check');
const SITE = 'https://gnk-asg.hr';
const DEFAULT_IMAGE = `${SITE}/assets/gnk-asg-social-card.png`;
const BRAND = 'AKTUAL MEDIA';

const EXCLUDED = [
  'admin/', 'admin-center/', 'operator-dashboard/', 'webmail/', 'mail-studio/',
  'campaign-mailer/', 'media-registration-admin/', 'data/', 'assets/',
  '__preview/', 'worker-ops/', 'email-status/', 'api/'
];

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

/* Prag iz testa: nelatinična pisma nose više značenja po znaku. */
const altOk = (value) => {
  const text = clean(value);
  if (!text) return false;
  return text.length >= (/[\u2E80-\u9FFF\uAC00-\uD7AF\u0600-\u06FF]/u.test(text) ? 4 : 12);
};

const meta = (head, pattern) => {
  const match = head.match(pattern);
  return match ? clean(match[1]) : '';
};

/* Jedna oznaka po stranici: prva se popravlja ako ne valja, ostale se brišu. */
function ensureTag(head, { pattern, build, valid }) {
  const matches = [...head.matchAll(pattern)];
  let next = head;
  if (!matches.length) return `${head}${build()}`;
  const [first] = matches;
  if (!valid(first[1])) next = next.replace(first[0], build());
  for (let index = matches.length - 1; index >= 1; index -= 1) {
    next = next.replace(matches[index][0], '');
  }
  return next;
}

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

let pages = 0;
let skipped = 0;
let touched = 0;
const changed = [];

for (const file of walk(PORTAL)) {
  const rel = relative(PORTAL, file).split(/[\\/]/).join('/');
  if (EXCLUDED.some((prefix) => rel.startsWith(prefix))) { skipped += 1; continue; }

  const html = readFileSync(file, 'utf8');
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0 || /http-equiv=["']refresh["']/i.test(html)) { skipped += 1; continue; }

  const head = html.slice(0, headEnd);
  const robots = meta(head, /<meta name="robots" content="([^"]*)"/);
  if (robots && robots.includes('noindex')) { skipped += 1; continue; }

  pages += 1;
  const title = meta(head, /<meta property="og:title" content="([^"]*)"/)
    || meta(head, /<title>([\s\S]*?)<\/title>/)
    || BRAND;
  const ogImageRaw = meta(head, /<meta property="og:image" content="([^"]+)"/);
  const ogImage = ogImageRaw && /^https:\/\//i.test(ogImageRaw) ? ogImageRaw : DEFAULT_IMAGE;
  const ogAltRaw = meta(head, /<meta property="og:image:alt" content="([^"]*)"/);
  const ogAlt = altOk(ogAltRaw) ? ogAltRaw : `${ogAltRaw || title} · ${BRAND}`;
  const twitterImage = meta(head, /<meta name="twitter:image" content="([^"]+)"/);
  const twitterAlt = meta(head, /<meta name="twitter:image:alt" content="([^"]*)"/);

  let next = head;
  if (!ogImageRaw) {
    next = `${next}<meta property="og:image" content="${esc(ogImage)}">`;
  }
  next = ensureTag(next, {
    pattern: /<meta property="og:image:alt" content="([^"]*)">/g,
    build: () => `<meta property="og:image:alt" content="${esc(ogAlt)}">`,
    valid: altOk
  });
  next = ensureTag(next, {
    pattern: /<meta name="twitter:card" content="([^"]*)">/g,
    build: () => '<meta name="twitter:card" content="summary_large_image">',
    valid: (value) => Boolean(clean(value))
  });
  next = ensureTag(next, {
    pattern: /<meta name="twitter:image" content="([^"]*)">/g,
    build: () => `<meta name="twitter:image" content="${esc(twitterImage || ogImage)}">`,
    valid: (value) => /^https:\/\//i.test(clean(value))
  });
  next = ensureTag(next, {
    pattern: /<meta name="twitter:image:alt" content="([^"]*)">/g,
    build: () => `<meta name="twitter:image:alt" content="${esc(altOk(twitterAlt) ? twitterAlt : ogAlt)}">`,
    valid: altOk
  });

  if (next === head) continue;
  touched += 1;
  changed.push(rel);
  if (CHECK) continue;
  writeFileSync(file, `${next}\n${html.slice(headEnd)}`);
}

console.log(JSON.stringify({
  version: 'GNK_ASG_SOCIAL_CARD_META_V1_20261024',
  mode: CHECK ? 'check' : 'write',
  pages,
  skipped,
  touched,
  files: CHECK ? changed.slice(0, 20) : undefined
}, null, 2));

if (CHECK && touched) {
  console.error(`Društvena kartica nije potpuna na ${touched} stranica; pokreni bez --check.`);
  process.exitCode = 1;
}
