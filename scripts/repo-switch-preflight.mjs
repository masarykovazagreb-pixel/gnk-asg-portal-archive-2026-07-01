#!/usr/bin/env node
/**
 * Provjera spremnosti ciljnog repozitorija prije prelaska.
 *
 *   GITHUB_TOKEN=<token s pristupom ciljnom repou> \
 *   TARGET_REPO=vlasnik/ime \
 *   node scripts/repo-switch-preflight.mjs
 *
 * Ispisuje sto je spremno, a sto jos fali. Izlazni kod 0 znaci da se moze
 * prijeci; 1 znaci da nesto nedostaje. Nista ne mijenja.
 */
import { readFileSync, existsSync } from 'node:fs';

const MANIFEST = 'ops/repo-switch/manifest.json';
const TARGET = process.env.TARGET_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', x: '\x1b[0m' };
const ok = (m) => console.log(`${C.g}  SPREMNO ${C.x} ${m}`);
const bad = (m) => { console.log(`${C.r}  FALI    ${C.x} ${m}`); problems++; };
const warn = (m) => console.log(`${C.y}  PROVJERI${C.x} ${m}`);
let problems = 0;

if (!existsSync(MANIFEST)) {
  console.error('Nema popisa. Pokreni prvo: node scripts/repo-switch-manifest.mjs');
  process.exit(1);
}
const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));

if (!TARGET || !TOKEN) {
  console.error('Postavi TARGET_REPO i GITHUB_TOKEN.');
  process.exit(1);
}

const api = async (path) => {
  const res = await fetch(`https://api.github.com/repos/${TARGET}${path}`, {
    headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/vnd.github+json' },
  });
  return { status: res.status, body: res.ok ? await res.json() : null };
};

console.log(`\nCiljni repozitorij: ${TARGET}`);
console.log(`Popis izraden:      ${m.generatedAt}\n`);

/* 1. postoji li repozitorij */
const repo = await api('');
if (repo.status !== 200) {
  bad(`repozitorij nije dostupan (HTTP ${repo.status})`);
  console.log('\nDalje se ne moze bez pristupa.');
  process.exit(1);
}
ok(`repozitorij dostupan, zadana grana: ${repo.body.default_branch}`);

/* 2. je li kod stigao mirrorom */
const tree = await api(`/contents/workers`);
if (tree.status === 200) ok('kod je prenesen (mapa workers postoji)');
else bad('kod nije prenesen — pokreni mirror prije prelaska');

/* 3. tajne */
console.log('\nTAJNE');
const secrets = await api('/actions/secrets');
if (secrets.status !== 200) {
  warn(`popis tajni nije citljiv ovim tokenom (HTTP ${secrets.status}) — provjeri rucno u Settings > Secrets`);
  for (const s of m.secrets.required) console.log(`${C.d}     treba: ${s}${C.x}`);
} else {
  const have = new Set((secrets.body.secrets || []).map((s) => s.name));
  for (const s of m.secrets.required) {
    if (have.has(s)) ok(s);
    else bad(`${s}  ${C.d}(koriste: ${(m.secrets.usedBy[s] || []).slice(0, 2).join(', ')})${C.x}`);
  }
}

/* 4. workflowi */
console.log('\nWORKFLOWI');

// Na razini repozitorija Actions mogu biti iskljucene. Dok su iskljucene,
// pojedinacna stanja workflowa nista ne znace jer se nista ne pokrece — i to
// je ispravno stanje za pricuvni repozitorij, jer sprjecava dvostruke objave.
const perms = await api('/actions/permissions');
const actionsOn = perms.status === 200 ? perms.body.enabled : null;
if (actionsOn === false) {
  ok('Actions su iskljucene na razini repozitorija — pricuva miruje, nema dvostrukih objava');
  console.log(`${C.d}     Pojedinacna stanja workflowa provjeravaju se tek pri samom prelasku.${C.x}`);
} else if (actionsOn === true) {
  warn('Actions su UKLJUCENE — ako su ukljucene i u izvornom repozitoriju, objave idu dvaput');
}
let states = {};
for (let page = 1; actionsOn !== false && page <= 6; page++) {
  const r = await api(`/actions/workflows?per_page=100&page=${page}`);
  if (r.status !== 200) break;
  for (const w of r.body.workflows || []) states[w.path.split('/').pop()] = w.state;
  if ((r.body.workflows || []).length < 100) break;
}
if (actionsOn === false) {
  /* namjerno preskoceno */
} else if (!Object.keys(states).length) {
  warn('workflowi jos nisu registrirani — GitHub ih vidi tek nakon prvog pusha na zadanu granu');
} else if (!m.workflows.active) {
  warn('popis nema snimljena stanja; pokreni generator s tokenom');
} else {
  const missing = m.workflows.active.filter((f) => states[f] !== 'active');
  const extra = Object.entries(states).filter(([f, s]) => s === 'active' && !m.workflows.active.includes(f)).map(([f]) => f);
  if (!missing.length) ok(`svih ${m.workflows.active.length} potrebnih workflowa je ukljuceno`);
  else {
    bad(`${missing.length} workflowa nije ukljuceno`);
    missing.slice(0, 12).forEach((f) => console.log(`${C.d}     ${f}${C.x}`));
    if (missing.length > 12) console.log(`${C.d}     …i jos ${missing.length - 12}${C.x}`);
  }
  if (extra.length) warn(`${extra.length} workflowa je ukljuceno a nije na popisu — provjeri da se ne pokrenu dvostruko`);
}

/* 5. zakljucane postavke */
console.log('\nZAKLJUCANE POSTAVKE');
const lockedFile = await api(`/contents/${m.lockedSettings.file}`);
if (lockedFile.status !== 200) {
  bad(`${m.lockedSettings.file} nije prenesen`);
} else {
  const text = Buffer.from(lockedFile.body.content, 'base64').toString('utf8');
  let drift = 0;
  for (const { key, value } of m.lockedSettings.values) {
    const found = (text.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm')) || [])[1];
    if (found !== value) { bad(`${key}: ocekivano "${value}", nadjeno "${found ?? '—'}"`); drift++; }
  }
  if (!drift) ok(`svih ${m.lockedSettings.values.length} zastavica nepromijenjeno (mail ostaje iskljucen)`);
}

/* 6. Cloudflare — ne moze se provjeriti odavde */
console.log('\nCLOUDFLARE');
warn(`${m.cloudflare.workers.length} workera, ${m.cloudflare.routes.length} ruta, vezanja: ` +
     `KV ${m.cloudflare.bindings.kv.length}, D1 ${m.cloudflare.bindings.d1.length}, R2 ${m.cloudflare.bindings.r2.length}`);
console.log(`${C.d}     Ako Cloudflare racun ostaje isti, vezanja se ne diraju — mijenja se samo`);
console.log(`${C.d}     iz kojeg se repozitorija implementira. Ako se mijenja i racun, sve rute i`);
console.log(`${C.d}     vezanja treba ponovno stvoriti prije prelaska.${C.x}`);

console.log('\n' + '-'.repeat(60));
if (problems === 0) {
  console.log(`${C.g}SPREMNO ZA PRELAZAK${C.x} — nista ne nedostaje.\n`);
  process.exit(0);
}
console.log(`${C.r}NIJE SPREMNO${C.x} — ${problems} stavki treba rijesiti.\n`);
process.exit(1);
