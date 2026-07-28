#!/usr/bin/env node
/**
 * Popis svega što mirror NE prenosi.
 *
 * Mirror gura grane, tagove i datoteke. Ne prenosi tajne, stanja workflowa,
 * Cloudflare rute, KV/D1/R2 vezanja ni DNS. Bez ovog popisa prelazak na drugi
 * repozitorij znači ručno pogađanje što je sve trebalo postaviti.
 *
 *   node scripts/repo-switch-manifest.mjs            # gradi iz repozitorija
 *   GITHUB_TOKEN=... node scripts/repo-switch-manifest.mjs   # + stanja workflowa
 *
 * Zapisuje ops/repo-switch/manifest.json.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const REPO = 'beckuphome-gnk/gnk-asg-portal';
const OUT_DIR = 'ops/repo-switch';
const OUT = join(OUT_DIR, 'manifest.json');

const read = (p) => readFileSync(p, 'utf8');
const listFiles = (dir, filter) => {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (filter(p)) out.push(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
};

/* ---------- 1. tajne koje workflowi traže ---------- */
const workflowFiles = listFiles('.github/workflows', (p) => p.endsWith('.yml') || p.endsWith('.yaml'));
const secrets = new Set();
const usedBy = {};
for (const f of workflowFiles) {
  const s = read(f);
  for (const m of s.matchAll(/secrets\.([A-Z0-9_]+)/g)) {
    if (m[1] === 'GITHUB_TOKEN') continue; // GitHub ga izdaje sam
    secrets.add(m[1]);
    (usedBy[m[1]] ||= []).push(basename(f));
  }
}

/* ---------- 2. workeri, rute i vezanja ---------- */
const tomls = listFiles('workers', (p) => /wrangler.*\.toml$/.test(p));
const workers = tomls.map((f) => {
  const s = read(f);
  const pick = (re) => (s.match(re) || [null, null])[1];
  const all = (re) => [...s.matchAll(re)].map((m) => m[1]);
  return {
    config: f,
    name: pick(/^name\s*=\s*"([^"]+)"/m),
    routes: all(/pattern\s*=\s*"([^"]+)"/g),
    kv: all(/\[\[kv_namespaces\]\][\s\S]{0,240}?binding\s*=\s*"([^"]+)"/g),
    d1: all(/\[\[d1_databases\]\][\s\S]{0,240}?binding\s*=\s*"([^"]+)"/g),
    r2: all(/\[\[r2_buckets\]\][\s\S]{0,240}?binding\s*=\s*"([^"]+)"/g),
    crons: all(/crons\s*=\s*\[([^\]]*)\]/g),
    sendEmail: /\[\[send_email\]\]/.test(s),
  };
});

const bindings = { kv: new Set(), d1: new Set(), r2: new Set() };
for (const w of workers) {
  w.kv.forEach((b) => bindings.kv.add(b));
  w.d1.forEach((b) => bindings.d1.add(b));
  w.r2.forEach((b) => bindings.r2.add(b));
}

/* ---------- 3. zaključane postavke koje se ne smiju uključiti ---------- */
// Mail protokoli stoje namjerno isključeni. Ako se pri prelasku prepišu na
// "true", sustav bi počeo slati poštu s novog repozitorija bez nadzora.
const LOCKED_FILE = 'workers/gnk-asg-direct-operator/wrangler.toml';
const locked = [];
if (existsSync(LOCKED_FILE)) {
  for (const m of read(LOCKED_FILE).matchAll(/^([A-Z0-9_]*(?:MAIL|LIVE|OUTREACH)[A-Z0-9_]*)\s*=\s*"([^"]*)"/gm)) {
    locked.push({ key: m[1], value: m[2] });
  }
}

/* ---------- 4. stanja workflowa (samo uz token) ---------- */
async function workflowStates() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const states = {};
  for (let page = 1; page <= 6; page++) {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows?per_page=100&page=${page}`,
      { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) break;
    const data = await res.json();
    for (const w of data.workflows || []) states[w.path.split('/').pop()] = w.state;
    if ((data.workflows || []).length < 100) break;
  }
  return states;
}

const states = await workflowStates();
const active = states ? Object.entries(states).filter(([, v]) => v === 'active').map(([k]) => k).sort() : null;

/* ---------- 5. zapis ---------- */
const manifest = {
  version: 'GNK_ASG_REPO_SWITCH_MANIFEST_V1',
  generatedAt: new Date().toISOString(),
  sourceRepo: REPO,
  note: 'Popis svega što git mirror ne prenosi. Bez ovoga prelazak nije jedan klik.',

  secrets: {
    required: [...secrets].sort(),
    usedBy,
    warning: 'Vrijednosti se ne mogu procitati preko API-ja niti se smiju spremati u repozitorij. Prenose se rucno.',
  },

  workflows: {
    total: workflowFiles.length,
    activeCount: active ? active.length : null,
    active,
    note: 'Nakon prelaska su SVI workflowi u novom repozitoriju u pocetnom stanju. Ukljucuju se samo oni s popisa; ostali ostaju iskljuceni.',
  },

  cloudflare: {
    workers: workers.map((w) => w.name).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).sort(),
    configs: workers.length,
    routes: [...new Set(workers.flatMap((w) => w.routes))].sort(),
    bindings: {
      kv: [...bindings.kv].sort(),
      d1: [...bindings.d1].sort(),
      r2: [...bindings.r2].sort(),
    },
    note: 'Identifikatori KV/D1/R2 vezuju se na Cloudflare racun, ne na repozitorij. Ako racun ostaje isti, vezanja se ne mijenjaju i samo se prespaja izvor implementacije.',
  },

  lockedSettings: {
    file: LOCKED_FILE,
    values: locked,
    rule: 'Ove vrijednosti moraju ostati identicne nakon prelaska. Provjera Site Functional Readiness pada ako se promijene.',
  },

  workerDetail: workers,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log('zapisano:', OUT);
console.log('  tajni:            ', manifest.secrets.required.length);
console.log('  workflowa:        ', manifest.workflows.total, active ? `(aktivnih ${active.length})` : '(stanja preskocena — nema tokena)');
console.log('  workera:          ', manifest.cloudflare.workers.length);
console.log('  ruta:             ', manifest.cloudflare.routes.length);
console.log('  zakljucanih zastavica:', locked.length);
