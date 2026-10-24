/**
 * PLAN ŠIRENJA — ostatak svijeta, do zadnje države.
 *
 * Prvih pet valova (u `expansion-plan.mjs`) pokriva 108 zemalja. Ovaj modul
 * dodaje preostalih 87 tako da plan zatvori krug: **svih 195 država** —
 * 193 članice Ujedinjenih naroda te Sveta Stolica i Palestina.
 *
 * Pravila su ista kao i za prve valove:
 *  - jedno izdanje = jedan grad, u pravilu prijestolnica te zemlje;
 *  - jezik izdanja je jezik zemlje;
 *  - podaci su činjenice (glavni grad, država, jezik, vremenska zona), a gdje
 *    država ima više prijestolnica ili je medijsko središte drugdje, to stoji
 *    u `note`;
 *  - izdanje ne nastaje dok ne ispuni četiri uvjeta iz `REQUIREMENTS`.
 *
 * Redoslijed valova nije marketinški: prvo ide ono što traži najmanje novih
 * sučelja (europski jezici koje sustav već poznaje, engleski i španjolski),
 * zatim Afrika, Azija i Oceanija, gdje treba i novi jezik i novi izvori.
 */

const city = (id, name, nameEn, country, countryEn, cc, lang, tz, continent, extra = {}) => ({
  id, city: name, cityEn: nameEn, country, countryEn, countryCode: cc,
  lang, timezone: tz, continent, ...extra
});

export const REST_WAVES = [
  {
    id: 'wave-6',
    name: 'Šesti val — Europa do zadnje države',
    status: 'planned',
    note: 'Jedanaest europskih država koje još nemaju izdanje: mikrodržave, baltički i slavenski jezici te Ujedinjeno Kraljevstvo i Rusija. Za nove jezike (sq, be, mk, ru, ca) treba prijevod sučelja.',
    cities: [
      city('tirana', 'Tirana', 'Tirana', 'Albanija', 'Albania', 'AL', 'sq', 'Europe/Tirane', 'Europa'),
      city('andorra-la-vella', 'Andora la Vella', 'Andorra la Vella', 'Andora', 'Andorra', 'AD', 'ca', 'Europe/Andorra', 'Europa', { note: 'Katalonski je službeni jezik; španjolski i francuski su u svakodnevnoj uporabi.' }),
      city('minsk', 'Minsk', 'Minsk', 'Bjelorusija', 'Belarus', 'BY', 'be', 'Europe/Minsk', 'Europa', { note: 'Bjelorusija ima i ruski kao službeni jezik.' }),
      city('london', 'London', 'London', 'Ujedinjeno Kraljevstvo', 'United Kingdom', 'GB', 'en', 'Europe/London', 'Europa'),
      city('vaduz', 'Vaduz', 'Vaduz', 'Lihtenštajn', 'Liechtenstein', 'LI', 'de', 'Europe/Vaduz', 'Europa'),
      city('monako', 'Monako', 'Monaco', 'Monako', 'Monaco', 'MC', 'fr', 'Europe/Monaco', 'Europa', { note: 'Jedna od najmanjih država svijeta; izdanje pokriva i frankofonu obalu.' }),
      city('podgorica', 'Podgorica', 'Podgorica', 'Crna Gora', 'Montenegro', 'ME', 'sr', 'Europe/Podgorica', 'Europa', { note: 'Crnogorski jezik dijeli osnovu sa srpskim; izdanje ide na crnogorskom.' }),
      city('skoplje', 'Skoplje', 'Skopje', 'Sjeverna Makedonija', 'North Macedonia', 'MK', 'mk', 'Europe/Skopje', 'Europa', { note: 'Albanski je drugi službeni jezik u zemlji.' }),
      city('moskva', 'Moskva', 'Moscow', 'Rusija', 'Russia', 'RU', 'ru', 'Europe/Moscow', 'Europa', { note: 'Rusija ima jedanaest vremenskih zona; izdanje ide po moskovskom vremenu.' }),
      city('san-marino', 'San Marino', 'San Marino', 'San Marino', 'San Marino', 'SM', 'it', 'Europe/San_Marino', 'Europa'),
      city('vatikan', 'Vatikan', 'Vatican City', 'Vatikan', 'Vatican City', 'VA', 'it', 'Europe/Vatican', 'Europa', { note: 'Najmanja država svijeta; izdanje pokriva Svetu Stolicu i crkvenu scenu Rima.' })
    ]
  },
  {
    id: 'wave-7',
    name: 'Sedmi val — Amerika do zadnje države',
    status: 'planned',
    note: 'Šesnaest država Srednje Amerike, Kariba i Gvajane. Engleski i španjolski već su u mreži, pa ovaj val traži najmanje novih sučelja.',
    cities: [
      city('saint-johns', "Saint John's", "Saint John's", 'Antigva i Barbuda', 'Antigua and Barbuda', 'AG', 'en', 'America/Antigua', 'Sjeverna Amerika'),
      city('nassau', 'Nassau', 'Nassau', 'Bahami', 'Bahamas', 'BS', 'en', 'America/Nassau', 'Sjeverna Amerika'),
      city('bridgetown', 'Bridgetown', 'Bridgetown', 'Barbados', 'Barbados', 'BB', 'en', 'America/Barbados', 'Sjeverna Amerika'),
      city('belmopan', 'Belmopan', 'Belmopan', 'Belize', 'Belize', 'BZ', 'en', 'America/Belize', 'Sjeverna Amerika', { note: 'Belmopan je glavni grad; Belize City ostaje najveće središte.' }),
      city('roseau', 'Roseau', 'Roseau', 'Dominika', 'Dominica', 'DM', 'en', 'America/Dominica', 'Sjeverna Amerika'),
      city('st-georges', "St. George's", "St. George's", 'Grenada', 'Grenada', 'GD', 'en', 'America/Grenada', 'Sjeverna Amerika'),
      city('tegucigalpa', 'Tegucigalpa', 'Tegucigalpa', 'Honduras', 'Honduras', 'HN', 'es', 'America/Tegucigalpa', 'Sjeverna Amerika'),
      city('port-au-prince', 'Port-au-Prince', 'Port-au-Prince', 'Haiti', 'Haiti', 'HT', 'fr', 'America/Port-au-Prince', 'Sjeverna Amerika', { note: 'Haićanski kreolski je drugi službeni jezik.' }),
      city('managua', 'Managua', 'Managua', 'Nikaragva', 'Nicaragua', 'NI', 'es', 'America/Managua', 'Sjeverna Amerika'),
      city('basseterre', 'Basseterre', 'Basseterre', 'Sveti Kristofor i Nevis', 'Saint Kitts and Nevis', 'KN', 'en', 'America/St_Kitts', 'Sjeverna Amerika'),
      city('castries', 'Castries', 'Castries', 'Sveta Lucija', 'Saint Lucia', 'LC', 'en', 'America/St_Lucia', 'Sjeverna Amerika'),
      city('kingstown', 'Kingstown', 'Kingstown', 'Sveti Vincent i Grenadini', 'Saint Vincent and the Grenadines', 'VC', 'en', 'America/St_Vincent', 'Sjeverna Amerika'),
      city('san-salvador', 'San Salvador', 'San Salvador', 'Salvador', 'El Salvador', 'SV', 'es', 'America/El_Salvador', 'Sjeverna Amerika'),
      city('port-of-spain', 'Port of Spain', 'Port of Spain', 'Trinidad i Tobago', 'Trinidad and Tobago', 'TT', 'en', 'America/Port_of_Spain', 'Sjeverna Amerika'),
      city('georgetown', 'Georgetown', 'Georgetown', 'Gvajana', 'Guyana', 'GY', 'en', 'America/Guyana', 'Južna Amerika'),
      city('paramaribo', 'Paramaribo', 'Paramaribo', 'Surinam', 'Suriname', 'SR', 'nl', 'America/Paramaribo', 'Južna Amerika', { note: 'Nizozemski je službeni; sranan tongo je lingua franca.' })
    ]
  },
  {
    id: 'wave-8',
    name: 'Osmi val — Afrika do zadnje države',
    status: 'planned',
    note: 'Trideset i jedna država zapadne, srednje, istočne i južne Afrike. Francuski, portugalski, arapski i engleski već postoje; novi su svahili, malgaški, somalski i bislama.',
    cities: [
      city('ouagadougou', 'Ouagadougou', 'Ouagadougou', 'Burkina Faso', 'Burkina Faso', 'BF', 'fr', 'Africa/Ouagadougou', 'Afrika'),
      city('gitega', 'Gitega', 'Gitega', 'Burundi', 'Burundi', 'BI', 'fr', 'Africa/Bujumbura', 'Afrika', { note: 'Gitega je politički glavni grad od 2019.; Bujumbura ostaje gospodarsko središte.' }),
      city('porto-novo', 'Porto-Novo', 'Porto-Novo', 'Benin', 'Benin', 'BJ', 'fr', 'Africa/Porto-Novo', 'Afrika', { note: 'Porto-Novo je glavni grad; Cotonou je sjedište vlade i najveće središte.' }),
      city('praia', 'Praia', 'Praia', 'Zelenortska Republika', 'Cabo Verde', 'CV', 'pt', 'Atlantic/Cape_Verde', 'Afrika', { note: 'Zelenortski kreolski je jezik svakodnevice; izdanje ide na portugalskom.' }),
      city('bangui', 'Bangui', 'Bangui', 'Srednjoafrička Republika', 'Central African Republic', 'CF', 'fr', 'Africa/Bangui', 'Afrika', { note: 'Sango je drugi službeni jezik.' }),
      city('brazzaville', 'Brazzaville', 'Brazzaville', 'Kongo', 'Republic of the Congo', 'CG', 'fr', 'Africa/Brazzaville', 'Afrika'),
      city('dzibuti', 'Džibuti', 'Djibouti', 'Džibuti', 'Djibouti', 'DJ', 'fr', 'Africa/Djibouti', 'Afrika', { note: 'Arapski je drugi službeni jezik.' }),
      city('asmara', 'Asmara', 'Asmara', 'Eritreja', 'Eritrea', 'ER', 'ti', 'Africa/Asmara', 'Afrika', { note: 'Arapski i engleski također su službeni jezici.' }),
      city('malabo', 'Malabo', 'Malabo', 'Ekvatorska Gvineja', 'Equatorial Guinea', 'GQ', 'es', 'Africa/Malabo', 'Afrika', { note: 'Malabo je glavni grad na otoku Bioko; na kopnu se gradi novi administrativni grad.' }),
      city('mbabane', 'Mbabane', 'Mbabane', 'Esvatini', 'Eswatini', 'SZ', 'en', 'Africa/Mbabane', 'Afrika', { note: 'Mbabane je upravni glavni grad; Lobamba je kraljevsko i zakonodavno sjedište.' }),
      city('libreville', 'Libreville', 'Libreville', 'Gabon', 'Gabon', 'GA', 'fr', 'Africa/Libreville', 'Afrika'),
      city('banjul', 'Banjul', 'Banjul', 'Gambija', 'Gambia', 'GM', 'en', 'Africa/Banjul', 'Afrika'),
      city('conakry', 'Conakry', 'Conakry', 'Gvineja', 'Guinea', 'GN', 'fr', 'Africa/Conakry', 'Afrika'),
      city('bissau', 'Bissau', 'Bissau', 'Gvineja Bisau', 'Guinea-Bissau', 'GW', 'pt', 'Africa/Bissau', 'Afrika'),
      city('moroni', 'Moroni', 'Moroni', 'Komori', 'Comoros', 'KM', 'ar', 'Indian/Comoro', 'Afrika', { note: 'Komorski je jezik svakodnevice; arapski je službeni.' }),
      city('maseru', 'Maseru', 'Maseru', 'Lesoto', 'Lesotho', 'LS', 'en', 'Africa/Maseru', 'Afrika', { note: 'Sesoto je nacionalni jezik.' }),
      city('monrovia', 'Monrovia', 'Monrovia', 'Liberija', 'Liberia', 'LR', 'en', 'Africa/Monrovia', 'Afrika'),
      city('tripoli', 'Tripoli', 'Tripoli', 'Libija', 'Libya', 'LY', 'ar', 'Africa/Tripoli', 'Afrika'),
      city('antananarivo', 'Antananarivo', 'Antananarivo', 'Madagaskar', 'Madagascar', 'MG', 'mg', 'Indian/Antananarivo', 'Afrika', { note: 'Malgaški i francuski su službeni jezici.' }),
      city('lilongwe', 'Lilongwe', 'Lilongwe', 'Malavi', 'Malawi', 'MW', 'en', 'Africa/Blantyre', 'Afrika', { note: 'Lilongwe je glavni grad; Blantyre je gospodarsko središte. Chichewa je nacionalni jezik.' }),
      city('bamako', 'Bamako', 'Bamako', 'Mali', 'Mali', 'ML', 'fr', 'Africa/Bamako', 'Afrika'),
      city('nouakchott', 'Nouakchott', 'Nouakchott', 'Mauritanija', 'Mauritania', 'MR', 'ar', 'Africa/Nouakchott', 'Afrika'),
      city('port-louis', 'Port Louis', 'Port Louis', 'Mauricijus', 'Mauritius', 'MU', 'en', 'Indian/Mauritius', 'Afrika', { note: 'Mauricijski kreolski i francuski su u svakodnevnoj uporabi.' }),
      city('niamey', 'Niamey', 'Niamey', 'Niger', 'Niger', 'NE', 'fr', 'Africa/Niamey', 'Afrika'),
      city('sao-tome', 'São Tomé', 'São Tomé', 'Sveti Toma i Princip', 'São Tomé and Príncipe', 'ST', 'pt', 'Africa/Sao_Tome', 'Afrika'),
      city('victoria', 'Victoria', 'Victoria', 'Sejšeli', 'Seychelles', 'SC', 'fr', 'Indian/Mahe', 'Afrika', { note: 'Sejšelski kreolski i engleski također su službeni.' }),
      city('freetown', 'Freetown', 'Freetown', 'Sijera Leone', 'Sierra Leone', 'SL', 'en', 'Africa/Freetown', 'Afrika'),
      city('mogadishu', 'Mogadishu', 'Mogadishu', 'Somalija', 'Somalia', 'SO', 'so', 'Africa/Mogadishu', 'Afrika', { note: 'Arapski je drugi službeni jezik.' }),
      city('juba', 'Juba', 'Juba', 'Južni Sudan', 'South Sudan', 'SS', 'en', 'Africa/Juba', 'Afrika'),
      city('ndjamena', "N'Djamena", "N'Djamena", 'Čad', 'Chad', 'TD', 'fr', 'Africa/Ndjamena', 'Afrika', { note: 'Arapski je drugi službeni jezik.' }),
      city('lome', 'Lomé', 'Lomé', 'Togo', 'Togo', 'TG', 'fr', 'Africa/Lome', 'Afrika')
    ]
  },
  {
    id: 'wave-9',
    name: 'Deveti val — Azija do zadnje države',
    status: 'planned',
    note: 'Devetnaest država zapadne, srednje i jugoistočne Azije te Bliskog istoka. Novi jezici: perzijski (dari), hebrejski, kmerski, mongolski, maldivski, burmanski, laoški, tadžički, turkmenski, kirgiski, dzongkha.',
    cities: [
      city('kabul', 'Kabul', 'Kabul', 'Afganistan', 'Afghanistan', 'AF', 'fa', 'Asia/Kabul', 'Azija', { note: 'Dari i paštu su službeni; izdanje ide na dariju.' }),
      city('manama', 'Manama', 'Manama', 'Bahrein', 'Bahrain', 'BH', 'ar', 'Asia/Bahrain', 'Azija'),
      city('bandar-seri-begawan', 'Bandar Seri Begawan', 'Bandar Seri Begawan', 'Brunej', 'Brunei', 'BN', 'ms', 'Asia/Brunei', 'Azija'),
      city('thimphu', 'Thimphu', 'Thimphu', 'Butan', 'Bhutan', 'BT', 'dz', 'Asia/Thimphu', 'Azija'),
      city('jeruzalem', 'Jeruzalem', 'Jerusalem', 'Izrael', 'Israel', 'IL', 'he', 'Asia/Jerusalem', 'Azija', { note: 'Jeruzalem je proglašeni glavni grad; međunarodni status grada nije konačno riješen, a medijsko središte je Tel Aviv.' }),
      city('biskek', 'Biškek', 'Bishkek', 'Kirgistan', 'Kyrgyzstan', 'KG', 'ky', 'Asia/Bishkek', 'Azija', { note: 'Ruski je drugi službeni jezik.' }),
      city('phnom-penh', 'Phnom Penh', 'Phnom Penh', 'Kambodža', 'Cambodia', 'KH', 'km', 'Asia/Phnom_Penh', 'Azija'),
      city('pyongyang', 'Pjongjang', 'Pyongyang', 'Sjeverna Koreja', 'North Korea', 'KP', 'ko', 'Asia/Pyongyang', 'Azija'),
      city('vientiane', 'Vientiane', 'Vientiane', 'Laos', 'Laos', 'LA', 'lo', 'Asia/Vientiane', 'Azija'),
      city('male', 'Malé', 'Malé', 'Maldivi', 'Maldives', 'MV', 'dv', 'Indian/Maldives', 'Azija'),
      city('naypyidaw', 'Naypyidaw', 'Naypyidaw', 'Mjanmar', 'Myanmar', 'MM', 'my', 'Asia/Yangon', 'Azija', { note: 'Yangon (Rangoon) ostaje gospodarsko i medijsko središte.' }),
      city('ulaanbaatar', 'Ulaanbaatar', 'Ulaanbaatar', 'Mongolija', 'Mongolia', 'MN', 'mn', 'Asia/Ulaanbaatar', 'Azija'),
      city('muscat', 'Muscat', 'Muscat', 'Oman', 'Oman', 'OM', 'ar', 'Asia/Muscat', 'Azija'),
      city('ramallah', 'Ramallah', 'Ramallah', 'Palestina', 'Palestine', 'PS', 'ar', 'Asia/Hebron', 'Azija', { note: 'Istočni Jeruzalem je proglašeni glavni grad; Ramallah je sjedište uprave.' }),
      city('damask', 'Damask', 'Damascus', 'Sirija', 'Syria', 'SY', 'ar', 'Asia/Damascus', 'Azija'),
      city('dusanbe', 'Dušanbe', 'Dushanbe', 'Tadžikistan', 'Tajikistan', 'TJ', 'tg', 'Asia/Dushanbe', 'Azija', { note: 'Ruski je jezik međuetničke komunikacije.' }),
      city('dili', 'Dili', 'Dili', 'Timor-Leste', 'Timor-Leste', 'TL', 'pt', 'Asia/Dili', 'Azija', { note: 'Tetum je drugi službeni jezik.' }),
      city('asgabat', 'Ašgabat', 'Ashgabat', 'Turkmenistan', 'Turkmenistan', 'TM', 'tk', 'Asia/Ashgabat', 'Azija'),
      city('sanaa', "Sana'a", "Sana'a", 'Jemen', 'Yemen', 'YE', 'ar', 'Asia/Aden', 'Azija', { note: "Sana'a je glavni grad; Aden je privremeno sjedište vlade i medijsko središte." })
    ]
  },
  {
    id: 'wave-10',
    name: 'Deseti val — Oceanija do zadnje države',
    status: 'planned',
    note: 'Deset pacifičkih država. Engleski je u mreži; tonški, tuvaluanski, bislama i samoanski traže nova sučelja, a izdanja su mala i čitaju se na telefonu.',
    cities: [
      city('palikir', 'Palikir', 'Palikir', 'Mikronezija', 'Micronesia', 'FM', 'en', 'Pacific/Pohnpei', 'Oceanija'),
      city('south-tarawa', 'South Tarawa', 'South Tarawa', 'Kiribati', 'Kiribati', 'KI', 'en', 'Pacific/Tarawa', 'Oceanija', { note: 'Gilbertski (kiribati) je nacionalni jezik.' }),
      city('majuro', 'Majuro', 'Majuro', 'Maršalovi Otoci', 'Marshall Islands', 'MH', 'en', 'Pacific/Majuro', 'Oceanija', { note: 'Maršalski je drugi službeni jezik.' }),
      city('yaren', 'Yaren', 'Yaren', 'Nauru', 'Nauru', 'NR', 'en', 'Pacific/Nauru', 'Oceanija', { note: 'Nauru nema službeni glavni grad; Yaren je sjedište vlade.' }),
      city('ngerulmud', 'Ngerulmud', 'Ngerulmud', 'Palau', 'Palau', 'PW', 'en', 'Pacific/Palau', 'Oceanija', { note: 'Ngerulmud je glavni grad od 2006.; Koror ostaje najveće središte.' }),
      city('honiara', 'Honiara', 'Honiara', 'Salomonovi Otoci', 'Solomon Islands', 'SB', 'en', 'Pacific/Guadalcanal', 'Oceanija', { note: 'Pidžin je lingua franca.' }),
      city('nukualofa', "Nuku'alofa", "Nuku'alofa", 'Tonga', 'Tonga', 'TO', 'to', 'Pacific/Tongatapu', 'Oceanija'),
      city('funafuti', 'Funafuti', 'Funafuti', 'Tuvalu', 'Tuvalu', 'TV', 'tv', 'Pacific/Funafuti', 'Oceanija', { note: 'Tuvaluanski i engleski su službeni jezici.' }),
      city('port-vila', 'Port Vila', 'Port Vila', 'Vanuatu', 'Vanuatu', 'VU', 'bi', 'Pacific/Efate', 'Oceanija', { note: 'Bislama, francuski i engleski su službeni jezici.' }),
      city('apia', 'Apia', 'Apia', 'Samoa', 'Samoa', 'WS', 'sm', 'Pacific/Apia', 'Oceanija')
    ]
  }
];
