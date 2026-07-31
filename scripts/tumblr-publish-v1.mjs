#!/usr/bin/env node
/**
 * Prijenos objavljenih tekstova na Tumblr (nermin-sefic.tumblr.com).
 * Isti obrazac kao Dev.to/Blogger - sajt je izvor, Tumblr je preslika.
 *
 *   node scripts/tumblr-publish-v1.mjs            # priprema
 *   node scripts/tumblr-publish-v1.mjs --live      # objavi
 *
 * Tajne (env): TUMBLR_CONSUMER_KEY, TUMBLR_CONSUMER_SECRET,
 *              TUMBLR_TOKEN, TUMBLR_TOKEN_SECRET
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHmac, randomBytes } from 'node:crypto';

const PORTAL = resolve('apps/portal');
const REGISTRY = resolve('apps/portal/data/editorial-registry.json');
const STATE = resolve('apps/portal/data/tumblr-content/published.json');
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

async function objaviNaTumblru(clanak, item) {
  const url = `https://api.tumblr.com/v2/blog/${BLOG}/posts`;
  const body = {
    content: [
      ...(clanak.image ? [{ type: 'image', media: [{ url: clanak.image }] }] : []),
      { type: 'text', text: clanak.title },
      { type: 'text', text: clanak.paragraphs.join('\n\n') + `\n\nAutor: Nermin Sefić, GNK ASG d.o.o. Izvorni članak: ${SITE}${item.path}` },
    ],
    tags: 'NerminSefic,GNKASG,GNKDINAMOLtd',
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
  const enZapisi = (registry.items || []).filter((i) => i.lang === 'en');
  const hrZapisiBezEn = (registry.items || []).filter((i) => i.lang !== 'en' && !enZapisi.some((e) => e.path.includes(i.slug)));

  const pending = [];
  for (const item of enZapisi.sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0))) {
    if (!item.path || state.posted[item.path]) continue;
    pending.push({ item, direktno: true });
  }
  for (const item of hrZapisiBezEn.sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0))) {
    if (!item.path || state.posted[item.path]) continue;
    pending.push({ item, direktno: false });
  }

  console.log(`U registru ukupno: ${(registry.items || []).length}. Cekaju na Tumblr: ${pending.length}.`);
  const batch = pending.slice(0, PER_RUN);
  const rezultat = { poslano: 0, preskoceno_bez_en: 0, greske: [] };

  for (const { item, direktno } of batch) {
    const clanak = direktno ? readArticle(item.path) : readEnglishArticle(item.path);
    if (!clanak) { rezultat.preskoceno_bez_en++; continue; }
    if (!LIVE) { console.log(`[PRIPREMA] bi poslao: ${clanak.title}`); rezultat.poslano++; continue; }
    try {
      const objava = await objaviNaTumblru(clanak, item);
      state.posted[item.path] = { at: new Date().toISOString(), tumblrUrl: objava?.response?.post?.url || `https://${BLOG}/post/${objava?.response?.id}`, id: objava?.response?.id };
      rezultat.poslano++;
      console.log(`Objavljeno: ${JSON.stringify(state.posted[item.path])}`);
    } catch (e) {
      rezultat.greske.push({ path: item.path, error: String(e).slice(0, 300) });
      console.error(`Greska za ${item.path}:`, e.message || e);
    }
    await sleep(PAUSE_MS);
  }

  if (LIVE) writeJson(STATE, state);
  writeJson(resolve('apps/portal/data/tumblr-content/zadnji-rezultat.json'), { kad: new Date().toISOString(), ...rezultat });
  console.log('\nSazetak:', JSON.stringify(rezultat, null, 2));
}

main();
