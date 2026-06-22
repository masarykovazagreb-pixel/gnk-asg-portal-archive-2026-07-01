import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'final-predeploy-gate-20260622.json'), 'utf8'));
const OUT = path.join(ROOT, 'reports', 'final-predeploy-gate-20260622');
fs.mkdirSync(OUT, { recursive: true });

const token = process.env.GH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
if (!token) throw new Error('missing_GH_TOKEN');
if (!repository || !repository.includes('/')) throw new Error('missing_GITHUB_REPOSITORY');

const [owner, repo] = repository.split('/');
const headers = {
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28'
};

async function githubJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`github_api_${response.status}_${url}`);
  return response.json();
}

async function runMatchesSource(run) {
  if (String(run.head_sha || '').toLowerCase() === CONFIG.sourceCommit) return true;
  for (const reference of run.pull_requests || []) {
    const number = reference.number;
    if (!number) continue;
    const pull = await githubJson(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`);
    if (String(pull.head?.sha || '').toLowerCase() === CONFIG.sourceCommit) return true;
  }
  return false;
}

const results = [];
for (const expected of CONFIG.requiredSourceRuns) {
  const run = await githubJson(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${expected.runId}`);
  const sourceLinked = await runMatchesSource(run);
  const record = {
    expectedName: expected.name,
    runId: expected.runId,
    actualName: run.name,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    headSha: run.head_sha,
    sourceLinked,
    htmlUrl: run.html_url,
    pass: run.name === expected.name && run.status === 'completed' && run.conclusion === 'success' && sourceLinked
  };
  results.push(record);
}

const failed = results.filter(item => !item.pass);
const report = {
  generatedAt: new Date().toISOString(),
  sourceCommit: CONFIG.sourceCommit,
  requiredCount: CONFIG.requiredSourceRuns.length,
  successfulCount: results.length - failed.length,
  missing: [],
  failed,
  runs: results,
  status: failed.length === 0 && results.length >= CONFIG.minimumSuccessfulSourceWorkflows ? 'PASS' : 'FAIL',
  productionTouched: false
};

fs.writeFileSync(path.join(OUT, 'source-workflows.json'), `${JSON.stringify(report, null, 2)}\n`);
const rows = results.map(item => `| ${item.pass ? 'PASS' : 'FAIL'} | ${item.expectedName.replace(/\|/g, '\\|')} | ${item.runId} | ${item.status}/${item.conclusion} | ${item.sourceLinked ? 'yes' : 'no'} |`).join('\n');
const markdown = `# Source workflow evidence\n\n- Status: **${report.status}**\n- Source commit: \`${report.sourceCommit}\`\n- Successful: ${report.successfulCount}/${report.requiredCount}\n- Production touched by collector: NO\n\n| Result | Workflow | Run ID | State | Source linked |\n|---|---|---:|---|---|\n${rows}\n`;
fs.writeFileSync(path.join(OUT, 'source-workflows.md'), markdown);
console.log(markdown);
if (report.status !== 'PASS') process.exit(1);
