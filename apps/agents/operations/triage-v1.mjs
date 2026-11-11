#!/usr/bin/env node
// Turn the 30 diagnostics into a reviewable, reproducible task queue.
// This is a proposal generator: no code changes, approvals or publication.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, validateRegistry } from './run-v1.mjs';

const highPriority = new Set(['O03', 'O04', 'O05', 'O06', 'O07', 'O08', 'O17', 'O26', 'O30']);
export function makeTriage(registry, report, sourceSha) {
  validateRegistry(registry);
  if (typeof sourceSha !== 'string' || !/^[0-9a-f]{40}$/.test(sourceSha)) throw Error('Full source SHA required');
  const observed = new Map();
  if (report !== null) {
    if (report?.version !== registry.version || report.sourceSha !== sourceSha || !Array.isArray(report.agents) || typeof report.complete !== 'boolean') throw Error('Invalid or wrong-revision diagnostics report');
    for (const item of report.agents) {
      const configured = registry.agents.find(a => a.id === item.id);
      if (!configured || observed.has(item.id) || !['pass', 'fail'].includes(item.status) || JSON.stringify(item.command) !== JSON.stringify(configured.command)) throw Error('Invalid or duplicate diagnostic result');
      observed.set(item.id, item);
    }
    if (report.complete && observed.size !== registry.agents.length) throw Error('Complete report missing agents');
    if (report.passed !== [...observed.values()].filter(a => a.status === 'pass').length || report.failed !== [...observed.values()].filter(a => a.status === 'fail').length) throw Error('Inconsistent diagnostic counts');
  }
  const tasks = [];
  for (const agent of registry.agents) {
    const result = observed.get(agent.id);
    if (result?.status === 'pass') continue;
    const unrun = !result;
    tasks.push({
      id: `OPS-TRIAGE-${agent.id}`,
      agentId: agent.id,
      priority: highPriority.has(agent.id) ? 1 : 2,
      state: unrun ? 'not-run' : 'investigate',
      title: `${unrun ? 'Pokrenuti' : 'Istražiti'}: ${agent.name}`,
      task: agent.task,
      evidence: unrun ? 'Nema rezultata ove provjere; stanje nije poznato.' : `Provjera nije prošla (exit: ${Number.isInteger(result.exitCode) ? result.exitCode : 'nema'}).`,
      nextStep: unrun ? `Pokrenuti ${agent.id} i sačuvati rezultat.` : `Pregledati izvještaj ${agent.id}, utvrditi uzrok i pripremiti zasebno testiran popravak.`,
      rerun: ['node', 'apps/agents/operations/run-v1.mjs', '--agent', agent.id],
      humanReviewRequired: true,
      autoFix: false,
      autoPublish: false,
    });
  }
  tasks.sort((a,b) => a.priority - b.priority || a.id.localeCompare(b.id));
  return {version: 'ASG_OPERATIONS_TRIAGE_V1', sourceSha, reportState: report === null ? 'missing' : report.complete ? 'complete' : 'partial',
    summary: { totalAgents: registry.agents.length, checked: observed.size, passed: [...observed.values()].filter(a => a.status === 'pass').length, failed: [...observed.values()].filter(a => a.status === 'fail').length, notRun: registry.agents.length - observed.size, tasks: tasks.length },
    note: 'Lokalni testovi nisu dokaz stanja uživo. Prijedlozi se ne izvršavaju, ne objavljuju i ne dokazuju odobrenje.', tasks };
}

function main(args) {
  if (args.length !== 4 || args[0] !== '--report' || args[2] !== '--sha') throw Error('Usage: node apps/agents/operations/triage-v1.mjs --report FILE|missing --sha FULL_SHA');
  const registry = JSON.parse(readFileSync(resolve(ROOT, 'apps/agents/operations/agents-v1.json'), 'utf8'));
  const report = args[1] === 'missing' ? null : JSON.parse(readFileSync(resolve(args[1]), 'utf8'));
  console.log(JSON.stringify(makeTriage(registry, report, args[3]), null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; }
}
