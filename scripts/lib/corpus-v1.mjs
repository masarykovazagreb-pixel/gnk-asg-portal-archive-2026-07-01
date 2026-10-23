/**
 * KORPUS NAŠIH TEKSTOVA — jedan popis, svi primatelji.
 *
 * Do sada je mreža prenosila samo Sefićeve kolumne. Ovaj modul skuplja sve
 * naše tekstove koji smiju ići dalje, iz tri stvarna izvora:
 *
 *   1. kolumne       apps/portal/gnk-aktual/kolumne/<slug>/
 *   2. autorski tekstovi  apps/portal/autorske-objave/
 *   3. pojašnjenja i komentari  apps/kanal/src/articles/*.json
 *      (sve što je o GNK ASG d.o.o. ili GNK DINAMO Ltd., plus rubrike
 *      `pojasnjenje` i `komentar`)
 *
 * Svaki zapis nosi `canonical` — adresu na kojoj je tekst prvi objavljen.
 * Prenos nikad ne mijenja canonical: kopija pokazuje na izvornik, pa
 * tražilica zna gdje je matični tekst.
 *
 * Pravilo: ovdje ulazi samo ono što je naš tekst. Tuđi članci (izvori iz
 * RSS-a) ostaju na izvornom mediju i na njih se samo linka.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MAX_PER_KIND = 80;

export const strip = (value) => String(value || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

const attr = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : '';
};

const paragraphsFromHtml = (html, limit = 4) => {
  const scope = (html.match(/<article[\s\S]*?<\/article>/i) || [html])[0];
  return [...scope.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => strip(m[1]))
    .filter((text) => text.length >= 90 && !/^(Foto|Ilustracija|Izvor|Pročitajte|Ovo je tekst|Napomena)/i.test(text))
    .slice(0, limit);
};

const date10 = (value) => {
  const raw = String(value || '');
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
};

/* ---------- 1. kolumne ---------- */
function readKolumne(root) {
  const dir = join(root, 'apps', 'portal', 'gnk-aktual', 'kolumne');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((path) => existsSync(join(path, 'index.html')))
    .map((path) => {
      const html = readFileSync(join(path, 'index.html'), 'utf8');
      const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/i);
      const title = strip(attr(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
      if (!canonical || !title) return null;
      return {
        slug: path.split('/').pop(),
        kind: 'kolumna',
        canonical,
        title,
        description: strip(attr(html, /<meta name="description" content="([^"]*)"/i)).slice(0, 300),
        published: date10(attr(html, /<meta property="article:published_time" content="([^"]+)"/i)),
        image: attr(html, /<meta property="og:image" content="([^"]+)"/i),
        tags: [...html.matchAll(/<meta property="article:tag" content="([^"]+)"/gi)].map((m) => m[1]).slice(0, 8),
        paragraphs: paragraphsFromHtml(html, 3),
        sectionPath: 'kolumne'
      };
    })
    .filter(Boolean);
}

/* ---------- 2. autorske objave ---------- */
function readAutorske(root) {
  const dir = join(root, 'apps', 'portal', 'autorske-objave');
  if (!existsSync(dir)) return [];
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === 'index.html') continue;
    if (statSync(full).isDirectory()) {
      if (existsSync(join(full, 'index.html'))) files.push(join(full, 'index.html'));
    } else if (name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files.map((file) => {
    const html = readFileSync(file, 'utf8');
    const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/i);
    const title = strip(attr(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)) || strip(attr(html, /<title>([\s\S]*?)<\/title>/i));
    if (!canonical || !title) return null;
    const slug = canonical.replace(/\/+$/, '').split('/').pop().replace(/\.html$/, '');
    return {
      slug: `autor-${slug}`,
      kind: 'autor',
      canonical,
      title,
      description: strip(attr(html, /<meta name="description" content="([^"]*)"/i)).slice(0, 300),
      published: date10(attr(html, /<meta property="article:published_time" content="([^"]+)"/i)) || '2026-10-01',
      image: attr(html, /<meta property="og:image" content="([^"]+)"/i),
      tags: [...html.matchAll(/<meta property="article:tag" content="([^"]+)"/gi)].map((m) => m[1]).slice(0, 8),
      paragraphs: paragraphsFromHtml(html, 3),
      sectionPath: 'autorske-objave'
    };
  }).filter(Boolean);
}

/* ---------- 3. pojašnjenja i komentari s kanala ---------- */
function readKanal(root) {
  const dir = join(root, 'apps', 'kanal', 'src', 'articles');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const file = join(dir, name);
      let data;
      try { data = JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
      const tags = Array.isArray(data.tags) ? data.tags : [];
      const blob = [data.title, data.dek, data.description, ...tags].join(' ');
      const corporate = /GNK\s*(ASG|DINAMO)/i.test(blob);
      const editorial = ['pojasnjenje', 'komentar'].includes(data.section);
      if (!corporate && !editorial) return null;

      const built = join(root, 'apps', 'kanal', 'site', data.slug, 'index.html');
      const html = existsSync(built) ? readFileSync(built, 'utf8') : '';
      const canonical = (html && attr(html, /<link rel="canonical" href="([^"]+)"/i))
        || `https://gnk-asg-kanal.pages.dev/${data.slug}/`;
      const body = typeof data.body === 'string' ? data.body : '';
      return {
        slug: `kanal-${String(data.slug).replace(/^[0-9]+-/, '')}`,
        kind: 'kanal',
        canonical,
        title: strip(data.title),
        description: strip(data.dek || data.description || '').slice(0, 300),
        published: date10(data.date),
        image: data.og && existsSync(join(root, 'apps', 'kanal', 'site', data.og))
          ? data.og
          : '',
        tags: [...new Set(['GNK ASG', 'GNK DINAMO Ltd.', ...tags])].slice(0, 8),
        paragraphs: body ? paragraphsFromHtml(body, 3) : [],
        sectionPath: 'pojasnjenja'
      };
    })
    .filter(Boolean);
}

/** Cijeli korpus, bez duplikata po adresi izvornika. */
export function readCorpus(root) {
  const all = [
    ...readKolumne(root),
    ...readAutorske(root),
    ...readKanal(root).slice(0, MAX_PER_KIND)
  ].filter((item) => item.paragraphs.length >= 1);

  const seen = new Set();
  return all
    .filter((item) => {
      if (seen.has(item.canonical)) return false;
      seen.add(item.canonical);
      return true;
    })
    .sort((a, b) => String(b.published).localeCompare(String(a.published)));
}

/** Apsolutna putanja do lokalne slike zapisa, ako postoji. */
export function corpusImage(root, item) {
  if (!item.image) return null;
  const rel = item.image.replace(/^https:\/\/gnk-asg\.hr\//, '').replace(/^assets\//, 'assets/');
  const candidates = [
    join(root, 'apps', 'portal', rel),
    join(root, 'apps', 'kanal', 'site', rel),
    join(root, 'apps', 'kanal', 'site', 'assets', rel.replace(/^assets\//, ''))
  ];
  return candidates.find((file) => existsSync(file)) || null;
}

/** Slika autora — jedna, ista na svakoj domeni. */
export function authorPortrait(root) {
  const file = join(root, 'apps', 'portal', 'assets', 'people', 'nermin-sefic', 'nermin-sefic-01-official-desk-portrait.webp');
  return existsSync(file) ? file : null;
}

export const KIND_LABEL = {
  kolumna: { hr: 'Kolumna', en: 'Column' },
  autor: { hr: 'Autorski tekst', en: 'Authored text' },
  kanal: { hr: 'Pojašnjenje', en: 'Explanation' }
};
