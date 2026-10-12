// SPT service worker — offline predmemorija za statiku (produced by GNK ASG)
"use strict";
const CACHE = "spt-v2.3.0";
const CORE = [
  "/",
  "/static/manifest.webmanifest",
  "/static/css/style.css",
  "/static/js/util.js",
  "/static/js/charts.js",
  "/static/js/pitch.js",
  "/static/js/app.js",
  "/static/index.html"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" }))).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // statika: cache-first (samo iz istog origina)
  if (url.origin === location.origin && (url.pathname.startsWith("/static/") || url.pathname === "/" || url.pathname === "/marketing")) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
        return r;
      }).catch(() => caches.match("/")))
    );
    return;
  }
  // API: uvijek mreža (live podaci), bez keširanja
});
