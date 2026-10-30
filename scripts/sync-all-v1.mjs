#!/usr/bin/env node
/**
 * JEDNA SINKRONIZACIJA — jedan redoslijed za sve.
 *
 * Do 24. 10. 2026. redoslijed izgradnje živio je u dvije kopije: u
 * `.github/workflows/region-daily.yml` i u glavi onoga koji je ručno pokretao
 * buildove. Kad se te dvije kopije raziđu, nastane tišina koju nitko ne vidi:
 * generator prepiše stranicu i izbriše sloj koji je bio primijenjen prije
 * njega — tako je `/status/` ostao bez znaka kuće, a Knowledge Center bez
 * `entity:v1` bloka, i to se otkrilo tek na CI-u.
 *
 * Ova skripta je jedini popis koraka. Workflow je zove, čovjek je zove, gate
 * provjerava da se popis nije razišao s workflowom.
 *
 * Redoslijed je pravilo, ne stvar sreće:
 *   1. `generate` — svi generatori (svaki piše svoje stranice iz podataka),
 *   2. `layers`   — slojevi koji se primjenjuju na SVE stranice (entitet,
 *                   traka, znak, tokeni, društvene kartice, sitemap),
 *   3. `audit`    — provjere koje moraju proći prije objave.
 *
 * Sloj NIKAD ne smije ići prije generatora: generator briše ono što sloj
 * upiše. Zato `tests/test-sync-pipeline-v1.mjs` pada ako se u popisu nađe
 * `apply-*` prije ijednog `build`/generatora.
 *
 *   node scripts/sync-all-v1.mjs              # sve (generiraj → slojevi → auditi)
 *   node scripts/sync-all-v1.mjs --group=layers
 *   node scripts/sync-all-v1.mjs --check      # samo provjere, bez pisanja
 *   node scripts/sync-all-v1.mjs --fast       # preskoči najsporije (region)
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const FAST = argv.includes('--fast');
const groupArg = (argv.find((a) => a.startsWith('--group=')) || '').split('=')[1] || 'all';
const only = (argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';

/*
 * `slow: true` = korak traje dulje od minute (region rebuild ~10 min).
 * `optional: true` = korak smije pasti uz upozorenje (vanjska ovisnost).
 * `check` = kako se korak provjerava bez pisanja (kad postoji).
 */
export const STEPS = [
  /* ---------- 1. GENERATORI ---------- */
  { id: 'region-channels', group: 'generate', slow: true, file: 'apps/region/engine/build.mjs', why: 'stranice 17 gradskih izdanja' },
  { id: 'region-hub', group: 'generate', file: 'apps/region/engine/hub.mjs', why: 'središnja ploča AKTUAL MEDIA (HR/EN)' },
  { id: 'world-portals', group: 'generate', file: 'apps/world/build.mjs', why: 'devet svjetskih portala' },
  { id: 'sites-network', group: 'generate', file: 'apps/sites/build.mjs', why: 'šest samostalnih webova' },
  { id: 'arhiva', group: 'generate', file: 'apps/arhiva/engine/build.mjs', why: 'arhiva AKTUAL' },
  { id: 'dnevnik', group: 'generate', file: 'apps/dnevnik/engine/build.mjs', why: 'dnevnik AKTUAL' },
  { id: 'kanal', group: 'generate', file: 'apps/kanal/build.mjs', why: 'KANAL — dnevni pregled' },
  { id: 'prenos-hub', group: 'generate', file: 'scripts/build-prenos-hub-v1.mjs', check: ['--check'], why: 'popis prijenosa HR/EN' },
  { id: 'prenos-crosslinks', group: 'generate', file: 'scripts/apply-prenos-crosslinks-v1.mjs', check: ['--check'], why: 'veza na izvornik u svakom prenosu' },
  { id: 'top-teme', group: 'generate', file: 'scripts/build-top-teme-v1.mjs', why: 'najčitanije teme' },
  { id: 'coverage', group: 'generate', file: 'scripts/build-coverage-page-v1.mjs', why: 'pokrivenost svijeta' },
  { id: 'status-page', group: 'generate', file: 'scripts/build-status-page-v1.mjs', why: 'status ažurnosti' },
  { id: 'status-snapshot', group: 'generate', file: 'scripts/public-status-snapshot-v1.mjs', why: 'javni zapis statusa' },
  { id: 'products', group: 'generate', file: 'scripts/build-aktual-products-v1.mjs', why: 'popis proizvoda AKTUAL MEDIA' },
  { id: 'sync-status', group: 'generate', file: 'scripts/build-sync-status-v1.mjs', check: ['--check'], why: 'nadzorna ploča sinkronizacije' },
  { id: 'satellite-brand', group: 'generate', file: 'scripts/build-satellite-brand-v1.mjs', optional: true, why: 'znakovi satelita' },
  { id: 'knowledge-en', group: 'generate', file: 'scripts/generate-en-knowledge-center-v1.mjs', optional: true, why: 'EN knowledge center' },
  { id: 'world-expansion', group: 'generate', file: 'scripts/plan-world-expansion-v1.mjs', optional: true, why: 'plan novih zemalja' },
  { id: 'brand-gallery', group: 'generate', file: 'scripts/build-brand-gallery-v1.mjs', optional: true, why: 'galerija znakova' },

  /* ---------- 2. SLOJEVI ---------- */
  { id: 'ribbon', group: 'layers', file: 'scripts/apply-house-ribbon-v1.mjs', why: 'traka kuće' },
  { id: 'brand-mark', group: 'layers', file: 'scripts/apply-brand-mark-v1.mjs', check: ['--check'], why: 'jedan znak i ikona' },
  { id: 'design-tokens', group: 'layers', file: 'scripts/apply-design-tokens-v1.mjs', check: ['--check'], why: 'jedan dizajn sustav' },
  { id: 'image-sitemap', group: 'layers', file: 'scripts/prune-image-sitemap-v1.mjs', why: 'sitemap bez mrtvih slika' },
  { id: 'knowledge-sync', group: 'layers', file: 'scripts/knowledge-center-hr-sync-v1.mjs', args: ['--apply'], why: 'HR/EN knowledge center u paru' },
  /* Brojevi i osvježavanje idu prije provjera: brojevi zato što ih svaki
     generator čita, osvježavanje zato što prepisuje svaku stranicu i mora
     biti zadnji sloj. */
  { id: 'network-counts', group: 'layers', file: 'scripts/build-network-counts-v1.mjs', check: ['--check'], why: 'jedan izvor brojeva' },
  { id: 'pages-inventory', group: 'layers', file: 'scripts/build-pages-inventory-v1.mjs', check: ['--check'], why: 'popis svih stranica + izvještaj' },
  { id: 'author-band', group: 'layers', file: 'scripts/apply-author-band-v1.mjs', check: ['--check'], why: 'autorska traka urednika na svakoj rukom pisanoj stranici' },
  { id: 'impressum', group: 'layers', file: 'scripts/apply-impressum-v1.mjs', args: ['--all', '--icon', '--refresh'], why: 'impressum i ikona na svakoj rukom pisanoj stranici' },
  { id: 'house-icons', group: 'layers', file: 'scripts/ensure-house-icons-v1.mjs', check: ['--check'], why: 'ikonа kuće postoji na svakoj adresi na koju stranica pokazuje' },
  { id: 'listing-shell', group: 'layers', file: 'scripts/fix-editorial-listing-shell-v1.mjs', check: ['--check'], why: 'popisi bez </body> dobivaju zatvoren dokument, impressum i traku' },
  { id: 'agents-page', group: 'layers', file: 'scripts/build-agents-page-v1.mjs', why: 'javna ploča agenata' },
  { id: 'social-cards', group: 'layers', file: 'scripts/apply-social-card-meta-v1.mjs', why: 'OG/Twitter kartice (nakon generatora agenti/sve-stranice, prije osvježavanja)' },
  { id: 'refresh', group: 'layers', file: 'scripts/apply-refresh-v1.mjs', check: ['--check'], why: 'osvježavanje na svakoj stranici' },
  { id: 'entity', group: 'layers', file: 'scripts/apply-network-entity-v1.mjs', why: 'entity:v1 graf na svakoj stranici' },
  { id: 'agent-sitemap-index', group: 'layers', file: 'scripts/ensure-agent-sitemap-index-v1.mjs', why: 'sitemap pregleda agenata u sitemap-indeksu' },
  { id: 'nermin-tags', group: 'layers', file: 'scripts/apply-nermin-tags-v1.mjs', args: ['--all'], why: 'oznake Nermina Sefića: 152 njegove stranice i glavne AKTUAL MEDIA stranice (početna, izdanja, mreža, gradovi)' },

  /* ---------- 3. PROVJERE ---------- */
  { id: 'region-audit', group: 'audit', file: 'apps/region/engine/audit.mjs', why: 'izdanja — unutrašnja dosljednost' },
  { id: 'brand-indexability', group: 'audit', file: 'scripts/audit-aktual-brand-indexability-v1.mjs', args: ['--strict'], why: 'brend i indeksiranje' },
  { id: 'brand-contract', group: 'audit', file: 'scripts/audit-brand-contract-v1.mjs', why: 'jedno ime, jedan znak, jedan izdavač' },
  { id: 'top-teme-audit', group: 'audit', file: 'scripts/audit-top-teme-v1.mjs', why: 'teme bez praznih veza' },
  { id: 'web-standard', group: 'audit', file: 'tests/test-web-standard-v1.mjs', why: 'standard svakog weba: osvježavanje, impressum, ikona, traka' }
];

const groups = groupArg === 'all' ? ['generate', 'layers', 'audit'] : groupArg.split(',');

/* Popis koraka mora biti uvoziv: gate ga čita bez pokretanja cijelog ciklusa
   (uvoz skripte ne smije ništa pisati). Zato se posao pokreće samo kad je
   datoteka izravno pozvana. */
const INVOKED_DIRECTLY = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

const run = (step) => {
  const target = join(ROOT, step.file);
  if (!existsSync(target)) return { ok: false, status: 'missing', ms: 0, output: 'datoteka ne postoji' };
  const args = [target, ...(step.args || [])];
  const started = Date.now();
  const res = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  return {
    ok: res.status === 0,
    status: res.status,
    ms: Date.now() - started,
    output: `${res.stdout || ''}${res.stderr || ''}`.slice(-1200)
  };
};

function main() {
const results = [];
let failed = 0;

for (const step of STEPS) {
  if (!groups.includes(step.group)) continue;
  if (only && step.id !== only) continue;
  if (CHECK) {
    /* U načinu provjere izvršavaju se samo koraci koji znaju provjeriti bez
       pisanja; generatori se preskaču jer bi prepisali radno stablo. */
    if (!step.check) { results.push({ id: step.id, status: 'skipped', ms: 0 }); continue; }
  } else if (FAST && step.slow) {
    results.push({ id: step.id, status: 'skipped:slow', ms: 0 });
    continue;
  }

  const stepToRun = { ...step, args: CHECK ? (step.check || step.args || []) : step.args };
  const outcome = run(stepToRun);
  results.push({ id: step.id, group: step.group, status: outcome.ok ? 'ok' : (step.optional ? 'warn' : 'fail'), ms: outcome.ms, why: step.why });
  if (!outcome.ok) {
    if (step.optional) {
      console.log(`! ${step.id} — ${step.why} (neobavezno, nastavljam)`);
    } else {
      failed += 1;
      console.log(`✗ ${step.id} — ${step.why}`);
      console.log(outcome.output);
    }
  } else {
    console.log(`✓ ${step.id} — ${step.why} (${Math.round(outcome.ms / 100) / 10}s)`);
  }
}

const report = {
  version: 'AKTUAL_MEDIA_SYNC_PIPELINE_V1',
  mode: CHECK ? 'check' : 'apply',
  groups,
  steps: results.length,
  ok: results.filter((r) => r.status === 'ok').length,
  skipped: results.filter((r) => String(r.status).startsWith('skipped')).length,
  failed,
  durationMs: results.reduce((sum, r) => sum + (r.ms || 0), 0)
};
console.log(JSON.stringify(report, null, 2));
process.exit(failed ? 1 : 0);
}

if (INVOKED_DIRECTLY) main();
