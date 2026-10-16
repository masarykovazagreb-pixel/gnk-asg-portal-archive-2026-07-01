import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const audit = spawnSync(process.execPath, ['scripts/audit-aktual-columns-lifecycle-v1.mjs'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, ASG_EDITORIAL_NOW: '2026-10-16T12:00:00Z' },
});
assert.equal(audit.status, 0, audit.stderr || audit.stdout);
const report = JSON.parse(audit.stdout);
assert.equal(report.ok, true);
assert.equal(report.published.routesByLanguage.hr, report.published.archiveCardsByLanguage.hr);
assert.equal(report.published.routesByLanguage.en, report.published.archiveCardsByLanguage.en);
assert.equal(report.safety.auditIsReadOnly, true);
assert.equal(report.safety.externalCalls, 0);
const blockedLegacyPublish = spawnSync(process.execPath, ['scripts/kolumne-publish-v1.mjs', '--uzivo'], { cwd: root, encoding: 'utf8' });
assert.equal(blockedLegacyPublish.status, 2, 'Retired one-off publisher must fail closed for live publication.');
const blockedSptGeneration = spawnSync(process.execPath, ['scripts/generate-kolumna-page.mjs', '--slug', 'spt-sports-performance-tracking-gnk-asg'], { cwd: root, encoding: 'utf8' });
assert.notEqual(blockedSptGeneration.status, 0, 'Legacy column generator must reject SPT routes.');

const temp = mkdtempSync(path.join(os.tmpdir(), 'aktual-columns-lifecycle-'));
const copy = (relative) => {
  const target = path.join(temp, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(path.join(root, relative), target);
};
try {
  for (const file of [
    'scripts/build-aktual-columns-index-v1.mjs',
    'apps/portal/data/editorial-registry.json',
    'apps/portal/data/editorial-image-manifest.json',
    'apps/portal/data/content-queue-state.json',
    'apps/portal/gnk-aktual/kolumne/index.html',
    'apps/portal/en/gnk-aktual/columns/index.html',
    'content/factory-queue/queue.json',
  ]) copy(file);
  const queuePath = path.join(temp, 'content/factory-queue/queue.json');
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
  queue.items.push(
    {
      id: 'TEST-UNANNOUNCED-COLUMN',
      category: 'kolumne',
      slug: 'unannounced-test-column',
      title: 'SECRET DRAFT TITLE MUST NOT BE PUBLIC',
      date: '2026-11-01',
      time: '09:00',
      text: 'SECRET DRAFT BODY MUST NOT BE PUBLIC',
    },
    {
      id: 'TEST-ANNOUNCED-COLUMN',
      category: 'kolumne',
      slug: 'announced-test-column',
      title: 'Internal title is not rendered',
      publicTitleHr: 'Najavljena testna kolumna',
      publicTitleEn: 'Announced test column',
      publicTeaserHr: 'Kratka, unaprijed odobrena najava.',
      publicTeaserEn: 'A short, approved preview.',
      publicListingApproved: true,
      editorialApprovalRef: 'EDITORIAL-APPROVAL-TEST-001',
      date: '2026-11-02',
      time: '10:30',
    },
  );
  writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  const builder = path.join(temp, 'scripts/build-aktual-columns-index-v1.mjs');
  const env = { ...process.env, ASG_EDITORIAL_NOW: '2026-10-16T12:00:00Z' };
  const built = spawnSync(process.execPath, [builder, '--write'], { cwd: temp, encoding: 'utf8', env });
  assert.equal(built.status, 0, built.stderr || built.stdout);
  const hr = readFileSync(path.join(temp, 'apps/portal/gnk-aktual/kolumne/index.html'), 'utf8');
  const en = readFileSync(path.join(temp, 'apps/portal/en/gnk-aktual/columns/index.html'), 'utf8');
  assert(hr.includes('Najavljena testna kolumna'));
  assert(en.includes('Announced test column'));
  assert(hr.includes('2. studenoga 2026. u 10:30'));
  assert(hr.includes('datetime="2026-11-02T10:30:00+01:00"'));
  assert(!hr.includes('SECRET DRAFT TITLE MUST NOT BE PUBLIC'));
  assert(!hr.includes('SECRET DRAFT BODY MUST NOT BE PUBLIC'));
  assert(!/href="[^\"]*announced-test-column/.test(hr), 'Upcoming items must not link to a route that is not published yet.');
  const checked = spawnSync(process.execPath, [builder, '--check'], { cwd: temp, encoding: 'utf8', env });
  assert.equal(checked.status, 0, checked.stderr || checked.stdout);

  queue.items.find((item) => item.id === 'TEST-ANNOUNCED-COLUMN').body = 'Do not allow draft body in public schedule.';
  writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  const rejected = spawnSync(process.execPath, [builder, '--write'], { cwd: temp, encoding: 'utf8', env });
  assert.notEqual(rejected.status, 0, 'Public schedule must fail closed if it contains full draft text.');
  assert.match(rejected.stderr, /do not put unpublished article text/i);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
console.log('AKTUAL columns lifecycle, public archive, upcoming approval and draft privacy: PASS');
