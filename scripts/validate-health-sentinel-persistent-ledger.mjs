#!/usr/bin/env node
import fs from 'node:fs';

const p = 'config/health-sentinel-persistent-ledger-v1.json';
const fail = (m) => { console.error(`ERROR: ${m}`); process.exitCode = 1; };
if (!fs.existsSync(p)) fail(`Missing ${p}`);
if (process.exitCode) process.exit(process.exitCode);
const m = JSON.parse(fs.readFileSync(p, 'utf8'));

if (m.version !== 'HEALTH_SENTINEL_PERSISTENT_LEDGER_V1') fail('Unexpected version');
if (m.storageModel?.persistentLedgerRequired !== true) fail('Persistent ledger must be required');
if (m.storageModel?.appendOnlyEvents !== true) fail('Health events must be append-only');
for (const f of ['providerId','state','observedAt','failureStreak','successStreak','healthScore','provenanceRef']) {
  if (!m.storageModel?.requiredFields?.includes(f)) fail(`Missing required field: ${f}`);
}
for (const s of ['HEALTHY','DEGRADED','STALE','DOWN','QUARANTINED','PROBATION']) {
  if (!m.states?.includes(s)) fail(`Missing state: ${s}`);
}
if (m.transitionPolicy?.unknownStateFailsClosed !== true) fail('Unknown state must fail closed');
if (m.transitionPolicy?.maxAutomaticRetries !== 2) fail('Automatic retries must remain bounded at 2');
if ((m.transitionPolicy?.recoveryHysteresis?.requiredConsecutiveHealthyChecks ?? 0) < 3) fail('Recovery requires >=3 healthy checks');
if (m.selection?.testOrMockProviderProductionReady !== false) fail('Test/mock provider cannot be production-ready');
for (const k of ['authoritativeStateWriterRequired','stateToMainWritesSerialized','exactShaImmediatelyBeforeWrite']) {
  if (m.singleWriter?.[k] !== true) fail(`singleWriter.${k} must remain true`);
}
if (m.audit?.provenanceRequired !== true) fail('Provenance must be required');

if (process.exitCode) process.exit(process.exitCode);
console.log('Health Sentinel persistent ledger invariants valid.');
