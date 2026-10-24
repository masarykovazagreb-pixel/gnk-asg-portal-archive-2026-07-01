/**
 * PROIZVODI MREŽE — jedan popis, na svakom webu.
 *
 * Uzvratnost je do 24. 10. 2026. bila nepotpuna na jednom mjestu: KANAL
 * (gnk-asg-kanal.pages.dev) nije bio povezan ni s jednog weba, a sam nije
 * vodio ni na jedno izdanje. Arhiva i dnevnik bili su u istoj situaciji.
 * Čitatelj koji je došao na KANAL nije imao kamo dalje.
 *
 * Ovaj modul drži jedini popis proizvoda koji nisu izdanja: dnevni pregled,
 * tjednik, arhiva, dnevnik, radio i podatkovni desk. Svaki generator uvozi
 * isti popis, pa se veza ne može izgubiti u jednoj kopiji predloška.
 */
export const NETWORK_PRODUCTS = [
  {
    id: 'kanal-web',
    url: 'https://gnk-asg-kanal.pages.dev/',
    hr: 'KANAL — dnevni pregled',
    en: 'KANAL — daily brief'
  },
  {
    id: 'tjednik',
    url: 'https://gnk-asg-tjednik.pages.dev/',
    hr: 'BUSINESS TJEDNIK',
    en: 'BUSINESS WEEKLY'
  },
  {
    id: 'arhiva',
    url: 'https://gnk-asg-arhiva.pages.dev/',
    hr: 'AKTUAL ARHIVA',
    en: 'AKTUAL ARCHIVE'
  },
  {
    id: 'dnevnik',
    url: 'https://gnk-asg-dnevnik.pages.dev/',
    hr: 'AKTUAL DNEVNIK',
    en: 'AKTUAL JOURNAL'
  },
  {
    id: 'radio',
    url: 'https://gnk-asg.hr/radio/',
    hr: 'Radio uživo',
    en: 'Live radio'
  },
  {
    id: 'desk',
    url: 'https://gnk-asg.hr/aktual-media/',
    hr: 'Podatkovni desk',
    en: 'Data desk'
  }
];

/** HTML popis veza na sve proizvode, na jeziku stranice. */
export const productsLinks = (lang = 'hr', { className = '', rel = 'external noopener' } = {}) => NETWORK_PRODUCTS
  .map((product) => `<a href="${product.url}" rel="${rel}"${className ? ` class="${className}"` : ''}>${product[lang === 'en' ? 'en' : 'hr']}</a>`)
  .join('');
