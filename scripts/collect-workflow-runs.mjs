// GNK ASG — prikupljanje zadnjeg stanja GitHub Actions runova.
// Piše apps/portal/data/workflow-runs.json (mapa: putanja workflowa -> zadnji run).
// Nikad ne pokreće workflowe; samo čita ono što je već izvršeno.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = 'apps/portal/data/workflow-runs.json';
const PAGES = Number(process.env.GNK_RUN_PAGES || 6);

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

let repo = process.env.GITHUB_REPOSITORY || '';
if (!repo) {
  try {
    repo = gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']).trim();
  } catch {
    repo = 'masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01';
  }
}

const byPath = new Map();
for (let page = 1; page <= PAGES; page += 1) {
  const raw = gh([
    'api',
    `repos/${repo}/actions/runs?per_page=100&page=${page}`,
    '-H',
    'Accept: application/vnd.github+json',
  ]);
  const data = JSON.parse(raw);
  const runs = Array.isArray(data.workflow_runs) ? data.workflow_runs : [];
  for (const run of runs) {
    const path = String(run.path || '');
    if (!path) continue;
    const prev = byPath.get(path);
    if (!prev || String(run.created_at) > String(prev.createdAt)) {
      byPath.set(path, {
        id: run.id,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        status: run.status,
        conclusion: run.conclusion,
        event: run.event,
        branch: run.head_branch,
        attempt: run.run_attempt,
        url: run.html_url,
      });
    }
  }
  if (runs.length < 100) break;
}

const out = {
  version: 'GNK_ASG_WORKFLOW_RUNS_V1',
  repository: repo,
  collectedAt: new Date().toISOString(),
  note: 'Zadnji zabilježeni run po workflow datoteci. Izvor: GitHub Actions API. Ne pokreće ništa.',
  runs: Object.fromEntries([...byPath.entries()].sort(([a], [b]) => a.localeCompare(b))),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log(`workflow-runs: ${byPath.size} workflowa s poviješću -> ${OUT}`);
