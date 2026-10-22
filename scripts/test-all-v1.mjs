#!/usr/bin/env node
// GNK ASG — jedan ulaz za sve provjere portala.
//
// Cilj: svaki PR i svaki dnevni self-heal imaju isti, ponovljiv prag.
// Umjesto da se u sjećanju drži "koji se skript još treba pokrenuti",
// ovdje je popis; pokreće se redom, mjeri vrijeme i na kraju ispiše
// sažetak. Ako obavezna provjera padne, izlazni kod je 1.
//
// Pokretanje:
//   node scripts/test-all-v1.mjs          sve provjere
//   node scripts/test-all-v1.mjs --fast   bez sporih (portal + aktual)
//   node scripts/test-all-v1.mjs --json   strojni sažetak na stdout
//
// Provjere označene kao "savjet" (advisory) prikazuju se, ali ne ruše
// izlazni kod — dok se ne poprave, moraju ostati vidljive, ne skrivene.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const FAST = args.has('--fast');
const JSON_OUT = args.has('--json');

const GATES = [
  { name: 'Vlasništvo automatizacija', cmd: ['node', 'scripts/audit-bot-ownership-v1.mjs'], required: true },
  { name: 'Rasporedi u allowlisti', cmd: ['python3', 'scripts/validate-workflow-schedule-allowlist-v2.py'], required: true },
  { name: 'HR/EN index parity', cmd: ['node', 'scripts/build-index-parity.mjs', '--check'], required: true },
  { name: 'Ploča zdravlja', cmd: ['node', 'scripts/build-health-dashboard-v1.mjs', '--check'], required: true },
  { name: 'AKTUAL MEDIA — svijet', cmd: ['node', 'scripts/test-aktual-media-world-v1.mjs'], required: true },
  { name: 'Top teme dana', cmd: ['node', 'scripts/audit-top-teme-v1.mjs'], required: true },
  { name: 'Javni portal', cmd: ['node', 'scripts/audit-public-portal-v1.mjs'], required: true, slow: true },
  { name: 'AKTUAL MEDIA — sve stranice', cmd: ['node', 'scripts/audit-aktual-all-pages-v2.mjs'], required: true, slow: true },
  { name: 'AKTUAL MEDIA — izdavač, 22 medijske cjeline i sitemapovi', cmd: ['node', 'tests/test-aktual-media-discovery-v1.mjs'], required: true },
  { name: 'WebSite JSON-LD', cmd: ['node', 'scripts/test-website-jsonld-v1.mjs'], required: true },
  { name: 'AKTUAL urednički desk', cmd: ['node', 'scripts/build-aktual-entity-desks-v1.mjs', '--check'], required: true },
  { name: 'S+Chat agent', cmd: ['node', 'tests/test-s-chat-static-v1.mjs'], required: true },
  { name: 'S+Chat evaluacija', cmd: ['node', 'tests/test-s-chat-eval-v1.mjs'], required: true },
  { name: 'HR Knowledge Center', cmd: ['node', 'scripts/knowledge-center-hr-sync-v1.mjs', '--check'], required: true },
  { name: 'Kadenca baze znanja', cmd: ['node', 'tests/test-knowledge-cadence-v1.mjs'], required: true },
  { name: 'Fotografije bez zastora', cmd: ['node', 'tests/test-editorial-photo-clarity-v1.mjs'], required: true },
  { name: 'Posrednik slika', cmd: ['node', 'tests/test-image-proxy-v1.mjs'], required: true },
  { name: 'Sigurnosna zaglavlja', cmd: ['node', 'tests/test-security-headers-v1.mjs'], required: true },
  { name: 'AKTUAL bez JavaScripta', cmd: ['node', 'tests/test-aktual-noscript-v1.mjs'], required: true },
  { name: 'Autonomija 365', cmd: ['node', 'tests/test-autonomy-v1.mjs'], required: true },
  { name: 'Pristupačnost — preskok', cmd: ['node', 'tests/test-a11y-skip-v1.mjs'], required: true },
  { name: 'S+Chat — pitanja s ove stranice', cmd: ['node', 'tests/test-s-chat-context-suggest-v1.mjs'], required: true },
  { name: 'Podatkovni desk', cmd: ['node', 'tests/test-data-desk-v1.mjs'], required: true },
  { name: 'Tehnologija budućnosti', cmd: ['node', 'tests/test-future-tech-v1.mjs'], required: true },
  { name: 'Mreža neovisnih izdanja', cmd: ['node', 'tests/test-sites-network-v1.mjs'], required: true },
  { name: 'SEO matrica mreže', cmd: ['node', 'tests/test-seo-matrix-v1.mjs'], required: true },
  { name: 'Meta higijena — oznake, autor, entitet', cmd: ['node', 'tests/test-meta-hygiene-v1.mjs'], required: true },
  { name: 'Pokrivenost posrednika slika', cmd: ['node', 'tests/test-image-proxy-coverage-v1.mjs'], required: true },
];

function run(gate) {
  const started = Date.now();
  const result = spawnSync(gate.cmd[0], gate.cmd.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1' },
  });
  const ms = Date.now() - started;
  const ok = result.status === 0;
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  return { ...gate, ok, ms, status: result.status, output };
}

const selected = GATES.filter((g) => !(FAST && g.slow));
const results = [];
for (const gate of selected) {
  process.stdout.write(`→ ${gate.name} … `);
  const r = run(gate);
  results.push(r);
  process.stdout.write(`${r.ok ? 'OK' : 'PAD'} (${(r.ms / 1000).toFixed(1)} s)\n`);
  if (!r.ok) {
    const tail = r.output.split('\n').slice(-6).join('\n');
    process.stdout.write(tail.replace(/^/gm, '    ') + '\n');
  }
}

const required = results.filter((r) => r.required);
const failedRequired = required.filter((r) => !r.ok);
const advisoryFailed = results.filter((r) => !r.required && !r.ok);
const passed = results.filter((r) => r.ok).length;

if (JSON_OUT) {
  console.log(JSON.stringify({
    ok: failedRequired.length === 0,
    fast: FAST,
    passed,
    total: results.length,
    failed: failedRequired.map((r) => ({ name: r.name, cmd: r.cmd.join(' ') })),
    advisory: advisoryFailed.map((r) => ({ name: r.name, cmd: r.cmd.join(' ') })),
    gates: results.map((r) => ({ name: r.name, ok: r.ok, required: r.required, ms: r.ms })),
  }, null, 2));
} else {
  console.log('');
  console.log('─'.repeat(62));
  console.log(`Provjere: ${passed}/${results.length} prošlo${FAST ? ' (brzi način)' : ''}`);
  if (failedRequired.length) {
    console.log('Obavezno pada:');
    for (const r of failedRequired) console.log(`  • ${r.name} → ${r.cmd.join(' ')}`);
  }
  if (advisoryFailed.length) {
    console.log('Savjet (ne ruši izlaz):');
    for (const r of advisoryFailed) console.log(`  • ${r.name} → ${r.cmd.join(' ')}`);
  }
  if (!failedRequired.length) console.log('Sve obavezne provjere su zelene.');
  console.log('─'.repeat(62));
}

process.exit(failedRequired.length ? 1 : 0);
