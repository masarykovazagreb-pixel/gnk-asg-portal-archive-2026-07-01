#!/usr/bin/env node
/**
 * Prijenos objavljenih tekstova na Dev.to.
 *
 * Isto pravilo kao za Blogger: sajt je izvor, Dev.to je preslika.
 * Nista se ne pise izravno tamo bez da vec postoji na gnk-asg.hr i stoji
 * u registru. Svaka objava zavrsava s poveznicom natrag na izvornik
 * (canonical_url), da Google zna gdje je pravi izvor.
 *
 * Bez tajne radi u nacinu pripreme: red se slozi i sprema, ali se ne salje.
 *
 *   node scripts/devto-publish-v1.mjs            # priprema
 *   node scripts/devto-publish-v1.mjs --live      # objavi (trazi DEVTO_API_KEY)
 *
 * Tajna (GitHub Actions secret):
 *   DEVTO_API_KEY   izvaditi na dev.to/settings/extensions
 *
 * VAZNO - engleski jezik: Dev.to je englesko govorno trziste. Ako zapis u
 * registru ima polja title_en/description_en/body_en, koriste se ta; ako
 * ih nema, objava se PRESKACE (ne salje se hrvatski tekst na Dev.to), dok
 * se ne prevede - v. napomenu u kodu ispod.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const PORTAL = resolve('apps/portal');
const REGISTRY = resolve('apps/portal/data/editorial-registry.json');
const STATE = resolve('apps/portal/data/devto-content/published.json');
const SITE = 'https://gnk-asg.hr';

const PER_RUN = Number(process.env.DEVTO_PER_RUN || 6);
const PAUSE_MS = Number(process.env.DEVTO_PAUSE_MS || 300000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BASE_TAGS = ['business', 'croatia']; // Dev.to: max 4 oznake, samo alfanumericke, bez razmaka
const LIVE = process.argv.includes('--live');
const API_KEY = process.env.DEVTO_API_KEY;

const readJson = (p, fallback) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } };
const writeJson = (p, data) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8'); };

const unescapeHtml = (s = '') => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'");

function readArticle(routePath) {
  const file = resolve(PORTAL, '.' + routePath, 'index.html');
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const meta = (name, attr = 'name') => {
    const m = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`));
    return m ? unescapeHtml(m[1]) : '';
  };
  const title = (meta('og:title', 'property') || (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1]).split(' | ')[0].trim();
  const description = meta('description');
  const keywords = meta('keywords').split(',').map((k) => k.trim()).filter(Boolean);
  const image = meta('og:image', 'property');
  const body =
    (html.match(/<main[\s\S]*?<\/main>/) || [])[0] ||
    (html.match(/<article[\s\S]*?<\/article>/) || [])[0] || html;
  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => unescapeHtml(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter((t) => t.length > 80);
  if (!title || paragraphs.length < 2) return null;
  return { title, description, keywords, image, paragraphs };
}

// Trazi englesku verziju stranice ako postoji na paralelnom /en/ putu -
// isti obrazac kao apps/portal/en/gnk-aktual/ nasuprot apps/portal/gnk-aktual/.
function readEnglishArticle(routePath) {
  const enPath = routePath.startsWith('/en/') ? routePath : '/en' + routePath;
  return readArticle(enPath);
}

function toMarkdown(paragraphs) {
  return paragraphs.join('\n\n');
}

async function objaviNaDevto(clanak, item) {
  const frontmatter = {
    title: clanak.title.slice(0, 128),
    published: true,
    tags: BASE_TAGS,
    canonical_url: SITE + item.path,
    description: clanak.description.slice(0, 200),
  };
  if (clanak.image) frontmatter.cover_image = clanak.image;

  const body_markdown =
    `${toMarkdown(clanak.paragraphs)}\n\n` +
    `---\n*Autor: Nermin Sefić, GNK ASG d.o.o. Izvorni članak: [gnk-asg.hr](${SITE}${item.path})*`;

  const r = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ article: { ...frontmatter, body_markdown } }),
  });
  if (!r.ok) throw new Error(`Dev.to ${r.status}: ${await r.text()}`);
  return r.json();
}

async function main() {
  const registry = readJson(REGISTRY, { items: [] });
  const state = readJson(STATE, { posted: {} });

  const svi = registry.items || [];
  // Dvije vrste engleskog sadrzaja u registru:
  //  1. Kolumne - HR zapis, EN stranica na zrcaljenoj putanji /en/<isti put>/
  //  2. Komentari/objave - vlastiti EN zapis s poljem lang:"en" i vlastitim slugom
  const enZapisi = svi.filter((i) => i.lang === 'en');
  const hrZapisiBezEn = svi.filter((i) => i.lang !== 'en' && !enZapisi.some((e) => e.path.includes(i.slug)));

  const pending = [];
  // Spremni prvi, uvijek - inace 150+ hrvatskih zapisa bez prijevoda ispuni
  // cijelu seriju prije nego se uopce dodje do onih koji su stvarno spremni.
  for (const item of enZapisi.sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0))) {
    if (!item.path || state.posted[item.path]) continue;
    pending.push({ item, direktno: true });
  }
  for (const item of hrZapisiBezEn.sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0))) {
    if (!item.path || state.posted[item.path]) continue;
    pending.push({ item, direktno: false });
  }

  console.log(`U registru ukupno: ${svi.length}. Cekaju na Dev.to: ${pending.length}.`);

  const batch = pending.slice(0, PER_RUN);
  const rezultat = { poslano: 0, preskoceno_bez_en: 0, preskoceno_bez_sadrzaja: 0, greske: [] };

  for (const { item, direktno } of batch) {
    const clanakEn = direktno ? readArticle(item.path) : readEnglishArticle(item.path);
    if (!clanakEn) {
      rezultat.preskoceno_bez_en++;
      continue;
    }

    if (!LIVE) {
      console.log(`[PRIPREMA] bi poslao: ${clanakEn.title}`);
      rezultat.poslano++;
      continue;
    }

    try {
      const objava = await objaviNaDevto(clanakEn, item);
      state.posted[item.path] = { at: new Date().toISOString(), devtoUrl: objava.url, id: objava.id };
      rezultat.poslano++;
      console.log(`Objavljeno: ${objava.url}`);
    } catch (e) {
      rezultat.greske.push({ path: item.path, error: String(e).slice(0, 200) });
      console.error(`Greska za ${item.path}:`, e.message || e);
    }
    await sleep(PAUSE_MS);
  }

  if (LIVE) writeJson(STATE, state);
  writeJson(resolve('apps/portal/data/devto-content/zadnji-rezultat.json'), {
    kad: new Date().toISOString(), ...rezultat,
  });
  console.log('\nSazetak:', JSON.stringify(rezultat, null, 2));
}

if (LIVE && !API_KEY) {
  console.error('DEVTO_API_KEY nije postavljen - radim u nacinu pripreme.');
}
main();
