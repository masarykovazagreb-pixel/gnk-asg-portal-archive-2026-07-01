/* GNK ASG Developer Tools — sloj sučelja. Sav prikaz ide preko textContent, bez umetanja HTML-a. */
(function () {
  'use strict';
  var api = window.GNKDeveloperTools;
  if (!api) return;

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = String(text);
    return node;
  }

  var SEVERITY_LABEL = { critical: 'Kritično', high: 'Visoko', medium: 'Srednje', low: 'Nisko' };

  function renderFindings(container, findings) {
    container.textContent = '';
    if (!findings || findings.length === 0) {
      container.appendChild(el('p', { class: 'dt-ok' }, 'Nema nalaza u ovoj provjeri.'));
      return;
    }
    var list = el('ul', { class: 'dt-findings' });
    findings.forEach(function (f) {
      var li = el('li', { class: 'dt-sev-' + f.severity });
      li.appendChild(el('strong', null, SEVERITY_LABEL[f.severity] || f.severity));
      li.appendChild(document.createTextNode(': ' + f.text));
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  function renderNote(container, note) {
    if (note) container.appendChild(el('p', { class: 'dt-note' }, note));
  }

  function setStatus(id, text) { $(id).textContent = text; }

  /* 1. URL */
  function runUrl() {
    var out = $('out-url');
    out.textContent = '';
    var result = api.inspectUrl($('in-url').value);
    if (!result.ok) {
      renderFindings(out, result.findings);
      if (result.error === 'empty') out.appendChild(el('p', { class: 'dt-note' }, 'Unesite URL za provjeru.'));
      return;
    }
    out.appendChild(el('p', null, 'Formalna ocjena: ' + result.score + '/100'));
    renderFindings(out, result.findings);
    renderNote(out, result.note);
  }

  /* 2. Headers */
  function runHeaders() {
    var out = $('out-headers');
    out.textContent = '';
    var result = api.analyzeHeaders($('in-headers').value);
    if (!result.ok) {
      out.appendChild(el('p', { class: 'dt-note' }, 'Nisu pronađena zaglavlja u obliku "Naziv: vrijednost".'));
      return;
    }
    out.appendChild(el('p', null, 'Ocjena zaglavlja: ' + result.score + '/100'));
    renderFindings(out, result.findings);
    renderNote(out, result.note);
  }

  /* 3. CSP */
  function runCsp() {
    var out = $('out-csp');
    out.textContent = '';
    var result = api.buildCsp({
      allowInlineScripts: $('opt-inline').checked,
      allowExternalHttpsImages: $('opt-images').checked,
      allowLocalFrames: $('opt-frames').checked
    });
    out.appendChild(el('p', null, 'Politika (HTTP zaglavlje):'));
    out.appendChild(el('pre', { class: 'dt-code' }, result.policy));
    out.appendChild(el('p', null, 'Meta oznaka (privremeno, bez frame-ancestors):'));
    out.appendChild(el('pre', { class: 'dt-code' }, result.metaTag));
    var list = el('ul', { class: 'dt-findings' });
    result.notes.forEach(function (n) { list.appendChild(el('li', null, n)); });
    out.appendChild(list);
  }

  /* 4. Log */
  function runLog() {
    var out = $('out-log');
    out.textContent = '';
    var result = api.scanLogPrivacy($('in-log').value);
    out.appendChild(el('p', null, 'Ukupno nalaza: ' + result.totalFindings + ' (redova: ' + result.lines + ')'));
    var table = el('table', { class: 'dt-table' });
    var head = el('tr');
    head.appendChild(el('th', { scope: 'col' }, 'Kategorija'));
    head.appendChild(el('th', { scope: 'col' }, 'Broj'));
    table.appendChild(head);
    result.categories.forEach(function (c) {
      var tr = el('tr');
      tr.appendChild(el('td', null, c.label));
      tr.appendChild(el('td', null, c.count));
      table.appendChild(tr);
    });
    out.appendChild(table);
    renderNote(out, result.note);
  }

  /* 5. JSON */
  function runJson() {
    var out = $('out-json');
    out.textContent = '';
    var result = api.compareJsonSchemas($('in-json-a').value, $('in-json-b').value);
    if (!result.ok) {
      out.appendChild(el('p', { class: 'dt-note' }, 'Nevaljan JSON na strani ' + result.side + '. Provjerite zarez, navodnike i zagrade.'));
      return;
    }
    if (result.changes.length === 0) {
      out.appendChild(el('p', { class: 'dt-ok' }, 'Nema razlika u strukturi.'));
      return;
    }
    out.appendChild(el('p', null, 'Pronađeno promjena: ' + result.changes.length));
    var list = el('ul', { class: 'dt-findings' });
    result.changes.forEach(function (c) {
      var li = el('li');
      li.appendChild(el('code', null, c.path));
      li.appendChild(document.createTextNode(' — ' + c.kind + ' (' + c.from + ' → ' + c.to + ')'));
      list.appendChild(li);
    });
    out.appendChild(list);
    renderNote(out, result.note);
  }

  function clearInputs(ids) {
    ids.forEach(function (id) { var n = $(id); if (n) n.value = ''; });
  }

  function bind(buttonId, handler) {
    var b = $(buttonId);
    if (b) b.addEventListener('click', handler);
  }

  function init() {
    bind('btn-url', runUrl);
    bind('btn-headers', runHeaders);
    bind('btn-csp', runCsp);
    bind('btn-log', runLog);
    bind('btn-json', runJson);
    bind('clear-url', function () { clearInputs(['in-url']); $('out-url').textContent = ''; });
    bind('clear-headers', function () { clearInputs(['in-headers']); $('out-headers').textContent = ''; });
    bind('clear-log', function () { clearInputs(['in-log']); $('out-log').textContent = ''; });
    bind('clear-json', function () { clearInputs(['in-json-a', 'in-json-b']); $('out-json').textContent = ''; });
    setStatus('status', 'Alati rade lokalno u pregledniku. Ništa se ne šalje niti sprema.');
    runCsp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
