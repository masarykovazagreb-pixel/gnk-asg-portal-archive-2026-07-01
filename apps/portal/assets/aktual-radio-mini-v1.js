/* AKTUAL MEDIA RADIO — mini player
 * Jedan mali, diskretni player u kutu: 40 px dok miruje, panel sa stanicama na klik.
 * Nema vanjskih skripti, nema kolačića, nema mjerenja. Stanice su javni streamovi
 * trećih strana i ovdje se ne reemituju — player samo pušta ono što stanica nudi.
 */
(function () {
  'use strict';
  if (window.__aktualRadioMini) return;
  window.__aktualRadioMini = true;
  if (/^\/radio(\/|$)/.test(location.pathname)) return;

  var STATIONS = [
    { id: 'synthwave', label: 'Synthwave', url: 'https://ice1.somafm.com/beatblender-128-mp3' },
    { id: 'rock', label: 'USA Rock', url: 'https://ice5.somafm.com/seventies-128-mp3' },
    { id: 'hits', label: 'Top Hits', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
    { id: 'lofi', label: 'Lo-Fi', url: 'https://ice2.somafm.com/lush-128-mp3' },
    { id: 'country', label: 'Country', url: 'https://ice1.somafm.com/bootliquor-128-mp3' },
    { id: 'jazz', label: 'Jazz & Soul', url: 'https://ice1.somafm.com/7soul-128-mp3' }
  ];

  // Isti player, dva jezika. Hrvatske oznake na engleskoj stranici
  // izgledaju kao nedovršen prijevod, a ne kao odluka.
  var EN = (document.documentElement.lang || 'hr').toLowerCase().indexOf('en') === 0;
  var T = EN ? {
    head: 'AKTUAL MEDIA RADIO · 6 stations',
    more: 'All stations and player →',
    moreHref: '/en/radio/',
    play: 'Play AKTUAL MEDIA RADIO',
    pause: 'Pause AKTUAL MEDIA RADIO',
    volume: 'Radio volume',
    choose: 'Choose a station',
    kicker: 'Radio'
  } : {
    head: 'AKTUAL MEDIA RADIO · 6 stanica',
    more: 'Sve stanice i player →',
    moreHref: '/radio/',
    play: 'Pokreni AKTUAL MEDIA RADIO',
    pause: 'Pauziraj AKTUAL MEDIA RADIO',
    volume: 'Glasnoća radija',
    choose: 'Odaberi stanicu',
    kicker: 'Radio'
  };

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('amrm-' + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('amrm-' + k, v); } catch (e) {} }
  };

  var idx = Math.max(0, Math.min(STATIONS.length - 1, parseInt(store.get('station', '0'), 10) || 0));
  var vol = Math.max(0, Math.min(1, parseFloat(store.get('vol', '0.7')) || 0.7));
  var audio = null;
  var playing = false;
  var panelOpen = false;

  var css = ''
    + '#amrm{position:fixed;right:14px;bottom:14px;z-index:2147482000;font:600 12px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#efe7d4}'
    + '#amrm *{box-sizing:border-box}'
    + '#amrm .amrm-bar{display:flex;align-items:center;gap:0;background:rgba(10,15,22,.94);border:1px solid rgba(233,198,108,.42);border-radius:999px;box-shadow:0 10px 26px rgba(0,0,0,.34);backdrop-filter:blur(8px);overflow:hidden}'
    + '#amrm .amrm-play{appearance:none;border:0;background:transparent;color:#e9c66c;width:38px;height:38px;display:grid;place-items:center;cursor:pointer;font-size:12px}'
    + '#amrm .amrm-play:hover{background:rgba(233,198,108,.14)}'
    + '#amrm .amrm-play:focus-visible{outline:2px solid #e9c66c;outline-offset:-2px}'
    + '#amrm .amrm-meta{display:flex;align-items:baseline;gap:7px;padding:0 4px 0 0;cursor:pointer;background:transparent;border:0;color:inherit;font:inherit;white-space:nowrap}'
    + '#amrm .amrm-k{font:800 8.5px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#9a9384}'
    + '#amrm .amrm-name{font:700 11.5px/1 system-ui,sans-serif;letter-spacing:.02em;color:#efe7d4;max-width:104px;overflow:hidden;text-overflow:ellipsis}'
    + '#amrm .amrm-chev{width:26px;height:38px;display:grid;place-items:center;border:0;background:transparent;color:#9a9384;cursor:pointer;font-size:9px}'
    + '#amrm .amrm-bar:hover{border-color:rgba(233,198,108,.8)}'
    + '#amrm.is-playing .amrm-play{color:#fff}'
    + '#amrm .amrm-eq{display:none;align-items:flex-end;gap:2px;height:12px;margin-right:2px}'
    + '#amrm.is-playing .amrm-eq{display:flex}'
    + '#amrm .amrm-eq i{display:block;width:2px;background:#e9c66c;animation:amrm-eq .9s ease-in-out infinite}'
    + '#amrm .amrm-eq i:nth-child(2){animation-delay:.15s}#amrm .amrm-eq i:nth-child(3){animation-delay:.3s}'
    + '@keyframes amrm-eq{0%,100%{height:3px}50%{height:12px}}'
    + '#amrm .amrm-panel{position:absolute;right:0;bottom:46px;width:252px;background:rgba(9,14,20,.97);border:1px solid rgba(233,198,108,.34);border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.45);padding:10px;display:none}'
    + '#amrm.is-open .amrm-panel{display:block}'
    + '#amrm .amrm-h{font:800 8.5px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8f8877;padding:2px 2px 8px}'
    + '#amrm .amrm-st{display:grid;gap:2px;margin:0 0 8px;padding:0;list-style:none}'
    + '#amrm .amrm-st button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;background:transparent;border:0;border-radius:8px;color:#d8d2c4;font:600 11.5px/1 system-ui,sans-serif;padding:9px 8px;cursor:pointer;text-align:left}'
    + '#amrm .amrm-st button:hover{background:rgba(233,198,108,.12);color:#fff}'
    + '#amrm .amrm-st button[aria-pressed="true"]{color:#e9c66c;background:rgba(233,198,108,.14)}'
    + '#amrm .amrm-st button span{font:700 8.5px/1 system-ui,sans-serif;letter-spacing:.1em;color:#8f8877}'
    + '#amrm .amrm-vol{display:flex;align-items:center;gap:8px;border-top:1px solid rgba(255,255,255,.1);padding-top:9px}'
    + '#amrm .amrm-vol input{flex:1;accent-color:#e9c66c;height:16px}'
    + '#amrm .amrm-more{display:block;text-align:center;font:700 9.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#e9c66c;text-decoration:none;padding:8px 0 2px}'
    + '@media(max-width:760px){#amrm{right:8px;bottom:calc(8px + env(safe-area-inset-bottom))}#amrm .amrm-name{max-width:74px}#amrm .amrm-panel{width:226px}}'
    + '@media(prefers-reduced-motion:reduce){#amrm .amrm-eq i{animation:none;height:6px}}';

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'none';
    audio.volume = vol;
    audio.addEventListener('playing', function () { playing = true; root.classList.add('is-playing'); paint(); });
    audio.addEventListener('pause', function () { playing = false; root.classList.remove('is-playing'); paint(); });
    audio.addEventListener('error', function () {
      playing = false;
      root.classList.remove('is-playing');
      paint(true);
    });
    // samo jedan player smije svirati
    document.addEventListener('play', function (e) { if (e.target !== audio && audio && !audio.paused) audio.pause(); }, true);
    return audio;
  }

  function paint(failed) {
    playBtn.innerHTML = playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', playing ? T.pause : T.play);
    name.textContent = STATIONS[idx].label + (failed ? ' · nedostupno' : '');
    [].forEach.call(stationBtns, function (b, i) { b.setAttribute('aria-pressed', i === idx ? 'true' : 'false'); });
  }

  function play() {
    var a = ensureAudio();
    a.src = STATIONS[idx].url;
    var p = a.play();
    if (p && p.catch) p.catch(function () { paint(true); });
  }

  function toggle() { if (playing) { if (audio) audio.pause(); } else play(); }

  function choose(i) {
    idx = i;
    store.set('station', String(i));
    if (audio) { audio.pause(); audio = null; }
    play();
    paint();
  }

  var root = el('div', { id: 'amrm', role: 'complementary', 'aria-label': 'AKTUAL MEDIA RADIO' });
  var style = el('style', null, css);
  var panel = el('div', { class: 'amrm-panel', id: 'amrm-panel' });
  panel.innerHTML = ''
    + '<p class="amrm-h">' + T.head + '</p>'
    + '<ul class="amrm-st">' + STATIONS.map(function (s, i) {
      return '<li><button type="button" data-i="' + i + '" aria-pressed="' + (i === idx ? 'true' : 'false') + '">' + s.label + '<span>0' + (i + 1) + '</span></button></li>';
    }).join('') + '</ul>'
    + '<div class="amrm-vol"><span aria-hidden="true">🔉</span><input type="range" min="0" max="1" step="0.05" value="' + vol + '" aria-label="' + T.volume + '"><span aria-hidden="true">🔊</span></div>'
    + '<a class="amrm-more" href="' + T.moreHref + '">' + T.more + '</a>';

  var bar = el('div', { class: 'amrm-bar' });
  var playBtn = el('button', { type: 'button', class: 'amrm-play', 'aria-label': T.play }, '▶');
  var meta = el('button', { type: 'button', class: 'amrm-meta' });
  var eq = el('span', { class: 'amrm-eq', 'aria-hidden': 'true' }, '<i></i><i></i><i></i>');
  var kicker = el('span', { class: 'amrm-k' }, T.kicker);
  var name = el('span', { class: 'amrm-name' }, STATIONS[idx].label);
  meta.appendChild(eq); meta.appendChild(kicker); meta.appendChild(name);
  var chev = el('button', { type: 'button', class: 'amrm-chev', 'aria-expanded': 'false', 'aria-controls': 'amrm-panel', 'aria-label': T.choose }, '▲');

  bar.appendChild(playBtn); bar.appendChild(meta); bar.appendChild(chev);
  root.appendChild(style); root.appendChild(panel); root.appendChild(bar);

  function mount() {
    if (document.getElementById('amrm')) return;
    document.body.appendChild(root);
    var stationBtns = root.querySelectorAll('.amrm-st button');
    [].forEach.call(stationBtns, function (b) {
      b.addEventListener('click', function () { choose(parseInt(b.getAttribute('data-i'), 10)); });
    });
    var range = root.querySelector('.amrm-vol input');
    range.addEventListener('input', function () {
      vol = parseFloat(range.value);
      store.set('vol', String(vol));
      if (audio) audio.volume = vol;
    });
    playBtn.addEventListener('click', toggle);
    meta.addEventListener('click', function () { panelOpen ? close() : open(); });
    chev.addEventListener('click', function () { panelOpen ? close() : open(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panelOpen) close(); });
    function open() { panelOpen = true; root.classList.add('is-open'); chev.setAttribute('aria-expanded', 'true'); }
    function close() { panelOpen = false; root.classList.remove('is-open'); chev.setAttribute('aria-expanded', 'false'); }
    paint();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
