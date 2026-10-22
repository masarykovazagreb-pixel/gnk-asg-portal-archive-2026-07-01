// GNK ASG — posrednik za slike izvora.
//
// Zašto posrednik, a ne izravna poveznica na tuđu sliku:
//   • čitateljev IP i preglednik ne idu izdavaču — sliku dohvaća Worker;
//   • izdavač ne dobiva referrer s naše stranice;
//   • ako izdavač ugasi sliku, mi to vidimo na jednom mjestu i stranica
//     može pokazati čistu tipografsku plohu umjesto slomljene ikone;
//   • slika se kešira na rubu mreže, pa je drugi posjet brz i kad izvor
//     radi sporo.
//
// Posrednik nije otvoren: dopuštene su samo adrese s popisa hostova koje
// portal stvarno koristi u feedu, sadržaj mora biti slika, veličina je
// ograničena. Sve ostalo vraća 403 bez dohvaćanja.

import { REGION_IMAGE_HOST_LIST } from './image-hosts-v1.js';

export const IMAGE_PROXY_VERSION = 'GNK_ASG_IMAGE_PROXY_V1_20261022';
export const IMAGE_PROXY_PATH = '/api/img';

/* Hostovi iz apps/portal/data/news.json — jedini koje portal stvarno
   prikazuje. Novi izvor se dodaje ovdje, namjerno, a ne automatski. */
const ALLOWED_HOSTS = new Set([
  'i.guim.co.uk',
  'ichef.bbci.co.uk',
  'static01.nyt.com',
  'www.tportal.hr',
  'bl-i.thgim.com',
  'dam.mediacorp.sg',
  'www.japantimes.co.jp',
  'www.livemint.com',
  'www.poslovni.hr',
  'cdn.sanity.io',
  's3-images.ctmedia.io',
  'cdn.i-scmp.com',
  'cryptoslate.com',
  'images.euronews.com',
  's.france24.com',
  'scx1.b-cdn.net',
  'www.tbstat.com',
  'cdn.arstechnica.net',
  'static.independent.co.uk',
  'imgs.mongabay.com',
  'images.mktw.net',
  'www.engadget.com',
  'img.decrypt.co',
  'th-thumbnailer.cdn-si-edu.com',
  'bitcoinmagazine.com',
  'e3.365dm.com',
  'www.netokracija.com',
  'www.esa.int',
  'www.nasa.gov',
  /* Osam gradskih izdanja i devet deskova — popis s obrazloženjem po mediju
     stoji u image-hosts-v1.js; test coverage pada ako se podaci i popis
     raziđu, pa host ne može ući neopaženo. */
  ...REGION_IMAGE_HOST_LIST,
]);

const MAX_BYTES = 8 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 12000;
const CACHE_SECONDS = 60 * 60 * 24 * 30;

const json = (data, status, extra = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    ...extra,
  },
});

function pathOf(request) {
  return new URL(request.url).pathname.replace(/\/+$/, '') || '/';
}

/* Samo https, samo dopušten host, samo putanja koja liči na datoteku.
   Query parametri ostaju jer su dio potpisa nekih CDN-ova.

   Napomena o parametru w: stranica već traži od izvora najveću dostupnu
   veličinu (vidi biggerSource u aktual-media-world-v1.js), pa posrednik
   sliku ne mijenja. w ostaje u adresi da keš i zapis budu čitljivi, ali
   ne ulazi u ključ keša — ista slika se dohvaća jednom za sve širine. */
export function targetOf(raw) {
  if (!raw || typeof raw !== 'string' || raw.length > 2048) return null;
  // ".." provjeravamo na siroj adresi: URL normalizira putanju prije nego
  // je vidimo, pa bi /img/../../x.jpg izgledalo kao /x.jpg.
  if (raw.includes('..') || /[\\\s]/.test(raw)) return null;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (url.port && url.port !== '443') return null;
  if (url.pathname.includes('..')) return null;
  if (!/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return null;
  // SVG može nositi skriptu; posrednik prenosi samo rasterske slike.
  if (/\.svg$/i.test(url.pathname)) return null;
  return url;
}

export async function handleImageProxy(request, env, ctx) {
  if (pathOf(request) !== IMAGE_PROXY_PATH) return null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'GET, HEAD' });
  }

  // Posrednik služi <img> elementima, ne kao otvoreni proxy u kartici.
  // Kad preglednik pošalje zaglavlja o namjeri, navigacija se odbija.
  if (request.headers.get('sec-fetch-mode') === 'navigate' || request.headers.get('sec-fetch-dest') === 'document') {
    return json({ ok: false, error: 'navigation_not_allowed' }, 403);
  }

  const src = new URL(request.url).searchParams.get('u');
  const target = targetOf(src);
  if (!target) return json({ ok: false, error: 'not_allowed' }, 403);

  const cacheKey = new Request(`${new URL(request.url).origin}${IMAGE_PROXY_PATH}?u=${encodeURIComponent(target.href)}`, { method: 'GET' });
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    const hit = await cache.match(cacheKey).catch(() => null);
    if (hit) return hit;
  }

  let upstream = null;
  let lastError = '';
  for (let attempt = 0; attempt < 2 && !upstream; attempt += 1) {
    try {
      const response = await fetch(target.href, {
        method: 'GET',
        headers: { accept: 'image/avif,image/webp,image/*;q=0.8,*/*;q=0.5' },
        redirect: 'follow',
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        /* Cloudflare ne šalje Referer prema izdavaču iz Workera. */
        cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
      });
      // Pet stotke i preopterećenje vrijede novog pokušaja; 404 ne.
      if (response.ok || response.status < 500) upstream = response;
      else lastError = `upstream_status_${response.status}`;
    } catch {
      lastError = 'upstream_unreachable';
    }
  }

  if (!upstream) {
    // Izdavač je pao, ali slika je već bila dobra. Radije poslužimo
    // zadnju kopiju iz keša nego praznu plohu — uz jasan Stale zaglavlje.
    const stale = cache ? await cache.match(cacheKey).catch(() => null) : null;
    if (stale) {
      const headers = new Headers(stale.headers);
      headers.set('x-gnk-image-proxy-stale', '1');
      headers.set('warning', '110 - "Response is stale"');
      return new Response(request.method === 'HEAD' ? null : stale.body, { status: 200, headers });
    }
    return json({ ok: false, error: lastError || 'upstream_unreachable' }, 502);
  }

  if (!upstream.ok) return json({ ok: false, error: 'upstream_status', status: upstream.status }, 502);

  // Izdavači često preusmjeravaju slike na svoj CDN. Preusmjeravanje smije
  // završiti samo na hostu s popisa — inače bi posrednik vodio bilo kamo.
  let finalHost = '';
  try { finalHost = new URL(upstream.url || target.href).hostname.toLowerCase(); } catch { finalHost = ''; }
  if (finalHost && finalHost !== target.hostname.toLowerCase() && !ALLOWED_HOSTS.has(finalHost)) {
    return json({ ok: false, error: 'redirect_not_allowed' }, 502);
  }

  const type = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!type.startsWith('image/')) return json({ ok: false, error: 'not_an_image' }, 415);
  if (type === 'image/svg+xml') return json({ ok: false, error: 'svg_not_served' }, 415);

  const declared = Number(upstream.headers.get('content-length') || 0);
  if (declared && declared > MAX_BYTES) return json({ ok: false, error: 'too_large' }, 413);

  const headers = new Headers({
    'content-type': type,
    'cache-control': `public, max-age=${CACHE_SECONDS}, stale-if-error=${CACHE_SECONDS}, immutable`,
    vary: 'accept',
    'x-content-type-options': 'nosniff',
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    'x-gnk-image-proxy': IMAGE_PROXY_VERSION,
    'cross-origin-resource-policy': 'cross-origin',
  });

  const response = new Response(request.method === 'HEAD' ? null : upstream.body, { status: 200, headers });
  if (cache && request.method === 'GET' && ctx?.waitUntil) ctx.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
  return response;
}

export function allowedImageHosts() {
  return [...ALLOWED_HOSTS];
}
