/* SPT — Sports Performance Tracking · showcase · produced by GNK ASG · Nermin Sefić */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.remove('no-js'); root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }

  /* ---------- izbornik ---------- */
  var hd = $('.hd'), burger = $('.burger');
  if (burger && hd) {
    burger.addEventListener('click', function () {
      var o = hd.classList.toggle('open');
      burger.setAttribute('aria-expanded', o ? 'true' : 'false');
      root.classList.toggle('spt-menu-open', o);
    });
    $$('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { hd.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); root.classList.remove('spt-menu-open'); });
    });
  }
  /* ---------- kompaktni izbornik kad navigacija ne stane (duži prijevodi) ---------- */
  var hdIn = $('.hd-in');
  function fitNav() {
    if (!hd || !hdIn) return;
    hd.classList.remove('cmp');
    if (hdIn.scrollWidth > hdIn.clientWidth + 1) hd.classList.add('cmp');
    else if (burger && window.getComputedStyle(burger).display === 'none') { hd.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); root.classList.remove('spt-menu-open'); }
  }
  if (hd && hdIn) {
    fitNav();
    var fnT;
    window.addEventListener('resize', function () { clearTimeout(fnT); fnT = setTimeout(fitNav, 120); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(fitNav);
  }
  /* ---------- suživot s globalnim zaglavljem portala (worker ubacuje public-unified-menu-v6.js) ----------
     - SPT traka ide ispod portalnog headera (visina se mjeri)
     - portalni HR/EN vodi na istu SPT stranicu na tom jeziku (hreflang), ne na naslovnicu
     - Dinamo znak se na SPT stranicama ne prikazuje (meta gnk-watermark=off); radio se otvara smanjen */
  (function shell() {
    function alt(code) { var l = $('link[rel="alternate"][hreflang="' + code + '"]'); return l ? l.getAttribute('href') : null; }
    var radioDone = false;
    function sync() {
      var h = d.getElementById('gnk-unified-header'), hh = 0;
      if (h) {
        hh = Math.round(h.getBoundingClientRect().height) || 84;
        root.style.setProperty('--gnk-header-h', hh + 'px');
        var hr = $('.lang a[aria-label="Hrvatski"]', h), en = $('.lang a[aria-label="English"]', h), ah = alt('hr'), ae = alt('en');
        if (hr && ah) hr.setAttribute('href', ah);
        if (en && ae) en.setAttribute('href', ae);
        var pl = String(root.lang || '').toLowerCase();
        if (hr && en && pl.indexOf('hr') !== 0 && pl.indexOf('en') !== 0) { hr.removeAttribute('aria-current'); en.removeAttribute('aria-current'); }
      }
      var radio = d.getElementById('aktualMediaRadioFloat');
      if (radio && !radioDone) {
        radioDone = true;
        if (!radio.classList.contains('amr-collapsed')) { var c = $('[data-amr-collapse]', radio); if (c) c.click(); }
        var amr = function () { root.style.setProperty('--amr-h', (radio.offsetHeight ? radio.offsetHeight + 10 : 0) + 'px'); };
        amr();
        if ('ResizeObserver' in window) new ResizeObserver(amr).observe(radio);
      }
      fitNav();
    }
    sync();
    if ('MutationObserver' in window && d.body) {
      var mo = new MutationObserver(function (list) {
        for (var k = 0; k < list.length; k++) { if (list[k].addedNodes.length) { sync(); return; } }
      });
      mo.observe(d.body, { childList: true });
      setTimeout(function () { mo.disconnect(); }, 20000);
    }
    var shT;
    window.addEventListener('resize', function () { clearTimeout(shT); shT = setTimeout(sync, 150); });
  })();
  /* ---------- jezični izbornik: zatvori klikom van / Esc ---------- */
  var lng = $('.lng');
  if (lng) {
    d.addEventListener('click', function (e) { if (lng.open && !lng.contains(e.target)) lng.open = false; });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { lng.open = false; if (hd) hd.classList.remove('open'); root.classList.remove('spt-menu-open'); } });
  }

  /* ---------- prijedlog jezika (bez automatskog preusmjeravanja) ---------- */
  try {
    var box = $('#lsug'), L10N = window.SPT_L10N || {}, cur = root.lang;
    if (box && !localStorage.getItem('spt-lsug')) {
      var alts = {};
      $$('link[rel="alternate"][hreflang]').forEach(function (l) {
        var h = l.getAttribute('hreflang'); if (h !== 'x-default') alts[h] = l.getAttribute('href');
      });
      var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
      for (var i = 0; i < prefs.length; i++) {
        var c = String(prefs[i]).toLowerCase().split('-')[0];
        if (c === 'nb' || c === 'nn') c = 'no';
        if (c === 'bs' || c === 'cnr') c = 'hr';
        if (c === cur) break;
        if (alts[c] && L10N[c]) {
          var t = L10N[c];
          box.setAttribute('lang', c);
          var sp = d.createElement('span'); sp.textContent = t.s + ' ';
          var b = d.createElement('b'); b.textContent = t.n; sp.appendChild(b);
          var a = d.createElement('a'); a.href = alts[c]; a.hreflang = c; a.textContent = t.g;
          var x = d.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', t.c); x.textContent = '×';
          x.addEventListener('click', function () { box.hidden = true; try { localStorage.setItem('spt-lsug', '1'); } catch (e) {} });
          a.addEventListener('click', function () { try { localStorage.setItem('spt-lsug', '1'); } catch (e) {} });
          box.appendChild(sp); box.appendChild(a); box.appendChild(x); box.hidden = false;
          break;
        }
      }
    }
  } catch (e) { /* tiho */ }

  /* ---------- pojavljivanje pri skrolanju ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.sec .sh, .week li, .card, .scard, .hcard, .fcard, .deep, .wcard, .tl li, .film-box, .demo, .duo figure, .wide-fig, .oem-top, .flow, .spec, .ggrid li, .qa, .pcard, .ancard').forEach(function (el) {
      el.classList.add('rv'); io.observe(el);
    });
  }

  /* ---------- kopiraj link ---------- */
  $$('.sh-copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-url'), orig = btn.textContent;
      var done = function () { btn.textContent = btn.parentNode.getAttribute('data-copied') || '✓'; setTimeout(function () { btn.textContent = orig; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url); done(); });
      } else { fallbackCopy(url); done(); }
    });
  });
  function fallbackCopy(t) {
    var i = d.createElement('textarea'); i.value = t; i.setAttribute('readonly', ''); i.style.position = 'fixed'; i.style.opacity = '0';
    d.body.appendChild(i); i.select(); try { d.execCommand('copy'); } catch (e) {} d.body.removeChild(i);
  }

  /* ---------- film: #t=NN i poglavlja ---------- */
  var film = $('#spt-film');
  if (film) {
    var seek = function (s, play) {
      var go = function () { try { film.currentTime = s; if (play) film.play(); } catch (e) {} };
      if (film.readyState >= 1) go(); else film.addEventListener('loadedmetadata', go, { once: true });
    };
    var m = /#t=(\d+)/.exec(location.hash); if (m) seek(+m[1], false);
    $$('.chap a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault(); var s = +a.getAttribute('data-t');
        if (history.replaceState) history.replaceState(null, '', '#t=' + s);
        film.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); seek(s, true);
      });
    });
  }

  /* ---------- hero HUD ---------- */
  var hud = $('.hero-hud');
  if (hud && !reduce) {
    var hs = { spd: 24.1, hr: 171, dst: 8.42 }, ht = 0;
    var eS = $('[data-hud="spd"]', hud), eH = $('[data-hud="hr"]', hud), eD = $('[data-hud="dst"]', hud), eL = $('[data-hud="load"]', hud);
    setInterval(function () {
      if (d.hidden) return;
      ht++;
      var target = (ht % 9 === 0) ? 31 + Math.random() * 1.2 : 12 + Math.random() * 14;
      hs.spd += (target - hs.spd) * 0.55;
      hs.hr += ((118 + hs.spd * 2.15) - hs.hr) * 0.35;
      hs.dst += hs.spd / 3600 * 1.2;
      eS.textContent = hs.spd.toFixed(1); eH.textContent = Math.round(Math.min(193, hs.hr)); eD.textContent = hs.dst.toFixed(2);
      eL.style.width = Math.round(40 + hs.spd * 1.5) + '%';
    }, 1200);
  }

  /* ---------- LIVE demo: Coastline United : Bay City (simulacija) ---------- */
  var cv = $('#pitch');
  if (cv && cv.getContext) liveDemo(cv);

  function liveDemo(cv) {
    var ctx = cv.getContext('2d');
    var box = cv.closest('.demo');
    var el = {};
    ['spd', 'hr', 'dst', 'spr', 'load', 'top', 'score', 'clock', 'goal', 'alert'].forEach(function (k) { el[k] = $('[data-demo="' + k + '"]', box); });
    var PW = 105, PH = 68, W = 0, H = 0, dpr = 1, fx, fy, fw, fh;
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      var r = cv.getBoundingClientRect(); W = Math.max(320, r.width); H = W * 0.625;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      fx = W * 0.035; fy = H * 0.05; fw = W - 2 * fx; fh = H - 2 * fy;
    }
    function X(m) { return fx + m / PW * fw; }
    function Y(m) { return fy + m / PH * fh; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    var A = [[5, 34, 1], [25, 9, 2], [21, 26, 4], [21, 42, 5], [25, 59, 3], [42, 18, 8], [38, 34, 6], [42, 50, 10], [63, 12, 7], [67, 34, 9], [63, 56, 11]];
    var B = [[100, 34, 1], [80, 12, 2], [83, 27, 4], [83, 41, 5], [80, 56, 3], [65, 14, 7], [68, 28, 8], [68, 40, 6], [65, 54, 11], [53, 26, 9], [53, 42, 10]];
    var P = [];
    function mk(list, team) {
      list.forEach(function (p, i) {
        P.push({ bx: p[0], by: p[1], x: p[0], y: p[1], n: p[2], t: team, gk: i === 0, ph: rnd(0, 6.28), ph2: rnd(0, 6.28), f: rnd(.15, .3) });
      });
    }
    var S, ball, nine, six, trail;
    function reset() {
      P = []; mk(A, 0); mk(B, 1);
      nine = P[9]; six = P[6];
      ball = { x: 52, y: 34, owner: P[6], tx: 52, ty: 34, hold: 0.8 };
      trail = [];
      S = { t: 0, clock: 67 * 60 + 12, score: [2, 1], dist: 7.84, spr: 21, load: 612, top: 31.6, spd: 9, hr: 158, sprint: 0, nextSprint: 5, goalAt: 21, goalShown: false, alertOn: false };
      el.score.textContent = '2 : 1'; el.goal.hidden = true; el.alert.hidden = true;
    }
    function pickPass() {
      var o = ball.owner, mates = P.filter(function (p) { return p.t === o.t && p !== o && !p.gk; });
      var foes = P.filter(function (p) { return p.t !== o.t && !p.gk; });
      var pool = Math.random() < 0.8 ? mates : foes;
      if (o.t === 0 && Math.random() < 0.3) return nine;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function step(dt) {
      S.t += dt; S.clock += dt;
      var shx = (ball.x - 52.5) * 0.33, shy = (ball.y - 34) * 0.22;
      P.forEach(function (p) {
        var k = p.gk ? 0.08 : 1;
        var tx = p.bx + shx * k + Math.sin(S.t * p.f + p.ph) * 3.2 * k;
        var ty = p.by + shy * k + Math.cos(S.t * p.f * 1.3 + p.ph2) * 2.6 * k;
        var vmax = 4.2;
        if (p === nine) {
          if (S.sprint > 0) { tx = Math.min(97, p.x + 18); ty = p.y + (34 - p.y) * 0.2; vmax = 4.5 + Math.min(1, (2.6 - S.sprint) / 0.9) * 4.44; }
          else vmax = 4.6;
        }
        if (ball.owner && ball.owner !== p && ball.owner.t !== p.t && !p.gk) {
          var dd = Math.hypot(ball.x - p.x, ball.y - p.y);
          if (dd < 14) { tx = p.x + (ball.x - p.x) * 0.6; ty = p.y + (ball.y - p.y) * 0.6; }
        }
        var dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy), mv = Math.min(dist, vmax * dt);
        if (dist > 0.001) { p.x += dx / dist * mv; p.y += dy / dist * mv; }
        p.x = Math.max(1, Math.min(PW - 1, p.x)); p.y = Math.max(1, Math.min(PH - 1, p.y));
        if (p === nine) p.v = mv / dt;
      });
      if (S.sprint > 0) { S.sprint -= dt; if (S.sprint <= 0) { S.nextSprint = S.t + rnd(8, 12); } }
      else if (S.t > S.nextSprint) { S.sprint = 2.6; S.spr++; }
      var kmh = (nine.v || 0) * 3.6;
      S.spd += (kmh - S.spd) * Math.min(1, dt * 4);
      if (S.spd > S.top) S.top = Math.min(32.2, S.spd);
      S.hr += ((112 + S.spd * 2.25) - S.hr) * Math.min(1, dt * 0.6);
      S.dist += S.spd / 3600 * dt;
      S.load += (0.05 + S.spd * S.spd * 0.0009) * dt;
      if (ball.owner) {
        ball.hold -= dt;
        var o = ball.owner; ball.x += (o.x + (o.t === 0 ? 0.9 : -0.9) - ball.x) * Math.min(1, dt * 8); ball.y += (o.y - ball.y) * Math.min(1, dt * 8);
        if (ball.hold <= 0) { var tg = pickPass(); ball.owner = null; ball.target = tg; }
      } else if (ball.target) {
        var t = ball.target, bx = t.x - ball.x, by = t.y - ball.y, bd = Math.hypot(bx, by), bm = Math.min(bd, 19 * dt);
        if (bd < 1) { ball.owner = t; ball.hold = rnd(0.5, 1.5); ball.target = null; }
        else { ball.x += bx / bd * bm; ball.y += by / bd * bm; }
      }
      if (!S.goalShown && S.t > S.goalAt) {
        S.goalShown = true; S.score[0] = 3; el.score.textContent = '3 : 1'; el.goal.hidden = false;
        setTimeout(function () { el.goal.hidden = true; }, 2600);
        ball.owner = P[0]; ball.hold = 1.5; ball.x = 52.5; ball.y = 34;
      }
      var cyc = S.t % 34, on = cyc > 6 && cyc < 15;
      if (on !== S.alertOn) { S.alertOn = on; el.alert.hidden = !on; }
      if (S.t > 75) reset();
      if (Math.round(S.t * 60) % 3 === 0) { trail.push([nine.x, nine.y]); if (trail.length > 70) trail.shift(); }
    }
    function drawPitch() {
      var g = ctx;
      g.fillStyle = '#0b2a1b'; g.fillRect(0, 0, W, H);
      for (var i = 0; i < 12; i++) { if (i % 2) { g.fillStyle = 'rgba(255,255,255,0.025)'; g.fillRect(fx + i * fw / 12, fy, fw / 12, fh); } }
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.4;
      g.strokeRect(fx, fy, fw, fh);
      g.beginPath(); g.moveTo(X(52.5), fy); g.lineTo(X(52.5), fy + fh); g.stroke();
      g.beginPath(); g.ellipse(X(52.5), Y(34), 9.15 / PW * fw, 9.15 / PH * fh, 0, 0, 6.283); g.stroke();
      [[0, 1], [PW, -1]].forEach(function (s) {
        var x0 = s[0], dir = s[1];
        g.strokeRect(Math.min(X(x0), X(x0 + dir * 16.5)), Y(13.85), 16.5 / PW * fw, 40.3 / PH * fh);
        g.strokeRect(Math.min(X(x0), X(x0 + dir * 5.5)), Y(24.85), 5.5 / PW * fw, 18.3 / PH * fh);
        g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(Math.min(X(x0), X(x0 - dir * 1.6)), Y(30.34), 1.6 / PW * fw, 7.32 / PH * fh);
      });
    }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPitch();
      if (trail.length > 2) {
        for (var i = 1; i < trail.length; i++) {
          ctx.strokeStyle = 'rgba(182,240,60,' + (i / trail.length * 0.8).toFixed(3) + ')'; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(X(trail[i - 1][0]), Y(trail[i - 1][1])); ctx.lineTo(X(trail[i][0]), Y(trail[i][1])); ctx.stroke();
        }
      }
      var r = Math.max(5, W / 120);
      P.forEach(function (p) {
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), r, 0, 6.283);
        ctx.fillStyle = p.t === 0 ? '#3dd6f5' : 'rgba(233,240,248,0.88)'; ctx.fill();
        ctx.fillStyle = p.t === 0 ? '#00222c' : '#1b2533';
        ctx.font = '700 ' + Math.round(r * 1.05) + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.n, X(p.x), Y(p.y) + 0.5);
      });
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#b6f03c';
      ctx.beginPath(); ctx.arc(X(nine.x), Y(nine.y), r + 5, 0, 6.283); ctx.stroke();
      label(nine, '#9  ' + S.spd.toFixed(1) + ' km/h', '#b6f03c');
      if (S.alertOn) {
        var pr = r + 6 + Math.sin(S.t * 6) * 2.5;
        ctx.strokeStyle = '#ff5a63'; ctx.beginPath(); ctx.arc(X(six.x), Y(six.y), pr, 0, 6.283); ctx.stroke();
        label(six, '#6  ACWR 1.52', '#ff5a63');
      }
      ctx.beginPath(); ctx.arc(X(ball.x), Y(ball.y), Math.max(3, r * 0.55), 0, 6.283);
      ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0;
    }
    function label(p, txt, col) {
      ctx.font = '600 ' + Math.max(11, Math.round(W / 70)) + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      var x = X(p.x) + 14, y = Y(p.y) - 16, w = ctx.measureText(txt).width + 12;
      if (x + w > W - 4) x = X(p.x) - 14 - w;
      ctx.fillStyle = 'rgba(6,10,18,.82)'; ctx.fillRect(x, y - 10, w, 20);
      ctx.fillStyle = col; ctx.fillText(txt, x + 6, y);
    }
    var lastUi = 0;
    function ui() {
      el.spd.textContent = S.spd.toFixed(1); el.hr.textContent = Math.round(Math.min(194, S.hr));
      el.dst.textContent = S.dist.toFixed(2); el.spr.textContent = S.spr; el.load.textContent = Math.round(S.load);
      el.top.textContent = S.top.toFixed(1);
      var c = Math.floor(S.clock); el.clock.textContent = Math.floor(c / 60) + ':' + ('0' + (c % 60)).slice(-2);
    }
    resize(); reset();
    window.addEventListener('resize', function () { resize(); draw(); });
    if (reduce) { for (var k = 0; k < 240; k++) step(1 / 30); S.alertOn = true; el.alert.hidden = false; draw(); ui(); return; }
    var visible = false, last = 0, raf = 0;
    function loop(ts) {
      raf = 0;
      if (!visible || d.hidden) return;
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
      step(dt); draw();
      if (ts - lastUi > 200) { ui(); lastUi = ts; }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf && visible && !d.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; start(); }, { threshold: 0.05 }).observe(cv);
    } else { visible = true; start(); }
    d.addEventListener('visibilitychange', start);
    for (var j = 0; j < 30; j++) step(1 / 30);
    draw(); ui();
  }
})();
