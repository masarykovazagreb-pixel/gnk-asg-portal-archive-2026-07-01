(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const en = () => document.documentElement.lang === 'en' || /\/en(?:\/|$)/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const text = () => en() ? {
    downloads:'Download reports and data', staticPdf:'Download static PDF', mapPdf:'Download 2D PDF', globePdf:'Download 3D PDF', image:'Download image', ready:'Prepared from currently displayed network view.', imageError:'Image export is currently unavailable.', dashboard:'Market intelligence and reference asset overview'
  } : {
    downloads:'Preuzmi izvještaje i podatke', staticPdf:'Preuzmi statički PDF', mapPdf:'Preuzmi 2D PDF', globePdf:'Preuzmi 3D PDF', image:'Preuzmi slike', ready:'Priprema se iz trenutačno prikazanog mrežnog prikaza.', imageError:'Izvoz slike trenutačno nije dostupan.', dashboard:'Tržišni pregled i referentna imovina'
  };
  let mounted = false;
  function invoke(id) {
    const button = $(id);
    if (button) { button.click(); return true; }
    return false;
  }
  function saveBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = filename; link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1600);
  }
  function imageExport(button) {
    const original = button.textContent;
    try {
      const globe = window.GNK_GLOBE;
      if (globe && globe.isActive && globe.isActive() && globe.getCanvas && globe.getCanvas()) {
        globe.getCanvas().toBlob(blob => {
          if (!blob) throw new Error('png failed');
          saveBlob(blob, 'GNK_DINAMO_Globalna_Mreza_3D_Globus.png');
        }, 'image/png');
        return;
      }
      const svg = window.GNK_GEO_MAP?.getSvg?.();
      if (svg) {
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('width', '1600'); clone.setAttribute('height', '840');
        saveBlob(new Blob([new XMLSerializer().serializeToString(clone)], {type:'image/svg+xml;charset=utf-8'}), 'GNK_DINAMO_Globalna_Mreza_2D.svg');
        return;
      }
      button.textContent = text().imageError;
      setTimeout(() => { button.textContent = original; }, 2200);
    } catch (_) {
      button.textContent = text().imageError;
      setTimeout(() => { button.textContent = original; }, 2200);
    }
  }
  function toolbar(shell) {
    let bar = $('networkReportToolbar');
    const T = text();
    if (!bar) {
      bar = document.createElement('section');
      bar.id = 'networkReportToolbar';
      bar.className = 'network-report-toolbar';
      shell.appendChild(bar);
    }
    bar.innerHTML = `<div class="network-report-label"><small>PDF / PNG / SVG</small><strong>${T.downloads}</strong><span>${T.ready}</span></div><div class="network-report-actions"><button type="button" data-report="static"><i>▤</i>${T.staticPdf}</button><button type="button" data-report="2d"><i>◇</i>${T.mapPdf}</button><button type="button" data-report="3d"><i>⬡</i>${T.globePdf}</button><button type="button" data-report="image"><i>▧</i>${T.image}</button></div>`;
    bar.querySelector('[data-report="static"]').onclick = () => invoke('networkOverviewPdf');
    bar.querySelector('[data-report="2d"]').onclick = () => invoke('networkPdfButton');
    bar.querySelector('[data-report="3d"]').onclick = () => invoke('globePdfButton');
    bar.querySelector('[data-report="image"]').onclick = event => imageExport(event.currentTarget);
  }
  function relocateMarket(networkSection) {
    const digital = $('digital-assets');
    if (!digital || digital.dataset.networkIntegrated === '1') return !!digital;
    digital.dataset.networkIntegrated = '1';
    digital.classList.add('network-integrated-market');
    digital.setAttribute('aria-label', text().dashboard);
    networkSection.insertAdjacentElement('afterend', digital);
    return true;
  }
  function suppressLegacyExportCards() {
    ['networkPdfExport','globePdfExport'].forEach(id => { const item = $(id); if (item) item.classList.add('integrated-export-source'); });
  }
  function render() {
    const networkSection = $('global-network');
    const shell = networkSection?.querySelector('.network-shell');
    if (!networkSection || !shell) return false;
    toolbar(shell);
    relocateMarket(networkSection);
    suppressLegacyExportCards();
    mounted = true;
    return true;
  }
  function init() {
    let tries = 0;
    const timer = setInterval(() => {
      if (render() && ++tries > 10) clearInterval(timer);
      else if (++tries > 220) clearInterval(timer);
    }, 90);
    window.addEventListener('gnk-language-change', render);
    window.setTimeout(suppressLegacyExportCards, 1800);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
