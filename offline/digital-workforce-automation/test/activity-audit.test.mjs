import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateDailyCycle } from '../src/engine.mjs';
import { reviewCycle } from '../src/review-gate.mjs';
import { buildPublicationPlan } from '../src/publication-planner.mjs';
import { buildActivityTimeline, validateActivityTimeline } from '../src/activity-timeline.mjs';
import { buildAuditHistory, createRestoredVersion, validateAuditHistory } from '../src/audit-history.mjs';

const state = JSON.parse(await readFile(new URL('../data/seed-company-state.json', import.meta.url), 'utf8'));
const windows = JSON.parse(await readFile(new URL('../config/daily-publication-windows.json', import.meta.url), 'utf8'));
const cycle = generateDailyCycle(state, '2026-07-22');
const review = reviewCycle(cycle);
const publicationPlan = buildPublicationPlan(cycle, review, windows);
const timeline = buildActivityTimeline(cycle, review, publicationPlan);
const audit = buildAuditHistory(cycle, review, publicationPlan, timeline);

assert.ok(timeline.entries.length > cycle.tasks.length);
assert.ok(timeline.entries.some((entry) => entry.status === 'PLANNING'));
assert.ok(timeline.entries.some((entry) => ['COMPLETED', 'BLOCKED', 'FAILED', 'REVIEW_REQUIRED'].includes(entry.status)));
assert.equal(timeline.controls.publicPublishingAllowed, false);
assert.equal(timeline.controls.productionWriteAllowed, false);
assert.equal(validateActivityTimeline(timeline).ok, true, validateActivityTimeline(timeline).errors.join('\n'));

assert.ok(audit.records.length > cycle.drafts.length);
assert.ok(audit.chainHead);
assert.equal(audit.controls.appendOnly, true);
assert.equal(audit.controls.destructiveRestoreAllowed, false);
assert.equal(validateAuditHistory(audit).ok, true, validateAuditHistory(audit).errors.join('\n'));

const draftRecord = audit.records.find((item) => item.type === 'DRAFT_VERSION');
const restored = createRestoredVersion(audit, draftRecord.id, { title: 'Restored test', body: 'Offline restored version.' });
assert.equal(restored.type, 'RESTORED_AS_NEW_VERSION');
assert.equal(restored.previousHash, audit.chainHead);
assert.equal(restored.version > draftRecord.version, true);
assert.equal(restored.productionWriteAllowed, false);
assert.equal(restored.public, false);

const tampered = structuredClone(audit);
tampered.records[1].previousHash = 'tampered';
assert.equal(validateAuditHistory(tampered).ok, false);
