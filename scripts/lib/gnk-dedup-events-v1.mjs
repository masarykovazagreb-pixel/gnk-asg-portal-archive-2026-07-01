// scripts/lib/gnk-dedup-events-v1.mjs
// P0.4 zadatak: kad isti događaj dolazi iz više izvora, prikazati samo
// najbolji — odabir prema kvaliteti slike, kvaliteti izvora, naslovu i
// opisu. Deduplikacija po SADRŽAJU događaja, ne po URL-u (URL bi već
// bio dovoljan za trivijalnu deduplikaciju identičnih linkova; ovdje
// je zadatak prepoznati RAZLIČITE URL-ove koji opisuju ISTI događaj).

// Težina medija — koristi postojeću logiku već prisutnu u gnk-aktual/index.html
// (WEIGHT tablica) kao referentnu kvalitetu izvora, tako da odluka o
// "najboljem" izvoru bude dosljedna s onim što stranica već koristi za
// redoslijed prikaza, ne novi, konkurentski sustav vrednovanja.
const TEZINA_IZVORA = {
  'Reuters Business': 6, 'AP Business': 6, 'BBC News': 6, 'BBC Business': 6,
  'BBC Technology': 6, 'The Guardian': 6, 'The Guardian Business': 6,
  'The Guardian Technology': 6, 'New York Times World': 6, 'New York Times Business': 6,
  'CNBC': 6, 'CNBC Markets': 6, 'Al Jazeera': 5, 'Al Jazeera Economy': 5,
  'CNN World': 5, 'France 24': 5, 'DW Business': 5,
};

const ZADANA_TEZINA = 3;

/**
 * Normalizira naslov za usporedbu sličnosti — mala slova, uklanja
 * interpunkciju, uklanja česte "šum" riječi koje ne nose značenje događaja.
 */
function normalizirajNaslov(naslov) {
  return String(naslov || '')
    .toLowerCase()
    .replace(/['"„"‚''`,.:;!?()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Računa jednostavnu Jaccard sličnost između dva skupa riječi —
 * dovoljno za grubu, ali pouzdanu detekciju "isti događaj, drugi izvor"
 * bez potrebe za vanjskim NLP servisom ili API pozivom.
 */
function jaccardSlicnost(naslovA, naslovB) {
  const rijeciA = new Set(normalizirajNaslov(naslovA).split(' ').filter((r) => r.length > 3));
  const rijeciB = new Set(normalizirajNaslov(naslovB).split(' ').filter((r) => r.length > 3));
  if (rijeciA.size === 0 || rijeciB.size === 0) return 0;
  const presjek = [...rijeciA].filter((r) => rijeciB.has(r)).length;
  const unija = new Set([...rijeciA, ...rijeciB]).size;
  return presjek / unija;
}

const PRAG_SLICNOSTI_DOGADJAJA = 0.5; // iznad ovoga smatramo da je isti dogadjaj

/**
 * Ocjenjuje kvalitetu pojedine vijesti za usporedbu unutar klastera
 * istog događaja. Viša ocjena = bolji kandidat za prikaz.
 */
function ocijeniVijest(vijest) {
  let ocjena = 0;
  ocjena += (TEZINA_IZVORA[vijest.source] || ZADANA_TEZINA) * 10;
  if (vijest.image && !/logo|favicon|placeholder/i.test(vijest.image)) ocjena += 15;
  if (vijest.description && vijest.description.length > 80) ocjena += 10;
  if (vijest.title && vijest.title.length > 20 && vijest.title.length < 140) ocjena += 5;
  return ocjena;
}

/**
 * Grupira vijesti u klastere "isti događaj" na temelju sličnosti naslova,
 * zatim iz svakog klastera zadržava samo najbolju vijest.
 *
 * @param {Array} vijesti - lista vijesti s .title, .source, .image, .description
 * @returns {Array} deduplicirana lista, jedna vijest po događaju
 */
export function deduplicirajPoDogadjaju(vijesti) {
  const klasteri = [];

  for (const vijest of vijesti) {
    let pronadjenKlaster = null;
    for (const klaster of klasteri) {
      const predstavnik = klaster[0];
      if (jaccardSlicnost(vijest.title, predstavnik.title) >= PRAG_SLICNOSTI_DOGADJAJA) {
        pronadjenKlaster = klaster;
        break;
      }
    }
    if (pronadjenKlaster) {
      pronadjenKlaster.push(vijest);
    } else {
      klasteri.push([vijest]);
    }
  }

  return klasteri.map((klaster) => {
    if (klaster.length === 1) return klaster[0];
    // odaberi najbolju vijest unutar klastera po ocjeni
    return klaster.reduce((najbolja, kandidat) =>
      ocijeniVijest(kandidat) > ocijeniVijest(najbolja) ? kandidat : najbolja
    );
  });
}
