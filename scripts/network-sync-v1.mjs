#!/usr/bin/env node
/**
 * MREŽA — sinkronizacija četiriju površina iz istih podataka.
 *
 * Šest samostalnih stranica, devet svjetskih portala, arhiva i dnevnik ne
 * dijele samo izgled nego i izvor: apps/region/data/*.json i
 * apps/region/channels.json. Ovaj skript ih gradi istim redom kojim to čine
 * deploy workflowi, pa se lokalno vidi isto što će otići na domene.
 *
 * Ne piše u git i ne dira podatke — samo izlazne mape (apps/sites/site,
 * apps/world/site, apps/arhiva/site, apps/dnevnik/site). Ako build padne,
 * izlazni kod je 1 i ostale površine se ne grade.
 *
 *   node scripts/network-sync-v1.mjs
 *   node scripts/network-sync-v1.mjs --check     # bez pisanja? (gradi kao i inače, pa provjeri mrežu)
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const steps = [
  ['Šest samostalnih stranica', ['node', 'apps/sites/build.mjs']],
  ['Devet svjetskih portala', ['node', 'apps/world/build.mjs']],
  ['Arhiva', ['node', 'apps/arhiva/engine/build.mjs']],
  ['Dnevnik', ['node', 'apps/dnevnik/engine/build.mjs']]
];

const results = [];
for (const [name, cmd] of steps) {
  const started = Date.now();
  const run = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
  const ok = run.status === 0;
  results.push({
    name,
    ok,
    ms: Date.now() - started,
    tail: `${run.stdout || ''}${run.stderr || ''}`.trim().split('\n').slice(-3).join(' | ').slice(0, 400)
  });
  if (!ok) break;
}

let mesh = null;
if (results.every((row) => row.ok)) {
  const check = spawnSync('node', ['tests/test-network-mesh-v1.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
  try { mesh = JSON.parse(String(check.stdout || '').trim()); } catch { mesh = null; }
  results.push({ name: 'Provjera mreže', ok: check.status === 0, ms: 0, tail: mesh ? `${mesh.ok ? 'ok' : 'pad'} · ${mesh.editions} izdanja · ${mesh.portals} portala · ${mesh.core} ulaza · ${mesh.checked} površina` : 'bez JSON izlaza' });
}

const ok = results.every((row) => row.ok);
console.log(JSON.stringify({
  ok,
  version: 'GNK_ASG_NETWORK_SYNC_V1_20261022',
  steps: results,
  editions: mesh?.editions ?? null,
  portals: mesh?.portals ?? null,
  core: mesh?.core ?? null
}, null, 2));
process.exit(ok ? 0 : 1);
