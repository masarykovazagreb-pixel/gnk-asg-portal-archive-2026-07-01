(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const en = () => document.documentElement.lang === 'en' || /\/en(?:\/|$)/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const text = () => en() ? {
    title:'Downloads and snapshots', note:'Selected location remains linked to map and demographic context.', staticPdf:'Static PDF', mapPdf:'2D PDF', globePdf:'3D PDF', mapImage:'2D Image', globeImage:'3D Image', preparing:'Preparing…', unavailable:'Unavailable'
  } : {
    title:'Preuzimanja i prikazi', note:'Odabrana lokacija ostaje povezana s kartom i demografskim kontekstom.', staticPdf:'Statični PDF', mapPdf:'2D PDF', globePdf:'3D PDF', mapImage:'2D slika', globeImage:'3D slika', preparing:'Pripremam…', unavailable:'Nije dostupno'
  };
  function downloadData(data, name) { const link = document.createElement('a'); link.href = data; link.download = name; link.click(); }
  function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); downloadData(url, name); setTimeout(() => URL.revokeObjectURL(url), 1400); }
  function selectedSuffix() { const id = window.GNK_LOCATION_INSIGHTS?.current?.() || window.GNK_GLOBE?.getSelected?.() || window.GNK_GEO_MAP?.getSelected?.() || 'location'; return String(id).replace(/[^a-z0-9_-]+/gi, '_'); }
  function clone2dSvg() {
    const source = $('networkGeoSvg'); if (!source) throw new Error('2D map not ready');
    const clone = source.cloneNode(true); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', '1600'); clone.setAttribute('height', '838'); clone.setAttribute('viewBox', '0 0 1040 545');
    const layer = clone.querySelector('#networkGeoLayer'); if (layer) layer.removeAttribute('transform');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = '.geo-ocean{fill:#06182e}.geo-grid line{stroke:rgba(91,151,195,.18);stroke-width:1;stroke-dasharray:2 7}.geo-land path{fill:#164e43;stroke:#65ab82;stroke-width:.8}.geo-micro-land circle{fill:#27784f;stroke:#b0dfb8;stroke-width:1.2}.geo-continent-labels text{fill:#d4af37;font-size:11px;font-weight:800;letter-spacing:2px;paint-order:stroke;stroke:#06182e;stroke-width:4px}.geo-route{fill:none;stroke-linecap:round}.geo-route.direct{stroke:#2c8ef5;stroke-width:1.2;opacity:.65}.geo-route.peer{stroke:#8cb9e8;stroke-width:.8;opacity:.5;stroke-dasharray:3 4}.geo-route.planned{stroke:#65d27d;stroke-width:1.1;opacity:.8;stroke-dasharray:4 3}.geo-node .geo-node-hit{fill:transparent}.geo-node.active .geo-node-pin{fill:#2f8ef4;stroke:#a6dbff}.geo-node.planned .geo-node-pin{fill:#45b960;stroke:#b3f1bb}.geo-node.hq .geo-node-pin{fill:#d4af37;stroke:#f8dd80}.geo-node.selected .geo-node-pin{fill:#ef3340;stroke:#fff;stroke-width:2.6}.geo-node text{fill:#edf5ff;font-size:9px;font-weight:800;paint-order:stroke;stroke:#061326;stroke-width:3px}.geo-node text.sub{fill:#9db4ce;font-size:7.8px}';
    clone.insertBefore(style, clone.firstChild); return new XMLSerializer().serializeToString(clone);
  }
  async function save2dImage(button) {
    const old = button.textContent; button.disabled = true; button.textContent = text().preparing;
    try {
      const xml = clone2dSvg(), url = URL.createObjectURL(new Blob([xml], {type:'image/svg+xml;charset=utf-8'}));
      const image = new Image(); await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 838; canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url);
      canvas.toBlob(blob => blob && downloadBlob(blob, `GNK_DINAMO_2D_Network_${selectedSuffix()}.png`), 'image/png');
    } catch (_) { button.textContent = text().unavailable; setTimeout(() => { button.textContent = old; }, 1800); return; }
    button.disabled = false; button.textContent = old;
  }
  function save3dImage(button) {
    const old = button.textContent; button.disabled = true; button.textContent = text().preparing;
    try {
      const globe = window.GNK_GLOBE; if (!globe) throw new Error('Globe missing');
      if (!globe.isActive()) globe.activate();
      setTimeout(() => {
        try { const canvas = globe.getCanvas(); if (!canvas) throw new Error('Canvas missing'); canvas.toBlob(blob => blob && downloadBlob(blob, `GNK_DINAMO_3D_Globe_${selectedSuffix()}.png`), 'image/png'); button.textContent = old; button.disabled = false; }
        catch (_) { button.textContent = text().unavailable; button.disabled = false; }
      }, 180);
    } catch (_) { button.textContent = text().unavailable; button.disabled = false; setTimeout(() => { button.textContent = old; }, 1800); }
  }
  function proxyClick(id, button) {
    const target = $(id); if (target) target.click(); else { const old = button.textContent; button.textContent = text().unavailable; setTimeout(() => { button.textContent = old; }, 1600); }
  }
  function toolbar(shell) {
    let bar = $('networkExportToolbar'); const T = text();
    if (!bar) { bar = document.createElement('nav'); bar.id = 'networkExportToolbar'; bar.className = 'network-export-toolbar'; const globeBar = shell.querySelector('.globe-toolbar'); shell.insertBefore(bar, globeBar || shell.firstChild); }
    bar.innerHTML = `<div class="toolbar-copy"><strong>${T.title}</strong><span>${T.note}</span></div><div class="toolbar-actions"><button type="button" data-export="static">↓ ${T.staticPdf}</button><button type="button" data-export="2dpdf">↓ ${T.mapPdf}</button><button type="button" data-export="3dpdf">↓ ${T.globePdf}</button><button type="button" data-export="2dpng">↓ ${T.mapImage}</button><button type="button" data-export="3dpng">↓ ${T.globeImage}</button></div>`;
    bar.querySelector('[data-export="static"]').onclick = event => proxyClick('networkOverviewPdf', event.currentTarget);
    bar.querySelector('[data-export="2dpdf"]').onclick = event => proxyClick('networkPdfButton', event.currentTarget);
    bar.querySelector('[data-export="3dpdf"]').onclick = event => proxyClick('globePdfButton', event.currentTarget);
    bar.querySelector('[data-export="2dpng"]').onclick = event => save2dImage(event.currentTarget);
    bar.querySelector('[data-export="3dpng"]').onclick = event => save3dImage(event.currentTarget);
  }
  function arrange() {
    const section = $('global-network'), shell = section?.querySelector('.network-shell'), dock = $('networkLocationContext');
    if (!section || !shell || !dock) return false;
    dock.classList.add('portal-context-grid');
    const map = $('googleLocationMap'), facts = shell.querySelector('.network-sidebar'), weather = $('locationWeatherPanel');
    if (map && map.parentElement === dock && dock.firstElementChild !== map) dock.prepend(map);
    if (facts && facts.parentElement !== dock) dock.appendChild(facts);
    if (facts && map && facts.previousElementSibling !== map) map.after(facts);
    if (weather && weather.parentElement !== dock) dock.appendChild(weather);
    if (weather && facts && weather.previousElementSibling !== facts) facts.after(weather);
    const overview = $('networkOverviewVisual');
    if (overview && overview.parentElement !== shell) shell.appendChild(overview);
    else if (overview && overview !== shell.lastElementChild) shell.appendChild(overview);
    toolbar(shell);
    const market = $('digital-assets');
    if (market && section.nextElementSibling !== market) section.after(market);
    market?.classList.add('portal-market-adjacent');
    return true;
  }
  function init() {
    let cycles = 0; const timer = setInterval(() => { const ok = arrange(); if ((ok && ++cycles > 26) || cycles > 180) clearInterval(timer); else cycles += ok ? 1 : 0; }, 110);
    window.addEventListener('gnk-language-change', arrange);
    document.addEventListener('gnk-location-selected', () => setTimeout(arrange, 20));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
