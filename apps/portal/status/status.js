/* GNK ASG Status centar: prikaz javnog snimka. Čita samo ../data/public_service_status.json s iste domene. Prikaz preko textContent. */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function el(tag, text, attrs) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = String(text);
    return n;
  }
  function row(cells) {
    var tr = el('tr');
    cells.forEach(function (c) { tr.appendChild(el('td', c)); });
    return tr;
  }

  var STATE_LABEL = { operational: 'Operativno', degraded: 'Smanjena kvaliteta', fresh: 'Ažurno', stale: 'Zastarjelo', unknown: 'Nepoznato' };
  function label(s) { return STATE_LABEL[s] || s; }

  function render(data) {
    $('status').textContent = 'Snimak je generiran iz repozitorija. ' + data.notice;
    var overall = $('overall');
    overall.textContent = 'Ukupno stanje: ' + label(data.overallStatus);
    overall.setAttribute('data-state', data.overallStatus);
    $('generated').textContent = 'Snimak generiran: ' + new Date(data.generatedAt).toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' });

    var services = $('services');
    services.textContent = '';
    data.services.forEach(function (s) { services.appendChild(row([s.name, label(s.status)])); });

    var q = data.quality;
    var quality = $('quality');
    quality.textContent = '';
    quality.appendChild(row(['Unosa u sitemapu', String(q.sitemapEntries)]));
    quality.appendChild(row(['Unosa u sitemapu bez lokalne datoteke', String(q.sitemapMissingLocalFiles)]));
    quality.appendChild(row(['Provjerenih stranica', String(q.pagesChecked)]));
    quality.appendChild(row(['Stranica s neispravnim statičkim JSON-LD', String(q.jsonLdInvalidPages)]));

    var fresh = $('freshness');
    fresh.textContent = '';
    var mi = data.freshness.mediaIntelligence;
    fresh.appendChild(row(['Media Intelligence monitor', label(mi.status), mi.lastUpdateAt ? new Date(mi.lastUpdateAt).toLocaleDateString('hr-HR', { timeZone: 'Europe/Zagreb' }) : 'nije poznato']));
    data.freshness.siteResources.forEach(function (r) {
      fresh.appendChild(row([r.name, label(r.status), '—']));
    });

    var np = $('not-monitored');
    np.textContent = '';
    data.notMonitored.forEach(function (n) { np.appendChild(el('li', n.name + ': ' + n.reason)); });

    var lim = $('limitations');
    lim.textContent = '';
    data.knownLimitations.forEach(function (l) { lim.appendChild(el('li', l)); });

    var hist = $('history');
    hist.textContent = '';
    data.history.forEach(function (h) {
      hist.appendChild(row([new Date(h.generatedAt).toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' }), label(h.overallStatus)]));
    });
  }

  function fail() {
    $('status').textContent = 'Snimak trenutačno nije dostupan. Pokušajte ponovno kasnije.';
  }

  fetch('../data/public_service_status.json', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (r) {
      if (!r.ok) throw new Error('http');
      return r.json();
    })
    .then(function (data) {
      if (data.snapshotType !== 'repository-snapshot') throw new Error('unexpected');
      render(data);
    })
    .catch(fail);
})();
