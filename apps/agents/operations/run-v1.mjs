#!/usr/bin/env node
// Read-only orchestration of existing diagnostics. No shell, network, publishing,
// repository mutations, self-modification, or implicit approval.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ALLOWED = [
  'tests/test-agent-editorial-pipeline-v1.mjs', 'tests/test-agent-publish-v1.mjs',
  'scripts/test-content-source-governance-v1.mjs', 'scripts/test-source-gated-editorial-queue-v1.mjs',
  'scripts/test-editorial-prepublication-readiness-v1.mjs', 'scripts/test-ai-act-governance-v1.mjs',
  'scripts/test-nermin-author-seo-v1.mjs', 'scripts/test-asg-public-seo-release-v1.mjs',
  'tests/test-entity-navigation-seo-v1.mjs', 'tests/test-network-mesh-v1.mjs',
  'tests/test-network-inventory-v1.mjs', 'tests/test-public-network-inventory-v1.mjs',
  'tests/test-network-atlas-v1.mjs', 'tests/test-network-reciprocity-v1.mjs',
  'tests/test-aktual-media-brand-network-v1.mjs', 'scripts/test-aktual-media-radio-persistent-v1.mjs',
  'tests/test-sitemap-integrity-v1.mjs', 'tests/test-hreflang-reciprocity-v1.mjs',
  'tests/test-public-title-search-v1.mjs', 'tests/test-a11y-skip-v1.mjs',
  'tests/test-design-system-v1.mjs', 'tests/test-edition-images-v1.mjs',
  'tests/test-image-alt-v1.mjs', 'tests/test-editorial-photo-clarity-v1.mjs',
  'tests/test-image-proxy-v1.mjs', 'tests/test-security-headers-v1.mjs',
  'tests/test-refresh-layer-v1.mjs', 'tests/test-autonomy-v1.mjs',
  'tests/test-seo-matrix-v1.mjs', 'tests/test-main-only-network-deploy-v1.mjs',
];

export function validateRegistry(registry) {
  if (registry?.version !== 'ASG_OPERATIONS_30_V1' || !Array.isArray(registry.agents) || registry.agents.length !== 30) throw Error('Invalid registry version or agent count');
  registry.agents.forEach((agent, i) => {
    if (agent.id !== `O${String(i + 1).padStart(2, '0')}` || typeof agent.name !== 'string' || !agent.name.trim() || typeof agent.task !== 'string' || !agent.task.trim() || !Array.isArray(agent.command) || agent.command.length !== 2 || agent.command[0] !== 'node' || agent.command[1] !== ALLOWED[i]) throw Error(`Invalid agent configuration at index ${i}`);
  });
  return registry;
}

function execute(args) {
  return spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
}
function outcome(result) {
  return { status: result.status === 0 && !result.error && !result.signal ? 'pass' : 'fail', exitCode: result.status, signal: result.signal || null, error: result.error?.message || null, detail: (result.status === 0 && !result.error ? '' : `${result.stderr || ''}\n${result.stdout || ''}`).slice(-5000) };
}
export function runAgents(registry, selected, executor = execute) {
  validateRegistry(registry);
  if (selected && !registry.agents.some(a => a.id === selected)) throw Error(`Unknown agent: ${selected}`);
  const agents = registry.agents.filter(a => !selected || a.id === selected).map(a => ({ id: a.id, name: a.name, task: a.task, command: a.command, ...outcome(executor([a.command[1]])) }));
  return { version: registry.version, scope: 'local repository checks; not live monitoring or publication approval', complete: !selected, passed: agents.filter(a => a.status === 'pass').length, failed: agents.filter(a => a.status === 'fail').length, agents };
}
export function checkCandidate(candidate, asOf, executor = execute) {
  if (!candidate || !asOf || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw Error('Candidate and explicit --as-of YYYY-MM-DD required');
  const date = new Date(`${asOf}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== asOf) throw Error('Invalid --as-of date');
  const checks = ['scripts/check-editorial-prepublication-readiness-v1.mjs', 'scripts/check-ai-act-governance-v1.mjs'].map(script => {
    const r = executor([script, '--candidate', resolve(candidate), '--as-of', asOf, '--strict']);
    let report = null;
    try { report = JSON.parse(r.stdout); } catch { /* failures remain failures */ }
    const result = outcome(r);
    const valid = report && Array.isArray(report.blockers) && report.blockers.length === 0 && (script.includes('prepublication')
      ? report.reportType === 'editorial-prepublication-readiness' && report.readiness === 'checks-complete-awaiting-separate-publication-decision' && report.automaticPublishing === false
      : report.status === 'metadata-check-passed-needs-human-evidence' && report.published === false);
    if (!valid) result.status = 'fail';
    return { check: script, ...result, report };
  });
  return { status: checks.every(c => c.status === 'pass') ? 'metadata-passed-human-decision-required' : 'blocked', asOf, published: false, approvalGranted: false, evidenceLimit: 'Metadata checks do not verify actual facts, rights, human review or live publication.', checks };
}

function main(args) {
  if (args[0] === '--candidate' && args.length === 4 && args[2] === '--as-of') {
    const result = checkCandidate(args[1], args[3]);
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'blocked') process.exitCode = 1;
  } else if (!args.length || (args.length === 2 && args[0] === '--agent')) {
    const registry = JSON.parse(readFileSync(resolve(ROOT, 'apps/agents/operations/agents-v1.json'), 'utf8'));
    const result = runAgents(registry, args[1]);
    const git = spawnSync('git', ['rev-parse', 'HEAD'], {cwd: ROOT, encoding: 'utf8', timeout: 10_000});
    const sha = git.status === 0 ? git.stdout.trim() : '';
    result.sourceSha = /^[0-9a-f]{40}$/.test(sha) ? sha : null;
    // This identifies the checked-out revision, not cleanliness, deployed SHA, or generated files.
    console.log(JSON.stringify(result, null, 2));
    if (result.failed) process.exitCode = 1;
  } else throw Error('Usage: node apps/agents/operations/run-v1.mjs [--agent O01] | --candidate FILE --as-of YYYY-MM-DD');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; }
}
