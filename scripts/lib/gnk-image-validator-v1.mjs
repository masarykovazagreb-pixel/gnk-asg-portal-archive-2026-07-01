// scripts/lib/gnk-image-validator-v1.mjs
// P0.2 zadatak: automatska provjera slika prije prikaza vijesti na AKTUAL.
// Izoliran modul — ne mijenja postojeću logiku gnk-news-refresh.mjs,
// spreman za integraciju kroz explicitan import.

import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

const MIN_SIRINA = 300;
const MIN_VISINA = 200;

// Poznati obrasci logotipa/favicona/placeholdera po imenu datoteke ili putanji.
const OBRASCI_LOGO_PLACEHOLDER = [
  /logo/i,
  /favicon/i,
  /placeholder/i,
  /fallback/i,
  /default[-_]?(image|avatar|thumb)/i,
  /no[-_]?image/i,
  /avatar/i,
  /\/icons?\//i,
  /sprite/i,
];

/**
 * Provjerava je li dani URL slike prihvatljiv za prikaz.
 * Vraća { ok: boolean, razlog: string, sirina, visina, contentType, httpStatus }
 */
export async function validirajSliku(imageUrl, timeoutMs = 8000) {
  const rezultat = { ok: false, razlog: '', sirina: null, visina: null, contentType: null, httpStatus: null };

  if (!imageUrl || typeof imageUrl !== 'string') {
    rezultat.razlog = 'nedostaje URL';
    return rezultat;
  }

  // data: URI — uvijek odbaci (nikad nije stvarna, vanjska fotografija)
  if (imageUrl.startsWith('data:')) {
    rezultat.razlog = 'data URI (nije stvarna fotografija)';
    return rezultat;
  }

  // provjeri obrazac imena/putanje protiv poznatih logo/placeholder uzoraka
  for (const obrazac of OBRASCI_LOGO_PLACEHOLDER) {
    if (obrazac.test(imageUrl)) {
      rezultat.razlog = `putanja odgovara obrascu logo/placeholder (${obrazac})`;
      return rezultat;
    }
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    rezultat.razlog = 'nevaljan URL';
    return rezultat;
  }

  const klijent = parsedUrl.protocol === 'http:' ? http : https;

  return new Promise((resolve) => {
    const req = klijent.get(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GNK-ASG-ImageValidator/1.0)' },
      timeout: timeoutMs,
    }, (res) => {
      rezultat.httpStatus = res.statusCode;

      if (res.statusCode !== 200) {
        rezultat.razlog = `HTTP ${res.statusCode}`;
        res.resume();
        resolve(rezultat);
        return;
      }

      const contentType = res.headers['content-type'] || '';
      rezultat.contentType = contentType;

      if (!contentType.startsWith('image/')) {
        rezultat.razlog = `content-type nije slika (${contentType})`;
        res.resume();
        resolve(rezultat);
        return;
      }
      if (contentType.includes('svg')) {
        // SVG rijetko predstavlja stvarnu fotografiju vijesti — obično je logo/ikona
        rezultat.razlog = 'SVG format (obično logo/ikona, ne fotografija)';
        res.resume();
        resolve(rezultat);
        return;
      }

      // dohvati prve bajtove za osnovnu provjeru dimenzija (PNG/JPEG header)
      const chunks = [];
      let ukupnoBajtova = 0;
      res.on('data', (chunk) => {
        chunks.push(chunk);
        ukupnoBajtova += chunk.length;
        if (ukupnoBajtova > 65536) {
          res.destroy();
        }
      });
      res.on('end', () => zavrsi());
      res.on('close', () => zavrsi());

      let zavrseno = false;
      function zavrsi() {
        if (zavrseno) return;
        zavrseno = true;
        const buffer = Buffer.concat(chunks);
        const dims = citajDimenzije(buffer);
        if (dims) {
          rezultat.sirina = dims.sirina;
          rezultat.visina = dims.visina;
          if (dims.sirina < MIN_SIRINA || dims.visina < MIN_VISINA) {
            rezultat.razlog = `premale dimenzije (${dims.sirina}×${dims.visina}, minimum ${MIN_SIRINA}×${MIN_VISINA})`;
            resolve(rezultat);
            return;
          }
        }
        rezultat.ok = true;
        rezultat.razlog = 'prolazi sve provjere';
        resolve(rezultat);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      rezultat.razlog = 'timeout';
      resolve(rezultat);
    });
    req.on('error', (e) => {
      rezultat.razlog = `mrežna greška: ${e.message}`;
      resolve(rezultat);
    });
  });
}

/**
 * Čita širinu/visinu iz PNG ili JPEG headera (dovoljno za osnovnu provjeru
 * rezolucije bez potrebe za punim preuzimanjem slike).
 */
function citajDimenzije(buffer) {
  // PNG: potpis + IHDR na fiksnom mjestu
  if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    const sirina = buffer.readUInt32BE(16);
    const visina = buffer.readUInt32BE(20);
    return { sirina, visina };
  }
  // JPEG: traži SOF0/SOF2 marker
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 9) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        const visina = buffer.readUInt16BE(offset + 5);
        const sirina = buffer.readUInt16BE(offset + 7);
        return { sirina, visina };
      }
      const segmentLen = buffer.readUInt16BE(offset + 2);
      offset += 2 + segmentLen;
    }
  }
  // WEBP: VP8/VP8L/VP8X chunk
  if (buffer.length > 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const format = buffer.toString('ascii', 12, 16);
    if (format === 'VP8 ') {
      const sirina = buffer.readUInt16LE(26) & 0x3fff;
      const visina = buffer.readUInt16LE(28) & 0x3fff;
      return { sirina, visina };
    }
    if (format === 'VP8X') {
      const sirina = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
      const visina = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      return { sirina, visina };
    }
  }
  return null;
}

/**
 * Filtrira listu vijesti - zadržava samo one sa slikom koja prolazi validaciju.
 * Vraća { prihvacene: [...], odbijene: [{ vijest, razlog }] }
 */
export async function filtrirajVijestiPoSlici(vijesti, imageUrlKey = 'image') {
  const prihvacene = [];
  const odbijene = [];

  for (const vijest of vijesti) {
    const imgUrl = vijest[imageUrlKey];
    const provjera = await validirajSliku(imgUrl);
    if (provjera.ok) {
      prihvacene.push(vijest);
    } else {
      odbijene.push({ vijest, razlog: provjera.razlog });
    }
  }

  return { prihvacene, odbijene };
}
