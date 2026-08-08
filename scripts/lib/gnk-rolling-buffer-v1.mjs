// scripts/lib/gnk-rolling-buffer-v1.mjs
// P0.3 zadatak: vijesti se NE brišu zbog vremena — stare ostaju dok ih
// nove iste kategorije ne istisnu, do definiranog kapaciteta po kategoriji.
//
// VAŽNA NAPOMENA (dokumentirano prije implementacije, po pravilu iz zadatka):
// Kapaciteti u MASTER ASG dokumentu (Glavne 12, Hrvatska 10, Svijet 10,
// Financije 10, AI/Tehnologija 10, Sport 8, Zdravlje 8, Lifestyle 8, Djeca 8,
// Kućni ljubimci 8, Hrana 8) pretpostavljaju kategorije koje se NE poklapaju
// sa stvarnim RUBRIKA_RED iz apps/portal/gnk-aktual/index.html:
//   hrvatska, international, regije, cibona, technology, digital-assets,
//   ljubimci, kultura, zanimljivosti, auti, stil, turizam, glazba
//
// Konkretno nedostaju: Zdravlje, Djeca, Hrana (kao vijesti — Hrana postoji
// samo kao odvojen "Kuhinja" recept modul). "Sport" postoji samo kao
// Cibona-specifičan sadržaj, ne opći sport.
//
// Ovaj modul stoga koristi STVARNE kategorije sa sajta, s razumnim
// kapacitetom po analogiji (glavne/veće kategorije -> 10-12, manje
// niša kategorije -> 8), i JASNO označava koje od dokumentnih kategorija
// ostaju nepokrivene dok se ne donese odluka o njihovom izvoru sadržaja.

export const KAPACITETI_STVARNIH_KATEGORIJA = {
  hrvatska: 10,
  international: 10,
  regije: 10,
  technology: 10,      // pokriva i "AI/Tehnologija" iz dokumenta
  'digital-assets': 8,  // najbliže "Financije" iz dokumenta, ali nije potpuna zamjena
  cibona: 8,             // najbliže "Sport" iz dokumenta, ali usko - samo jedan klub
  ljubimci: 8,            // odgovara "Kućni ljubimci" iz dokumenta
  kultura: 8,
  zanimljivosti: 8,
  auti: 8,
  stil: 8,                // dijelom pokriva "Lifestyle"
  turizam: 8,
  glazba: 8,
};

// Kategorije iz dokumenta koje trenutno NEMAJU odgovarajući izvor sadržaja.
// Namjerno se NE dodaju prazne u kapacitet mapu - to bi stvorilo lažan
// dojam pokrivenosti. Odluka o njihovom izvoru ostaje na glavnoj razvojnoj liniji.
export const NEDOSTAJUCE_KATEGORIJE_IZ_DOKUMENTA = ['zdravlje', 'djeca', 'hrana (kao vijesti, ne recepti)'];

const GLAVNE_VIJESTI_KAPACITET = 12; // "Glavne vijesti" iz dokumenta - vrh stranice, presjek svih kategorija

/**
 * Primjenjuje rolling buffer pravilo na skup vijesti grupiranih po kategoriji.
 * Stare vijesti ostaju dok ih nove iste kategorije ne istisnu do kapaciteta.
 * Nikad se ne brišu isključivo zbog starosti.
 *
 * @param {Object} postojeceVijestiPoKategoriji - trenutno stanje { kategorija: [vijest, ...] }
 * @param {Array} noveVijesti - svježe dohvaćene vijesti iz RSS izvora, svaka s .group i .publishedAt
 * @returns {Object} azurirano stanje { kategorija: [vijest, ...] } postovano kapacitetima
 */
export function primijeniRollingBuffer(postojeceVijestiPoKategoriji, noveVijesti) {
  const rezultat = {};

  // grupiraj nove vijesti po kategoriji
  const novePoKategoriji = {};
  for (const vijest of noveVijesti) {
    const kat = vijest.group || 'ostalo';
    if (!novePoKategoriji[kat]) novePoKategoriji[kat] = [];
    novePoKategoriji[kat].push(vijest);
  }

  // za svaku poznatu kategoriju: spoji staro + novo, ukloni duplikate po URL-u,
  // sortiraj po datumu (najnovije prvo), obreži na kapacitet
  const sveKategorije = new Set([
    ...Object.keys(postojeceVijestiPoKategoriji || {}),
    ...Object.keys(novePoKategoriji),
  ]);

  for (const kat of sveKategorije) {
    const kapacitet = KAPACITETI_STVARNIH_KATEGORIJA[kat] || 8; // zadano 8 za neimenovane kategorije
    const staro = postojeceVijestiPoKategoriji?.[kat] || [];
    const novo = novePoKategoriji[kat] || [];

    const spojeno = [...novo, ...staro];
    const jedinstveno = spojeno.filter((v, i, arr) => arr.findIndex((x) => x.url === v.url) === i);
    jedinstveno.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    rezultat[kat] = jedinstveno.slice(0, kapacitet);
  }

  return rezultat;
}

/**
 * Gradi "Glavne vijesti" presjek - najnovije/najvažnije iz svih kategorija,
 * do definiranog kapaciteta, poštujući isto pravilo (stare ostaju dok se ne istisnu).
 */
export function izgradiGlavneVijesti(vijestiPoKategoriji, postojeceGlavne = []) {
  const sveVijesti = Object.values(vijestiPoKategoriji).flat();
  const spojeno = [...sveVijesti, ...postojeceGlavne];
  const jedinstveno = spojeno.filter((v, i, arr) => arr.findIndex((x) => x.url === v.url) === i);
  jedinstveno.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  return jedinstveno.slice(0, GLAVNE_VIJESTI_KAPACITET);
}
