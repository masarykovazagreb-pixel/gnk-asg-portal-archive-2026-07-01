// GNK ASG — Automatizacija: prikaz zapisa i ponovno računanje svježine svake minute. Samo textContent.
(function () {
  'use strict';
  var A = window.GNKAutomation;
  var cache = null;

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
  var STATE_TEXT = { fresh: 'Svježe', stale: 'Zastarjelo', unknown: 'Nepoznato' };

  function render() {
    if (!cache) return;
    var s = A.summarize(cache.news, cache.freshness, Date.now());
    var o = $('overall');
    o.textContent = 'Ukupno: ' + s.overallLabel + ' · svježih resursa: ' + s.counts.fresh + ', zastarjelih: ' + s.counts.stale + ', nepoznatih: ' + s.counts.unknown;
    o.setAttribute('data-state', s.overall);

    var n = cache.news || {};
    var dl = $('news'); dl.textContent = '';
    fact(dl, 'Stanje objave', STATE_TEXT[s.news.state] + (s.news.ageMinutes !== null ? ' (prije ' + A.formatAge(s.news.ageMinutes) + ')' : ''));
    fact(dl, 'Zadnje ažuriranje', n.updated_at || 'nepoznato');
    fact(dl, 'Motor', n.engine || 'nepoznato');
    fact(dl, 'Raspored', n.cadence || 'nepoznato');
    fact(dl, 'Vremenska zona', n.timezone || 'nepoznato');
    fact(dl, 'Konfigurirani izvori', n.feeds_configured !== undefined ? n.feeds_configured : 'nepoznato');
    fact(dl, 'Javne vijesti (cilj / zapisano)', (n.public_items_target || '?') + ' / ' + (n.public_items_written || '?'));
    fact(dl, 'Arhiva (zapisano)', n.archive_items_written !== undefined ? n.archive_items_written : 'nepoznato');
    fact(dl, 'Dopuštena starost objave', s.news.slaMinutes ? A.formatAge(s.news.slaMinutes) : 'nepoznato');

    var tb = $('rows'); tb.textContent = '';
    s.rows.forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('th', { scope: 'row' }, r.name));
      tr.appendChild(el('td', { 'data-state': r.state }, STATE_TEXT[r.state]));
      tr.appendChild(el('td', null, A.formatAge(r.ageMinutes)));
      tr.appendChild(el('td', null, A.formatAge(r.maxAgeMinutes)));
      tr.appendChild(el('td', null, r.sourceState));
      tb.appendChild(tr);
    });
  }

  function init() {
    Promise.all([
      fetch('../data/news-automation-status.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('../data/freshness-status.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
    ]).then(function (d) {
      cache = { news: d[0], freshness: d[1] };
      $('status').textContent = 'Zapisi su učitani. Stanje se ponovno računa svake minute.';
      render();
      setInterval(render, 60000);
    }).catch(function () {
      $('status').textContent = 'Zapisi trenutačno nisu dostupni.';
      $('overall').textContent = 'Ukupno: nepoznato.';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
