#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const queuePath = 'content/factory-queue/queue.json';
const statePath = 'apps/portal/data/content-queue-state.json';

const read = (p, fallback) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch { return fallback; }
};

if (!existsSync(queuePath) || !existsSync(statePath)) {
  console.error(JSON.stringify({ok:false, error:'missing queue or state file', queuePath, statePath}, null, 2));
  process.exit(2);
}

const queue = read(queuePath, {items:[], skipped:[]});
const state = read(statePath, {published:{}});
const skipped = new Set(queue.skipped || []);

const parseScheduled = (item) => new Date(`${item.date}T${item.time || '00:00'}:00+02:00`);
const rows = [];

for (const item of queue.items || []) {
  const st = state.published?.[item.id] || null;
  const scheduledAt = parseScheduled(item);
  const recordedAt = st?.at ? new Date(st.at) : null;
  const recordedBeforeSchedule = Boolean(recordedAt && scheduledAt && recordedAt < scheduledAt);
  rows.push({
    id: item.id,
    date: item.date,
    time: item.time,
    category: item.category,
    slug: item.slug,
    skipped: skipped.has(item.id),
    stateRecorded: Boolean(st),
    backfilled: Boolean(st?.backfilled),
    recordedAt: st?.at || null,
    recordedBeforeSchedule,
    classification: !st
      ? 'SCHEDULED'
      : recordedBeforeSchedule
        ? 'STAGED_RECORDED_AS_PUBLISHED'
        : 'PUBLISHED_OR_DUE'
  });
}

const premature = rows.filter(r => r.recordedBeforeSchedule && !r.skipped);
const scheduled = rows.filter(r => !r.stateRecorded && !r.skipped);
const normal = rows.filter(r => r.stateRecorded && !r.recordedBeforeSchedule && !r.skipped);

const output = {
  ok: premature.length === 0,
  queueVersion: queue.version || null,
  counts: {
    total: rows.length,
    skipped: rows.filter(r => r.skipped).length,
    prematureStateRecords: premature.length,
    scheduledUnpublished: scheduled.length,
    publishedOrDue: normal.length
  },
  premature,
  scheduled,
  note: 'Audit only: this script does not delete pages, mutate queue state, publish content, or trigger deploys.'
};

console.log(JSON.stringify(output, null, 2));
process.exit(premature.length ? 1 : 0);
