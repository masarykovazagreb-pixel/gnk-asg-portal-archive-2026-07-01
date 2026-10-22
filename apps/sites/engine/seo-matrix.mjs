/**
 * SEO stroj — matrica svih javnih stranica mreže.
 *
 * Ulaz su stvarno izgrađene datoteke, ne namjere: svaka stranica izdanja i
 * svaki indeks pod AKTUAL MEDIA prolazi isti popis provjera. Rezultat je
 * `apps/portal/data/seo-matrix-v1.json` — jedan strojni zapis koji kaže koja
 * stranica ima koje meta oznake, koje hashtagove i gdje nedostaje nešto.
 *
 * Ovo je dio builda, ne dodatna skripta: ako se stranica izgradi bez SEO
 * sloja, matrica to zabilježi i gate padne. Nema ručnog popisa stranica.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

const esc = (value) => String(value ?? '').replace(/&/g, '&amp;');
const attr = (html, pattern) => {
  const match = html.match(pattern);
  return match ? match[1].replace(/&amp;/g, '&') : '';
};
const has = (html, pattern) => pattern.test(html);
const count = (html, pattern) => (html.match(pattern) || []).length;

export const SEO_MATRIX_FILE = 'data/seo-matrix-v1.json';

function audit(route) {
  const html = existsSync(route.file) ? readFileSync(route.file, 'utf8') : '';
  const issues = [];
  if (!html) return { ...route, score: 0, issues: ['datoteka ne postoji'] };

  const title = attr(html, /<title>([\s\S]*?)<\/title>/);
  const description = attr(html, /<meta name="description" content="([^"]+)">/);
  const canonical = attr(html, /<link rel="canonical" href="([^"]+)">/);
  const keywords = attr(html, /<meta name="keywords" content="([^"]*)">/);
  const hashtagsRaw = attr(html, /<meta name="hashtags" content="([^"]*)">/);
  const hashtags = hashtagsRaw.split(/\s+/).filter(Boolean);
  const og = ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']
    .filter((name) => has(html, new RegExp(`<meta property="${name}" content="[^"]+"`)));
  const twitter = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']
    .filter((name) => has(html, new RegExp(`<meta name="${name}" content="[^"]+"`)));
  const hreflang = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((match) => match[1]);

  let jsonld = null;
  const raw = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
  try { jsonld = raw ? JSON.parse(raw) : null; } catch { issues.push('JSON-LD se ne parsira'); }
  const types = (jsonld?.['@graph'] || []).map((node) => node['@type']);

  const articleTags = [...html.matchAll(/<meta property="article:tag" content="([^"]+)"/g)].map((match) => match[1]);
  const isArticle = route.kind === 'article';
  const isDesk = route.kind === 'desk' || route.kind === 'edition-desk';

  if (title.length < 15 || title.length > 90) issues.push(`naslov ${title.length} znakova`);
  if (description.length < 80 || description.length > 320) issues.push(`opis ${description.length} znakova`);
  if (!/^https:\/\//.test(canonical)) issues.push('canonical nije apsolutni https');
  if (route.url && canonical !== route.url) issues.push('canonical nije jednak adresi rute');
  for (const lang of ['hr', 'en', 'x-default']) if (!hreflang.includes(lang)) issues.push(`nema hreflang ${lang}`);
  if (!has(html, /<meta name="robots" content="index,follow/)) issues.push('robots nije index,follow');
  if (!has(html, /<meta name="editor" content="Nermin Sefić">/)) issues.push('nema meta editor');
  if (!has(html, /<meta name="publisher" content="AKTUAL MEDIA d\.o\.o\.">/)) issues.push('nema meta publisher');
  if (keywords.length < 20) issues.push('keywords prekratki');
  if (/Nermin Sefić/.test(keywords)) issues.push('ime urednika u keywords');
  if (hashtags.length < 3) issues.push(`samo ${hashtags.length} hashtagova`);
  if (hashtags.some((tag) => !/^#[A-Za-z0-9]+$/.test(tag))) issues.push('neispravan hashtag');
  if (new Set(hashtags.map((tag) => tag.toLowerCase())).size !== hashtags.length) issues.push('dvostruki hashtag');
  if (og.length !== 5) issues.push(`OG oznake ${og.length}/5`);
  if (twitter.length !== 4) issues.push(`Twitter oznake ${twitter.length}/4`);
  if (!has(html, /<meta name="twitter:card" content="summary_large_image">/)) issues.push('twitter kartica nije summary_large_image');
  if (!jsonld) issues.push('nema JSON-LD');
  else {
    for (const type of ['WebSite', 'BreadcrumbList']) if (!types.includes(type)) issues.push(`JSON-LD bez ${type}`);
    if (isArticle && !types.includes('Article')) issues.push('JSON-LD bez Article');
    if (!isArticle && !types.includes('CollectionPage')) issues.push('JSON-LD bez CollectionPage');
  }
  if (count(html, /<h1[ >]/g) !== 1) issues.push(`h1 ${count(html, /<h1[ >]/g)}×`);
  if (count(html, /<a [^>]*href="/g) < 6) issues.push('manje od 6 poveznica');
  if (isArticle) {
    if (articleTags.length < 3) issues.push(`article:tag ${articleTags.length}/3`);
    if (!has(html, /<meta property="article:section" content="[^"]+">/)) issues.push('nema article:section');
    if (!has(html, /<meta property="article:published_time" content="[^"]+">/)) issues.push('nema article:published_time');
    if (!has(html, /<meta property="article:modified_time" content="[^"]+">/)) issues.push('nema article:modified_time');
  }
  if (isDesk && !has(html, /<meta name="copyright" content="AKTUAL MEDIA d\.o\.o\.">/)) issues.push('nema copyright');

  const checks = 20 + (isArticle ? 4 : 0) + (isDesk ? 1 : 0);
  const score = issues.length ? Math.min(99, Math.max(0, Math.round(((checks - issues.length) / checks) * 100))) : 100;
  return {
    url: route.url, file: relative(route.root, route.file), kind: route.kind,
    edition: route.edition, editionName: route.editionName, lang: route.lang,
    title, descriptionLength: description.length, canonical,
    hashtags, keywords: keywords.split(',').map((word) => word.trim()).filter(Boolean).length,
    og: og.length, twitter: twitter.length, hreflang: hreflang.sort(),
    jsonld: types, score, issues,
  };
}

/**
 * Gradi matricu iz stvarnih datoteka. `routes` dolazi iz hub-a: svaka ruta
 * ima url, file, kind (article|home|desk|edition-desk), jezik i izdanje.
 */
export function buildSeoMatrix(portalRoot, { routes, sites, today = new Date().toISOString().slice(0, 10) }) {
  const root = join(portalRoot, '..', '..');
  const audited = routes.map((route) => audit({ ...route, root }));
  const issues = audited.flatMap((route) => route.issues.map((issue) => `${route.url}: ${issue}`));
  const editions = sites.map((site) => {
    const rows = audited.filter((route) => route.edition === site.slug);
    return {
      slug: site.slug,
      name: site.name,
      routes: rows.length,
      score: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0,
      hashtags: [...new Set(rows.flatMap((row) => row.hashtags))],
    };
  });
  const matrix = {
    version: 'GNK_ASG_SEO_MATRIX_V1_20261022',
    updatedAt: new Date().toISOString(),
    date: today,
    publisher: { name: 'AKTUAL MEDIA d.o.o.', url: 'https://gnk-asg.hr/gnk-aktual/' },
    editor: { name: 'Nermin Sefić', url: 'https://gnk-asg.hr/nermin-sefic/' },
    totals: {
      routes: audited.length,
      ok: audited.filter((route) => route.issues.length === 0).length,
      score: audited.length ? Math.round(audited.reduce((sum, route) => sum + route.score, 0) / audited.length) : 0,
      hashtags: [...new Set(audited.flatMap((route) => route.hashtags))].length,
      issues: issues.length,
    },
    editions,
    issues,
    routes: audited,
  };
  const file = join(portalRoot, SEO_MATRIX_FILE);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(matrix, null, 2)}\n`);
  return { file, totals: matrix.totals, editions };
}
