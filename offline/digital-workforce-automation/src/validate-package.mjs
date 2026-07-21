import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

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
  'src/render-admin-summary.mjs',
  'src/validate-package.mjs'
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

  if (model.mode !== 'offline-shadow') {
    errors.push('Operating model mode must be offline-shadow.');
  }

  const activation = model.activation ?? {};
  const unsafeActivation = Object.entries(activation)
    .filter(([key]) => key.startsWith('public') || key === 'automaticPublication')
    .filter(([, value]) => value !== false);
  if (unsafeActivation.length) {
    errors.push(`All public activation flags must be false: ${unsafeActivation.map(([key]) => key).join(', ')}`);
  }

  if (windows.enabled !== false) errors.push('Publication windows must remain disabled.');
  if (windows.rules?.outputState !== 'DRAFT_ONLY') errors.push('Publication window outputState must be DRAFT_ONLY.');
  if (windows.windows?.some((window) => !['admin-only', 'draft-queue'].includes(window.surface))) {
    errors.push('Publication windows may only target admin-only or draft-queue surfaces.');
  }

  if (!Array.isArray(state.agents) || state.agents.length < 6) errors.push('At least six agents are required.');
  if (!state.agents?.some((agent) => agent.voice === 'al')) errors.push('AL orchestrator agent is required.');
  if (!Array.isArray(state.projects) || state.projects.length < 1) errors.push('At least one project is required.');

  for (const item of state.financials ?? []) {
    if (!FINANCIAL_CLASSES.has(item.classification)) {
      errors.push(`Invalid financial classification: ${item.classification}`);
    }
  }

  const modelLabels = new Set(model.financialLabels ?? []);
  for (const classification of FINANCIAL_CLASSES) {
    if (!modelLabels.has(classification)) errors.push(`Operating model is missing financial label: ${classification}`);
  }

  for (const script of ['test', 'shadow', 'review', 'admin', 'validate', 'verify']) {
    if (!pkg.scripts?.[script]) errors.push(`Missing package script: ${script}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    checked: {
      requiredFiles: REQUIRED_FILES.length,
      agents: state.agents?.length ?? 0,
      projects: state.projects?.length ?? 0,
      financialItems: state.financials?.length ?? 0,
      publicationWindows: windows.windows?.length ?? 0
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await validatePackage();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
