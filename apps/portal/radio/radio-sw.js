const CACHE='aktual-media-radio-v1';
const SHELL=['/radio/player/','/aktual-media-radio.webmanifest','/assets/aktual-radio-player-v1.js','/assets/aktual-media-radio-player-v2.css','/assets/aktual-media-radio-install-v1.js','/assets/app-icon-192.svg','/assets/app-icon-512.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(SHELL.map(x=>cache.add(x)))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request,{cache:'no-store'}).then(res=>{if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});}return res;}).catch(()=>caches.match(event.request)));
});