(() => {
  'use strict';
  const mobile = window.matchMedia('(max-width: 820px)');
  const moved = [];
  let references = null;
  let content = null;
  let observer = null;
  let arranging = false;
  const en = () => document.documentElement.lang === 'en' || /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const words = () => en() ? {
    reference: 'Legend, sources and downloads', detail: 'Selected location information', map: 'Selected location map', weather: 'Weather forecast for selected location'
  } : {
    reference: 'Legenda, izvori i preuzimanja', detail: 'Podatci odabrane lokacije', map: 'Karta odabrane lokacije', weather: 'Vremenska prognoza odabrane lokacije'
  };
  function moveToReference(node) {
    if (!node || moved.some(item => item.node === node)) return;
    const marker = document.createComment('mobile-reference-origin');
    node.parentNode.insertBefore(marker, node);
    moved.push({ node, marker });
    content.appendChild(node);
  }
  function buildReference(sidebar) {
    if (!references) {
      references = document.createElement('details');
      references.className = 'mobile-network-reference';
      references.innerHTML = '<summary></summary><div class="mobile-network-reference-content"></div>';
      content = references.querySelector('.mobile-network-reference-content');
    }
    const label = words().reference;
    const summary = references.querySelector('summary');
    if (summary.textContent !== label) summary.textContent = label;
    if (!references.isConnected) sidebar.appendChild(references);
  }
  function mobileArrange() {
    if (arranging) return false;
    const sidebar = document.querySelector('#global-network .network-sidebar');
    const detail = document.getElementById('networkDetail');
    if (!sidebar || !detail) return false;
    arranging = true;
    buildReference(sidebar);
    detail.setAttribute('aria-label', words().detail);
    detail.setAttribute('aria-live', 'polite');
    const title = Array.from(sidebar.children).find(el => el.tagName === 'H3');
    const legendContainer = Array.from(sidebar.children).find(el => el !== references && el.querySelector && el.querySelector('.legend-row'));
    const lineLegend = sidebar.querySelector(':scope > .line-legend');
    const note = sidebar.querySelector(':scope > .network-note');
    [title, legendContainer, lineLegend, note].forEach(moveToReference);
    sidebar.querySelectorAll(':scope > .network-pdf-export').forEach(panel => {
      panel.setAttribute('aria-label', 'PDF');
      moveToReference(panel);
    });
    const map = document.getElementById('googleLocationMap');
    const weather = document.getElementById('locationWeatherPanel');
    if (map) map.setAttribute('aria-label', words().map);
    if (weather) { weather.setAttribute('aria-label', words().weather); weather.setAttribute('aria-live', 'polite'); }
    if (sidebar.lastElementChild !== references) sidebar.appendChild(references);
    arranging = false;
    return true;
  }
  function desktopRestore() {
    if (arranging) return;
    arranging = true;
    moved.forEach(({ node, marker }) => {
      if (marker.parentNode) marker.parentNode.insertBefore(node, marker);
      marker.remove();
    });
    moved.length = 0;
    references?.remove();
    arranging = false;
  }
  function arrange() {
    if (mobile.matches) mobileArrange();
    else desktopRestore();
  }
  function init() {
    let tries = 0;
    const timer = window.setInterval(() => {
      if (document.getElementById('global-network')) {
        arrange();
        window.clearInterval(timer);
        const root = document.getElementById('global-network');
        observer = new MutationObserver(() => { if (mobile.matches && !arranging) mobileArrange(); });
        observer.observe(root, { childList: true, subtree: true });
      } else if (++tries > 220) window.clearInterval(timer);
    }, 60);
    mobile.addEventListener ? mobile.addEventListener('change', arrange) : mobile.addListener(arrange);
    window.addEventListener('gnk-language-change', arrange);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
