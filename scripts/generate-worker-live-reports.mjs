#!/usr/bin/env node
/**
 * GNK ASG Digital Workforce public compatibility snapshot.
 * Source-of-truth semantics: 1,573 modeled profiles/assignments, NOT 1,573 independent runtime processes.
 * Runtime evidence is owned by workflow runs and production health only.
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve('apps/portal');
const OUTPUT_FILE = path.join(ROOT, 'data/worker-live-reports.json');
const payload = {
  updatedAt: new Date().toISOString(),
  mode: 'model-ready',
  modeledWorkerProfiles: 1573,
  modeledAssignments: 1573,
  modeledProjects: 9,
  modeledDomains: 12,
  semantics: 'modeled assignments; not 1573 independent runtime processes',
  runtimeEvidence: 'workflow-runs-and-production-health-only',
  supervisorAgent: 'AGENT-PORTAL-SUPERVISOR-001',
  items: []
};
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Wrote modeled Workforce compatibility snapshot: ${OUTPUT_FILE}`);
