// GNK ASG — Mediji: prikaz stanja praćenja iz zapisa u repozitoriju. Samo textContent.
(function () {
  'use strict';
  var M = window.GNKMedia;

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function fact(dl, term, value) {
    dl.appendChild(el('dt', null, term));
    dl.appendChild(el('dd', null, String(value)));
  }
  function daysText(d) {
    if (d === null || d === undefined) return 'nepoznato';
    if (d === 0) return 'danas';
    if (d === 1) return 'prije 1 dana';
    return 'prije ' + d + ' dana';
  }
  function fmtDate(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return 'nepoznato';
    var d = new Date(t);
    return d.getUTCDate() + '. ' + (d.getUTCMonth() + 1) + '. ' + d.getUTCFullYear() + '.';
  }

  function render(status, queries, approved) {
    var st = M.monitorState(status, Date.now(), M.DEFAULT_MAX_AGE_DAYS);
    var q = M.queriesSummary(queries);
    var overall = $('overall');
    overall.textContent = 'Stanje: ' + st.label + ' · zadnje izvršavanje ' + fmtDate(status && status.updated_at) + ' (' + daysText(st.ageDays) + ')';
    overall.setAttribute('data-state', st.state);

    var stats = $('stats'); stats.textContent = '';
    fact(stats, 'Provjereni upiti', status ? status.checked_queries : 'nepoznato');
    fact(stats, 'Javno pronađeni rezultati', status ? status.public_results_detected : 'nepoznato');
    fact(stats, 'Objavljeni javno', status ? status.published_public : 'nepoznato');
    fact(stats, 'Uklonjeni URL-ovi', status ? status.removed_urls : 'nepoznato');
    fact(stats, 'Greške pri izvršavanju', status ? status.errors_count : 'nepoznato');
    fact(stats, 'Subjekata / upita', q.subjectCount + ' / ' + q.queryCount);

    var ul = $('subjects'); ul.textContent = '';
    q.subjects.forEach(function (s) {
      var li = el('li', null, s.name + ': ');
      li.appendChild(el('span', { class: 'dt-note' }, s.queries.join(', ')));
      ul.appendChild(li);
    });

    $('policy').textContent = status && status.privacy_notice
      ? status.privacy_notice
      : 'Politika javnog prikaza nije dostupna.';
    $('approved').textContent = 'Odobrenih objava na javnom popisu: ' + M.approvedCount(approved) + '. Objave koje spominju GNK ASG ili Nermina Sefića prikazuju se javno tek nakon dodavanja na popis.';
  }

  function init() {
    Promise.all([
      fetch('../data/media_monitor_status.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('../data/media_queries.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('../data/approved_mentions.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    ]).then(function (d) {
      $('status').textContent = 'Zapis je učitan. Stanje je izračunato u trenutku prikaza.';
      render(d[0], d[1], d[2]);
    }).catch(function () {
      $('status').textContent = 'Stanje praćenja trenutačno nije dostupno.';
      $('overall').textContent = 'Stanje: nepoznato.';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
