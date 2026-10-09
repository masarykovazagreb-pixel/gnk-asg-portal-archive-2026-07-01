// GNK ASG — Tvornica ideja: validacija i ocjenjivanje ideja. Bez mrežnih poziva i bez pohrane.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GNKIdeaFactory = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const AREAS = ['Podaci', 'Sadržaj', 'Provjera', 'Pristupačnost', 'SEO', 'Sigurnost', 'Razvoj'];
  const STATUSES = ['otvoreno', 'gotovo', 'nacrt', 'predloženo', 'odobreno', 'odbijeno'];
  const TITLE_MIN = 5;
  const TITLE_MAX = 120;
  const ROUTE_RE = /^\/[a-z0-9_\/-]*\/$/;

  function isScale(v) {
    return Number.isInteger(v) && v >= 1 && v <= 5;
  }

  // Vraća { ok, errors }. Ne baca iznimke.
  function validate(idea) {
    if (!idea || typeof idea !== 'object') return { ok: false, errors: ['Ideja nije objekt.'] };
    const errors = [];
    const title = typeof idea.title === 'string' ? idea.title.trim() : '';
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) errors.push('Naslov mora imati 5 do 120 znakova.');
    if (!AREAS.includes(idea.area)) errors.push('Nepoznato područje.');
    for (const key of ['impact', 'confidence', 'effort']) {
      if (!isScale(idea[key])) errors.push(key + ' mora biti cijeli broj od 1 do 5.');
    }
    if (idea.status !== undefined && !STATUSES.includes(idea.status)) errors.push('Nepoznat status.');
    if (idea.route !== undefined && (typeof idea.route !== 'string' || !ROUTE_RE.test(idea.route))) {
      errors.push('Ruta mora biti relativna putanja koja počinje i završava kosom crtom.');
    }
    return { ok: errors.length === 0, errors };
  }

  // ICE-slična ocjena: utjecaj × pouzdanost ÷ trud, zaokruženo na jednu decimalu.
  function score(idea) {
    const v = validate(idea);
    if (!v.ok) throw new Error(v.errors.join(' '));
    return Math.round((idea.impact * idea.confidence / idea.effort) * 10) / 10;
  }

  // Filtrira i sortira. Nevažeće ideje se izostavljaju (broje se u summarize).
  function rank(ideas, opts) {
    const o = opts || {};
    let list = (ideas || []).filter((i) => validate(i).ok);
    if (o.area) list = list.filter((i) => i.area === o.area);
    const q = typeof o.query === 'string' ? o.query.trim().toLowerCase() : '';
    if (q) {
      list = list.filter((i) => (i.title + ' ' + (i.problem || '') + ' ' + i.area).toLowerCase().includes(q));
    }
    return list
      .map((i) => Object.assign({}, i, { score: score(i) }))
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'hr'));
  }

  function summarize(ideas) {
    const list = ideas || [];
    const byArea = {};
    let valid = 0;
    for (const i of list) {
      const v = validate(i);
      if (v.ok) {
        valid += 1;
        byArea[i.area] = (byArea[i.area] || 0) + 1;
      }
    }
    const byStatus = {};
    for (const i of list) {
      const v = validate(i);
      if (v.ok) byStatus[i.status || 'bez-statusa'] = (byStatus[i.status || 'bez-statusa'] || 0) + 1;
    }
    return { total: list.length, valid, invalid: list.length - valid, byArea, byStatus };
  }

  return { AREAS, STATUSES, validate, score, rank, summarize };
});
