#!/usr/bin/env node
/**
 * GNK ASG -> Tumblr controlled mirror (nermin-sefic.tumblr.com).
 * gnk-asg.hr remains canonical. Tumblr NPF limits each text block to 4096
 * characters, therefore long-form articles are split into bounded blocks.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHmac, randomBytes } from 'node:crypto';
import { publishedItems } from './lib/publication-gate-v2.mjs';

const PORTAL = resolve('apps/portal');
const REGISTRY = resolve('apps/portal/data/editorial-registry.json');
const STATE = resolve('apps/portal/data/tumblr-content/published.json');
const RESULT = resolve('apps/portal/data/tumblr-content/zadnji-rezultat.json');
const SITE = 'https://gnk-asg.hr';
const BLOG = 'nermin-sefic.tumblr.com';
const PER_RUN = Number(process.env.TUMBLR_PER_RUN || 6);
const PAUSE_MS = Number(process.env.TUMBLR_PAUSE_MS || 3000);
const LIVE = process.argv.includes('--live');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CK = process.env.TUMBLR_CONSUMER_KEY;
const CS = process.env.TUMBLR_CONSUMER_SECRET;
const TOK = process.env.TUMBLR_TOKEN;
const TOKS = process.env.TUMBLR_TOKEN_SECRET;

const readJson = (p, fallback) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } };
const writeJson = (p, data) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8'); };
const unescapeHtml = (s = '') => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function readArticle(routePath) {
  const file = resolve(PORTAL, '.' + routePath, 'index.html');
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const meta = (name, attr = 'name') => { const m = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`)); return m ? unescapeHtml(m[1]) : ''; };
  const title = (meta('og:title', 'property') || (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1]).split(' | ')[0].trim();
  const description = meta('description');
  const image = meta('og:image', 'property');
  const body = (html.match(/<main[\s\S]*?<\/main>/) || [])[0] || (html.match(/<article[\s\S]*?<\/article>/) || [])[0] || html;
  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => unescapeHtml(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter((t) => t.length > 80);
  if (!title || paragraphs.length < 2) return null;
  return { title, description, image, paragraphs };
}

function readEnglishArticle(routePath) {
  const enPath = routePath.startsWith('/en/') ? routePath : '/en' + routePath;
  return readArticle(enPath);
}

function splitText(text, limit = 3800) {
  const value = String(text || '').trim();
  if (!value) return [];
  if (value.length <= limit) return [value];
  const chunks = [];
  let rest = value;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf(' ', limit);
    if (cut < Math.floor(limit * 0.6)) cut = limit;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function textBlocks(clanak, item) {
  const blocks = [
    { type: 'text', text: clanak.title },
    { type: 'text', text: 'Autor: Nermin Sefić, GNK ASG d.o.o.' }, { type: 'text', text: 'Odobrio urednik: Nermin Sefić — GNK ASG (GNK DINAMO Ltd.)' },
  ];
  for (const paragraph of clanak.paragraphs) {
    for (const chunk of splitText(paragraph)) blocks.push({ type: 'text', text: chunk });
  }
  blocks.push({ type: 'text', text: `Izvorni članak: ${SITE}${item.path}` });
  return blocks;
}

function pct(s) { return encodeURIComponent(s).replace(/[!*()']/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()); }

function oauthHeader(method, url, extraParams = {}) {
  const params = {
    oauth_consumer_key: CK,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: TOK,
    oauth_version: '1.0',
  };
  const allParams = { ...params, ...extraParams };
  const baseParams = Object.keys(allParams).sort().map((k) => pct(k) + '=' + pct(allParams[k])).join('&');
  const baseString = method + '&' + pct(url) + '&' + pct(baseParams);
  const signingKey = pct(CS) + '&' + pct(TOKS);
  params.oauth_signature = createHmac('sha1', signingKey).update(baseString).digest('base64');
  return 'OAuth ' + Object.keys(params).sort().map((k) => pct(k) + '="' + pct(params[k]) + '"').join(', ');
}

async function publishTumblr(clanak, item) {
  const url = `https://api.tumblr.com/v2/blog/${BLOG}/posts`;
  const content = textBlocks(clanak, item);
  if (content.some((b) => b.type === 'text' && b.text.length > 4096)) throw new Error('Tumblr local validation: text block exceeds 4096 characters');
  if (content.length > 1000) throw new Error('Tumblr local validation: post exceeds 1000 content blocks');

  const body = {
    content,
    tags: 'NerminSefic,GNKASG,GNKDINAMOLtd',
    state: 'published',
  };
  const auth = oauthHeader('POST', url);
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Tumblr ${r.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  const registry = readJson(REGISTRY, { items: [] });
  const state = readJson(STATE, { posted: {} });
  const publicRegistry = publishedItems(registry);
  const enZapisi = publicRegistry.filter((i) => (i.language || i.lang) === 'en');
  const hrZapisiBezEn = publicRegistry.filter((i) => (i.language || i.lang) !== 'en' && !enZapisi.some((e) => e.path.includes(i.slug)));
  const pending = [];

  for (const item of enZapisi.sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0))) {
    if (item.path && !state.posted[item.path]) pending.push({ item, direktno: true });
  }
  for (const item of hrZapisiBezEn.sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0))) {
    if (item.path && !state.posted[item.path]) pending.push({ item, direktno: false });
  }

  console.log(`U registru ukupno: ${(registry.items || []).length}. Cekaju na Tumblr: ${pending.length}.`);
  const rezultat = { poslano: 0, preskoceno_bez_en: 0, greske: [] };

  for (const { item, direktno } of pending.slice(0, PER_RUN)) {
    const clanak = readArticle(item.path); // ispravljeno 8.8.2026: obje grane (EN i HR-bez-EN) imaju ispravnu vlastitu putanju, readEnglishArticle ovdje uvijek vracao null za HR-bez-EN stavke
    if (!clanak) { rezultat.preskoceno_bez_en++; continue; }
    if (!LIVE) {
      const blocks = textBlocks(clanak, item);
      console.log(`[PRIPREMA] ${clanak.title} -> ${blocks.length} NPF blocks; max=${Math.max(...blocks.map((b) => b.text?.length || 0))}`);
      rezultat.poslano++;
      continue;
    }
    try {
      const objava = await publishTumblr(clanak, item);
      const id = objava?.response?.id || objava?.response?.post?.id;
      state.posted[item.path] = {
        at: new Date().toISOString(),
        tumblrUrl: objava?.response?.post?.url || (id ? `https://${BLOG}/post/${id}` : `https://${BLOG}`),
        id,
      };
      rezultat.poslano++;
      console.log(`Objavljeno: ${JSON.stringify(state.posted[item.path])}`);
      if (LIVE) writeJson(STATE, state); // zapisi odmah, ne cekaj kraj petlje
    } catch (e) {
      rezultat.greske.push({ path: item.path, error: String(e).slice(0, 500), stack: String(e?.stack || '').slice(0, 800) });
      console.error(`Greska za ${item.path}:`, e?.stack || e.message || e);
    }
    writeJson(RESULT, { kad: new Date().toISOString(), ...rezultat }); // postupno stanje, prezivi crash
    await sleep(PAUSE_MS);
  }

  if (LIVE) writeJson(STATE, state);
  writeJson(RESULT, { kad: new Date().toISOString(), ...rezultat });
  console.log('\nSazetak:', JSON.stringify(rezultat, null, 2));
  // ne rusimo cijeli exit kod zbog pojedinacnih grešaka - djelomican uspjeh je i dalje uspjeh
  // za nocnu automatizaciju; potpun neuspjeh (0 poslano, ima grešaka) i dalje signaliziramo
  if (rezultat.greske.length && rezultat.poslano === 0 && pending.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('KRITIČNA GREŠKA:', e?.stack || e);
  process.exitCode = 1;
});
