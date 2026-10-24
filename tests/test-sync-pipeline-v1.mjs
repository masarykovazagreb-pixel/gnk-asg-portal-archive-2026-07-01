#!/usr/bin/env node
/**
 * SINKRONIZACIJA JE JEDNA, I REDOSLIJED JE PRAVILO.
 *
 * Dvije su se stvari ovdje ponavljale kao kvar:
 *
 *  1. Workflow i čovjek imali su svaki svoj popis koraka. Kad se raziđu,
 *     generator prepiše stranicu i izbriše sloj primijenjen prije njega —
 *     `/status/` je tako ostao bez znaka kuće, a Knowledge Center bez
 *     `entity:v1`, i to se vidjelo tek na CI-u.
 *  2. Sloj je znao doći prije generatora. Tada je posao uzaludan: generator
 *     ionako prepiše datoteku.
 *
 * Ovaj test pada ako:
 *   • ijedan korak pokazuje na datoteku koja ne postoji,
 *   • se u popisu nađe `layers` prije ijednog `generate`,
 *   • se popis u workflowu razišao s popisom u `scripts/sync-all-v1.mjs`,
 *   • dvije stepke imaju isti id ili istu datoteku.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS } from '../scripts/sync-all-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

/* 1. Svaka datoteka postoji. */
for (const step of STEPS) {
  check(existsSync(join(ROOT, step.file)), `${step.id}: datoteka ${step.file} ne postoji`);
  check(Boolean(step.why), `${step.id}: nema objašnjenja zašto postoji`);
  check(['generate', 'layers', 'audit'].includes(step.group), `${step.id}: nepoznata skupina ${step.group}`);
}

/* 2. Redoslijed: generatori prije slojeva, slojevi prije provjera. */
const order = { generate: 0, layers: 1, audit: 2 };
let lastGroup = -1;
for (const step of STEPS) {
  const current = order[step.group];
  check(current >= lastGroup, `${step.id}: ${step.group} dolazi nakon kasnije skupine — generator bi prepisao sloj`);
  lastGroup = Math.max(lastGroup, current);
}

/* 3. Bez dvostrukih id-eva i bez dvostrukog pisanja iste datoteke. */
const ids = new Set();
const files = new Set();
for (const step of STEPS) {
  check(!ids.has(step.id), `dvostruki id: ${step.id}`);
  ids.add(step.id);
  check(!files.has(step.file), `dvostruka datoteka u popisu: ${step.file}`);
  files.add(step.file);
}

/* 4. Workflow i popis moraju govoriti isto. */
const workflowFile = join(ROOT, '.github/workflows/region-daily.yml');
if (existsSync(workflowFile)) {
  const workflow = readFileSync(workflowFile, 'utf8');
  const referenced = [...workflow.matchAll(/^\s*node\s+(scripts\/[\w./-]+\.mjs|apps\/[\w./-]+\.mjs)/gm)]
    .map((m) => m[1]);
  const known = new Set(STEPS.map((s) => s.file));
  for (const file of new Set(referenced)) {
    /* Workflow smije zvati i korake koji nisu u popisu samo ako su izričito
       označeni kao vanjski (dnevni ciklus, dopuna arhive, album). */
    const allowed = new Set([
      'apps/region/engine/daily.mjs',
      'apps/region/engine/backfill.mjs',
      'apps/portal/scripts/album-nermin-sefic-v1.mjs',
      'scripts/sync-all-v1.mjs'
    ]);
    check(known.has(file) || allowed.has(file), `workflow zove ${file}, a popis sinkronizacije ga ne poznaje`);
  }
}

const report = {
  version: 'AKTUAL_MEDIA_SYNC_PIPELINE_GATE_V1',
  steps: STEPS.length,
  generate: STEPS.filter((s) => s.group === 'generate').length,
  layers: STEPS.filter((s) => s.group === 'layers').length,
  audit: STEPS.filter((s) => s.group === 'audit').length,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 20).join('\n'));
  process.exit(1);
}
