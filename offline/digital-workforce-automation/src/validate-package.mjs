import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const REQUIRED_TABS = new Set([
  'plan', 'bilten', 'projekti', 'rizici', 'misljenja', 'ovisnosti',
  'zadaci', 'krediti', 'newsroom', 'workeri', 'zapisnik'
]);
const FINANCIAL_CLASSES = new Set(['ACTUAL', 'COMMITTED', 'FORECAST', 'SIMULATED']);
const REQUIRED_FILES = [
  'README.md',
  'package.json',
  'config/company-operating-model.json',
  'config/daily-publication-windows.json',
  'data/seed-company-state.json',
  'src/engine.mjs',
  'src/review-gate.mjs',
  'src/run-shadow.mjs',
  'src/render-review-preview.mjs',
  'src/render-admin-summary.mjs'
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

export async function validatePackage() {
  const errors = [];

  for (const relativePath of REQUIRED_FILES) {
    try {
      await access(path.join(root, relativePath));
    } catch {
      errors.push(`Missing required file: ${relativePath}`);
    }
  }

  if (errors.length) return { ok: false, errors };

  const [model, windows, state, pkg] = await Promise.all([
    readJson('config/company-operating-model.json'),
    readJson('config/daily-publication-windows.json'),
    readJson('data/seed-company-state.json'),
    readJson('package.json')
  ]);

  if (model.mode !== 'OFFLINE_DRAFT') errors.push('Operating model mode must be OFFLINE_DRAFT.');
  if (model.activation?.publicPublishing !== false) errors.push('Public publishing must be disabled in operating model.');
  if (model.activation?.productionWrites !== false) errors.push('Production writes must be disabled in operating model.');
  if (model.activation?.scheduler !== false) errors.push('Scheduler must be disabled in operating model.');

  if (!Array.isArray(state.agents) || state.agents.length < 6) errors.push('At least six agents are required.');
  if (!state.agents?.some((agent) => agent.voice === 'al')) errors.push('AL orchestrator agent is required.');
  if (!Array.isArray(state.projects) || state.projects.length < 1) errors.push('At least one project is required.');

  for (const item of state.financials ?? []) {
    if (!FINANCIAL_CLASSES.has(item.classification)) {
      errors.push(`Invalid financial classification: ${item.classification}`);
    }
  }

  const configuredTabs = new Set(model.publicTabs ?? model.tabs ?? []);
  if (configuredTabs.size) {
    for (const tab of REQUIRED_TABS) {
      if (!configuredTabs.has(tab)) errors.push(`Missing configured tab: ${tab}`);
    }
  }

  if (windows.mode && !String(windows.mode).includes('DRAFT')) {
    errors.push('Publication windows must remain draft-only.');
  }

  for (const script of ['test', 'shadow', 'review', 'admin', 'verify']) {
    if (!pkg.scripts?.[script]) errors.push(`Missing package script: ${script}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    checked: {
      requiredFiles: REQUIRED_FILES.length,
      agents: state.agents?.length ?? 0,
      projects: state.projects?.length ?? 0,
      financialItems: state.financials?.length ?? 0
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await validatePackage();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
