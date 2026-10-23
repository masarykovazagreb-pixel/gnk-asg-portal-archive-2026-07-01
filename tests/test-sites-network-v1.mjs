#!/usr/bin/env node
/**
 * MREŽA — gate za šest neovisnih stranica i hub.
 *
 * Provjerava tri stvari koje se lako pokvare i teško primijete:
 *
 *   1. IZLAZ JE SVJEŽ. Build se pokreće u privremeni direktorij i uspoređuje
 *      s onim što je u repozitoriju. Ako se razlikuje, netko je mijenjao
 *      generator, a zaboravio build — ili obratno.
 *   2. SEO UGOVOR JE POTPUN. Svaka stranica ima title, description, canonical,
 *      hreflang hr/en/x-default, OG (uključujući image:alt), Twitter karticu,
 *      JSON-LD koji se parsira, i barem šest poveznica.
 *   3. MREŽA JE POVEZANA. Svaki interni link vodi na datoteku koja postoji,
 *      svaka slika je lokalna, hub postoji na oba jezika, a data/mreza-v1.json
 *      navodi svih šest stranica.
 *
 * Gate ne pristupa mreži. Ako nešto pada, popravlja se generator — ne test.
 */
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { SITES, siteBase, pagePath, NETWORK_HUB_HR, NETWORK_HUB_EN } from '../apps/sites/lib/registry.mjs';
import { SATELLITE_ART } from '../apps/sites/lib/satellite-art.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'apps', 'sites', 'site');
const PORTAL = join(ROOT, 'apps', 'portal');
const NO_FRESH = process.argv.includes('--no-fresh');
const fails = [];
const note = (message) => fails.push(message);
const DESK_HR = 'https://gnk-asg.hr/gnk-aktual/mreza/';
const DESK_EN = 'https://gnk-asg.hr/en/gnk-aktual/network/';

const walk = (dir, base = dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, base, out);
    else out.push(relative(base, full));
  }
  return out;
};

/* ---------- 1. svježina izlaza ---------- */
const tmp = mkdtempSync(join(tmpdir(), 'gnk-sites-'));
if (!NO_FRESH) {
const built = spawnSync(process.execPath, [join(ROOT, 'apps', 'sites', 'build.mjs')], {
  cwd: ROOT, encoding: 'utf8', env: { ...process.env, SITES_OUT: tmp, NO_COLOR: '1' },
});
if (built.status !== 0) note(`build nije prošao: ${(built.stderr || built.stdout || '').slice(0, 600)}`);

if (existsSync(SITE)) {
  for (const site of SITES) {
    const fresh = join(tmp, site.slug);
    const committed = join(SITE, site.slug);
    const freshFiles = existsSync(fresh) ? walk(fresh).sort() : [];
    const committedFiles = existsSync(committed) ? walk(committed).sort() : [];
    if (!committedFiles.length) { note(`${site.slug}: nema izgrađenih datoteka`); continue; }
    if (freshFiles.join('\n') !== committedFiles.join('\n')) {
      const missing = freshFiles.filter((f) => !committedFiles.includes(f));
      const extra = committedFiles.filter((f) => !freshFiles.includes(f));
      note(`${site.slug}: popis datoteka se razlikuje (nedostaje ${missing.length}, višak ${extra.length})`);
    }
    for (const file of freshFiles) {
      if (!committedFiles.includes(file)) continue;
      const a = readFileSync(join(fresh, file));
      const b = readFileSync(join(committed, file));
      if (!a.equals(b)) note(`${site.slug}/${file}: zastario izlaz — pokreni node apps/sites/build.mjs`);
    }
  }
} else {
  note('apps/sites/site ne postoji — pokreni node apps/sites/build.mjs');
}
}
rmSync(tmp, { recursive: true, force: true });

/* ---------- 2. SEO ugovor po stranici ---------- */
const attr = (html, re) => (html.match(re) || [])[1] || '';
const count = (html, re) => (html.match(re) || []).length;

function checkHtml(file, site, lang, slug) {
  const html = readFileSync(file, 'utf8');
  const where = `${site.slug}/${relative(join(SITE, site.slug), file)}`;
  const canonical = `${siteBase(site)}${pagePath(slug, lang)}`;
  const alternate = `${siteBase(site)}${pagePath(slug, lang === 'en' ? 'hr' : 'en')}`;

  const title = attr(html, /<title>([^<]+)<\/title>/);
  if (title.length < 15 || title.length > 90) note(`${where}: title ima ${title.length} znakova`);
  const description = attr(html, /<meta name="description" content="([^"]*)">/);
  if (description.length < 80 || description.length > 320) note(`${where}: description ima ${description.length} znakova`);
  if (attr(html, /<link rel="canonical" href="([^"]+)">/) !== canonical) note(`${where}: canonical nije ${canonical}`);
  for (const value of ['hr', 'en', 'x-default']) {
    if (!html.includes(`hreflang="${value}"`)) note(`${where}: nedostaje hreflang ${value}`);
  }
  if (attr(html, /hreflang="en" href="([^"]+)"/) !== alternate && lang === 'hr') note(`${where}: hreflang en ne vodi na ${alternate}`);
  if (!/name="robots" content="index,follow/.test(html)) note(`${where}: nema robots index,follow`);
  if (!/name="editor" content="Nermin Sefić"/.test(html)) note(`${where}: nema editor Nermin Sefić`);
  if (!/name="author" content="AKTUAL MEDIA d.o.o."/.test(html)) note(`${where}: nema author AKTUAL MEDIA`);
  const keywords = attr(html, /<meta name="keywords" content="([^"]*)">/);
  if (keywords.length < 20) note(`${where}: keywords prekratki`);
  if (/Nermin Sefić/.test(keywords)) note(`${where}: ime urednika ne smije biti u meta keywords`);
  const hashtags = attr(html, /<meta name="hashtags" content="([^"]*)">/).split(/\s+/).filter(Boolean);
  if (hashtags.length < 3) note(`${where}: samo ${hashtags.length} hashtagova`);
  if (hashtags.some((tag) => !/^#[A-Za-z0-9]+$/.test(tag))) note(`${where}: neispravan hashtag`);
  if (!hashtags.some((tag) => /aktualmedia/i.test(tag))) note(`${where}: hashtagovi ne nose #AktualMedia`);
  if (slug !== '') {
    const articleTags = [...html.matchAll(/<meta property="article:tag" content="([^"]+)"/g)].map((match) => match[1]);
    if (articleTags.length < 3) note(`${where}: article:tag ${articleTags.length}/3`);
    if (!/property="article:section" content="[^"]+"/.test(html)) note(`${where}: nema article:section`);
    if (!/property="article:published_time" content="[^"]+"/.test(html)) note(`${where}: nema article:published_time`);
  }
  for (const [label, re] of [
    ['og:title', /property="og:title" content="[^"]+"/], ['og:description', /property="og:description" content="[^"]+"/],
    ['og:url', /property="og:url" content="[^"]+"/], ['og:image', /property="og:image" content="[^"]+"/],
    ['og:image:alt', /property="og:image:alt" content="[^"]+"/], ['og:image:type', /property="og:image:type" content="image\/png"/],
    ['og:image:width', /property="og:image:width" content="1200"/], ['og:image:height', /property="og:image:height" content="630"/],
    ['twitter:card', /name="twitter:card" content="summary_large_image"/], ['twitter:title', /name="twitter:title" content="[^"]+"/],
    ['twitter:description', /name="twitter:description" content="[^"]+"/], ['twitter:image', /name="twitter:image" content="[^"]+"/],
  ]) if (!re.test(html)) note(`${where}: nedostaje ${label}`);

  const ld = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
  if (!ld) note(`${where}: nema JSON-LD`);
  else {
    try {
      const data = JSON.parse(ld);
      const types = (data['@graph'] || []).map((node) => node['@type']);
      for (const type of ['WebSite', 'Organization', 'Person', 'BreadcrumbList']) {
        if (!types.includes(type)) note(`${where}: JSON-LD bez ${type}`);
      }
      if (!types.includes('CollectionPage') && !types.includes('Article')) note(`${where}: JSON-LD bez CollectionPage/Article`);
      const person = (data['@graph'] || []).find((node) => node['@type'] === 'Person');
      if (person?.name !== 'Nermin Sefić') note(`${where}: JSON-LD Person nije Nermin Sefić`);
    } catch (error) { note(`${where}: JSON-LD se ne parsira (${error.message})`); }
  }

  if (count(html, /<h1[\s>]/g) !== 1) note(`${where}: mora imati točno jedan h1`);
  const links = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
  if (links.length < 6) note(`${where}: samo ${links.length} poveznica (minimum 6)`);
  if (!links.some((href) => href.includes('gnk-asg.hr'))) note(`${where}: nema poveznice na gnk-asg.hr`);
  if (!links.some((href) => href === NETWORK_HUB_HR || href === NETWORK_HUB_EN)) note(`${where}: nema poveznice na mrežni hub`);
  const deskLink = lang === 'en' ? DESK_EN : DESK_HR;
  if (!links.some((href) => href === deskLink)) note(`${where}: nema poveznice na AKTUAL MEDIA indeks`);
  if (!links.some((href) => href.startsWith('https://gnk-asg.hr/gnk-aktual/'))) note(`${where}: nema poveznice na AKTUAL MEDIA`);
  if (!/Izdanje AKTUAL MEDIA|An AKTUAL MEDIA edition/.test(html)) note(`${where}: nema vidljive oznake izdavača AKTUAL MEDIA`);
  if (!/name="copyright" content="AKTUAL MEDIA d.o.o."/.test(html)) note(`${where}: nema copyright meta`);

  /* Jezična čistoća: hrvatska rečenica ne smije procuriti na /en/ stranicu.
     Provjeravamo zaglavlja kartica, jer su se prijevodi tamo lako zaborave. */
  if (lang === 'en') {
    const leaks = ['Borilački sport u Sjedinjenim', 'Košarka bez šuma', 'Kako znanost stvarno nastaje',
      'Ples, step i pokret kao tehnologija', 'Zdravlje bez čuda', 'Nadzorni desk: što mediji'];
    for (const leak of leaks) if (html.includes(leak)) note(`${where}: hrvatski tekst na engleskoj stranici ("${leak.slice(0, 30)}…")`);
  }

  const imgs = [...html.matchAll(/<img [^>]*src="([^"]+)"/g)].map((m) => m[1]);
  for (const src of imgs) {
    if (!src.startsWith('/')) { note(`${where}: vanjska slika ${src}`); continue; }
    if (!existsSync(join(SITE, site.slug, src.replace(/^\//, '')))) note(`${where}: slika ne postoji ${src}`);
  }

  for (const href of links) {
    if (/^https?:\/\//.test(href) || href.startsWith('#') || href.startsWith('mailto:')) continue;
    const target = href.split('#')[0].split('?')[0];
    if (!target) continue;
    const rel = target.replace(/^\//, '');
    const ok = target.endsWith('/') || rel === ''
      ? existsSync(join(SITE, site.slug, rel, 'index.html'))
      : existsSync(join(SITE, site.slug, rel));
    if (!ok) note(`${where}: unutarnji link ne postoji ${href}`);
  }
  return html;
}

let pageCount = 0;
for (const site of SITES) {
  const dir = join(SITE, site.slug);
  if (!existsSync(dir)) { note(`${site.slug}: stranica nije izgrađena`); continue; }
  const htmlFiles = walk(dir).filter((file) => file.endsWith('.html') && !file.includes('404'));
  for (const file of htmlFiles) {
    const lang = file.startsWith('en/') || file === 'en' ? 'en' : 'hr';
    const rel = file.replace(/index\.html$/, '').replace(/\/$/, '');
    const slug = rel === 'en' ? '' : rel.replace(/^en\//, '');
    checkHtml(join(dir, file), site, lang, slug);
    pageCount += 1;
  }
  for (const required of ['sitemap.xml', 'robots.txt', 'feed.xml', 'manifest.webmanifest', '404.html', '_headers']) {
    if (!existsSync(join(dir, required))) note(`${site.slug}: nedostaje ${required}`);
  }
  const robots = readFileSync(join(dir, 'robots.txt'), 'utf8');
  if (!robots.includes(`Sitemap: ${siteBase(site)}/sitemap.xml`)) note(`${site.slug}: robots bez vlastitog sitemapa`);
  if (readFileSync(join(dir, 'robots.txt'), 'utf8').includes('Disallow: /\n')) note(`${site.slug}: robots zabranjuje indeksiranje`);

  const sm = readFileSync(join(dir, 'sitemap.xml'), 'utf8');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (locs.length !== htmlFiles.length) note(`${site.slug}: sitemap ima ${locs.length} URL-ova, stranica ${htmlFiles.length}`);
  if (!sm.includes(`<loc>${siteBase(site)}/</loc>`)) note(`${site.slug}: sitemap bez naslovnice`);

  const feed = readFileSync(join(dir, 'feed.xml'), 'utf8');
  if (!feed.includes('<feed xmlns="http://www.w3.org/2005/Atom">')) note(`${site.slug}: feed nije Atom`);
  if (count(feed, /<entry>/g) !== htmlFiles.length / 2) note(`${site.slug}: feed ima ${count(feed, /<entry>/g)} zapisa, stranica ${htmlFiles.length / 2}`);

  try { JSON.parse(readFileSync(join(dir, 'manifest.webmanifest'), 'utf8')); }
  catch { note(`${site.slug}: manifest nije JSON`); }

  const headers = readFileSync(join(dir, '_headers'), 'utf8');
  for (const header of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Strict-Transport-Security']) {
    if (!headers.includes(header)) note(`${site.slug}: _headers bez ${header}`);
  }

  const art = walk(join(dir, 'img')).filter((file) => file.endsWith('.svg'));
  if (art.length !== 6) note(`${site.slug}: ${art.length} SVG grafika (očekivano 6)`);
  const og = join(dir, 'img', `${site.slug}-og.png`);
  if (!existsSync(og)) note(`${site.slug}: nema OG slike`);
  else {
    const png = readFileSync(og);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width !== 1200 || height !== 630) note(`${site.slug}: OG slika ${width}×${height}, ne 1200×630`);
  }
}

/* ---------- 3. hub i registar ---------- */
const hubHr = join(PORTAL, 'mreza', 'index.html');
const hubEn = join(PORTAL, 'en', 'network', 'index.html');
for (const [file, canonical, lang] of [[hubHr, NETWORK_HUB_HR, 'hr'], [hubEn, NETWORK_HUB_EN, 'en']]) {
  if (!existsSync(file)) { note(`hub nedostaje: ${relative(ROOT, file)}`); continue; }
  const html = readFileSync(file, 'utf8');
  const where = relative(ROOT, file);
  if (attr(html, /<link rel="canonical" href="([^"]+)">/) !== canonical) note(`${where}: canonical nije ${canonical}`);
  if (!html.includes('hreflang="x-default"')) note(`${where}: nema x-default`);
  if (!/name="twitter:card" content="summary_large_image"/.test(html)) note(`${where}: nema Twitter karticu`);
  if (!/name="editor" content="Nermin Sefić"/.test(html)) note(`${where}: nema potpis urednika`);
  const ld = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
  try {
    const types = JSON.parse(ld)['@graph'].map((node) => node['@type']);
    for (const type of ['CollectionPage', 'ItemList', 'Organization', 'Person', 'BreadcrumbList']) if (!types.includes(type)) note(`${where}: JSON-LD bez ${type}`);
  } catch { note(`${where}: JSON-LD se ne parsira`); }
  for (const site of SITES) {
    if (!html.includes(`href="${siteBase(site)}/"`)) note(`${where}: nema poveznicu na ${site.slug}`);
  }
  if (count(html, /<a [^>]*href="[^"]+"/g) < 20) note(`${where}: premalo poveznica`);
  if (lang === 'hr' && !html.includes(`href="${NETWORK_HUB_EN}"`)) note(`${where}: nema jezične inačice`);
}

if (!existsSync(join(PORTAL, 'mreza', 'sitemap.xml'))) note('hub sitemap nedostaje');
else {
  const sm = readFileSync(join(PORTAL, 'mreza', 'sitemap.xml'), 'utf8');
  if (count(sm, /<loc>/g) !== 2) note('hub sitemap mora imati 2 URL-a');
}
const master = readFileSync(join(PORTAL, 'sitemap.xml'), 'utf8');
if (!master.includes(`<loc>${NETWORK_HUB_HR}</loc>`)) note('glavni sitemap ne sadrži /mreza/');

const dataFile = join(PORTAL, 'data', 'mreza-v1.json');
if (!existsSync(dataFile)) note('data/mreza-v1.json nedostaje');
else {
  const data = JSON.parse(readFileSync(dataFile, 'utf8'));
  if (data.sites?.length !== SITES.length) note(`mreza-v1.json ima ${data.sites?.length || 0} stranica`);
  for (const site of SITES) {
    const entry = data.sites.find((item) => item.slug === site.slug);
    if (!entry) { note(`mreza-v1.json bez ${site.slug}`); continue; }
    if (!entry.url || !entry.outputs?.sitemap) note(`mreza-v1.json: ${site.slug} bez izlaza`);
    if (entry.relations?.siblings?.length !== SITES.length - 1) note(`mreza-v1.json: ${site.slug} bez svih susjeda`);
  }
}

/* ---------- 3b. AKTUAL MEDIA — indeks svih stranica ---------- */
const deskPages = join(PORTAL, 'gnk-aktual', 'mreza', 'index.html');
const deskPagesEn = join(PORTAL, 'en', 'gnk-aktual', 'network', 'index.html');
const pagesJson = join(PORTAL, 'data', 'mreza-pages-v1.json');
let index = null;

if (!existsSync(pagesJson)) note('data/mreza-pages-v1.json nedostaje');
else {
  index = JSON.parse(readFileSync(pagesJson, 'utf8'));
  if (index.count !== 62) note(`mreza-pages-v1.json ima ${index.count} stranica (očekivano 62)`);
  if (index.publisher?.name !== 'AKTUAL MEDIA d.o.o.') note('mreza-pages-v1.json: izdavač nije AKTUAL MEDIA');
  if (index.editor?.name !== 'Nermin Sefić') note('mreza-pages-v1.json: nema urednika');
  for (const page of index.pages || []) {
    if (!/^https:\/\/gnk-[a-z-]+\.pages\.dev\//.test(page.url)) note(`mreza-pages-v1.json: URL izvan mreže ${page.url}`);
    const site = SITES.find((item) => item.slug === page.edition);
    if (!site) { note(`mreza-pages-v1.json: nepoznato izdanje ${page.edition}`); continue; }
    const rel = page.url.replace(siteBase(site), '').replace(/^\//, '');
    const file = page.slug === '' ? join(SITE, page.edition, rel, 'index.html') : join(SITE, page.edition, rel, 'index.html');
    if (!existsSync(file)) note(`mreza-pages-v1.json: stranica ne postoji u izlazu ${page.url}`);
  }
}

for (const [file, canonical, lang] of [[deskPages, DESK_HR, 'hr'], [deskPagesEn, DESK_EN, 'en']]) {
  const where = relative(ROOT, file);
  if (!existsSync(file)) { note(`${where}: nema`); continue; }
  const html = readFileSync(file, 'utf8');
  if (attr(html, /<link rel="canonical" href="([^"]+)">/) !== canonical) note(`${where}: canonical nije ${canonical}`);
  if (!html.includes('hreflang="x-default"')) note(`${where}: nema x-default`);
  if (!/name="editor" content="Nermin Sefić"/.test(html)) note(`${where}: nema potpis urednika`);
  if (!/property="og:image" content="https:\/\/gnk-asg\.hr\//.test(html)) note(`${where}: OG slika nije na matičnoj domeni`);
  if (!/name="twitter:card" content="summary_large_image"/.test(html)) note(`${where}: nema Twitter karticu`);
  const ld = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
  try {
    const graph = JSON.parse(ld)['@graph'];
    const types = graph.map((node) => node['@type']);
    for (const type of ['CollectionPage', 'ItemList', 'NewsMediaOrganization', 'Person', 'BreadcrumbList']) {
      if (!types.includes(type)) note(`${where}: JSON-LD bez ${type}`);
    }
    const list = graph.find((node) => node['@type'] === 'ItemList');
    if (list?.numberOfItems !== 62) note(`${where}: ItemList ima ${list?.numberOfItems} stavki`);
    const org = graph.find((node) => node['@type'] === 'NewsMediaOrganization');
    if (org?.name !== 'AKTUAL MEDIA d.o.o.') note(`${where}: izdavač nije AKTUAL MEDIA`);
    if (!org?.owns?.length) note(`${where}: izdavač ne navodi izdanja`);
  } catch { note(`${where}: JSON-LD se ne parsira`); }
  if (!html.includes('/data/mreza-pages-v1.json')) note(`${where}: nema poveznicu na JSON indeks`);
  if (!html.includes('/mreza/feed.xml')) note(`${where}: nema poveznicu na zbirni feed`);
  let linked = 0;
  for (const site of SITES) if (html.includes(`href="${siteBase(site)}/`)) linked += 1;
  if (linked !== SITES.length) note(`${where}: poveznice na ${linked}/${SITES.length} izdanja`);
  if ((html.match(/https:\/\/gnk-[a-z-]+\.pages\.dev\//g) || []).length < 40) note(`${where}: premalo poveznica na stranice izdanja`);
}

const feedFile = join(PORTAL, 'mreza', 'feed.xml');
if (!existsSync(feedFile)) note('mreza/feed.xml nedostaje');
else {
  const xml = readFileSync(feedFile, 'utf8');
  if (!xml.includes('<feed xmlns="http://www.w3.org/2005/Atom">')) note('mreza/feed.xml nije Atom');
  if (count(xml, /<entry>/g) !== 62) note(`mreza/feed.xml ima ${count(xml, /<entry>/g)} zapisa`);
  if (!xml.includes(DESK_HR)) note('mreza/feed.xml ne pokazuje na indeks');
}

const opmlFile = join(PORTAL, 'mreza', 'feeds.opml');
if (!existsSync(opmlFile)) note('mreza/feeds.opml nedostaje');
else {
  const opml = readFileSync(opmlFile, 'utf8');
  if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>/.test(opml)) note('feeds.opml nema XML zaglavlje');
  const outlines = count(opml, /<outline /g);
  /* Mrežni feed + HR/EN feed svakog izdanja + dva feeda prijestolnica
     (/glavni-gradovi/ i /en/capitals/). Prijestolnice su u OPML-u jer se
     čitaju istim čitačem kao izdanja. */
  const expectedOutlines = 1 + SITES.length * 2 + 2;
  if (outlines !== expectedOutlines) note(`feeds.opml ima ${outlines} stavki (očekivano ${expectedOutlines})`);
  if (!opml.includes('/glavni-gradovi/feed.xml')) note('feeds.opml ne nudi feed prijestolnica');
  if (!opml.includes('/en/capitals/feed.xml')) note('feeds.opml ne nudi EN feed prijestolnica');
  if (!opml.includes('<opml version="2.0">')) note('feeds.opml nije OPML 2.0');
}

const deskSitemap = join(PORTAL, 'gnk-aktual', 'mreza', 'sitemap.xml');
if (!existsSync(deskSitemap)) note('gnk-aktual/mreza/sitemap.xml nedostaje');
else {
  const locs = count(readFileSync(deskSitemap, 'utf8'), /<loc>/g);
  const expected = 4 + SITES.length * 2 + 2;
  if (locs !== expected) note(`mreza sitemap ima ${locs} URL-a (očekivano ${expected})`);
}

/* ---------- 3c. indeks po izdanju unutar AKTUAL MEDIA ---------- */
for (const site of SITES) {
  for (const lang of ['hr', 'en']) {
    const file = join(PORTAL, lang === 'en' ? 'en/gnk-aktual/network' : 'gnk-aktual/mreza', site.slug, 'index.html');
    const canonical = lang === 'en' ? `${DESK_EN}${site.slug}/` : `${DESK_HR}${site.slug}/`;
    const alternate = lang === 'en' ? `${DESK_HR}${site.slug}/` : `${DESK_EN}${site.slug}/`;
    const where = relative(ROOT, file);
    if (!existsSync(file)) { note(`${where}: nema`); continue; }
    const html = readFileSync(file, 'utf8');
    const title = unescape((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
    const description = attr(html, /<meta name="description" content="([^"]+)">/);
    if (title.length < 15 || title.length > 90) note(`${where}: naslov ${title.length} znakova`);
    if (description.length < 80 || description.length > 320) note(`${where}: opis ${description.length} znakova`);
    if (attr(html, /<link rel="canonical" href="([^"]+)">/) !== canonical) note(`${where}: canonical nije ${canonical}`);
    if (!html.includes(`hreflang="x-default" href="${DESK_HR}${site.slug}/"`)) note(`${where}: x-default nije HR izdanje`);
    if (!html.includes(`hreflang="${lang === 'en' ? 'hr' : 'en'}" href="${alternate}"`)) note(`${where}: nema hreflang na ${alternate}`);
    if ((html.match(/<h1/g) || []).length !== 1) note(`${where}: nema točno jedan h1`);
    const links = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
    if (links.length < 6) note(`${where}: samo ${links.length} poveznica`);
    if (!links.some((href) => href === `${siteBase(site)}/`)) note(`${where}: nema poveznice na izdanje`);
    if (!links.some((href) => href === (lang === 'en' ? DESK_EN : DESK_HR))) note(`${where}: nema poveznice na mrežu`);
    const editionPages = index?.pages?.filter((page) => page.edition === site.slug && page.lang === lang) || [];
    if (editionPages.length < 5) note(`${where}: indeks ima ${editionPages.length} stranica izdanja`);
    for (const page of editionPages) if (!html.includes(`href="${page.url}"`)) note(`${where}: nema poveznice na ${page.url}`);
    if (!/name="editor" content="Nermin Sefić"/.test(html)) note(`${where}: nema urednika`);
    if (!/name="copyright" content="AKTUAL MEDIA d.o.o."/.test(html)) note(`${where}: nema copyright`);
    if (!master.includes(`<loc>${canonical}</loc>`)) note(`${where}: nema u glavnom sitemapu`);
    const ld = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
    try {
      const graph = JSON.parse(ld)['@graph'];
      const types = graph.map((node) => node['@type']);
      for (const type of ['CollectionPage', 'ItemList', 'BreadcrumbList', 'NewsMediaOrganization', 'Person']) if (!types.includes(type)) note(`${where}: JSON-LD bez ${type}`);
      const list = graph.find((node) => node['@type'] === 'ItemList');
      if (list?.numberOfItems !== editionPages.length) note(`${where}: ItemList ima ${list?.numberOfItems} stavki (${editionPages.length})`);
      if ((html.match(/https:\/\/gnk-[a-z-]+\.pages\.dev\//g) || []).length < editionPages.length) note(`${where}: premalo poveznica na tekstove`);
    } catch { note(`${where}: JSON-LD se ne parsira`); }
  }
}

for (const loc of [DESK_HR, DESK_EN]) {
  if (!master.includes(`<loc>${loc}</loc>`)) note(`glavni sitemap ne sadrži ${loc}`);
}

for (const [file, label] of [[join(PORTAL, 'gnk-aktual', 'index.html'), 'HR'], [join(PORTAL, 'en', 'gnk-aktual', 'index.html'), 'EN']]) {
  if (!existsSync(file)) { note(`/gnk-aktual/ ${label}: nema`); continue; }
  const html = readFileSync(file, 'utf8');
  if (!html.includes('<!-- AKTUAL-MREZA-BAND:START -->')) note(`/gnk-aktual/ ${label}: nema trake mreže`);
  if (!html.includes(label === 'EN' ? 'en/gnk-aktual/network/' : 'gnk-aktual/mreza/')) note(`/gnk-aktual/ ${label}: traka ne vodi na indeks`);
}

/* ---------- 3d. oznake i Markdown indeks ---------- */
const TAG_HR = `${DESK_HR}oznake/`;
const TAG_EN = `${DESK_EN}tags/`;
for (const [lang, canonical, alternate, file] of [
  ['hr', TAG_HR, TAG_EN, join(PORTAL, 'gnk-aktual/mreza/oznake/index.html')],
  ['en', TAG_EN, TAG_HR, join(PORTAL, 'en/gnk-aktual/network/tags/index.html')],
]) {
  const where = relative(ROOT, file);
  if (!existsSync(file)) { note(`${where}: nema`); continue; }
  const html = readFileSync(file, 'utf8');
  if (attr(html, /<link rel="canonical" href="([^"]+)">/) !== canonical) note(`${where}: canonical nije ${canonical}`);
  if (!html.includes(`hreflang="${lang === 'hr' ? 'en' : 'hr'}" href="${alternate}"`)) note(`${where}: nema hreflang na ${alternate}`);
  if (!html.includes('hreflang="x-default"')) note(`${where}: nema x-default`);
  const title = unescape((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
  if (title.length < 15 || title.length > 90) note(`${where}: naslov ${title.length}`);
  const desc = attr(html, /<meta name="description" content="([^"]+)">/);
  if (desc.length < 80 || desc.length > 320) note(`${where}: opis ${desc.length}`);
  if (!master.includes(`<loc>${canonical}</loc>`)) note(`${where}: nema u glavnom sitemapu`);
  const tags = attr(html, /<meta name="hashtags" content="([^"]*)">/).split(/\s+/).filter(Boolean);
  if (tags.length < 3) note(`${where}: premalo hashtagova`);
  if ((html.match(/<h1/g) || []).length !== 1) note(`${where}: nema točno jedan h1`);
  if ((html.match(/<a [^>]*href="/g) || []).length < 6) note(`${where}: premalo poveznica`);
  if ((html.match(/id="[a-z0-9]+"/g) || []).length < 20) note(`${where}: premalo sidra oznaka`);
  if (!html.includes('type="text/markdown"')) note(`${where}: nema Markdown alternate`);
}
for (const [file, lang] of [[join(PORTAL, 'gnk-aktual/mreza/index.md'), 'hr'], [join(PORTAL, 'en/gnk-aktual/network/index.md'), 'en']]) {
  const where = relative(ROOT, file);
  if (!existsSync(file)) { note(`${where}: nema`); continue; }
  const md = readFileSync(file, 'utf8');
  const linked = (md.match(/https:\/\/gnk-[a-z-]+\.pages\.dev\//g) || []).length;
  if (linked < 31) note(`${where}: samo ${linked} poveznica na tekstove`);
  if (!md.includes(lang === 'en' ? 'Publisher: AKTUAL MEDIA' : 'Izdavač: AKTUAL MEDIA')) note(`${where}: nema izdavača`);
  if (!md.includes('Nermin Sefić')) note(`${where}: nema urednika`);
}

/* ---------- 3b. svaka kartica mreže ima pravu sliku ---------- */

/* Mrežna stranica je popis od 32 adrese. Kartica bez slike je prazna kućica;
   kartica sa SVG plohom je „samo boja”. Svaka kartica mora nositi WebP
   fotografiju s alt tekstom, a SVG ploha smije ostati samo kao rezerva za
   novo izdanje (zato se ovdje traži da je nema). */
for (const [file, lang] of [[join(PORTAL, 'mreza', 'index.html'), 'hr'], [join(PORTAL, 'en', 'network', 'index.html'), 'en']]) {
  if (!existsSync(file)) { note(`${file}: mrežna stranica nedostaje`); continue; }
  const html = readFileSync(file, 'utf8');
  const cards = [...html.matchAll(/<a class="card[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => match[1]);
  if (cards.length !== 32) note(`${file}: ${cards.length} kartica (očekivano 32)`);
  for (const [index, body] of cards.entries()) {
    const image = body.match(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/);
    if (!image) { note(`${file}: kartica ${index + 1} bez slike`); continue; }
    if (!/\.webp$/.test(image[1])) note(`${file}: kartica ${index + 1} nema WebP sliku (${image[1]})`);
    if (!image[2].trim()) note(`${file}: kartica ${index + 1} ima prazan alt`);
    if (!/srcset="[^"]+\.webp \d+w/.test(body)) note(`${file}: kartica ${index + 1} nema srcset sa širinama`);
    if (body.includes('-art-1.svg')) note(`${file}: kartica ${index + 1} još koristi SVG plohu`);
  }
}

/* ---------- 3c. naslovnice nose pravu ilustraciju ---------- */

/* Šest samostalnih izdanja ima ilustraciju scene. Naslovnica je mora nositi
   kao WebP sa srcsetom (ne SVG plohu), a datoteke moraju postojati u izlazu —
   inače stranica ostaje bez slike na vlastitoj domeni. */
for (const site of SITES) {
  const art = SATELLITE_ART[site.slug];
  if (!art) continue;
  const home = join(SITE, site.slug, 'index.html');
  if (!existsSync(home)) { note(`${site.slug}: naslovnica nedostaje`); continue; }
  const html = readFileSync(home, 'utf8');
  if (!html.includes(`/img/${site.slug}-hero-1200.webp`)) note(`${site.slug}: naslovnica bez ilustracije`);
  if (!html.includes(`/img/${site.slug}-hero-440.webp 440w`)) note(`${site.slug}: ilustracija bez srcseta`);
  if (!/<img[^>]*-hero-1200\.webp[^>]*alt="[^"]{30,}"/.test(html)) note(`${site.slug}: ilustracija bez opisa u altu`);
  for (const width of [440, 800, 1200]) {
    if (!existsSync(join(SITE, site.slug, 'img', `${site.slug}-hero-${width}.webp`))) note(`${site.slug}: nema hero-${width}.webp`);
  }
  if (!existsSync(join(SITE, site.slug, 'img', `${site.slug}-og.jpg`))) note(`${site.slug}: nema OG fotografije`);
}

/* ---------- 4. izborni desk ---------- */
const election = join(SITE, 'izbori-srbija');
if (existsSync(election)) {
  const home = readFileSync(join(election, 'index.html'), 'utf8');
  if (!/izbori-srbija|Izbori u Srbiji/i.test(home)) note('izbori: naslovnica bez izbornog konteksta');
  if (!existsSync(join(election, 'metodologija', 'index.html'))) note('izbori: nema metodologije');
  if (!existsSync(join(election, 'izvori', 'index.html'))) note('izbori: nema izvora');
  if (!/Privremeno izdanje/.test(home)) note('izbori: nema oznake da je izdanje privremeno');
  if (!/Ne objavljuje ankete kao rezultate/.test(home)) note('izbori: nema granice prema anketama');
  const desk = readFileSync(join(election, 'statistika', 'index.html'), 'utf8');
  if (!/Medij/.test(desk) || !/Zapisa/.test(desk)) note('izbori: statistika bez tablice medija');
}

if (fails.length) {
  console.error(`MREŽA — ${fails.length} problema (${pageCount} stranica provjereno):`);
  for (const message of fails.slice(0, 40)) console.error(`  ✗ ${message}`);
  if (fails.length > 40) console.error(`  … i još ${fails.length - 40}`);
  process.exit(1);
}
console.log(`MREŽA — OK: ${SITES.length} stranica, ${pageCount} HTML stranica, hub HR/EN, JSON i sitemapi.`);
