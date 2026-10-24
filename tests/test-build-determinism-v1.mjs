#!/usr/bin/env node
/**
 * DETERMINIZAM: ISTI ULAZ, ISTI BAJTOVI.
 *
 * Ako se dvije gradnje istog dana razlikuju, onda se razlikuje i ono što
 * odlazi na mrežu — a test svježine izlaza tada pada bez ijedne stvarne
 * promjene, pa se kvar traži u podacima umjesto u generatoru. Najčešći
 * krivci: `Date.now()` u potpisu, nasumični redoslijed (Set/Map iz datoteka),
 * vrijeme zapisa u datoteci.
 *
 * Test gradi u dvije privremene mape i uspoređuje svaki bajt. Brzi webovi
 * (svijet, mreža, kanal); izdanja se ne grade ovdje jer jedna gradnja traje
 * deset minuta i ne bi stala u gate.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, statSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];

const walk = (dir, out = [], root = dir) => {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out, root);
    else out.push(relative(root, full));
  }
  return out;
};

const TARGETS = [
  { id: 'world-portals', script: 'apps/world/build.mjs', env: 'WORLD_OUT' },
  { id: 'sites-network', script: 'apps/sites/build.mjs', env: 'SITES_OUT' },
  { id: 'kanal', script: 'apps/kanal/build.mjs', env: 'KANAL_OUT' }
];

const results = [];
for (const target of TARGETS) {
  const a = mkdtempSync(join(tmpdir(), `det-a-${target.id}-`));
  const b = mkdtempSync(join(tmpdir(), `det-b-${target.id}-`));
  const build = (out) => spawnSync(process.execPath, [join(ROOT, target.script)], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, [target.env]: out, NO_COLOR: '1' }
  });

  const first = build(a);
  const second = build(b);
  if (first.status !== 0 || second.status !== 0) {
    fails.push(`${target.id}: gradnja nije prošla (${first.status}/${second.status})`);
    results.push({ id: target.id, ok: false });
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
    continue;
  }

  const filesA = walk(a);
  const filesB = walk(b);
  const diff = [];
  if (filesA.join('\n') !== filesB.join('\n')) {
    const missing = filesA.filter((f) => !filesB.includes(f));
    const extra = filesB.filter((f) => !filesA.includes(f));
    diff.push(`popis datoteka: ${missing.length} nedostaje, ${extra.length} višak`);
  }
  let compared = 0;
  for (const file of filesA) {
    if (!filesB.includes(file)) continue;
    if (!existsSync(join(a, file)) || !existsSync(join(b, file))) { diff.push(`datoteka nestala tijekom testa: ${file}`); continue; }
    compared += 1;
    const x = readFileSync(join(a, file));
    const y = readFileSync(join(b, file));
    if (!x.equals(y)) diff.push(`različit sadržaj: ${file}`);
    if (diff.length > 6) break;
  }
  results.push({ id: target.id, files: compared, ok: diff.length === 0 });
  for (const line of diff.slice(0, 6)) fails.push(`${target.id}: ${line}`);

  rmSync(a, { recursive: true, force: true });
  rmSync(b, { recursive: true, force: true });
}

const report = {
  version: 'AKTUAL_MEDIA_BUILD_DETERMINISM_V1',
  targets: results.length,
  files: results.reduce((sum, r) => sum + (r.files || 0), 0),
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 12).join('\n'));
  process.exit(1);
}
