#!/usr/bin/env node
/**
 * AKTUAL MEDIA — matična kuća izdanja.
 *
 * Gradi:
 *   apps/portal/izdanja/index.html        — popis svih izdanja s karticama
 *   apps/portal/izdanja/sport/            — sportski desk (rezultati iz naslova izvora)
 *   apps/portal/izdanja/politika/         — politički desk
 *   apps/portal/izdanja/sigurnost/        — sigurnost i kibernetika
 *   apps/portal/data/izdanja.json         — podaci za blok na AKTUAL MEDIA
 *
 * Sve kartice imaju 5–6 rečenica opisa, vlastite hashtagove i poveznicu na
 * izdanje. Hub je polazna točka; svako izdanje ostaje na svom linku.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, longDate, shortDate, stampLocal, scoreFromTitle, truncate, themeFor, safeJson } from './lib.mjs';
import { CHANNELS, HUB, CONTACT, SOCIAL_IMAGE, CITY_SHORT, CSS as CHANNEL_CSS } from './build.mjs';
import { meshBlock, MESH_CSS } from '../../satellites/lib/network-v1.mjs';
import { HOUSE_CSS, houseRibbon } from '../../satellites/lib/house-style-v1.mjs';
import { spiderWeb, SPIDER_CSS } from '../../satellites/lib/spiderweb-v1.mjs';
import { WORLD_PORTALS } from '../../world/lib/registry.mjs';
import { ensureDeskTiles, tilePath, variantFor, deskArt, deskArtPath, deskArtSrcset } from './desk-art.mjs';
import { logoImg, logoFor, logoAlternate, channelLogoSlug, deskLogoSlug, logoJsonLd } from './brand.mjs';
import { buildCapitalPage, CAPITAL_CSS as CAPITAL_DETAIL_CSS, CONTINENT_COLOR } from './capital-detail.mjs';
import { buildAtlasPage, ATLAS_CSS } from './atlas.mjs';

/* Brojevi u naslovima se računaju iz podataka: 17 gradova, 14 jezika, 9 portala. */
const LANG_COUNT = new Set(CHANNELS.map((c) => c.lang)).size;
const HR_SMALL = { 5: 'pet', 6: 'šest', 7: 'sedam', 8: 'osam', 9: 'devet', 10: 'deset', 11: 'jedanaest', 12: 'dvanaest', 13: 'trinaest', 14: 'četrnaest', 15: 'petnaest', 16: 'šesnaest', 17: 'sedamnaest', 18: 'osamnaest', 19: 'devetnaest', 20: 'dvadeset' };
const hrCount = (n) => HR_SMALL[n] || String(n);
const cap = (word) => word[0].toUpperCase() + word.slice(1);

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const ROOT = join(APP, '..', '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const DATA = join(APP, 'data');
const OUT = join(PORTAL, 'izdanja');
const TODAY = new Date().toISOString().slice(0, 10);

const readJSON = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};
const channelData = (id) => readJSON(join(DATA, `${id}.json`), { items: [], updatedAt: '' });

/* Glavni gradovi: popis zemalja koje mreža pokriva i njihovih prijestolnica.
   Jedan izvor za stranicu, JSON i test — da se broj „17 zemalja, 14 izdanja"
   nikad ne prepisuje rukom. */
const CAPITALS = readJSON(join(ROOT, 'apps', 'region', 'capitals.json'), { capitals: [], standard: [] });

/* Alt tekstovi atlasa (specifični: kupola, obelisk, jezero) koriste se i na
   karticama prijestolnica, da opis slike ne bude generički. */
const ATLAS_ART = (() => {
  try {
    return JSON.parse(readFileSync(join(PORTAL, 'data', 'atlas-art-v1.json'), 'utf8')).images || [];
  } catch {
    return [];
  }
})();
const atlasArt = (slug) => ATLAS_ART.find((image) => image.slug === slug) || null;
const channelById = (id) => CHANNELS.find((channel) => channel.id === id) || null;

const REGION_META = {
  zagreb: {
    name: 'AKTUAL MEDIA KANAL ZAGREB',
    url: 'https://gnk-asg-kanal.pages.dev/',
    langLabel: 'hrvatski',
    kicker: 'Hrvatska · Zagreb',
    description: 'Hrvatski kanal AKTUAL MEDIA prati domaće medije i svakoga dana objavljuje deset provjerljivih tekstova: cjelovite analize, dnevni desk, rokove iz AI Acta i GDPR-a, brojke iz objavljenih bilanci, pojmovnik i odgovore na pitanja čitatelja. Svaki desk tekst nosi izvor i ograničenje tumačenja, a urednički pregledani tekstovi stoje odvojeno od automatski sastavljenih. Kanal je zamišljen kao upstream izvor koji AKTUAL MEDIA preuzima uz atribuciju, pa se svaka objava pojavljuje i u bloku „Iz GNK ASG KANALA“ na matičnoj stranici. Uz tekstove stoje feed, sitemap i metodologija, tako da je svaku tvrdnju moguće provjeriti do izvornika. Jezik je hrvatski, adresa je javna, a oznaka autorstva jasno razlikuje uredništvo od dnevnog stroja.',
    hashtags: ['#KanalZagreb', '#Hrvatska', '#Zagreb', '#AIACT', '#GDPR', '#AktualMedia']
  },
  beograd: {
    name: 'AKTUAL MEDIA KANAL BEOGRAD',
    url: 'https://gnk-asg-kanal-beograd.pages.dev/',
    langLabel: 'srpski',
    kicker: 'Srbija · Beograd',
    description: 'Srpsko izdanje AKTUAL MEDIA čita N1 Srbija, Danas, Nova.rs i Politiku i od svakog pronađenog teksta pravi osvrt na način izveštavanja. Cilj nije prepričati vest, već pokazati kako je naslovljena, šta je u sažetku ostalo neimenovano i šta treba proveriti pre zaključka. Svaki zapis nosi direktan link na izvornik i datum objave, a čitava arhiva je pretraživa kroz teme: politika, privreda, bezbednost i kibernetika, rat i eskalacije, energija i sport. Izdanje ima svoj feed, sitemap i stranicu metodologije, pa se može pratiti i mašinski i ljudski. Jezik je srpski, a grad u zaglavlju je Beograd — kanal ostaje jedan od gradskih kanala iste matične kuće. Kada izvor nije dostupan, izdanje to kaže i ne popunjava prazninu izmišljenim sadržajem.',
    hashtags: ['#KanalBeograd', '#Srbija', '#Beograd', '#N1', '#Danas', '#AktualMedia']
  },
  sarajevo: {
    name: 'AKTUAL MEDIA KANAL SARAJEVO',
    url: 'https://gnk-asg-kanal-sarajevo.pages.dev/',
    langLabel: 'bosanski',
    kicker: 'Bosna i Hercegovina · Sarajevo',
    description: 'Bosanskohercegovačko izdanje AKTUAL MEDIA prati N1 BiH, Klix, Oslobođenje i Avaz te svakoga dana gradi pregled osvrta na način izvještavanja. Posebna pažnja ide temama koje se u regiji lako preliju preko granice: političke tenzije, energetika, sigurnost i kibernetika, migracije i elementarne nepogode. Svaki tekst ima izravnu poveznicu na izvornik, datum i jasnu oznaku da su tvrdnje izvornika njegove, a ne naše. Izdanje ima vlastiti feed, sitemap, llms.txt i metodologiju, što ga čini upotrebljivim i za ljudsko čitanje i za strojno preuzimanje. Kartica na AKTUAL MEDIA vodi ovamo, a svaki osvrt vodi natrag na izvor i na matičnu kuću. Ako feed izostane, stranica prikazuje stvarno stanje umjesto popunjene praznine.',
    hashtags: ['#KanalSarajevo', '#BiH', '#Sarajevo', '#N1BiH', '#Klix', '#AktualMedia']
  },
  budimpesta: {
    name: 'AKTUAL MEDIA KANAL BUDAPEST',
    url: 'https://gnk-asg-kanal-budimpesta.pages.dev/',
    langLabel: 'mađarski',
    kicker: 'Mađarska · Budimpešta',
    description: 'Mađarsko izdanje AKTUAL MEDIA čita Telex, 444, HVG i Portfolio i svakodnevno objavljuje osvrte na način izvještavanja. Fokus je na gospodarstvu, proračunu, inflaciji i energetici, ali i na političkim odlukama koje mijenjaju okvir poslovanja u regiji. Svaki zapis povezuje izvornik i zadržava njegov naslov i sažetak kao predmet analize, bez preuzimanja cijelog teksta. Izdanje je na mađarskom jeziku, s vlastitim feedom, sitemapom i stranicom metodologije, pa ga mogu pratiti i čitatelji i agregatori. Kartica na matičnoj stranici vodi na ovo izdanje, a svaki osvrt vodi natrag na izvor. Kada izvor padne, izdanje bilježi propust i nastavlja s onim što je stvarno dostupno.',
    hashtags: ['#KanalBudimpesta', '#Magyarorszag', '#Budapest', '#Telex', '#HVG', '#AktualMedia']
  },
  ljubljana: {
    name: 'AKTUAL MEDIA KANAL LJUBLJANA',
    url: 'https://gnk-asg-kanal-ljubljana.pages.dev/',
    langLabel: 'slovenski',
    kicker: 'Slovenija · Ljubljana',
    description: 'Slovensko izdanje AKTUAL MEDIA prati STA, Delo, Dnevnik i Siol.net i iz svakog pronađenog teksta izvlači ono što je provjerljivo. Osvrti se bave načinom izvještavanja: kako je naslovljen tekst, koje brojke stoje bez izvora i gdje sažetak obećava više nego što tijelo teksta daje. Izdanje pokriva gospodarstvo, energetiku, politiku, sigurnost i sport, a svaka tema ima svoju stranicu i vlastiti popis osvrta. Uz feed i sitemap, tu je i llms.txt za strojne čitatelje te metodologija koja objašnjava granicu između našeg osvrta i tvrdnje izvornika. Jezik je slovenski, grad u zaglavlju je Ljubljana, a poveznica na matičnu kuću stoji na svakoj stranici.',
    hashtags: ['#KanalLjubljana', '#Slovenija', '#Ljubljana', '#STA', '#Delo', '#AktualMedia']
  },
  rim: {
    name: 'AKTUAL MEDIA KANAL ROMA',
    url: 'https://gnk-asg-kanal-rim.pages.dev/',
    langLabel: 'talijanski',
    kicker: 'Italija · Roma',
    description: 'Talijansko izdanje AKTUAL MEDIA čita ANSA, la Repubblicu, Il Post i Il Sole 24 Ore i gradi dnevni pregled osvrta na način informiranja. Posebno se prate gospodarstvo i tržišta, energetika, europske odluke i unutarnja politika, jer talijanske tema često određuju okvir za cijelu regiju. Svaki tekst zadržava izvorni naslov i sažetak, uz izravnu poveznicu na izvor i datum objave. Izdanje ima vlastiti feed, sitemap i metodologiju na talijanskom, a kartica na AKTUAL MEDIA vodi ovamo. Oznaka autorstva jasno odvaja naš osvrt od tvrdnji izvornika, a svaka stranica nosi iste standarde pristupačnosti i SEO oznaka kao i ostala izdanja.',
    hashtags: ['#CanaleRoma', '#Italia', '#Roma', '#ANSA', '#IlPost', '#AktualMedia']
  },
  sofija: {
    name: 'AKTUAL MEDIA KANAL SOFIJA',
    url: 'https://gnk-asg-kanal-sofija.pages.dev/',
    langLabel: 'bugarski',
    kicker: 'Bugarska · Sofija',
    description: 'Bugarsko izdanje AKTUAL MEDIA prati BTA, Capital, Mediapool i Dnevnik i svakoga dana objavljuje osvrte na način izvještavanja. Teme su gospodarstvo, energetika, europska sredstva, politička stabilnost te sigurnost i kibernetika, s naglaskom na odluke koje mijenjaju uvjete poslovanja. Svaki zapis nosi izvorni naslov, sažetak, datum i poveznicu na izvor, bez preuzimanja cijelog teksta. Izdanje je na bugarskom jeziku, s vlastitim feedom, sitemapom i llms.txt, pa je čitljivo i ljudima i strojevima. Kartica na matičnoj stranici vodi na ovo izdanje, a svaka stranica vodi natrag na AKTUAL MEDIA. Kada izvor zakaže, izdanje to navodi i ne izmišlja vijest.',
    hashtags: ['#KanalSofija', '#Bulgaria', '#Sofia', '#BTA', '#Capital', '#AktualMedia']
  },
  bukurest: {
    name: 'AKTUAL MEDIA KANAL BUCUREȘTI',
    url: 'https://gnk-asg-kanal-bukurest.pages.dev/',
    langLabel: 'rumunjski',
    kicker: 'România · București',
    description: 'Rumunjsko izdanje AKTUAL MEDIA čita Agerpres, HotNews, Ziarul Financiar și Profit.ro și publică zilnic comentarii despre modul de relatare. Accentul cade pe economie, energie, fonduri europene, politică și securitate cibernetică, adică pe subiectele care schimbă condițiile de business în regiune. Fiecare articol păstrează titlul și rezumatul sursei, cu link direct și dată, fără a prelua textul integral. Ediția are flux propriu, sitemap și metodologie în limba română, iar cardul din AKTUAL MEDIA duce aici. Atribuirea este explicită: afirmațiile sursei rămân ale sursei, iar comentariul nostru privește felul în care este scrisă știrea. Când o sursă nu răspunde, ediția spune acest lucru în loc să inventeze conținut.',
    hashtags: ['#CanalulBucuresti', '#Romania', '#Bucuresti', '#Agerpres', '#HotNews', '#AktualMedia']
  }
};

/* Globalna izdanja: pet kontinenata izvan regije. Opisi su pisani za svako
   izdanje pojedinačno — govore što se čita i što se od toga radi, bez ocjena
   o zemljama i bez tvrdnji koje izdanje ne može držati. */
const GLOBAL_META = {
  nairobi: {
    langLabel: 'engleski', kicker: 'Kenija · Nairobi',
    description: 'Kenijsko izdanje AKTUAL MEDIA čita Daily Nation, The Standard, Capital FM i KBC te od svakog pronađenog teksta gradi osvrt na način izvještavanja. Fokus je na istočnoj Africi: trgovina, tehnologija plaćanja, sigurnost i javne financije. Svaki zapis nosi izravnu poveznicu na izvornik i datum, a izdanje ima vlastiti feed, sitemap i stranicu metodologije. Kada izvor nije dostupan, izdanje to kaže umjesto da popuni prazninu.',
    hashtags: ['#KanalNairobi', '#Kenya', '#Nairobi', '#EastAfrica', '#AktualMedia']
  },
  jakarta: {
    langLabel: 'indonezijski', kicker: 'Indonezija · Jakarta',
    description: 'Indonezijsko izdanje AKTUAL MEDIA prati ANTARA, Kompas, Detik i Tempo. Cilj nije prepričati vijest, već pokazati kako je naslovljena, što je u sažetku ostalo neimenovano i što treba provjeriti prije zaključka. Teme su politika, gospodarstvo, energetika i kibernetička sigurnost, s naglaskom na odluke koje se tiču cijelog arhipelaga. Izdanje ima vlastiti feed, sitemap i metodologiju, a svaki osvrt vodi natrag na izvornik.',
    hashtags: ['#KanalJakarta', '#Indonesia', '#Jakarta', '#AktualMedia']
  },
  newyork: {
    langLabel: 'engleski', kicker: 'Sjedinjene Američke Države · New York',
    description: 'Američko izdanje AKTUAL MEDIA čita The New York Times, NPR, The Wall Street Journal i Bloomberg. Osvrt se bavi načinom izvještavanja: kojim se dokumentom potkrepljuje brojka, je li tvrdnja pripisana imenovanom izvoru i što je u tekstu ostalo bez konteksta. Izdanje pokriva tržišta, politiku i tehnologiju, a svaki zapis nosi poveznicu na izvornik i datum objave. Vlastiti feed i sitemap čine ga upotrebljivim i za strojno praćenje.',
    hashtags: ['#KanalNewYork', '#USA', '#NewYork', '#AktualMedia']
  },
  saopaulo: {
    langLabel: 'portugalski', kicker: 'Brazil · São Paulo',
    description: 'Brazilsko izdanje AKTUAL MEDIA čita Folha de S.Paulo, G1, UOL i Exame. Osvrt opisuje kako je tekst naslovljen i što čitatelj treba provjeriti prije zaključka, uz izravnu poveznicu na izvornik i datum objave. Teme su gospodarstvo, javne politike, sigurnost i tehnologija, s naglaskom na odluke koje se osjete izvan velikih gradova. Izdanje ima vlastiti feed, sitemap i stranicu metodologije na portugalskom.',
    hashtags: ['#KanalSaoPaulo', '#Brasil', '#SaoPaulo', '#AktualMedia']
  },
  sydney: {
    langLabel: 'engleski', kicker: 'Australija · Sydney',
    description: 'Australsko izdanje AKTUAL MEDIA prati ABC, The Sydney Morning Herald, Guardian Australia i news.com.au. Osvrt se zadržava na tome kako je priča ispričana: koja je brojka potkrijepljena dokumentom, koji je izvor imenovan i što nedostaje. Teme su Pacifik, tržišta, klima i javna politika, uz vlastiti feed, sitemap i metodologiju. Svaki zapis vodi na izvornik i ne prenosi tvrdnje izvora kao svoje.',
    hashtags: ['#KanalSydney', '#Australia', '#Sydney', '#AktualMedia']
  },
  singapur: {
    langLabel: 'engleski', kicker: 'Singapur · Singapur',
    description: 'Singapursko izdanje AKTUAL MEDIA čita CNA, The Straits Times, The Business Times i Mothership. Fokus je na trgovini, financijama, lučkoj i tehnološkoj infrastrukturi te na odlukama koje se tiču cijele regije. Osvrt ne prepričava vijest, nego provjerava kako je izvor došao do brojke i što je ostalo neimenovano. Izdanje ima vlastiti feed, sitemap i metodologiju, a svaki zapis nosi poveznicu na izvornik.',
    hashtags: ['#KanalSingapur', '#Singapore', '#AktualMedia']
  },
  kairo: {
    langLabel: 'arapski', kicker: 'Egipat · Kairo',
    description: 'Egipatsko izdanje AKTUAL MEDIA čita Mada Masr, Youm7 i Al-Masry Al-Youm te prati arapsko izvještavanje o regiji. Osvrt se piše na arapskom i bavi se načinom izvještavanja: kako je naslovljeno, koja je brojka ostala bez dokumenta i koji izvor nije imenovan. Svaki zapis nosi izravnu poveznicu na izvornik i datum objave, a izdanje ima vlastiti feed, sitemap i stranicu metodologije.',
    hashtags: ['#KanalKairo', '#Egypt', '#Cairo', '#AktualMedia']
  },
  tokio: {
    langLabel: 'japanski', kicker: 'Japan · Tokio',
    description: 'Japansko izdanje AKTUAL MEDIA prati NHK, Asahi Shimbun, Mainichi i ITmedia. Osvrt se piše na japanskom i provjerava kako je priča izložena: koji je dokument iza brojke, je li izvor imenovan i što tekst ne kaže. Teme su gospodarstvo, tehnologija, sigurnosna politika i društvo, uz vlastiti feed, sitemap i metodologiju. Engleska verzija svake stranice objašnjava izdanje bez prevođenja samih tekstova.',
    hashtags: ['#KanalTokio', '#Japan', '#Tokyo', '#AktualMedia']
  },
  peking: {
    langLabel: 'kineski', kicker: 'Kina · Peking',
    description: 'Kinesko izdanje AKTUAL MEDIA čita kineske redakcije međunarodnih kuća — BBC 中文, DW 中文, 纽约时报中文网 — te 中国新闻网. Osvrt se piše na kineskom i bavi se načinom izvještavanja, a ne prepričavanjem vijesti: koja je brojka bez dokumenta, koji izvor nije imenovan i što čitatelj treba sam provjeriti. Izdanje ima vlastiti feed, sitemap i stranicu metodologije te engleski ulaz u svaku temu.',
    hashtags: ['#KanalPeking', '#China', '#Beijing', '#AktualMedia']
  }
};

export const EDITION_META = { ...REGION_META, ...GLOBAL_META };

const DESKS = {
  sport: {
    name: 'SPORT — AKTUAL MEDIA',
    nav: 'Sport',
    title: 'Sportski desk: rezultati i osvrti iz cijele regije',
    lang: 'hr',
    theme: 'sport',
    description: 'Sportski desk skuplja sportske tekstove iz svih gradskih kanala AKTUAL MEDIA i prikazuje rezultate onako kako su ih objavili izvori. Rezultat se izvlači iz naslova samo kada je u naslovu stvarno zapisan, pa nema izmišljenih tablica ni bodovanja. Uz svaki rezultat stoji izvor, datum i poveznica na izvornik, a klik vodi na osvrt na način izvještavanja. Stranica se osvježava iz dnevno zapisanih podataka i ne povlači skrivene API-je ni kolačiće. Služi kao brz pregled regionalnog sporta, a detalji ostaju kod matičnih klubova i medija.',
    hashtags: ['#Sport', '#Rezultati', '#AktualMedia', '#GNKASG', '#Regija']
  },
  politika: {
    name: 'POLITIKA — AKTUAL MEDIA',
    nav: 'Politika',
    title: 'Politički desk: odluke, izbori i okvir poslovanja',
    lang: 'hr',
    theme: 'politika',
    description: 'Politički desk okuplja političke tekstove iz svih gradskih kanala i pokazuje kako su naslovljeni u pojedinim zemljama. Cilj je usporedba okvira: ista odluka u Zagrebu, Beogradu, Sarajevu, Budimpešti, Ljubljani, Rimu, Sofiji i Bukureštu ne izgleda jednako. Svaki zapis nosi izvor, datum i izravnu poveznicu, a osvrt se bavi načinom izvještavanja, ne političkim stavom redakcije. Stranica ne donosi preporuke ni ocjene stranaka; donosi pitanja koja treba postaviti prije zaključka. Ažurira se iz istih dnevnih podataka kao i gradski kanali.',
    hashtags: ['#Politika', '#Izbori', '#Regija', '#AktualMedia', '#GNKASG']
  },
  biznis: {
    name: 'BUSINESS — AKTUAL MEDIA',
    nav: 'Business',
    title: 'Business desk: tržišta, bilance i kapital regije',
    lang: 'hr',
    theme: 'ekonomija',
    description: 'Business desk skuplja poslovne tekstove iz svih gradskih kanala AKTUAL MEDIA i pokazuje što je stvarno objavljeno, a što je najavljeno. Prate se tržišta, bilance, investicije, kamate i koncentracija kapitala u zemljama mreže. Svaki zapis nosi izvor, datum i poveznicu na izvornik, a osvrt se bavi time kako je brojka iz naslova objašnjena u tijelu teksta. Stranica ne daje investicijske preporuke i ne ocjenjuje tvrtke; daje pitanja koja treba postaviti prije odluke. Ažurira se iz istih dnevnih podataka kao i gradski kanali.',
    hashtags: ['#Business', '#Trzista', '#Bilance', '#AktualMedia', '#GNKASG']
  },
  tehnologija: {
    name: 'TEHNOLOGIJA — AKTUAL MEDIA',
    nav: 'Tehnologija',
    title: 'Tehnološki desk: AI, platforme i infrastruktura',
    lang: 'hr',
    theme: 'ai',
    description: 'Tehnološki desk prati umjetnu inteligenciju, platforme, podatkovnu infrastrukturu i digitalizaciju javnog sektora u regiji. Osvrti razlikuju objavljeni proizvod od najave, pilot-projekt od primjene i brojku iz priopćenja od brojke iz izvješća. Uz svaki zapis stoji poveznica na izvornik i datum, pa se tvrdnja može provjeriti do izvora. Desk pokriva i teme koje utječu na poslovanje: regulaciju AI-ja, kibernetičku otpornost i nabavu infrastrukture. Stranica se osvježava iz dnevnih podataka svih gradskih kanala.',
    hashtags: ['#Tehnologija', '#UmjetnaInteligencija', '#Platforme', '#AktualMedia', '#GNKASG']
  },
  putovanja: {
    name: 'PUTOVANJA — AKTUAL MEDIA',
    nav: 'Putovanja',
    title: 'Putovanja: destinacije, sezona i cijena puta',
    lang: 'hr',
    theme: '*',
    filter: /putovanj|turiz|hotel|destinacij|plaž|plaz|letov|krstar|aviokart|aerodrom|viza|izlet|advent|sezon|gostiju|noćenj|nocenj|kampu|kamp|planinar|bicikl|vlak|trajekt/i,
    description: 'Putni desk okuplja tekstove o destinacijama, sezoni i cijeni putovanja iz svih gradskih kanala AKTUAL MEDIA. Ne piše vodiče po narudžbi i ne preporučuje agencije: prati što je objavljeno o dolascima, cijenama, prometu i lokalnim odlukama koje mijenjaju put. Svaki zapis nosi izvor, datum i poveznicu na izvornik, pa se brojka o posjetiteljima ili cijeni može provjeriti. Posebna pažnja ide željeznici, trajektima i sezonskom najmu, gdje se najave često razlikuju od stanja na terenu. Desk se osvježava iz istih dnevnih podataka kao i gradski kanali.',
    hashtags: ['#Putovanja', '#Turizam', '#Destinacije', '#AktualMedia', '#GNKASG']
  },
  ljubimci: {
    name: 'LJUBIMCI — AKTUAL MEDIA',
    nav: 'Ljubimci',
    title: 'Ljubimci: udomljavanje, skrb i pravila u gradu',
    lang: 'hr',
    theme: '*',
    filter: /ljubimc|kućni ljubim|kucni ljubim|veterinar|udomlj|životinj|zivotinj|azil|kinolog|pas\b|psa\b|pse\b|psima|mačk|mack|ptic|akvarij|čipir|cipir|steriliz/i,
    description: 'Desk ljubimaca prati tekstove o udomljavanju, veterinarskoj skrbi i gradskim pravilima za životinje. Ne objavljuje oglase ni cijene usluga kao vijesti: bilježi što je najavljeno, što je provedeno i koje brojke izvori navode. Posebno se prate azili, mikročipiranje, sterilizacija i sezonske opasnosti, jer se u tim temama najave i stvarno stanje često razlikuju. Svaki zapis ima izvor, datum i izravnu poveznicu, a osvrt ostaje na načinu izvještavanja. Desk se puni iz dnevnih podataka svih gradskih kanala.',
    hashtags: ['#Ljubimci', '#Udomljavanje', '#Veterina', '#AktualMedia', '#GNKASG']
  },
  svijet: {
    name: 'SVIJET — AKTUAL MEDIA',
    nav: 'Svijet',
    title: 'Svijet: globalni okvir za lokalne odluke',
    lang: 'hr',
    theme: '*',
    filter: /svijet|svet\b|global|europ|\beu\b|nato|kijev|ukrajin|gaza|izrael|iran|\bsad\b|amerik|kina|kinesk|rusij|moskv|trump|putin|migracij|klim|opec|naft|tarif|carin|un\b|vijeće sigurnosti/i,
    description: 'Desk Svijet povezuje vanjske teme s lokalnim posljedicama: energetiku, trgovinske mjere, migracije, sigurnost i klimu. Ne donosi stavove o sukobima i ne prenosi tvrdnje bez izvora; bilježi kako je pojedini događaj naslovljen u zemljama mreže i što se od toga može provjeriti. Uz svaki zapis stoje izvor, datum i poveznica na izvornik, a brojke se ne zaokružuju bez konteksta. Desk služi kao okvir za razumijevanje lokalnih odluka, ne kao komentar svjetske politike. Ažurira se iz dnevnih podataka gradskih kanala.',
    hashtags: ['#Svijet', '#Globalno', '#Sigurnost', '#AktualMedia', '#GNKASG']
  },
  moda: {
    name: 'TJEDNIK MODE — AKTUAL MEDIA',
    nav: 'Moda',
    title: 'Modni desk: stil, dizajn i brendovi regije',
    lang: 'hr',
    theme: 'drustvo',
    filter: /moda|modn|dizajn|stil|kolekcij|revij|fashion|brend|tkanin|obuć|obuc|nakladn/i,
    description: 'Modni desk okuplja tekstove o modi, dizajnu i stilu iz svih gradskih kanala AKTUAL MEDIA. Ne donosi ocjene ukusa i ne prenosi PR tekstove kao vijesti: prati što je objavljeno, tko potpisuje kolekciju i kakav je poslovni model iza brenda. Posebna pažnja ide lokalnim dizajnerima, tekstilnoj proizvodnji i tržištu luksuza u regiji. Svaki zapis nosi izvor, datum i izravnu poveznicu, a fotografije se ne preuzimaju bez prava. Desk je tjedni pregled, a ne katalog proizvoda.',
    hashtags: ['#Moda', '#Dizajn', '#Stil', '#AktualMedia', '#GNKASG']
  },
  sigurnost: {
    name: 'SIGURNOST I KIBERNETIKA',
    nav: 'Sigurnost',
    title: 'Sigurnosni desk: obavještajne teme, kibernetika i preuzimanja',
    lang: 'hr',
    theme: 'sigurnost',
    description: 'Sigurnosni desk prati tekstove o obavještajnim službama, kibernetičkim incidentima, dezinformacijama i spajanjima tvrtki u cijeloj regiji. Osvrti ne prenose neutemeljene tvrdnje kao činjenice: svaka sumnja ostaje sumnja, a svaki dokument mora biti imenovan. Posebna pažnja posvećena je preuzimanjima i koncentracijama, gdje se u medijima često miješaju prijava, odobrenje i stvarno vlasništvo. Stranica povezuje izvornike i označava što je provjerljivo, a što je interpretacija. Ažurira se iz dnevnih podataka svih gradskih kanala i ima vlastiti feed.',
    hashtags: ['#Sigurnost', '#Kibernetika', '#Obavjestaj', '#Preuzimanja', '#AktualMedia', '#GNKASG']
  }
};

/* ---------- zajednički okvir portala ---------- */

/* Jedan kanonski WebSite čvor po stranici. Stranice /izdanja/ dijele isti
   entitet, pa ga shell dodaje sam; proslijeđeni graf ne smije nositi
   drugi (inače stranica ima dva ili nijedan). */
const WEBSITE_NODE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://gnk-asg.hr/#website',
  name: 'GNK ASG',
  url: 'https://gnk-asg.hr/',
  inLanguage: ['hr', 'en'],
  publisher: {
    '@type': 'Organization',
    '@id': 'https://gnk-asg.hr/#gnk-asg',
    name: 'GNK ASG d.o.o.',
    url: 'https://gnk-asg.hr/',
  },
};
/* AKTUAL MEDIA is the publisher entity; GNK ASG remains the separate corporate WebSite. */
const MEDIA_ID = 'https://gnk-asg.hr/gnk-aktual/#news-organization';
const MEDIA_ENTITY_NODE = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  '@id': MEDIA_ID,
  name: 'AKTUAL MEDIA d.o.o.',
  /* Inačice imena koje ljudi stvarno upisuju u tražilicu. Bez njih Google
     "Aktual mediji" i "Aktual Media" ne povezuje s istim izdavačem. */
  alternateName: [
    'AKTUAL MEDIA',
    'Aktual Media',
    'Aktual mediji',
    'Aktual medija',
    'Aktual Media d.o.o.',
    'AKTUAL MEDIA KANAL',
    'AKTUAL MEDIA KANAL ZAGREB'
  ],
  url: 'https://gnk-asg.hr/gnk-aktual/',
  /* Znak izdavača je znak AKTUAL MEDIA, ne znak matičnog društva GNK ASG. */
  logo: logoJsonLd('aktual-media-hr', { url: 'https://gnk-asg.hr' }),
  parentOrganization: {
    '@type': 'Organization',
    '@id': 'https://gnk-asg.hr/#gnk-asg',
    name: 'GNK ASG d.o.o.',
    url: 'https://gnk-asg.hr/'
  },
  /* Izdanja su dio istog entiteta — popis je u mediaItems(), pa se ne
     održava ručno na dva mjesta. */
  publishingPrinciples: 'https://gnk-asg.hr/gnk-aktual/metodologija/'
};
const MEDIA_EXTRA_DESTINATIONS = [
  { name: 'BUSINESS TJEDNIK', url: 'https://gnk-asg-tjednik.pages.dev/' },
  { name: 'AKTUAL MEDIA RADIO', url: 'https://gnk-asg.hr/radio/' },
  { name: 'Podatkovni desk', url: 'https://gnk-asg.hr/aktual-media/' },
  { name: 'Galerija', url: 'https://gnk-asg.hr/galerija/' },
  { name: 'Regionalni kanali', url: 'https://gnk-asg.hr/kanal/' }
];
const mediaItems = () => [
  ...CHANNELS.map((c) => ({ name: c.title, url: c.base })),
  ...WORLD_PORTALS.map((p) => ({ name: p.name, url: p.base })),
  ...Object.entries(DESKS).map(([id, d]) => ({ name: d.name, url: `https://gnk-asg.hr/izdanja/${id}/` })),
  ...MEDIA_EXTRA_DESTINATIONS
];
const isWebsiteNode = (node) => (Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']]).includes('WebSite');

function portalShell({ title, description, path, keywords, tags = [], jsonld = [], body, cssExtra = '', image = SOCIAL_IMAGE, imageAlt = 'AKTUAL MEDIA', logos = [], canonicalPath = '', lang = 'hr', alternates = [], preload = null, feeds = [], geo = null }) {
  const canonical = canonicalPath || `${HUB}${path}`;
  /* HUB je /izdanja/, a plohe i naslovnice žive u korijenu portala, pa se
     apsolutna adresa gradi iz ishodišta, ne iz putanje huba. */
  const ORIGIN = new URL(HUB).origin;
  const shareImage = /^https?:/.test(image) ? image : `${ORIGIN}${image}`;
  /* Ključne riječi: bez dvostrukih unosa i bez imena urednika — autorstvo
     stoji u author/editor metama i u JSON-LD-u, ne u popisu pojmova. */
  const keywordList = [...new Map(keywords
    .map((word) => String(word).trim())
    .filter((word) => word && !/nermin|sefi[cć]/i.test(word))
    .map((word) => [word.toLowerCase(), word])).values()];
  const graph = [WEBSITE_NODE, MEDIA_ENTITY_NODE, ...jsonld.filter((node) => !isWebsiteNode(node)).map((node) =>
    node['@type'] === 'CollectionPage'
      ? { ...node, publisher: { '@id': MEDIA_ID }, about: { '@id': MEDIA_ID } }
      : node
  )];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(truncate(description, 300))}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
${geo ? `<meta name="geo.placename" content="${esc(geo.placename)}">
${geo.country ? `<meta name="geo.country" content="${esc(geo.country)}">\n` : ''}` : ''}
<meta name="hashtags" content="${esc([...new Set(tags.filter((t) => String(t).startsWith('#')).map((t) => String(t)))].join(' '))}">
<meta name="keywords" content="${esc(keywordList.join(', '))}">
${[...new Map(tags.filter((t) => String(t).startsWith('#')).map((t) => [String(t).toLowerCase(), String(t)])).values()].map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('\n')}
<meta property="og:image:alt" content="${esc(imageAlt)}">
<link rel="canonical" href="${canonical}">
${alternates.map((alt) => `<link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}">`).join('\n')}
${preload ? `<link rel="preload" as="image" href="${preload.href}"${preload.imagesrcset ? ` imagesrcset="${preload.imagesrcset}"` : ''}${preload.imagesizes ? ` imagesizes="${preload.imagesizes}"` : ''} fetchpriority="high">` : ''}
${feeds.map((feed) => `<link rel="alternate" type="${feed.type}" title="${esc(feed.title)}" href="${feed.href}">`).join('\n')}
${logos.map((slug) => logoAlternate(slug)).filter(Boolean).join('\n')}
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(truncate(description, 300))}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${shareImage}">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(truncate(description, 200))}">
<meta name="twitter:image" content="${shareImage}">
<meta name="twitter:image:alt" content="${esc(title)}">
<meta name="twitter:image:alt" content="${esc(imageAlt)}">
<link rel="sitemap" type="application/xml" href="/izdanja/sitemap.xml">
${graph.map((n) => `<script type="application/ld+json">${safeJson(n)}</script>`).join('\n')}
<style>
.iz{--bg:#071426;--gold:#e0bd69;--ink:#e8edf3;--muted:#a9b6c6;background:#061019;color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;margin:0}
.iz a{color:inherit;text-decoration:none}.iz a:hover{text-decoration:underline}
.iz-wrap{max-width:1180px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
.iz-top{background:#04101d;border-bottom:1px solid #1b3550;font:600 11px/1.4 system-ui;letter-spacing:.16em;text-transform:uppercase;color:#8fa3ba}
.iz-top .iz-wrap{display:flex;justify-content:space-between;gap:12px;padding-top:10px;padding-bottom:10px}
.iz-top a{color:var(--gold)}
.iz-house{display:inline-flex;align-items:center;gap:9px;min-width:0}
.iz-house img{height:22px;width:auto;max-width:120px;border-radius:2px;flex:none}
@media(max-width:560px){.iz-house img{height:18px}}
.iz-head{padding:clamp(26px,5vw,54px) 0 22px;border-bottom:1px solid #1b3550}
.iz-head .k{font:600 11px/1.4 system-ui;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}
.iz-head h1{font:700 clamp(30px,5vw,52px)/1.04 Georgia,"Times New Roman",serif;margin:8px 0 10px;letter-spacing:-.01em}
.iz-desk-logo{display:block;width:auto;height:56px;max-width:280px;object-fit:contain;object-position:left center;border-radius:6px;margin-bottom:14px}
.iz-head .iz-home-h1{font:700 clamp(20px,2.6vw,26px)/1.2 Georgia,"Times New Roman",serif;margin:6px 0 4px;letter-spacing:-.01em}
.iz-head .iz-home-h1 a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(233,198,108,.45)}
.iz-head .iz-home-h1 a:hover{color:var(--gold)}
.iz-head p{max-width:78ch;color:var(--muted);margin:0}
.iz-nav{display:flex;flex-wrap:wrap;gap:8px 18px;padding:14px 0;font:600 12px/1.5 system-ui;letter-spacing:.08em;text-transform:uppercase;color:#cdd8e5}
.iz-nav a{color:#cdd8e5}.iz-nav a[aria-current]{color:var(--gold)}
.iz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;padding:26px 0 10px}
.iz-card{display:flex;flex-direction:column;gap:10px;background:#0b1d31;border:1px solid #1e3b58;border-radius:14px;padding:20px;overflow:hidden}
.iz-cover{display:block;width:calc(100% + 40px);margin:-20px -20px 6px;aspect-ratio:16/9;object-fit:cover;object-position:center 40%;background:#12283d}
.iz-hero{margin:22px 0 0;padding:0}
.iz-hero picture,.iz-hero img{display:block;width:100%}
.iz-hero img{aspect-ratio:16/9;height:auto;object-fit:cover;border-radius:16px;border:1px solid #1e3b58;background:#12283d}
.iz-hero figcaption{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin:10px 2px 0;font:600 11px/1.5 system-ui;letter-spacing:.04em;color:#8296ad}
.iz-hero figcaption b{color:var(--gold);font:700 11px/1.5 system-ui;letter-spacing:.16em;text-transform:uppercase}
.iz-hero figcaption span{max-width:80ch}
.iz-net-g a img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:6px;background:#0e2237;margin-bottom:3px}
.iz-thumb-p1{object-position:50% 50%}.iz-thumb-p2{object-position:18% 32%}.iz-thumb-p3{object-position:82% 32%}
.iz-thumb-p4{object-position:50% 20%}.iz-thumb-p5{object-position:30% 78%}.iz-thumb-p6{object-position:72% 76%}.iz-card--lead{grid-column:span 2}
.iz-card .flag{display:flex;align-items:center;gap:8px;font:600 10px/1.4 system-ui;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
.iz-card h2{font:700 22px/1.2 Georgia,serif;margin:0}
.iz-card p{margin:0;color:#c3cede;font-size:14.5px}
.iz-card .acts{display:flex;flex-wrap:wrap;gap:10px;margin-top:auto;padding-top:8px}
.iz-card .btn{font:600 12px/1 system-ui;letter-spacing:.04em;background:var(--gold);color:#08131f;padding:10px 13px;border-radius:999px}
.iz-card .btn.ghost{background:transparent;border:1px solid #2c4a6b;color:#dbe5f1}
.iz-logo{display:block;width:auto;height:34px;max-width:220px;object-fit:contain;object-position:left center;border-radius:4px}
.iz-brand-masters{list-style:none;padding:0;margin:0 0 12px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.iz-brand-master a{display:block;background:#f4f1e8;border-radius:10px;overflow:hidden;border:1px solid #2c4a6b}
.iz-brand-master img{display:block;width:100%;height:auto}
.iz-brand-master span{display:block;padding:7px 10px;background:#08182a;color:#e0bd69;font:600 10px/1.3 system-ui;letter-spacing:.14em;text-transform:uppercase}
.iz-brand-grid{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.iz-brand-grid a{display:block;background:#f4f1e8;border:1px solid #2c4a6b;border-radius:8px;overflow:hidden}
.iz-brand-grid img{display:block;width:100%;height:auto}
.iz-brand-grid span{display:block;padding:6px 8px;background:#08182a;color:#c3cede;font:600 9.5px/1.3 system-ui;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:1000px){.iz-brand-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:620px){.iz-brand-masters{grid-template-columns:1fr}.iz-brand-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.iz-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none;font:600 10px/1 system-ui;letter-spacing:.05em;text-transform:uppercase;color:#9fb0c4}
.iz-tags li{border:1px solid #25435f;border-radius:999px;padding:5px 8px}
.iz-latest{font:400 12px/1.5 system-ui;color:#9fb0c4;border-top:1px dashed #24425f;padding-top:8px}
.iz-latest b{color:var(--gold);font-weight:600}
.iz-band{padding:30px 0;border-top:1px solid #17314a}
.iz-band h2{font:700 20px/1.2 Georgia,serif;margin:0 0 14px}
.iz-list{list-style:none;margin:0;padding:0}
.iz-list li{display:grid;grid-template-columns:86px minmax(0,1fr) auto;gap:12px;padding:10px 0;border-top:1px solid #16304a;font-size:14.5px}
.iz-list time{font:600 11px/1.6 system-ui;color:#8fa3ba}
.iz-list .iz-cell{display:grid;gap:6px;align-content:start}
.iz-thumb{display:block;width:86px;height:58px;object-fit:cover;border-radius:8px;background:#12283d}
.iz-k{margin:18px 0 8px;font:700 10px/1.4 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#8fa3ba}
.iz-city{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px;list-style:none;margin:0 0 6px;padding:0}
.iz-city a{display:grid;justify-items:center;gap:6px;text-decoration:none;color:#c8d6e6;font:600 10px/1.3 system-ui;letter-spacing:.04em;text-align:center}
.iz-city img{width:100%;max-width:78px;aspect-ratio:1;object-fit:cover;border-radius:50%;border:2px solid rgba(233,198,108,.4);background:#12283d}
.iz-city a:hover img{border-color:#e9c66c}
.iz-city a:hover span{color:#e9c66c}
@media(max-width:640px){.iz-city{grid-template-columns:repeat(4,minmax(0,1fr))}}
.iz-list .src{font:600 10px/1.6 system-ui;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);white-space:nowrap}
.iz-score{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;background:#0b1d31;border:1px solid #1e3b58;border-radius:12px;padding:12px 16px;margin:0 0 10px}
.iz-score b{font:700 24px/1 system-ui;color:var(--gold)}
.iz-score small{display:block;color:#9fb0c4;font:400 11px/1.4 system-ui}
.iz-radio{padding:22px 0;background:#071426}
.iz-radio-b{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;border:1px solid #23425f;border-radius:14px;padding:16px 18px;background:#0a1b2d}
.iz-radio-b>div{max-width:80ch}
.iz-radio .btn{font:700 12px/1 system-ui;background:var(--gold);color:#08131f;padding:12px 16px;border-radius:999px;white-space:nowrap;text-decoration:none}
.iz-net{border-top:1px solid #17314a;background:#04101d;padding:26px 0 8px;margin-top:10px}
.iz-net-h{font:700 11px/1.4 system-ui;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin:0 0 12px;display:flex;flex-wrap:wrap;gap:10px;align-items:baseline}
.iz-net-h span{font:600 9.5px/1.4 system-ui;letter-spacing:.1em;color:#8296ad}
.iz-net-g{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;margin:0 0 8px}
.iz-net-g--desks{grid-template-columns:repeat(9,minmax(0,1fr))}
.iz-net-g--more{grid-template-columns:repeat(5,minmax(0,1fr))}
.iz-net-g a{display:grid;gap:3px;padding:9px 10px;border:1px solid #1c3854;border-radius:9px;background:#08182a;transition:border-color .16s ease,transform .16s ease}
.iz-net-g a:hover{border-color:var(--gold);transform:translateY(-1px);text-decoration:none}
.iz-net-g b{font:700 12px/1.15 system-ui;color:#eaf1f8;letter-spacing:.01em}
.iz-net-g span{font:600 8.5px/1.2 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#8296ad}
@media(max-width:1000px){.iz-net-g{grid-template-columns:repeat(4,minmax(0,1fr))}.iz-net-g--desks{grid-template-columns:repeat(5,minmax(0,1fr))}}
@media(max-width:620px){.iz-net-g,.iz-net-g--desks,.iz-net-g--more{grid-template-columns:repeat(2,minmax(0,1fr))}}
.iz-foot{border-top:1px solid #17314a;padding:28px 0 44px;color:#8fa3ba;font:400 12px/1.6 system-ui}
.iz-foot a{color:var(--gold)}
.iz-hastags{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;margin:0 0 12px}
.iz-hastags span{font:800 9px/1 system-ui;letter-spacing:.18em;text-transform:uppercase;color:#8296ad}
.iz-hastags a{font:700 11px/1 system-ui;text-decoration:none;border:1px solid #24425f;border-radius:999px;padding:5px 9px;color:#dbe5f1}
.iz-hastags a:hover{border-color:var(--gold);color:var(--gold);text-decoration:none}
.iz-small{font:400 11px/1.6 system-ui;color:#8296ad}
.iz-datacards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;list-style:none;margin:0;padding:0}
.iz-datacards a{display:block;border:1px solid #25435f;border-radius:12px;padding:11px 13px;background:rgba(11,29,49,.75);text-decoration:none}
.iz-datacards a:hover{border-color:var(--gold);text-decoration:none}
.iz-datacards b{display:block;font:700 14.5px/1.25 Georgia,serif;color:#f2f6fb;margin-bottom:3px}
.iz-datacards span{display:block;color:#94a8bd;font-size:11.5px;line-height:1.4}
@media(max-width:760px){.iz-card--lead{grid-column:span 1}.iz-list li{grid-template-columns:70px minmax(0,1fr)}.iz-list .src{display:none}}
${cssExtra}
</style>
</head>
<body class="iz">
<a class="skip-to-content" href="#sadrzaj">Preskoči na sadržaj</a><style>.skip-to-content{position:absolute;left:-9999px;top:0;z-index:9999;background:#e9c66c;color:#08131f;font:800 13px/1 system-ui,sans-serif;letter-spacing:.02em;padding:12px 18px;border-radius:0 0 12px 0;text-decoration:none}.skip-to-content:focus{left:0}main:focus{outline:none}main:focus-visible{outline:3px solid #e9c66c;outline-offset:4px}a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:3px solid #e9c66c;outline-offset:3px;border-radius:4px}</style>
${houseRibbon({ lang: 'hr', edition: '' })}
${body}
<script src="/assets/public-unified-menu-v6.js?v=20261019-izdanja" defer></script>
<script src="/assets/public-contrast-hardening-v1.js?v=20261019-izdanja" defer></script>
</body>
</html>`;
}

const portalHeader = (active, { h1 = true } = {}) => `<div class="iz-top"><div class="iz-wrap"><span class="iz-house"><img src="/assets/brand/aktual-media-en-1200.webp" alt="AKTUAL MEDIA d.o.o." width="167" height="48" decoding="async"><span>Naša izdanja</span></span><a href="/gnk-aktual/">← AKTUAL MEDIA · sve na jednom mjestu</a></div></div>
<header class="iz-head"><div class="iz-wrap">
  <p class="k">GNK ASG · AKTUAL MEDIA · regionalna izdanja</p>
  ${h1 ? `<h1>Naša izdanja</h1>
  <p>${CHANNELS.length} gradskih kanala, poslovni tjednik i devet deskova — sport, politika, sigurnost, business, tehnologija, moda, putovanja, ljubimci i svijet. Svako izdanje ima vlastiti link, svoj jezik, svoj feed i svoju metodologiju, a sve se vraća ovamo.</p>`
    : `<p class="iz-home-h1"><a href="/izdanja/">Naša izdanja</a> <span aria-hidden="true">·</span> desk</p>`}
  <nav class="iz-nav" aria-label="Izdanja"><a href="/izdanja/"${active === '' ? ' aria-current="page"' : ''}>Sva izdanja</a>${Object.entries(DESKS).map(([id, d]) => `<a href="/izdanja/${id}/"${active === `${id}/` ? ' aria-current="page"' : ''}>${esc(d.nav)}</a>`).join('')}<a href="/radio/">Radio</a><a href="/galerija/">Galerija</a><a href="/aktual-media/">Podaci</a><a href="/kanal/">Kanali</a><a href="/glavni-gradovi/">Glavni gradovi</a><a href="/atlas/">Atlas</a><a href="/gnk-aktual/">AKTUAL MEDIA</a></nav>
</div></header>`;


/* ---------- mreža: svaka stranica nudi najmanje šest drugih ulaza ---------- */

function netStrip() {
  const editions = CHANNELS.map((c) => `<a href="${c.base}" rel="external noopener"><img src="/assets/izdanja/${c.id}-240.webp" alt="${esc(c.city)}, ${esc(c.country)} — AKTUAL MEDIA" width="120" height="68" loading="lazy" decoding="async"><b>${esc(CITY_SHORT[c.id] || c.city)}</b><span>${esc(c.country)}</span></a>`).join('');
  const desks = Object.entries(DESKS).map(([id, d]) => `<a href="/izdanja/${id}/"><img src="${deskArtPath(id, '240')}" alt="${esc(d.nav)} — desk AKTUAL MEDIA" width="120" height="68" loading="lazy" decoding="async"><b>${esc(d.nav)}</b><span>desk</span></a>`).join('');
  const more = [
    ['/usa/', 'Colorado · USA', 'ishodište projekta'],
    ['/radio/', 'Radio', 'player'],
    ['/galerija/', 'Galerija', 'foto'],
    ['/kanal/', 'Kanali', `${CHANNELS.length} izdanja`],
    ['/atlas/', 'Atlas mreže', `${(CAPITALS.capitals || []).length} prijestolnica`],
    ['/gnk-aktual/', 'AKTUAL MEDIA', 'središte'],
    ['/izdanja/', 'Sva izdanja', 'popis'],
    ['/digital-workforce/', 'Radna snaga', 'simulacija'],
    ['/knowledge-center/', 'Centar znanja', 'odgovori'],
    ['/digital-workforce/knjiga/', 'Knjiga radnika', 'tko radi'],
    ['/workers/grupacije/', 'Grupacije radnika', 'automatizacije'],
    ['/top-teme/', 'Top teme', 'dnevno'],
    ['/medijska-kritika/', 'Kritika medija', 'mjereno'],
    ['https://gnk-asg-tjednik.pages.dev/', 'Business Tjednik', 'tjednik'],
    ['https://gnk-asg-tjednik.pages.dev/tjednik/2026-W43/', 'Tjednik W43', 'ovaj tjedan']
  ].map(([href, name, kick]) => `<a href="${href}"${href.startsWith('http') ? ' rel="external noopener"' : ''}><b>${esc(name)}</b><span>${esc(kick)}</span></a>`).join('');
  return `<section class="iz-net" aria-label="Mreža AKTUAL MEDIA">
    <div class="iz-wrap">
      <p class="iz-net-h">Mreža AKTUAL MEDIA <span>${CHANNELS.length} izdanja · 9 deskova · radio · galerija</span></p>
      <div class="iz-net-g">${editions}</div>
      <div class="iz-net-g iz-net-g--desks">${desks}</div>
      <div class="iz-net-g iz-net-g--more">${more}</div>
      <p class="iz-small">Svaki link vodi na vlastito izdanje s vlastitim feedom i sitemapom. <a href="/kanal/">Svi kanali pod gnk-asg.hr →</a></p>
    </div>
  </section>`;
}

const portalFooter = () => `${netStrip()}<footer class="iz-foot"><div class="iz-wrap">
  <p class="iz-hastags" aria-label="Oznake"><span>Oznake</span> <a href="/nermin-sefic/">#NerminSefić</a> <a href="/nermin-sefic/">#NerminSefic</a> <a href="/autorske-objave/">#SeficNermin</a> <a href="/autorske-objave/">#SEFICNERMIN</a> <a href="/nermin-sefic/">#UrednikNerminSefić</a> <a href="/gnk-aktual/">#AKTUALMEDIA</a> <a href="/kanal/">#GNKASG</a></p>
  <p><strong>AKTUAL MEDIA d.o.o.</strong> · Urednik: Nermin Sefić · <a href="mailto:${CONTACT}">${CONTACT}</a></p>
  <p class="iz-small">Sva izdanja objavljuju osvrte na način izvještavanja. Izvornici su uvijek povezani, a tvrdnje izvornika nisu tvrdnje redakcije. Automatski sastavljeni dijelovi nisu pojedinačno urednički pregledani.</p>
  <p class="iz-small"><a href="/status/">Status ažurnosti</a> · <a href="/izdanja/sitemap.xml">Sitemap izdanja</a> · <a href="/gnk-aktual/">AKTUAL MEDIA</a> · <a href="/autonomija/">Autonomija 365</a> · <a href="/zdravlje/">Zdravlje</a> · <a href="https://gnk-asg.hr/">gnk-asg.hr</a></p>
</div></footer>`;

const latestFor = (channel, count = 2) => channelData(channel.id).items.slice(0, count);

/* ---------- hub ---------- */

function cardFor(channel, { lead = false } = {}) {
  const meta = EDITION_META[channel.id] || {};
  const data = channelData(channel.id);
  const latest = data.items.slice(0, 2);
  /* Kartica izdanja pokazuje i sat: „22. 10.” ne razlikuje svježe izdanje od
     onoga koje stoji od jutros. */
  const stamp = data.updatedAt ? stampLocal(data.updatedAt, CHANNELS.find((c) => c.id === channel.id)?.lang, channel.timezone) : null;
  const updated = stamp ? stamp.stamp : '—';
  return `<article class="iz-card${lead ? ' iz-card--lead' : ''}">
    <img class="iz-cover" src="/assets/izdanja/${channel.id}-440.webp" alt="${esc(channel.city)}, ${esc(channel.country)}" width="440" height="248" loading="lazy" decoding="async">
    <span class="flag">${esc(meta.kicker || `${channel.country} · ${channel.city}`)} · ${esc(meta.langLabel || channel.lang)}</span>
    ${logoImg(channelLogoSlug(channel.id), { href: channel.base, size: 34, cls: 'iz-logo' })}
    <h2><a href="${channel.base}" rel="external noopener">${esc(channel.title)}</a></h2>
    <p>${esc(meta.description || '')}</p>
    <ul class="iz-tags">${(meta.hashtags || channel.hashtags).map((tag) => `<li>${esc(tag)}</li>`).join('')}</ul>
    <p class="iz-latest"><b>${data.items.length}</b> osvrta · ${esc(updated)}${latest.length ? `<br>${latest.map((i) => esc(truncate(i.title, 80))).join('<br>')}` : ''}</p>
    <div class="acts"><a class="btn" href="${channel.base}" rel="external noopener">Otvori izdanje ↗</a><a class="btn ghost" href="${channel.base}feed.json" rel="external noopener">Feed</a></div>
  </article>`;
}

function extraCards() {
  const tjednik = {
    name: 'BUSINESS TJEDNIK',
    kicker: 'Poslovni tjednik · hrvatski',
    desc: 'Poslovni tjednik AKTUAL MEDIA čita Lider, Jutarnji list, Poslovni dnevnik i Forbes te za svaki pronađeni poslovni tekst piše kritički osvrt na način izvještavanja. Tjedna promjena pokazuje što se u našem uzorku promijenilo u sedam dana: broj obrađenih tekstova, dominaciju teme i udio naslova s brojkom. Dnevni dodaci slažu osvrte po izvoru i datumu, bez ocjene važnosti. Svaki osvrt nosi poveznicu na izvornik, a JSON-LD nosi isBasedOn na izvornu adresu. Izdanje je na zasebnom linku, s vlastitom paletom i feedom, a kartica na AKTUAL MEDIA vodi ravno u tjednik.',
    url: 'https://gnk-asg-tjednik.pages.dev/',
    tags: ['#BusinessTjednik', '#Lider', '#PoslovniDnevnik', '#Forbes', '#AktualMedia']
  };
  const galerija = {
    name: 'GALERIJA NERMINA SEFIĆA',
    kicker: 'Fotografije i vizuali · hrvatski',
    desc: 'Galerija okuplja službene portrete, fotografije s događanja i tematske vizuale Nermina Sefića, urednika izdanja AKTUAL MEDIA i direktora GNK ASG-a. Svaka fotografija ima vlastitu stranicu, opis, izvor i podatke o dopuštenom korištenju, pa se vizuali ne odvajaju od konteksta. Uz fotografije stoje i tematske ilustracije za pojedina područja: umjetnu inteligenciju, kibernetičku otpornost, tržišta, sportsku tehnologiju i energetsku tranziciju. Stranice su indeksirane i povezane sa sitemapom galerije te s matičnom stranicom izdanja. Galerija je mjesto s kojeg se vizuali preuzimaju uz atribuciju, a ne izvor tvrdnji o projektima ili partnerstvima.',
    url: 'https://gnk-asg.hr/galerija/',
    tags: ['#NerminSefić', '#Galerija', '#GNKASG', '#AktualMedia']
  };
  const cards = [
    `<article class="iz-card"><img class="iz-cover" src="/assets/izdanja/tjednik-tile.webp" alt="BUSINESS TJEDNIK" width="640" height="360" loading="lazy" decoding="async"><span class="flag">${esc(tjednik.kicker)}</span><h2><a href="${tjednik.url}" rel="external noopener">${esc(tjednik.name)}</a></h2><p>${esc(tjednik.desc)}</p><ul class="iz-tags">${tjednik.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><a class="btn" href="${tjednik.url}" rel="external noopener">Otvori tjednik ↗</a></div></article>`,
    `<article class="iz-card"><img class="iz-cover" src="/assets/izdanja/galerija-tile.webp" alt="GALERIJA NERMINA SEFIĆA" width="640" height="360" loading="lazy" decoding="async"><span class="flag">${esc(galerija.kicker)}</span><h2><a href="${galerija.url}" rel="external noopener">${esc(galerija.name)}</a></h2><p>${esc(galerija.desc)}</p><ul class="iz-tags">${galerija.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><a class="btn" href="${galerija.url}" rel="external noopener">Otvori galeriju ↗</a><a class="btn ghost" href="/galerija/sitemap.xml" rel="external noopener">Sitemap</a></div></article>`
  ];
  for (const [id, desk] of Object.entries(DESKS)) {
    const deskArtInfo = deskArt(id);
    const deskArtUrl = deskArtInfo ? deskArtPath(id, '640') : `/assets/izdanja/${id}-tile.webp`;
    cards.push(`<article class="iz-card"><img class="iz-cover" src="${deskArtUrl}"${deskArtInfo ? ` srcset="${deskArtSrcset(id, ['440', '640', '1200'])}" sizes="(max-width:700px) 100vw, 560px"` : ''} alt="${esc(deskArtInfo ? deskArtInfo.alt.hr : desk.name)}" width="640" height="360" loading="lazy" decoding="async"><span class="flag">Desk · AKTUAL MEDIA</span><h2><a href="/izdanja/${id}/">${esc(desk.name)}</a></h2><p>${esc(desk.description)}</p><ul class="iz-tags">${desk.hashtags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><a class="btn" href="/izdanja/${id}/">Otvori desk →</a></div></article>`);
  }
  for (const p of PLATFORMS) {
    const cover = PLATFORM_COVERS[p.id];
    const coverHtml = cover
      ? `<img class="iz-cover" src="${cover.src}" alt="${esc(cover.alt.hr)}" width="${cover.w}" height="${cover.h}" loading="lazy" decoding="async">`
      : '';
    cards.push(`<article class="iz-card">${coverHtml}<span class="flag">Platforma · GNK ASG</span><h2><a href="${p.url}"${p.external ? ' rel="external noopener"' : ''}>${esc(p.name)}</a></h2><p>${esc(p.description)}</p><ul class="iz-tags">${p.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><a class="btn" href="${p.url}"${p.external ? ' rel="external noopener"' : ''}>${esc(p.cta)}</a></div></article>`);
  }
  return cards.join('\n');
}

function radioBand() {
  return `<section class="iz-band iz-radio" id="radio">
    <div class="iz-wrap">
      <div class="iz-radio-b">
        <div><p class="iz-net-h">AKTUAL MEDIA RADIO <span>diskretni player u kutu · 6 stanica</span></p>
        <p class="iz-small" style="margin:0">Player stoji u kutu svake stranice, veličine jednog gumba, i ne prekriva sadržaj. Otvara se klikom, pamti stanicu i glasnoću, a ovdje su sve stanice i lokalni javni servisi.</p></div>
        <a class="btn" href="/radio/">Otvori radio →</a>
      </div>
    </div>
  </section>`;
}

/* Mreža neovisnih izdanja: šest stranica s vlastitim hostingom. Traka je
   namjerno kratka — popis, jedna rečenica i poveznica na hub, da /izdanja/
   ostane popis izdanja, a ne druga naslovnica. */
/* Devet svjetskih portala dosad su bila na /kanal/ i /mreza/, ali ne na
   popisu izdanja — čitatelj koji traži „sva izdanja" nije vidio Tokio ni
   São Paulo. Blok ih vraća na jedno mjesto, s jezikom i kontinentom. */
function worldBand() {
  const items = WORLD_PORTALS.map((p) => `<li><a href="${p.base}" rel="external noopener" hreflang="${p.lang}" lang="${p.lang}"><b>${esc(p.city)}</b><span>${esc(p.country)} · ${esc(p.lang)} · ${esc(p.continent.hr)}</span></a></li>`).join('');
  return `<section class="iz-band iz-world" aria-labelledby="worldTitle">
    <h2 id="worldTitle">Devet svjetskih izdanja <span>${WORLD_PORTALS.length} portala · vlastite domene · isti standard</span></h2>
    <p class="iz-small" style="margin:0 0 12px">Uz osam regionalnih gradova, devet svjetskih izdanja pokriva pet kontinenata izvan Europe: Nairobi i Kairo, Jakarta i Singapur, Tokio i Peking, New York, São Paulo i Sydney. Svaki portal ima vlastitu domenu, sitemap, feed, manifest i sigurnosna zaglavlja, a svaki vodi natrag na AKTUAL MEDIA. S cijelom mrežom — 17 gradskih izdanja i 9 portala — pokriveno je šest nastanjenih kontinenata.</p>
    <ul class="iz-datacards">${items}</ul>
    <p class="iz-small" style="margin:12px 0 0"><a href="/mreza/">Cijela mreža →</a> · <a href="/en/network/" hreflang="en" lang="en">Network (EN)</a> · <a href="/kanal/">Svi kanali →</a></p>
  </section>`;
}

function networkBand() {
  let sites = [];
  try {
    const data = JSON.parse(readFileSync(join(PORTAL, 'data', 'mreza-v1.json'), 'utf8'));
    sites = data.sites || [];
  } catch { sites = []; }
  if (!sites.length) return '';
  const items = sites.map((site) => `<li><a href="${site.url}" rel="external noopener" hreflang="hr" lang="hr"><b>${esc(site.name)}</b><span>${esc(site.tagline.hr.split(':')[0])}</span></a></li>`).join('');
  return `<section class="iz-band iz-mreza" aria-labelledby="mrezaTitle">
    <h2 id="mrezaTitle">Mreža neovisnih izdanja <span>${sites.length} stranica · vlastiti hosting · isti urednik</span></h2>
    <p class="iz-small" style="margin:0 0 12px">Teme koje su na matičnoj stranici bile prekratko obrađene dobile su vlastite domene: borilački sport u SAD-u, košarka, scena znanosti, ples i pokret, zdravlje — i privremeni desk za izbore u Srbiji. Svaka stranica ima svoj sitemap, feed i metodologiju, a sve vode natrag na gnk-asg.hr.</p>
    <ul class="iz-datacards">${items}</ul>
    <p class="iz-small" style="margin:12px 0 0"><a href="/mreza/">Cijela mreža →</a> · <a href="/en/network/" hreflang="en" lang="en">Network (EN)</a> · <a href="/data/mreza-v1.json">JSON</a></p>
  </section>`;
}

/* Zid brenda: dva matična znaka (hrvatski i engleski) pa svi znakovi
   izdanja. Služi dvjema svrhama — čitatelj jednim pogledom vidi kuću, a
   tražilica dobiva stvarne slike s opisnim alt tekstom i poveznicama. */
function brandWall() {
  const master = ['aktual-media-hr', 'aktual-media-en']
    .map((slug) => {
      const logo = logoFor(slug);
      if (!logo) return '';
      const href = slug.endsWith('-en') ? '/en/gnk-aktual/' : '/gnk-aktual/';
      return `<li class="iz-brand-master"><a href="${href}"><img src="${logo.webp}" alt="${esc(logo.title)} — ${esc(logo.tagline)}" width="600" height="173" loading="lazy" decoding="async"><span>${esc(slug.endsWith('-en') ? 'World edition' : 'Svjetsko izdanje')}</span></a></li>`;
    }).join('');
  const editions = [
    ...CHANNELS.map((c) => [`kanal-${c.id}`, c.base]),
    ...Object.keys(DESKS).map((id) => [`desk-${id}`, `/izdanja/${id}/`]),
  ].map(([slug, href]) => {
    const logo = logoFor(slug);
    if (!logo) return '';
    return `<li><a href="${href}"${href.startsWith('http') ? ' rel="external noopener"' : ''}><img src="${logo.webp}" alt="${esc(logo.title)}" width="300" height="86" loading="lazy" decoding="async"><span>${esc(logo.title.replace(/^AKTUAL MEDIA\s*/i, ''))}</span></a></li>`;
  }).join('');
  return `<section class="iz-band iz-brandwall" aria-labelledby="brandwallTitle">
    <h2 id="brandwallTitle">Znakovi kuće AKTUAL MEDIA <span>19 izdanja, isti znak</span></h2>
    <p class="iz-small" style="margin:0 0 14px">Svako izdanje ima svoj znak u istoj familiji: navy dio je ime kuće ili rubrike, crveni je izdanje. Znakovi su vektorski, pa se ne rasplinjavaju ni na velikim zaslonima, a svaki vodi na svoje izdanje.</p>
    <ul class="iz-brand-masters">${master}</ul>
    <ul class="iz-brand-grid">${editions}</ul>
  </section>`;
}

function hubPage() {
  const cards = CHANNELS.map((c, i) => cardFor(c, { lead: i === 0 })).join('\n');
  const items = CHANNELS.flatMap((c) => latestFor(c, 3).map((i) => ({ ...i, channel: c })))
    .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 14);

  const body = `${portalHeader('')}
<main id="sadrzaj" tabindex="-1" class="iz-wrap">
  <div class="iz-grid">${cards}${extraCards()}</div>
  <section class="iz-band">
    <h2>Najnovije iz svih izdanja</h2>
    <ul class="iz-list">${items.map((i) => `<li><time datetime="${esc(i.date)}">${esc(shortDate(i.date.slice(0, 10)))}</time><a href="${i.channel.base}clanak/${i.slug}/" rel="external noopener">${esc(i.title)}</a><span class="src">${esc(i.channel.title)}</span></li>`).join('') || '<li>Prva izdanja se pune dnevnim ciklusom.</li>'}</ul>
  </section>
  <section class="iz-band iz-web" aria-labelledby="webTitle">
    <h2 id="webTitle">Sve adrese na jednoj slici</h2>
    ${spiderWeb({ lang: 'hr', selfUrl: HUB, theme: 'dark' })}
  </section>
  ${worldBand()}
  ${networkBand()}
  <section class="iz-band iz-data-desk" aria-labelledby="ddTitle">
    <h2 id="ddTitle">Podatkovni desk — redakcija, izmjereno</h2>
    <p class="iz-small" style="margin:0 0 12px">Četiri stranice na kojima AKTUAL MEDIA mjeri vlastitu arhivu: noćna smjena, koncentracija izvora, pauze u objavljivanju i zajednički rječnik gradova. Brojke se računaju iz arhive pri svakoj gradnji, bez procjena.</p>
    <ul class="iz-datacards">
      <li><a href="/aktual-media/nocna-smjena/"><b>Noćna smjena</b><span>što izlazi dok grad spava</span></a></li>
      <li><a href="/aktual-media/jedan-glas/"><b>Jedan glas</b><span>koliko je izdanje pluralno</span></a></li>
      <li><a href="/aktual-media/karta-tisine/"><b>Karta tišine</b><span>najdulja pauza po gradu</span></a></li>
      <li><a href="/aktual-media/osam-jezika/"><b>Jezici mreže</b><span>riječi koje dijele gradovi</span></a></li>
      <li><a href="/en/aktual-media/" hreflang="en" lang="en"><b>Data desk (EN)</b><span>the same four measurements</span></a></li>
    </ul>
  </section>
  ${brandWall()}
  <section class="iz-band">
    <h2>Oznake izdanja</h2>
    <ul class="iz-tags">${['#NerminSefić', '#NerminSefic', '#SeficNermin', '#SEFICNERMIN', '#AKTUALMEDIA', '#GNKASG', '#Našaizdanja', '#KanalZagreb', '#KanalBeograd', '#KanalSarajevo', '#KanalBudimpesta', '#KanalLjubljana', '#CanaleRoma', '#KanalSofija', '#CanalulBucuresti', '#BusinessTjednik', '#RegionalneVijesti', '#Sport', '#Politika', '#Sigurnost'].map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
  </section>
</main>
${radioBand()}${portalFooter()}`;

  return portalShell({
    title: 'Naša izdanja — AKTUAL MEDIA · 17 gradskih kanala i devet svjetskih portala, tjednik i deskovi',
    description: 'Sva izdanja AKTUAL MEDIA na jednom mjestu: osam regionalnih i devet svjetskih gradskih kanala, devet svjetskih portala na vlastitim domenama, BUSINESS TJEDNIK, tematski deskovi, radio i podatkovni desk.',
    path: '',
    tags: ['#AKTUALMEDIA', '#AktualMedia', '#Našaizdanja', '#GNKASG'],
    logos: ['aktual-media-hr', 'aktual-media-en'],
    keywords: [...CHANNELS.map((c) => c.title), 'BUSINESS TJEDNIK', 'GNK ASG', 'izdanja'],
    cssExtra: SPIDER_CSS,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Naša izdanja — AKTUAL MEDIA', url: HUB, inLanguage: 'hr', isPartOf: { '@id': 'https://gnk-asg.hr/#website' } },
      { '@context': 'https://schema.org', '@type': 'ItemList', '@id': 'https://gnk-asg.hr/izdanja/#all-editions', name: 'Izdanja AKTUAL MEDIA', numberOfItems: mediaItems().length, itemListElement: mediaItems().map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: item.url })) },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: 'https://gnk-asg.hr/gnk-aktual/' }, { '@type': 'ListItem', position: 2, name: 'Izdanja', item: HUB }] }
    ],
    body
  });
}


/* Platforme koje žive na matičnoj domeni, a ulaze u hub kao zasebne kartice. */
/* Platforme dobivaju naslovnu sliku kao i svaka druga kartica: radio studio,
   čitaonica centra znanja i ilustracija digitalne radne snage. */
const PLATFORM_COVERS = {
  'digital-workforce': { src: '/assets/editorial/digital-workforce-overview.webp', w: 1600, h: 900, alt: { hr: 'Digitalna radna snaga — ilustracija simulacije', en: 'Digital workforce — simulation illustration' } },
  radio: { src: '/assets/utility/radio-1200.webp', w: 1200, h: 670, alt: { hr: 'AKTUAL MEDIA RADIO — studio s mikrofonom i miješalicom', en: 'AKTUAL MEDIA RADIO — studio with a microphone and mixing desk' } },
  'knowledge-center': { src: '/assets/utility/znanje-1200.webp', w: 1200, h: 670, alt: { hr: 'Centar znanja — čitaonica s knjigama i arhivskim kutijama', en: 'Knowledge Center — a reading room with books and archive boxes' } }
};
const PLATFORMS = [
  {
    id: 'digital-workforce',
    name: 'Digitalna radna snaga — javna simulacija',
    url: '/digital-workforce/',
    cta: 'Otvori simulaciju →',
    tags: ['#DigitalnaRadnaSnaga', '#GNKASG', '#Simulacija'],
    description: 'Javna ilustrativna simulacija sustava digitalne radne snage GNK ASG: planovi, projekti, rizici i katalog od 1.573 sintetička workera. Stranica objašnjava što simulacija jest, a što nije, i odvaja pokazne scenarije od stvarnih poslovnih odluka. Katalog se pregledava po timovima i ulogama, a svaki je zapis označen kao sintetički. Uz katalog stoje dokumentacija o rizicima i ograničenjima te odgovori na najčešća pitanja. Ništa sa stranice ne opisuje stvarne zaposlenike ni stvarne klijente, a brojke su dio simulacije. Kartica je ulaz u model, ne dokaz poslovnog učinka.',
  },
  {
    id: 'radio',
    name: 'AKTUAL MEDIA RADIO',
    url: '/radio/',
    cta: 'Otvori radio →',
    tags: ['#AktualMediaRadio', '#AktualMedia', '#GNKASG'],
    description: 'AKTUAL MEDIA RADIO je diskretni player u kutu stranice: preklopljen je dok ga čitatelj ne otvori i ne prekriva sadržaj. Nudi šest glazbenih streamova te popis javnih radijskih kuća svih zemalja koje portal prati. Stanice se ne reemitiraju; svaka poveznica vodi na službeni player te kuće, uz atribuciju. Player pamti je li zatvoren i može se otvoriti kao stalni prozor ili instalirati kao aplikacija. Ima vlastite kontrole glasnoće i reprodukcije, a stanice se biraju izravno u panelu. Kartica vodi na stranicu s playerom i popisom stanica.',
  },
  {
    id: 'knowledge-center',
    name: 'Centar znanja i odgovori',
    url: '/knowledge-center/',
    cta: 'Otvori centar znanja →',
    tags: ['#CentarZnanja', '#GNKASG', '#AktualMedia'],
    description: 'Centar znanja okuplja odgovore o grupi GNK ASG, projektima, financijama, medijskim prijavama, izvješćima, tehnologiji i službenim kontaktima. Pitanja su posložena po temama, a svaki odgovor upućuje na dokument ili stranicu na kojoj se tvrdnja može provjeriti. Stranica razlikuje objavljeno, planirano i uvjetno, pa se rok i uvjet ne čitaju kao jamstvo. Služi novinarima, partnerima i čitateljima koji žele prvi izvor umjesto prepričavanja. Odgovori se dopunjuju kad se promijeni matični dokument, a kontakt za ispravak je info@gnk-asg.hr. Kartica je ulaz u arhivu odgovora, a ne u marketinški pregled.',
  },
];

/* ---------- deskovi ---------- */

function collect(theme, filter = null) {
  const out = [];
  for (const channel of CHANNELS) {
    const data = channelData(channel.id);
    for (const item of data.items) {
      if (theme !== '*') {
        const itemTheme = themeFor(`${item.title} ${item.summary}`).id;
        if (itemTheme !== theme) continue;
      }
      if (filter && !filter.test(`${item.title} ${item.summary}`)) continue;
      out.push({ ...item, channel });
    }
  }
  const seen = new Set();
  return out
    .filter((i) => (seen.has(i.url) ? false : seen.add(i.url)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/* Slika iz izvora ide kroz naš posrednik: izdavač ne vidi čitatelja,
   a slika se kešira na rubu. Popis dopuštenih hostova je u Workeru
   (workers/gnk-asg-direct-operator/src/image-hosts-v1.js) i pokriva sve
   izvore iz apps/region/data/*.json. */
const proxied = (src) => (src ? `/api/img?u=${encodeURIComponent(String(src))}&w=480` : '');

/* Minijatura u popisu osvrta.
   Stvarna slika izvora nosi alt s naslovom i imenom izvora — to je jedino
   mjesto gdje čitatelj (i tražilica) iz slike može saznati o čemu je.
   Zamjenska ploha je dekoracija: ponavlja se uz svaki zapis bez slike, pa
   nosi prazan alt i aria-hidden da je čitač ekrana preskoči umjesto da
   izgovara istu rečenicu četrdeset puta. */
function deskThumb(item, deskId) {
  const alt = `${item.title} — ${item.sourceName || item.channel.title}`;
  if (item.image) {
    return `<img class="iz-thumb" src="${esc(proxied(item.image))}" alt="${esc(alt)}" width="86" height="58" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  }
  /* Bez slike iz izvora: krop naslovne ilustracije deska. Isti zapis uvijek
     dobiva isti krop (varijanta iz sluga), pa se minijature ne trepere.
     Alt nije prazan: pravilo mreže je da svaka slika ima opis, a čitač
     ekrana koji preskoči sliku ipak čuje naslov uz nju. */
  if (deskArt(deskId)) {
    const variant = variantFor(item.slug || item.url || item.title);
    return `<img class="iz-thumb iz-thumb-p${variant + 1}" src="${esc(deskArtPath(deskId, '240'))}" alt="${esc(alt)}" width="86" height="58" loading="lazy" decoding="async">`;
  }
  const tile = tilePath(deskId, variantFor(item.slug || item.url || item.title));
  return `<img class="iz-thumb iz-thumb-art" src="${esc(tile)}" alt="${esc(alt)} — ilustracija" width="86" height="58" loading="lazy" decoding="async">`;
}

const cityCircles = () => `<ul class="iz-city" aria-label="Gradska izdanja AKTUAL MEDIA">${
  CHANNELS.map((c) => `<li><a href="${c.base}" rel="external noopener" title="${esc(c.title)}"><img src="/assets/izdanja/${c.id}-240.webp" alt="${esc(c.city)}, ${esc(c.country)} — ${esc(c.title)}" width="96" height="96" loading="lazy" decoding="async"><span>${esc(c.city)}</span></a></li>`).join('')
}</ul>`;

function deskPage(id, desk) {
  const items = collect(desk.theme, desk.filter || null);
  const results = items.map((i) => ({ item: i, score: scoreFromTitle(i.title) })).filter((x) => x.score).slice(0, 12);
  const bySource = new Map();
  for (const item of items) {
    const key = item.channel.id;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(item);
  }

  const art = deskArt(id);
  const heroArt = art ? `<figure class="iz-hero">
    <picture>
      <source type="image/webp" srcset="${deskArtSrcset(id)}" sizes="(max-width:760px) 100vw, 1120px">
      <img src="${deskArtPath(id, '1200')}" alt="${esc(art.alt.hr)}" width="1200" height="675" fetchpriority="high" decoding="async">
    </picture>
    <figcaption><b>Naslovna ilustracija</b><span>Generirana grafika, nije fotografija događaja · AKTUAL MEDIA</span></figcaption>
  </figure>` : '';
  const body = `${portalHeader(id + '/', { h1: false })}
<main id="sadrzaj" tabindex="-1" class="iz-wrap">
  ${heroArt}
  <section class="iz-head" style="border-bottom:0;padding-top:26px">
    ${logoImg(deskLogoSlug(id), { href: '/izdanja/', size: 56, cls: 'iz-desk-logo', priority: true })}
    <p class="k">${esc(desk.name)}</p>
    <h1>${esc(desk.title)}</h1>
    <p>${esc(desk.description)}</p>
    <ul class="iz-tags" style="margin-top:14px">${desk.hashtags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="iz-k">Izdanja koja ovaj desk prati</p>
    ${cityCircles()}
  </section>

  ${id === 'sport' ? `<section class="iz-band"><h2>Rezultati objavljeni u izvorima</h2>
    <div id="izResults">${results.length ? results.map(({ item, score }) => `<div class="iz-score"><span>${esc(item.title)}<small>${esc(item.sourceName)} · ${esc(item.channel.title)}</small></span><b>${esc(score.label)}</b></div>`).join('') : '<p class="iz-small">U posljednjem ciklusu nije bilo naslova sa zapisanim rezultatom.</p>'}</div>
    <p class="iz-small">Rezultat se prikazuje samo ako je zapisan u naslovu izvora. Stranica se osvježava pri svakom dnevnom ciklusu, iz podataka koje on zapisuje.</p>
  </section>` : ''}

  <section class="iz-band">
    <h2>Osvrti</h2>
    <ul class="iz-list">${items.slice(0, 40).map((i) => `<li><span class="iz-cell">${deskThumb(i, id)}<time datetime="${esc(i.date)}">${esc(shortDate(i.date.slice(0, 10)))}</time></span><a href="${i.channel.base}clanak/${i.slug}/" rel="external noopener">${esc(i.title)}</a><span class="src">${esc(i.channel.title)}</span></li>`).join('') || '<li>Prvi ciklus još nije zapisao tekstove za ovaj desk.</li>'}</ul>
  </section>

  <section class="iz-band iz-aktual" aria-labelledby="aktualTitle">
    <h2 id="aktualTitle">AKTUAL MEDIA <span>izdavač ovog deska</span></h2>
    <p class="iz-small" style="margin:0 0 12px">Ovaj desk je dio AKTUAL MEDIA — kuće koja pod istim imenom vodi ${CHANNELS.length} gradskih kanala, devet tematskih deskova, business tjednik, radio, galeriju i podatkovni desk. Isti izdavač, isti urednik i ista metodologija vrijede za svaku stranicu, pa se svaki tekst može provjeriti do izvornika.</p>
    <ul class="iz-datacards">
      <li><a href="/gnk-aktual/"><b>AKTUAL MEDIA</b><span>središte kuće</span></a></li>
      <li><a href="/izdanja/"><b>Sva izdanja</b><span>${CHANNELS.length} kanala · ${Object.keys(DESKS).length} deskova</span></a></li>
      <li><a href="/gnk-aktual/mreza/"><b>Mreža izdanja</b><span>vlastiti hosting</span></a></li>
      <li><a href="/aktual-media/"><b>Podatkovni desk</b><span>redakcija, izmjereno</span></a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/" rel="external noopener"><b>BUSINESS TJEDNIK</b><span>tjedni pregled</span></a></li>
      <li><a href="/en/gnk-aktual/" hreflang="en" lang="en"><b>AKTUAL MEDIA (EN)</b><span>English entry point</span></a></li>
    </ul>
  </section>

  <section class="iz-band">
    <h2>Ostali deskovi</h2>
    <ul class="iz-list">${Object.entries(DESKS).filter(([other]) => other !== id).map(([other, d]) => `<li><time>desk</time><a href="/izdanja/${other}/">${esc(d.title)}</a><span class="src">${esc(d.hashtags[0] || '')}</span></li>`).join('')}</ul>
  </section>

  <section class="iz-band">
    <h2>Po izdanju</h2>
    <ul class="iz-list">${[...bySource.entries()].map(([cid, list]) => { const c = CHANNELS.find((x) => x.id === cid); return `<li><time>${list.length}</time><a href="${c.base}" rel="external noopener">${esc(c.title)}</a><span class="src">${esc(c.city)}</span></li>`; }).join('') || ''}</ul>
  </section>
</main>
${portalFooter()}
${id === 'sport' ? `<script>(()=>{const box=document.getElementById('izResults');if(!box)return;const esc=(s)=>String(s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const render=(rows)=>{if(!rows.length)return;box.innerHTML=rows.slice(0,12).map((r)=>'<div class="iz-score"><span>'+esc(r.title)+'<small>'+esc(r.source)+' · '+esc(r.channel)+'</small></span><b>'+esc(r.score)+'</b></div>').join('')};const load=()=>fetch('/data/izdanja-sport.json',{cache:'no-store'}).then((r)=>r.ok?r.json():null).then((d)=>d&&d.results&&render(d.results)).catch(()=>{});load();setInterval(load,300000)})();</script>` : ''}`;

  /* Naslovnica je rasterska (webp) jer društvene mreže ne prikazuju SVG;
     SVG plohe ostaju u popisu osvrta gdje nema vanjskog dijeljenja. */
  const cover = art ? deskArtPath(id, 'og', 'jpg') : `/assets/izdanja/${id}-tile.webp`;
  const artCover = art ? deskArtPath(id, '1200') : tilePath(id, 0);
  const withImages = items.filter((i) => i.image).length;
  return portalShell({
    title: `${desk.title} | AKTUAL MEDIA`,
    description: desk.description,
    path: `${id}/`,
    /* Oznake idu u article:tag, a u keywords ostaju samo riječi. */
    keywords: [...desk.hashtags.map((t) => t.replace(/^#/, '')), 'AKTUAL MEDIA', 'Aktual mediji', 'GNK ASG', 'regija', desk.nav],
    tags: [...desk.hashtags, '#AktualMedia', '#GNKASG'],
    logos: [deskLogoSlug(id)],
    preload: art ? { href: deskArtPath(id, '1200'), imagesrcset: deskArtSrcset(id, ['640', '800', '1200', '1600']), imagesizes: '(max-width:760px) 100vw, 1120px' } : null,
    image: cover,
    imageAlt: art ? art.alt.hr : `${desk.title} — AKTUAL MEDIA`,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'NewsMediaOrganization', '@id': `${HUB}${id}/#organization`, name: desk.name, url: `${HUB}${id}/`, inLanguage: 'hr', logo: logoJsonLd(deskLogoSlug(id), { url: 'https://gnk-asg.hr' }), parentOrganization: { '@id': MEDIA_ID } },
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: desk.title, url: `${HUB}${id}/`, inLanguage: 'hr', description: desk.description, publisher: { '@id': `${HUB}${id}/#organization` }, primaryImageOfPage: { '@type': 'ImageObject', url: `${new URL(HUB).origin}${cover}`, caption: `${desk.title} — AKTUAL MEDIA` }, image: [`${new URL(HUB).origin}${cover}`, `${new URL(HUB).origin}${artCover}`], publisher: { '@id': MEDIA_ID }, isPartOf: { '@id': `${HUB}#website` } },
      { '@context': 'https://schema.org', '@type': 'ItemList', name: desk.title, numberOfItems: Math.min(20, items.length), itemListElement: items.slice(0, 20).map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.title, url: `${i.channel.base}clanak/${i.slug}/` })) }
    ],
    body
  });
}

/* ---------- zapisi ---------- */

const writePage = (path, html) => {
  const target = join(OUT, path, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
};

export async function buildHub() {
  mkdirSync(OUT, { recursive: true });
  ensureDeskTiles(PORTAL, Object.keys(DESKS));
  writePage('', hubPage());
  for (const [id, desk] of Object.entries(DESKS)) writePage(id, deskPage(id, desk));

  const entries = [
    { loc: HUB, priority: '1.0' },
    ...Object.keys(DESKS).map((id) => ({ loc: `${HUB}${id}/`, priority: '0.7' })),
    ...CHANNELS.map((c) => ({ loc: c.base, priority: '0.9' })),
    { loc: 'https://gnk-asg.hr/usa/', priority: '0.9' },
    // The external tjednik is linked from the hub and structured media graph, not submitted as our domain's sitemap URL.
    { loc: 'https://gnk-asg.hr/galerija/', priority: '0.6' },
    { loc: 'https://gnk-asg.hr/kanal/', priority: '0.9' },
    { loc: 'https://gnk-asg.hr/glavni-gradovi/', priority: '0.9' },
    { loc: 'https://gnk-asg.hr/en/capitals/', priority: '0.8' },
    ...(CAPITALS.capitals || []).filter((c) => c.slug).map((c) => ({ loc: `https://gnk-asg.hr/glavni-gradovi/${c.slug}/`, priority: c.status === 'live' ? '0.8' : '0.6' })),
    ...(CAPITALS.capitals || []).filter((c) => c.slug).map((c) => ({ loc: `https://gnk-asg.hr/en/capitals/${c.slug}/`, priority: c.status === 'live' ? '0.7' : '0.5' })),
    { loc: 'https://gnk-asg.hr/radio/', priority: '0.9' },
    { loc: 'https://gnk-asg.hr/aktual-media/', priority: '0.8' },
    { loc: 'https://gnk-asg.hr/gnk-aktual/', priority: '1.0' }
  ];
  writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `<url><loc>${e.loc}</loc><changefreq>daily</changefreq><priority>${e.priority}</priority></url>`).join('\n')}
</urlset>
`);

  const sportResults = collect('sport')
    .map((i) => {
      const score = scoreFromTitle(i.title);
      return score ? { title: i.title, score: score.label, source: i.sourceName, channel: i.channel.title, url: `${i.channel.base}clanak/${i.slug}/`, date: i.date } : null;
    })
    .filter(Boolean)
    .slice(0, 12);
  const sportItems = collect('sport').slice(0, 40).map((i) => ({ title: i.title, date: i.date, url: `${i.channel.base}clanak/${i.slug}/`, source: i.sourceName, channel: i.channel.title }));
  writeFileSync(join(PORTAL, 'data', 'izdanja-sport.json'), `${JSON.stringify({ updatedAt: new Date().toISOString(), results: sportResults, items: sportItems }, null, 2)}\n`);

  const cards = [
    ...CHANNELS.map((c) => ({
      id: c.id, name: c.title, url: c.base, lang: c.lang, city: c.city, country: c.country,
      nameEn: c.lang === 'en' || /CHANNEL|CANAL/.test(c.title) ? c.title : undefined,
      native: c.nativeTitle || '',
      description: (EDITION_META[c.id] || {}).description || '', hashtags: (EDITION_META[c.id] || {}).hashtags || c.hashtags,
      count: channelData(c.id).items.length,
      lastItemAt: channelData(c.id).items[0]?.date || channelData(c.id).updatedAt || ''
    })),
    { id: 'tjednik', name: 'BUSINESS TJEDNIK', url: 'https://gnk-asg-tjednik.pages.dev/', lang: 'hr', city: 'Zagreb', country: 'Hrvatska', description: 'Poslovni tjednik s kritičkim osvrtima na Lider, Jutarnji list, Poslovni dnevnik i Forbes, tjednom promjenom i dnevnim dodacima.', hashtags: ['#BusinessTjednik', '#AktualMedia'], count: 0 },
    { id: 'sport', name: 'SPORT', url: '/izdanja/sport/', lang: 'hr', city: 'Regija', country: 'AKTUAL MEDIA', description: DESKS.sport.description, hashtags: DESKS.sport.hashtags, count: collect('sport').length },
    { id: 'politika', name: 'POLITIKA', url: '/izdanja/politika/', lang: 'hr', city: 'Regija', country: 'AKTUAL MEDIA', description: DESKS.politika.description, hashtags: DESKS.politika.hashtags, count: collect('politika').length },
    { id: 'sigurnost', name: 'SIGURNOST I KIBERNETIKA', url: '/izdanja/sigurnost/', lang: 'hr', city: 'Regija', country: 'AKTUAL MEDIA', description: DESKS.sigurnost.description, hashtags: DESKS.sigurnost.hashtags, count: collect('sigurnost').length },
    { id: 'galerija', name: 'GALERIJA NERMINA SEFIĆA', url: 'https://gnk-asg.hr/galerija/', lang: 'hr', city: 'Zagreb', country: 'Hrvatska', description: 'Službeni portreti, fotografije s događanja i tematski vizuali, svaki s vlastitom stranicom i podacima o korištenju.', hashtags: ['#NerminSefić', '#Galerija'], count: 0 },
    /* Svjetski portali su dio popisa izdanja, ne samo mreže: kartica nosi
       jezik, kontinent i vlastitu domenu, a count dolazi iz portala. */
    ...WORLD_PORTALS.map((p) => ({
      id: `world-${p.id}`, name: p.name, url: p.base, lang: p.lang,
      city: p.city, country: p.country, continent: p.continent.hr, world: true,
      description: `Svjetski portal ${p.city} (${p.country}) — ${p.continent.hr}, jezik ${p.lang}; vlastita domena, sitemap i feed.`,
      hashtags: [`#${p.city.replace(/\s+/g, '')}`, '#AKTUALMEDIA', '#GNKASG'],
      count: 0
    }))
  ];
  writeFileSync(join(PORTAL, 'data', 'izdanja.json'), `${JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), sourceOfTruth: HUB, cards }, null, 2)}\n`);

  injectBand(cards);
  injectBand(cards, 'en');

  /* Podatkovni desk: četiri stranice koje mjere vlastitu arhivu. Brojke
     se računaju iz istih datoteka koje je ovaj ciklus upravo zapisao,
     pa stranice ne mogu zaostati za izdanjima. */
  try {
    const { buildDataDesk } = await import('./data-desk.mjs');
    const desk = await buildDataDesk();
    console.log(`[data-desk] ${JSON.stringify(desk)}`);
  } catch (error) {
    console.log(`::warning::Podatkovni desk nije izgrađen: ${error.message}`);
  }

  /* Tehnologija budućnosti: pet mjerenih tehnologija, svaka s izvorom.
     Stranica je namjerno mirna — ne prati vijesti nego provjerene rezultate,
     pa se gradi uz svaki ciklus i trakom ulazi u matične stranice. */
  try {
    const { buildFutureTech } = await import('./future-tech.mjs');
    const tech = buildFutureTech({ quiet: true });
    console.log(`[future-tech] ${JSON.stringify(tech)}`);
  } catch (error) {
    console.log(`::warning::Tehnologija budućnosti nije izgrađena: ${error.message}`);
  }

  try {
    const { buildAktualCentral } = await import('./aktual-central.mjs');
    const central = buildAktualCentral({ cards });
    console.log(`[central] ${JSON.stringify(central)}`);
  } catch (error) {
    console.log(`::warning::Središnji blok nije izgrađen: ${error.message}`);
  }

  return { channels: CHANNELS.length, sport: collect('sport').length, politics: collect('politika').length, security: collect('sigurnost').length, biznis: collect('ekonomija').length, tehnologija: collect('ai').length, moda: collect('*', DESKS.moda.filter).length, putovanja: collect('*', DESKS.putovanja.filter).length, ljubimci: collect('*', DESKS.ljubimci.filter).length, svijet: collect('*', DESKS.svijet.filter).length };
}

/* ---------- blok na AKTUAL MEDIA ---------- */


/* ---------- /kanal/: ulaz u sva izdanja pod glavnom domenom ---------- */

function kanalIndex(cards) {
  const rows = CHANNELS.map((c) => {
    const card = cards.find((x) => x.id === c.id) || {};
    return `<article class="kx-card">
      <a class="kx-link" href="${c.base}">
        <img src="/assets/izdanja/${c.id}-1200.webp" alt="${esc(c.title)} — ${esc(c.city)}, ${esc(c.country)}" width="1200" height="675" loading="lazy" decoding="async">
        <div class="kx-body">
          ${logoImg(channelLogoSlug(c.id), { size: 30, cls: 'kx-logo' })}
          <span class="kx-flag">${esc(c.country)} · ${esc(c.lang)}</span>
          <h2>${esc(c.title)}</h2>
          <p>${esc(card.description || '').split('. ').slice(0, 2).join('. ')}.</p>
          <span class="kx-meta">${card.count || 0} osvrta · ${esc(c.city)}</span>
          <span class="kx-go">Otvori izdanje →</span>
        </div>
      </a>
      <p class="kx-foot">${c.lang === 'en' ? '<span>English edition</span>' : `<a href="/kanal/${c.id}/en/" hreflang="en" lang="en">English overview →</a>`} <span>${card.count || 0} reviews</span></p>
    </article>`;
  }).join('');

  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AKTUAL MEDIA KANAL — sva izdanja pod gnk-asg.hr</title>
<meta name="description" content="${esc(`${CHANNELS.length} gradskih izdanja AKTUAL MEDIA na jednoj domeni: ${CHANNELS.map((c) => c.city).join(', ')}. Svako ima svoj feed, sitemap i arhivu.`)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://gnk-asg.hr/kanal/">
${logoAlternate('aktual-media-hr')}
<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/kanal/">
<link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/kanal/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="AKTUAL MEDIA KANAL — sva izdanja">
<meta property="og:description" content="${esc(`${CHANNELS.length} gradskih izdanja na jednoj domeni, s vlastitim feedom i arhivom.`)}">
<meta property="og:url" content="https://gnk-asg.hr/kanal/">
<meta property="og:image" content="https://gnk-asg.hr/assets/izdanja/aktual-media-og.jpg">
<meta property="og:image:alt" content="AKTUAL MEDIA KANAL — sva izdanja">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="AKTUAL MEDIA KANAL — sva izdanja">
<meta name="twitter:image" content="https://gnk-asg.hr/assets/izdanja/aktual-media-og.jpg">
<meta name="twitter:image:alt" content="AKTUAL MEDIA KANAL — sva izdanja">
<script type="application/ld+json">${safeJson(WEBSITE_NODE)}</script>
<script type="application/ld+json">${safeJson(MEDIA_ENTITY_NODE)}</script>
<script type="application/ld+json">${safeJson({
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'AKTUAL MEDIA KANAL — sva izdanja', url: 'https://gnk-asg.hr/kanal/',
    inLanguage: 'hr', isPartOf: { '@id': 'https://gnk-asg.hr/#website' },
    publisher: { '@id': MEDIA_ID }, about: { '@id': MEDIA_ID },
    editor: { '@type': 'Person', name: 'Nermin Sefić', jobTitle: 'Urednik i direktor', url: 'https://gnk-asg.hr/nermin-sefic/' },
    hasPart: CHANNELS.map((c) => ({ '@type': 'WebPage', name: c.title, url: c.base, inLanguage: c.lang })),
    mainEntity: { '@type': 'ItemList', numberOfItems: CHANNELS.length, itemListElement: CHANNELS.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: c.base })) }
  })}</script>
<style>
*{box-sizing:border-box}body{margin:0;background:#f6f4ef;color:#15191f;font:16px/1.6 Georgia,serif}
a{color:inherit;text-decoration:none}
.kx-top{background:#0c1015;color:#eae4d6;padding:18px clamp(14px,4vw,44px);display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center}
.kx-top a{color:#e9c66c;font:800 11px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase}
.kx-top strong{font:700 clamp(18px,2.6vw,26px)/1.1 Georgia,serif;color:#fff;letter-spacing:-.01em}
.kx-wrap{max-width:1320px;margin:0 auto;padding:clamp(20px,4vw,44px) clamp(14px,4vw,44px) 60px}
.kx-head{margin:0 0 26px}
.kx-head h1{font:700 clamp(28px,4.4vw,52px)/1.04 Georgia,serif;margin:0 0 12px;letter-spacing:-.02em}
.kx-head p{margin:0;max-width:76ch;color:#3d4753}
.kx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px}
.kx-card{background:#fff;border:1px solid #e2ddd2;border-radius:14px;overflow:hidden;transition:transform .2s ease,box-shadow .2s ease}
.kx-logo{display:block;width:auto;height:30px;max-width:190px;object-fit:contain;object-position:left center;border-radius:3px;margin:0 0 8px}
.kx-card:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(15,23,42,.16)}
.kx-card img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}
.kx-body{padding:16px 18px 18px;display:grid;gap:6px}
.kx-flag{font:800 9.5px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8c6a1f}
.kx-body h2{font:700 20px/1.2 Georgia,serif;margin:0}
.kx-body p{margin:0;font-size:14px;color:#4a5158}
.kx-meta{font:700 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#7a6a4b}
.kx-foot{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:0;padding:0 18px 14px;font:700 10px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}
.kx-foot a{color:#8c2f2f;border-bottom:1px solid rgba(140,47,47,.35);text-decoration:none}
.kx-foot a:hover{border-color:#8c2f2f}
.kx-foot span{color:#8a8272;font-weight:700}
.kx-world{margin:44px 0 0;padding:28px 0 0;border-top:1px solid #e2ddd2}
.kx-world h2{font:700 clamp(20px,2.4vw,28px)/1.2 Georgia,serif;margin:0 0 8px}
.kx-world p{margin:0 0 16px;max-width:80ch;color:#3d4753;font-size:14.5px}
.kx-world code{font:600 12.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;background:#fff;border:1px solid #e2ddd2;border-radius:4px;padding:1px 5px}
.kx-worldgrid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
.kx-worldgrid a{display:grid;gap:2px;padding:10px 12px;background:#fff;border:1px solid #e2ddd2;border-radius:10px;text-decoration:none}
.kx-worldgrid a:hover{border-color:#8c6a1f}
.kx-worldgrid b{font:700 13px/1.3 system-ui,sans-serif}
.kx-worldgrid span{font:600 10.5px/1.3 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8a8272}
.kx-go{margin-top:4px;font:800 11px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8c2f2f}
${MESH_CSS}
${HOUSE_CSS}
<style>.am-ribbon{background:rgba(255,255,255,.02)}</style>
</style>
</head>
<body>
<a class="skip-to-content" href="#sadrzaj">Preskoči na sadržaj</a><style>.skip-to-content{position:absolute;left:-9999px;top:0;z-index:9999;background:#e9c66c;color:#08131f;font:800 13px/1 system-ui,sans-serif;letter-spacing:.02em;padding:12px 18px;border-radius:0 0 12px 0;text-decoration:none}.skip-to-content:focus{left:0}main:focus{outline:none}main:focus-visible{outline:3px solid #e9c66c;outline-offset:4px}a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:3px solid #e9c66c;outline-offset:3px;border-radius:4px}</style>
${houseRibbon({ lang: 'hr', edition: '' })}
<div class="kx-top"><strong>AKTUAL MEDIA KANAL</strong><span><a href="/gnk-aktual/">← AKTUAL MEDIA</a> · <a href="/glavni-gradovi/">Glavni gradovi</a> · <a href="/izdanja/">Sva izdanja i deskovi</a> · <a href="/aktual-media/">Podatkovni desk</a> · <a href="/usa/">Colorado · USA</a> · <a href="/radio/">Radio</a> · <a href="/digital-workforce/knjiga/">Knjiga radnika</a></span></div>
<main id="sadrzaj" tabindex="-1" class="kx-wrap">
  <div class="kx-head">
    <h1>${cap(hrCount(CHANNELS.length))} gradova, ${hrCount(LANG_COUNT)} jezika — pod jednom domenom</h1>
    <p>Svako izdanje ima vlastiti feed, sitemap i arhivu. Osam izdanja pokriva regiju, devet globalnih pokriva pet kontinenata — od Nairobija i Kaira preko Jakarte, Pekinga i Tokija do Sydneya, Singapura, São Paula i New Yorka. Adrese su na gnk-asg.hr/kanal/, pa se sve indeksira kao jedna cjelina, a stari linkovi s pages.dev preusmjeravaju ovamo (301).</p>
  </div>
  <div class="kx-grid">${rows}</div>
  <section class="kx-world">
    <h2>Devet svjetskih izdanja na vlastitim adresama</h2>
    <p>Svako od njih ima i vlastiti portal na <code>gnk-world-&lt;grad&gt;.pages.dev</code> — isti sadržaj, isti urednik, vlastiti sitemap i feed. Portal je ulaz u izdanje; puni osvrti ostaju na gnk-asg.hr.</p>
    <ul class="kx-worldgrid">${WORLD_PORTALS.map((p) => `<li><a href="${p.base}" rel="external noopener" hreflang="${p.lang}" lang="${p.lang}"><b>${esc(p.city)}</b><span>${esc(p.country)} · ${esc(p.lang)}</span></a></li>`).join('')}</ul>
  </section>
</main>
${meshBlock({ lang: 'hr', selfUrl: 'https://gnk-asg.hr/kanal/', theme: 'light' })}
</body>
</html>`;
}



/* ---------- /glavni-gradovi/: ista pravila za svaku prijestolnicu ---------- */

const CAPITAL_CSS = `.cg-hero{padding:8px 0 4px}
.cg-hero h1{font:700 clamp(30px,4.6vw,54px)/1.03 Georgia,serif;letter-spacing:-.022em;margin:0 0 14px;max-width:22ch;color:#f4f7fb}
.cg-lead{max-width:78ch;color:#bccbdb;font-size:clamp(15px,1.6vw,17.5px);margin:0 0 18px}
.cg-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;list-style:none;margin:0 0 8px;padding:0}
.cg-stats li{border:1px solid #1e3b58;border-radius:12px;background:#0b1d31;padding:12px 14px}
.cg-stats b{display:block;font:800 clamp(22px,2.8vw,30px)/1 Georgia,serif;color:#e0bd69}
.cg-stats span{display:block;margin-top:6px;font:700 10.5px/1.35 system-ui;letter-spacing:.08em;text-transform:uppercase;color:#8fa3ba}
.cg-h2{font:700 clamp(19px,2.2vw,24px)/1.25 Georgia,serif;margin:26px 0 4px;color:#f4f7fb}
.cg-table{width:100%;border-collapse:collapse;margin:14px 0 0;font-size:14.5px}
.cg-table th{text-align:left;font:800 10.5px/1.3 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#8fa3ba;padding:0 10px 8px;border-bottom:1px solid #1e3b58}
.cg-table td{padding:10px;border-bottom:1px solid #16304a;vertical-align:top;color:#cdd8e5}
.cg-table tr:last-child td{border-bottom:0}
.cg-cap{font:700 16px/1.25 Georgia,serif;color:#f2f6fb}
.cg-cap a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(224,189,105,.4)}
.cg-cap a:hover{color:#e0bd69}
.cg-local{display:block;font:600 12px/1.3 system-ui;color:#94a8bd;margin-top:2px}
.cg-lang{font:700 10.5px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#e0bd69;white-space:nowrap}
.cg-live a{color:#e0bd69;font-weight:700;border-bottom:1px solid rgba(224,189,105,.35)}
.cg-soon{display:inline-block;font:800 9.5px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#f0dfb6;background:#3a2f14;border:1px dashed #8c6a1f;border-radius:999px;padding:5px 9px}
.cg-note{display:block;margin-top:6px;font-size:12.5px;color:#94a8bd;max-width:52ch}
.cg-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;margin:26px 0 0}
.cg-box{border:1px solid #1e3b58;border-radius:14px;background:#0b1d31;padding:18px 20px}
.cg-box h2{font:700 clamp(18px,2vw,22px)/1.25 Georgia,serif;margin:0 0 10px;color:#f2f6fb}
.cg-box ol,.cg-box ul{margin:0;padding-left:18px;display:grid;gap:7px;font-size:14px;color:#bccbdb}
.cg-box li::marker{color:#e0bd69;font-weight:700}
.cg-small{font-size:13px;color:#94a8bd;margin:10px 0 0}
.cg-jump{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
.cg-jump a{font:700 10px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#cdd8e5;border:1px solid #25435f;border-radius:999px;padding:7px 11px;text-decoration:none}
.cg-jump a:hover{border-color:#e0bd69;color:#e0bd69}
.cg-cont-grid{display:grid;gap:20px;margin:10px 0 0}
.cg-cont{border-top:1px solid #16304a;padding-top:12px}
.cg-h3{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;font:700 15px/1.3 Georgia,serif;color:#f2f6fb;margin:0 0 10px}
.cg-h3 span{font:800 10px/1 system-ui;letter-spacing:.08em;color:#08131f;background:#e0bd69;border-radius:999px;padding:4px 8px}
.cg-h3 small{font:600 9.5px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#8296ad}
@media (max-width:680px){.cg-table thead{display:none}.cg-table tr{display:grid;gap:2px;padding:10px 0;border-bottom:1px solid #16304a}.cg-table td{border:0;padding:0 0 2px}}`;

function capitalsPage(lang = 'hr') {
  const en = lang === 'en';
  const all = CAPITALS.capitals || [];
  const live = all.filter((c) => c.status === 'live' && c.edition);
  const soon = all.filter((c) => c.status !== 'live');
  const langs = new Set(live.map((c) => c.lang)).size;
  const channelBy = (id) => CHANNELS.find((c) => c.id === id) || null;
  const title = en ? 'Capitals — one standard for every covered country' : 'Glavni gradovi — isti standard za svaku zemlju koju pokrivamo';
  const description = en
    ? `${all.length} countries, ${all.length} capitals: ${live.length} already have their own edition in the capital city, ${soon.length} are in preparation. The rule is the same for every capital — own address, own mark, own sitemap and feed, the language of the country, the full SEO layer and a two-way link to the network.`
    : `${all.length} zemalja, ${all.length} glavnih gradova: ${live.length} već ima vlastito izdanje u prijestolnici, ${soon.length} su u pripremi. Pravilo je za svaki glavni grad isto — vlastita adresa, vlastiti znak, sitemap i feed, jezik zemlje, puni SEO sloj i obostrana veza s mrežom.`;

  const cardFor = (c) => {
    const channel = c.edition ? channelBy(c.edition) : null;
    const artId = channel ? channel.id : c.slug;
    const name = en ? esc(c.capitalEn || c.capital) : esc(c.capital);
    const artMeta = atlasArt(artId);
    const alt = (artMeta && artMeta.alt && esc(artMeta.alt[lang === 'en' ? 'en' : 'hr']))
      || (channel
        ? `${esc(c.capital)}, ${esc(en ? c.countryEn : c.country)} — ${en ? 'cover artwork of the edition' : 'naslovna grafika izdanja'}`
        : `${esc(c.capital)} — ${en ? 'illustration of the capital' : 'ilustracija prijestolnice'}`);
    const state = c.status !== 'live' ? ` · ${en ? 'in preparation' : 'u pripremi'}` : '';
    return `<li data-c="${esc(contSlug(c.continent))}"><a href="${en ? '/en/capitals' : '/glavni-gradovi'}/${esc(c.slug)}/">
      ${artId ? `<img src="/assets/izdanja/${esc(artId)}-440.webp" alt="${alt}" width="440" height="248" loading="lazy" decoding="async">` : ''}
      <span class="b"><span class="n">${name}</span><span class="c">${esc(en ? c.countryEn : c.country)} · ${esc(c.lang)}${state}</span></span>
    </a></li>`;
  };

  const CONTINENT_EN = {
    Europa: 'Europe', Afrika: 'Africa', Azija: 'Asia',
    'Sjeverna Amerika': 'North America', 'Južna Amerika': 'South America', Oceanija: 'Oceania'
  };
  const continents = [...new Set(all.map((c) => c.continent))];
  /* Jedan slug za kontinent: koristi se za id sekcije, skok i boju kartice,
     pa se „Južna Amerika" ne može razlikovati u tri zapisa. */
  const contSlug = (name) => String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, '-');
  const grouped = continents.map((continent) => {
    const group = all.filter((c) => c.continent === continent);
    const liveCount = group.filter((c) => c.status === 'live').length;
    return `<section class="cg-cont" aria-labelledby="cgc-${contSlug(continent)}">
      <h3 id="cgc-${contSlug(continent)}" class="cg-h3">${esc(en ? CONTINENT_EN[continent] || continent : continent)} <span>${group.length}</span><small>${liveCount}/${group.length} ${en ? 'live' : 'aktivno'}</small></h3>
      <ul class="cp-cards">${group.map(cardFor).join('')}</ul>
    </section>`;
  }).join('');

  const jump = `<nav class="cg-jump" aria-label="${en ? 'Jump to continent' : 'Skok na kontinent'}">${continents.map((continent) => `<a href="#cgc-${contSlug(continent)}">${esc(en ? CONTINENT_EN[continent] || continent : continent)}</a>`).join('')}</nav>`;

  const rows = all.map((c) => {
    const channel = c.edition ? channelBy(c.edition) : null;
    const local = c.capitalLocal && c.capitalLocal !== c.capital ? `<span class="cg-local">${esc(c.capitalLocal)}</span>` : '';
    const name = en ? esc(c.capitalEn || c.capital) : esc(c.capital);
    const action = channel
      ? `<a href="${esc(channel.base)}" hreflang="${esc(c.lang)}" lang="${esc(c.lang)}">${en ? 'Open the edition' : 'Otvori izdanje'} →</a>`
      : `<span class="cg-soon">${en ? 'in preparation' : 'u pripremi'}</span>${c.seats && channelBy(c.seats) ? ` · <a href="${esc(channelBy(c.seats).base)}">${en ? 'country covered from' : 'zemlja pokrivena iz'} ${esc(en ? channelBy(c.seats).cityEn : channelBy(c.seats).city)}</a>` : ''}`;
    return `<tr>
      <td><span class="cg-cap"><a href="${en ? '/en/capitals' : '/glavni-gradovi'}/${esc(c.slug)}/">${name}</a></span>${local}</td>
      <td>${esc(en ? c.countryEn : c.country)}</td>
      <td><span class="cg-lang">${esc(c.lang)}</span></td>
      <td>${esc(c.continent)}</td>
      <td class="cg-live">${action}<span class="cg-note">${esc(c.note || '')}</span></td>
    </tr>`;
  }).join('');

  const standard = (CAPITALS.standard || []).map((line) => `<li>${esc(line)}</li>`).join('');
  const steps = [
    en ? '1. Add the country and capital to apps/region/capitals.json (this list).' : '1. Dodaj zemlju i glavni grad u apps/region/capitals.json (ovaj popis).',
    en ? '2. Add the channel to apps/region/channels.json with a verified source list, palette, time zone and continent.' : '2. Dodaj kanal u apps/region/channels.json s provjerenom listom izvora, paletom, vremenskom zonom i kontinentom.',
    en ? '3. Add the mark to scripts/build-aktual-media-logos-v1.py and run it; add the atlas artwork and run scripts/build-atlas-art-v1.mjs.' : '3. Dodaj znak u scripts/build-aktual-media-logos-v1.py i pokreni ga; dodaj atlas grafiku i pokreni scripts/build-atlas-art-v1.mjs.',
    en ? '4. Run the region build, hub and audit — the edition gets its pages, manifest, sitemap, feed and network block.' : '4. Pokreni region build, hub i audit — izdanje dobiva stranice, manifest, sitemap, feed i blok mreže.',
    en ? '5. Run test-editions-parity — the new edition must pass before it is published.' : '5. Pokreni test-editions-parity — novo izdanje mora proći prije objave.',
    en ? '6. Only then remove the "preparing" status: an edition is never announced before it has sources.' : '6. Tek tada se briše status „u pripremi": izdanje se ne najavljuje prije nego ima izvore.'
  ].map((line) => `<li>${esc(line)}</li>`).join('');

  const body = `${portalHeader('glavni-gradovi/', { h1: false })}
<main id="sadrzaj" tabindex="-1" class="iz-wrap">
  <section class="cg-hero">
    <p class="iz-small" style="margin:0 0 8px">AKTUAL MEDIA · ${en ? 'capitals' : 'glavni gradovi'}</p>
    <h1>${esc(title)}</h1>
    <p class="cg-lead">${esc(en
      ? 'The network follows one rule: a country is covered from its capital, not from whichever city happens to be biggest. Where the biggest city is not the capital — New York, São Paulo, Sydney — it keeps its own edition, and the capital gets one of its own. Nothing here is announced before it exists: a capital without a verified source list stays marked as in preparation.'
      : 'Mreža slijedi jedno pravilo: zemlja se pokriva iz svoje prijestolnice, a ne iz grada koji je slučajno najveći. Gdje najveći grad nije glavni — New York, São Paulo, Sydney — on zadržava svoje izdanje, a glavni grad dobiva vlastito. Ništa se ne najavljuje prije nego postoji: prijestolnica bez provjerene liste izvora ostaje označena kao „u pripremi".')}</p>
    <ul class="cg-stats">
      <li><b>${all.length}</b><span>${en ? 'countries covered' : 'zemalja u mreži'}</span></li>
      <li><b>${live.length}</b><span>${en ? 'editions in the capital' : 'izdanja u glavnom gradu'}</span></li>
      <li><b>${soon.length}</b><span>${en ? 'capitals in preparation' : 'prijestolnice u pripremi'}</span></li>
      <li><b>${langs}</b><span>${en ? 'languages in the capitals' : 'jezika u prijestolnicama'}</span></li>
    </ul>
    <p class="cg-small">${en ? 'Page data refreshed' : 'Podaci stranice osvježeni'}: ${esc(new Date().toISOString().slice(0, 10).split('-').reverse().join('. '))}.</p>
    <p class="cg-small"><a class="btn ghost" href="/atlas/">${en ? 'Picture atlas of the network →' : 'Slikovni atlas mreže →'}</a> <a class="btn ghost" href="/data/glavni-gradovi-v1.json">${en ? 'JSON data' : 'JSON podaci'}</a></p>
  </section>

  <section aria-labelledby="cgCardsTitle">
    <h2 id="cgCardsTitle" class="cg-h2">${en ? 'One page for every capital' : 'Jedna stranica za svaki glavni grad'}</h2>
    ${jump}
    <p class="cg-small">${en ? 'Grouped by continent. Every card opens the page of that capital: language, sources, latest records and its place in the network.' : 'Poredano po kontinentu. Svaka kartica vodi na stranicu tog glavnog grada: jezik, izvori, najnoviji zapisi i mjesto u mreži.'}</p>
    <div class="cg-cont-grid">${grouped}</div>
  </section>

  <section aria-labelledby="cgWebTitle">
    <h2 id="cgWebTitle" style="margin:26px 0 0">${en ? 'Every capital in the web' : 'Svaka prijestolnica u mreži'}</h2>
    ${spiderWeb({ lang, selfUrl: `https://gnk-asg.hr/${en ? 'en/capitals/' : 'glavni-gradovi/'}`, theme: 'dark' })}
  </section>

  <section aria-labelledby="cgTableTitle" style="margin:8px 0 0">
    <h2 id="cgTableTitle">${en ? 'The list, country by country' : 'Popis, zemlja po zemlja'}</h2>
    <table class="cg-table">
      <thead><tr><th>${en ? 'Capital' : 'Glavni grad'}</th><th>${en ? 'Country' : 'Zemlja'}</th><th>${en ? 'Language' : 'Jezik'}</th><th>${en ? 'Continent' : 'Kontinent'}</th><th>${en ? 'Edition' : 'Izdanje'}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>

  <div class="cg-two">
    <section class="cg-box" aria-labelledby="cgStd"><h2 id="cgStd">${en ? 'What every capital gets — the same eight things' : 'Što svaki glavni grad dobiva — istih osam stvari'}</h2><ul>${standard}</ul></section>
    <section class="cg-box" aria-labelledby="cgSteps"><h2 id="cgSteps">${en ? 'How a new capital is added, step by step' : 'Kako se dodaje novi glavni grad, korak po korak'}</h2><ol>${steps}</ol><p class="cg-small">${en ? 'The order matters: sources first, then design, then pages, then tests. A page without sources would be a promise the newsroom cannot keep.' : 'Redoslijed je važan: prvo izvori, pa dizajn, pa stranice, pa testovi. Stranica bez izvora bila bi obećanje koje redakcija ne može održati.'}</p></section>
  </div>

  <p class="cg-small" style="margin-top:22px">${en ? 'All editions: ' : 'Sva izdanja: '}<a href="/izdanja/">${en ? 'editions and desks' : 'izdanja i deskovi'}</a> · <a href="/mreza/">${en ? 'the whole network' : 'cijela mreža'}</a> · <a href="${esc(en ? '/glavni-gradovi/' : '/en/capitals/')}" hreflang="${en ? 'hr' : 'en'}" lang="${en ? 'hr' : 'en'}">${en ? 'Hrvatski' : 'English'}</a> · <a href="/data/glavni-gradovi-v1.json">${en ? 'JSON data' : 'JSON podaci'}</a> · <a href="/glavni-gradovi/llms.txt">llms.txt</a></p>
</main>
${portalFooter()}`;

  const canonical = en ? 'https://gnk-asg.hr/en/capitals/' : 'https://gnk-asg.hr/glavni-gradovi/';
  return portalShell({
    title: en ? 'Capitals — 17 countries, one standard | AKTUAL MEDIA' : 'Glavni gradovi — 17 zemalja, isti standard | AKTUAL MEDIA',
    description,
    feeds: capitalFeeds(lang),
    path: '',
    canonicalPath: canonical,
    keywords: [
      ...all.map((c) => (en ? c.capitalEn || c.capital : c.capital)),
      ...all.map((c) => (en ? c.countryEn || c.country : c.country)),
      'AKTUAL MEDIA', 'Aktual Media', 'glavni gradovi', 'capitals', 'GNK ASG',
      en ? 'capital cities' : 'prijestolnice', en ? 'countries' : 'zemlje',
      en ? 'media network' : 'medijska mreža', 'atlas', 'feed', 'sitemap'
    ],
    tags: ['#GlavniGradovi', '#AKTUALMEDIA', '#GNKASG'],
    logos: ['aktual-media-hr', 'aktual-media-en'],
    lang,
    alternates: [
      { hreflang: 'hr', href: 'https://gnk-asg.hr/glavni-gradovi/' },
      { hreflang: 'en', href: 'https://gnk-asg.hr/en/capitals/' },
      { hreflang: 'x-default', href: 'https://gnk-asg.hr/glavni-gradovi/' }
    ],
    cssExtra: `${SPIDER_CSS}\n${CAPITAL_CSS}\n${CAPITAL_DETAIL_CSS}\n${HOUSE_CSS}`,
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: canonical, inLanguage: lang, isPartOf: { '@id': 'https://gnk-asg.hr/#website' }, publisher: { '@id': MEDIA_ID }, about: { '@id': MEDIA_ID } },
      { '@context': 'https://schema.org', '@type': 'ItemList', '@id': `${canonical}#capitals`, name: en ? 'Capitals of covered countries' : 'Glavni gradovi pokrivenih zemalja', numberOfItems: all.length, itemListElement: all.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: `${c.capital}, ${c.country}`, url: c.edition ? (channelBy(c.edition) || {}).base : canonical })) },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: 'https://gnk-asg.hr/gnk-aktual/' }, { '@type': 'ListItem', position: 2, name: en ? 'Capitals' : 'Glavni gradovi', item: canonical }] }
    ],
    body
  });
}

/* Feed prijestolnica: JSON Feed 1.1 i Atom, na oba jezika. Feed nosi istu
   adresu kao stranica i datum zadnjeg zapisa izdanja — ne izmišlja svježinu. */
function capitalFeeds(lang) {
  const en = lang === 'en';
  const base = en ? '/en/capitals/' : '/glavni-gradovi/';
  return [
    { type: 'application/feed+json', title: en ? 'AKTUAL MEDIA — capitals (JSON Feed)' : 'AKTUAL MEDIA — glavni gradovi (JSON Feed)', href: `${base}feed.json` },
    { type: 'application/atom+xml', title: en ? 'AKTUAL MEDIA — capitals (Atom)' : 'AKTUAL MEDIA — glavni gradovi (Atom)', href: `${base}feed.xml` }
  ];
}

function capitalFeedItems(lang) {
  const en = lang === 'en';
  const iso = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };
  const rows = [];
  for (const capital of CAPITALS.capitals || []) {
    if (!capital.slug) continue;
    const channel = capital.edition ? channelById(capital.edition) : capital.seats ? channelById(capital.seats) : null;
    const data = channel ? channelData(channel.id) : { items: [], updatedAt: '' };
    const items = data.items || [];
    const artId = channel && capital.edition ? channel.id : capital.slug;
    const city = en ? capital.capitalEn || capital.capital : capital.capital;
    const country = en ? capital.countryEn || capital.country : capital.country;
    const sources = channel && Array.isArray(channel.sources) ? channel.sources.length : 0;
    const url = `https://gnk-asg.hr${en ? '/en/capitals' : '/glavni-gradovi'}/${capital.slug}/`;
    const summary = capital.status === 'live'
      ? (en
        ? `${city}, ${country}: ${items.length} records from ${sources} sources, each linked to the original.`
        : `${city}, ${country}: ${items.length} zapisa iz ${sources} izvora, svaki s vezom na izvornik.`)
      : (en
        ? `${city}, ${country}: the capital is in preparation; the country is covered today by the ${channel ? channel.city : '—'} edition.`
        : `${city}, ${country}: prijestolnica je u pripremi; zemlju danas pokriva izdanje ${channel ? channel.city : '—'}.`);
    rows.push({
      id: url,
      url,
      title: `${city} — ${country}`,
      summary,
      date_modified: iso(items[0]?.date || data.updatedAt || ''),
      image: `https://gnk-asg.hr/assets/izdanja/${artId}-1200.webp`,
      tags: [capital.continent, capital.lang, capital.status === 'live' ? 'live' : 'preparing']
    });
  }
  return rows.sort((a, b) => String(b.date_modified || '').localeCompare(String(a.date_modified || '')));
}

function writeCapitalFeeds() {
  const written = [];
  for (const lang of ['hr', 'en']) {
    const en = lang === 'en';
    const dir = en ? join(PORTAL, 'en', 'capitals') : join(PORTAL, 'glavni-gradovi');
    const items = capitalFeedItems(lang);
    const home = en ? 'https://gnk-asg.hr/en/capitals/' : 'https://gnk-asg.hr/glavni-gradovi/';
    const self = `${home}feed.json`;
    const updated = items.map((item) => item.date_modified).filter(Boolean).sort().pop() || new Date().toISOString();
    const json = {
      version: 'https://jsonfeed.org/version/1.1',
      title: en ? 'AKTUAL MEDIA — capitals' : 'AKTUAL MEDIA — glavni gradovi',
      home_page_url: home,
      feed_url: self,
      description: en
        ? 'One entry per capital: status, language, sources and the link to the capital page. 17 countries, one standard.'
        : 'Jedan zapis po prijestolnici: status, jezik, izvori i veza na stranicu grada. 17 zemalja, isti standard.',
      language: lang,
      icon: 'https://gnk-asg.hr/assets/brand/aktual-media-en-512.webp',
      favicon: 'https://gnk-asg.hr/assets/brand/aktual-media-en-512.webp',
      authors: [{ name: 'AKTUAL MEDIA d.o.o.', url: 'https://gnk-asg.hr/gnk-aktual/' }],
      items
    };
    writeFileSync(join(dir, 'feed.json'), `${JSON.stringify(json, null, 2)}\n`);

    const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang}">
  <title>${esc(json.title)}</title>
  <subtitle>${esc(json.description)}</subtitle>
  <link href="${home}"/>
  <link rel="self" type="application/atom+xml" href="${home}feed.xml"/>
  <id>${home}</id>
  <updated>${updated}</updated>
  <author><name>AKTUAL MEDIA d.o.o.</name><uri>https://gnk-asg.hr/gnk-aktual/</uri></author>
${items.map((item) => `  <entry>
    <title>${esc(item.title)}</title>
    <link href="${item.url}"/>
    <id>${item.id}</id>
    <updated>${item.date_modified || updated}</updated>
    <summary>${esc(item.summary)}</summary>
    <category term="${esc(item.tags[0])}"/>
    <category term="${esc(item.tags[1])}"/>
  </entry>`).join('\n')}
</feed>
`;
    writeFileSync(join(dir, 'feed.xml'), atom);
    written.push(`${en ? 'en/capitals' : 'glavni-gradovi'}/feed.{json,xml} · ${items.length}`);
  }
  return written;
}

export function writeCapitals() {
  mkdirSync(join(PORTAL, 'glavni-gradovi'), { recursive: true });
  mkdirSync(join(PORTAL, 'en', 'capitals'), { recursive: true });
  writeFileSync(join(PORTAL, 'glavni-gradovi', 'index.html'), capitalsPage('hr'));
  writeFileSync(join(PORTAL, 'en', 'capitals', 'index.html'), capitalsPage('en'));

  /* Jedna stranica po prijestolnici, na hrvatskom i na engleskom. Stranica se
     gradi iz istog ugovora kao popis, pa se nova prijestolnica ne piše ručno. */
  const feedsWritten = writeCapitalFeeds();
  const pages = [];
  for (const capital of CAPITALS.capitals || []) {
    if (!capital.slug) continue;
    for (const lang of ['hr', 'en']) {
      const dir = lang === 'en'
        ? join(PORTAL, 'en', 'capitals', capital.slug)
        : join(PORTAL, 'glavni-gradovi', capital.slug);
      mkdirSync(dir, { recursive: true });
      const artId = capital.edition || capital.slug;
      const artMeta = atlasArt(artId);
      writeFileSync(join(dir, 'index.html'), buildCapitalPage(capital, {
        lang,
        capitals: CAPITALS.capitals || [],
        standard: CAPITALS.standard || [],
        channelBy: channelById,
        channelData,
        portalShell,
        portalHeader,
        portalFooter,
        MEDIA_ID,
        artAlt: artMeta ? artMeta.alt : null,
        feeds: capitalFeeds(lang)
      }));
      pages.push(lang === 'en' ? `/en/capitals/${capital.slug}/` : `/glavni-gradovi/${capital.slug}/`);
    }
  }
  /* Vlastiti sitemap prijestolnica: 17 hrvatskih i 17 engleskih adresa, s
     prioritetom koji je niži za prijestolnice koje još nemaju izdanje. */
  const today = new Date().toISOString().slice(0, 10);
  const capUrls = (CAPITALS.capitals || []).filter((c) => c.slug).flatMap((c) => [
    { loc: `https://gnk-asg.hr/glavni-gradovi/${c.slug}/`, priority: c.status === 'live' ? '0.8' : '0.6' },
    { loc: `https://gnk-asg.hr/en/capitals/${c.slug}/`, priority: c.status === 'live' ? '0.7' : '0.5' }
  ]);
  writeFileSync(join(PORTAL, 'glavni-gradovi', 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${capUrls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`);

  /* llms.txt: kratki strojni opis popisa — isti standard kao na kanalima. */
  const llms = [
    '# Glavni gradovi — AKTUAL MEDIA',
    '',
    '> Popis zemalja koje mreža pokriva i prijestolnice iz koje se pokrivaju. Svaka prijestolnica ima vlastitu stranicu na hrvatskom i engleskom; izdanje u prijestolnici otvara se tek kad ima provjerenu listu izvora.',
    '',
    `- Zemalja: ${(CAPITALS.capitals || []).length}`,
    `- Izdanja u glavnom gradu: ${(CAPITALS.capitals || []).filter((c) => c.status === 'live').length}`,
    `- Prijestolnica u pripremi: ${(CAPITALS.capitals || []).filter((c) => c.status !== 'live').length}`,
    `- Stranica: ${pages.length} (17 hrvatskih + 17 engleskih)`,
    '',
    '## Prijestolnice',
    ...(CAPITALS.capitals || []).map((c) => `- ${c.capital}, ${c.country} (${c.lang}) — https://gnk-asg.hr/glavni-gradovi/${c.slug}/ · ${c.status === 'live' ? `izdanje ${c.edition}` : `u pripremi; zemlju pokriva ${c.seats || '—'}`}`),
    '',
    '## Ugovor',
    ...(CAPITALS.standard || []).map((line) => `- ${line}`),
    '',
    '## Atlas',
    '- Slikovni atlas: https://gnk-asg.hr/atlas/ (hr) · https://gnk-asg.hr/en/atlas/ (en)',
    '',
    '## Poveznice',
    '- https://gnk-asg.hr/glavni-gradovi/',
    '- https://gnk-asg.hr/glavni-gradovi/sitemap.xml',
    '- https://gnk-asg.hr/en/capitals/',
    '- https://gnk-asg.hr/mreza/',
    '- https://gnk-asg.hr/izdanja/',
    `- ${CONTACT}`,
    ''
  ].join('\n');
  writeFileSync(join(PORTAL, 'glavni-gradovi', 'llms.txt'), llms);

  const data = {
    version: CAPITALS.version,
    updatedAt: new Date().toISOString(),
    countries: (CAPITALS.capitals || []).length,
    live: (CAPITALS.capitals || []).filter((c) => c.status === 'live').length,
    preparing: (CAPITALS.capitals || []).filter((c) => c.status !== 'live').length,
    standard: CAPITALS.standard,
    pages: pages.length,
    capitals: (CAPITALS.capitals || []).map((c) => ({
      ...c,
      url: c.edition ? `https://gnk-asg.hr/kanal/${c.edition}/` : null,
      portal: c.edition ? `https://gnk-world-${c.edition}.pages.dev/` : null,
      page: c.slug ? `https://gnk-asg.hr/glavni-gradovi/${c.slug}/` : null,
      pageEn: c.slug ? `https://gnk-asg.hr/en/capitals/${c.slug}/` : null
    }))
  };
  writeFileSync(join(PORTAL, 'data', 'glavni-gradovi-v1.json'), `${JSON.stringify(data, null, 2)}\n`);
  return { countries: data.countries, live: data.live, preparing: data.preparing, pages: pages.length, sitemap: capUrls.length, feeds: feedsWritten };
}

/* ---------- /usa/: ishodište projekta, GNK DINAMO Ltd., Boulder, Colorado ---------- */

const USA = 'https://gnk-asg.hr/usa/';

export function usaPage() {
  const editions = CHANNELS.map((c) => `<li class="us-ed">
    <a href="/kanal/${esc(c.id)}/">
      <span class="us-ed-city">${esc(CITY_SHORT[c.id] || c.city)}</span>
      <span class="us-ed-meta">AKTUAL MEDIA KANAL · ${esc(c.country)} · ${esc(c.lang)}</span>
      <span class="us-ed-go">Otvori izdanje →</span>
    </a>
    <a class="us-ed-en" href="/kanal/${esc(c.id)}/en/" hreflang="en" lang="en">English</a>
  </li>`).join('');

  const links = [
    ['/group-network/', 'Grupna mreža', '33 društva · 12 lokacija u širenju'],
    ['/the-code/', 'THE CODE', 'aktivacija grupe iz Coloradoa'],
    ['/nermin-sefic/', 'Nermin Sefić', 'ovlašteni predstavnik i UBO grupe'],
    ['/izdanja/', 'Sva izdanja i deskovi', 'devet deskova · tjednik · galerija'],
    ['/kanal/', 'AKTUAL MEDIA KANAL', `${CHANNELS.length} gradskih izdanja`],
    ['/radio/', 'AKTUAL MEDIA RADIO', 'player na svakoj stranici'],
    ['/galerija/', 'Galerija', 'foto i vizuali'],
    ['/gnk-aktual/', 'AKTUAL MEDIA', 'središnja stranica'],
    ['/digital-workforce/', 'Digitalna radna snaga', 'javna simulacija'],
    ['/knowledge-center/', 'Centar znanja', 'odgovori i pojmovnik'],
    ['https://gnk-asg-tjednik.pages.dev/', 'Business Tjednik', 'tjedni pregled'],
    ['https://gnk-asg-tjednik.pages.dev/tjednik/2026-W43/', 'Tjednik W43', 'ovaj tjedan']
  ].map(([href, name, kick]) => `<a href="${esc(href)}"${href.startsWith('http') ? ' rel="external noopener"' : ''}><b>${esc(name)}</b><span>${esc(kick)}</span></a>`).join('');

  const facts = [
    ['Tvrtka', 'GNK DINAMO Ltd.'],
    ['Sjedište', 'Boulder, Colorado, USA'],
    ['Entity ID', '20238180649'],
    ['Ovlašteni predstavnik', '<a href="/nermin-sefic/">Nermin Sefić</a>'],
    ['Stvarni vlasnik / UBO grupe', '<a href="/nermin-sefic/">Nermin Sefić</a>'],
    ['Povezana društva', '33'],
    ['Lokacije u širenju', '12']
  ].map(([k, v]) => `<div class="us-fact"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('');

  const kpis = [
    ['Prihodi grupe', '4,7046 mlrd. EUR'],
    ['Neto dobit', '982,48 mil. EUR'],
    ['Ukupna aktiva', '3,4830 mlrd. EUR'],
    ['Kapital i rezerve', '3,4140 mlrd. EUR'],
    ['Obveze', '69,04 mil. EUR'],
    ['Udio kapitala', '98,02 %']
  ].map(([k, v]) => `<div><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('');

  const jsonld = [
    WEBSITE_NODE,
    {
      '@context': 'https://schema.org', '@type': 'Organization',
      '@id': 'https://gnk-asg.hr/usa/#gnk-dinamo-ltd',
      name: 'GNK DINAMO Ltd.', legalName: 'GNK DINAMO Ltd.',
      identifier: '20238180649',
      url: USA,
      address: { '@type': 'PostalAddress', addressLocality: 'Boulder', addressRegion: 'Colorado', addressCountry: 'US' },
      employee: { '@type': 'Person', name: 'Nermin Sefić', jobTitle: 'Ovlašteni predstavnik', url: 'https://gnk-asg.hr/nermin-sefic/' },
      subOrganization: { '@type': 'Organization', name: 'GNK ASG d.o.o.', url: 'https://gnk-asg.hr/' }
    },
    {
      '@context': 'https://schema.org', '@type': 'WebPage',
      '@id': `${USA}#webpage`, url: USA, name: 'GNK DINAMO Ltd. — Boulder, Colorado, USA',
      inLanguage: 'hr', isPartOf: { '@id': 'https://gnk-asg.hr/#website' },
      about: { '@id': 'https://gnk-asg.hr/usa/#gnk-dinamo-ltd' },
      publisher: { '@type': 'NewsMediaOrganization', name: 'AKTUAL MEDIA d.o.o.', url: 'https://gnk-asg.hr/gnk-aktual/' }
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: 'https://gnk-asg.hr/gnk-aktual/' },
        { '@type': 'ListItem', position: 2, name: 'Sva izdanja', item: HUB },
        { '@type': 'ListItem', position: 3, name: 'Colorado · USA', item: USA }
      ]
    },
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'Izdanja povezana s ishodištem u Coloradu',
      numberOfItems: CHANNELS.length,
      itemListElement: CHANNELS.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: c.base }))
    }
  ];

  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GNK DINAMO Ltd. — Boulder, Colorado, USA | ishodište AKTUAL MEDIA</title>
<meta name="description" content="GNK DINAMO Ltd., Boulder, Colorado, USA — matična tvrtka grupe i ishodište mreže AKTUAL MEDIA. Entity ID 20238180649, 33 povezana društva, 12 lokacija u širenju i konsolidirani pokazatelji FY 2025, s poveznicama na svih ${CHANNELS.length} gradskih izdanja.">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="keywords" content="GNK DINAMO Ltd., Boulder, Colorado, USA, GNK ASG, AKTUAL MEDIA, ishodište projekta, Nermin Sefić, 20238180649">
<link rel="canonical" href="${USA}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="GNK DINAMO Ltd. — Boulder, Colorado, USA">
<meta property="og:description" content="Ishodište projekta i mreže AKTUAL MEDIA: GNK DINAMO Ltd., Boulder, Colorado, USA, Entity ID 20238180649.">
<meta property="og:url" content="${USA}">
<meta property="og:image" content="${SOCIAL_IMAGE}">
<meta property="og:image:alt" content="GNK DINAMO Ltd. — Boulder, Colorado, USA">
<meta property="og:locale" content="hr_HR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="GNK DINAMO Ltd. — Boulder, Colorado, USA">
<meta name="twitter:description" content="Matična tvrtka grupe i ishodište mreže AKTUAL MEDIA.">
<meta name="twitter:image" content="${SOCIAL_IMAGE}">
<meta name="twitter:image:alt" content="GNK DINAMO Ltd. — Boulder, Colorado, USA">

<link rel="alternate" hreflang="hr" href="${USA}">
<link rel="alternate" hreflang="x-default" href="${USA}">
<script type="application/ld+json">${safeJson(jsonld)}</script>
<style>
*{box-sizing:border-box}
body{margin:0;background:#061019;color:#e8edf3;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit;text-decoration:none}a:hover{text-decoration:underline}
.us-top{background:#04101d;border-bottom:1px solid #1b3550;font:700 11px/1.4 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#8fa3ba;padding:16px clamp(14px,4vw,40px);display:flex;gap:16px;flex-wrap:wrap;justify-content:space-between}
.us-top a{color:#e0bd69}
.us-wrap{max-width:1120px;margin:0 auto;padding:0 clamp(14px,4vw,40px)}
.us-hero{padding:clamp(28px,5vw,64px) 0 24px;border-bottom:1px solid #1b3550;background:radial-gradient(900px 340px at 12% -10%,rgba(224,189,105,.16),transparent 60%)}
.us-kicker{font:800 11px/1 system-ui;letter-spacing:.2em;text-transform:uppercase;color:#e0bd69;margin:0 0 12px}
.us-hero h1{font:700 clamp(30px,5vw,56px)/1.02 Georgia,serif;margin:0 0 14px;letter-spacing:-.02em;color:#fff}
.us-lead{font:400 clamp(16px,1.6vw,19px)/1.6 Georgia,serif;color:#c6d2df;max-width:74ch;margin:0}
.us-hero-meta{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 0;font:700 10.5px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#9fb0c2}
.us-hero-meta span{border:1px solid #27405b;padding:7px 10px}
.us-sec{padding:34px 0;border-bottom:1px solid #14283c}
.us-sec h2{font:700 clamp(22px,2.6vw,32px)/1.15 Georgia,serif;margin:0 0 6px;color:#fff}
.us-sub{color:#a9b6c6;margin:0 0 20px;max-width:76ch}
.us-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin:0}
.us-fact{border:1px solid #1d3a58;background:#081a2b;padding:12px 14px}
.us-fact dt{font:800 9.5px/1 system-ui;letter-spacing:.18em;text-transform:uppercase;color:#7f93a9;margin:0 0 5px}
.us-fact dd{margin:0;font:600 15px/1.35 system-ui;color:#fff}
.us-fact dd a{color:#e0bd69;border-bottom:1px solid rgba(224,189,105,.4)}
.us-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.us-kpis div{border:1px solid #1d3a58;background:#081a2b;padding:14px}
.us-kpis small{display:block;font:800 9.5px/1 system-ui;letter-spacing:.16em;text-transform:uppercase;color:#7f93a9;margin-bottom:6px}
.us-kpis strong{font:700 20px/1.2 Georgia,serif;color:#e0bd69}
.us-note{font:400 12.5px/1.55 Georgia,serif;color:#93a6ba;margin:14px 0 0;max-width:80ch;border-left:2px solid #27405b;padding-left:12px}
.us-eds{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}
.us-ed{position:relative;border:1px solid #1d3a58;background:#081a2b;transition:border-color .18s ease,transform .18s ease}
.us-ed:hover{border-color:#e0bd69;transform:translateY(-2px)}
.us-ed>a:first-child{display:grid;gap:4px;padding:14px 14px 34px}
.us-ed-city{font:800 16px/1 system-ui;letter-spacing:.04em;text-transform:uppercase;color:#fff}
.us-ed-meta{font:600 11px/1.3 system-ui;color:#93a6ba}
.us-ed-go{font:800 10px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#e0bd69;margin-top:6px}
.us-ed-en{position:absolute;right:10px;bottom:9px;font:800 9px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#c6d2df;border-bottom:1px solid #3a5878;padding-bottom:2px}
.us-links{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}
.us-links a{border:1px solid #1d3a58;background:#081a2b;padding:12px 14px;display:grid;gap:3px}
.us-links a:hover{border-color:#e0bd69;text-decoration:none}
.us-links b{font:700 14px/1.2 system-ui;color:#fff}
.us-links span{font:600 10.5px/1.3 system-ui;letter-spacing:.06em;text-transform:uppercase;color:#7f93a9}
.us-tags{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:16px 0 0;padding:0}
.us-tags li{font:700 10.5px/1 system-ui;letter-spacing:.06em;color:#e0bd69;border:1px solid rgba(224,189,105,.35);padding:6px 9px}
.us-foot{background:#04101d;border-top:1px solid #1b3550;padding:26px 0 40px;font:400 12.5px/1.6 Georgia,serif;color:#93a6ba}
.us-foot p{margin:0 0 8px}
.us-foot a{color:#c6d2df;text-decoration:underline}
</style>
</head>
<body>
<a class="skip-to-content" href="#sadrzaj">Preskoči na sadržaj</a><style>.skip-to-content{position:absolute;left:-9999px;top:0;z-index:9999;background:#e9c66c;color:#08131f;font:800 13px/1 system-ui,sans-serif;letter-spacing:.02em;padding:12px 18px;border-radius:0 0 12px 0;text-decoration:none}.skip-to-content:focus{left:0}main:focus{outline:none}main:focus-visible{outline:3px solid #e9c66c;outline-offset:4px}a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:3px solid #e9c66c;outline-offset:3px;border-radius:4px}</style>
${houseRibbon({ lang: 'hr', edition: '' })}
<div class="us-top"><strong>GNK DINAMO Ltd. · Boulder, Colorado</strong><span><a href="/gnk-aktual/">← AKTUAL MEDIA</a> · <a href="/izdanja/">Sva izdanja</a> · <a href="/aktual-media/">Podatkovni desk</a> · <a href="/kanal/">Kanali</a> · <a href="/radio/">Radio</a></span></div>
<main id="sadrzaj" tabindex="-1">
  <section class="us-hero"><div class="us-wrap">
    <p class="us-kicker">Ishodište projekta · USA</p>
    <h1>GNK DINAMO Ltd. — Boulder, Colorado</h1>
    <p class="us-lead">Ovdašnji podaci su ishodište svih poveznica ove mreže: matična tvrtka GNK DINAMO Ltd. ima sjedište u Boulderu u Coloradu, a GNK ASG d.o.o. uključen je u njezin grupni prikaz. Iz ovog čvora vode poveznice na svih ${CHANNELS.length} gradskih izdanja AKTUAL MEDIA KANAL, na devet deskova i na svaku drugu javnu stranicu portala — i svaka od tih stranica vodi natrag ovamo.</p>
    <p class="us-hero-meta"><span>Entity ID 20238180649</span><span>Boulder · Colorado · USA</span><span>33 društva · 12 lokacija u širenju</span></p>
  </div></section>

  <section class="us-sec"><div class="us-wrap">
    <h2>Tvrtka i ishodište</h2>
    <p class="us-sub">Podaci kako ih portal objavljuje u grupnom prikazu GNK DINAMO Ltd. Iznos i status pojedinih stavki vrijede onako kako je navedeno u izvornom dokumentu; ovdje se ne dodaju nove tvrdnje.</p>
    <dl class="us-facts">${facts}</dl>
  </div></section>

  <section class="us-sec"><div class="us-wrap">
    <h2>Konsolidirani pokazatelji FY 2025</h2>
    <p class="us-sub">Grupni podatci GNK DINAMO Ltd. iz dokumenta označenog kao management-certified i internally group-reviewed za javnu objavu u Coloradu.</p>
    <div class="us-kpis">${kpis}</div>
    <p class="us-note">Grupni podatci nisu predstavljeni kao neovisno revidirani izvještaji GNK ASG d.o.o. Pojedinačni financijski podaci društva objavljeni su zasebno na <a href="/group-network/">Grupnoj mreži</a>.</p>
  </div></section>

  <section class="us-sec"><div class="us-wrap">
    <h2>Osam izdanja koja izlaze iz ovog ishodišta</h2>
    <p class="us-sub">Svako izdanje ima svoj feed, sitemap i engleski pregled. Poveznica vraća na ovo ishodište sa svake stranice izdanja.</p>
    <ul class="us-eds">${editions}</ul>
  </div></section>

  <section class="us-sec"><div class="us-wrap">
    <h2>Sve poveznice iz Colorada</h2>
    <p class="us-sub">Jedan ulaz, svi javni dijelovi mreže — od grupne mreže i tjednika do radija i galerije.</p>
    <div class="us-links">${links}</div>
    <ul class="us-tags" aria-label="Oznake"><li>#GNKDinamoLtd</li><li>#Colorado</li><li>#Boulder</li><li>#USA</li><li>#GNKASG</li><li>#AKTUALMEDIA</li><li>#NerminSefić</li><li>#NerminSefic</li><li>#SeficNermin</li><li>#SEFICNERMIN</li><li>#UrednikNerminSefić</li></ul>
  </div></section>
</main>
<footer class="us-foot"><div class="us-wrap">
  <p><strong>AKTUAL MEDIA d.o.o.</strong> · Urednik i direktor: <a href="/nermin-sefic/">Nermin Sefić</a> · <a href="mailto:${CONTACT}">${CONTACT}</a></p>
  <p>Ishodište: GNK DINAMO Ltd., Boulder, Colorado, USA. Sva izdanja objavljuju osvrte na način izvještavanja; izvornici su uvijek povezani, a tvrdnje izvornika nisu tvrdnje redakcije.</p>
  <p><a href="/izdanja/sitemap.xml">Sitemap izdanja</a> · <a href="/kanal/">Svi kanali</a> · <a href="https://gnk-asg.hr/">gnk-asg.hr</a></p>
</div></footer>
</body>
</html>`;
}

/* ---------- sitemap-index: jedan ulaz, svi sitemapi ---------- */

function writeAtlas() {
  const counts = {};
  for (const channel of CHANNELS) counts[channel.id] = channelData(channel.id).items.length;
  const capitals = CAPITALS.capitals || [];
  const today = new Date().toISOString().slice(0, 10);
  for (const lang of ['hr', 'en']) {
    const dir = lang === 'en' ? join(PORTAL, 'en', 'atlas') : join(PORTAL, 'atlas');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), buildAtlasPage({
      lang,
      capitals,
      channels: CHANNELS,
      counts,
      artMeta: atlasArt,
      feeds: capitalFeeds(lang),
      standard: CAPITALS.standard || [],
      shell: portalShell,
      header: portalHeader,
      footer: portalFooter
    }));
  }
  /* Atlas ima vlastiti sitemap: dvije adrese, isti ugovor kao i gradovi. */
  const urls = [
    { loc: 'https://gnk-asg.hr/atlas/', priority: '0.8' },
    { loc: 'https://gnk-asg.hr/en/atlas/', priority: '0.7' }
  ];
  writeFileSync(join(PORTAL, 'atlas', 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`);
  return { pages: 2, cards: capitals.length };
}

function writeSitemapIndex() {
  const today = new Date().toISOString().slice(0, 10);
  const core = [
    ['sitemap.xml', '2026-10-12'], ['editorial-sitemap.xml', '2026-10-19'],
    ['corporate-editorials-sitemap.xml', '2026-08-30'], ['visual-sitemap.xml', '2026-08-26'],
    ['image-sitemap.xml', '2026-10-12'], ['world-topics-image-sitemap.xml', '2026-08-26'],
    ['spt-sitemap.xml', '2026-10-12'], ['izdanja/sitemap.xml', today], ['galerija/sitemap.xml', today],
    ['aktual-media/sitemap.xml', today], ['tehnologija-buducnosti/sitemap.xml', today],
    ['glavni-gradovi/sitemap.xml', today], ['atlas/sitemap.xml', today], ['mreza/sitemap.xml', today],
    ['gnk-aktual/mreza/sitemap.xml', today]
  ];
  const channels = CHANNELS.map((c) => [`kanal/${c.id}/sitemap.xml`, today]);
  const all = [...core, ...channels];
  const seen = new Set();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.filter(([loc]) => (seen.has(loc) ? false : seen.add(loc))).map(([loc, lastmod]) => `  <sitemap>\n    <loc>https://gnk-asg.hr/${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`).join('\n')}
</sitemapindex>
`;
  writeFileSync(join(PORTAL, 'sitemap-index.xml'), xml);
  return all.length;
}

function injectBand(cards, lang = 'hr') {
  const en = lang === 'en';
  const file = en ? join(PORTAL, 'en', 'gnk-aktual', 'index.html') : join(PORTAL, 'gnk-aktual', 'index.html');
  if (!existsSync(file)) return;
  let html = readFileSync(file, 'utf8');
  const start = '<!-- IZDANJA-BAND:START -->';
  const end = '<!-- IZDANJA-BAND:END -->';
  const picks = cards.filter((c) => CHANNELS.some((ch) => ch.id === c.id));
  const CITY_EN = { zagreb: 'Zagreb', beograd: 'Belgrade', sarajevo: 'Sarajevo', budimpesta: 'Budapest', ljubljana: 'Ljubljana', rim: 'Rome', sofija: 'Sofia', bukurest: 'Bucharest',
    nairobi: 'Nairobi', jakarta: 'Jakarta', newyork: 'New York', saopaulo: 'São Paulo', sydney: 'Sydney', singapur: 'Singapore', kairo: 'Cairo', tokio: 'Tokyo', peking: 'Beijing' };
  // Na engleskom je 'CHANNEL', a gradovi nose engleska imena (Rome, Sofia),
  // jer je 'KANAL' hrvatska riječ i ne smije stajati u EN naslovu.
  const CITY_EN_UPPER = { zagreb: 'ZAGREB', beograd: 'BELGRADE', sarajevo: 'SARAJEVO', budimpesta: 'BUDAPEST', ljubljana: 'LJUBLJANA', rim: 'ROME', sofija: 'SOFIA', bukurest: 'BUCUREȘTI',
    nairobi: 'NAIROBI', jakarta: 'JAKARTA', newyork: 'NEW YORK', saopaulo: 'SÃO PAULO', sydney: 'SYDNEY', singapur: 'SINGAPORE', kairo: 'CAIRO', tokio: 'TOKYO', peking: 'BEIJING' };
  /* Ime izdanja dolazi iz zapisa kanala (tamo je i jezična inačica), pa
     engleska traka ne mora prekrajati ono što već postoji. */
  const cityName = (c) => (en ? (c.nameEn || `AKTUAL MEDIA CHANNEL ${CITY_EN_UPPER[c.id] || esc(c.city).toUpperCase()}`) : esc(c.name));
  const lis = picks.map((c, i) => `<li class="izdanja-item"><span class="izdanja-num">${String(i + 1).padStart(2, '0')}</span><div><h3><a href="${c.url}" target="_blank" rel="external noopener">${cityName(c)}</a></h3><p>${esc(c.lang)} · ${en ? (CITY_EN[c.id] || esc(c.city)) : esc(c.city)} · ${c.count} ${en ? 'reviews' : 'osvrta'}</p></div></li>`).join('');
  const title = en ? 'Our editions — five continents, one newsroom' : 'Naša izdanja — pet kontinenata, jedno uredništvo';
  const sub = en
    ? `${picks.length} city editions in thirteen languages: eight in the region, nine across Africa, Asia, the Americas and Oceania. Every edition has its own link and its own feed — and everything returns to AKTUAL MEDIA.`
    : `${picks.length} gradskih izdanja na ${hrCount(LANG_COUNT)} jezika: osam u regiji, devet na pet kontinenata. Svako izdanje ima svoj link i svoj feed — a sve se vraća na AKTUAL MEDIA.`;
  const all = en ? 'All editions →' : 'Sva izdanja →';
  const block = `${start}
  <section class="izdanja-band" aria-labelledby="izdanjaBandTitle">
    <div class="izdanja-band-head">
      <div>
        <h2 class="izdanja-band-title" id="izdanjaBandTitle">${title}</h2>
        <p class="izdanja-sub">${sub}</p>
      </div>
      <a class="izdanja-all" href="/izdanja/">${all}</a>
    </div>
    <ol class="izdanja-list">${lis}</ol>
  </section>
  ${end}`;
  if (html.includes(start) && html.includes(end)) {
    html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block);
  } else if (en && /<section class="am-spt"[^>]*>/.test(html)) {
    html = html.replace(/<section class="am-spt"[^>]*>/, (m) => `${block}\n${m}`);
  } else if (en && html.includes('<!-- AKTUAL-MREZA-BAND:START -->')) {
    html = html.replace('<!-- AKTUAL-MREZA-BAND:START -->', `${block}\n<!-- AKTUAL-MREZA-BAND:START -->`);
  } else {
    html = html.replace('<!-- KANAL-BAND:END -->', `<!-- KANAL-BAND:END -->\n${block}`);
  }
  writeFileSync(file, html);
}

if (process.argv[1] && /hub\.mjs$/.test(process.argv[1])) {
  buildHub().then(async (hub) => {
    const cards = JSON.parse(readFileSync(join(PORTAL, 'data', 'izdanja.json'), 'utf8')).cards || [];
    mkdirSync(join(PORTAL, 'kanal'), { recursive: true });
    writeFileSync(join(PORTAL, 'kanal', 'index.html'), kanalIndex(cards));
    mkdirSync(join(PORTAL, 'usa'), { recursive: true });
    writeFileSync(join(PORTAL, 'usa', 'index.html'), usaPage());
    const capitals = writeCapitals();
    const atlas = writeAtlas();
    const sitemaps = writeSitemapIndex();
    /* /kanal/ i /usa/ su upravo prepisani, pa traku tehnologije vraćamo
       nakon njih — inače bi nestala do sljedećeg ciklusa. */
    const { injectFutureTechBands } = await import('./future-tech.mjs');
    const techBands = injectFutureTechBands();
    /* Mreža neovisnih izdanja: hub /mreza/ i /en/network/ nose brojke
       izbornog deska, pa se pregraddе u istom ciklusu kao i ostatak portala. */
    let network = null;
    try {
      const { execFileSync } = await import('node:child_process');
      network = execFileSync(process.execPath, [join(ROOT, 'apps', 'sites', 'engine', 'hub.mjs')], { encoding: 'utf8' }).trim().split('\n').pop();
    } catch (error) {
      network = `preskočeno: ${error.message.split('\n')[0]}`;
    }
    console.log(JSON.stringify({ ok: true, ...hub, kanalIndex: true, capitals, atlas, sitemaps, techBands, network }, null, 2));
  });
}
