#!/usr/bin/env node
// scripts/gnk-indexnow-submit-v1.mjs
// Šalje sve URL-ove s cijelog sajta na IndexNow protokol — trenutno
// obavještava Bing, Yandex, Seznam.cz i druge tražilice koje podržavaju
// protokol o novim/promijenjenim stranicama, umjesto čekanja da ih
// sami otkriju kroz redoviti crawl (koji može trajati danima do tjednima).
//
// IndexNow NE pokriva Google izravno (Google koristi vlastiti sustav i
// prvenstveno prati sitemap + interne poveznice), ali Bing/Yandex danas
// nose značajan dio pretraga, a IndexNow signal Bingu neizravno ubrzava
// i otkrivanje od strane Googlea kroz njihov IndexNow-svjestan crawler.

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const HOST = 'gnk-asg.hr';
const KEY = process.env.INDEXNOW_KEY;
const ROOT = 'apps/portal';
const ENDPOINT = 'api.indexnow.org';

if (!KEY) {
  console.error('GRESKA: INDEXNOW_KEY nije postavljen u okruženju.');
  process.exit(1);
}

function sviHtmlFajlovi(dir) {
  let rezultati = [];
  for (const stavka of fs.readdirSync(dir, { withFileTypes: true })) {
    const puniPut = path.join(dir, stavka.name);
    if (stavka.isDirectory()) {
      rezultati = rezultati.concat(sviHtmlFajlovi(puniPut));
    } else if (stavka.name === 'index.html') {
      rezultati.push(puniPut);
    }
  }
  return rezultati;
}

function putanjaUrl(putanjaFajla) {
  let rel = putanjaFajla.replace(ROOT, '').replace(/index\.html$/, '');
  if (!rel.startsWith('/')) rel = '/' + rel;
  return `https://${HOST}${rel}`;
}

const fajlovi = sviHtmlFajlovi(ROOT);
// preskoči noindex i redirekt stranice — isto pravilo kao SEO audit alat
const urlList = [];
for (const f of fajlovi) {
  const html = fs.readFileSync(f, 'utf8');
  if (/noindex/i.test(html)) continue;
  if (/http-equiv="refresh"/i.test(html)) continue;
  urlList.push(putanjaUrl(f));
}

console.log(`Ukupno URL-ova za slanje: ${urlList.length}`);

// IndexNow prima do 10.000 URL-ova po zahtjevu — šaljemo u paketima od 5.000
// radi sigurnosti i lakšeg praćenja grešaka.
const VELICINA_PAKETA = 5000;
const paketi = [];
for (let i = 0; i < urlList.length; i += VELICINA_PAKETA) {
  paketi.push(urlList.slice(i, i + VELICINA_PAKETA));
}

function posaljiPaket(urlListaPaketa) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: urlListaPaketa,
    });
    const req = https.request(
      {
        hostname: ENDPOINT,
        path: '/indexnow',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          console.log(`IndexNow odgovor: ${res.statusCode} (paket od ${urlListaPaketa.length} URL-ova)`);
          resolve({ status: res.statusCode, body: data });
        });
      }
    );
    req.on('error', (e) => {
      console.error('Greška u zahtjevu:', e.message);
      resolve({ status: 0, error: e.message });
    });
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const paket of paketi) {
    await posaljiPaket(paket);
  }
  console.log('IndexNow slanje dovršeno.');
})();
