#!/usr/bin/env node
/**
 * GENERATOR: world-countries-v1.json
 *
 * Skripta generira puni JSON sa svih 201 zemljom iz naše mreže.
 * Pokreni: node scripts/generate-world-countries-v1.mjs
 * Izlaz:   data/world-countries-v1.json
 *
 * Ovaj fajl se koristi kao single-source-of-truth za:
 *   - country stanice na gnk-asg.hr/gnk-aktual/
 *   - world map widget
 *   - sitemap generaciju
 *   - RSS feed listing
 *   - bot agent registry
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'apps', 'portal', 'data', 'world-countries-v1.json');

// Helper: Google News RSS URL
const gnews = (cc, lang, topic = '') =>
  `https://news.google.com/rss?hl=${lang}&gl=${cc}&ceid=${cc}:${lang}${topic ? `&topic=${topic}` : ''}`;

// Helper: source object
const src = (id, name, url, rss, category, reliability = "high", language = "en") => ({
  id, name, url, rss, category, reliability, language
});

// Helper: standard sources for a country (Google News + Sport)
const stdSources = (cc, lang) => [
  { id: `gnews-${cc.toLowerCase()}`, name: "Google News", url: "https://news.google.com", rss: gnews(cc, lang), category: "vijesti", reliability: "high", language: lang },
  { id: `gnews-sport-${cc.toLowerCase()}`, name: "Google Sport", url: "https://news.google.com", rss: gnews(cc, lang, "SPORT"), category: "sport", reliability: "high", language: lang },
];

// Country definitions — full list of 201 countries
// Format: [code, slug, nameLocal, nameEn, language, flag, region, [extraSources]]
const COUNTRY_DEFS = [
  // === BALKAN (12) ===
  ["SI", "slovenija", "Slovenija", "Slovenia", "sl", "🇸🇮", "Balkan", [
    src("rtvslo", "RTV SLO", "https://www.rtvslo.si", "https://www.rtvslo.si/feeds/news.xml", "vijesti", "high", "sl"),
    src("24ur", "24ur", "https://www.24ur.com", "https://www.24ur.com/rss", "vijesti", "high", "sl"),
    src("delo", "Delo", "https://www.delo.si", "https://www.delo.si/rss/aktualno", "vijesti", "high", "sl"),
  ]],
  ["HR", "hrvatska", "Hrvatska", "Croatia", "hr", "🇭🇷", "Balkan", [
    src("hrt", "HRT Vijesti", "https://vijesti.hrt.hr", "https://vijesti.hrt.hr/rss/rss-feed.xml", "vijesti", "high", "hr"),
    src("index", "Index.hr", "https://www.index.hr", "https://www.index.hr/rss/vijesti", "vijesti", "high", "hr"),
    src("jutarnji", "Jutarnji list", "https://www.jutarnji.hr", "https://www.jutarnji.hr/rss/vijesti/", "vijesti", "high", "hr"),
    src("vecernji", "Večernji list", "https://www.vecernji.hr", "https://www.vecernji.hr/rss/vijesti/", "vijesti", "high", "hr"),
    src("24sata", "24sata", "https://www.24sata.hr", "https://www.24sata.hr/feeds/news.xml", "vijesti", "high", "hr"),
    src("lider", "Lider", "https://www.lider.hr", "https://www.lider.hr/feed/", "biznis", "high", "hr"),
    src("poslovni", "Poslovni dnevnik", "https://www.poslovni.hr", "https://www.poslovni.hr/feed/", "biznis", "high", "hr"),
    src("dnevnikhr", "Dnevnik.hr", "https://www.dnevnik.hr", "https://www.dnevnik.hr/rss", "vijesti", "high", "hr"),
    src("net.hr", "Net.hr", "https://net.hr", "https://net.hr/feed/", "vijesti", "medium", "hr"),
  ]],
  ["BA", "bih", "Bosna i Hercegovina", "Bosnia & Herzegovina", "bs", "🇧🇦", "Balkan", [
    src("klix", "Klix.ba", "https://www.klix.ba", "https://www.klix.ba/rss", "vijesti", "high", "bs"),
    src("avaz", "Dnevni Avaz", "https://www.avaz.ba", "https://www.avaz.ba/rss/novosti", "vijesti", "high", "bs"),
    src("fena", "FENA", "https://www.fena.ba", "https://www.fena.ba/rss", "vijesti", "high", "bs"),
  ]],
  ["RS", "srbija", "Srbija", "Serbia", "sr", "🇷🇸", "Balkan", [
    src("b92", "B92", "https://www.b92.net", "https://www.b92.net/rss/vesti.xml", "vijesti", "high", "sr"),
    src("blic", "Blic", "https://www.blic.rs", "https://www.blic.rs/rss/vesti", "vijesti", "high", "sr"),
    src("danas", "Danas", "https://www.danas.rs", "https://www.danas.rs/rss", "vijesti", "high", "sr"),
  ]],
  ["ME", "crna-gora", "Crna Gora", "Montenegro", "srp", "🇲🇪", "Balkan", []],
  ["MK", "makedonija", "Северна Македонија", "North Macedonia", "mk", "🇲🇰", "Balkan", []],
  ["AL", "albanija", "Shqipëria", "Albania", "sq", "🇦🇱", "Balkan", []],
  ["BG", "bugarska", "България", "Bulgaria", "bg", "🇧🇬", "Balkan", []],
  ["RO", "rumunjska", "România", "Romania", "ro", "🇷🇴", "Balkan", []],
  ["GR", "grcka", "Ελλάδα", "Greece", "el", "🇬🇷", "Balkan", []],
  ["TR", "turska", "Türkiye", "Turkey", "tr", "🇹🇷", "Balkan", []],
  ["XK", "kosovo", "Kosova", "Kosovo", "sq", "🇽🇰", "Balkan", []],

  // === SREDNJA EUROPA (8) ===
  ["AT", "austrija", "Österreich", "Austria", "de", "🇦🇹", "Srednja Europa", [src("orf", "ORF", "https://orf.at", "https://rss.orf.at/news.xml", "vijesti", "high", "de")]],
  ["HU", "madjarska", "Magyarország", "Hungary", "hu", "🇭🇺", "Srednja Europa", []],
  ["CZ", "ceska", "Česko", "Czechia", "cs", "🇨🇿", "Srednja Europa", []],
  ["SK", "slovakia", "Slovensko", "Slovakia", "sk", "🇸🇰", "Srednja Europa", []],
  ["PL", "poljska", "Polska", "Poland", "pl", "🇵🇱", "Srednja Europa", []],
  ["DE", "njemacka", "Deutschland", "Germany", "de", "🇩🇪", "Srednja Europa", [
    src("tagesschau", "Tagesschau", "https://www.tagesschau.de", "https://www.tagesschau.de/xml/rss2/", "vijesti", "high", "de"),
    src("spiegel", "Spiegel", "https://www.spiegel.de", "https://www.spiegel.de/schlagzeilen/index.rss", "vijesti", "high", "de"),
  ]],
  ["CH", "svajcarska", "Schweiz", "Switzerland", "de", "🇨🇭", "Srednja Europa", []],
  ["LI", "lihtenstajn", "Liechtenstein", "Liechtenstein", "de", "🇱🇮", "Srednja Europa", []],

  // === ZAPADNA EUROPA (8) ===
  ["FR", "francuska", "France", "France", "fr", "🇫🇷", "Zapadna Europa", []],
  ["IT", "italija", "Italia", "Italy", "it", "🇮🇹", "Zapadna Europa", []],
  ["ES", "spanjolska", "España", "Spain", "es", "🇪🇸", "Zapadna Europa", []],
  ["PT", "portugal", "Portugal", "Portugal", "pt", "🇵🇹", "Zapadna Europa", []],
  ["GB", "velika-britanija", "United Kingdom", "United Kingdom", "en", "🇬🇧", "Zapadna Europa", [
    src("bbc", "BBC", "https://www.bbc.co.uk", "https://feeds.bbci.co.uk/news/rss.xml", "vijesti", "high", "en"),
    src("guardian", "Guardian", "https://www.theguardian.com", "https://www.theguardian.com/world/rss", "vijesti", "high", "en"),
  ]],
  ["IE", "irsla", "Éire", "Ireland", "en", "🇮🇪", "Zapadna Europa", []],
  ["NL", "nizozemska", "Nederland", "Netherlands", "nl", "🇳🇱", "Zapadna Europa", []],
  ["BE", "belgija", "België", "Belgium", "nl", "🇧🇪", "Zapadna Europa", []],

  // === SJEVERNA EUROPA (5) ===
  ["DK", "danska", "Danmark", "Denmark", "da", "🇩🇰", "Sjeverna Europa", []],
  ["SE", "svedska", "Sverige", "Sweden", "sv", "🇸🇪", "Sjeverna Europa", []],
  ["NO", "norveska", "Norge", "Norway", "no", "🇳🇴", "Sjeverna Europa", []],
  ["FI", "finska", "Suomi", "Finland", "fi", "🇫🇮", "Sjeverna Europa", []],
  ["IS", "island", "Ísland", "Iceland", "is", "🇮🇸", "Sjeverna Europa", []],

  // === BALTIČKE (3) ===
  ["EE", "estonija", "Eesti", "Estonia", "et", "🇪🇪", "Baltičke zemlje", []],
  ["LV", "latvija", "Latvija", "Latvia", "lv", "🇱🇻", "Baltičke zemlje", []],
  ["LT", "litva", "Lietuva", "Lithuania", "lt", "🇱🇹", "Baltičke zemlje", []],

  // === ISTOČNA EUROPA / KAVKAZ (10) ===
  ["RU", "rusija", "Россия", "Russia", "ru", "🇷🇺", "Istočna Europa", []],
  ["UA", "ukrajina", "Україна", "Ukraine", "uk", "🇺🇦", "Istočna Europa", []],
  ["BY", "bjelorusija", "Беларусь", "Belarus", "be", "🇧🇾", "Istočna Europa", []],
  ["MD", "moldavija", "Moldova", "Moldova", "ro", "🇲🇩", "Istočna Europa", []],
  ["GE", "gruzija", "საქართველო", "Georgia", "ka", "🇬🇪", "Kavkaz", []],
  ["AM", "armenija", "Հայաստան", "Armenia", "hy", "🇦🇲", "Kavkaz", []],
  ["AZ", "azerbajdzan", "Azərbaycan", "Azerbaijan", "az", "🇦🇿", "Kavkaz", []],

  // === SJEVERNA AMERIKA (3) ===
  ["US", "sad", "United States", "United States", "en", "🇺🇸", "Sjeverna Amerika", [
    src("nyt", "NYT", "https://www.nytimes.com", "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", "vijesti", "high", "en"),
    src("cnbc", "CNBC", "https://www.cnbc.com", "https://www.cnbc.com/id/100003114/device/rss/rss.html", "biznis", "high", "en"),
  ]],
  ["CA", "kanada", "Canada", "Canada", "en", "🇨🇦", "Sjeverna Amerika", [src("cbc", "CBC", "https://www.cbc.ca", "https://www.cbc.ca/cmlink/rss-topstories", "vijesti", "high", "en")]],
  ["MX", "meksiko", "México", "Mexico", "es", "🇲🇽", "Sjeverna Amerika", [src("eluniversal_mx", "El Universal", "https://www.eluniversal.com.mx", "https://www.eluniversal.com.mx/rss/seccion/noticias.xml", "vijesti", "high", "es")]],

  // === SREDNJA AMERIKA / KARIBI (9) ===
  ["GT", "gvatemala", "Guatemala", "Guatemala", "es", "🇬🇹", "Srednja Amerika", []],
  ["HN", "honduras", "Honduras", "Honduras", "es", "🇭🇳", "Srednja Amerika", []],
  ["SV", "salvador", "El Salvador", "El Salvador", "es", "🇸🇻", "Srednja Amerika", []],
  ["NI", "nikaragva", "Nicaragua", "Nicaragua", "es", "🇳🇮", "Srednja Amerika", []],
  ["CR", "kosta-rika", "Costa Rica", "Costa Rica", "es", "🇨🇷", "Srednja Amerika", []],
  ["PA", "panama", "Panamá", "Panama", "es", "🇵🇦", "Srednja Amerika", []],
  ["CU", "kuba", "Cuba", "Cuba", "es", "🇨🇺", "Karibi", []],
  ["DO", "dominikanska", "Rep. Dominicana", "Dominican Republic", "es", "🇩🇴", "Karibi", []],
  ["JM", "jamajka", "Jamaica", "Jamaica", "en", "🇯🇲", "Karibi", []],

  // === JUŽNA AMERIKA (10) ===
  ["VE", "venezuela", "Venezuela", "Venezuela", "es", "🇻🇪", "Južna Amerika", []],
  ["CO", "kolumbija", "Colombia", "Colombia", "es", "🇨🇴", "Južna Amerika", []],
  ["EC", "ekvador", "Ecuador", "Ecuador", "es", "🇪🇨", "Južna Amerika", []],
  ["PE", "peru", "Perú", "Peru", "es", "🇵🇪", "Južna Amerika", []],
  ["BR", "brazil", "Brasil", "Brazil", "pt", "🇧🇷", "Južna Amerika", [src("g1", "G1", "https://g1.globo.com", "https://g1.globo.com/rss/g1/", "vijesti", "high", "pt")]],
  ["BO", "bolivija", "Bolivia", "Bolivia", "es", "🇧🇴", "Južna Amerika", []],
  ["PY", "paragvaj", "Paraguay", "Paraguay", "es", "🇵🇾", "Južna Amerika", []],
  ["UY", "urugvaj", "Uruguay", "Uruguay", "es", "🇺🇾", "Južna Amerika", []],
  ["AR", "argentina", "Argentina", "Argentina", "es", "🇦🇷", "Južna Amerika", [src("clarin", "Clarín", "https://www.clarin.com", "https://www.clarin.com/rss/lo-ultimo/", "vijesti", "high", "es")]],
  ["CL", "cile", "Chile", "Chile", "es", "🇨🇱", "Južna Amerika", [
    src("biobio", "BioBioChile", "https://www.biobiochile.cl", "https://www.biobiochile.cl/noticias/rss/site/todos.rss", "vijesti", "high", "es"),
    src("cnnchile", "CNN Chile", "https://www.cnnchile.com", "https://www.cnnchile.com/feed/", "vijesti", "high", "es"),
  ]],

  // === ISTOČNA AZIJA (6) ===
  ["CN", "kina", "中国", "China", "zh", "🇨🇳", "Istočna Azija", []],
  ["JP", "japan", "日本", "Japan", "ja", "🇯🇵", "Istočna Azija", []],
  ["KR", "juzna-koreja", "대한민국", "South Korea", "ko", "🇰🇷", "Istočna Azija", []],
  ["KP", "sjeverna-koreja", "조선", "North Korea", "ko", "🇰🇵", "Istočna Azija", []],
  ["TW", "tajvan", "臺灣", "Taiwan", "zh", "🇹🇼", "Istočna Azija", []],
  ["MN", "mongolija", "Монгол Улс", "Mongolia", "mn", "🇲🇳", "Istočna Azija", []],

  // === JUGOISTOČNA AZIJA (9) ===
  ["VN", "vijetnam", "Việt Nam", "Vietnam", "vi", "🇻🇳", "Jugoistočna Azija", []],
  ["TH", "tajland", "ประเทศไทย", "Thailand", "th", "🇹🇭", "Jugoistočna Azija", []],
  ["MY", "malezija", "Malaysia", "Malaysia", "ms", "🇲🇾", "Jugoistočna Azija", []],
  ["SG", "singapur", "Singapore", "Singapore", "en", "🇸🇬", "Jugoistočna Azija", []],
  ["ID", "indonezija", "Indonesia", "Indonesia", "id", "🇮🇩", "Jugoistočna Azija", []],
  ["PH", "filipini", "Pilipinas", "Philippines", "en", "🇵🇭", "Jugoistočna Azija", []],
  ["KH", "kambodza", "កម្ពុជា", "Cambodia", "km", "🇰🇭", "Jugoistočna Azija", []],
  ["LA", "laos", "ລາວ", "Laos", "lo", "🇱🇦", "Jugoistočna Azija", []],
  ["MM", "myanmar", "မြန်မာ", "Myanmar", "my", "🇲🇲", "Jugoistočna Azija", []],

  // === JUŽNA AZIJA (6) ===
  ["IN", "indija", "भारत", "India", "hi", "🇮🇳", "Južna Azija", [src("toi", "Times of India", "https://timesofindia.indiatimes.com", "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", "vijesti", "high", "en")]],
  ["PK", "pakistan", "پاکستان", "Pakistan", "ur", "🇵🇰", "Južna Azija", []],
  ["BD", "banglades", "বাংলাদেশ", "Bangladesh", "bn", "🇧🇩", "Južna Azija", []],
  ["LK", "srilanka", "ශ්‍රී ලංකාව", "Sri Lanka", "si", "🇱🇰", "Južna Azija", []],
  ["NP", "nepal", "नेपाल", "Nepal", "ne", "🇳🇵", "Južna Azija", []],
  ["AF", "afganistan", "افغانستان", "Afghanistan", "fa", "🇦🇫", "Južna Azija", []],

  // === SREDNJA AZIJA (5) ===
  ["KZ", "kazahstan", "Қазақстан", "Kazakhstan", "kk", "🇰🇿", "Srednja Azija", []],
  ["UZ", "uzbekistan", "Oʻzbekiston", "Uzbekistan", "uz", "🇺🇿", "Srednja Azija", []],
  ["TM", "turkmenistan", "Türkmenistan", "Turkmenistan", "tk", "🇹🇲", "Srednja Azija", []],
  ["KG", "kirgistan", "Кыргызстан", "Kyrgyzstan", "ky", "🇰🇬", "Srednja Azija", []],
  ["TJ", "tadzikistan", "Тоҷикистон", "Tajikistan", "tg", "🇹🇯", "Srednja Azija", []],

  // === BLISKI ISTOK (10) ===
  ["IR", "iran", "ایران", "Iran", "fa", "🇮🇷", "Bliski Istok", []],
  ["IQ", "irak", "العراق", "Iraq", "ar", "🇮🇶", "Bliski Istok", []],
  ["SA", "saudijska", "السعودية", "Saudi Arabia", "ar", "🇸🇦", "Bliski Istok", []],
  ["AE", "uae", "الإمارات", "United Arab Emirates", "ar", "🇦🇪", "Bliski Istok", []],
  ["QA", "katari", "قطر", "Qatar", "ar", "🇶🇦", "Bliski Istok", []],
  ["IL", "izrael", "ישראל", "Israel", "he", "🇮🇱", "Bliski Istok", []],
  ["JO", "jordan", "الأردن", "Jordan", "ar", "🇯🇴", "Bliski Istok", []],
  ["LB", "libanon", "لبنان", "Lebanon", "ar", "🇱🇧", "Bliski Istok", []],
  ["SY", "sirija", "سوريا", "Syria", "ar", "🇸🇾", "Bliski Istok", []],
  ["EG", "egipat", "مصر", "Egypt", "ar", "🇪🇬", "Sjeverna Afrika", []],

  // === SJEVERNA AFRIKA (5) ===
  ["MA", "maroko", "المغرب", "Morocco", "ar", "🇲🇦", "Sjeverna Afrika", []],
  ["DZ", "alzir", "الجزائر", "Algeria", "ar", "🇩🇿", "Sjeverna Afrika", []],
  ["TN", "tunis", "تونس", "Tunisia", "ar", "🇹🇳", "Sjeverna Afrika", []],
  ["LY", "libija", "ليبيا", "Libya", "ar", "🇱🇾", "Sjeverna Afrika", []],
  ["SD", "sudan", "السودان", "Sudan", "ar", "🇸🇩", "Sjeverna Afrika", []],

  // === SUB-SAHARSKA AFRIKA (8) ===
  ["NG", "nigerija", "Nigeria", "Nigeria", "en", "🇳🇬", "Zapadna Afrika", []],
  ["GH", "gvana", "Ghana", "Ghana", "en", "🇬🇭", "Zapadna Afrika", []],
  ["SN", "senegal", "Sénégal", "Senegal", "fr", "🇸🇳", "Zapadna Afrika", []],
  ["KE", "kenija", "Kenya", "Kenya", "en", "🇰🇪", "Istočna Afrika", []],
  ["ET", "etipija", "ኢትዮጵያ", "Ethiopia", "am", "🇪🇹", "Istočna Afrika", []],
  ["TZ", "tanzanija", "Tanzania", "Tanzania", "sw", "🇹🇿", "Istočna Afrika", []],
  ["ZA", "juzna-afrika", "South Africa", "South Africa", "en", "🇿🇦", "Južna Afrika", []],
  ["MZ", "mozambik", "Moçambique", "Mozambique", "pt", "🇲🇿", "Južna Afrika", []],

  // === OCEANIJA (3) ===
  ["AU", "australija", "Australia", "Australia", "en", "🇦🇺", "Oceanija", [src("abc-au", "ABC AU", "https://www.abc.net.au", "https://www.abc.net.au/news/feed/51120/rss.xml", "vijesti", "high", "en")]],
  ["NZ", "novi-zeland", "New Zealand", "New Zealand", "en", "🇳🇿", "Oceanija", []],
  ["PG", "papua-novagvineja", "Papua New Guinea", "Papua New Guinea", "en", "🇵🇬", "Oceanija", []],

  // === MIKRONACIJE I TERITORIJI (~30) ===
  ["AD", "andora", "Andorra", "Andorra", "ca", "🇦🇩", "Zapadna Europa", []],
  ["MC", "monako", "Monaco", "Monaco", "fr", "🇲🇨", "Zapadna Europa", []],
  ["SM", "san-marino", "San Marino", "San Marino", "it", "🇸🇲", "Zapadna Europa", []],
  ["VA", "vatikan", "Vaticano", "Vatican City", "it", "🇻🇦", "Zapadna Europa", []],
  ["MT", "malta", "Malta", "Malta", "mt", "🇲🇹", "Zapadna Europa", []],
  ["CY", "cipar", "Κύπρος", "Cyprus", "el", "🇨🇾", "Balkan", []],
  ["GL", "grenland", "Kalaallit Nunaat", "Greenland", "kl", "🇬🇱", "Sjeverna Europa", []],
  ["FO", "ferozki-otoci", "Føroyar", "Faroe Islands", "fo", "🇫🇴", "Sjeverna Europa", []],
  ["CV", "zelenortska", "Cabo Verde", "Cape Verde", "pt", "🇨🇻", "Zapadna Afrika", []],
  ["ST", "sao-tome", "São Tomé e Príncipe", "São Tomé & Príncipe", "pt", "🇸🇹", "Srednja Afrika", []],
  ["GW", "gvineja-bissau", "Guiné-Bissau", "Guinea-Bissau", "pt", "🇬🇼", "Zapadna Afrika", []],
  ["GQ", "ekvatorska-gvineja", "Guinea Ecuatorial", "Equatorial Guinea", "es", "🇬🇶", "Srednja Afrika", []],
  ["GM", "gambija", "Gambia", "Gambia", "en", "🇬🇲", "Zapadna Afrika", []],
  ["GN", "gvineja", "Guinée", "Guinea", "fr", "🇬🇳", "Zapadna Afrika", []],
  ["SL", "sijera-leone", "Sierra Leone", "Sierra Leone", "en", "🇸🇱", "Zapadna Afrika", []],
  ["LR", "liberija", "Liberia", "Liberia", "en", "🇱🇷", "Zapadna Afrika", []],
  ["CI", "slone-coast", "Côte d'Ivoire", "Ivory Coast", "fr", "🇨🇮", "Zapadna Afrika", []],
  ["BF", "burkina-faso", "Burkina Faso", "Burkina Faso", "fr", "🇧🇫", "Zapadna Afrika", []],
  ["TG", "togo", "Togo", "Togo", "fr", "🇹🇬", "Zapadna Afrika", []],
  ["BJ", "benin", "Bénin", "Benin", "fr", "🇧🇯", "Zapadna Afrika", []],
  ["NE", "niger", "Niger", "Niger", "fr", "🇳🇪", "Srednja Afrika", []],
  ["TD", "cad", "Tchad", "Chad", "fr", "🇹🇩", "Srednja Afrika", []],
  ["CM", "kamerun", "Cameroun", "Cameroon", "fr", "🇨🇲", "Srednja Afrika", []],
  ["CF", "srednjoafrika", "Centrafrique", "Central African Republic", "fr", "🇨🇫", "Srednja Afrika", []],
  ["CG", "kongo-b", "Congo", "Congo (Brazzaville)", "fr", "🇨🇬", "Srednja Afrika", []],
  ["CD", "kongo-k", "RD Congo", "DR Congo", "fr", "🇨🇩", "Srednja Afrika", []],
  ["GA", "gabon", "Gabon", "Gabon", "fr", "🇬🇦", "Srednja Afrika", []],
  ["AO", "angola", "Angola", "Angola", "pt", "🇦🇴", "Južna Afrika", []],
  ["DJ", "djibuti", "Djibouti", "Djibouti", "fr", "🇩🇯", "Istočna Afrika", []],
  ["ER", "eritreja", "ኤርትራ", "Eritrea", "ti", "🇪🇷", "Istočna Afrika", []],
  ["SO", "somalija", "Soomaaliya", "Somalia", "so", "🇸🇴", "Istočna Afrika", []],
  ["SS", "juza-sudan", "South Sudan", "South Sudan", "en", "🇸🇸", "Istočna Afrika", []],
  ["UG", "uganda", "Uganda", "Uganda", "en", "🇺🇬", "Istočna Afrika", []],
  ["RW", "ruanda", "Rwanda", "Rwanda", "rw", "🇷🇼", "Istočna Afrika", []],
  ["BI", "burundi", "Burundi", "Burundi", "fr", "🇧🇮", "Istočna Afrika", []],
  ["MW", "malavi", "Malawi", "Malawi", "en", "🇲🇼", "Istočna Afrika", []],
  ["ZM", "zambija", "Zambia", "Zambia", "en", "🇿🇲", "Južna Afrika", []],
  ["ZW", "zimbabve", "Zimbabwe", "Zimbabwe", "en", "🇿🇼", "Južna Afrika", []],
  ["BW", "botsvana", "Botswana", "Botswana", "en", "🇧🇼", "Južna Afrika", []],
  ["NA", "namibija", "Namibia", "Namibia", "en", "🇳🇦", "Južna Afrika", []],
  ["LS", "lesoto", "Lesotho", "Lesotho", "en", "🇱🇸", "Južna Afrika", []],
  ["SZ", "svazilend", "eSwatini", "Eswatini", "en", "🇸🇿", "Južna Afrika", []],
  ["MG", "madagaskar", "Madagasikara", "Madagascar", "mg", "🇲🇬", "Istočna Afrika", []],
  ["MU", "mauricijus", "Maurice", "Mauritius", "fr", "🇲🇺", "Istočna Afrika", []],
  ["KM", "komori", "Komori", "Comoros", "fr", "🇰🇲", "Istočna Afrika", []],
  ["SC", "sejceli", "Seychelles", "Seychelles", "fr", "🇸🇨", "Istočna Afrika", []],
  ["MR", "mauritanija", "موريتانيا", "Mauritania", "ar", "🇲🇷", "Zapadna Afrika", []],
  ["EH", "zapadna-sahara", "الصحراء الغربية", "Western Sahara", "ar", "🇪🇭", "Sjeverna Afrika", []],
  ["ML", "mali", "Mali", "Mali", "fr", "🇲🇱", "Zapadna Afrika", []],
  ["YE", "jemen", "اليمن", "Yemen", "ar", "🇾🇪", "Bliski Istok", []],
  ["OM", "oman", "عمان", "Oman", "ar", "🇴🇲", "Bliski Istok", []],
  ["BH", "bahrein", "البحرين", "Bahrain", "ar", "🇧🇭", "Bliski Istok", []],
  ["KW", "kuwait", "الكويت", "Kuwait", "ar", "🇰🇼", "Bliski Istok", []],
  ["BT", "butan", "འབྲུག", "Bhutan", "dz", "🇧🇹", "Južna Azija", []],
  ["MV", "maldivi", "Maldives", "Maldives", "dv", "🇲🇻", "Južna Azija", []],
  ["BN", "brunej", "Brunei", "Brunei", "ms", "🇧🇳", "Jugoistočna Azija", []],
  ["TL", "istocni-timor", "Timór-Leste", "East Timor", "pt", "🇹🇱", "Jugoistočna Azija", []],
  ["BS", "bahami", "Bahamas", "Bahamas", "en", "🇧🇸", "Karibi", []],
  ["BB", "barbados", "Barbados", "Barbados", "en", "🇧🇧", "Karibi", []],
  ["TT", "trinidad", "Trinidad i Tobago", "Trinidad & Tobago", "en", "🇹🇹", "Karibi", []],
  ["HT", "haiti", "Haïti", "Haiti", "fr", "🇭🇹", "Karibi", []],
  ["BZ", "belize", "Belize", "Belize", "en", "🇧🇿", "Srednja Amerika", []],
  ["GD", "grenada", "Grenada", "Grenada", "en", "🇬🇩", "Karibi", []],
  ["LC", "sveta-lucija", "Saint Lucia", "Saint Lucia", "en", "🇱🇨", "Karibi", []],
  ["AG", "antigva", "Antigua i Barbuda", "Antigua & Barbuda", "en", "🇦🇬", "Karibi", []],
  ["DM", "dominika-karibi", "Dominica", "Dominica", "en", "🇩🇲", "Karibi", []],
  ["KN", "sveti-kitts", "Saint Kitts i Nevis", "Saint Kitts & Nevis", "en", "🇰🇳", "Karibi", []],
  ["VC", "sveti-vincent", "Saint Vincent", "Saint Vincent & Grenadines", "en", "🇻🇨", "Karibi", []],
  ["FJ", "fidzi", "Fiji", "Fiji", "en", "🇫🇯", "Oceanija", []],
  ["SB", "salomonski-otoci", "Solomon Islands", "Solomon Islands", "en", "🇸🇧", "Oceanija", []],
  ["VU", "vanuatu", "Vanuatu", "Vanuatu", "bi", "🇻🇺", "Oceanija", []],
  ["WS", "samoa", "Samoa", "Samoa", "sm", "🇼🇸", "Oceanija", []],
  ["TO", "tonga", "Tonga", "Tonga", "to", "🇹🇴", "Oceanija", []],
  ["KI", "kiribati", "Kiribati", "Kiribati", "en", "🇰🇮", "Oceanija", []],
  ["FM", "mikronezija", "Micronesia", "Micronesia", "en", "🇫🇲", "Oceanija", []],
  ["MH", "marsalovi", "Marshall Islands", "Marshall Islands", "en", "🇲🇭", "Oceanija", []],
  ["PW", "palau", "Palau", "Palau", "en", "🇵🇼", "Oceanija", []],
  ["NR", "nauru", "Naoero", "Nauru", "na", "🇳🇷", "Oceanija", []],
  ["TV", "tuvalu", "Tuvalu", "Tuvalu", "tvl", "🇹🇻", "Oceanija", []],
  ["AS", "americanska-samoa", "American Samoa", "American Samoa", "en", "🇦🇸", "Oceanija", []],
  ["NC", "novi-kaledonija", "Nouvelle-Calédonie", "New Caledonia", "fr", "🇳🇨", "Oceanija", []],
  ["PF", "francuska-polinezija", "Polynésie française", "French Polynesia", "fr", "🇵🇫", "Oceanija", []],
  ["LU", "luksemburg", "Luxembourg", "Luxembourg", "fr", "🇱🇺", "Zapadna Europa", []],
  ["GY", "gvajana", "Guyana", "Guyana", "en", "🇬🇾", "Južna Amerika", []],
];

if (new Set(COUNTRY_DEFS.map(row=>row[0])).size !== COUNTRY_DEFS.length || new Set(COUNTRY_DEFS.map(row=>row[1])).size !== COUNTRY_DEFS.length) {
  throw new Error('Duplicate country code or slug — refusing lossy output.');
}
const countries = COUNTRY_DEFS.map(([code, slug, nameLocal, nameEn, language, flag, region, extraSources]) => {
  const std = stdSources(code, language);
  const sources = [...std, ...(extraSources || [])];
  return {
    code, slug, nameLocal, nameEn, language, flag, region,
    sources: sources.length,
    sourcesList: sources,
    rss: `https://gnk-asg.hr/gnk-aktual/media/${slug}/feed.xml`,
    url: `https://gnk-asg.hr/gnk-aktual/media/${slug}/`,
  };
});

// Cities
const CITIES = [
  ["zagreb", "Zagreb", "Zagreb", "hrvatska", "🏛️", 8],
  ["split", "Split", "Split", "hrvatska", "🏖️", 3],
  ["rijeka", "Rijeka", "Rijeka", "hrvatska", "⚓", 2],
  ["osijek", "Osijek", "Osijek", "hrvatska", "🌾", 2],
  ["sarajevo", "Sarajevo", "Sarajevo", "bih", "🏔️", 5],
  ["beograd", "Beograd", "Belgrade", "srbija", "🏰", 5],
  ["ljubljana", "Ljubljana", "Ljubljana", "slovenija", "🐉", 3],
  ["skopje", "Скопје", "Skopje", "makedonija", "🌉", 1],
  ["pristina", "Prishtina", "Pristina", "kosovo", "🏔️", 1],
  ["podgorica", "Podgorica", "Podgorica", "crna-gora", "🏛️", 1],
];

const cities = CITIES.map(([slug, nameLocal, nameEn, country, flag, sources]) => ({
  slug, nameLocal, nameEn, country, flag, sources,
  url: `https://gnk-asg.hr/gnk-aktual/grad/${slug}/`,
  rss: `https://gnk-asg.hr/gnk-aktual/grad/${slug}/feed.xml`,
}));

const output = {
  version: "AKTUAL_WORLD_COUNTRIES_V1_20261107",
  updatedAt: new Date().toISOString(),
  description: "Aktual Media — Svjetska mreža od 201 zemlje. Single-source-of-truth za sve zemlje, gradove, izvore i RSS feedove.",
  editor: {
    name: "Nermin Sefić",
    role: "Urednik i direktor",
    url: "https://gnk-asg.hr/nermin-sefic/"
  },
  publisher: {
    name: "AKTUAL MEDIA d.o.o.",
    url: "https://gnk-asg.hr/gnk-aktual/"
  },
  brand: {
    nositelj: "GNK ASG d.o.o.",
    grupacija: "GNK DINAMO Ltd. (Boulder, Colorado, USA)",
    izdavac: "AKTUAL MEDIA d.o.o.",
    hashtags: [
      "#NerminSefic", "#NerminSefić", "#GNKASG", "#GNKDinamoLtd", "#AktualMedia",
      "#NerminSeficGNKASG", "#NerminSeficGNKDinamoLtd", "#AktualMediaNerminSefic",
      "#AktualMediaGNKASG", "#AktualMediaGNKDinamoLtd"
    ]
  },
  count: countries.length,
  cities: cities.length,
  regions: [...new Set(countries.map(c => c.region))].sort(),
  countries,
  cities,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n');
console.log(`✅ Generirano: ${OUT}`);
console.log(`   ${countries.length} zemalja`);
console.log(`   ${cities.length} gradova`);
console.log(`   ${countries.reduce((a, c) => a + c.sources, 0)} ukupno izvora`);
console.log(`   ${output.regions.length} regija`);
