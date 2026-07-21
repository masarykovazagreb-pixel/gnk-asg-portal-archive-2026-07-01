import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateDailyCycle } from '../src/engine.mjs';
import { applyDailyLimits, validateDailyLimits } from '../src/apply-daily-limits.mjs';

const state = JSON.parse(await readFile(new URL('../data/seed-company-state.json', import.meta.url), 'utf8'));
const model = JSON.parse(await readFile(new URL('../config/company-operating-model.json', import.meta.url), 'utf8'));
const original = generateDailyCycle(state, '2026-07-22');
const limited = applyDailyLimits(original, model.dailyLimits);

assert.equal(limited.controls.dailyLimitsApplied, true);
assert.equal(limited.controls.publicPublishingEnabled, false);
assert.equal(limited.controls.productionWritesEnabled, false);
assert.ok(limited.drafts.length <= original.drafts.length);
assert.ok(limited.drafts.every((draft) => draft.status === 'DRAFT_ONLY'));
assert.ok(limited.drafts.every((draft) => draft.public === false));
assert.ok(limited.drafts.every((draft) => draft.publishAt === null));

const counts = Object.groupBy(limited.drafts, (draft) => draft.tab);
assert.ok((counts.plan?.length ?? 0) <= model.dailyLimits.executiveDirective);
assert.ok((counts.bilten?.length ?? 0) <= model.dailyLimits.alBrief);
assert.ok((counts.projekti?.length ?? 0) <= model.dailyLimits.projectUpdates);
assert.ok((counts.misljenja?.length ?? 0) <= model.dailyLimits.leadComments);
assert.ok((counts.zapisnik?.length ?? 0) <= model.dailyLimits.meetingSummaries);
assert.ok((counts.krediti?.length ?? 0) <= model.dailyLimits.financialSnapshots);
assert.ok((counts.workeri?.length ?? 0) <= model.dailyLimits.activityFeedItems);

const validation = validateDailyLimits(limited, model.dailyLimits);
assert.equal(validation.ok, true, validation.errors.join('\n'));
assert.throws(() => applyDailyLimits(original, { alBrief: -1 }), /non-negative integer/);
