#!/usr/bin/env node
/**
 * Registar objavljenih tekstova.
 *
 * Prolazi kroz sve objave, komentare i analize koje stvarno postoje na sajtu i
 * zapisuje ih na jedno mjesto s naslovom, opisom, ključnim riječima,
 * hashtagovima, slikom i datumom.
 *
 * Razlog: raspored objava pokriva samo tekstove koje je objavio raspoređivač.
 * Tekstovi objavljeni izvan njega nisu bili nigdje evidentirani, pa ih prijenos
 * na blog nikad ne bi pokupio.
 *
 *   node scripts/editorial-registry-v1.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

const PORTAL = 'apps/portal';
const PLAN_DIR = join(PORTAL, 'data/editorial-plan');
const OUT = join(PORTAL, 'data/editorial-registry.json');
const SITE = 'https://gnk-asg.hr';

const SECTIONS = {
  objave: { hr: 'Objave', route: '/objave/' },
  komentari: { hr: 'Komentari', route: '/komentari/' },
  analize: { hr: 'Analize', route: '/analize/' },
};
const BASE_TAGS = ['GNKASG', 'GNKDINAMOLtd', 'NerminSefic', 'BusinessIntelligence'];

const unescapeHtml = (s = '') => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/* slugovi koje raspoređivač poznaje */
const planned = new Set();
const plannedAt = {};
if (existsSync(PLAN_DIR)) {
  for (const f of readdirSync(PLAN_DIR)) {
    if (!/^\d{8}.*\.json$/.test(f)) continue;
    try {
      for (const it of JSON.parse(readFileSync(join(PLAN_DIR, f), 'utf8'))) {
        planned.add(it.slug);
        plannedAt[it.slug] = f.slice(0, 8);
      }
    } catch { /* preskoči neispravnu datoteku */ }
  }
}

const hashtagsFrom = (keywords) => [...new Set([
  ...BASE_TAGS,
  ...keywords.map((k) => k.replace(/[^\p{L}\p{N}]/gu, '')),
])].filter((t) => t.length > 2 && t.length < 30).slice(0, 12);

const items = [];
for (const [dir, meta] of Object.entries(SECTIONS)) {
  const base = join(PORTAL, dir);
  if (!existsSync(base)) continue;
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(base, entry.name, 'index.html');
    if (!existsSync(file)) continue;
    const html = readFileSync(file, 'utf8');

    const m = (name, attr = 'name') => {
      const r = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`));
      return r ? unescapeHtml(r[1]) : '';
    };

    const title = (m('og:title', 'property') || (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1])
      .split(' | ')[0].trim();
    const description = m('description');
    const keywords = m('keywords').split(',').map((k) => k.trim()).filter(Boolean);
    const image = m('og:image', 'property');

    let published = m('article:published_time', 'property');
    if (!published) {
      const ld = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
      if (ld) published = ld[1];
    }
    if (!published && plannedAt[entry.name]) {
      const d = plannedAt[entry.name];
      published = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T08:00:00+02:00`;
    }

    items.push({
      slug: entry.name,
      type: dir === 'objave' ? 'objava' : dir === 'komentari' ? 'komentar' : 'analiza',
      collection: meta.hr,
      path: `/${dir}/${entry.name}/`,
      url: `${SITE}/${dir}/${entry.name}/`,
      title,
      description,
      keywords,
      hashtags: hashtagsFrom(keywords),
      image: image || null,
      publishedAt: published || null,
      inPlan: planned.has(entry.name),
      seoComplete: Boolean(title && description && keywords.length && html.includes('rel="canonical"') && html.includes('application/ld+json')),
    });
  }
}

items.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));

const outsidePlan = items.filter((i) => !i.inPlan);
const incomplete = items.filter((i) => !i.seoComplete);

const registry = {
  version: 'GNK_ASG_EDITORIAL_REGISTRY_V1',
  generatedAt: new Date().toISOString(),
  site: SITE,
  total: items.length,
  byType: items.reduce((acc, i) => ((acc[i.type] = (acc[i.type] || 0) + 1), acc), {}),
  inPlan: items.length - outsidePlan.length,
  outsidePlan: outsidePlan.length,
  seoIncomplete: incomplete.length,
  note: 'Sadrzi SVE objavljene tekstove, i one izvan rasporeda objava. Prijenos na blog radi s ovog popisa.',
  items,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(registry, null, 2) + '\n', 'utf8');

console.log('zapisano:', OUT);
console.log('  ukupno tekstova: ', registry.total, JSON.stringify(registry.byType));
console.log('  u rasporedu:     ', registry.inPlan);
console.log('  izvan rasporeda: ', registry.outsidePlan);
console.log('  nepotpun SEO:    ', registry.seoIncomplete);
if (incomplete.length) {
  for (const i of incomplete.slice(0, 10)) console.log('     ', i.path);
  process.exitCode = 1;
}
