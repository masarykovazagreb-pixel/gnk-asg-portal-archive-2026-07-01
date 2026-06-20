const CACHE_NAME = 'asg-kontrola-v1-20260529';
const STATIC_ASSETS = [
  '/kontrola-azuriranja/',
  '/kontrola-azuriranja/index.html',
  '/kontrola-azuriranja/control.css?v=20260529-1',
  '/kontrola-azuriranja/control.js?v=20260529-1',
  '/kontrola-azuriranja/app.webmanifest',
  '/kontrola-azuriranja/icon-192.svg',
  '/kontrola-azuriranja/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('asg-kontrola-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/data/update_status.json' || url.pathname === '/data/fast_market_status.json') {
    event.respondWith(fetch(event.request, {cache: 'no-store'}));
    return;
  }

  if (!url.pathname.startsWith('/kontrola-azuriranja/')) return;
  event.respondWith(
    fetch(event.request, {cache: 'no-store'})
      .then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        return response;
      })
      .catch(() => caches.match(event.request).then(found => found || caches.match('/kontrola-azuriranja/')))
  );
});
