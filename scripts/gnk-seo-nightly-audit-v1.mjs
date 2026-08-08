#!/usr/bin/env node
// scripts/gnk-seo-nightly-audit-v1.mjs
// Noćna SEO/meta/indexiranje provjera cijelog portala.
// Ne "diže rangiranje" magično - provjerava stvarne, poznate SEO faktore
// koje Google i drugi tražilice koriste, i prijavljuje konkretne probleme.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'apps/portal';
const REZULTAT = {
  generatedAt: new Date().toISOString(),
  ukupnoStranica: 0,
  problemi: {
    kratkiMetaOpis: [],      // < 70 znakova
    dugackiMetaOpis: [],     // > 165 znakova
    nedostajeMetaOpis: [],
    nedostajeH1: [],
    visestrukiH1: [],
    nedostajeCanonical: [],
    nedostajeOgImage: [],
    slikeBezAltTeksta: [],
    nedostajeJsonLd: [],
    kratakSadrzaj: [],       // < 250 rijeci za komentare/objave/analize
    slikeBezDimenzija: [],   // slike bez width/height (Core Web Vitals + brze indeksiranje)
  },
  preporuke: [],
};

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

function provjeriStranicu(putanja) {
  const html = fs.readFileSync(putanja, 'utf8');

  // Preskoci namjerno noindex stranice (admin alati, interni redirekti) -
  // one ne trebaju meta opis/H1 jer nikad ne bi trebale biti indeksirane.
  if (/noindex/i.test(html)) return;
  // Preskoci meta-refresh redirekt stranice (nemaju stvaran sadrzaj za provjeriti).
  if (/http-equiv="refresh"/i.test(html)) return;

  REZULTAT.ukupnoStranica++;

  const metaOpisMatch = html.match(/<meta name="description" content="([^"]*)"/);
  if (!metaOpisMatch) {
    REZULTAT.problemi.nedostajeMetaOpis.push(putanja);
  } else {
    const duljina = metaOpisMatch[1].length;
    if (duljina < 70) REZULTAT.problemi.kratkiMetaOpis.push({ putanja, duljina });
    if (duljina > 165) REZULTAT.problemi.dugackiMetaOpis.push({ putanja, duljina });
  }

  const h1Broj = (html.match(/<h1\b/g) || []).length;
  if (h1Broj === 0) REZULTAT.problemi.nedostajeH1.push(putanja);
  if (h1Broj > 1) REZULTAT.problemi.visestrukiH1.push({ putanja, broj: h1Broj });

  if (!html.includes('rel="canonical"')) {
    REZULTAT.problemi.nedostajeCanonical.push(putanja);
  }

  if (!html.includes('property="og:image"')) {
    REZULTAT.problemi.nedostajeOgImage.push(putanja);
  }

  const slike = [...html.matchAll(/<img\b[^>]*>/g)];
  const slikeBezAlt = slike.filter((s) => !/alt="[^"]+"/.test(s[0]));
  if (slikeBezAlt.length > 0) {
    REZULTAT.problemi.slikeBezAltTeksta.push({ putanja, broj: slikeBezAlt.length });
  }

  const slikeBezDimenzija = slike.filter((s) => !/width="[0-9]+"/.test(s[0]) || !/height="[0-9]+"/.test(s[0]));
  if (slikeBezDimenzija.length > 0) {
    REZULTAT.problemi.slikeBezDimenzija.push({ putanja, broj: slikeBezDimenzija.length });
  }

  if (!html.includes('application/ld+json')) {
    REZULTAT.problemi.nedostajeJsonLd.push(putanja);
  }

  // sadržajna dubina samo za editorial putanje
  const jePopisnaStranica = /\/(objave|komentari|analize|publications|commentary|analyses)\/index\.html$/.test(putanja);
  if (!jePopisnaStranica && /\/(objave|komentari|analize|publications|commentary|analyses)\//.test(putanja)) {
    const clanakMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/);
    if (clanakMatch) {
      const tekst = clanakMatch[1].replace(/<[^>]+>/g, ' ');
      const rijeci = tekst.split(/\s+/).filter(Boolean).length;
      if (rijeci < 250) {
        REZULTAT.problemi.kratakSadrzaj.push({ putanja, rijeci });
      }
    }
  }
}

console.log('Pokrećem noćni SEO audit...');
const fajlovi = sviHtmlFajlovi(ROOT);
for (const f of fajlovi) {
  try {
    provjeriStranicu(f);
  } catch (e) {
    console.error('Greška pri provjeri', f, e.message);
  }
}

// generiraj preporuke na temelju nalaza
if (REZULTAT.problemi.nedostajeMetaOpis.length > 0) {
  REZULTAT.preporuke.push(`${REZULTAT.problemi.nedostajeMetaOpis.length} stranica nema meta opis — visoki prioritet, izravno utječe na CTR u rezultatima pretrage.`);
}
if (REZULTAT.problemi.nedostajeH1.length > 0) {
  REZULTAT.preporuke.push(`${REZULTAT.problemi.nedostajeH1.length} stranica nema H1 naslov — Google gubi glavni signal o temi stranice.`);
}
if (REZULTAT.problemi.kratakSadrzaj.length > 0) {
  REZULTAT.preporuke.push(`${REZULTAT.problemi.kratakSadrzaj.length} editorial stranica ima manje od 250 riječi — kandidati za daljnje proširivanje.`);
}
if (REZULTAT.problemi.slikeBezAltTeksta.length > 0) {
  REZULTAT.preporuke.push(`${REZULTAT.problemi.slikeBezAltTeksta.length} stranica ima slike bez alt teksta — utječe na pristupačnost i Google Images indeksiranje.`);
}
if (REZULTAT.problemi.slikeBezDimenzija.length > 0) {
  REZULTAT.preporuke.push(`${REZULTAT.problemi.slikeBezDimenzija.length} stranica ima slike bez eksplicitnih width/height atributa — usporava Core Web Vitals (CLS) i indirektno indeksiranje.`);
}

fs.mkdirSync('apps/portal/data/seo-audit', { recursive: true });
fs.writeFileSync(
  'apps/portal/data/seo-audit/nightly-report.json',
  JSON.stringify(REZULTAT, null, 2),
  'utf8'
);

console.log('Audit dovršen.');
console.log('Ukupno stranica:', REZULTAT.ukupnoStranica);
console.log('Preporuke:');
for (const p of REZULTAT.preporuke) console.log(' -', p);

// izlazni kod 0 uvijek - ovo je izvještajni alat, ne gate koji ruši build
process.exit(0);
