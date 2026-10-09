// GNK ASG — Mediji: stanje praćenja javnih medijskih spominjanja. Samo čitanje podataka, bez mreže.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GNKMedia = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const DAY = 86400000;
  const LABEL = { fresh: 'Ažurno', stale: 'Zastarjelo', error: 'Greška', unknown: 'Nepoznato' };
  const DEFAULT_MAX_AGE_DAYS = 30;

  // Ručno osvježavanje: upozorenje ako je zadnje izvršavanje starije od maxAgeDays.
  function monitorState(status, nowMs, maxAgeDays) {
    const limit = Number.isFinite(maxAgeDays) ? maxAgeDays : DEFAULT_MAX_AGE_DAYS;
    if (!status) return { state: 'unknown', ageDays: null, label: LABEL.unknown };
    const t = Date.parse(status.updated_at);
    if (Number.isNaN(t)) return { state: 'unknown', ageDays: null, label: LABEL.unknown };
    const ageDays = Math.max(0, Math.floor((nowMs - t) / DAY));
    if (status.status !== 'ok' || (status.errors_count || 0) > 0) return { state: 'error', ageDays: ageDays, label: LABEL.error };
    const state = ageDays > limit ? 'stale' : 'fresh';
    return { state: state, ageDays: ageDays, label: LABEL[state] };
  }

  function queriesSummary(q) {
    const subjects = (q && q.subjects) || [];
    return {
      updatedAt: (q && q.updated_at) || null,
      subjects: subjects.map((s) => ({ name: s.name, queries: (s.queries || []).slice() })),
      subjectCount: subjects.length,
      queryCount: subjects.reduce((n, s) => n + ((s.queries || []).length), 0)
    };
  }

  function approvedCount(approved) {
    if (!approved) return 0;
    return (approved.approved_items || []).length + (approved.approved_urls || []).length;
  }

  return { LABEL, DEFAULT_MAX_AGE_DAYS, monitorState, queriesSummary, approvedCount };
});
