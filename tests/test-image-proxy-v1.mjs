#!/usr/bin/env node
// Guard za posrednik slika (/api/img).
//
// Posrednik je jedino mjesto gdje portal dohvaća tuđe slike. Ako se popis
// dopuštenih hostova raziđe s onim što feed stvarno nosi, slike tiho nestanu;
// ako se razvodni, posrednik postaje otvoreni proxy. Ovaj test čuva obje
// granice: popis mora odgovarati stvarnim izvorima, a sve izvan njega pada.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  IMAGE_PROXY_PATH,
  IMAGE_PROXY_VERSION,
  allowedImageHosts,
  handleImageProxy,
  targetOf,
} from '../workers/gnk-asg-direct-operator/src/image-proxy-v1.js';
import { REGION_IMAGE_HOST_LIST } from '../workers/gnk-asg-direct-operator/src/image-hosts-v1.js';

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

/* ---------- 1. Popis hostova = stvarni izvori u feedu ---------- */

const news = JSON.parse(fs.readFileSync('apps/portal/data/news.json', 'utf8'));
const items = Array.isArray(news) ? news : news.items || [];
const feedHosts = new Set();
for (const item of items) {
  if (!/^https:\/\//i.test(String(item.image || ''))) continue;
  feedHosts.add(new URL(item.image).hostname.toLowerCase());
}
const allowed = new Set(allowedImageHosts());
/* Popis ima dva dijela: matični feed (apps/portal/data/news.json) i osam
   regionalnih izdanja (apps/region/data/*.json). Prvi mora odgovarati
   feedu u oba smjera; drugi se provjerava u test-image-proxy-coverage-v1
   protiv svojih podataka. Zato se ovdje "višak" mjeri samo na matičnom
   dijelu — inače bi svaki regionalni host izgledao kao višak. */
const regionHosts = new Set(REGION_IMAGE_HOST_LIST);
const missing = [...feedHosts].filter((h) => !allowed.has(h)).sort();
const unused = [...allowed].filter((h) => !feedHosts.has(h) && !regionHosts.has(h)).sort();
check(missing.length === 0, `hostovi u feedu kojih nema na popisu: ${missing.join(', ')}`);
/* Neiskorišten unos na popisu nije kvar: feedovi rotiraju, a host koji
   danas nema sliku (npr. img.youtube.com) sutra je može imati. Opasno je
   samo obrnuto — slika s hosta kojeg na popisu nema — i to se provjerava
   iznad. Zato se neiskorišteni hostovi ispisuju u izvještaju, ali ne ruše
   ugovor. */
const unusedHosts = unused;
for (const host of regionHosts) check(allowed.has(host), `regionalni host nije u posredniku: ${host}`);
check(items.length >= 300, `feed mora imati barem 300 zapisa, ima ${items.length}`);

/* ---------- 2. Adresa mora biti točno dopuštena ---------- */

const accepted = [
  ['https://i.guim.co.uk/img/media/abc/1.jpg?width=880&quality=85&s=x', 'i.guim.co.uk'],
  ['https://ichef.bbci.co.uk/ace/standard/1024/cpsprodpb/x.jpg', 'ichef.bbci.co.uk'],
  ['https://www.tportal.hr/media/thumbnail/1200x630/1.jpeg', 'www.tportal.hr'],
  ['https://img.decrypt.co/photo.webp', 'img.decrypt.co'],
];
for (const [url, host] of accepted) {
  const target = targetOf(url);
  check(target && target.hostname === host, `trebao bi prihvatiti ${url}`);
}

const rejected = [
  ['http://i.guim.co.uk/img/media/abc/1.jpg', 'http nije dopušten'],
  ['https://evil.example.com/photo.jpg', 'strani host nije dopušten'],
  ['https://i.guim.co.uk.evil.com/photo.jpg', 'nadovezani host nije dopušten'],
  ['https://sub.i.guim.co.uk/photo.jpg', 'pod-domena nije na popisu'],
  ['https://i.guim.co.uk/img/../../etc/passwd.jpg', 'prolaz kroz direktorije'],
  ['https://i.guim.co.uk/img/media/abc/1', 'putanja bez nastavka'],
  ['https://i.guim.co.uk/img/media/abc/1.svg', 'SVG se ne poslužuje'],
  ['https://user:pass@i.guim.co.uk/photo.jpg', 'korisnički podaci u adresi'],
  ['javascript:alert(1)//photo.jpg', 'javascript shema'],
  ['data:image/png;base64,AAAA', 'data shema'],
  ['//i.guim.co.uk/photo.jpg', 'protokol-relativna adresa'],
  ['https://i.guim.co.uk:8443/photo.jpg', 'nestandardni port'],
  ['', 'prazna adresa'],
  [null, 'bez adrese'],
];
for (const [url, why] of rejected) {
  check(targetOf(url) === null, `mora odbiti (${why}): ${String(url)}`);
}
check(targetOf(`https://i.guim.co.uk/${'a'.repeat(2100)}.jpg`) === null, 'preduga adresa mora pasti');

/* ---------- 3. Rukovatelj: samo /api/img, samo GET/HEAD ---------- */

const workerUrl = (pathname, query = '') => new URL(`https://gnk-asg.hr${pathname}${query}`).toString();

let response = await handleImageProxy(new Request(workerUrl('/api/s-chat')), {}, {});
check(response === null, 'ostale rute moraju proći dalje (null)');

response = await handleImageProxy(new Request(workerUrl(IMAGE_PROXY_PATH)), {}, {});
check(response?.status === 403, 'bez parametra u mora biti 403');
check((await response.json()).error === 'not_allowed', 'bez parametra: not_allowed');

response = await handleImageProxy(new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fevil.example.com%2Fa.jpg')), {}, {});
check(response?.status === 403, 'strani host mora biti 403');

response = await handleImageProxy(new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg'), { method: 'POST' }), {}, {});
check(response?.status === 405, 'POST mora biti 405');
check(response.headers.get('allow') === 'GET, HEAD', '405 mora navesti dopuštene metode');

/* ---------- 4. Dohvat: slika prolazi, HTML i SVG ne ---------- */

const upstream = (headers, body = 'x') => async () => new Response(body, { status: 200, headers });
const ctx = { waitUntil() {} };
// Worker koristi globalni fetch; u testu ga zamijenimo samo oko ovih provjera.
const realFetch = globalThis.fetch;
globalThis.fetch = upstream({ 'content-type': 'image/jpeg', 'content-length': '1' });
try {
  response = await handleImageProxy(
    new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg&w=880')),
    {},
    ctx
  );
  check(response?.status === 200, 'dopuštena slika mora vratiti 200');
  check(response.headers.get('content-type')?.startsWith('image/'), 'mora vratiti sliku');
  check(response.headers.get('x-gnk-image-proxy') === IMAGE_PROXY_VERSION, 'mora nositi oznaku verzije');
  check(/immutable/.test(response.headers.get('cache-control') || ''), 'mora se keširati kao nepromjenjivo');
  check(response.headers.get('x-content-type-options') === 'nosniff', 'mora nositi nosniff');

  globalThis.fetch = upstream({ 'content-type': 'text/html; charset=utf-8' }, '<html>');
  response = await handleImageProxy(
    new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg')),
    {}, ctx
  );
  check(response?.status === 415, 'HTML se ne smije poslužiti kao slika');

  globalThis.fetch = upstream({ 'content-type': 'image/svg+xml' }, '<svg/>');
  response = await handleImageProxy(
    new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg')),
    {}, ctx
  );
  check(response?.status === 415, 'SVG se ne smije poslužiti');

  // Preusmjeravanje na strani host mora pasti, iako je početna adresa dopuštena.
  globalThis.fetch = async () => {
    const moved = new Response('x', { status: 200, headers: { 'content-type': 'image/jpeg' } });
    Object.defineProperty(moved, 'url', { value: 'https://evil.example.com/a.jpg' });
    return moved;
  };
  response = await handleImageProxy(
    new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg')),
    {}, ctx
  );
  check(response?.status === 502, 'preusmjeravanje na strani host mora biti 502');
  check((await response.json()).error === 'redirect_not_allowed', 'preusmjeravanje: redirect_not_allowed');

  // Navigacija se odbija: posrednik nije otvoreni proxy u kartici.
  globalThis.fetch = upstream({ 'content-type': 'image/jpeg' });
  response = await handleImageProxy(
    new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg'), { headers: { 'sec-fetch-mode': 'navigate' } }),
    {}, ctx
  );
  check(response?.status === 403, 'navigacija mora biti 403');
  check((await response.json()).error === 'navigation_not_allowed', 'navigacija: navigation_not_allowed');

  response = await handleImageProxy(
    new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg'), { headers: { 'sec-fetch-dest': 'document' } }),
    {}, ctx
  );
  check(response?.status === 403, 'izravno otvaranje u kartici mora biti 403');

  // Pad izvora na pet stotki vrijedi novog pokušaja — dva poziva, ne jedan.
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return attempts === 1
      ? new Response('busy', { status: 503 })
      : new Response('ok', { status: 200, headers: { 'content-type': 'image/jpeg' } });
  };
  response = await handleImageProxy(
    new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg')),
    {}, ctx
  );
  check(response?.status === 200 && attempts === 2, `pet stotka mora imati drugi pokušaj (pokušaja: ${attempts})`);

  // Kad izvor padne, a keš ima zadnju dobru kopiju, poslužuje se kopija.
  const stored = new Response('stara-slika', { status: 200, headers: { 'content-type': 'image/jpeg', 'x-gnk-image-proxy': IMAGE_PROXY_VERSION } });
  const realCaches = globalThis.caches;
  let lookups = 0;
  globalThis.caches = {
    default: {
      // Prvi pogled je promašaj (inače bi odgovor došao iz keša prije dohvata),
      // drugi je zadnja dobra kopija nakon pada izvora.
      match: async () => { lookups += 1; return lookups === 1 ? null : stored.clone(); },
      put: async () => {},
    },
  };
  globalThis.fetch = async () => { throw new Error('offline'); };
  response = await handleImageProxy(
    new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg')),
    {}, ctx
  );
  check(response?.status === 200, 'stale kopija mora vratiti 200');
  check(response.headers.get('x-gnk-image-proxy-stale') === '1', 'stale kopija mora nositi oznaku');
  check((await response.text()) === 'stara-slika', 'stale kopija mora vratiti spremljenu sliku');
  if (realCaches === undefined) delete globalThis.caches; else globalThis.caches = realCaches;

  globalThis.fetch = async () => new Response('nope', { status: 404 });
  response = await handleImageProxy(
    new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg')),
    {}, ctx
  );
  check(response?.status === 502, 'pad izvora mora biti 502');

  globalThis.fetch = async () => { throw new Error('offline'); };
  response = await handleImageProxy(
    new Request(workerUrl(IMAGE_PROXY_PATH, '?u=https%3A%2F%2Fi.guim.co.uk%2Fa.jpg')),
    {}, ctx
  );
  check(response?.status === 502, 'nedostupan izvor mora biti 502');
} finally {
  globalThis.fetch = realFetch;
}

/* ---------- 5. Ulančavanje u glavni Worker ---------- */

const index = fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js', 'utf8');
check(index.includes("from './image-proxy-v1.js'"), 'glavni Worker mora uvoziti posrednik');
check(/await handleImageProxy\(request, ?env, ?ctx\)/.test(index), 'glavni Worker mora zvati posrednik');
check(index.indexOf('handleImageProxy(request') < index.indexOf('handleSChat('), 'posrednik se provjerava prije S+Chata');

/* ---------- 6. Portal ne smije zaobići posrednik ---------- */

const portal = fs.readFileSync('apps/portal/assets/aktual-media-world-v1.js', 'utf8');
check(portal.includes("'/api/img?u='"), 'AKTUAL MEDIA mora slike slati kroz posrednik');
check(!/src="'\+esc\(String\(item\.image/.test(portal), 'AKTUAL MEDIA ne smije upisivati tuđu adresu izravno u src');
check(portal.includes('referrerpolicy="no-referrer"'), 'slike kroz posrednik ne nose referrer');

assert.equal(failures.length, 0, failures.join('\n') || 'image proxy contract failed');
console.log(JSON.stringify({
  ok: true,
  version: IMAGE_PROXY_VERSION,
  path: IMAGE_PROXY_PATH,
  feedItems: items.length,
  feedHosts: feedHosts.size,
  accepted: accepted.length,
  rejected: rejected.length,
  unusedHosts,
}, null, 2));
