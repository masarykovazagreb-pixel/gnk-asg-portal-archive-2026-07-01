/**
 * PLAN ŠIRENJA MREŽE — sve zemlje, jedna prijestolnica po izdanju.
 *
 * Ovo je jedini popis budućih izdanja. Iz njega se računa pokrivenost,
 * ispisuje što sljedeći grad treba prije nego dobije adresu i provjerava da
 * nijedno izdanje ne postoji izvan plana.
 *
 * Pravila (ista kao kod prvih sedamnaest):
 *  - jedno izdanje = jedan grad, u pravilu prijestolnica te zemlje;
 *  - jezik izdanja je jezik zemlje, engleski samo kao drugi jezik;
 *  - izdanje ne nastaje dok nema (a) provjerene izvore s RSS adresama,
 *    (b) scenu grada u assets/, (c) nazive sučelja na jeziku zemlje i
 *    (d) barem jedan stvarni zapis u arhivi. Prazna stranica se ne objavljuje;
 *  - podaci u planu su činjenice (glavni grad, država, jezik, vremenska
 *    zona), ne procjene. Gdje država ima više glavnih gradova ili je
 *    središte medija drugdje, to piše u `note`.
 *
 * Redoslijed valova nije marketinški: prvo jezici koje sustav već prevodi
 * (hr, sr, bs, hu, sl, it, bg, ro, en, id, pt, ar, ja, zh), zatim novi.
 */

export const PLAN_VERSION = 'WORLD_EXPANSION_V1_20261023';

/** Izdanja koja su već javna — moraju se poklapati s channels.json. */
export const LIVE_IDS = [
  'zagreb', 'beograd', 'sarajevo', 'budimpesta', 'ljubljana', 'rim', 'sofija', 'bukurest',
  'nairobi', 'jakarta', 'newyork', 'saopaulo', 'sydney', 'singapur', 'kairo', 'tokio', 'peking'
];

const city = (id, name, nameEn, country, countryEn, cc, lang, tz, continent, extra = {}) => ({
  id, city: name, cityEn: nameEn, country, countryEn, countryCode: cc,
  lang, timezone: tz, continent, ...extra
});

export const WAVES = [
  {
    id: 'wave-1',
    name: 'Prvi val — regija i prve svjetske prijestolnice',
    status: 'live',
    note: 'Sedamnaest izdanja na četiri kontinenta. Ovo je osnova prema kojoj se mjeri svaki sljedeći val.',
    cities: []
  },
  {
    id: 'wave-2',
    name: 'Drugi val — Europa bez naše regije',
    status: 'planned',
    note: 'Jezici koje sustav još ne prevodi (de, fr, es, nl, sv, pl, cs, el, da, no, fi, et, lv, lt, sk, is, lb, mt, uk, tr). Za svaki treba prijevod sučelja i izvori.',
    cities: [
      city('berlin', 'Berlin', 'Berlin', 'Njemačka', 'Germany', 'DE', 'de', 'Europe/Berlin', 'Europa'),
      city('paris', 'Pariz', 'Paris', 'Francuska', 'France', 'FR', 'fr', 'Europe/Paris', 'Europa'),
      city('madrid', 'Madrid', 'Madrid', 'Španjolska', 'Spain', 'ES', 'es', 'Europe/Madrid', 'Europa'),
      city('amsterdam', 'Amsterdam', 'Amsterdam', 'Nizozemska', 'Netherlands', 'NL', 'nl', 'Europe/Amsterdam', 'Europa', { note: 'Glavni grad je Amsterdam; vlada i parlament zasjedaju u Haagu.' }),
      city('bruxelles', 'Bruxelles', 'Brussels', 'Belgija', 'Belgium', 'BE', 'fr', 'Europe/Brussels', 'Europa', { note: 'Dvojezični grad; izdanje ide na francuskom, nizozemska inačica je drugi jezik.' }),
      city('bern', 'Bern', 'Bern', 'Švicarska', 'Switzerland', 'CH', 'de', 'Europe/Zurich', 'Europa', { note: 'Savezni grad (glavni grad) je Bern, ne Zürich.' }),
      city('wien', 'Beč', 'Vienna', 'Austrija', 'Austria', 'AT', 'de', 'Europe/Vienna', 'Europa'),
      city('stockholm', 'Stockholm', 'Stockholm', 'Švedska', 'Sweden', 'SE', 'sv', 'Europe/Stockholm', 'Europa'),
      city('oslo', 'Oslo', 'Oslo', 'Norveška', 'Norway', 'NO', 'no', 'Europe/Oslo', 'Europa'),
      city('kjbenhavn', 'Kopenhagen', 'Copenhagen', 'Danska', 'Denmark', 'DK', 'da', 'Europe/Copenhagen', 'Europa'),
      city('helsinki', 'Helsinki', 'Helsinki', 'Finska', 'Finland', 'FI', 'fi', 'Europe/Helsinki', 'Europa'),
      city('reykjavik', 'Reykjavík', 'Reykjavík', 'Island', 'Iceland', 'IS', 'is', 'Atlantic/Reykjavik', 'Europa'),
      city('dublin', 'Dublin', 'Dublin', 'Irska', 'Ireland', 'IE', 'en', 'Europe/Dublin', 'Europa', { note: 'Irska ima i irski jezik (ga); izdanje ide na engleskom, irski je drugi jezik.' }),
      city('lisboa', 'Lisabon', 'Lisbon', 'Portugal', 'Portugal', 'PT', 'pt', 'Europe/Lisbon', 'Europa'),
      city('warszawa', 'Varšava', 'Warsaw', 'Poljska', 'Poland', 'PL', 'pl', 'Europe/Warsaw', 'Europa'),
      city('praha', 'Prag', 'Prague', 'Češka', 'Czechia', 'CZ', 'cs', 'Europe/Prague', 'Europa'),
      city('bratislava', 'Bratislava', 'Bratislava', 'Slovačka', 'Slovakia', 'SK', 'sk', 'Europe/Bratislava', 'Europa'),
      city('tallinn', 'Tallinn', 'Tallinn', 'Estonija', 'Estonia', 'EE', 'et', 'Europe/Tallinn', 'Europa'),
      city('riga', 'Riga', 'Riga', 'Latvija', 'Latvia', 'LV', 'lv', 'Europe/Riga', 'Europa'),
      city('vilnius', 'Vilnius', 'Vilnius', 'Litva', 'Lithuania', 'LT', 'lt', 'Europe/Vilnius', 'Europa'),
      city('athina', 'Atena', 'Athens', 'Grčka', 'Greece', 'GR', 'el', 'Europe/Athens', 'Europa'),
      city('valletta', 'Valletta', 'Valletta', 'Malta', 'Malta', 'MT', 'mt', 'Europe/Malta', 'Europa', { note: 'Malta ima i engleski kao službeni jezik.' }),
      city('luxembourg', 'Luxembourg', 'Luxembourg', 'Luksemburg', 'Luxembourg', 'LU', 'fr', 'Europe/Luxembourg', 'Europa'),
      city('nikozija', 'Nikozija', 'Nicosia', 'Cipar', 'Cyprus', 'CY', 'el', 'Asia/Nicosia', 'Europa'),
      city('kyiv', 'Kijev', 'Kyiv', 'Ukrajina', 'Ukraine', 'UA', 'uk', 'Europe/Kyiv', 'Europa'),
      city('chisinau', 'Kišinjev', 'Chișinău', 'Moldavija', 'Moldova', 'MD', 'ro', 'Europe/Chisinau', 'Europa'),
      city('ankara', 'Ankara', 'Ankara', 'Turska', 'Türkiye', 'TR', 'tr', 'Europe/Istanbul', 'Europa', { note: 'Ankara je glavni grad; Istanbul ostaje medijsko središte i pokriva se iz Ankare.' })
    ]
  },
  {
    id: 'wave-3',
    name: 'Treći val — Amerike',
    status: 'planned',
    note: 'Španjolski i portugalski već postoje u mreži, pa je ovaj val najbrži: ista sučelja, novi gradovi.',
    cities: [
      city('washington', 'Washington', 'Washington, D.C.', 'Sjedinjene Američke Države', 'United States', 'US', 'en', 'America/New_York', 'Sjeverna Amerika'),
      city('ottawa', 'Ottawa', 'Ottawa', 'Kanada', 'Canada', 'CA', 'en', 'America/Toronto', 'Sjeverna Amerika', { note: 'Kanada ima i francuski kao službeni jezik.' }),
      city('ciudad-de-mexico', 'Ciudad de México', 'Mexico City', 'Meksiko', 'Mexico', 'MX', 'es', 'America/Mexico_City', 'Sjeverna Amerika'),
      city('guatemala', 'Ciudad de Guatemala', 'Guatemala City', 'Gvatemala', 'Guatemala', 'GT', 'es', 'America/Guatemala', 'Sjeverna Amerika'),
      city('san-jose', 'San José', 'San José', 'Kostarika', 'Costa Rica', 'CR', 'es', 'America/Costa_Rica', 'Sjeverna Amerika'),
      city('panama', 'Ciudad de Panamá', 'Panama City', 'Panama', 'Panama', 'PA', 'es', 'America/Panama', 'Sjeverna Amerika'),
      city('santo-domingo', 'Santo Domingo', 'Santo Domingo', 'Dominikanska Republika', 'Dominican Republic', 'DO', 'es', 'America/Santo_Domingo', 'Sjeverna Amerika'),
      city('la-habana', 'La Habana', 'Havana', 'Kuba', 'Cuba', 'CU', 'es', 'America/Havana', 'Sjeverna Amerika'),
      city('kingston', 'Kingston', 'Kingston', 'Jamajka', 'Jamaica', 'JM', 'en', 'America/Jamaica', 'Sjeverna Amerika'),
      city('brasilia', 'Brasília', 'Brasília', 'Brazil', 'Brazil', 'BR', 'pt', 'America/Sao_Paulo', 'Južna Amerika'),
      city('buenos-aires', 'Buenos Aires', 'Buenos Aires', 'Argentina', 'Argentina', 'AR', 'es', 'America/Argentina/Buenos_Aires', 'Južna Amerika'),
      city('santiago', 'Santiago', 'Santiago', 'Čile', 'Chile', 'CL', 'es', 'America/Santiago', 'Južna Amerika'),
      city('lima', 'Lima', 'Lima', 'Peru', 'Peru', 'PE', 'es', 'America/Lima', 'Južna Amerika'),
      city('bogota', 'Bogotá', 'Bogotá', 'Kolumbija', 'Colombia', 'CO', 'es', 'America/Bogota', 'Južna Amerika'),
      city('caracas', 'Caracas', 'Caracas', 'Venezuela', 'Venezuela', 'VE', 'es', 'America/Caracas', 'Južna Amerika'),
      city('quito', 'Quito', 'Quito', 'Ekvador', 'Ecuador', 'EC', 'es', 'America/Guayaquil', 'Južna Amerika'),
      city('la-paz', 'La Paz', 'La Paz', 'Bolivija', 'Bolivia', 'BO', 'es', 'America/La_Paz', 'Južna Amerika', { note: 'Ustavni glavni grad je Sucre; sjedište vlade je La Paz.' }),
      city('asuncion', 'Asunción', 'Asunción', 'Paragvaj', 'Paraguay', 'PY', 'es', 'America/Asuncion', 'Južna Amerika'),
      city('montevideo', 'Montevideo', 'Montevideo', 'Urugvaj', 'Uruguay', 'UY', 'es', 'America/Montevideo', 'Južna Amerika')
    ]
  },
  {
    id: 'wave-4',
    name: 'Četvrti val — Afrika',
    status: 'planned',
    note: 'Nairobi i Kairo su prvi; ovaj val pokriva zapadnu, južnu i sjevernu Afriku. Engleski, francuski, portugalski i arapski već postoje.',
    cities: [
      city('abuja', 'Abuja', 'Abuja', 'Nigerija', 'Nigeria', 'NG', 'en', 'Africa/Lagos', 'Afrika'),
      city('accra', 'Accra', 'Accra', 'Gana', 'Ghana', 'GH', 'en', 'Africa/Accra', 'Afrika'),
      city('pretoria', 'Pretoria', 'Pretoria', 'Južnoafrička Republika', 'South Africa', 'ZA', 'en', 'Africa/Johannesburg', 'Afrika', { note: 'Južna Afrika ima tri glavna grada: Pretorija (uprava), Cape Town (parlament), Bloemfontein (sudstvo).' }),
      city('dakar', 'Dakar', 'Dakar', 'Senegal', 'Senegal', 'SN', 'fr', 'Africa/Dakar', 'Afrika'),
      city('yamoussoukro', 'Yamoussoukro', 'Yamoussoukro', 'Obala Bjelokosti', 'Côte d’Ivoire', 'CI', 'fr', 'Africa/Abidjan', 'Afrika', { note: 'Glavni grad je Yamoussoukro; Abidjan ostaje gospodarsko i medijsko središte.' }),
      city('rabat', 'Rabat', 'Rabat', 'Maroko', 'Morocco', 'MA', 'ar', 'Africa/Casablanca', 'Afrika', { note: 'Glavni grad je Rabat; Casablanca je najveće medijsko središte.' }),
      city('tunis', 'Tunis', 'Tunis', 'Tunis', 'Tunisia', 'TN', 'ar', 'Africa/Tunis', 'Afrika'),
      city('alger', 'Alžir', 'Algiers', 'Alžir', 'Algeria', 'DZ', 'ar', 'Africa/Algiers', 'Afrika'),
      city('addis-abeba', 'Addis Abeba', 'Addis Ababa', 'Etiopija', 'Ethiopia', 'ET', 'am', 'Africa/Addis_Ababa', 'Afrika'),
      city('dodoma', 'Dodoma', 'Dodoma', 'Tanzanija', 'Tanzania', 'TZ', 'sw', 'Africa/Dar_es_Salaam', 'Afrika', { note: 'Glavni grad je Dodoma; Dar es Salaam ostaje gospodarsko središte.' }),
      city('kampala', 'Kampala', 'Kampala', 'Uganda', 'Uganda', 'UG', 'en', 'Africa/Kampala', 'Afrika'),
      city('kigali', 'Kigali', 'Kigali', 'Ruanda', 'Rwanda', 'RW', 'rw', 'Africa/Kigali', 'Afrika'),
      city('lusaka', 'Lusaka', 'Lusaka', 'Zambija', 'Zambia', 'ZM', 'en', 'Africa/Lusaka', 'Afrika'),
      city('harare', 'Harare', 'Harare', 'Zimbabve', 'Zimbabwe', 'ZW', 'en', 'Africa/Harare', 'Afrika'),
      city('gaborone', 'Gaborone', 'Gaborone', 'Bocvana', 'Botswana', 'BW', 'en', 'Africa/Gaborone', 'Afrika'),
      city('windhoek', 'Windhoek', 'Windhoek', 'Namibija', 'Namibia', 'NA', 'en', 'Africa/Windhoek', 'Afrika'),
      city('maputo', 'Maputo', 'Maputo', 'Mozambik', 'Mozambique', 'MZ', 'pt', 'Africa/Maputo', 'Afrika'),
      city('luanda', 'Luanda', 'Luanda', 'Angola', 'Angola', 'AO', 'pt', 'Africa/Luanda', 'Afrika'),
      city('kinshasa', 'Kinshasa', 'Kinshasa', 'DR Kongo', 'DR Congo', 'CD', 'fr', 'Africa/Kinshasa', 'Afrika'),
      city('yaounde', 'Yaoundé', 'Yaoundé', 'Kamerun', 'Cameroon', 'CM', 'fr', 'Africa/Douala', 'Afrika'),
      city('khartoum', 'Kartum', 'Khartoum', 'Sudan', 'Sudan', 'SD', 'ar', 'Africa/Khartoum', 'Afrika')
    ]
  },
  {
    id: 'wave-5',
    name: 'Peti val — Azija i Oceanija',
    status: 'planned',
    note: 'Najveći val po broju ljudi. Arapski, kineski i japanski su već u mreži; hindski, bengalski, tajlandski, vijetnamski, korejski i perzijski traže nova sučelja.',
    cities: [
      city('new-delhi', 'New Delhi', 'New Delhi', 'Indija', 'India', 'IN', 'hi', 'Asia/Kolkata', 'Azija', { note: 'Indija ima 22 službena jezika; izdanje ide na hindskom, engleski je drugi jezik.' }),
      city('islamabad', 'Islamabad', 'Islamabad', 'Pakistan', 'Pakistan', 'PK', 'ur', 'Asia/Karachi', 'Azija'),
      city('dhaka', 'Dhaka', 'Dhaka', 'Bangladeš', 'Bangladesh', 'BD', 'bn', 'Asia/Dhaka', 'Azija'),
      city('colombo', 'Colombo', 'Colombo', 'Šri Lanka', 'Sri Lanka', 'LK', 'si', 'Asia/Colombo', 'Azija', { note: 'Službeni glavni grad je Sri Jayawardenepura Kotte; Colombo je medijsko i gospodarsko središte.' }),
      city('kathmandu', 'Katmandu', 'Kathmandu', 'Nepal', 'Nepal', 'NP', 'ne', 'Asia/Kathmandu', 'Azija'),
      city('bangkok', 'Bangkok', 'Bangkok', 'Tajland', 'Thailand', 'TH', 'th', 'Asia/Bangkok', 'Azija'),
      city('hanoi', 'Hanoi', 'Hanoi', 'Vijetnam', 'Vietnam', 'VN', 'vi', 'Asia/Ho_Chi_Minh', 'Azija'),
      city('manila', 'Manila', 'Manila', 'Filipini', 'Philippines', 'PH', 'en', 'Asia/Manila', 'Azija', { note: 'Filipini ima i filipinski kao nacionalni jezik.' }),
      city('kuala-lumpur', 'Kuala Lumpur', 'Kuala Lumpur', 'Malezija', 'Malaysia', 'MY', 'ms', 'Asia/Kuala_Lumpur', 'Azija', { note: 'Savezni teritorij Kuala Lumpur je glavni grad; uprava je u Putrajayi.' }),
      city('seoul', 'Seul', 'Seoul', 'Južna Koreja', 'South Korea', 'KR', 'ko', 'Asia/Seoul', 'Azija'),
      city('riyadh', 'Rijad', 'Riyadh', 'Saudijska Arabija', 'Saudi Arabia', 'SA', 'ar', 'Asia/Riyadh', 'Azija'),
      city('abu-dhabi', 'Abu Dhabi', 'Abu Dhabi', 'Ujedinjeni Arapski Emirati', 'United Arab Emirates', 'AE', 'ar', 'Asia/Dubai', 'Azija', { note: 'Glavni grad je Abu Dhabi; Dubai ostaje medijsko središte.' }),
      city('doha', 'Doha', 'Doha', 'Katar', 'Qatar', 'QA', 'ar', 'Asia/Qatar', 'Azija'),
      city('kuwait', 'Kuvajt', 'Kuwait City', 'Kuvajt', 'Kuwait', 'KW', 'ar', 'Asia/Kuwait', 'Azija'),
      city('amman', 'Aman', 'Amman', 'Jordan', 'Jordan', 'JO', 'ar', 'Asia/Amman', 'Azija'),
      city('beirut', 'Bejrut', 'Beirut', 'Libanon', 'Lebanon', 'LB', 'ar', 'Asia/Beirut', 'Azija'),
      city('bagdad', 'Bagdad', 'Baghdad', 'Irak', 'Iraq', 'IQ', 'ar', 'Asia/Baghdad', 'Azija'),
      city('teheran', 'Teheran', 'Tehran', 'Iran', 'Iran', 'IR', 'fa', 'Asia/Tehran', 'Azija'),
      city('tashkent', 'Taškent', 'Tashkent', 'Uzbekistan', 'Uzbekistan', 'UZ', 'uz', 'Asia/Tashkent', 'Azija'),
      city('astana', 'Astana', 'Astana', 'Kazahstan', 'Kazakhstan', 'KZ', 'kk', 'Asia/Almaty', 'Azija'),
      city('baku', 'Baku', 'Baku', 'Azerbajdžan', 'Azerbaijan', 'AZ', 'az', 'Asia/Baku', 'Azija'),
      city('tbilisi', 'Tbilisi', 'Tbilisi', 'Gruzija', 'Georgia', 'GE', 'ka', 'Asia/Tbilisi', 'Azija'),
      city('yerevan', 'Erevan', 'Yerevan', 'Armenija', 'Armenia', 'AM', 'hy', 'Asia/Yerevan', 'Azija'),
      city('canberra', 'Canberra', 'Canberra', 'Australija', 'Australia', 'AU', 'en', 'Australia/Sydney', 'Oceanija'),
      city('wellington', 'Wellington', 'Wellington', 'Novi Zeland', 'New Zealand', 'NZ', 'en', 'Pacific/Auckland', 'Oceanija'),
      city('suva', 'Suva', 'Suva', 'Fidži', 'Fiji', 'FJ', 'en', 'Pacific/Fiji', 'Oceanija'),
      city('port-moresby', 'Port Moresby', 'Port Moresby', 'Papua Nova Gvineja', 'Papua New Guinea', 'PG', 'en', 'Pacific/Port_Moresby', 'Oceanija')
    ]
  }
];

/** Ravni popis svih gradova iz plana, s oznakom vala. */
export const PLANNED = WAVES.flatMap((wave) => wave.cities.map((entry) => ({ ...entry, wave: wave.id })));

/** Što svako buduće izdanje mora imati prije objave. */
export const REQUIREMENTS = [
  { id: 'sources', hr: 'provjereni izvori s RSS adresama (najmanje tri)', en: 'verified sources with RSS feeds (at least three)' },
  { id: 'art', hr: 'scena grada u assets/global-src (16:9)', en: 'city scene in assets/global-src (16:9)' },
  { id: 'strings', hr: 'nazivi sučelja na jeziku zemlje', en: 'interface strings in the country language' },
  { id: 'items', hr: 'najmanje jedan stvarni zapis u arhivi', en: 'at least one real record in the archive' }
];
