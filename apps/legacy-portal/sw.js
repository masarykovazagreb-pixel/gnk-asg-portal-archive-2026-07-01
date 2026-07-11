const CACHE_NAME = 'gnk-asg-live-v55-menu-navigation-fix';
const STATIC_ASSETS = [
  './', './index.html', './en/', './en/index.html', './sadrzaj/', './teme/', './teme/index.html', './tehnologija/',
  './nermin-sefic/', './nermin-sefic/index.html', './en/nermin-sefic/', './en/nermin-sefic/index.html',
  './intelligence-desk/', './instalacija/', './financije/', './registri/',
  './trzista/', './trzista/index.html', './en/markets/', './en/markets/index.html',
  './en/finance/', './en/finance/index.html', './en/technology/', './en/technology/index.html',
  './en/intelligence-desk/', './en/registries/', './en/registries/index.html', './insights-hr/', './en/insights/',
  './autorske-objave/', './podijeli/portal/', './podijeli/financije/', './podijeli/grupa/', './podijeli/trzista/', './podijeli/tehnologija/', './podijeli/vijesti/', './podijeli/dokumenti/', './podijeli/bpp/',
  './assets/style.css', './assets/advanced.css', './assets/header-premium.css', './assets/menu-fix.css', './assets/seo-profile-link.css',
  './assets/group-contrast.css', './assets/group-network.css', './assets/network-motion.css', './assets/group-globe-3d.css',
  './assets/group-location-insights.css', './assets/group-map-2d-geo.css', './assets/group-google-map.css', './assets/group-location-weather.css', './assets/group-overview-panel.css', './assets/group-market-coverage.css', './assets/network-reading-layout.css', './assets/network-live-selection.css', './assets/portal-integration.css', './assets/portal-status.css', './assets/command-centre.css',
  './assets/bitcoin-chart.css', './assets/market-expansion.css', './assets/bpp-public-card.css', './assets/language.css',
  './assets/intelligence-desk.css', './assets/desk-hybrid.css', './assets/mobile-app.css', './assets/desk-search.css',
  './assets/floating-intelligence.css', './assets/public-sources.css', './assets/site-share.css', './assets/mobile-stability.css', './assets/group-mobile-accessible.css',
  './assets/market-centre.css', './assets/market-centre-panels.css',
  './assets/logo-gnk-asg.svg', './assets/asg-gold-coin.svg', './assets/gnk-asg-social-card.svg', './assets/gnk-asg-social-card.png', './assets/share-financije.png', './assets/share-grupa.png', './assets/share-trzista.png', './assets/share-bpp.png', './assets/share-tehnologija.png', './assets/share-vijesti.png', './assets/share-teme.png', './assets/share-dokumenti.png', './assets/gnk-global-static-overview-accurate.svg',
  './favicon.svg', './assets/favicon.svg', './assets/app-icon-192.svg', './assets/app-icon-512.svg',
  './assets/app.js', './assets/i18n.js', './assets/language-routing.js', './assets/portal-navigation.js',
  './assets/status.js', './assets/market.js', './assets/live-market-pulse.js', './assets/bitcoin-chart.js',
  './assets/market-expansion.js', './assets/bpp-public-card.js', './assets/news-live.js', './assets/assistant.js', './assets/inline-assistant.js',
  './assets/intelligence-desk.js', './assets/desk-hybrid.js', './assets/desk-search.js', './assets/mobile-app.js',
  './assets/mobile-navigation.js', './assets/floating-intelligence.js', './assets/world-geography.js',
  './assets/group-network.js', './assets/network-motion.js', './assets/group-globe-3d.js', './assets/group-map-2d-geo.js',
  './assets/group-location-insights.js', './assets/group-map-selection-bridge.js', './assets/group-google-map.js', './assets/group-location-weather.js', './assets/group-overview-panel.js', './assets/group-market-coverage.js', './assets/network-selection-sync.js', './assets/command-centre.js',
  './assets/network-search-3d.js', './assets/group-map-pdf.js', './assets/group-globe-pdf.js', './assets/group-mobile-accessible.js',
  './assets/group-clarity.js', './assets/public-sources.js', './assets/site-share.js', './assets/content-share.js', './assets/share-routing-fix.js', './assets/hourly-data-disclosure.js', './assets/portal-layout.js', './assets/public-tools.js',
  './assets/market-centre-data.js', './assets/market-constellation.js', './data/desk_public_config.json',
  './data/group_network.json', './data/group_network_geo.json', './data/group_location_facts.json',
  './data/public_sources.json', './data/open_data.json', './data/macro_market.json', './data/stock_exchanges.json', './data/asg_gold_asset.json',
  './data/media_approved.json', './data/media_monitor_status.json', './data/daily_market_brief.json', './manifest.webmanifest', './robots.txt', './sitemap.xml', './google46686328e30c759f.html'
];
self.addEventListener('install', event => {
  const requests = STATIC_ASSETS.map(asset => new Request(asset, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(requests)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => clients.forEach(client => client.postMessage({ type: 'GNK_PORTAL_CACHE_REFRESHED', version: CACHE_NAME })))
  );
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;
  if (!sameOrigin) return;
  const path = new URL(event.request.url).pathname;
  const dynamicData = path.startsWith('/data/') || path === '/sw.js' || path.endsWith('/assets/status.js') || path.endsWith('/assets/app.js') || path.endsWith('/assets/portal-navigation.js') || path.endsWith('/assets/menu-fix.css');
  if (dynamicData) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
