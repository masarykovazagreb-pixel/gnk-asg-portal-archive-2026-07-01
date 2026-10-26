/**
 * ČITAČ IZVORNIH KOLUMNI — jedno mjesto za sve domene.
 *
 * Kolumna nastaje na portalu (apps/portal/gnk-aktual/kolumne/<slug>/), a
 * prenosi se na mrežu i na svjetska izdanja. Da se pri tome ne raziđu
 * naslov, opis, datum i izvornik, svi primatelji čitaju istu funkciju.
 *
 * Pravilo: `canonical` iz izvorne stranice je adresa izvornika. Ne sastavlja
 * se po imenu mape — neke kolumne su preslike autorskih objava i žive pod
 * drugom adresom, pa bi sastavljanje dalo link koji vodi u prazno.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const EXCERPT_PARAGRAPHS = 3;

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

function readColumn(dir) {
  const file = join(dir, 'index.html');
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');

  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/i);
  const title = strip(attr(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  if (!canonical || !title) return null;

  const description = strip(attr(html, /<meta name="description" content="([^"]*)"/i)).slice(0, 300);
  const published = attr(html, /<meta property="article:published_time" content="([^"]+)"/i)
    || attr(html, /<time[^>]*datetime="([^"]+)"/i);
  const image = attr(html, /<meta property="og:image" content="([^"]+)"/i);
  const tags = [...html.matchAll(/<meta property="article:tag" content="([^"]+)"/gi)].map((m) => m[1]);

  /* Tijelo: prvi odlomci unutar <article>, bez navigacije i potpisa. */
  const article = (html.match(/<article[\s\S]*?<\/article>/i) || [html])[0];
  const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => strip(m[1]))
    .filter((text) => text.length >= 90 && !/^(Foto|Ilustracija|Izvor|Pročitajte|Ovo je tekst)/i.test(text))
    .slice(0, EXCERPT_PARAGRAPHS);

  return {
    slug: dir.split('/').pop(),
    canonical,
    title,
    description,
    published,
    image,
    tags: [...new Set(tags)].slice(0, 8),
    paragraphs
  };
}

/** Sve izvorne kolumne, najnovije prve. */
export function readColumns(root, { max = 60 } = {}) {
  const sourceDir = join(root, 'apps', 'portal', 'gnk-aktual', 'kolumne');
  if (!existsSync(sourceDir)) return [];
  return readdirSync(sourceDir)
    .map((name) => join(sourceDir, name))
    .filter((dir) => existsSync(dir) && statSync(dir).isDirectory())
    .map(readColumn)
    .filter(Boolean)
    .sort((a, b) => String(b.published).localeCompare(String(a.published)))
    .slice(0, max);
}

/** Apsolutna putanja do slike izvorne kolumne, ako postoji lokalno. */
export function columnImagePath(root, column) {
  if (!column.image) return null;
  const rel = column.image.replace(/^https:\/\/gnk-asg\.hr\//, '');
  if (/gnk-asg-social-card/.test(rel)) return null;
  const full = join(root, 'apps', 'portal', rel);
  return existsSync(full) ? full : null;
}
