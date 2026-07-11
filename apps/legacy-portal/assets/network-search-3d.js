(() => {
  'use strict';
  let network = null;
  const en = () => document.documentElement.lang === 'en' || /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const byId = id => network?.nodes.find(item => item.id === id) || (id === network?.center?.id ? network.center : null);
  const name = node => node.id === 'boulder' ? node.name : (en() ? node.name_en : node.name_hr);
  const place = node => node.id === 'boulder' ? node.place : (en() ? node.place_en : node.place_hr);
  function update3dLegend(id) {
    const node = byId(id), box = document.getElementById('networkDetail');
    if (!node || !box) return;
    const label = en() ? {globe:'3D Globe', region:'Region', hq:'Central headquarters', active:'Existing company', planned:'Planned expansion 2026'} : {globe:'3D globus', region:'Regija', hq:'Središnje sjedište', active:'Postojeće društvo', planned:'Planirano širenje 2026.'};
    const status = node.id === 'boulder' ? label.hq : node.status === 'planned' ? label.planned : label.active;
    box.innerHTML = `<small>${label.globe}</small><h4>${name(node)}</h4><p>${place(node)}</p><p><strong>${label.region}:</strong> ${node.region || '—'}</p><span class="state ${node.id === 'boulder' ? 'hq' : node.status}">${status}</span>`;
  }
  function reveal(id) {
    const all = document.querySelector('#global-network [data-filter="all"]');
    if (all && !all.classList.contains('active')) all.click();
    const in3d = !!document.querySelector('[data-globe-mode="3d"].active');
    if (!in3d && window.GNK_GEO_MAP && typeof window.GNK_GEO_MAP.selectLocation === 'function') {
      window.GNK_GEO_MAP.selectLocation(id);
    } else {
      update3dLegend(id);
      document.dispatchEvent(new CustomEvent('gnk-location-selected', { detail: { id, source: 'search' } }));
    }
    const target = in3d ? document.querySelector('#global-network .globe-panel') : document.querySelector('#global-network .network-canvas');
    if (target) { target.classList.add('located'); setTimeout(() => target.classList.remove('located'), 1700); }
  }
  function bind() {
    const go = document.getElementById('networkEntityGo');
    const select = document.getElementById('networkEntitySelect');
    const boulder = document.querySelector('#networkCommandDeck [data-net-shortcut="boulder"]');
    if (!go || !select || go.dataset.geoSearchReady) return false;
    go.dataset.geoSearchReady = '1';
    go.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); reveal(select.value); }, true);
    select.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); reveal(select.value); } });
    if (boulder && !boulder.dataset.geoSearchReady) {
      boulder.dataset.geoSearchReady = '1';
      boulder.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); reveal('boulder'); }, true);
    }
    return true;
  }
  async function init() {
    try { const response = await fetch('data/group_network.json?v=' + Date.now(), {cache:'no-store'}); if (response.ok) network = await response.json(); } catch (_) {}
    let count = 0; const timer = setInterval(() => { if (bind() || ++count > 150) clearInterval(timer); }, 70);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
