document.addEventListener('DOMContentLoaded', function () {
  var VERSION = '20260601-activity-model-fix01';

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
  style('/assets/header-premium.css');
  style('/assets/group-contrast.css');
  style('/assets/group-network.css');
  style('/assets/network-motion.css');
  style('/assets/group-globe-3d.css');
  style('/assets/group-location-insights.css');
  style('/assets/group-map-2d-geo.css');
  style('/assets/group-google-map.css');
  style('/assets/group-location-weather.css');
  style('/assets/group-overview-panel.css');
  style('/assets/group-market-coverage.css');
  style('/assets/network-reading-layout.css');
  style('/assets/bitcoin-chart.css');
  style('/assets/market-expansion.css');
  style('/assets/bpp-public-card.css');
  style('/assets/language.css');
  style('/assets/intelligence-desk.css');
  style('/assets/desk-hybrid.css');
  style('/assets/command-centre.css');
  style('/assets/mobile-app.css');
  style('/assets/desk-search.css');
  style('/assets/floating-intelligence.css');
  style('/assets/public-sources.css');
  style('/assets/mobile-stability.css');
  style('/assets/group-mobile-accessible.css');
  style('/assets/portal-integration.css');
  style('/assets/seo-profile-link.css');
  style('/assets/menu-fix.css');
  style('/assets/quality-patch.css');
  script('/assets/i18n.js');
  script('/assets/language-routing.js');
  script('/assets/portal-navigation.js');
  script('/assets/status.js');
  script('/assets/browser-data-refresh.js');
  script('/assets/market.js');
  script('/assets/live-market-pulse.js');
  script('/assets/bitcoin-chart.js');
  script('/assets/market-expansion.js');
  script('/assets/bpp-public-card.js');
  script('/assets/news-live.js');
  script('/assets/assistant.js');
  script('/assets/inline-assistant.js');
  script('/assets/intelligence-desk.js');
  script('/assets/desk-hybrid.js');
  script('/assets/desk-search.js');
  script('/assets/mobile-app.js');
  script('/assets/mobile-navigation.js');
  script('/assets/floating-intelligence.js');
  script('/assets/world-geography.js');
  script('/assets/group-network.js');
  script('/assets/network-motion.js');
  script('/assets/group-globe-3d.js');
  script('/assets/group-map-2d-geo.js');
  script('/assets/group-location-insights.js');
  script('/assets/group-map-selection-bridge.js');
  script('/assets/group-google-map.js');
  script('/assets/group-location-weather.js');
  script('/assets/group-overview-panel.js');
  script('/assets/group-market-coverage.js');
  script('/assets/network-selection-sync.js');
  script('/assets/command-centre.js');
  script('/assets/network-search-3d.js');
  script('/assets/group-map-pdf.js');
  script('/assets/group-globe-pdf.js');
  script('/assets/group-mobile-accessible.js');
  script('/assets/group-clarity.js');
  script('/assets/public-sources.js');
  script('/assets/site-share.js');
  script('/assets/hourly-data-disclosure.js');
  script('/assets/portal-layout.js');
  script('/assets/home-activity-model.js');

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
      if (eyebrow) eyebrow.textContent = 'Refresh every hour';
      if (paragraph) paragraph.textContent = 'The public window displays up to the 500 newest business and technology news items. The active archive retains up to the next 400 older items. Publications about GNK ASG d.o.o., GNK DINAMO Ltd. or Nermin Sefić are displayed automatically from public sources.';
      if (loading && /workflow|refresh/i.test(loading.textContent)) loading.textContent = 'The newest 500 public items refresh automatically every hour; the active archive retains up to 400 older items.';
    } else {
      if (eyebrow) eyebrow.textContent = 'Ažuriranje svakih sat vremena';
      if (paragraph) paragraph.textContent = 'Javni prozor prikazuje do 500 najnovijih poslovnih i tehnoloških vijesti. Aktivna arhiva zadržava do sljedećih 400 starijih stavki. Objave o GNK ASG d.o.o., GNK DINAMO Ltd. ili Nerminu Sefiću prikazuju se automatski iz javnih izvora.';
      if (loading && /workflow|osvjež/i.test(loading.textContent)) loading.textContent = 'Najnovijih 500 javnih stavki osvježava se automatski svakih sat vremena, a aktivna arhiva zadržava do 400 starijih stavki.';
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
  normaliseMenuLabels();
  alignNewsAutomationText();
  window.addEventListener('gnk-language-change', function () { alignNewsAutomationText(); });
  removeCorporateInformationExternalAction(document);
  new MutationObserver(function () { removeCorporateInformationExternalAction(document); }).observe(document.body, { childList: true, subtree: true });

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