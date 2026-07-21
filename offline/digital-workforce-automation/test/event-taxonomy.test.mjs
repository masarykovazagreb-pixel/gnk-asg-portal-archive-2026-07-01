import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateDailyCycle } from '../src/engine.mjs';
import { applyEventTaxonomy, normalizeEventType, validateEventTaxonomy } from '../src/event-taxonomy.mjs';

const state = JSON.parse(await readFile(new URL('../data/seed-company-state.json', import.meta.url), 'utf8'));
const taxonomy = JSON.parse(await readFile(new URL('../config/event-taxonomy.json', import.meta.url), 'utf8'));

const alias = normalizeEventType('DEPENDENCY_AT_RISK', taxonomy);
assert.equal(alias.canonicalType, 'DEPENDENCY_BLOCKED');
assert.equal(alias.known, true);
assert.equal(alias.aliased, true);

const generated = generateDailyCycle(state, '2026-07-22');
const normalized = applyEventTaxonomy(generated, taxonomy);
assert.equal(normalized.controls.eventTaxonomyApplied, true);
assert.equal(normalized.controls.allEventTypesKnown, true);
assert.ok(normalized.events.every((event) => typeof event.canonicalType === 'string'));
assert.ok(normalized.events.every((event) => event.taxonomyKnown === true));

const validation = validateEventTaxonomy(normalized, taxonomy);
assert.equal(validation.ok, true, validation.errors.join('\n'));

const unsafe = applyEventTaxonomy({ ...generated, events: [{ ...generated.events[0], type: 'UNKNOWN_EVENT' }] }, taxonomy);
const unsafeValidation = validateEventTaxonomy(unsafe, taxonomy);
assert.equal(unsafeValidation.ok, false);
assert.match(unsafeValidation.errors.join('\n'), /Unknown event type/);

assert.throws(
  () => applyEventTaxonomy(generated, { ...taxonomy, rules: { ...taxonomy.rules, publicPublishingEnabled: true } }),
  /must remain disabled/
);
