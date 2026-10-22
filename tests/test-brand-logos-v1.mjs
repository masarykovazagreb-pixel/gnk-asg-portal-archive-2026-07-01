#!/usr/bin/env node
/**
 * ZNAKOVI KUĆE — gate.
 *
 * Provjerava da su znakovi AKTUAL MEDIA stvarno na stranicama, a ne samo u
 * mapi s datotekama. Svaki znak mora imati: datoteku, galerijsku stranicu,
 * unos u sitemapu, opisni alt i poveznicu s matične stranice izdanja.
 *
 * Pad ovog testa znači jedno od dvoje: znak je izgrađen ali nigdje ne vodi,
 * ili stranica pokazuje znak koji ne postoji. Oboje je tiho kvaranje koje
 * čitatelj vidi kao prazan okvir.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const manifest = JSON.parse(readFileSync(join(PORTAL, 'data', 'aktual-logos-v1.json'), 'utf8'));
const channels = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;

const fails = [];
const read = (rel) => readFileSync(join(PORTAL, rel), 'utf8');
const has = (rel) => existsSync(join(PORTAL, rel));

/* ---------- 1. manifest i datoteke ---------- */

if (manifest.version !== 'GNK_ASG_AKTUAL_MEDIA_LOGOS_V1_20261022') fails.push(`neočekivana verzija ${manifest.version}`);
if (manifest.palette?.primary !== '#19233B') fails.push('primarna boja nije navy #19233B');
if (manifest.palette?.accent !== '#D9384D') fails.push('akcent nije crvena #D9384D');
if (manifest.logos.length !== 19) fails.push(`znakova ${manifest.logos.length}, očekivano 19`);

for (const logo of manifest.logos) {
  for (const key of ['svg', 'webp', 'og', 'square']) {
    const path = join(PORTAL, logo[key].replace(/^\//, ''));
    if (!existsSync(path)) fails.push(`${logo.slug}: nedostaje ${key} (${logo[key]})`);
  }
  if (!logo.title || !logo.tagline || !logo.kicker) fails.push(`${logo.slug}: nema naslov, slogan ili natpis`);
  if (!/^AKTUAL MEDIA/.test(logo.title)) fails.push(`${logo.slug}: naslov ne počinje imenom kuće`);
  if (!has(`galerija/znak-${logo.slug}/index.html`)) fails.push(`${logo.slug}: nema galerijske stranice`);
}

/* ---------- 2. galerijske stranice ---------- */

for (const logo of manifest.logos) {
  const path = `galerija/znak-${logo.slug}/index.html`;
  if (!has(path)) continue;
  const html = read(path);
  const keyword = (html.match(/<meta name="keywords" content="([^"]*)"/) || [, ''])[1];
  if (!keyword) fails.push(`${path}: nema meta keywords`);
  if (keyword.includes('#')) fails.push(`${path}: keywords sadrže #`);
  if (/Nermin\s+Sefi[cć]/i.test(keyword)) fails.push(`${path}: ime urednika u keywords`);
  if (!/property="article:tag" content="#AktualMedia"/.test(html)) fails.push(`${path}: nema #AktualMedia u article:tag`);
  if (!/<meta name="twitter:image" content="https:\/\/gnk-asg\.hr\/assets\/brand\//.test(html)) fails.push(`${path}: twitter:image ne pokazuje na znak`);
  if (!/og:image:alt/.test(html)) fails.push(`${path}: nema og:image:alt`);
  const jsonld = [...html.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const nodes = jsonld.flatMap((j) => j['@graph'] || [j]);
  const image = nodes.find((n) => n['@type'] === 'ImageObject');
  if (!image) fails.push(`${path}: nema ImageObject`);
  else {
    if (image.width !== 1200 || image.height !== 345) fails.push(`${path}: ImageObject nema točne dimenzije`);
    if (!image.creditText) fails.push(`${path}: ImageObject nema creditText`);
    if (!image.creator?.['@id']?.endsWith('#news-organization')) fails.push(`${path}: ImageObject nema AKTUAL MEDIA kao autora`);
  }
  const org = nodes.find((n) => n['@type'] === 'NewsMediaOrganization');
  if (!org) fails.push(`${path}: nema NewsMediaOrganization`);
  else if (!org.logo?.url) fails.push(`${path}: organizacija nema logo`);

  /* alt na samoj slici mora nositi ime, ne biti prazan */
  const img = html.match(/<img[^>]*class="[^"]*"[^>]*>/) || html.match(/<img[^>]*>/);
  if (!img) fails.push(`${path}: nema <img>`);
  else if (/alt=""/.test(img[0])) fails.push(`${path}: logo ima prazan alt`);
}

/* ---------- 3. sitemap ---------- */

const sitemap = read('galerija/sitemap.xml');
for (const logo of manifest.logos) {
  const loc = `https://gnk-asg.hr/galerija/znak-${logo.slug}/`;
  if (!sitemap.includes(`<loc>${loc}</loc>`)) fails.push(`sitemap: nema ${logo.slug}`);
  if (!sitemap.includes(`https://gnk-asg.hr${logo.webp}`)) fails.push(`sitemap: nema sliku za ${logo.slug}`);
}
for (const channel of channels) {
  if (!sitemap.includes(`https://gnk-asg.hr/galerija/izdanje-${channel.id}/`)) fails.push(`sitemap: nema naslovnicu ${channel.id}`);
}

/* ---------- 4. znakovi su stvarno na stranicama ---------- */

/* Druga vrijednost je slug DATOTEKE (bez prefiksa znak-), jer se u HTML-u
   provjerava stvarna putanja slike, a ne naziv galerijske rute. */
const mustHave = [
  ['galerija/index.html', 'aktual-media-hr'],
  ['izdanja/index.html', 'kanal-zagreb'],
  ['izdanja/moda/index.html', 'desk-moda'],
  ['gnk-aktual/index.html', 'aktual-media-hr'],
  ['en/gnk-aktual/index.html', 'aktual-media-en'],
  ['kanal/index.html', 'kanal-beograd'],
];
for (const [page, slug] of mustHave) {
  if (!has(page)) { fails.push(`${page}: nedostaje`); continue; }
  const html = read(page);
  if (!html.includes(`/assets/brand/${slug}`)) fails.push(`${page}: ne pokazuje znak ${slug}`);
  /* Vektorska inačica mora biti najavljena u <head> — inače tražilica i
     alati za dijeljenje ne znaju da SVG postoji. */
  if (!/rel="alternate" type="image\/svg\+xml" href="\/assets\/brand\/[a-z0-9-]+\.svg"/.test(html)) {
    fails.push(`${page}: nema <link rel=alternate type=image/svg+xml> na vlastiti znak`);
  }
}

/* Čvor izdavača na ključnim stranicama mora nositi vlastiti znak AKTUAL
   MEDIA — ne znak matičnog društva i ne nikakav drugi. */
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
  .filter(Boolean);
const entityLogo = (html) => {
  for (const data of ldBlocks(html)) {
    for (const node of (Array.isArray(data) ? data : (data['@graph'] || [data]))) {
      if (node && node['@id'] === 'https://gnk-asg.hr/gnk-aktual/#news-organization') return node.logo || null;
    }
  }
  return null;
};
for (const page of ['gnk-aktual/index.html', 'izdanja/index.html', 'izdanja/moda/index.html', 'kanal/index.html', 'kanal/zagreb/index.html', 'galerija/index.html']) {
  const logo = entityLogo(read(page));
  if (!logo) { fails.push(`${page}: čvor izdavača nema znak`); continue; }
  const url = typeof logo === 'string' ? logo : (logo.url || logo.contentUrl || '');
  if (!url.includes('/assets/brand/aktual-media-')) fails.push(`${page}: znak izdavača nije AKTUAL MEDIA (${url})`);
}

/* Naslovnica galerije nosi istu karticu kao SPT: slika lijevo, tamni panel
   desno, četiri činjenice u dva stupca, tri gumba, pilula i oznaka. */
{
  const html = read('galerija/index.html');
  for (const part of ['class="bf"', 'class="bf-media"', 'class="bf-body"', 'class="bf-kicker"', 'class="bf-spec"', 'class="bf-pill"', 'class="bf-live"']) {
    if (!html.includes(part)) fails.push(`galerija/index.html: kartica znakova nema ${part}`);
  }
  const buttons = (html.match(/class="bf-btn/g) || []).length;
  if (buttons !== 3) fails.push(`galerija/index.html: kartica ima ${buttons} gumba, očekivano 3`);
  const facts = (html.match(/<li>[^<]*<\/li>/g) || []).length;
  if (facts < 4) fails.push(`galerija/index.html: kartica ima ${facts} činjenica, očekivano 4`);
}

/* Stranice s jednim znakom moraju najaviti točno taj SVG. */
for (const [page, slug] of [['izdanja/moda/index.html', 'desk-moda'], ['gnk-aktual/index.html', 'aktual-media-hr'], ['en/gnk-aktual/index.html', 'aktual-media-en'], ['galerija/index.html', 'aktual-media-hr']]) {
  const html = read(page);
  if (!html.includes(`type="image/svg+xml" href="/assets/brand/${slug}.svg"`)) {
    fails.push(`${page}: SVG alternate ne pokazuje ${slug}.svg`);
  }
}

/* Gradska izdanja: svaki kanal mora imati svoj znak u zaglavlju. */
for (const channel of channels) {
  const page = `kanal/${channel.id}/index.html`;
  if (!has(page)) { fails.push(`${page}: nedostaje`); continue; }
  const html = read(page);
  if (!html.includes(`/assets/brand/kanal-${channel.id}-1200.webp`)) fails.push(`${page}: nema svoj znak`);
  if (!/class="ed-logo"/.test(html)) fails.push(`${page}: znak nije u zaglavlju`);
  if (!html.includes(`type="image/svg+xml" href="/assets/brand/kanal-${channel.id}.svg"`)) {
    fails.push(`${page}: nema SVG alternate za znak izdanja`);
  }
}

/* ---------- 5. ništa nije razvučeno ---------- */

for (const logo of manifest.logos) {
  const svg = readFileSync(join(PORTAL, logo.svg.replace(/^\//, '')), 'utf8');
  if (!svg.includes('viewBox="0 0 1200 345"')) fails.push(`${logo.slug}: SVG nema ispravan viewBox`);
  if (!/<title/.test(svg)) fails.push(`${logo.slug}: SVG nema <title>`);
  if (!/#F4F1E8/i.test(svg)) fails.push(`${logo.slug}: SVG nema krem podlogu`);
}

const report = {
  ok: fails.length === 0,
  version: 'GNK_ASG_BRAND_LOGOS_GATE_V1_20261022',
  logos: manifest.logos.length,
  channels: channels.length,
  failures: fails.slice(0, 40),
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) process.exit(1);
