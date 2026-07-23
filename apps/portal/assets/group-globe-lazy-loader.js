// Loads the heavy 3D globe scripts (group-globe-3d.js, group-globe-pdf.js,
// network-search-3d.js) only when the user explicitly asks for the 3D view,
// instead of on every page load. The 2D map (group-map-2d-geo.js, loaded
// normally) remains the default view -- this script just adds a small
// "3D globus" / "3D globe" button next to it that, on first click, injects
// the deferred scripts and switches to 3D once ready.
(function () {
  'use strict';
  var isEn = /\/en\/?$/.test(location.pathname) || document.documentElement.lang === 'en';
  var VERSION = (document.currentScript && document.currentScript.src.split('v=')[1]) || '';
  var DEFERRED = ['group-globe-3d.js', 'group-globe-pdf.js', 'network-search-3d.js'];
  var loaded = false;
  var loading = false;

  function loadScript(path) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src^="/assets/' + path + '"]')) { resolve(); return; }
      var el = document.createElement('script');
      el.src = '/assets/' + path + (VERSION ? '?v=' + VERSION : '');
      el.onload = resolve;
      el.onerror = reject;
      document.body.appendChild(el);
    });
  }

  function activate3D(btn) {
    if (loading) return;
    if (loaded) {
      if (window.GNK_GLOBE && window.GNK_GLOBE.activate) window.GNK_GLOBE.activate();
      return;
    }
    loading = true;
    var originalText = btn.textContent;
    btn.textContent = isEn ? 'Loading 3D…' : 'Učitavanje 3D…';
    btn.disabled = true;
    Promise.all(DEFERRED.map(loadScript))
      .then(function () {
        loaded = true;
        loading = false;
        btn.style.display = 'none'; // group-globe-3d.js builds its own mode toolbar
        if (window.GNK_GLOBE && window.GNK_GLOBE.activate) window.GNK_GLOBE.activate();
      })
      .catch(function () {
        loading = false;
        btn.textContent = originalText;
        btn.disabled = false;
      });
  }

  function addButton() {
    var controls = document.querySelector('#global-network .network-controls');
    if (!controls || controls.querySelector('[data-globe-lazy-3d]')) return false;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.globeLazy3d = '1';
    btn.className = 'globe-btn';
    btn.textContent = isEn ? '🌐 View in 3D' : '🌐 Prikaži u 3D';
    btn.addEventListener('click', function () { activate3D(btn); });
    controls.appendChild(btn);
    return true;
  }

  if (!addButton()) {
    var tries = 0;
    var interval = setInterval(function () {
      tries++;
      if (addButton() || tries > 40) clearInterval(interval);
    }, 250);
  }
})();
