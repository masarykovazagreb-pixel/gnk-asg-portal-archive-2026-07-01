#!/usr/bin/env node
/**
 * GNK ASG -> Telegra.ph controlled mirror.
 * gnk-asg.hr ostaje kanonski izvor. Telegraph je javan, legitiman
 * publishing servis (koriste ga novinari i blogeri diljem svijeta,
 * ne zahtijeva registraciju). Svaki objavljen članak sadrži jasnu
 * atribuciju i poveznicu natrag na izvorni članak - isti princip
 * kao postojeći Blogger/Dev.to/Tumblr mirror kanali.
 *
 * NAMJERNO IZOSTAVLJENO (nikad ne implementirati):
 * - skriveni/nevidljivi linkovi
 * - masovno postavljanje istog sadržaja na paste-servise
 * - izmišljeni/neprovjereni profili na trećim platformama
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import https from 'node:https';

const PORTAL = resolve('apps/portal');
const REGISTRY = resolve('apps/portal/data/editorial-registry.json');
const STATE = resolve('apps/portal/data/telegraph-content/published.json');
const SITE = 'https://gnk-asg.hr';
const AUTHOR = 'Nermin Sefić';
const PER_RUN = Number(process.env.TELEGRAPH_PER_RUN || 3);
const PAUSE_MS = Number(process.env.TELEGRAPH_PAUSE_MS || 3000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const readJson = (p, fallback) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } };
const writeJson = (p, data) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8'); };
const unescapeHtml = (s = '') => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function readArticle(routePath) {
  const file = resolve(PORTAL, '.' + routePath, 'index.html');
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const meta = (name, attr = 'name') => { const m = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`)); return m ? unescapeHtml(m[1]) : ''; };
  const title = (meta('og:title', 'property') || (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1]).split(' | ')[0].trim();
  const ogImage = meta('og:image', 'property');
  const body = (html.match(/<article[\s\S]*?<\/article>/) || [])[0] || html;
  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => unescapeHtml(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter((t) => t.length > 40);
  if (!title || paragraphs.length < 2) return null;

  // izvuci SVE slike unutar clanka (ne samo og:image), za bogatiji Telegraph zapis
  const slikeIzTijela = [...body.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)]
    .map((m) => m[1])
    .filter((src) => src.startsWith('http') || src.startsWith('/'))
    .map((src) => (src.startsWith('/') ? `${SITE}${src}` : src))
    .filter((src) => !/logo|watermark|favicon/i.test(src));

  const sveSlike = [...new Set([ogImage, ...slikeIzTijela].filter(Boolean))];

  return { title, images: sveSlike, paragraphs };
}

function telegraphRequest(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname: 'api.telegra.ph', path: `/${method}`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const registry = readJson(REGISTRY, { items: [] });
  const state = readJson(STATE, { posted: {}, accessToken: null });

  if (!state.accessToken) {
    console.log('Nemam pohranjen access_token, kreiram novi anoniman Telegraph racun...');
    const racun = await telegraphRequest('createAccount', {
      short_name: AUTHOR,
      author_name: AUTHOR,
      author_url: `${SITE}/nermin-sefic/`,
    });
    if (!racun.ok || !racun.result?.access_token) {
      console.error('Ne mogu kreirati Telegraph racun:', JSON.stringify(racun));
      process.exit(1);
    }
    state.accessToken = racun.result.access_token;
    console.log('Racun kreiran, token spremljen za buduce pokretanja.');
  }

  const pending = (registry.items || [])
    .filter((i) => i.path && !state.posted[i.path])
    .sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0));

  console.log(`U registru ukupno: ${(registry.items || []).length}. Čekaju na Telegraph: ${pending.length}.`);

  let poslano = 0;
  const greske = [];

  for (const item of pending.slice(0, PER_RUN)) {
    const clanak = readArticle(item.path);
    if (!clanak) { greske.push({ path: item.path, error: 'nema dovoljno sadržaja za člankak' }); continue; }

    const content = [];
    for (const slika of clanak.images.slice(0, 8)) {
      content.push({ tag: 'figure', children: [{ tag: 'img', attrs: { src: slika } }] });
    }
    for (const p of clanak.paragraphs.slice(0, 25)) {
      content.push({ tag: 'p', children: [p] });
    }
    content.push({ tag: 'p', children: ['— — —'] });
    content.push({ tag: 'p', children: ['Izvorni članak objavljen na gnk-asg.hr: '] });
    content.push({ tag: 'a', attrs: { href: `${SITE}${item.path}` }, children: [`${SITE}${item.path}`] });

    try {
      const rezultat = await telegraphRequest('createPage', {
        access_token: state.accessToken,
        title: clanak.title,
        author_name: AUTHOR,
        author_url: `${SITE}/nermin-sefic/`,
        content,
        return_content: false,
      });

      if (rezultat.ok && rezultat.result?.path) {
        const url = `https://telegra.ph/${rezultat.result.path}`;
        state.posted[item.path] = { url, at: new Date().toISOString() };
        poslano++;
        console.log(`OBJAVLJENO: ${clanak.title} -> ${url}`);
      } else {
        greske.push({ path: item.path, error: JSON.stringify(rezultat.error || rezultat) });
        console.log(`GREŠKA za ${item.path}:`, rezultat.error || rezultat);
      }
    } catch (e) {
      greske.push({ path: item.path, error: String(e).slice(0, 300) });
      console.error(`Greška za ${item.path}:`, e.message || e);
    }

    await sleep(PAUSE_MS);
  }

  writeJson(STATE, state);
  writeJson(resolve('apps/portal/data/telegraph-content/zadnji-rezultat.json'), {
    kad: new Date().toISOString(),
    poslano,
    greske,
  });

  console.log(`\nSažetak: poslano ${poslano}, grešaka ${greske.length}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
