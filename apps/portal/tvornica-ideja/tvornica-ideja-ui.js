// GNK ASG — Tvornica ideja: prikaz popisa, pretraga, filtar i unos nove ideje. Samo textContent, bez innerHTML.
(function () {
  'use strict';
  var F = window.GNKIdeaFactory;
  var ideas = [];
  var userIdeas = [];
  var nextId = 1;

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function allIdeas() { return ideas.concat(userIdeas); }

  function render() {
    var list = $('ideas');
    list.textContent = '';
    var query = $('search').value;
    var area = $('area').value;
    var items = F.rank(allIdeas(), { area: area, query: query });
    $('count').textContent = 'Prikazano: ' + items.length + ' od ' + allIdeas().length + ' ideja.';
    if (items.length === 0) {
      list.appendChild(el('li', { class: 'dt-note' }, 'Nema ideja za ovaj filtar.'));
      return;
    }
    items.forEach(function (it) {
      var li = el('li', { class: 'dt-method', id: it.id });
      li.appendChild(el('h3', null, it.title));
      li.appendChild(el('p', { class: 'dt-note' },
        'Ocjena ' + it.score + ' · područje: ' + it.area + ' · utjecaj ' + it.impact +
        ', pouzdanost ' + it.confidence + ', trud ' + it.effort + ' · status: ' + it.status));
      if (it.problem) li.appendChild(el('p', null, it.problem));
      if (it.route) {
        var p = el('p', null, 'Povezana stranica: ');
        p.appendChild(el('a', { href: it.route }, it.route));
        li.appendChild(p);
      }
      li.appendChild(el('p', { class: 'dt-note' },
        'Izvor: ' + (it.source || 'nije naveden') + ' · vlasnik: ' + (it.owner || 'nije dodijeljen')));
      list.appendChild(li);
    });
  }

  function fillAreas() {
    var sel = $('area');
    F.AREAS.forEach(function (a) { sel.appendChild(el('option', { value: a }, a)); });
  }

  function onSubmit(ev) {
    ev.preventDefault();
    var errs = $('form-errors');
    errs.textContent = '';
    var candidate = {
      title: $('f-title').value,
      problem: $('f-problem').value,
      area: $('f-area').value,
      impact: Number($('f-impact').value),
      confidence: Number($('f-confidence').value),
      effort: Number($('f-effort').value),
      status: 'otvoreno'
    };
    var v = F.validate(candidate);
    if (!v.ok) {
      v.errors.forEach(function (msg) { errs.appendChild(el('p', { class: 'dt-note' }, msg)); });
      return;
    }
    candidate.title = candidate.title.trim();
    candidate.id = 'korisnik-' + nextId++;
    candidate.source = 'unos u pregledniku (nije spremljeno)';
    candidate.owner = null;
    userIdeas.push(candidate);
    ev.target.reset();
    render();
    $('status').textContent = 'Ideja je dodana u ovu karticu. Nestaje pri osvježavanju stranice.';
  }

  function fail(msg) {
    $('status').textContent = msg;
  }

  function init() {
    fillAreas();
    $('search').addEventListener('input', render);
    $('area').addEventListener('change', render);
    $('new-idea').addEventListener('submit', onSubmit);
    fetch('../data/idea_factory.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (doc) {
        ideas = doc.ideas || [];
        var s = F.summarize(ideas);
        $('status').textContent = 'Učitano ' + s.valid + ' ideja: ' + (s.byStatus.gotovo || 0) + ' gotovo, ' + (s.byStatus.otvoreno || 0) + ' otvoreno. Statusi su radna evidencija provedbe.';
        render();
      })
      .catch(function () { fail('Popis ideja nije učitan. Pokušajte ponovno kasnije.'); render(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
