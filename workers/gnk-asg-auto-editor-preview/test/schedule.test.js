import {
  AUTO_EDITOR_SCHEDULE,
  editorialSlot,
  localParts,
  runEditorialSchedule
} from '../src/schedule.js';

class MemoryKv {
  constructor() {
    this.values = new Map();
  }
  async get(key) {
    return this.values.get(key) || null;
  }
  async put(key, value) {
    this.values.set(key, value);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(JSON.stringify(AUTO_EDITOR_SCHEDULE.localTimes) === JSON.stringify(['09:15', '13:00', '17:00']), 'Exactly three daily slots are required.');
assert(localParts('2026-06-21T07:15:00Z').hour === 9, 'Summer Zagreb conversion failed.');
assert(localParts('2026-12-21T08:15:00Z').hour === 9, 'Winter Zagreb conversion failed.');
assert(editorialSlot('2026-06-21T07:15:00Z') === '2026-06-21@09:15', 'Morning slot failed.');
assert(editorialSlot('2026-06-21T11:00:00Z') === '2026-06-21@13:00', 'Midday slot failed.');
assert(editorialSlot('2026-06-21T15:00:00Z') === '2026-06-21@17:00', 'Afternoon slot failed.');
assert(editorialSlot('2026-06-21T10:00:00Z') === '', 'Outside-window time must not create a slot.');

const store = new MemoryKv();
let runs = 0;
const first = await runEditorialSchedule({
  env: { GNK_ASG_KV: store },
  now: new Date('2026-06-21T07:15:00Z'),
  execute: async ({ slot }) => ({ ok: true, slot, draftId: `draft-${++runs}` })
});
assert(first.ok && first.executed && runs === 1, 'First morning slot must execute once.');

const duplicate = await runEditorialSchedule({
  env: { GNK_ASG_KV: store },
  now: new Date('2026-06-21T07:20:00Z'),
  execute: async () => ({ ok: true, draftId: `draft-${++runs}` })
});
assert(duplicate.ok && !duplicate.executed && duplicate.reason === 'slot_already_completed', 'Same slot must be deduplicated.');
assert(runs === 1, 'Duplicate slot executed unexpectedly.');

const midday = await runEditorialSchedule({
  env: { GNK_ASG_KV: store },
  now: new Date('2026-06-21T11:00:00Z'),
  execute: async () => ({ ok: true, draftId: `draft-${++runs}` })
});
assert(midday.ok && midday.executed && runs === 2, 'Midday slot must execute.');

const outside = await runEditorialSchedule({
  env: { GNK_ASG_KV: store },
  now: new Date('2026-06-21T12:00:00Z'),
  execute: async () => ({ ok: true, draftId: `draft-${++runs}` })
});
assert(outside.ok && !outside.executed && outside.reason === 'outside_editorial_window', 'Outside slot must only log evaluation.');
assert(runs === 2, 'Outside slot executed unexpectedly.');

const retryStore = new MemoryKv();
let attempts = 0;
const failed = await runEditorialSchedule({
  env: { GNK_ASG_KV: retryStore },
  now: new Date('2026-06-21T15:00:00Z'),
  execute: async () => {
    attempts += 1;
    return { ok: false, error: 'temporary' };
  }
});
assert(!failed.ok && failed.executed, 'Failed execution must be reported.');
const retried = await runEditorialSchedule({
  env: { GNK_ASG_KV: retryStore },
  now: new Date('2026-06-21T15:05:00Z'),
  execute: async () => {
    attempts += 1;
    return { ok: true, draftId: 'recovered' };
  }
});
assert(retried.ok && retried.executed && attempts === 2, 'Failed slot must remain retryable within its window.');

const blocked = await runEditorialSchedule({
  env: {},
  now: new Date('2026-06-21T07:15:00Z'),
  execute: async () => ({ ok: true })
});
assert(blocked.blocked && blocked.writes === false, 'Missing storage must block scheduler execution.');

console.log('Auto Editor schedule test passed: three Zagreb slots, DST, dedupe, outside-window logging, retry and storage lock.');
