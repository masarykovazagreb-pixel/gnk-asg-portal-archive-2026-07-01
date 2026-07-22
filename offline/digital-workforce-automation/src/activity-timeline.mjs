import crypto from 'node:crypto';

const STATUS_ORDER = [
  'QUEUED', 'PLANNING', 'READING_SOURCE', 'USING_TOOL', 'GENERATING',
  'CREATED', 'MODIFIED', 'REVIEW_REQUIRED', 'COMPLETED'
];

function stableId(...parts) {
  return `act_${crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 14)}`;
}

function minuteStamp(date, offsetMinutes) {
  const value = new Date(`${date}T06:00:00.000Z`);
  value.setUTCMinutes(value.getUTCMinutes() + offsetMinutes);
  return value.toISOString();
}

function eventFor(status, context) {
  const { date, runId, workerId, entityType, entityId, index } = context;
  return {
    id: stableId(date, runId, workerId, entityType, entityId, status),
    runId,
    date,
    timestamp: minuteStamp(date, index * 4),
    workerId,
    status,
    entityType,
    entityId,
    message: `${workerId} · ${status.toLowerCase().replaceAll('_', ' ')} · ${entityType}:${entityId}`,
    mode: 'OFFLINE',
    public: false,
    productionWriteAllowed: false
  };
}

export function buildActivityTimeline(cycle, review, publicationPlan) {
  if (!cycle || cycle.mode !== 'OFFLINE') throw new Error('Offline cycle is required.');
  const runId = `run_${cycle.companyId}_${cycle.date}`;
  const entries = [];
  let index = 0;

  for (const task of cycle.tasks ?? []) {
    for (const status of STATUS_ORDER.slice(0, 5)) {
      entries.push(eventFor(status, {
        date: cycle.date, runId, workerId: task.ownerId,
        entityType: 'task', entityId: task.id, index: index++
      }));
    }
    entries.push(eventFor('CREATED', {
      date: cycle.date, runId, workerId: task.ownerId,
      entityType: 'task', entityId: task.id, index: index++
    }));
  }

  const reviewByDraft = new Map((review?.reviewedItems ?? []).map((item) => [item.draftId, item]));
  const planByDraft = new Map((publicationPlan?.items ?? []).map((item) => [item.draftId, item]));

  for (const draft of cycle.drafts ?? []) {
    const workerId = cycle.comments?.find((item) => item.text === draft.body)?.authorId ?? 'al-001';
    entries.push(eventFor('MODIFIED', {
      date: cycle.date, runId, workerId,
      entityType: 'draft', entityId: draft.id, index: index++
    }));
    entries.push(eventFor('REVIEW_REQUIRED', {
      date: cycle.date, runId, workerId,
      entityType: 'draft', entityId: draft.id, index: index++
    }));

    const decision = reviewByDraft.get(draft.id)?.decision;
    const planState = planByDraft.get(draft.id)?.state;
    const finalStatus = decision === 'REJECT' ? 'FAILED'
      : ['BLOCKED', 'REJECTED'].includes(planState) ? 'BLOCKED'
        : planState === 'READY_INTERNAL' ? 'COMPLETED' : 'REVIEW_REQUIRED';
    entries.push(eventFor(finalStatus, {
      date: cycle.date, runId, workerId,
      entityType: 'draft', entityId: draft.id, index: index++
    }));
  }

  return {
    schemaVersion: 'offline-worker-activity/v1',
    mode: 'OFFLINE',
    date: cycle.date,
    runId,
    entries,
    controls: {
      publicPublishingAllowed: false,
      productionWriteAllowed: false,
      secretsIncluded: false
    }
  };
}

export function validateActivityTimeline(timeline) {
  const errors = [];
  if (timeline.mode !== 'OFFLINE') errors.push('Timeline mode must be OFFLINE.');
  if (timeline.controls?.publicPublishingAllowed !== false) errors.push('Public publishing must remain disabled.');
  if (timeline.controls?.productionWriteAllowed !== false) errors.push('Production writes must remain disabled.');
  const ids = new Set();
  let previous = '';
  for (const entry of timeline.entries ?? []) {
    if (ids.has(entry.id)) errors.push(`Duplicate activity id: ${entry.id}`);
    ids.add(entry.id);
    if (entry.public !== false || entry.productionWriteAllowed !== false) errors.push(`Unsafe activity entry: ${entry.id}`);
    if (previous && entry.timestamp < previous) errors.push('Timeline timestamps must be monotonic.');
    previous = entry.timestamp;
  }
  return { ok: errors.length === 0, errors };
}
