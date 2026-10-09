/* GNK ASG — Javna knjižnica metodologija: sučelje. Katalog se dohvaća s istog izvora (/data/methodology_catalog.json); prikaz ide preko textContent. */
(function () {
  'use strict';
  var calc = window.GNKMethodology;
  if (!calc) return;

  var catalog = null;
  var listEl = document.getElementById('methods');
  var searchEl = document.getElementById('search');
  var areaEl = document.getElementById('area');
  var countEl = document.getElementById('count');
  var statusEl = document.getElementById('status');

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = String(text);
    return n;
  }

  function matches(m, q, area) {
    if (area && m.area !== area) return false;
    if (!q) return true;
    var hay = [m.name, m.area, m.purpose, m.formula, m.output.unit].concat(m.inputs.map(function (i) { return i.name + ' ' + i.description; })).join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function buildCalculator(m) {
    var wrap = el('div', { class: 'dt-calc' });
    wrap.appendChild(el('h4', null, 'Kalkulator'));
    var form = el('form', { class: 'dt-calc-form', novalidate: 'novalidate' });
    var fields = {};
    m.inputs.forEach(function (inp) {
      var id = 'calc-' + m.id + '-' + inp.name;
      var label = el('label', { for: id }, inp.name + ' (' + inp.unit + ')');
      var input = el('input', { id: id, type: 'text', autocomplete: 'off', spellcheck: 'false' });
      input.value = m.example.inputs[inp.name] != null ? String(m.example.inputs[inp.name]) : '';
      fields[inp.name] = input;
      form.appendChild(label);
      form.appendChild(input);
    });
    var btn = el('button', { type: 'submit' }, 'Izračunaj');
    form.appendChild(btn);
    var out = el('p', { class: 'dt-note', 'aria-live': 'polite' });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var values = {};
      Object.keys(fields).forEach(function (k) { values[k] = fields[k].value.trim(); });
      var r = calc.calculate(m.id, values);
      if (!r.ok) {
        var msgs = {
          invalid_number: 'Unesite broj (decimalni zarez ili točka).',
          division_by_zero: 'Vrijednost u nazivniku ne smije biti 0.',
          downtime_out_of_range: 'Prekid mora biti između 0 i ukupnog vremena.',
          scale_out_of_range: 'Skala mora biti između 1 i 5.',
          confidence_out_of_range: 'Pouzdanost mora biti između 0 i 1.',
          p_out_of_range: 'Udio p mora biti strogo između 0 i 1.',
          negative_contribution: 'Cijena je manja od varijabilnog troška, pa točka pokrića ne postoji.',
          invalid_hex: 'Boja mora biti u obliku #RRGGBB.'
        };
        out.textContent = msgs[r.error] || 'Izračun nije moguć s ovim unosom.';
        return;
      }
      var val = r.value;
      var shown = Math.abs(val) >= 1000 ? val.toLocaleString('hr-HR', { maximumFractionDigits: 2 }) : String(Math.round(val * 10000) / 10000);
      out.textContent = 'Rezultat: ' + shown + ' ' + m.output.unit;
    });
    wrap.appendChild(form);
    wrap.appendChild(out);
    return wrap;
  }

  function buildCard(m) {
    var art = el('article', { class: 'dt-card dt-method', id: m.id, 'aria-labelledby': m.id + '-h' });
    art.appendChild(el('p', { class: 'dt-note' }, m.area));
    var h = el('h2', { id: m.id + '-h' }, m.name);
    art.appendChild(h);
    art.appendChild(el('p', null, m.purpose));
    var f = el('p', null, 'Formula: ');
    f.appendChild(el('code', null, m.formula));
    art.appendChild(f);

    art.appendChild(el('h3', null, 'Ulazne varijable'));
    var ul = el('ul', { class: 'dt-findings' });
    m.inputs.forEach(function (i) { ul.appendChild(el('li', null, i.name + ' — ' + i.description + ' [' + i.unit + ']')); });
    art.appendChild(ul);

    art.appendChild(el('p', null, 'Izlaz: ' + m.output.unit));
    art.appendChild(el('p', null, 'Ograničenje: ' + m.limitation));
    art.appendChild(el('p', { class: 'dt-note' }, 'Verzija ' + m.version + ' · vlasnik: ' + m.owner + ' (' + m.ownerStatus + ') · sljedeća provjera: ' + m.reviewDue));

    var link = el('p', null, 'Trajna poveznica: ');
    link.appendChild(el('a', { href: m.permalink }, m.permalink));
    art.appendChild(link);

    art.appendChild(buildCalculator(m));
    return art;
  }

  function render() {
    var q = searchEl.value.trim().toLowerCase();
    var area = areaEl.value;
    listEl.textContent = '';
    var shown = catalog.methods.filter(function (m) { return matches(m, q, area); });
    shown.forEach(function (m) { listEl.appendChild(buildCard(m)); });
    countEl.textContent = 'Prikazano metoda: ' + shown.length + ' od ' + catalog.methods.length;
    if (shown.length === 0) listEl.appendChild(el('p', { class: 'dt-note' }, 'Nema metoda za ovaj upit.'));
  }

  function fillAreas() {
    var areas = [];
    catalog.methods.forEach(function (m) { if (areas.indexOf(m.area) === -1) areas.push(m.area); });
    areas.forEach(function (a) { areaEl.appendChild(el('option', { value: a }, a)); });
  }

  function openFromHash() {
    var id = decodeURIComponent((location.hash || '').replace('#', ''));
    if (!id) return;
    var target = document.getElementById(id);
    if (target) target.scrollIntoView();
  }

  function load() {
    fetch('../data/methodology_catalog.json', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('http');
        return r.json();
      })
      .then(function (data) {
        catalog = data;
        statusEl.textContent = 'Katalog verzija ' + data.catalogVersion + ' · sljedeći pregled: ' + data.nextReview + '. ' + data.note;
        fillAreas();
        render();
        openFromHash();
      })
      .catch(function () {
        statusEl.textContent = 'Katalog trenutačno nije dostupan. Pokušajte ponovno kasnije.';
      });
  }

  searchEl.addEventListener('input', function () { if (catalog) render(); });
  areaEl.addEventListener('change', function () { if (catalog) render(); });
  load();
})();
