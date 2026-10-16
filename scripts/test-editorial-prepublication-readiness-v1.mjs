import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const temp = mkdtempSync(join(tmpdir(), 'gnk-editorial-readiness-'));
const checker = new URL('./check-editorial-prepublication-readiness-v1.mjs', import.meta.url).pathname;
const candidatePath = join(temp, 'candidate.json');
const run = (candidate, strict = false) => {
  writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  const result = spawnSync(process.execPath, [checker, '--candidate', candidatePath, '--as-of', '2026-10-16', ...(strict ? ['--strict'] : [])], { encoding: 'utf8' });
  return { ...result, report: JSON.parse(result.stdout) };
};

try {
  const incomplete = run({
    title: 'Draft without verified evidence',
    sources: [{ title: 'Unconfirmed source', url: 'https://example.org/report', primary: false, confirmed: false, checkedAt: '2026-08-01' }],
    visuals: [{ asset: '/assets/draft.png', alt: '', creator: '', license: '', rightsConfirmed: false }],
    attribution: { author: null, authorConfirmed: false, rolesChecked: false, editor: '', publisher: '' },
    editorialApproval: { approved: false },
  });
  assert.equal(incomplete.status, 0, incomplete.stderr);
  assert.equal(incomplete.report.readiness, 'blocked-needs-human-review');
  assert(incomplete.report.blockers.some((blocker) => /primary HTTPS source/.test(blocker)));
  assert(incomplete.report.blockers.some((blocker) => /rights confirmation/.test(blocker)));
  assert(incomplete.report.blockers.some((blocker) => /role separation/.test(blocker)));
  assert.equal(incomplete.report.automaticPublishing, false);
  assert.equal(incomplete.report.externalServiceCalls, 0);

  const complete = run({
    title: 'Editorial review candidate',
    sources: [{ title: 'EU AI Act — Official Journal', url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj', primary: true, confirmed: true, checkedAt: '2026-10-16' }],
    visuals: [{ asset: '/assets/editorial/generated/draft-cover.webp', alt: 'Original conceptual illustration of responsible AI governance', creator: 'GNK ASG d.o.o.', license: 'Original GNK ASG artwork; no third-party photograph', rightsConfirmed: true }],
    attribution: { author: null, authorConfirmed: true, rolesChecked: true, editor: 'GNK ASG editorial desk', publisher: 'GNK ASG d.o.o.' },
    editorialApproval: { approved: true, reviewer: 'Named editor', approvedAt: '2026-10-16' },
  }, true);
  assert.equal(complete.status, 0, complete.stderr);
  assert.equal(complete.report.readiness, 'checks-complete-awaiting-separate-publication-decision');
  assert.deepEqual(complete.report.blockers, []);
  assert.equal(complete.report.automaticPublishing, false);
  assert.match(complete.report.nextStep, /human with separate publishing authority/);

  const stale = run({
    title: 'Stale-source candidate',
    sources: [{ title: 'Old source', url: 'https://example.org/primary', primary: true, confirmed: true, checkedAt: '2026-08-01' }],
    visuals: [],
    attribution: { author: null, authorConfirmed: true, rolesChecked: true, editor: 'Editor', publisher: 'Publisher' },
    editorialApproval: { approved: true, reviewer: 'Editor', approvedAt: '2026-10-16' },
  }, true);
  assert.equal(stale.status, 2, 'strict mode should block stale evidence without publishing anything');
  assert(stale.report.blockers.some((blocker) => /within the last 30 days/.test(blocker)));
  assert.equal(stale.report.automaticPublishing, false);
  console.log('Editorial pre-publication source, rights, roles and approval gate: PASS (no publishing side effects)');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
