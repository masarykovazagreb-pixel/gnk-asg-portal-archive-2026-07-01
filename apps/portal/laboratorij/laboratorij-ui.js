// GNK ASG — Laboratorij: prikaz alata iz TOOLS. Obrasci se grade iz definicija, izlaz ide kroz textContent.
(function () {
  'use strict';
  var L = window.GNKLab;

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function fieldNode(tool, f) {
    var id = tool.id + '--' + f.name;
    var wrap = el('div', { class: 'dt-field' });
    wrap.appendChild(el('label', { for: id }, f.label));
    if (f.type === 'select') {
      var sel = el('select', { id: id, name: f.name, class: 'dt-select' });
      f.options.forEach(function (o) {
        var opt = el('option', { value: o[0] }, o[1]);
        if (o[0] === f.default) opt.setAttribute('selected', 'selected');
        sel.appendChild(opt);
      });
      wrap.appendChild(sel);
    } else {
      var input = el('input', { id: id, name: f.name, type: f.type === 'date' ? 'date' : 'text', value: f.default, autocomplete: 'off', spellcheck: 'false' });
      wrap.appendChild(input);
    }
    return wrap;
  }

  function readValues(form, tool) {
    var values = {};
    tool.fields.forEach(function (f) {
      var node = form.querySelector('[name="' + f.name + '"]');
      values[f.name] = node ? node.value : '';
    });
    return values;
  }

  function show(out, res) {
    out.textContent = '';
    if (res.ok) {
      out.classList.remove('dt-error');
      out.textContent = res.text;
    } else {
      out.classList.add('dt-error');
      out.textContent = 'Greška: ' + res.error;
    }
  }

  function buildTool(tool) {
    var sec = el('section', { class: 'dt-card lab-tool', id: tool.id, 'aria-labelledby': tool.id + '-h' });
    sec.appendChild(el('h3', { id: tool.id + '-h' }, tool.name));
    sec.appendChild(el('p', { class: 'dt-note' }, tool.description));
    var form = el('form', { novalidate: 'novalidate' });
    tool.fields.forEach(function (f) { form.appendChild(fieldNode(tool, f)); });
    var btn = el('button', { type: 'submit' }, 'Izračunaj');
    form.appendChild(btn);
    var out = el('p', { class: 'dt-output', role: 'status', 'aria-live': 'polite', id: tool.id + '--out' });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      show(out, L.run(tool.id, readValues(form, tool)));
    });
    sec.appendChild(form);
    sec.appendChild(out);
    show(out, L.run(tool.id, readValues(form, tool)));
    return sec;
  }

  function init() {
    var root = document.getElementById('alati');
    var groups = [];
    L.TOOLS.forEach(function (t) { if (groups.indexOf(t.group) < 0) groups.push(t.group); });
    groups.forEach(function (g) {
      var h = el('h2', { id: 'grupa-' + g.toLowerCase().replace(/[^a-z0-9]+/g, '-') }, g);
      root.appendChild(h);
      L.TOOLS.filter(function (t) { return t.group === g; }).forEach(function (t) { root.appendChild(buildTool(t)); });
    });
    document.getElementById('count').textContent = 'Alata: ' + L.TOOLS.length + '. Svi izračuni rade u pregledniku.';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
