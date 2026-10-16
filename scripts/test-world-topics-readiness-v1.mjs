import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { isProtectedEditorialRoute } from './lib/editorial-route-protection-v1.mjs';

const registry = JSON.parse(readFileSync('apps/portal/data/world-topics-registry.json', 'utf8'));
const statusBefore = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
assert.equal(statusBefore.status, 0, statusBefore.stderr);
const result = spawnSync(process.execPath, ['scripts/audit-world-topics-readiness-v1.mjs'], {
  encoding: 'utf8',
  env: { ...process.env, WORLD_TOPICS_REVIEW_AS_OF: '2026-10-16', GITHUB_STEP_SUMMARY: '' },
});
assert.equal(result.status, 0, result.stderr || result.stdout);
const report = JSON.parse(result.stdout);
const statusAfter = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
assert.equal(statusAfter.status, 0, statusAfter.stderr);
assert.equal(statusAfter.stdout, statusBefore.stdout, 'readiness audit must not modify repository files');
assert.equal(report.reportType, 'read-only-world-topics-editorial-readiness');
assert.equal(report.asOfDate, '2026-10-16');
assert.equal(report.facts.automaticNetworkCalls, 0);
assert.equal(report.facts.repositoryFilesWritten, 0);
assert.equal(report.facts.automaticPublishing, false);
const expected = registry.items.filter((item) => !isProtectedEditorialRoute(item.path));
assert.equal(report.summary.topicsScanned, expected.length);
assert.equal(report.items.length, expected.length);
for (const item of report.items) {
  assert(!isProtectedEditorialRoute(item.path), 'protected SPT and bank routes must not be included');
  assert.match(item.freshnessBasis, /publication date alone is not source verification/);
  assert.ok(['review-date-not-recorded', 'human-review-due', 'recent-date-recorded'].includes(item.sourceReviewStatus));
  assert.ok(Array.isArray(item.sourceLinks));
  assert.ok(['missing', 'manual-confirmation-required'].includes(item.primarySourceConfirmation));
  assert.ok(item.visualRights && Object.hasOwn(item.visualRights, 'status'));
  assert.ok(item.attribution && Object.hasOwn(item.attribution, 'author') && Object.hasOwn(item.attribution, 'editor') && Object.hasOwn(item.attribution, 'publisher'));
  assert.ok(['human-review-required', 'ready-for-editorial-decision', 'blocked'].includes(item.readiness));
  assert.ok(Array.isArray(item.blockers));
  for (const link of item.sourceLinks) assert.doesNotMatch(link.host, /facebook|instagram|linkedin|twitter|whatsapp|wa\.me|x\.com/i, 'social-share links are not source citations');
}
const noReviewDate = report.items.find((item) => !item.sourceReviewDate);
if (noReviewDate) {
  assert.equal(noReviewDate.sourceReviewStatus, 'review-date-not-recorded');
  assert(Number.isFinite(noReviewDate.publicationAgeDays), 'publication age remains separate context, never a substitute review date');
}
console.log(`World Topics read-only freshness, source, rights and attribution audit: PASS (${report.summary.topicsScanned} routes)`);
