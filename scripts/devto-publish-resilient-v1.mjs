#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const PORTAL = resolve('apps/portal');
const REGISTRY = resolve('apps/portal/data/editorial-registry.json');
const STATE = resolve('apps/portal/data/devto-content/published.json');
const HEALTH = resolve('apps/portal/data/devto-content/health.json');
const KILL_SWITCHES = resolve('ops/automation-kill-switches.json');
const SITE = 'https://gnk-asg.hr';

const LIVE_REQUESTED = process.argv.includes('--live');
const API_KEY = String(process.env.DEVTO_API_KEY || '').trim();
const LIVE = LIVE_REQUESTED && API_KEY.length > 0;
const PER_RUN = Math.max(1, Number(process.env.DEVTO_PER_RUN || 3));
const PAUSE_MS = Math.max(0, Number(process.env.DEVTO_PAUSE_MS || 15000));
const MAX_ATTEMPTS = Math.max(1, Number(process.env.DEVTO_MAX_ATTEMPTS || 2));
const BACKOFF_MS = Math.max(1000, Number(process.env.DEVTO_BACKOFF_MS || 60000));
const BASE_TAGS = ['business', 'croatia'];
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const readJson = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
};
const unescapeHtml = (value = '') => value
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'");

function readArticle(routePath) {
  const file = resolve(PORTAL, '.' + routePath, 'index.html');
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const meta = (name, attr = 'name') => {
    const match = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`));
    return match ? unescapeHtml(match[1]) : '';
  };
  const title = (meta('og:title', 'property') || (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1])
    .split(' | ')[0].trim();
  const description = meta('description');
  const image = meta('og:image', 'property');
  const body = (html.match(/<main[\s\S]*?<\/main>/) || [])[0]
    || (html.match(/<article[\s\S]*?<\/article>/) || [])[0]
    || html;
  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((match) => unescapeHtml(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter((text) => text.length > 80);
  if (!title || paragraphs.length < 2) return null;
  return { title, description, image, paragraphs };
}

function candidates(registry, state) {
  const items = registry.items || [];
  const english = items.filter((item) => item.lang === 'en' && item.path);
  const direct = english.map((item) => ({ item, canonicalPath: item.path, articlePath: item.path }));

  const mirrored = items
    .filter((item) => item.lang !== 'en' && item.path && item.path.startsWith('/gnk-aktual/kolumne/'))
    .map((item) => ({ item, canonicalPath: '/en' + item.path, articlePath: '/en' + item.path }))
    .filter((entry) => existsSync(resolve(PORTAL, '.' + entry.articlePath, 'index.html')));

  return [...direct, ...mirrored]
    .filter((entry) => !state.posted[entry.canonicalPath])
    .sort((a, b) => new Date(a.item.publishedAt || 0) - new Date(b.item.publishedAt || 0));
}

async function canonicalIsLive(path) {
  try {
    const response = await fetch(SITE + path, { method: 'HEAD', redirect: 'follow' });
    if (response.ok) return true;
    if (response.status === 405) {
      const fallback = await fetch(SITE + path, { method: 'GET', redirect: 'follow' });
      return fallback.ok;
    }
    return false;
  } catch {
    return false;
  }
}

async function postArticle(article, canonicalPath) {
  const bodyMarkdown = `${article.paragraphs.join('\n\n')}\n\n---\n*Odobrio urednik: Nermin Sefić — GNK ASG (GNK DINAMO Ltd.). Autor: Nermin Sefić, GNK ASG d.o.o. Izvorni članak: [gnk-asg.hr](${SITE}${canonicalPath})*`;
  const payload = {
    article: {
      title: article.title.slice(0, 128),
      published: true,
      tags: BASE_TAGS,
      canonical_url: SITE + canonicalPath,
      description: article.description.slice(0, 200),
      body_markdown: bodyMarkdown,
      ...(article.image ? { cover_image: article.image } : {}),
    },
  };

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch('https://dev.to/api/articles', {
        method: 'POST',
        headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) return { value: await response.json(), attempt };
      const detail = await response.text();
      lastError = new Error(`Dev.to ${response.status}: ${detail.slice(0, 300)}`);
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < MAX_ATTEMPTS) await sleep(BACKOFF_MS * attempt);
  }
  throw lastError || new Error('Dev.to objava nije uspjela.');
}

async function fetchAllMyArticles() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const response = await fetch(`https://dev.to/api/articles/me/all?per_page=1000&page=${page}`, {
      headers: { 'api-key': API_KEY },
    });
    if (!response.ok) throw new Error(`Dev.to reconciliation ${response.status}: ${await response.text()}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Dev.to reconciliation returned non-array payload');
    all.push(...batch);
    if (batch.length < 1000) break;
  }
  return all;
}

function normalizeCanonical(value = '') {
  try {
    const u = new URL(value);
    u.hash = ''; u.search = '';
    u.pathname = u.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
    return u.toString().replace(/\/$/, '');
  } catch {
    return String(value || '').trim().replace(/\/$/, '');
  }
}

async function reconcileState(state, pending) {
  if (!LIVE) return { reconciled: 0 };
  let remote;
  try {
    remote = await fetchAllMyArticles();
  } catch (error) {
    console.error('Dev.to reconciliation failed, continuing without it:', error?.message || error);
    return { reconciled: 0 };
  }
  const byCanonical = new Map();
  for (const article of remote) {
    const key = normalizeCanonical(article?.canonical_url || '');
    if (key) byCanonical.set(key, article);
  }
  let reconciled = 0;
  for (const entry of pending) {
    const wanted = normalizeCanonical(SITE + entry.canonicalPath);
    const hit = byCanonical.get(wanted);
    if (!hit) continue;
    state.posted[entry.canonicalPath] = {
      at: hit.published_at || hit.created_at || new Date().toISOString(),
      devtoUrl: hit.url,
      id: hit.id,
      reconciledAt: new Date().toISOString(),
    };
    reconciled++;
  }
  if (reconciled) writeJson(STATE, state);
  console.log(`Dev.to reconciliation: remote=${remote.length}, local additions=${reconciled}.`);
  return { reconciled };
}

async function reconcileOneAfter422(entry, state) {
  try {
    const remote = await fetchAllMyArticles();
    const wanted = normalizeCanonical(SITE + entry.canonicalPath);
    const hit = remote.find((article) => normalizeCanonical(article?.canonical_url || '') === wanted);
    if (!hit) return false;
    state.posted[entry.canonicalPath] = {
      at: hit.published_at || new Date().toISOString(),
      devtoUrl: hit.url,
      id: hit.id,
      reconciledAt: new Date().toISOString(),
    };
    writeJson(STATE, state);
    console.log(`Reconciled after 422: ${entry.canonicalPath} -> ${hit.url}`);
    return true;
  } catch (error) {
    console.error('Reconcile-after-422 failed:', error?.message || error);
    return false;
  }
}

async function main() {
  const registry = readJson(REGISTRY, { items: [] });
  const state = readJson(STATE, { posted: {} });
  const switches = readJson(KILL_SWITCHES, { channels: {} });
  const devtoPublishEnabled = switches.channels?.devtoPublish?.enabled === true;
  const pending = candidates(registry, state);
  const batch = pending.slice(0, PER_RUN);
  const health = {
    generatedAt: new Date().toISOString(),
    mode: LIVE ? 'live' : 'preview',
    liveRequested: LIVE_REQUESTED,
    secretAvailable: API_KEY.length > 0,
    killSwitchEnabled: devtoPublishEnabled,
    pending: pending.length,
    processed: 0,
    published: 0,
    skippedCanonical: 0,
    skippedContent: 0,
    failures: [],
    attempts: [],
    conclusion: 'success',
  };

  if (LIVE_REQUESTED && !devtoPublishEnabled) {
    health.conclusion = 'blocked-kill-switch';
    writeJson(HEALTH, health);
    console.error('Dev.to live slanje je blokirano kill-switchom; nije poslan nijedan zahtjev.');
    process.exitCode = 2;
    return;
  }

  if (LIVE_REQUESTED && !API_KEY) {
    health.conclusion = 'blocked-missing-secret';
    writeJson(HEALTH, health);
    console.error('DEVTO_API_KEY nije postavljen. Live slanje je blokirano; nije poslan nijedan zahtjev.');
    process.exitCode = 2;
    return;
  }

  if (LIVE) {
    const rec = await reconcileState(state, pending);
    health.reconciled = rec.reconciled;
  }
  const freshBatch = LIVE ? candidates(registry, state).slice(0, PER_RUN) : batch;

  for (const entry of freshBatch) {
    health.processed++;
    const article = readArticle(entry.articlePath);
    if (!article) {
      health.skippedContent++;
      continue;
    }

    if (!LIVE) {
      console.log(`[PRIPREMA] ${entry.canonicalPath} -> ${article.title}`);
      continue;
    }

    if (!(await canonicalIsLive(entry.canonicalPath))) {
      health.skippedCanonical++;
      health.failures.push({ path: entry.canonicalPath, error: 'canonical-not-200' });
      continue;
    }

    try {
      const result = await postArticle(article, entry.canonicalPath);
      state.posted[entry.canonicalPath] = {
        at: new Date().toISOString(),
        devtoUrl: result.value.url,
        id: result.value.id,
      };
      health.published++;
      health.attempts.push({ path: entry.canonicalPath, attempts: result.attempt });
      writeJson(STATE, state);
      console.log(`Objavljeno: ${result.value.url}`);
    } catch (error) {
      const msg = String(error?.message || error);
      if (msg.includes('422') && msg.toLowerCase().includes('canonical')) {
        const fixed = await reconcileOneAfter422(entry, state);
        if (fixed) { health.reconciled = (health.reconciled || 0) + 1; await sleep(PAUSE_MS); continue; }
      }
      health.failures.push({ path: entry.canonicalPath, error: msg.slice(0, 300) });
    }
    await sleep(PAUSE_MS);
  }

  if (health.failures.length) health.conclusion = health.published ? 'partial' : 'failure';
  writeJson(HEALTH, health);
  console.log(JSON.stringify(health, null, 2));
  if (health.conclusion === 'failure') process.exitCode = 1;
}

main().catch((error) => {
  writeJson(HEALTH, {
    generatedAt: new Date().toISOString(),
    mode: LIVE ? 'live' : 'preview',
    conclusion: 'failure',
    failures: [{ error: String(error?.stack || error).slice(0, 1000) }],
  });
  console.error(error);
  process.exitCode = 1;
});
