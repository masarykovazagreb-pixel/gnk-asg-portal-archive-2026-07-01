#!/usr/bin/env node
/**
 * GNK ASG -> Dev.to controlled mirror.
 * gnk-asg.hr remains canonical. Existing Dev.to articles are reconciled by
 * canonical_url before publishing so a lost/stale local state file cannot
 * create endless 422 duplicate-canonical retries.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const PORTAL = resolve('apps/portal');
const REGISTRY = resolve('apps/portal/data/editorial-registry.json');
const STATE = resolve('apps/portal/data/devto-content/published.json');
const RESULT = resolve('apps/portal/data/devto-content/zadnji-rezultat.json');
const SITE = 'https://gnk-asg.hr';
const PER_RUN = Number(process.env.DEVTO_PER_RUN || 6);
const PAUSE_MS = Number(process.env.DEVTO_PAUSE_MS || 35000);
const LIVE = process.argv.includes('--live');
const API_KEY = process.env.DEVTO_API_KEY;
const BASE_TAGS = ['business', 'croatia', 'nerminsefic'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const readJson = (p, fallback) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; } };
const writeJson = (p, data) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8'); };
const unescapeHtml = (s = '') => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'");

function normalizeUrl(value = '') {
  try {
    const u = new URL(value);
    u.hash = '';
    u.search = '';
    u.hostname = u.hostname.toLowerCase();
    u.pathname = u.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    return u.toString().replace(/\/$/, '');
  } catch {
    return String(value || '').trim().replace(/\/$/, '');
  }
}

function canonicalFor(item) {
  return normalizeUrl(SITE + item.path);
}

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

function bodyMarkdown(clanak, item) {
  return `*By Nermin Sefić, GNK ASG d.o.o.*\n\n${clanak.paragraphs.join('\n\n')}\n\n---\n*Autor: Nermin Sefić, GNK ASG d.o.o. Izvorni članak: [gnk-asg.hr](${SITE}${item.path})*`;
}

async function fetchAllMyArticles() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const url = `https://dev.to/api/articles/me/all?per_page=1000&page=${page}`;
    const r = await fetch(url, { headers: { 'api-key': API_KEY } });
    if (!r.ok) throw new Error(`Dev.to reconciliation ${r.status}: ${await r.text()}`);
    const batch = await r.json();
    if (!Array.isArray(batch)) throw new Error('Dev.to reconciliation returned non-array payload');
    all.push(...batch);
    if (batch.length < 1000) break;
  }
  return all;
}

async function reconcileState(state, registry) {
  if (!LIVE || !API_KEY) return { reconciled: 0, remote: 0 };
  const remote = await fetchAllMyArticles();
  const byCanonical = new Map();
  for (const article of remote) {
    const key = normalizeUrl(article?.canonical_url || '');
    if (key) byCanonical.set(key, article);
  }
  let reconciled = 0;
  for (const item of registry.items || []) {
    if (!item?.path || state.posted[item.path]) continue;
    const hit = byCanonical.get(canonicalFor(item));
    if (!hit) continue;
    state.posted[item.path] = {
      at: hit.published_at || hit.created_at || new Date().toISOString(),
      reconciledAt: new Date().toISOString(),
      devtoUrl: hit.url,
      id: hit.id,
      canonicalUrl: hit.canonical_url,
    };
    reconciled++;
  }
  if (reconciled) writeJson(STATE, state);
  console.log(`Dev.to reconciliation: remote=${remote.length}, local state additions=${reconciled}.`);
  return { reconciled, remote: remote.length };
}

async function publishArticle(clanak, item) {
  const article = {
    title: clanak.title.slice(0, 128),
    published: true,
    tags: BASE_TAGS,
    canonical_url: SITE + item.path,
    description: clanak.description.slice(0, 200),
    body_markdown: bodyMarkdown(clanak, item),
  };
  if (clanak.image) article.cover_image = clanak.image;
  const r = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ article }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Dev.to ${r.status}: ${text}`);
  return JSON.parse(text);
}

async function reconcileOneAfter422(item, state) {
  const remote = await fetchAllMyArticles();
  const wanted = canonicalFor(item);
  const hit = remote.find((a) => normalizeUrl(a?.canonical_url || '') === wanted);
  if (!hit) return false;
  state.posted[item.path] = {
    at: hit.published_at || new Date().toISOString(),
    reconciledAt: new Date().toISOString(),
    devtoUrl: hit.url,
    id: hit.id,
    canonicalUrl: hit.canonical_url,
  };
  writeJson(STATE, state);
  console.log(`Reconciled after 422: ${item.path} -> ${hit.url}`);
  return true;
}

function isRateLimitError(value) {
  const msg = String(value || '').toLowerCase();
  return msg.includes('dev.to 429') || msg.includes('rate limit');
}

async function main() {
  const registry = readJson(REGISTRY, { items: [] });
  const state = readJson(STATE, { posted: {} });
  const rezultat = { poslano: 0, reconciled: 0, remote: 0, preskoceno_bez_en: 0, rateLimited: false, greske: [] };

  if (LIVE && !API_KEY) throw new Error('DEVTO_API_KEY nije postavljen.');
  try {
    const rec = await reconcileState(state, registry);
    rezultat.reconciled += rec.reconciled;
    rezultat.remote = rec.remote;
  } catch (e) {
    rezultat.greske.push({ stage: 'reconciliation', error: String(e).slice(0, 300) });
    writeJson(RESULT, { kad: new Date().toISOString(), ...rezultat });
    throw e;
  }

  const svi = registry.items || [];
  const enZapisi = svi.filter((i) => i.lang === 'en');
  const hrZapisiBezEn = svi.filter((i) => i.lang !== 'en' && !enZapisi.some((e) => e.path.includes(i.slug)));
  const pending = [];
  for (const item of enZapisi.sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0))) {
    if (item.path && !state.posted[item.path]) pending.push({ item, direktno: true });
  }
  for (const item of hrZapisiBezEn.sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0))) {
    if (item.path && !state.posted[item.path]) pending.push({ item, direktno: false });
  }

  console.log(`U registru ukupno: ${svi.length}. Cekaju na Dev.to nakon reconciliationa: ${pending.length}.`);
  for (const { item, direktno } of pending.slice(0, PER_RUN)) {
    const clanak = direktno ? readArticle(item.path) : readEnglishArticle(item.path);
    if (!clanak) { rezultat.preskoceno_bez_en++; continue; }
    if (!LIVE) { console.log(`[PRIPREMA] bi poslao: ${clanak.title}`); rezultat.poslano++; continue; }
    try {
      const objava = await publishArticle(clanak, item);
      state.posted[item.path] = { at: new Date().toISOString(), devtoUrl: objava.url, id: objava.id, canonicalUrl: objava.canonical_url };
      writeJson(STATE, state);
      rezultat.poslano++;
      console.log(`Objavljeno: ${objava.url}`);
    } catch (e) {
      const msg = String(e);
      if (msg.includes('Dev.to 422') && msg.toLowerCase().includes('canonical')) {
        try {
          if (await reconcileOneAfter422(item, state)) { rezultat.reconciled++; continue; }
        } catch (reconcileError) {
          rezultat.greske.push({ path: item.path, stage: '422-reconciliation', error: String(reconcileError).slice(0, 300) });
        }
      }
      rezultat.greske.push({ path: item.path, error: msg.slice(0, 300) });
      console.error(`Greska za ${item.path}:`, e.message || e);
      if (isRateLimitError(msg)) {
        rezultat.rateLimited = true;
        console.log('Dev.to rate limit reached; stopping this batch cleanly so the next scheduled run can continue.');
        break;
      }
    }
    await sleep(PAUSE_MS);
  }

  if (LIVE) writeJson(STATE, state);
  writeJson(RESULT, { kad: new Date().toISOString(), ...rezultat });
  console.log('\nSazetak:', JSON.stringify(rezultat, null, 2));
  const meaningfulProgress = rezultat.poslano > 0 || rezultat.reconciled > 0;
  if (rezultat.greske.length && !meaningfulProgress && !rezultat.rateLimited && pending.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exitCode = 1;
});
