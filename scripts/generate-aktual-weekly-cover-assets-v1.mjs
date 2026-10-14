#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { writeCoverWebp } from './lib/editorial-cover-art-v1.mjs';

const PORTAL = 'apps/portal';
const CURATION_PATH = `${PORTAL}/data/aktual-weekly-curation.json`;
const OUT_DIR = `${PORTAL}/assets/editorial/generated`;
const MANIFEST_PATH = `${PORTAL}/data/aktual-weekly-image-manifest.json`;
const ART_VERSION = '2026-10-14-clean-cover-v2';
const SITE = 'https://gnk-asg.hr';
const FORCE = process.argv.includes('--force');
const digest = (value) => createHash('sha1').update(String(value)).digest('hex').slice(0, 12);
const categoryLabels = {
  'zene-stil': 'Žene i stil', moda: 'Moda', ljubimci: 'Ljubimci', auto: 'Auto',
  putovanja: 'Putovanja', sport: 'Sport', hrana: 'Hrana i uživanje',
  kultura: 'Kultura i scena', 'dobre-price': 'Lijepe priče',
};

if (!fs.existsSync(CURATION_PATH)) throw new Error(`Missing current weekly curation: ${CURATION_PATH}`);
const curation = JSON.parse(fs.readFileSync(CURATION_PATH, 'utf8'));
if (!Array.isArray(curation.items) || curation.items.length < 8) throw new Error('Weekly curation requires at least eight hand-selected, source-linked stories.');
const priorManifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : {};
const refreshArt = priorManifest.artVersion !== ART_VERSION;
let generated = 0;
let reused = 0;
const seen = new Set();
for (const item of curation.items) {
  if (!item.title || !item.url || !item.source || !item.section) throw new Error('Weekly story is missing title, source URL, source name or section.');
  if (seen.has(item.url)) throw new Error(`Duplicate source story in weekly issue: ${item.url}`);
  seen.add(item.url);
  const licensed = item.imagePermissionVerified === true && Boolean(item.imageLicense) && Boolean(item.imageCredit) && /^https?:\/\//i.test(item.sourceImageUrl || '');
  if (licensed) {
    item.image = item.sourceImageUrl;
    item.imagePolicy = 'licensed-source';
    item.imageAlt = item.imageAlt || `${item.title} — ${item.imageCredit}`;
    continue;
  }
  const id = digest(item.url);
  const relative = `/assets/editorial/generated/weekly-${id}.webp`;
  const output = path.join(OUT_DIR, `weekly-${id}.webp`);
  if (FORCE || refreshArt || !fs.existsSync(output)) {
    writeCoverWebp({
      title: item.title,
      kicker: `AKTUAL MEDIA · ${categoryLabels[item.section] || item.section}`,
      seed: `aktual-weekly|${item.url}|${item.title}`,
      type: item.section,
    }, output);
    generated++;
  } else reused++;
  item.image = relative;
  item.imageAlt = `Urednička ilustracija AKTUAL MEDIA za priču: ${item.title}`;
  item.imagePolicy = 'original-generated-illustration';
  item.imageCredit = 'AKTUAL MEDIA · lokalno generirana urednička ilustracija';
  item.imageRights = 'No external photograph is reproduced. The source publisher remains the destination for the full report and its original image.';
}
curation.image_policy = 'Use a source photograph only when a documented permission, license and credit are present; otherwise use the unique local thematic illustration.';
curation.editorial_intro ||= 'Od hrvatske baštine i putovanja do mode, sporta, hrane i kulture, ovo izdanje okuplja pažljivo odabrane priče iz više izvora. Redakcija priprema kratke sažetke, a cjeloviti izvještaji i izvorne fotografije ostaju kod njihovih izdavača.';
curation.editorial_note ||= 'Ovo nije rang-lista niti preporuka izvora. Svaka priča vodi na izvornog izdavača; ilustracije AKTUAL MEDIA jasno su označene kao ilustracije.';
curation.editorial_intro_en ||= 'From Croatian heritage and travel to fashion, sport, food and culture, this edition brings together carefully selected stories from a range of publishers. AKTUAL MEDIA provides concise editorial summaries; full reports and original photographs remain with their publishers.';
curation.editorial_note_en ||= 'This is an editorial selection, not a ranking or endorsement. Every story links to its original publisher; AKTUAL MEDIA illustrations are identified as illustrations.';
const weekStart = new Date(`${curation.issue_week}T00:00:00Z`);
if (Number.isNaN(weekStart.getTime()) || weekStart.getUTCDay() !== 1) throw new Error('issue_week must be a Monday ISO date; it is also the permanent archive key.');
const weekEnd = new Date(weekStart); weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
const hrStart = new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(weekStart);
const hrEnd = new Intl.DateTimeFormat('hr-HR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(weekEnd);
const enStart = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(weekStart);
const enEnd = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(weekEnd);
const coverAssets = [
  { language: 'hr', title: `Tjedan od ${hrStart} do ${hrEnd}`, kicker: 'AKTUAL MEDIA · TJEDNI', image: `/assets/editorial/generated/weekly-issue-${curation.issue_week}-hr.webp`, alt: `Naslovnica AKTUAL MEDIA TJEDNI za tjedan od ${hrStart} do ${hrEnd}` },
  { language: 'en', title: `Week of ${enStart}–${enEnd}`, kicker: 'AKTUAL MEDIA · WEEKLY', image: `/assets/editorial/generated/weekly-issue-${curation.issue_week}-en.webp`, alt: `AKTUAL MEDIA WEEKLY cover for the week of ${enStart}–${enEnd}` },
];
for (const cover of coverAssets) {
  const output = path.join(OUT_DIR, path.basename(cover.image));
  if (FORCE || refreshArt || !fs.existsSync(output)) {
    writeCoverWebp({ title: cover.title, kicker: cover.kicker, seed: `aktual-weekly-issue|${curation.issue_week}|${cover.language}`, type: 'weekly' }, output);
    generated++;
  } else reused++;
  curation[`cover_image_${cover.language}`] = cover.image;
  curation[`cover_alt_${cover.language}`] = cover.alt;
}
const manifest = {
  version: 'AKTUAL_WEEKLY_IMAGE_MANIFEST_V1',
  artVersion: ART_VERSION,
  issue_week: curation.issue_week,
  imagePolicy: curation.image_policy,
  items: [
    ...curation.items.map((item) => ({ url: item.url, title: item.title, image: item.image, alt: item.imageAlt, policy: item.imagePolicy, credit: item.imageCredit || item.source, license: item.imageLicense || null })),
    ...coverAssets.map(({ language, image, alt }) => ({ url: null, language, image, alt, policy: 'original-generated-illustration', credit: 'AKTUAL MEDIA', license: 'GNK ASG original conceptual artwork' })),
  ],
};
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(CURATION_PATH, JSON.stringify(curation, null, 2) + '\n');
console.log(JSON.stringify({ version: manifest.version, issue_week: curation.issue_week, stories: curation.items.length, generated, reused, licensedSourceImages: curation.items.filter((item) => item.imagePolicy === 'licensed-source').length, policy: curation.image_policy }, null, 2));
