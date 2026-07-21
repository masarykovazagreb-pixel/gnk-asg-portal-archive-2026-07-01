import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateDailyCycle, validateCycle } from '../src/engine.mjs';

const state = JSON.parse(await readFile(new URL('../data/seed-company-state.json', import.meta.url), 'utf8'));
const first = generateDailyCycle(state, '2026-07-22');
const second = generateDailyCycle(state, '2026-07-22');
const nextDay = generateDailyCycle(state, '2026-07-23');

assert.deepEqual(first, second, 'Same company and date must generate the same offline cycle.');
assert.notDeepEqual(first.events, nextDay.events, 'Different dates should create a different operating rhythm.');
assert.equal(first.mode, 'OFFLINE');
assert.equal(first.controls.publicPublishingEnabled, false);
assert.equal(first.controls.cronEnabled, false);
assert.equal(first.controls.productionWritesEnabled, false);
assert.ok(first.drafts.length > 0);
assert.ok(first.drafts.every((draft) => draft.status === 'DRAFT_ONLY'));
assert.ok(first.drafts.every((draft) => draft.public === false));
assert.ok(first.drafts.every((draft) => draft.publishAt === null));
assert.ok(first.comments.length > 1);
assert.ok(new Set(first.comments.map((comment) => comment.text)).size === first.comments.length, 'Manager comments must be distinct.');
assert.ok(first.drafts.some((draft) => draft.tab === 'krediti' && draft.title.includes('SIMULATED')), 'Simulated finance must remain visibly labelled.');

const validation = validateCycle(first);
assert.equal(validation.ok, true, validation.errors.join('\n'));

console.log(JSON.stringify({
  ok: true,
  date: first.date,
  events: first.events.length,
  comments: first.comments.length,
  meetings: first.meetings.length,
  tasks: first.tasks.length,
  drafts: first.drafts.length,
  tabs: [...new Set(first.drafts.map((draft) => draft.tab))]
}, null, 2));
