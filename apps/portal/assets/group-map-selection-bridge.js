(() => {
  'use strict';
  let boundStage = null;
  let pressedId = null;
  let startX = 0;
  let startY = 0;
  let moved = false;
  let suppressNextClick = false;
  const locateMarker = target => target && target.closest ? target.closest('#networkGeoSvg .geo-node[data-location-id]') : null;
  function select(id) {
    if (!id) return;
    if (window.GNK_GEO_MAP && typeof window.GNK_GEO_MAP.selectLocation === 'function') {
      window.GNK_GEO_MAP.selectLocation(id);
      return;
    }
    if (window.GNK_LOCATION_INSIGHTS && typeof window.GNK_LOCATION_INSIGHTS.select === 'function') {
      window.GNK_LOCATION_INSIGHTS.select(id);
      document.dispatchEvent(new CustomEvent('gnk-location-selected', { detail: { id, source: '2d-bridge' } }));
      return;
    }
    document.dispatchEvent(new CustomEvent('gnk-location-selected', { detail: { id, source: '2d-bridge' } }));
  }
  function bind() {
    const stage = document.getElementById('networkGeoStage');
    if (!stage || stage === boundStage) return !!stage;
    boundStage = stage;
    stage.addEventListener('pointerdown', event => {
      const marker = locateMarker(event.target);
      if (!marker) { pressedId = null; moved = false; return; }
      pressedId = marker.dataset.locationId;
      startX = event.clientX;
      startY = event.clientY;
      moved = false;
      suppressNextClick = false;
      event.stopPropagation();
    }, true);
    stage.addEventListener('pointermove', event => {
      if (!pressedId) return;
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 5) moved = true;
    }, true);
    stage.addEventListener('pointerup', event => {
      if (!pressedId) return;
      const marker = locateMarker(event.target);
      suppressNextClick = moved || !marker || marker.dataset.locationId !== pressedId;
      pressedId = null;
      event.stopPropagation();
    }, true);
    stage.addEventListener('pointercancel', () => {
      pressedId = null;
      moved = false;
      suppressNextClick = true;
    }, true);
    stage.addEventListener('click', event => {
      const marker = locateMarker(event.target);
      if (!marker) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (suppressNextClick) { suppressNextClick = false; return; }
      select(marker.dataset.locationId);
    }, true);
    return true;
  }
  function init() {
    let tries = 0;
    const timer = setInterval(() => {
      if (bind() || ++tries > 220) clearInterval(timer);
    }, 50);
    document.addEventListener('gnk-geography-ready', bind);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
