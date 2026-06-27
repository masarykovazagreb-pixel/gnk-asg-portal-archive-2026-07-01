const VERSION='gnk-asg-mobile-v20-20260627';
const CACHE=`${VERSION}-shell`;
const SHELL=[
  '/app/',
  '/app.webmanifest?v=20260627-v2',
  '/assets/mobile-app-v2.css?v=20260627-v2',
  '/assets/mobile-app-v2.js?v=20260627-v2',
  '/assets/mobile-navigation-v20.js?v=20260627-v20',
  '/assets/brand/media-kit/GNK_ASG_logo_gold_transparent.png',
  '/assets/app-icon-192.svg',
  '/assets/app-icon-512.svg',
  '/favicon.svg'
];
const PRIVATE_PREFIXES=[
  '/api/','/admin-center','/operator-dashboard','/operator-mobile','/mail-studio',
  '/media-command-center','/auto-editor','/news-admin','/pdf-publisher','/memorandum-studio'
];
const NEVER_CACHE=['/data/','/app-sw.js'];

function privateRequest(url){return PRIVATE_PREFIXES.some(prefix=>url.pathname.startsWith(prefix));}
function dynamicRequest(url){return NEVER_CACHE.some(prefix=>url.pathname.startsWith(prefix));}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all(SHELL.map(async path=>{
      try{
        const response=await fetch(path,{cache:'reload'});
        if(response.ok)await cache.put(path,response);
      }catch(_){ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('gnk-asg-mobile-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(privateRequest(url)||dynamicRequest(url)){
    event.respondWith(fetch(request,{cache:'no-store'}));
    return;
  }

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request,{cache:'no-store'});
        if(response.ok&&url.pathname.startsWith('/app/')){
          const cache=await caches.open(CACHE);
          await cache.put('/app/',response.clone());
        }
        return response;
      }catch(_){
        return (await caches.match(request))||(await caches.match('/app/'))||new Response('GNK ASG aplikacija nije dostupna izvan mreže.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  if(url.pathname.startsWith('/assets/')||url.pathname==='/favicon.svg'||url.pathname==='/app.webmanifest'){
    event.respondWith((async()=>{
      const cached=await caches.match(request);
      const network=fetch(request).then(async response=>{
        if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}
        return response;
      }).catch(()=>null);
      return cached||(await network)||new Response('',{status:504});
    })());
  }
});
