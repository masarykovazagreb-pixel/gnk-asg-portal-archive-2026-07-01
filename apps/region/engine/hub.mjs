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
import { ensureDeskTiles, tilePath, variantFor } from './desk-art.mjs';
import { logoImg, logoFor, logoAlternate, channelLogoSlug, deskLogoSlug, logoJsonLd } from './brand.mjs';

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

export const EDITION_META = {
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
    description: 'Srpsko izdanje AKTUAL MEDIA čita N1 Srbija, Danas, Nova.rs i Politiku i od svakog pronađenog teksta pravi osvrt na način izveštavanja. Cilj nije prepričati vest, već pokazati kako je naslovljena, šta je u sažetku ostalo neimenovano i šta treba proveriti pre zaključka. Svaki zapis nosi direktan link na izvornik i datum objave, a čitava arhiva je pretraživa kroz teme: politika, privreda, bezbednost i kibernetika, rat i eskalacije, energija i sport. Izdanje ima svoj feed, sitemap i stranicu metodologije, pa se može pratiti i mašinski i ljudski. Jezik je srpski, a grad u zaglavlju je Beograd — kanal ostaje jedan od osam gradskih kanala iste matične kuće. Kada izvor nije dostupan, izdanje to kaže i ne popunjava prazninu izmišljenim sadržajem.',
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
    description: 'Business desk skuplja poslovne tekstove iz svih gradskih kanala AKTUAL MEDIA i pokazuje što je stvarno objavljeno, a što je najavljeno. Prate se tržišta, bilance, investicije, kamate i koncentracija kapitala u osam zemalja regije. Svaki zapis nosi izvor, datum i poveznicu na izvornik, a osvrt se bavi time kako je brojka iz naslova objašnjena u tijelu teksta. Stranica ne daje investicijske preporuke i ne ocjenjuje tvrtke; daje pitanja koja treba postaviti prije odluke. Ažurira se iz istih dnevnih podataka kao i gradski kanali.',
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
    description: 'Desk Svijet povezuje vanjske teme s lokalnim posljedicama: energetiku, trgovinske mjere, migracije, sigurnost i klimu. Ne donosi stavove o sukobima i ne prenosi tvrdnje bez izvora; bilježi kako je pojedini događaj naslovljen u osam zemalja regije i što se od toga može provjeriti. Uz svaki zapis stoje izvor, datum i poveznica na izvornik, a brojke se ne zaokružuju bez konteksta. Desk služi kao okvir za razumijevanje lokalnih odluka, ne kao komentar svjetske politike. Ažurira se iz dnevnih podataka gradskih kanala.',
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
  ...Object.entries(DESKS).map(([id, d]) => ({ name: d.name, url: `https://gnk-asg.hr/izdanja/${id}/` })),
  ...MEDIA_EXTRA_DESTINATIONS
];
const isWebsiteNode = (node) => (Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']]).includes('WebSite');

function portalShell({ title, description, path, keywords, tags = [], jsonld = [], body, cssExtra = '', image = SOCIAL_IMAGE, imageAlt = 'AKTUAL MEDIA', logos = [] }) {
  const canonical = `${HUB}${path}`;
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
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(truncate(description, 300))}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="keywords" content="${esc(keywordList.join(', '))}">
${[...new Map(tags.filter((t) => String(t).startsWith('#')).map((t) => [String(t).toLowerCase(), String(t)])).values()].map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('\n')}
<meta property="og:image:alt" content="${esc(imageAlt)}">
<link rel="canonical" href="${canonical}">
${logos.map((slug) => logoAlternate(slug)).filter(Boolean).join('\n')}
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(truncate(description, 300))}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${shareImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(truncate(description, 200))}">
<meta name="twitter:image" content="${shareImage}">
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
.iz-card--lead{grid-column:span 2}
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
${body}
<script src="/assets/public-unified-menu-v6.js?v=20261019-izdanja" defer></script>
<script src="/assets/public-contrast-hardening-v1.js?v=20261019-izdanja" defer></script>
</body>
</html>`;
}

const portalHeader = (active, { h1 = true } = {}) => `<div class="iz-top"><div class="iz-wrap"><span>AKTUAL MEDIA d.o.o. · Naša izdanja</span><a href="/gnk-aktual/">← AKTUAL MEDIA · sve na jednom mjestu</a></div></div>
<header class="iz-head"><div class="iz-wrap">
  <p class="k">GNK ASG · AKTUAL MEDIA · regionalna izdanja</p>
  ${h1 ? `<h1>Naša izdanja</h1>
  <p>Osam gradskih kanala, poslovni tjednik i devet deskova — sport, politika, sigurnost, business, tehnologija, moda, putovanja, ljubimci i svijet. Svako izdanje ima vlastiti link, svoj jezik, svoj feed i svoju metodologiju, a sve se vraća ovamo.</p>`
    : `<p class="iz-home-h1"><a href="/izdanja/">Naša izdanja</a> <span aria-hidden="true">·</span> desk</p>`}
  <nav class="iz-nav" aria-label="Izdanja"><a href="/izdanja/"${active === '' ? ' aria-current="page"' : ''}>Sva izdanja</a>${Object.entries(DESKS).map(([id, d]) => `<a href="/izdanja/${id}/"${active === `${id}/` ? ' aria-current="page"' : ''}>${esc(d.nav)}</a>`).join('')}<a href="/radio/">Radio</a><a href="/galerija/">Galerija</a><a href="/aktual-media/">Podaci</a><a href="/kanal/">Kanali</a><a href="/world-network/">Svjetska izdanja · u pripremi</a><a href="/gnk-aktual/">AKTUAL MEDIA</a></nav>
</div></header>`;


/* ---------- mreža: svaka stranica nudi najmanje šest drugih ulaza ---------- */

function netStrip() {
  const editions = CHANNELS.map((c) => `<a href="${c.base}" rel="external noopener"><b>${esc(CITY_SHORT[c.id] || c.city)}</b><span>${esc(c.country)}</span></a>`).join('');
  const desks = Object.entries(DESKS).map(([id, d]) => `<a href="/izdanja/${id}/"><b>${esc(d.nav)}</b><span>desk</span></a>`).join('');
  const more = [
    ['/usa/', 'Colorado · USA', 'ishodište projekta'],
    ['/radio/', 'Radio', 'player'],
    ['/galerija/', 'Galerija', 'foto'],
    ['/kanal/', 'Kanali', '8 izdanja'],
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
      <p class="iz-net-h">Mreža AKTUAL MEDIA <span>8 izdanja · 9 deskova · radio · galerija</span></p>
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
    cards.push(`<article class="iz-card"><img class="iz-cover" src="/assets/izdanja/${id}-tile.webp" alt="${esc(desk.name)}" width="640" height="360" loading="lazy" decoding="async"><span class="flag">Desk · AKTUAL MEDIA</span><h2><a href="/izdanja/${id}/">${esc(desk.name)}</a></h2><p>${esc(desk.description)}</p><ul class="iz-tags">${desk.hashtags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><a class="btn" href="/izdanja/${id}/">Otvori desk →</a></div></article>`);
  }
  for (const p of PLATFORMS) {
    cards.push(`<article class="iz-card"><span class="flag">Platforma · GNK ASG</span><h2><a href="${p.url}"${p.external ? ' rel="external noopener"' : ''}>${esc(p.name)}</a></h2><p>${esc(p.description)}</p><ul class="iz-tags">${p.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><a class="btn" href="${p.url}"${p.external ? ' rel="external noopener"' : ''}>${esc(p.cta)}</a></div></article>`);
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
  ${networkBand()}
  <section class="iz-band iz-data-desk" aria-labelledby="ddTitle">
    <h2 id="ddTitle">Podatkovni desk — redakcija, izmjereno</h2>
    <p class="iz-small" style="margin:0 0 12px">Četiri stranice na kojima AKTUAL MEDIA mjeri vlastitu arhivu: noćna smjena, koncentracija izvora, pauze u objavljivanju i zajednički rječnik osam gradova. Brojke se računaju iz arhive pri svakoj gradnji, bez procjena.</p>
    <ul class="iz-datacards">
      <li><a href="/aktual-media/nocna-smjena/"><b>Noćna smjena</b><span>što izlazi dok grad spava</span></a></li>
      <li><a href="/aktual-media/jedan-glas/"><b>Jedan glas</b><span>koliko je izdanje pluralno</span></a></li>
      <li><a href="/aktual-media/karta-tisine/"><b>Karta tišine</b><span>najdulja pauza po gradu</span></a></li>
      <li><a href="/aktual-media/osam-jezika/"><b>Osam jezika</b><span>riječi koje dijele gradovi</span></a></li>
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
    title: 'Naša izdanja — AKTUAL MEDIA · osam gradskih kanala AKTUAL MEDIA KANAL, tjednik i deskovi',
    description: 'Sva izdanja AKTUAL MEDIA na jednom mjestu: osam regionalnih kanala, BUSINESS TJEDNIK, devet tematskih deskova, radio, galerija i podatkovni desk.',
    path: '',
    tags: ['#AKTUALMEDIA', '#AktualMedia', '#Našaizdanja', '#GNKASG'],
    logos: ['aktual-media-hr', 'aktual-media-en'],
    keywords: ['AKTUAL MEDIA', 'Aktual mediji', 'izdanja', 'AKTUAL MEDIA KANAL ZAGREB', 'AKTUAL MEDIA KANAL BEOGRAD', 'AKTUAL MEDIA KANAL SARAJEVO', 'AKTUAL MEDIA KANAL BUDAPEST', 'AKTUAL MEDIA KANAL LJUBLJANA', 'AKTUAL MEDIA KANAL ROMA', 'AKTUAL MEDIA KANAL SOFIJA', 'AKTUAL MEDIA KANAL BUCUREȘTI', 'BUSINESS TJEDNIK', 'GNK ASG'],
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Naša izdanja — AKTUAL MEDIA', url: HUB, inLanguage: 'hr', isPartOf: { '@id': 'https://gnk-asg.hr/#website' } },
      { '@context': 'https://schema.org', '@type': 'ItemList', '@id': 'https://gnk-asg.hr/izdanja/#all-editions', name: 'Izdanja AKTUAL MEDIA', numberOfItems: mediaItems().length, itemListElement: mediaItems().map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: item.url })) },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: 'https://gnk-asg.hr/gnk-aktual/' }, { '@type': 'ListItem', position: 2, name: 'Izdanja', item: HUB }] }
    ],
    body
  });
}


/* Platforme koje žive na matičnoj domeni, a ulaze u hub kao zasebne kartice. */
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
    description: 'AKTUAL MEDIA RADIO je diskretni player u kutu stranice: preklopljen je dok ga čitatelj ne otvori i ne prekriva sadržaj. Nudi šest glazbenih streamova te popis javnih radijskih kuća osam zemalja koje portal prati. Stanice se ne reemitiraju; svaka poveznica vodi na službeni player te kuće, uz atribuciju. Player pamti je li zatvoren i može se otvoriti kao stalni prozor ili instalirati kao aplikacija. Ima vlastite kontrole glasnoće i reprodukcije, a stanice se biraju izravno u panelu. Kartica vodi na stranicu s playerom i popisom stanica.',
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
  const tile = tilePath(deskId, variantFor(item.slug || item.url || item.title));
  return `<img class="iz-thumb iz-thumb-art" src="${esc(tile)}" alt="" aria-hidden="true" width="86" height="58" loading="lazy" decoding="async">`;
}

const cityCircles = () => `<ul class="iz-city" aria-label="Osam gradskih izdanja AKTUAL MEDIA">${
  CHANNELS.map((c) => `<li><a href="${c.base}" rel="external noopener" title="${esc(c.title)}"><img src="/assets/izdanja/${c.id}-240.webp" alt="${esc(c.city)}" width="96" height="96" loading="lazy" decoding="async"><span>${esc(c.city)}</span></a></li>`).join('')
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

  const body = `${portalHeader(id + '/', { h1: false })}
<main id="sadrzaj" tabindex="-1" class="iz-wrap">
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
    <p class="iz-small" style="margin:0 0 12px">Ovaj desk je dio AKTUAL MEDIA — kuće koja pod istim imenom vodi osam gradskih kanala, devet tematskih deskova, business tjednik, radio, galeriju i podatkovni desk. Isti izdavač, isti urednik i ista metodologija vrijede za svaku stranicu, pa se svaki tekst može provjeriti do izvornika.</p>
    <ul class="iz-datacards">
      <li><a href="/gnk-aktual/"><b>AKTUAL MEDIA</b><span>središte kuće</span></a></li>
      <li><a href="/izdanja/"><b>Sva izdanja</b><span>8 kanala · 9 deskova</span></a></li>
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
  const cover = `/assets/izdanja/${id}-tile.webp`;
  const artCover = tilePath(id, 0);
  const withImages = items.filter((i) => i.image).length;
  return portalShell({
    title: `${desk.title} | AKTUAL MEDIA`,
    description: desk.description,
    path: `${id}/`,
    /* Oznake idu u article:tag, a u keywords ostaju samo riječi. */
    keywords: [...desk.hashtags.map((t) => t.replace(/^#/, '')), 'AKTUAL MEDIA', 'Aktual mediji', 'GNK ASG', 'regija', desk.nav],
    tags: [...desk.hashtags, '#AktualMedia', '#GNKASG'],
    logos: [deskLogoSlug(id)],
    image: cover,
    imageAlt: `${desk.title} — AKTUAL MEDIA`,
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
      description: (EDITION_META[c.id] || {}).description || '', hashtags: (EDITION_META[c.id] || {}).hashtags || c.hashtags,
      count: channelData(c.id).items.length,
      lastItemAt: channelData(c.id).items[0]?.date || channelData(c.id).updatedAt || ''
    })),
    { id: 'tjednik', name: 'BUSINESS TJEDNIK', url: 'https://gnk-asg-tjednik.pages.dev/', lang: 'hr', city: 'Zagreb', country: 'Hrvatska', description: 'Poslovni tjednik s kritičkim osvrtima na Lider, Jutarnji list, Poslovni dnevnik i Forbes, tjednom promjenom i dnevnim dodacima.', hashtags: ['#BusinessTjednik', '#AktualMedia'], count: 0 },
    { id: 'sport', name: 'SPORT', url: '/izdanja/sport/', lang: 'hr', city: 'Regija', country: 'AKTUAL MEDIA', description: DESKS.sport.description, hashtags: DESKS.sport.hashtags, count: collect('sport').length },
    { id: 'politika', name: 'POLITIKA', url: '/izdanja/politika/', lang: 'hr', city: 'Regija', country: 'AKTUAL MEDIA', description: DESKS.politika.description, hashtags: DESKS.politika.hashtags, count: collect('politika').length },
    { id: 'sigurnost', name: 'SIGURNOST I KIBERNETIKA', url: '/izdanja/sigurnost/', lang: 'hr', city: 'Regija', country: 'AKTUAL MEDIA', description: DESKS.sigurnost.description, hashtags: DESKS.sigurnost.hashtags, count: collect('sigurnost').length },
    { id: 'galerija', name: 'GALERIJA NERMINA SEFIĆA', url: 'https://gnk-asg.hr/galerija/', lang: 'hr', city: 'Zagreb', country: 'Hrvatska', description: 'Službeni portreti, fotografije s događanja i tematski vizuali, svaki s vlastitom stranicom i podacima o korištenju.', hashtags: ['#NerminSefić', '#Galerija'], count: 0 }
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
      <p class="kx-foot"><a href="/kanal/${c.id}/en/" hreflang="en" lang="en">English overview →</a> <span>${card.count || 0} reviews</span></p>
    </article>`;
  }).join('');

  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AKTUAL MEDIA KANAL — sva izdanja pod gnk-asg.hr</title>
<meta name="description" content="Osam gradskih izdanja AKTUAL MEDIA na jednoj domeni: Zagreb, Beograd, Sarajevo, Budimpešta, Ljubljana, Rim, Sofija i Bukurešt. Svako ima svoj feed, sitemap i arhivu od više stotina tekstova.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://gnk-asg.hr/kanal/">
${logoAlternate('aktual-media-hr')}
<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/kanal/">
<link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/kanal/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="AKTUAL MEDIA KANAL — sva izdanja">
<meta property="og:description" content="Osam gradskih izdanja na jednoj domeni, s vlastitim feedom i arhivom.">
<meta property="og:url" content="https://gnk-asg.hr/kanal/">
<meta property="og:image" content="https://gnk-asg.hr/assets/izdanja/aktual-media-og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="AKTUAL MEDIA KANAL — sva izdanja">
<meta name="twitter:image" content="https://gnk-asg.hr/assets/izdanja/aktual-media-og.jpg">
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
.kx-go{margin-top:4px;font:800 11px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8c2f2f}
</style>
</head>
<body>
<a class="skip-to-content" href="#sadrzaj">Preskoči na sadržaj</a><style>.skip-to-content{position:absolute;left:-9999px;top:0;z-index:9999;background:#e9c66c;color:#08131f;font:800 13px/1 system-ui,sans-serif;letter-spacing:.02em;padding:12px 18px;border-radius:0 0 12px 0;text-decoration:none}.skip-to-content:focus{left:0}main:focus{outline:none}main:focus-visible{outline:3px solid #e9c66c;outline-offset:4px}a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:3px solid #e9c66c;outline-offset:3px;border-radius:4px}</style>
<div class="kx-top"><strong>AKTUAL MEDIA KANAL</strong><span><a href="/gnk-aktual/">← AKTUAL MEDIA</a> · <a href="/izdanja/">Sva izdanja i deskovi</a> · <a href="/aktual-media/">Podatkovni desk</a> · <a href="/usa/">Colorado · USA</a> · <a href="/radio/">Radio</a> · <a href="/digital-workforce/knjiga/">Knjiga radnika</a></span></div>
<main id="sadrzaj" tabindex="-1" class="kx-wrap">
  <div class="kx-head">
    <h1>Osam gradova, osam jezika — pod jednom domenom</h1>
    <p>Svako izdanje ima vlastiti feed, sitemap i arhivu od više stotina osvrta. Adrese su sada na gnk-asg.hr/kanal/, pa se sve izdaje indeksira kao jedna cjelina, a stari linkovi s pages.dev preusmjeravaju ovamo (301).</p>
  </div>
  <div class="kx-grid">${rows}</div>
</main>
</body>
</html>`;
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
    ['/kanal/', 'AKTUAL MEDIA KANAL', 'osam gradskih izdanja'],
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
<meta name="description" content="GNK DINAMO Ltd., Boulder, Colorado, USA — matična tvrtka grupe i ishodište mreže AKTUAL MEDIA. Entity ID 20238180649, 33 povezana društva, 12 lokacija u širenju i konsolidirani pokazatelji FY 2025, s poveznicama na svih osam gradskih izdanja.">
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
<meta property="og:locale" content="hr_HR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="GNK DINAMO Ltd. — Boulder, Colorado, USA">
<meta name="twitter:description" content="Matična tvrtka grupe i ishodište mreže AKTUAL MEDIA.">
<meta name="twitter:image" content="${SOCIAL_IMAGE}">

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
<div class="us-top"><strong>GNK DINAMO Ltd. · Boulder, Colorado</strong><span><a href="/gnk-aktual/">← AKTUAL MEDIA</a> · <a href="/izdanja/">Sva izdanja</a> · <a href="/aktual-media/">Podatkovni desk</a> · <a href="/kanal/">Kanali</a> · <a href="/radio/">Radio</a></span></div>
<main id="sadrzaj" tabindex="-1">
  <section class="us-hero"><div class="us-wrap">
    <p class="us-kicker">Ishodište projekta · USA</p>
    <h1>GNK DINAMO Ltd. — Boulder, Colorado</h1>
    <p class="us-lead">Ovdašnji podaci su ishodište svih poveznica ove mreže: matična tvrtka GNK DINAMO Ltd. ima sjedište u Boulderu u Coloradu, a GNK ASG d.o.o. uključen je u njezin grupni prikaz. Iz ovog čvora vode poveznice na svih osam gradskih izdanja AKTUAL MEDIA KANAL, na devet deskova i na svaku drugu javnu stranicu portala — i svaka od tih stranica vodi natrag ovamo.</p>
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

function writeSitemapIndex() {
  const today = new Date().toISOString().slice(0, 10);
  const core = [
    ['sitemap.xml', '2026-10-12'], ['editorial-sitemap.xml', '2026-10-19'],
    ['corporate-editorials-sitemap.xml', '2026-08-30'], ['visual-sitemap.xml', '2026-08-26'],
    ['image-sitemap.xml', '2026-10-12'], ['world-topics-image-sitemap.xml', '2026-08-26'],
    ['spt-sitemap.xml', '2026-10-12'], ['izdanja/sitemap.xml', today], ['galerija/sitemap.xml', today],
    ['aktual-media/sitemap.xml', today], ['tehnologija-buducnosti/sitemap.xml', today]
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
  const picks = cards.filter((c) => ['zagreb', 'beograd', 'sarajevo', 'budimpesta', 'ljubljana', 'rim', 'sofija', 'bukurest'].includes(c.id));
  const CITY_EN = { zagreb: 'Zagreb', beograd: 'Belgrade', sarajevo: 'Sarajevo', budimpesta: 'Budapest', ljubljana: 'Ljubljana', rim: 'Rome', sofija: 'Sofia', bukurest: 'Bucharest' };
  // Na engleskom je 'CHANNEL', a gradovi nose engleska imena (Rome, Sofia),
  // jer je 'KANAL' hrvatska riječ i ne smije stajati u EN naslovu.
  const CITY_EN_UPPER = { zagreb: 'ZAGREB', beograd: 'BELGRADE', sarajevo: 'SARAJEVO', budimpesta: 'BUDAPEST', ljubljana: 'LJUBLJANA', rim: 'ROME', sofija: 'SOFIA', bukurest: 'BUCUREȘTI' };
  const cityName = (c) => (en ? `AKTUAL MEDIA CHANNEL ${CITY_EN_UPPER[c.id] || esc(c.city).toUpperCase()}` : esc(c.name));
  const lis = picks.map((c, i) => `<li class="izdanja-item"><span class="izdanja-num">${String(i + 1).padStart(2, '0')}</span><div><h3><a href="${c.url}" target="_blank" rel="external noopener">${cityName(c)}</a></h3><p>${esc(c.lang)} · ${en ? (CITY_EN[c.id] || esc(c.city)) : esc(c.city)} · ${c.count} ${en ? 'reviews' : 'osvrta'}</p></div></li>`).join('');
  const title = en ? 'Our editions in the region' : 'Naša izdanja u regiji';
  const sub = en
    ? 'Eight city channels in eight languages, a business weekly and nine desks. Every edition has its own link and its own feed — and everything returns to AKTUAL MEDIA.'
    : 'Osam gradskih kanala na osam jezika, poslovni tjednik i devet deskova. Svako izdanje ima svoj link i svoj feed — a sve se vraća na AKTUAL MEDIA.';
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
    console.log(JSON.stringify({ ok: true, ...hub, kanalIndex: true, sitemaps, techBands, network }, null, 2));
  });
}
