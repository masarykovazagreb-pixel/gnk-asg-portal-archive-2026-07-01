import crypto from 'node:crypto';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function record(type, entityId, version, payload, previousHash, metadata = {}) {
  const payloadHash = digest(payload);
  const hash = digest({ type, entityId, version, payloadHash, previousHash, metadata });
  return {
    id: `audit_${hash.slice(0, 16)}`,
    type,
    entityId,
    version,
    previousHash,
    payloadHash,
    hash,
    metadata,
    mode: 'OFFLINE',
    immutable: true,
    productionWriteAllowed: false,
    public: false
  };
}

export function buildAuditHistory(cycle, review, publicationPlan, timeline) {
  if (!cycle || cycle.mode !== 'OFFLINE') throw new Error('Offline cycle is required.');
  const records = [];
  let previousHash = null;

  const append = (type, entityId, version, payload, metadata) => {
    const item = record(type, entityId, version, payload, previousHash, metadata);
    records.push(item);
    previousHash = item.hash;
  };

  append('RUN_CREATED', `${cycle.companyId}:${cycle.date}`, 1, {
    date: cycle.date,
    companyId: cycle.companyId,
    counts: {
      events: cycle.events?.length ?? 0,
      comments: cycle.comments?.length ?? 0,
      meetings: cycle.meetings?.length ?? 0,
      tasks: cycle.tasks?.length ?? 0,
      drafts: cycle.drafts?.length ?? 0
    }
  }, { actorType: 'SYSTEM', actorId: 'offline-engine' });

  for (const draft of cycle.drafts ?? []) {
    append('DRAFT_VERSION', draft.id, 1, draft, {
      actorType: 'WORKER',
      actorId: cycle.comments?.find((item) => item.text === draft.body)?.authorId ?? 'al-001'
    });
    const reviewItem = review?.reviewedItems?.find((item) => item.draftId === draft.id);
    if (reviewItem) append('REVIEW_DECISION', draft.id, 2, reviewItem, { actorType: 'SYSTEM', actorId: 'review-gate' });
    const planItem = publicationPlan?.items?.find((item) => item.draftId === draft.id);
    if (planItem) append('PUBLICATION_PLAN', draft.id, 3, planItem, { actorType: 'SYSTEM', actorId: 'publication-planner' });
  }

  append('ACTIVITY_TIMELINE_SEALED', timeline?.runId ?? `${cycle.companyId}:${cycle.date}`, 1, {
    entries: timeline?.entries?.length ?? 0,
    timelineHash: digest(timeline ?? {})
  }, { actorType: 'SYSTEM', actorId: 'activity-timeline' });

  return {
    schemaVersion: 'offline-audit-history/v1',
    mode: 'OFFLINE',
    date: cycle.date,
    chainHead: previousHash,
    records,
    controls: {
      appendOnly: true,
      destructiveRestoreAllowed: false,
      restoreCreatesNewVersion: true,
      productionWriteAllowed: false,
      publicExposureAllowed: false
    }
  };
}

export function validateAuditHistory(history) {
  const errors = [];
  if (history.mode !== 'OFFLINE') errors.push('Audit mode must be OFFLINE.');
  if (history.controls?.appendOnly !== true) errors.push('Audit history must be append-only.');
  if (history.controls?.productionWriteAllowed !== false) errors.push('Production writes must remain disabled.');
  let previousHash = null;
  for (const item of history.records ?? []) {
    if (item.previousHash !== previousHash) errors.push(`Broken audit chain before ${item.id}.`);
    if (item.immutable !== true || item.productionWriteAllowed !== false || item.public !== false) errors.push(`Unsafe audit record: ${item.id}`);
    previousHash = item.hash;
  }
  if (history.chainHead !== previousHash) errors.push('Audit chain head does not match the last record.');
  return { ok: errors.length === 0, errors };
}

export function createRestoredVersion(history, sourceRecordId, restoredPayload, actorId = 'human-reviewer') {
  const source = history.records?.find((item) => item.id === sourceRecordId);
  if (!source) throw new Error(`Audit source record not found: ${sourceRecordId}`);
  const latestVersion = Math.max(0, ...(history.records ?? []).filter((item) => item.entityId === source.entityId).map((item) => item.version));
  return record('RESTORED_AS_NEW_VERSION', source.entityId, latestVersion + 1, restoredPayload, history.chainHead, {
    actorType: 'HUMAN', actorId, restoredFrom: sourceRecordId
  });
}
