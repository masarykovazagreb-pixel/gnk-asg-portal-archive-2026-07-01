#!/usr/bin/env node
/**
 * MREŽA — pokretač agenata.
 *
 * Jedan proces, dvanaest neovisnih provjera. Svaki agent je zaseban proces:
 * ako jedan padne, ostali se ipak pokrenu i izvještaj pokaže točno gdje je
 * puklo. Ovo nije "AI agent" koji nešto odlučuje — to je popis poslova s
 * imenom, vlasnikom i izlaznim kodom, da se zna tko je što provjerio.
 *
 * Pokretanje:
 *   node scripts/network-agents-v1.mjs                svi agenti
 *   node scripts/network-agents-v1.mjs --only mesh-link-agent,seo-matrix-agent
 *   node scripts/network-agents-v1.mjs --json         samo strojni sažetak
 *
 * Izvještaj se piše u artifacts/network-agents-v1.json (ili u put iz
 * NETWORK_AGENTS_REPORT). Agent koji nije required ne ruši izlazni kod.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = JSON.parse(readFileSync(join(ROOT, 'ops', 'network-agents-v1.json'), 'utf8'));
const args = process.argv.slice(2);
const ONLY = (() => {
  const index = args.indexOf('--only');
  return index >= 0 && args[index + 1] ? new Set(args[index + 1].split(',').map((id) => id.trim())) : null;
})();
const JSON_ONLY = args.includes('--json');
const REPORT = process.env.NETWORK_AGENTS_REPORT
  ? resolve(process.env.NETWORK_AGENTS_REPORT)
  : join(ROOT, 'artifacts', 'network-agents-v1.json');

const agents = REGISTRY.agents.filter((agent) => !ONLY || ONLY.has(agent.id));
if (!agents.length) {
  console.error(JSON.stringify({ ok: false, reason: 'nijedan agent ne odgovara --only filtru', requested: [...(ONLY || [])] }, null, 2));
  process.exit(2);
}

const results = [];
for (const agent of agents) {
  const started = Date.now();
  const run = spawnSync(agent.cmd[0], agent.cmd.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300000,
    env: { ...process.env, NETWORK_AGENT_ID: agent.id }
  });
  const ms = Date.now() - started;
  let parsed = null;
  try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch { parsed = null; }
  const ok = run.status === 0;
  const output = `${run.stdout || ''}${run.stderr || ''}`.trim().split('\n').slice(-6).join('\n');
  results.push({ id: agent.id, name: agent.name, required: agent.required !== false, ok, ms, command: agent.cmd.join(' '), summary: parsed, tail: output.slice(-700) });
  if (!JSON_ONLY) {
    console.log(`${ok ? 'OK  ' : 'PAD '} ${agent.id.padEnd(24)} ${String(ms).padStart(6)} ms  ${agent.name}`);
  }
}

const failed = results.filter((row) => !row.ok && row.required);
const advisory = results.filter((row) => !row.ok && !row.required);
const report = {
  version: 'GNK_ASG_NETWORK_AGENTS_REPORT_V1_20261022',
  generatedAt: new Date().toISOString(),
  ok: failed.length === 0,
  owner: REGISTRY.owner,
  total: results.length,
  passed: results.filter((row) => row.ok).length,
  failed: failed.map((row) => row.id),
  advisory: advisory.map((row) => row.id),
  agents: results
};
mkdirSync(dirname(REPORT), { recursive: true });
writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);

if (JSON_ONLY) {
  console.log(JSON.stringify({ ok: report.ok, passed: report.passed, total: report.total, failed: report.failed, advisory: report.advisory, report: REPORT }, null, 2));
} else {
  console.log('');
  console.log(`Agenti: ${report.passed}/${report.total} prošlo${failed.length ? ` · palo: ${failed.map((row) => row.id).join(', ')}` : ''}`);
  console.log(`Izvještaj: ${REPORT.replace(`${ROOT}/`, '')}`);
}
process.exit(failed.length ? 1 : 0);
