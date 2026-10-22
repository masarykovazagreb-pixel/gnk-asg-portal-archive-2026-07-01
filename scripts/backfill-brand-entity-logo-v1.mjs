#!/usr/bin/env node
/**
 * AKTUAL MEDIA — znak u čvoru izdavača.
 *
 * Zašto postoji: `NewsMediaOrganization` s @id-jem
 * https://gnk-asg.hr/gnk-aktual/#news-organization pojavljuje se na tisućama
 * stranica. Većina ga je dobila s ispravnim znakom, ali dvadesetak stranica
 * izgradilo se prije nego je znak postojao — pa na njima čvor nema `logo`,
 * ili nosi znak GNK ASG (druge organizacije).
 *
 * Što radi: prolazi kroz apps/portal, čita JSON-LD blokove i mijenja SAMO
 * čvor izdavača. Ako je znak već ispravan, stranica se ne dira (idempotentno).
 *
 * Pokretanje:
 *   node scripts/backfill-brand-entity-logo-v1.mjs           # upiši
 *   node scripts/backfill-brand-entity-logo-v1.mjs --check   # samo provjeri
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const SITE = 'https://gnk-asg.hr';
const BRAND_ID = `${SITE}/gnk-aktual/#news-organization`;
const CHECK = process.argv.includes('--check');

const logoFor = (lang) => ({
  '@type': 'ImageObject',
  '@id': `${SITE}/assets/brand/${lang === 'en' ? 'aktual-media-en' : 'aktual-media-hr'}.svg#logo`,
  url: `${SITE}/assets/brand/${lang === 'en' ? 'aktual-media-en' : 'aktual-media-hr'}.svg`,
  contentUrl: `${SITE}/assets/brand/${lang === 'en' ? 'aktual-media-en' : 'aktual-media-hr'}-1200.webp`,
  width: 1200,
  height: 345,
  caption: lang === 'en' ? 'AKTUAL MEDIA — world edition' : 'AKTUAL MEDIA — svjetsko izdanje',
  encodingFormat: 'image/svg+xml',
});

const isBrandLogo = (logo) => {
  const url = typeof logo === 'string' ? logo : String(logo?.url || logo?.contentUrl || '');
  return url.includes('/assets/brand/aktual-media-');
};

const LD = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

let scanned = 0;
let touched = 0;
const changed = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (name === 'index.html') visit(full);
  }
}

function visit(file) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('#news-organization')) return;
  scanned += 1;
  const rel = file.slice(PORTAL.length + 1);
  const lang = /^en[\\/]/.test(rel.replace(/\\/g, '/')) ? 'en' : 'hr';
  let out = '';
  let last = 0;
  let localTouched = false;

  LD.lastIndex = 0;
  for (let m = LD.exec(html); m; m = LD.exec(html)) {
    let data;
    try { data = JSON.parse(m[1]); } catch { continue; }
    const nodes = Array.isArray(data) ? data : (data['@graph'] || [data]);
    let hit = false;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      if (node['@id'] !== BRAND_ID) continue;
      const type = [].concat(node['@type'] || []);
      if (!type.includes('NewsMediaOrganization') && !type.includes('Organization')) continue;
      if (isBrandLogo(node.logo)) continue;
      node.logo = logoFor(lang);
      hit = true;
    }
    if (!hit) continue;
    out += html.slice(last, m.index) + `<script type="application/ld+json">${JSON.stringify(Array.isArray(data) ? data : data)}</script>`;
    last = m.index + m[0].length;
    localTouched = true;
  }

  if (!localTouched) return;
  out += html.slice(last);
  touched += 1;
  changed.push(rel);
  if (!CHECK) writeFileSync(file, out);
}

walk(PORTAL);

console.log(JSON.stringify({
  ok: true,
  version: 'GNK_ASG_BRAND_ENTITY_LOGO_BACKFILL_V1_20261022',
  mode: CHECK ? 'check' : 'write',
  scanned,
  touched,
  pages: CHECK ? changed : undefined,
}, null, 2));

if (CHECK && touched > 0) process.exitCode = 1;
