#!/usr/bin/env node
// scripts/gnk-digital-workforce-audit-v1.mjs
// P1 zadatak: audit svih profila iz javne ilustrativne simulacije
// digitalne radne snage (1.573 sintetičkih workera). NE popravlja
// automatski — samo izrađuje CSV, JSON i QA report s listom anomalija,
// kako zadatak izričito traži ("Ne popravljati sve automatski. Prvo
// napraviti kvalitetan audit.").

import https from 'node:https';
import fs from 'node:fs';

const BASE = 'https://gnk-asg.hr/api/public/digital-workforce/';

function dohvatiJson(putanja) {
  return new Promise((resolve, reject) => {
    https.get(BASE + putanja, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GNK-ASG-DW-Audit/1.0)', accept: 'application/json' },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`${putanja}: HTTP ${res.statusCode}`));
          return;
        }
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject).on('timeout', function () { this.destroy(); reject(new Error('timeout')); });
  });
}

async function dohvatiSveWorkere() {
  // probaj dohvatiti sve odjednom bez filtera; ako API pagira, prilagodi
  const prvi = await dohvatiJson('workers');
  const ukupno = Number(prvi.total) || prvi.items?.length || 0;
  console.log(`API prijavljuje total: ${ukupno}, prva stranica vraća: ${prvi.items?.length || 0} stavki`);

  if (prvi.items && prvi.items.length >= ukupno) {
    return prvi.items;
  }

  // ako je paginirano, probaj dohvatiti sve preko praznog upita s velikim limitom
  // (API dizajn nepoznat unaprijed - probamo uobičajene parametre)
  console.log('Pokušavam dohvatiti sve stavke...');
  try {
    const sviPokusaj = await dohvatiJson('workers?limit=2000');
    if (sviPokusaj.items && sviPokusaj.items.length > prvi.items.length) {
      return sviPokusaj.items;
    }
  } catch { /* ignoriraj, koristi ono sto imamo */ }

  return prvi.items || [];
}

async function main() {
  console.log('Dohvaćam projekte (za unakrsnu provjeru projectId reference)...');
  const projekti = await dohvatiJson('projects');
  const projectIds = new Set((projekti.items || []).map((p) => String(p.id)));
  console.log(`Projekata: ${projekti.items?.length || 0}`);

  console.log('Dohvaćam sve workere...');
  const workeri = await dohvatiSveWorkere();
  console.log(`Dohvaćeno workera: ${workeri.length}`);

  const anomalije = [];
  const vidjeniId = new Map();
  const vidjeniNaziv = new Map();

  for (const w of workeri) {
    // 1. duplikati po ID-u
    if (w.id != null) {
      if (vidjeniId.has(w.id)) {
        anomalije.push({ tip: 'duplikat_id', worker: w.id, detalj: `ID ${w.id} već zauzet od strane ${JSON.stringify(vidjeniId.get(w.id))}` });
      } else {
        vidjeniId.set(w.id, w.name);
      }
    } else {
      anomalije.push({ tip: 'nedostaje_id', worker: w.name || '(nepoznato)', detalj: 'worker nema id polje' });
    }

    // 2. duplikati po imenu (mogući isti profil dvaput s razlicitim ID-om)
    if (w.name) {
      const kljuc = String(w.name).toLowerCase().trim();
      if (vidjeniNaziv.has(kljuc)) {
        anomalije.push({ tip: 'moguci_duplikat_imena', worker: w.id, detalj: `ime "${w.name}" već postoji kod ID ${vidjeniNaziv.get(kljuc)}` });
      } else {
        vidjeniNaziv.set(kljuc, w.id);
      }
    }

    // 3. nedostajuci podaci - kljucna polja
    for (const polje of ['name', 'function', 'status']) {
      if (w[polje] == null || w[polje] === '') {
        anomalije.push({ tip: 'nedostaje_podatak', worker: w.id || w.name, detalj: `polje "${polje}" prazno ili nedostaje` });
      }
    }

    // 4. projectId referenca na nepostojeci projekt (nepostojeci profil/ruta)
    if (w.projectId != null && !projectIds.has(String(w.projectId))) {
      anomalije.push({ tip: 'neispravna_referenca', worker: w.id, detalj: `projectId "${w.projectId}" ne postoji medju ${projectIds.size} poznatih projekata` });
    }

    // 5. konzistentnost statusa - provjeri je li status iz ocekivanog skupa
    const poznatStatusi = ['active', 'idle', 'done', 'blocked', 'paused', 'archived'];
    if (w.status && !poznatStatusi.includes(String(w.status).toLowerCase())) {
      anomalije.push({ tip: 'neocekivan_status', worker: w.id, detalj: `status "${w.status}" nije medju ocekivanim vrijednostima (${poznatStatusi.join(', ')})` });
    }

    // 6. location / telemetry - dokumentiraj postoje li uopce ta polja
    if (!('location' in w)) {
      // biljezimo samo jednom kroz sazetak, ne po svakom workeru (vidi ispod)
    }
  }

  const imaLocationPolje = workeri.length > 0 && workeri.some((w) => 'location' in w);
  const imaTelemetryPolje = workeri.length > 0 && workeri.some((w) => 'telemetry' in w);

  const izvjestaj = {
    generatedAt: new Date().toISOString(),
    ukupnoWorkera: workeri.length,
    ocekivanoPrijaviteljem: 1573,
    brojProjekata: projekti.items?.length || 0,
    imaLocationPolje,
    imaTelemetryPolje,
    ukupnoAnomalija: anomalije.length,
    anomalijePoTipu: anomalije.reduce((acc, a) => { acc[a.tip] = (acc[a.tip] || 0) + 1; return acc; }, {}),
    anomalije,
  };

  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/digital-workforce-audit.json', JSON.stringify(izvjestaj, null, 2));

  // CSV izvoz svih workera (za rucni pregled)
  if (workeri.length > 0) {
    const kljucevi = [...new Set(workeri.flatMap((w) => Object.keys(w)))];
    const csvRedovi = [kljucevi.join(',')];
    for (const w of workeri) {
      csvRedovi.push(kljucevi.map((k) => JSON.stringify(w[k] ?? '')).join(','));
    }
    fs.writeFileSync('artifacts/digital-workforce-workers.csv', csvRedovi.join('\n'));
  }

  console.log('\n=== SAŽETAK ===');
  console.log(`Ukupno workera dohvaćeno: ${workeri.length} (očekivano prema stranici: 1.573)`);
  console.log(`Ukupno anomalija: ${anomalije.length}`);
  console.log('Po tipu:', JSON.stringify(izvjestaj.anomalijePoTipu, null, 2));
  console.log(`\nlocation polje prisutno: ${imaLocationPolje}`);
  console.log(`telemetry polje prisutno: ${imaTelemetryPolje}`);
  console.log('\nIzvještaji spremljeni u artifacts/digital-workforce-audit.json i artifacts/digital-workforce-workers.csv');
}

main().catch((e) => { console.error('GREŠKA:', e.message); process.exit(1); });
