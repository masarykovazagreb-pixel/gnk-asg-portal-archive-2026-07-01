#!/usr/bin/env node
/**
 * scripts/kolumne-publish-v1.mjs
 *
 * SVRHA: automatizira cijeli lanac za jednu kolumnu -
 *   1. uzima sljedeću kolumnu iz reda (apps/portal/data/kolumne-red/*.md)
 *   2. dohvaća sliku preko gnk-asg-image-proxy Workera (Pexels, sa serverske
 *      strane, ključ nikad u ovoj skripti ni u repozitoriju)
 *   3. upisuje zapis u apps/portal/data/kolumne.json (prikaz na AKTUAL-u)
 *   4. upisuje ISTI zapis u apps/portal/data/editorial-registry.json,
 *      u formatu koji blog-publish-v1.mjs već očekuje - taj se skript
 *      NE DIRA, kolumna se samo pojavi u njegovom redu za slanje
 *
 * NE PIŠE NIŠTA NA BLOG IZRAVNO. To radi postojeći blog-publish-v1.mjs,
 * sat vremena kasnije, kroz postojeći workflow. Ova skripta samo puni
 * dva registra na koje se ostatak sustava već oslanja.
 *
 * OPSEG: ova skripta se NE POKREĆE automatski. workflow koji je poziva
 * (kolumne-tjedni-ciklus.yml) ima aktivaciju iskljucivo na workflow_dispatch,
 * cron je zakomentiran. Ukljucivanje cron-a je odluka koja treba izricito
 * odobrenje, odvojeno od pripreme ovog koda.
 *
 * Pokretanje (rucno, dok se ne odobri automatizacija):
 *   node scripts/kolumne-publish-v1.mjs --slug indija-digitalna-infrastruktura
 *   node scripts/kolumne-publish-v1.mjs --slug indija-digitalna-infrastruktura --uzivo
 *
 * Bez --uzivo, skripta ispisuje sto bi napravila i nista ne mijenja
 * (isti "priprema vs live" obrazac kao blog-publish-v1.mjs).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PORTAL = resolve('apps/portal');
const RED_MAPA = resolve(PORTAL, 'data/kolumne-red');           // ulazne .md datoteke, jedna po kolumni
const KOLUMNE = resolve(PORTAL, 'data/kolumne.json');           // prikaz na AKTUAL-u
const REGISTRY = resolve(PORTAL, 'data/editorial-registry.json'); // dijeli ga blog-publish-v1.mjs
const SITE = 'https://gnk-asg.hr';

// Adresa Workera - NE poziva se Pexels izravno odavde. Worker mora biti
// deployan i secret postavljen prije nego ovo ima smisla pokretati s --uzivo.
const WORKER_SLIKE = process.env.WORKER_SLIKE_URL || 'https://gnk-asg.hr/api/slike';

const LIVE = process.argv.includes('--uzivo');
const argSlug = (() => {
  const i = process.argv.indexOf('--slug');
  return i > -1 ? process.argv[i + 1] : null;
})();

const readJson = (p, fallback) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; }
};
const writeJson = (p, data) => writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');

/** Parsira jednu .md datoteku iz reda kolumni. Očekivani oblik na vrhu datoteke:
 *  ---
 *  slug: indija-digitalna-infrastruktura
 *  naslov: ...
 *  seo_naslov: ...
 *  meta_opis: ...
 *  kljucne_rijeci: a, b, c
 *  hashtagovi: TagJedan, TagDva
 *  slika_upit: mobile payment street market
 *  ---
 *  (tekst kolumne ispod crte)
 */
function parsirajKolumnu(putanja) {
  const sirovo = readFileSync(putanja, 'utf8');
  const dijelovi = sirovo.split(/^---\s*$/m);
  if (dijelovi.length < 3) throw new Error(`${putanja}: nedostaje --- zaglavlje`);
  const zaglavlje = {};
  dijelovi[1].trim().split('\n').forEach(redak => {
    const i = redak.indexOf(':');
    if (i === -1) return;
    zaglavlje[redak.slice(0, i).trim()] = redak.slice(i + 1).trim();
  });
  const tekst = dijelovi.slice(2).join('---').trim();
  return { ...zaglavlje, tekst };
}

async function dohvatiSliku(upit) {
  try {
    const r = await fetch(WORKER_SLIKE + '?upit=' + encodeURIComponent(upit));
    if (!r.ok) return null;
    const d = await r.json();
    return d.rezultati?.[0] || null;   // prvi rezultat; rucni odabir ostaje moguc uredivanjem .md prije pokretanja
  } catch { return null; }
}

async function glavna() {
  if (!existsSync(RED_MAPA)) {
    console.log(`Nema mape ${RED_MAPA} - jos nema pripremljenih kolumni u redu.`);
    return;
  }
  const datoteke = readdirSync(RED_MAPA).filter(f => f.endsWith('.md'));
  const odabrana = argSlug
    ? datoteke.find(f => f.includes(argSlug))
    : datoteke.sort()[0];   // bez --slug, uzima abecedno prvu - red se poštuje imenom datoteke

  if (!odabrana) { console.log('Nema kolumne za obradu.'); return; }

  const k = parsirajKolumnu(resolve(RED_MAPA, odabrana));
  console.log(`Obrađujem: ${k.slug} — ${k.naslov}`);

  const slika = await dohvatiSliku(k.slika_upit || k.naslov);
  if (!slika) {
    console.log('  upozorenje: slika nije dohvaćena (Worker možda nije deployan ili nema rezultata)');
  } else {
    console.log(`  slika: ${slika.url}  (${slika.autor}, ${slika.licenca})`);
  }

  const putanja = `/gnk-aktual/kolumne/${k.slug}/`;
  const sada = new Date().toISOString();

  const zapisKolumne = {
    slug: k.slug,
    naslov: k.naslov,
    seo_naslov: k.seo_naslov,
    meta_opis: k.meta_opis,
    tekst: k.tekst,
    slika: slika?.url || null,
    slika_autor: slika?.autor || null,
    slika_licenca: slika?.licenca || null,
    slika_izvor: slika?.izvor_poveznica || null,
    objavljeno: sada,
    path: putanja,
    url: SITE + putanja,
  };

  const zapisRegistra = {
    slug: k.slug,
    type: 'kolumna',
    collection: 'Kolumne',
    path: putanja,
    url: SITE + putanja,
    title: k.seo_naslov || k.naslov,
    description: k.meta_opis,
    keywords: (k.kljucne_rijeci || '').split(',').map(s => s.trim()).filter(Boolean),
    hashtags: (k.hashtagovi || '').split(',').map(s => s.trim()).filter(Boolean),
    image: slika?.url || null,
    publishedAt: sada,
    inPlan: true,
    seoComplete: Boolean(k.seo_naslov && k.meta_opis),
  };

  if (!LIVE) {
    console.log('\nPRIPREMA (bez --uzivo, nista nije upisano):');
    console.log(JSON.stringify({ zapisKolumne, zapisRegistra }, null, 2));
    return;
  }

  const kolumneDoc = readJson(KOLUMNE, { items: [] });
  kolumneDoc.items = kolumneDoc.items || [];
  kolumneDoc.items.unshift(zapisKolumne);   // najnovija na vrh
  writeJson(KOLUMNE, kolumneDoc);

  const registryDoc = readJson(REGISTRY, { items: [], byType: {} });
  registryDoc.items = registryDoc.items || [];
  registryDoc.items.push(zapisRegistra);
  registryDoc.total = registryDoc.items.length;
  registryDoc.byType = registryDoc.byType || {};
  registryDoc.byType.kolumna = (registryDoc.byType.kolumna || 0) + 1;
  writeJson(REGISTRY, registryDoc);

  console.log(`\nUpisano u ${KOLUMNE} i ${REGISTRY}.`);
  console.log('Blog objava ide sama, na sljedecem satnom pokretanju blog-mirror-publish.yml.');
}

glavna();
