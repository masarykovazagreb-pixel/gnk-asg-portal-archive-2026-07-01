// GNK ASG — Automatizacija: računanje svježine iz vremenskih oznaka. Ne vjeruje polju "state" iz izvora.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GNKAutomation = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const MIN = 60000;
  const LABEL = { fresh: 'Svježe', stale: 'Zastarjelo', unknown: 'Nepoznato' };

  // Svježe samo ako je zapis mlađi od dopuštene starosti. Zastarjelo se nikad ne prikazuje kao ispravno.
  function ageState(iso, maxAgeMinutes, nowMs) {
    const t = Date.parse(iso);
    if (!iso || Number.isNaN(t) || !Number.isFinite(maxAgeMinutes)) return { state: 'unknown', ageMinutes: null };
    const age = Math.max(0, Math.round((nowMs - t) / MIN));
    return { state: age > maxAgeMinutes ? 'stale' : 'fresh', ageMinutes: age };
  }

  function overall(states) {
    if (states.some((s) => s === 'stale')) return 'stale';
    if (states.some((s) => s === 'unknown')) return 'unknown';
    return 'fresh';
  }

  function summarize(news, freshness, nowMs) {
    const n = news
      ? ageState(news.updated_at, news.freshness_sla_minutes, nowMs)
      : { state: 'unknown', ageMinutes: null };
    const resources = (freshness && freshness.resources) || {};
    const rows = Object.keys(resources).map((k) => {
      const r = resources[k];
      const a = ageState(r.observedAt, r.maxAgeMinutes, nowMs);
      return {
        key: k, name: r.name || k, state: a.state, ageMinutes: a.ageMinutes,
        maxAgeMinutes: r.maxAgeMinutes, sourceState: r.sourceState || 'nepoznato'
      };
    });
    const state = overall([n.state].concat(rows.map((r) => r.state)));
    return {
      overall: state,
      overallLabel: LABEL[state],
      news: { state: n.state, ageMinutes: n.ageMinutes, slaMinutes: news ? news.freshness_sla_minutes : null },
      rows: rows,
      counts: {
        fresh: rows.filter((r) => r.state === 'fresh').length,
        stale: rows.filter((r) => r.state === 'stale').length,
        unknown: rows.filter((r) => r.state === 'unknown').length
      }
    };
  }

  function formatAge(min) {
    if (min === null || min === undefined) return 'nepoznato';
    if (min < 60) return min + ' min';
    const h = Math.floor(min / 60); const m = min % 60;
    return h + ' h' + (m ? ' ' + m + ' min' : '');
  }

  return { LABEL, ageState, overall, summarize, formatAge };
});
