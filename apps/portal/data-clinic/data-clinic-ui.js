/* GNK ASG Data Clinic — sloj sučelja. Prikaz ide preko textContent, bez umetanja HTML-a. Datoteke se čitaju lokalno (FileReader), ne šalju se. */
(function () {
  'use strict';
  var api = window.GNKDataClinic;
  if (!api) return;

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = String(text);
    return node;
  }
  function table(headers, rows) {
    var t = el('table', { class: 'dt-table' });
    var head = el('tr');
    headers.forEach(function (h) { head.appendChild(el('th', { scope: 'col' }, h)); });
    t.appendChild(head);
    rows.forEach(function (r) {
      var tr = el('tr');
      r.forEach(function (c) { tr.appendChild(el('td', null, c)); });
      t.appendChild(tr);
    });
    return t;
  }
  function note(container, text) { if (text) container.appendChild(el('p', { class: 'dt-note' }, text)); }
  function fail(out, error) {
    var msg = {
      empty: 'Unesite CSV tekst s barem jednim redom zaglavlja.',
      unclosed_quote: 'CSV ima nezatvoren navodnik. Provjerite navodnike u podacima.',
      column_not_found: 'Stupac nije pronađen u zaglavlju.'
    }[error] || 'Podaci se nisu mogli obraditi.';
    out.appendChild(el('p', { class: 'dt-note' }, msg));
  }

  function csvText() { return $('in-csv').value; }

  function runPrivacy() {
    var out = $('out-privacy'); out.textContent = '';
    var r = api.inspectCsvPrivacy(csvText());
    if (!r.ok) return fail(out, r.error);
    out.appendChild(el('p', null, 'Redova: ' + r.rows + ' · ukupno nalaza: ' + r.totalFindings));
    var headers = ['Stupac'].concat(r.categories.map(function (c) { return c.label; }));
    var rows = r.columns.map(function (c) {
      return [c.name].concat(r.categories.map(function (cat) { return c.counts[cat.id]; }));
    });
    out.appendChild(table(headers, rows));
    note(out, r.note);
  }

  function runMissing() {
    var out = $('out-missing'); out.textContent = '';
    var r = api.exploreMissingData(csvText());
    if (!r.ok) return fail(out, r.error);
    out.appendChild(el('p', null, 'Redova: ' + r.rows + (r.raggedRows ? ' · redova s pogrešnim brojem polja: ' + r.raggedRows : '')));
    out.appendChild(table(['Stupac', 'Prazne vrijednosti', 'Redova', 'Udio praznih (%)'],
      r.columns.map(function (c) { return [c.name, c.empty, c.rows, c.share.toFixed(1)]; })));
  }

  function runUnits() {
    var out = $('out-units'); out.textContent = '';
    var r = api.checkUnitConsistency(csvText());
    if (!r.ok) return fail(out, r.error);
    out.appendChild(el('p', null, 'Stupaca s miješanim jedinicama: ' + r.mixedColumns));
    out.appendChild(table(['Stupac', 'Klasificirane vrijednosti', 'Jedinice (broj)', 'Status'],
      r.columns.filter(function (c) { return c.classified > 0; }).map(function (c) {
        return [
          c.name,
          c.classified,
          c.units.map(function (u) { return u.unit + ' (' + u.count + ')'; }).join(', '),
          c.mixed ? 'miješano' : 'dosljedno'
        ];
      })));
    note(out, r.note);
  }

  function runDates() {
    var out = $('out-dates'); out.textContent = '';
    var col = $('in-date-col').value.trim();
    var r = api.normalizeDateColumn(csvText(), col);
    if (!r.ok) return fail(out, r.error);
    var s = r.summary;
    out.appendChild(el('p', null, 'ISO: ' + s.iso + ' · normalizirano: ' + s.normalized + ' · dvosmisleno: ' + s.ambiguous + ' · nevaljano: ' + s.invalid + ' · prazno: ' + s.empty));
    var lines = r.results.map(function (x, i) {
      if (x.status === 'ambiguous') return (i + 1) + '. dvosmisleno (provjerite format)';
      if (x.status === 'invalid') return (i + 1) + '. nevaljano';
      if (x.status === 'empty') return (i + 1) + '. prazno';
      return (i + 1) + '. ' + x.iso + ' (' + x.status + ')';
    });
    out.appendChild(el('pre', { class: 'dt-code' }, lines.join('\n')));
    note(out, 'Dvosmisleni datumi (npr. 03/04/2026) se ne pretvaraju automatski. Podržani ulazi: YYYY-MM-DD, D.M.YYYY. i D/M/YYYY ili M/D/YYYY kad je jedan dio veći od 12.');
  }

  function runContract() {
    var out = $('out-contract'); out.textContent = '';
    var r = api.buildDataContract($('in-contract').value);
    if (!r.ok) {
      out.appendChild(el('p', { class: 'dt-note' }, 'Ugovor nije valjan. Pogreške:'));
      var list = el('ul', { class: 'dt-findings' });
      r.errors.forEach(function (e) {
        var labels = {
          empty: 'prazan unos',
          expected_4_columns: 'očekuje se 4 stupca: naziv;tip;obavezno;klasifikacija',
          invalid_name: 'naziv mora biti mala slova, brojevi i _ (2–64 znaka)',
          unknown_type: 'nepoznat tip (dopušteno: ' + api.CONTRACT_TYPES.join(', ') + ')',
          invalid_required_flag: 'obavezno mora biti da/ne',
          unknown_classification: 'nepoznata klasifikacija (dopušteno: ' + api.CLASSIFICATIONS.join(', ') + ')',
          duplicate_name: 'naziv je već upotrijebljen'
        };
        list.appendChild(el('li', null, 'Redak ' + e.line + ': ' + (labels[e.error] || e.error)));
      });
      out.appendChild(list);
      return;
    }
    out.appendChild(el('p', null, 'Ugovor je valjan. Polja: ' + r.contract.fields.length));
    out.appendChild(el('pre', { class: 'dt-code' }, JSON.stringify(r.contract, null, 2)));
    if (r.contract.personalDataFields.length) {
      note(out, 'Polja s klasifikacijom personal_data: ' + r.contract.personalDataFields.join(', ') + '. Provjerite pravnu osnovu prije obrade.');
    }
  }

  function clearAll() {
    $('in-csv').value = '';
    ['out-privacy', 'out-missing', 'out-units', 'out-dates', 'out-contract'].forEach(function (id) { $(id).textContent = ''; });
  }

  function loadLocalFile(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      $('file-status').textContent = 'Datoteka je veća od 2 MB. Zalijepite dio podataka.';
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      $('in-csv').value = String(reader.result || '');
      $('file-status').textContent = 'Datoteka je učitana lokalno i nije poslana na poslužitelj.';
    };
    reader.readAsText(file, 'utf-8');
  }

  function bind(id, fn) { var b = $(id); if (b) b.addEventListener('click', fn); }

  function init() {
    bind('btn-privacy', runPrivacy);
    bind('btn-missing', runMissing);
    bind('btn-units', runUnits);
    bind('btn-dates', runDates);
    bind('btn-contract', runContract);
    bind('clear-all', clearAll);
    var f = $('in-file');
    if (f) f.addEventListener('change', loadLocalFile);
    $('status').textContent = 'Alati rade lokalno u pregledniku. Ništa se ne šalje niti sprema.';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
