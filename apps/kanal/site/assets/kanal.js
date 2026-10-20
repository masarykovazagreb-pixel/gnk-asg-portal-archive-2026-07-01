/* GNK ASG KANAL — minimalni, bez ovisnosti, bez trackera. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var body = document.body;

  /* ---------- tema ---------- */
  var KEY = 'kanal-theme';
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') doc.setAttribute('data-theme', saved);
  } catch (e) {}
  var toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    var isDark = function () {
      var t = doc.getAttribute('data-theme');
      if (t) return t === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    var paint = function () {
      var dark = isDark();
      toggle.textContent = dark ? '☀' : '☾';
      toggle.setAttribute('aria-label', dark ? 'Uključi svjetlu temu' : 'Uključi tamnu temu');
      toggle.setAttribute('title', toggle.getAttribute('aria-label'));
    };
    paint();
    toggle.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      doc.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      paint();
    });
  }

  /* ---------- progress čitanja ---------- */
  var bar = document.getElementById('progress');
  var article = document.querySelector('.article-body');
  if (bar && article) {
    var raf = false;
    var update = function () {
      raf = false;
      var start = article.offsetTop;
      var total = article.offsetHeight - window.innerHeight * 0.55;
      var pct = ((window.scrollY - start + window.innerHeight * 0.35) / Math.max(total, 1)) * 100;
      bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    };
    var onScroll = function () {
      if (!raf) { raf = true; window.requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- kopiranje poveznice ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-copy') || location.href;
      var done = function () {
        var old = btn.getAttribute('aria-label') || '';
        btn.setAttribute('aria-label', 'Poveznica kopirana');
        btn.classList.add('is-done');
        setTimeout(function () { btn.setAttribute('aria-label', old); btn.classList.remove('is-done'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () {});
      } else {
        var t = document.createElement('textarea');
        t.value = url; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(t);
      }
    });
  });

  /* ---------- komentari ---------- */
  var list = document.getElementById('comment-list');
  var count = document.getElementById('comment-count');
  if (list && body) {
    var slug = body.getAttribute('data-slug');
    var root = body.getAttribute('data-root') || '';
    var title = body.getAttribute('data-title') || document.title;
    fetch(root + 'data/comments/' + slug + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('no file'); return r.json(); })
      .then(function (data) {
        var items = (data && data.comments) || [];
        if (count) count.textContent = items.length + (items.length === 1 ? ' komentar' : ' komentara');
        if (!items.length) return;
        var empty = list.querySelector('.comment-empty');
        if (empty) empty.remove();
        items.forEach(function (c) {
          var li = document.createElement('li');
          li.className = 'comment';
          var meta = document.createElement('div');
          meta.className = 'comment-meta';
          var b = document.createElement('b');
          b.textContent = c.author || 'Čitatelj';
          meta.appendChild(b);
          if (c.role) {
            var pill = document.createElement('span');
            pill.className = 'pill';
            pill.textContent = c.role;
            meta.appendChild(pill);
          }
          var time = document.createElement('time');
          time.dateTime = c.date || '';
          time.textContent = c.dateLabel || c.date || '';
          meta.appendChild(time);
          var p = document.createElement('p');
          p.textContent = c.text || '';
          li.appendChild(meta); li.appendChild(p); list.appendChild(li);
        });
      })
      .catch(function () { /* ostaje prazno stanje */ });

    var form = document.querySelector('[data-comment-form]');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var name = (form.querySelector('[name=name]') || {}).value || 'Čitatelj';
        var text = (form.querySelector('[name=text]') || {}).value || '';
        if (text.trim().length < 3) return;
        var subject = 'Komentar na KANAL: ' + title;
        var bodyText = text + '\n\n— ' + name + '\n' + location.href + '\n\n(Poslano s obrasca na kanalu. Molimo ne mijenjati ovaj redak.)';
        location.href = 'mailto:info@gnk-asg.hr?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyText);
      });
    }
  }

  /* ---------- filtri tema na naslovnici ---------- */
  var search = document.querySelector('[data-filter]');
  if (search) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-card]'));
    search.addEventListener('input', function () {
      var q = search.value.toLowerCase().trim();
      cards.forEach(function (card) {
        var hay = (card.getAttribute('data-card') || '').toLowerCase();
        card.hidden = q.length > 0 && hay.indexOf(q) === -1;
      });
    });
  }

  /* ---------- godina ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
