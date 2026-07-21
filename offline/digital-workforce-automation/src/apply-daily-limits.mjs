const TAB_LIMIT_KEYS = new Map([
  ['plan', 'executiveDirective'],
  ['bilten', 'alBrief'],
  ['projekti', 'projectUpdates'],
  ['misljenja', 'leadComments'],
  ['zapisnik', 'meetingSummaries'],
  ['krediti', 'financialSnapshots'],
  ['workeri', 'activityFeedItems']
]);

function assertLimit(value, key) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Daily limit ${key} must be a non-negative integer.`);
  }
}

export function applyDailyLimits(cycle, limits = {}) {
  if (!cycle || typeof cycle !== 'object' || !Array.isArray(cycle.drafts)) {
    throw new TypeError('A generated cycle with drafts is required.');
  }

  const seenByTab = new Map();
  const removedByTab = {};
  const keptDrafts = [];

  for (const draft of cycle.drafts) {
    const limitKey = TAB_LIMIT_KEYS.get(draft.tab);
    if (!limitKey || limits[limitKey] === undefined) {
      keptDrafts.push(draft);
      continue;
    }

    const limit = limits[limitKey];
    assertLimit(limit, limitKey);
    const seen = seenByTab.get(draft.tab) ?? 0;
    seenByTab.set(draft.tab, seen + 1);

    if (seen < limit) {
      keptDrafts.push(draft);
    } else {
      removedByTab[draft.tab] = (removedByTab[draft.tab] ?? 0) + 1;
    }
  }

  return {
    ...cycle,
    drafts: keptDrafts,
    controls: {
      ...cycle.controls,
      dailyLimitsApplied: true,
      dailyLimitReport: {
        configured: { ...limits },
        removedByTab,
        removedTotal: Object.values(removedByTab).reduce((sum, value) => sum + value, 0)
      },
      allDraftsArePrivate: keptDrafts.every((draft) => draft.status === 'DRAFT_ONLY' && draft.public === false && draft.publishAt === null)
    }
  };
}

export function validateDailyLimits(cycle, limits = {}) {
  const errors = [];
  const counts = new Map();

  for (const draft of cycle?.drafts ?? []) {
    counts.set(draft.tab, (counts.get(draft.tab) ?? 0) + 1);
  }

  for (const [tab, limitKey] of TAB_LIMIT_KEYS) {
    if (limits[limitKey] === undefined) continue;
    try {
      assertLimit(limits[limitKey], limitKey);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const count = counts.get(tab) ?? 0;
    if (count > limits[limitKey]) {
      errors.push(`${tab} has ${count} drafts, exceeding ${limitKey}=${limits[limitKey]}.`);
    }
  }

  return { ok: errors.length === 0, errors };
}
