(() => {
  'use strict';
  const isEn = () => /\/en\/?$/.test(location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy = {
    hr: {eyebrow:'Provjerljivi javni podatci', title:'Javni izvori i službeni registri', intro:'Izravan pristup službenim registrima, financijskim objavama, pravima intelektualnog vlasništva i javnim IT izvorima. Podatci iz registara provjeravaju se na izvornom službenom mjestu.', oib:'OIB', mbs:'MBS', open:'OTVORI IZVOR →', live:'OTVORENI PODATCI', link:'SLUŽBENA POVEZNICA', ecb:'ECB referentni tečajevi', updates:'Tržišni i IT izvori', unavailable:'Otvoreni podatci bit će prikazani nakon prvog brzog tržišnog osvježavanja.', note:'Registre koji nemaju javno otvoreno podatkovno sučelje portal ne kopira automatski; vodi izravno na službenu pretragu radi točne i aktualne provjere.', page:'Otvori centar registara', refreshed:'Osvježava se svakih 5 minuta'},
    en: {eyebrow:'Verifiable public data', title:'Public Sources and Official Registers', intro:'Direct access to official company registers, financial disclosures, intellectual-property records and public IT sources. Register information is verified at its official source.', oib:'Tax ID', mbs:'MBS', open:'OPEN SOURCE →', live:'OPEN DATA', link:'OFFICIAL LINK', ecb:'ECB reference rates', updates:'Market and IT sources', unavailable:'Open data will appear after the first fast market refresh.', note:'Registers without an open public data interface are not automatically copied by the portal; the portal links directly to official search facilities for accurate, current verification.', page:'Open registers centre', refreshed:'Refreshes every 5 minutes'}
  };
  const t = () => copy[isEn() ? 'en' : 'hr'];
  let directory = null;
  let openData = null;
  function sourceCard(item) {
    const bilingual = isEn();
    return '<article class="source-card"><span class="source-type">' + esc(bilingual ? item.type_en : item.type_hr) + '</span><h4>' + esc(item.name) + '</h4><p>' + esc(bilingual ? item.summary_en : item.summary_hr) + '</p><div class="source-lookup">' + esc(bilingual ? item.lookup_en : item.lookup_hr) + '</div><div class="source-action"><a target="_blank" rel="noopener nofollow" href="' + esc(item.url) + '">' + t().open + '</a><span class="source-badge ' + (item.automated ? 'live' : 'link') + '">' + (item.automated ? t().live : t().link) + '</span></div></article>';
  }
  function livePanel() {
    const ecb = openData && openData.ecb;
    if (!ecb || ecb.status !== 'ok' || !ecb.rates) return '<div class="live-source-panel"><article class="live-source-box"><small>' + esc(t().ecb) + '</small><strong>—</strong><p>' + esc(t().unavailable) + '</p></article><article class="live-source-box"><small>' + esc(t().updates) + '</small><strong>' + esc(t().refreshed) + '</strong><p>CoinGecko · ECB · ENISA</p></article></div>';
    const locale = isEn() ? 'en-GB' : 'hr-HR';
    const rate = value => new Intl.NumberFormat(locale, {maximumFractionDigits:4}).format(Number(value));
    return '<div class="live-source-panel"><article class="live-source-box"><small>' + esc(t().ecb) + '</small><strong>1 EUR = ' + esc(rate(ecb.rates.USD)) + ' USD</strong><p>' + (isEn() ? 'Reference date: ' : 'Referentni datum: ') + esc(ecb.reference_date || '') + '</p></article><article class="live-source-box"><small>' + esc(t().updates) + '</small><strong>' + esc(t().refreshed) + '</strong><p>EUR/GBP ' + esc(rate(ecb.rates.GBP)) + ' · EUR/CHF ' + esc(rate(ecb.rates.CHF)) + ' · EUR/JPY ' + esc(rate(ecb.rates.JPY)) + '</p></article></div>';
  }
  function render() {
    if (!directory) return;
    const target = document.getElementById('publicSources');
    if (!target) return;
    target.innerHTML = '<div class="container"><div class="section-head"><div><p class="eyebrow">' + t().eyebrow + '</p><h2>' + t().title + '</h2></div><p>' + t().intro + '</p></div><div class="sources-toolbar"><div><strong>' + esc(directory.entity.name) + '</strong><span>' + (isEn() ? 'Official verification identifiers' : 'Identifikatori za službenu provjeru') + '</span></div><div class="sources-entity"><b>' + t().oib + ': ' + esc(directory.entity.oib) + '</b><b>' + t().mbs + ': ' + esc(directory.entity.mbs) + '</b></div></div>' + directory.groups.map(group => '<div class="sources-group"><h3>' + esc(isEn() ? group.title_en : group.title_hr) + '</h3><div class="sources-grid">' + group.items.map(sourceCard).join('') + '</div></div>').join('') + livePanel() + '<div class="official-note">' + t().note + ' <a href="registri/">' + t().page + ' →</a></div></div>';
  }
  async function load() {
    try {
      const results = await Promise.all([
        fetch('data/public_sources.json?v=' + Date.now(), {cache:'no-store'}),
        fetch('data/open_data.json?v=' + Date.now(), {cache:'no-store'})
      ]);
      if (results[0].ok) directory = await results[0].json();
      if (results[1].ok) openData = await results[1].json();
      render();
    } catch (error) {}
  }
  function loadFinancialDocumentPanels() {
    if (!document.querySelector('link[data-financial-document-panels]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = '/assets/financial-document-downloads.css?v=20260528-01';
      css.setAttribute('data-financial-document-panels', '');
      document.head.appendChild(css);
    }
    if (!document.querySelector('script[data-financial-document-panels]')) {
      const js = document.createElement('script');
      js.src = '/assets/financial-documents-panel.js?v=20260528-01';
      js.setAttribute('data-financial-document-panels', '');
      document.body.appendChild(js);
    }
  }
  function init() {
    const documents = document.getElementById('dokumenti');
    if (!documents) return;
    loadFinancialDocumentPanels();
    let section = document.getElementById('publicSources');
    if (!section) { section = document.createElement('section'); section.id = 'publicSources'; section.className = 'public-sources'; documents.insertAdjacentElement('beforebegin', section); }
    load();
    window.addEventListener('gnk-language-change', render);
    window.setInterval(load, 300000);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();