#!/usr/bin/env node
/**
 * Prijenos objavljenih tekstova na blog (Google Blogger).
 * Sajt je kanonski izvor, blog je preslika s poveznicom na izvornik.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { removeDuplicateIntroParagraph } from './lib/blog-content-v1.mjs';
import { isPublished } from './lib/publication-gate-v2.mjs';

const PORTAL = resolve('apps/portal');
const REGISTRY = resolve('apps/portal/data/editorial-registry.json');
const FEATURED = resolve('apps/portal/data/editorial-featured.json');
const QUEUE = resolve('apps/portal/data/blog-content/queue.json');
const STATE = resolve('apps/portal/data/blog-content/published.json');
const SITE = 'https://gnk-asg.hr';
const BLOG = { name: 'NERMIN SEFIĆ - GNK ASG', url: 'https://nermin-sefic.blogspot.com' };
const PER_RUN = Number(process.env.BLOG_PER_RUN || 6);
const PAUSE_MS = Number(process.env.BLOG_PAUSE_MS || 8000);
const AUTHOR = 'Nermin Sefić';
const PUBLISHER = 'GNK ASG d.o.o.';
const BASE_TAGS = ['GNKASG', 'GNKDINAMOLtd', 'NerminSefic', 'BusinessIntelligence'];
const LIVE = process.argv.includes('--live');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const readJson = (p, fallback) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; }
};
const writeJson = (p, data) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
};
const unescapeHtml = (s = '') => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function readArticle(routePath) {
  const file = resolve(PORTAL, '.' + routePath, 'index.html');
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const meta = (name, attr = 'name') => {
    const m = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`));
    return m ? unescapeHtml(m[1]) : '';
  };
  const title = (meta('og:title', 'property') || (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1])
    .split(' | ')[0].trim();
  const description = meta('description');
  const keywords = meta('keywords').split(',').map((k) => k.trim()).filter(Boolean);
  const image = meta('og:image', 'property');
  const body =
    (html.match(/<main[\s\S]*?<\/main>/) || [])[0] ||
    (html.match(/<article[\s\S]*?<\/article>/) || [])[0] ||
    html
      .replace(/<header[\s\S]*?<\/header>/g, '')
      .replace(/<footer[\s\S]*?<\/footer>/g, '')
      .replace(/<nav[\s\S]*?<\/nav>/g, '')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '');
  const paragraphs = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => unescapeHtml(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 80);
  if (!title || !paragraphs.length) return null;
  const section = keywords.find((k) => /^[A-ZŠĐČĆŽ]/.test(k) && k.split(' ').length <= 4) || '';
  return { path: routePath, url: SITE + routePath, title, description, keywords, image, section, paragraphs };
}

function buildPost(a) {
  const articleParagraphs = removeDuplicateIntroParagraph(a.description, a.paragraphs);
  const tags = [...new Set([...BASE_TAGS, ...a.keywords.map((k) => k.replace(/[^\p{L}\p{N}]/gu, ''))])]
    .filter((t) => t.length > 2 && t.length < 30)
    .slice(0, 12);
  const body = [
    a.image ? `<p><img src="${a.image.startsWith('http') ? a.image : SITE + a.image}" alt="${a.title}" style="max-width:100%;height:auto"></p>` : '',
    `<p><em>Autor: ${AUTHOR}</em></p>`,
    a.description ? `<p><strong>${a.description}</strong></p>` : '',
    ...articleParagraphs.map((p) => `<p>${p}</p>`),
    '<hr>',
    `<p>Cjelovit tekst i izvor: <a href="${a.url}" rel="canonical">${a.url}</a></p>`,
    `<p><em>Odobrio urednik: Nermin Sefić — GNK ASG (GNK DINAMO Ltd.). Autor i urednička odgovornost: ${AUTHOR}. Izdavač: ${PUBLISHER}.</em></p>`,
    `<p>${tags.map((t) => '#' + t).join(' ')}</p>`,
  ].filter(Boolean).join('\n');
  return {
    kind: 'blogger#post',
    title: a.title,
    content: body,
    labels: tags.slice(0, 20),
    _source: a.url,
    _description: a.description,
    _author: AUTHOR,
  };
}

async function accessToken() {
  const { BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET, BLOGGER_REFRESH_TOKEN } = process.env;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: BLOGGER_CLIENT_ID,
      client_secret: BLOGGER_CLIENT_SECRET,
      refresh_token: BLOGGER_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`oauth_${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token;
}

async function publish(post, token) {
  const blogId = process.env.BLOGGER_BLOG_ID;
  const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ kind: post.kind, title: post.title, content: post.content, labels: post.labels }),
  });
  if (!res.ok) throw new Error(`blogger_${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const haveCreds = ['BLOGGER_BLOG_ID', 'BLOGGER_CLIENT_ID', 'BLOGGER_CLIENT_SECRET', 'BLOGGER_REFRESH_TOKEN']
  .every((k) => process.env[k]);
const registry = readJson(REGISTRY, { items: [] });
const featured = readJson(FEATURED, { items: [] });
const state = readJson(STATE, { posted: {} });
const combined = [...(featured.items || []), ...(registry.items || [])].filter((item) => isPublished(item));
const seenPaths = new Set();
const allItems = combined.filter((item) => {
  if (!item?.path || seenPaths.has(item.path)) return false;
  seenPaths.add(item.path);
  return true;
});
const pending = allItems
  .filter((i) => !state.posted[i.path])
  .sort((a, b) => {
    if (Boolean(a.priority) !== Boolean(b.priority)) return a.priority ? -1 : 1;
    return String(a.publishedAt || '').localeCompare(String(b.publishedAt || ''));
  });
const routes = pending.slice(0, PER_RUN).map((i) => i.path);
const remaining = Math.max(0, pending.length - routes.length);
const prepared = [];
const skipped = [];
for (const route of routes) {
  const article = readArticle(route);
  if (!article) { skipped.push({ route, reason: 'stranica nije nadena ili nema dovoljno teksta' }); continue; }
  prepared.push({ route, post: buildPost(article) });
}
const summary = {
  version: 'GNK_ASG_BLOG_PUBLISH_V2_FEATURED',
  generatedAt: new Date().toISOString(),
  blog: BLOG,
  totalInRegistry: allItems.length,
  pending: pending.length,
  remainingAfterRun: remaining,
  perRun: PER_RUN,
  mode: LIVE && haveCreds ? 'live' : 'priprema',
  credentialsPresent: haveCreds,
  credentialCheck: Object.fromEntries(
    ['BLOGGER_BLOG_ID','BLOGGER_CLIENT_ID','BLOGGER_CLIENT_SECRET','BLOGGER_REFRESH_TOKEN']
      .map((k) => [k, process.env[k] ? `duljina ${process.env[k].length}${/\s/.test(process.env[k]) ? ' — SADRZI RAZMAK' : ''}` : 'NEMA'])
  ),
  candidates: routes.length,
  prepared: prepared.length,
  skipped,
  posted: [],
  failed: [],
};
if (LIVE && haveCreds) {
  let token;
  try { token = await accessToken(); }
  catch (e) { summary.failed.push({ route: '*', error: String(e.message || e) }); }
  if (token) {
    for (const [index, { route, post }] of prepared.entries()) {
      if (index) await sleep(PAUSE_MS);
      try {
        const res = await publish(post, token);
        state.posted[route] = { at: new Date().toISOString(), blogUrl: res.url || null, id: res.id || null };
        summary.posted.push({ route, blogUrl: res.url || null });
      } catch (e) {
        const msg = String(e.message || e);
        summary.failed.push({ route, error: msg.slice(0, 200) });
        if (msg.includes('blogger_429')) {
          summary.stoppedEarly = 'Blogger je odbio daljnje objave u ovom prolazu (kvota). Ostatak ide u sljedecem satu.';
          break;
        }
      }
    }
    writeJson(STATE, state);
  }
} else {
  summary.note = haveCreds
    ? 'Pristupni podaci postoje, ali skripta je pokrenuta bez --live.'
    : 'Blog jos nije spojen. Objave su pripremljene i cekaju u redu.';
}
writeJson(QUEUE, { ...summary, queue: prepared.map(({ route, post }) => ({
  route, title: post.title, source: post._source, labels: post.labels, content: post.content,
})) });
console.log(`nacin: ${summary.mode}`);
console.log(`blog: ${BLOG.name} (${BLOG.url})`);
console.log(`u registru: ${summary.totalInRegistry} | ceka: ${pending.length} | u ovom prolazu: ${routes.length} | objavljeno: ${summary.posted.length} | neuspjelo: ${summary.failed.length}`);
if (remaining) console.log(`nakon ovog prolaza ostaje: ${remaining}`);
if (skipped.length) console.log(`preskoceno: ${skipped.length}`);
if (!haveCreds) console.log('\nBlog jos nije spojen — objave cekaju u apps/portal/data/blog-content/queue.json');
if (summary.failed.length) console.error(JSON.stringify(summary.failed, null, 2));
