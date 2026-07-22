import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateDailyCycle } from '../src/engine.mjs';
import { reviewCycle } from '../src/review-gate.mjs';
import { buildPublicationPlan } from '../src/publication-planner.mjs';

const state = JSON.parse(await readFile(new URL('../data/seed-company-state.json', import.meta.url), 'utf8'));
const windows = JSON.parse(await readFile(new URL('../config/daily-publication-windows.json', import.meta.url), 'utf8'));
const cycle = generateDailyCycle(state, '2026-07-22');
const review = reviewCycle(cycle);
const plan = buildPublicationPlan(cycle, review, windows);

assert.equal(plan.mode, 'OFFLINE');
assert.equal(plan.activation.schedulerEnabled, false);
assert.equal(plan.activation.publicPublishingEnabled, false);
assert.equal(plan.activation.productionWritesEnabled, false);
assert.equal(plan.items.length, cycle.drafts.length);
assert.ok(plan.items.every((item) => item.publishAt === null));
assert.ok(plan.items.every((item) => item.productionWriteAllowed === false));
assert.ok(plan.items.every((item) => item.publicPublishingAllowed === false));
assert.ok(plan.items.every((item) => item.humanApprovalRequired === true));
assert.ok(plan.items.every((item) => ['READY_INTERNAL', 'DEFERRED', 'BLOCKED', 'REJECTED'].includes(item.state)));
assert.ok(plan.items.filter((item) => item.targetSurface === 'draft-queue').every((item) => item.state !== 'READY_INTERNAL'));
assert.throws(() => buildPublicationPlan(cycle, review, { ...windows, enabled: true }), /must remain disabled/);
