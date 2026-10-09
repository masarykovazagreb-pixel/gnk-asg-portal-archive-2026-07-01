#!/usr/bin/env node
// GNK ASG Public Status Center — generator javnog snimka statusa (v1).
//
// Čita SAMO stvarne izvore u repozitoriju i zapisuje apps/portal/data/public_service_status.json.
// Snimak je "repository snapshot": nije uživo praćenje dostupnosti niti vanjski uptime.
// Izlaz se sastavlja isključivo od polja s liste dopuštenih (ALLOWED_* niže).
// Ne uključuje e-mail adrese, IP adrese, hostnameove, tajne, tokene, payment podatke ni apsolutne putanje.
//
// Pokretanje: node scripts/public-status-snapshot-v1.mjs [--check]
//   --check  samo provjeri da bi snimak nastao i da prolazi allowlistu, bez pisanja datoteka

import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = path.join(ROOT, 'apps/portal');
const OUT = path.join(PORTAL, 'data/public_service_status.json');
const HISTORY = path.join(PORTAL, 'data/public_service_status_history.json');
const CHECK_ONLY = process.argv.includes('--check');
const HISTORY_LIMIT = 30;
const SITE = 'https://gnk-asg.hr';

// Dopuštena polja izlaza. Sve što nije ovdje se odbacuje.
const ALLOWED_TOP = ['schemaVersion', 'generatedAt', 'snapshotType', 'overallStatus', 'notice', 'services', 'quality', 'freshness', 'notMonitored', 'knownLimitations', 'history'];
const ALLOWED_SERVICE = ['id', 'name', 'status', 'checkedAt'];
const ALLOWED_QUALITY = ['sitemapEntries', 'sitemapMissingLocalFiles', 'pagesChecked', 'jsonLdInvalidPages'];
const ALLOWED_FRESHNESS = ['mediaIntelligence', 'siteResources'];
const ALLOWED_HISTORY = ['generatedAt', 'overallStatus'];

// Javne usluge koje se doista nalaze u repozitoriju.
const SERVICES = [
  { id: 'portal', name: 'GNK ASG portal', page: 'index.html' },
  { id: 'developer-tools', name: 'Developer Tools', page: 'developer-tools/index.html' },
  { id: 'data-clinic', name: 'Data Clinic', page: 'data-clinic/index.html' },
  { id: 'methodology-library', name: 'Javna knjižnica metodologija', page: 'metodologije/index.html' },
  { id: 'public-status', name: 'Status centar', page: 'status/index.html' }
];

// Što ovaj snimak NE pokriva, javno i otvoreno.
const NOT_MONITORED = [
  { id: 'adria-pay', name: 'Adria Pay sandbox', reason: 'Nije dio ovog repozitorija; nije praćen ovim snimkom.' },
  { id: 'organism-heartbeat', name: 'Heartbeat organizma', reason: 'Nema izvora heartbeata u repozitoriju; ne prikazuje se.' },
  { id: 'live-uptime', name: 'Vanjski uptime', reason: 'Snimak se generira iz repozitorija, a ne iz živih provjera dostupnosti.' }
];

const KNOWN_LIMITATIONS = [
  'Snimak se generira iz repozitorija, ne iz živih provjera dostupnosti.',
  'Status "operational" znači da su datoteke prisutne, parsirane i u sitemapu, a ne da je ruta dostupna na mreži.',
  'Media Intelligence monitor prikazuje zadnje vrijeme ažuriranja iz izvorne datoteke.',
  'Razina dostupnosti i sigurnosni ugovori Adria Pay sandboxa nisu dio ovog snimka.'
];

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function walkIndexFiles(dir, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === '__preview' || e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkIndexFiles(full, out);
    else if (e.name === 'index.html') out.push(full);
  }
  return out;
}

function locToLocalFile(loc) {
  let u;
  try { u = new URL(loc); } catch { return null; }
  if (u.origin !== SITE) return null;
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith('/')) p += 'index.html';
  else if (!p.endsWith('.html')) return null; // ne provjeravamo ne-HTML resurse ovdje
  return path.join(PORTAL, p);
}

// Provjeravamo statične JSON-LD blokove (sadržaj počinje s { ili [).
// Blokovi čiji sadržaj počinje JavaScriptom grade se u vrijeme izvođenja i nisu statički JSON; preskačemo ih.
function hasJsonLdErrors(html) {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    const content = b[1].trim();
    if (!/^[\[{]/.test(content)) continue;
    try { JSON.parse(content); } catch { return true; }
  }
  return false;
}

async function buildSnapshot(now) {
  const checkedAt = now.toISOString();

  // Sitemap
  const sitemap = await readFile(path.join(PORTAL, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  let missing = 0;
  for (const loc of locs) {
    const file = locToLocalFile(loc);
    if (file && !(await exists(file))) missing++;
  }

  // JSON-LD ispravnost na svim javnim stranicama
  const pages = await walkIndexFiles(PORTAL);
  let jsonLdInvalid = 0;
  for (const file of pages) {
    const html = await readFile(file, 'utf8');
    if (/<meta[^>]+content=["'][^"']*noindex/i.test(html.slice(0, 20000))) continue;
    if (hasJsonLdErrors(html)) jsonLdInvalid++;
  }

  // Usluge
  const services = [];
  for (const s of SERVICES) {
    const file = path.join(PORTAL, s.page);
    let status = 'degraded';
    if (await exists(file)) {
      const html = await readFile(file, 'utf8');
      const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
      const hasTitle = /<title[\s>]/i.test(html);
      const jsonOk = !hasJsonLdErrors(html);
      if (hasCanonical && hasTitle && jsonOk) status = 'operational';
    }
    services.push({ id: s.id, name: s.name, status, checkedAt });
  }

  // Media Intelligence: zadnje ažuriranje iz izvorne datoteke
  let mediaIntel = { status: 'unknown', lastUpdateAt: null, ageDays: null };
  const mediaFile = path.join(PORTAL, 'data/media_monitor_status.json');
  if (await exists(mediaFile)) {
    const m = JSON.parse(await readFile(mediaFile, 'utf8'));
    const t = Date.parse(m.updated_at);
    if (!Number.isNaN(t)) {
      const ageDays = Math.floor((now.getTime() - t) / 86400000);
      mediaIntel = {
        status: ageDays <= 7 ? 'fresh' : 'stale',
        lastUpdateAt: new Date(t).toISOString(),
        ageDays
      };
    }
  }

  // Svježina ostalih javnih izvora iz freshness snimka
  const siteResources = [];
  const freshFile = path.join(PORTAL, 'data/freshness-status.json');
  if (await exists(freshFile)) {
    const f = JSON.parse(await readFile(freshFile, 'utf8'));
    for (const [key, r] of Object.entries(f.resources || {})) {
      siteResources.push({ id: key, name: String(r.name), status: r.state === 'fresh' ? 'fresh' : 'stale' });
    }
  }

  const degraded = services.some((s) => s.status !== 'operational') || missing > 0 || jsonLdInvalid > 0 || mediaIntel.status === 'stale';
  const overallStatus = degraded ? 'degraded' : 'operational';

  return {
    schemaVersion: '1.0',
    generatedAt: checkedAt,
    snapshotType: 'repository-snapshot',
    overallStatus,
    notice: 'Repository snapshot, not a live uptime guarantee. Generated from committed files.',
    services,
    quality: {
      sitemapEntries: locs.length,
      sitemapMissingLocalFiles: missing,
      pagesChecked: pages.length,
      jsonLdInvalidPages: jsonLdInvalid
    },
    freshness: {
      mediaIntelligence: mediaIntel,
      siteResources
    },
    notMonitored: NOT_MONITORED,
    knownLimitations: KNOWN_LIMITATIONS,
    history: []
  };
}

function allowlist(obj, keys) {
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

function sanitize(snapshot) {
  const top = allowlist(snapshot, ALLOWED_TOP);
  top.services = snapshot.services.map((s) => allowlist(s, ALLOWED_SERVICE));
  top.quality = allowlist(snapshot.quality, ALLOWED_QUALITY);
  top.freshness = {
    mediaIntelligence: allowlist(snapshot.freshness.mediaIntelligence, ['status', 'lastUpdateAt', 'ageDays']),
    siteResources: snapshot.freshness.siteResources.map((r) => allowlist(r, ['id', 'name', 'status']))
  };
  top.history = (snapshot.history || []).map((h) => allowlist(h, ALLOWED_HISTORY));
  return top;
}

const FORBIDDEN = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,          // e-mail
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/,                              // IPv4
  /\bDE\d{2}\s?\d{4}/, /\bHR\d{2}\s?\d{4}/,                   // IBAN prefiksi
  /\/home\/|C:\\\\|\/Users\//,                                // apsolutne putanje
  /(?:secret|token|password|passwd|api[_-]?key)\s*[:=]/i,      // tajne
  /\.workers\.dev|\.e2b\.app|\bcloudflare\b/i                 // infrastrukturni detalji
];

function assertSafe(json) {
  for (const re of FORBIDDEN) {
    if (re.test(json)) throw new Error(`Snapshot blocked by allowlist guard: ${re}`);
  }
}

async function main() {
  const now = new Date();
  const snapshot = await buildSnapshot(now);

  let history = [];
  if (await exists(HISTORY)) {
    try { history = JSON.parse(await readFile(HISTORY, 'utf8')); } catch { history = []; }
  }
  const nextHistory = [...history, { generatedAt: snapshot.generatedAt, overallStatus: snapshot.overallStatus }].slice(-HISTORY_LIMIT);
  snapshot.history = nextHistory.slice().reverse();

  const safe = sanitize(snapshot);
  const json = JSON.stringify(safe, null, 2) + '\n';
  assertSafe(json);

  if (CHECK_ONLY) {
    console.log(`OK check: overall=${safe.overallStatus}, sitemap=${safe.quality.sitemapEntries}, missing=${safe.quality.sitemapMissingLocalFiles}, jsonLdInvalid=${safe.quality.jsonLdInvalidPages}`);
    return;
  }
  await writeFile(OUT, json, 'utf8');
  await writeFile(HISTORY, JSON.stringify(nextHistory, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT)} (overall=${safe.overallStatus})`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
