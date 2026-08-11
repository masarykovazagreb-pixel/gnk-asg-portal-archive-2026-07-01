document.addEventListener('DOMContentLoaded', function () {
  var VERSION = '20260812-aktual-image-hardening-v1';

  var nativeFetch = window.fetch && window.fetch.bind(window);
  if (nativeFetch && !window.__gnkRootDataFetch) {
    window.__gnkRootDataFetch = true;
    window.fetch = function (input, init) {
      if (typeof input === 'string' && input.indexOf('data/') === 0) input = '/' + input;
      return nativeFetch(input, init);
    };
  }

  function style(path) {
    if (document.querySelector('link[href^="' + path + '"]')) return;
    var el = document.createElement('link');
    el.rel = 'stylesheet'; el.href = path + '?v=' + VERSION; document.head.appendChild(el);
  }
  function script(path) {
    if (document.querySelector('script[src^="' + path + '"]')) return;
    var el = document.createElement('script');
    el.src = path + '?v=' + VERSION; el.async = false; document.body.appendChild(el);
  }
  style('/assets/fina-panel.css');
  style('/assets/advanced.css');
  // header-premium.css and portal-navigation.js both intentionally
  // disabled: restoring them together caused header/logo/nav to render
  // as an empty light bar (background visible, content invisible).
  // style.css now has a dedicated safety-net rule (!important) that
  // guarantees the static nav-links markup stays visible without
  // depending on either of these scripts.
  // style('/assets/header-premium.css');
  style('/assets/group-contrast.css');
  style('/assets/group-network.css');
  style('/assets/language.css');
  style('/assets/mobile-stability.css');
  style('/assets/portal-integration.css');
  style('/assets/seo-profile-link.css');
  style('/assets/menu-fix.css');
  style('/assets/quality-patch.css');
  script('/assets/public-unified-menu-v6.js');
  script('/assets/i18n.js');
  script('/assets/language-routing.js');
  // script('/assets/portal-navigation.js');
  script('/assets/status.js');
  script('/assets/aktual-columnist-hub-v1.js');
  script('/assets/portal-layout.js');
  script('/assets/assistant.js');
  script('/assets/inline-assistant.js');
  var __gnkPath2 = (location.pathname || '/').replace(/\/+$/, '') || '/';
  var __gnkIsHome = __gnkPath2 === '' || __gnkPath2 === '/' || __gnkPath2 === '/en';
  if (__gnkPath2.indexOf('group-network') !== -1 || __gnkIsHome) {
    // Ovi stilovi i skripte sluze iskljucivo karti, globusu i panelu
    // lokacija. Prije su se ucitavali na svakoj stranici portala, i na
    // onima koje od njih nemaju nista — 13 datoteka i 69 KB uzalud.
    style('/assets/group-globe-3d.css');
    style('/assets/group-location-insights.css');
    style('/assets/group-map-2d-geo.css');
    style('/assets/group-google-map.css');
    style('/assets/group-location-weather.css');
    style('/assets/group-overview-panel.css');
    style('/assets/group-market-coverage.css');
    style('/assets/network-reading-layout.css');
    style('/assets/group-mobile-accessible.css');
    style('/assets/network-motion.css');
    script('/assets/network-motion.js');
    script('/assets/group-network.js');
    script('/assets/world-geography.js');
    script('/assets/group-clarity.js');
    script('/assets/group-map-2d-geo.js');
    script('/assets/group-location-insights.js');
    script('/assets/group-map-selection-bridge.js');
    script('/assets/network-selection-sync.js');
    script('/assets/command-centre.js');
    script('/assets/group-overview-panel.js');
    script('/assets/group-market-coverage.js');
    script('/assets/group-map-pdf.js');
    script('/assets/group-map-viewport.js');
    script('/assets/group-mobile-accessible.js');
    script('/assets/group-globe-lazy-loader.js');
  }

  // The scripts below power widgets that are not needed for the
  // initial paint (chat assistants, sticker tiles, WhatsApp button,
  // weather/market card refreshers, mobile nav, etc). Deferring them
  // until after window 'load' noticeably speeds up perceived load
  // time without touching the globe/group-network package above,
  // which is loaded exactly as before.
  function loadDeferredWidgets() {
  // Stilovi ovih widgeta idu zajedno sa svojim skriptama. Ranije su se
  // ucitavali odmah, iako se sam widget pojavljuje tek nakon 'load'.
  style('/assets/intelligence-desk.css');
  style('/assets/desk-hybrid.css');
  style('/assets/desk-search.css');
  style('/assets/floating-intelligence.css');
  style('/assets/command-centre.css');
  style('/assets/bitcoin-chart.css');
  style('/assets/market-expansion.css');
  style('/assets/bpp-public-card.css');
  style('/assets/index-live-hub-v1.css');
  style('/assets/mobile-app.css');
  style('/assets/public-sources.css');
    script('/assets/browser-data-refresh.js');
    script('/assets/market.js');
    script('/assets/gallery-auto-assign-v1.js');
    script('/assets/whatsapp-widget-v1.js');
    script('/assets/sticker-tiles-v1.js');
    script('/assets/header-whatsapp-button-v1.js');
    script('/assets/intelligence-desk.js');
    script('/assets/desk-hybrid.js');
    script('/assets/desk-search.js');
    script('/assets/mobile-app.js');
    script('/assets/mobile-navigation.js');
    script('/assets/floating-intelligence.js');
    script('/assets/location-recovery.js');
    script('/assets/public-sources.js');
    script('/assets/site-share.js');
    script('/assets/hourly-data-disclosure.js');
    script('/assets/home-activity-model.js');
    script('/assets/index-live-hub-v1.js');
    script('/assets/digital-workforce-entry-v1.js');
  }
  if (document.readyState === 'complete') {
    loadDeferredWidgets();
  } else {
    window.addEventListener('load', loadDeferredWidgets);
    // Safety net: if 'load' already fired before this listener was
    // registered (race condition), or fires later than expected,
    // guarantee the widgets still load within 1.5s either way.
    window.setTimeout(loadDeferredWidgets, 1500);
  }

  function isEnglish() {
    return /\/en\/?$/.test(window.location.pathname) || /\/en\//.test(window.location.pathname) || (window.GNK_LANG && window.GNK_LANG.get && window.GNK_LANG.get() === 'en');
  }

  function normaliseMenuLabels() {
    var menu = document.getElementById('navLinks');
    if (!menu || menu.dataset.menuStable === '1') return;
    menu.dataset.menuStable = '1';
    var en = isEnglish();
    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (link) {
      var href = link.getAttribute('href') || '';
      var text = (link.textContent || '').trim();
      if (href === '/en/insights/' || href === 'en/insights/' || href === '../../../../../en/insights/') link.textContent = en ? 'Insights' : 'Objave';
      if (href === '/insights-hr/' || href === 'insights-hr/' || href === '../../insights-hr/') link.textContent = en ? 'HR archive' : 'Objave';
      if (!en) {
        if (text === 'Technology & AI') link.textContent = 'Tehnologija i AI';
        if (text === 'Digital Assets' || text === 'Market Monitor') link.textContent = 'Digitalna imovina';
        if (text === 'Business News') link.textContent = 'Poslovne vijesti';
        if (text === 'Intelligence Desk') link.textContent = 'AI asistent';
        if (text === 'Documents') link.textContent = 'Dokumenti';
        if (text === 'Group') link.textContent = 'Grupa';
      }
    });
  }

  function alignNewsAutomationText() {
    var head = document.querySelector('#news .section-head');
    var loading = document.querySelector('#newsGrid .news-card p');
    if (!head) return;
    var eyebrow = head.querySelector('.eyebrow');
    var paragraph = head.querySelector('p:not(.eyebrow)');
    if (isEnglish()) {
      if (eyebrow) eyebrow.textContent = 'Automatic public-news refresh';
      if (paragraph) paragraph.textContent = 'The public window displays up to the 100 newest business and technology news items, ordered newest first. The archive retains up to 2,000 older items; at the 2,100-record threshold the oldest 1,000 archived items are removed.';
      if (loading) loading.textContent = 'Up to 100 newest public items are shown here. Older items remain in the 2,000-item archive under the automatic retention policy.';
    } else {
      if (eyebrow) eyebrow.textContent = 'Automatsko osvježavanje javnih vijesti';
      if (paragraph) paragraph.textContent = 'Javni prozor prikazuje do 100 najnovijih poslovnih i tehnoloških vijesti, od najnovije prema najstarijoj. Arhiva zadržava do 2.000 starijih stavki; na pragu od 2.100 ukupnih zapisa briše se najstarijih 1.000 arhivskih stavki.';
      if (loading) loading.textContent = 'Ovdje se prikazuje do 100 najnovijih javnih stavki. Starije stavke ostaju u arhivi kapaciteta 2.000 prema automatskom retention pravilu.';
    }
  }

  function removeCorporateInformationExternalAction(root) {
    var scope = root || document;
    Array.prototype.forEach.call(scope.querySelectorAll('.doc'), function (card) {
      var heading = card.querySelector('h3');
      if (!heading || heading.textContent.trim() !== 'GNK DINAMO Ltd. Corporate Information') return;
      Array.prototype.forEach.call(card.querySelectorAll('a:not(.wa):not(.in):not(.mail)'), function (link) { link.remove(); });
    });
  }

  function hardenAktualImages(root) {
    if (__gnkPath2.indexOf('/gnk-aktual') === -1) return;
    var scope = root || document;
    Array.prototype.forEach.call(scope.querySelectorAll('#akFeatured img,#akCategories img,#akKolumna img,#akReceptDana img,#akKomentari img'), function (img) {
      var context = img.closest('article,a,.ak-featured,.ak-recept-dana,.ak-kolumna') || img.parentNode;
      var heading = context && context.querySelector && context.querySelector('h2,h3');
      var label = heading && heading.textContent ? heading.textContent.trim() : '';
      if (!img.getAttribute('alt') || !img.getAttribute('alt').trim()) img.setAttribute('alt', label || (isEnglish() ? 'AKTUAL MEDIA story image' : 'AKTUAL MEDIA — slika uz vijest'));
      if (!img.getAttribute('width') || !img.getAttribute('height')) {
        if (img.closest('#akReceptDana')) { img.setAttribute('width', '800'); img.setAttribute('height', '600'); }
        else if (img.closest('#akKolumna')) { img.setAttribute('width', '120'); img.setAttribute('height', '120'); }
        else { img.setAttribute('width', '640'); img.setAttribute('height', '400'); }
      }
      if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
    });
  }
  normaliseMenuLabels();
  alignNewsAutomationText();
  window.addEventListener('gnk-language-change', function () { alignNewsAutomationText(); hardenAktualImages(document); });
  removeCorporateInformationExternalAction(document);
  hardenAktualImages(document);
  new MutationObserver(function (mutations) {
    removeCorporateInformationExternalAction(document);
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes && mutations[i].addedNodes.length) { hardenAktualImages(document); break; }
    }
  }).observe(document.body, { childList: true, subtree: true });

  var menuButton = document.getElementById('menuToggle');
  var menu = document.getElementById('navLinks');
  if (menuButton && menu) {
    menuButton.addEventListener('click', function () { menu.classList.toggle('open'); });
    document.addEventListener('click', function (event) {
      if (!menu.contains(event.target) && event.target !== menuButton) menu.classList.remove('open');
    });
  }

  var grid = document.getElementById('newsGrid');
  if (grid) {
    fetch('/data/fina_watch.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (data) {
      var items = data.items || [];
      if (!items.length) return;
      var layout = document.createElement('div'); layout.className = 'news-layout';
      grid.parentNode.insertBefore(layout, grid); layout.appendChild(grid);
      var panel = document.createElement('aside'); panel.className = 'fina-panel'; layout.appendChild(panel);
      var current = 0;
      function show() {
        var item = items[current]; if (!item) return;
        var en = isEnglish();
        panel.innerHTML = '<header class="fina-head"><small>' + (en ? 'Official business information' : 'Službene poslovne informacije') + '</small><h3>FINA Info.BIZ / RGFI</h3><p>' + (en ? 'Public sources and verification' : 'Javni izvori i provjere') + '</p></header><div class="fina-stage"><article class="fina-item"><span class="fina-tag"></span><h4></h4><p></p><a target="_blank" rel="noopener">' + (en ? 'Verify source' : 'Provjeri izvor') + '</a></article></div><div class="fina-legal">' + (en ? 'Only publicly available and verifiable information and links to official sources are displayed.' : 'Prikazuju se samo javno dostupne i provjerljive informacije te poveznice prema službenim izvorima.') + '</div>';
        panel.querySelector('.fina-tag').textContent = item.category || '';
        panel.querySelector('h4').textContent = item.title || '';
        panel.querySelector('.fina-item p').textContent = item.summary || '';
        panel.querySelector('a').href = item.url || '#';
      }
      show();
      window.addEventListener('gnk-language-change', show);
      if (items.length > 1) window.setInterval(function () { current = (current + 1) % items.length; show(); }, 11000);
    }).catch(function () {});
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=' + VERSION).catch(function () {});
});
