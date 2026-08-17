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

// Queue currently covers dates before the Europe/Zagreb DST transition in late October.
// Keep the offset explicit so the audit is deterministic for the approved schedule through 2026-10-01.
const parseScheduled = (item) => new Date(`${item.date}T${item.time || '00:00'}:00+02:00`);
const sourcePathFor = item => `content/factory-queue/${item.category}/${item.slug}.html`;
const rows = [];

for (const item of queue.items || []) {
  const st = state.published?.[item.id] || null;
  const scheduledAt = parseScheduled(item);
  const recordedAt = st?.at ? new Date(st.at) : null;
  const recordedBeforeSchedule = Boolean(recordedAt && scheduledAt && recordedAt < scheduledAt);
  const sourcePath = sourcePathFor(item);
  const hoursEarly = recordedBeforeSchedule
    ? Math.round(((scheduledAt.getTime() - recordedAt.getTime()) / 36e5) * 10) / 10
    : 0;

  rows.push({
    id: item.id,
    date: item.date,
    time: item.time,
    scheduledAt: Number.isNaN(scheduledAt.getTime()) ? null : scheduledAt.toISOString(),
    category: item.category,
    slug: item.slug,
    sourcePath,
    sourceExists: existsSync(sourcePath),
    skipped: skipped.has(item.id),
    stateRecorded: Boolean(st),
    backfilled: Boolean(st?.backfilled),
    recordedAt: st?.at || null,
    recordedBeforeSchedule,
    hoursEarly,
    classification: !st
      ? 'SCHEDULED'
      : recordedBeforeSchedule
        ? 'STAGED_RECORDED_AS_PUBLISHED'
        : 'PUBLISHED_OR_DUE',
    remediationCandidate: Boolean(st?.backfilled && recordedBeforeSchedule && !skipped.has(item.id))
  });
}

const premature = rows.filter(r => r.recordedBeforeSchedule && !r.skipped);
const remediationCandidates = rows.filter(r => r.remediationCandidate);
const scheduled = rows.filter(r => !r.stateRecorded && !r.skipped);
const normal = rows.filter(r => r.stateRecorded && !r.recordedBeforeSchedule && !r.skipped);
const missingSources = rows.filter(r => !r.sourceExists && !r.skipped);

const output = {
  ok: premature.length === 0 && missingSources.length === 0,
  queueVersion: queue.version || null,
  generatedAt: new Date().toISOString(),
  counts: {
    total: rows.length,
    skipped: rows.filter(r => r.skipped).length,
    prematureStateRecords: premature.length,
    remediationCandidates: remediationCandidates.length,
    scheduledUnpublished: scheduled.length,
    publishedOrDue: normal.length,
    missingSources: missingSources.length
  },
  remediationCandidates,
  premature,
  missingSources,
  scheduled,
  note: 'Audit only: this script does not delete pages, mutate queue state, publish content, or trigger deploys. remediationCandidates are only backfilled records written before their scheduled time.'
};

console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 1);
