import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');
const CANONICAL = 'gnk-news-refresh-v2.yml';
const TARGETS = [
  'apps/portal/data/news.json',
  'apps/portal/data/news_archive.json',
  'apps/portal/data/news-automation-status.json'
];
const LEGACY_MUTATORS = [
  'scripts/refresh-public-news-v4.mjs'
];
const failures = [];
const warnings = [];

const read = p => fs.readFileSync(p, 'utf8');
const workflowFiles = fs.readdirSync(WORKFLOWS).filter(f => /\.ya?ml$/i.test(f));

function canMutate(text) {
  return /contents:\s*write\b/.test(text)
    || /git\s+(?:add|commit|push)\b/.test(text)
    || /writeFile(?:Sync)?\s*\(/.test(text)
    || /python\s+[^\n]*(?:refresh|news)/i.test(text)
    || /node\s+[^\n]*(?:refresh|news)/i.test(text);
}

for (const file of workflowFiles) {
  const text = read(path.join(WORKFLOWS, file));
  const touchesTarget = TARGETS.some(t => text.includes(t));
  const invokesLegacy = LEGACY_MUTATORS.some(s => text.includes(s));
  if (file !== CANONICAL && canMutate(text) && (touchesTarget || invokesLegacy)) {
    failures.push(`${file}: competing AKTUAL news writer candidate`);
  }
}

const canonicalPath = path.join(WORKFLOWS, CANONICAL);
if (!fs.existsSync(canonicalPath)) {
  failures.push(`missing canonical writer: ${CANONICAL}`);
} else {
  const text = read(canonicalPath);
  for (const target of TARGETS) {
    if (!text.includes(target)) failures.push(`${CANONICAL}: missing canonical target ${target}`);
  }
  for (const required of [
    'scripts/gnk-news-refresh.mjs',
    'scripts/normalize-aktual-hourly-contract.mjs',
    'group: gnk-asg-main-mutation',
    'contents: write',
    'git push origin HEAD:main'
  ]) {
    if (!text.includes(required)) failures.push(`${CANONICAL}: missing guard/contract fragment: ${required}`);
  }
}

const recoveryPath = path.join(WORKFLOWS, 'news-refresh.yml');
if (fs.existsSync(recoveryPath)) {
  const text = read(recoveryPath);
  if (/contents:\s*write\b/.test(text) || /git\s+(?:add|commit|push)\b/.test(text)) {
    failures.push('news-refresh.yml must remain recovery/auditor-only');
  }
}

for (const legacy of LEGACY_MUTATORS) {
  const refs = workflowFiles.filter(file => read(path.join(WORKFLOWS, file)).includes(legacy));
  if (refs.length) failures.push(`legacy mutator ${legacy} is referenced by active root workflow(s): ${refs.join(', ')}`);
  else if (fs.existsSync(path.join(ROOT, legacy))) warnings.push(`${legacy}: legacy script retained but unreachable from active root workflows`);
}

const result = {
  ok: failures.length === 0,
  canonicalWriter: CANONICAL,
  canonicalTargets: TARGETS,
  activeRootWorkflowCount: workflowFiles.length,
  warnings,
  failures
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
