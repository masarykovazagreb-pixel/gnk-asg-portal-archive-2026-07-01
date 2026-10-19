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
import { esc, longDate, shortDate, scoreFromTitle, truncate, themeFor, safeJson } from './lib.mjs';
import { CHANNELS, HUB, CONTACT, SOCIAL_IMAGE, CSS as CHANNEL_CSS } from './build.mjs';

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
    name: 'KANAL ZAGREB',
    url: 'https://gnk-asg-kanal.pages.dev/',
    langLabel: 'hrvatski',
    kicker: 'Hrvatska · Zagreb',
    description: 'Hrvatski kanal AKTUAL MEDIA prati domaće medije i svakoga dana objavljuje deset provjerljivih tekstova: cjelovite analize, dnevni desk, rokove iz AI Acta i GDPR-a, brojke iz objavljenih bilanci, pojmovnik i odgovore na pitanja čitatelja. Svaki desk tekst nosi izvor i ograničenje tumačenja, a urednički pregledani tekstovi stoje odvojeno od automatski sastavljenih. Kanal je zamišljen kao upstream izvor koji AKTUAL MEDIA preuzima uz atribuciju, pa se svaka objava pojavljuje i u bloku „Iz GNK ASG KANALA“ na matičnoj stranici. Uz tekstove stoje feed, sitemap i metodologija, tako da je svaku tvrdnju moguće provjeriti do izvornika. Jezik je hrvatski, adresa je javna, a oznaka autorstva jasno razlikuje uredništvo od dnevnog stroja.',
    hashtags: ['#KanalZagreb', '#Hrvatska', '#Zagreb', '#AIACT', '#GDPR', '#AktualMedia']
  },
  beograd: {
    name: 'KANAL BEOGRAD',
    url: 'https://gnk-asg-kanal-beograd.pages.dev/',
    langLabel: 'srpski',
    kicker: 'Srbija · Beograd',
    description: 'Srpsko izdanje AKTUAL MEDIA čita N1 Srbija, Danas, Nova.rs i Politiku i od svakog pronađenog teksta pravi osvrt na način izveštavanja. Cilj nije prepričati vest, već pokazati kako je naslovljena, šta je u sažetku ostalo neimenovano i šta treba proveriti pre zaključka. Svaki zapis nosi direktan link na izvornik i datum objave, a čitava arhiva je pretraživa kroz teme: politika, privreda, bezbednost i kibernetika, rat i eskalacije, energija i sport. Izdanje ima svoj feed, sitemap i stranicu metodologije, pa se može pratiti i mašinski i ljudski. Jezik je srpski, a grad u zaglavlju je Beograd — kanal ostaje jedan od osam gradskih kanala iste matične kuće. Kada izvor nije dostupan, izdanje to kaže i ne popunjava prazninu izmišljenim sadržajem.',
    hashtags: ['#KanalBeograd', '#Srbija', '#Beograd', '#N1', '#Danas', '#AktualMedia']
  },
  sarajevo: {
    name: 'KANAL SARAJEVO',
    url: 'https://gnk-asg-kanal-sarajevo.pages.dev/',
    langLabel: 'bosanski',
    kicker: 'Bosna i Hercegovina · Sarajevo',
    description: 'Bosanskohercegovačko izdanje AKTUAL MEDIA prati N1 BiH, Klix, Oslobođenje i Avaz te svakoga dana gradi pregled osvrta na način izvještavanja. Posebna pažnja ide temama koje se u regiji lako preliju preko granice: političke tenzije, energetika, sigurnost i kibernetika, migracije i elementarne nepogode. Svaki tekst ima izravnu poveznicu na izvornik, datum i jasnu oznaku da su tvrdnje izvornika njegove, a ne naše. Izdanje ima vlastiti feed, sitemap, llms.txt i metodologiju, što ga čini upotrebljivim i za ljudsko čitanje i za strojno preuzimanje. Kartica na AKTUAL MEDIA vodi ovamo, a svaki osvrt vodi natrag na izvor i na matičnu kuću. Ako feed izostane, stranica prikazuje stvarno stanje umjesto popunjene praznine.',
    hashtags: ['#KanalSarajevo', '#BiH', '#Sarajevo', '#N1BiH', '#Klix', '#AktualMedia']
  },
  budimpesta: {
    name: 'KANAL BUDIMPEŠTA',
    url: 'https://gnk-asg-kanal-budimpesta.pages.dev/',
    langLabel: 'mađarski',
    kicker: 'Mađarska · Budimpešta',
    description: 'Mađarsko izdanje AKTUAL MEDIA čita Telex, 444, HVG i Portfolio i svakodnevno objavljuje osvrte na način izvještavanja. Fokus je na gospodarstvu, proračunu, inflaciji i energetici, ali i na političkim odlukama koje mijenjaju okvir poslovanja u regiji. Svaki zapis povezuje izvornik i zadržava njegov naslov i sažetak kao predmet analize, bez preuzimanja cijelog teksta. Izdanje je na mađarskom jeziku, s vlastitim feedom, sitemapom i stranicom metodologije, pa ga mogu pratiti i čitatelji i agregatori. Kartica na matičnoj stranici vodi na ovo izdanje, a svaki osvrt vodi natrag na izvor. Kada izvor padne, izdanje bilježi propust i nastavlja s onim što je stvarno dostupno.',
    hashtags: ['#KanalBudimpesta', '#Magyarorszag', '#Budapest', '#Telex', '#HVG', '#AktualMedia']
  },
  ljubljana: {
    name: 'KANAL LJUBLJANA',
    url: 'https://gnk-asg-kanal-ljubljana.pages.dev/',
    langLabel: 'slovenski',
    kicker: 'Slovenija · Ljubljana',
    description: 'Slovensko izdanje AKTUAL MEDIA prati STA, Delo, Dnevnik i Siol.net i iz svakog pronađenog teksta izvlači ono što je provjerljivo. Osvrti se bave načinom izvještavanja: kako je naslovljen tekst, koje brojke stoje bez izvora i gdje sažetak obećava više nego što tijelo teksta daje. Izdanje pokriva gospodarstvo, energetiku, politiku, sigurnost i sport, a svaka tema ima svoju stranicu i vlastiti popis osvrta. Uz feed i sitemap, tu je i llms.txt za strojne čitatelje te metodologija koja objašnjava granicu između našeg osvrta i tvrdnje izvornika. Jezik je slovenski, grad u zaglavlju je Ljubljana, a poveznica na matičnu kuću stoji na svakoj stranici.',
    hashtags: ['#KanalLjubljana', '#Slovenija', '#Ljubljana', '#STA', '#Delo', '#AktualMedia']
  },
  rim: {
    name: 'CANALE ROMA',
    url: 'https://gnk-asg-kanal-rim.pages.dev/',
    langLabel: 'talijanski',
    kicker: 'Italija · Roma',
    description: 'Talijansko izdanje AKTUAL MEDIA čita ANSA, la Repubblicu, Il Post i Il Sole 24 Ore i gradi dnevni pregled osvrta na način informiranja. Posebno se prate gospodarstvo i tržišta, energetika, europske odluke i unutarnja politika, jer talijanske tema često određuju okvir za cijelu regiju. Svaki tekst zadržava izvorni naslov i sažetak, uz izravnu poveznicu na izvor i datum objave. Izdanje ima vlastiti feed, sitemap i metodologiju na talijanskom, a kartica na AKTUAL MEDIA vodi ovamo. Oznaka autorstva jasno odvaja naš osvrt od tvrdnji izvornika, a svaka stranica nosi iste standarde pristupačnosti i SEO oznaka kao i ostala izdanja.',
    hashtags: ['#CanaleRoma', '#Italia', '#Roma', '#ANSA', '#IlPost', '#AktualMedia']
  },
  sofija: {
    name: 'KANAL SOFIJA',
    url: 'https://gnk-asg-kanal-sofija.pages.dev/',
    langLabel: 'bugarski',
    kicker: 'Bugarska · Sofija',
    description: 'Bugarsko izdanje AKTUAL MEDIA prati BTA, Capital, Mediapool i Dnevnik i svakoga dana objavljuje osvrte na način izvještavanja. Teme su gospodarstvo, energetika, europska sredstva, politička stabilnost te sigurnost i kibernetika, s naglaskom na odluke koje mijenjaju uvjete poslovanja. Svaki zapis nosi izvorni naslov, sažetak, datum i poveznicu na izvor, bez preuzimanja cijelog teksta. Izdanje je na bugarskom jeziku, s vlastitim feedom, sitemapom i llms.txt, pa je čitljivo i ljudima i strojevima. Kartica na matičnoj stranici vodi na ovo izdanje, a svaka stranica vodi natrag na AKTUAL MEDIA. Kada izvor zakaže, izdanje to navodi i ne izmišlja vijest.',
    hashtags: ['#KanalSofija', '#Bulgaria', '#Sofia', '#BTA', '#Capital', '#AktualMedia']
  },
  bukurest: {
    name: 'CANALUL BUCUREȘTI',
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
    title: 'Sportski desk: rezultati i osvrti iz cijele regije',
    lang: 'hr',
    theme: 'sport',
    description: 'Sportski desk skuplja sportske tekstove iz svih gradskih kanala AKTUAL MEDIA i prikazuje rezultate onako kako su ih objavili izvori. Rezultat se izvlači iz naslova samo kada je u naslovu stvarno zapisan, pa nema izmišljenih tablica ni bodovanja. Uz svaki rezultat stoji izvor, datum i poveznica na izvornik, a klik vodi na osvrt na način izvještavanja. Stranica se osvježava iz dnevno zapisanih podataka i ne povlači skrivene API-je ni kolačiće. Služi kao brz pregled regionalnog sporta, a detalji ostaju kod matičnih klubova i medija.',
    hashtags: ['#Sport', '#Rezultati', '#AktualMedia', '#GNKASG', '#Regija']
  },
  politika: {
    name: 'POLITIKA — AKTUAL MEDIA',
    title: 'Politički desk: odluke, izbori i okvir poslovanja',
    lang: 'hr',
    theme: 'politika',
    description: 'Politički desk okuplja političke tekstove iz svih gradskih kanala i pokazuje kako su naslovljeni u pojedinim zemljama. Cilj je usporedba okvira: ista odluka u Zagrebu, Beogradu, Sarajevu, Budimpešti, Ljubljani, Rimu, Sofiji i Bukureštu ne izgleda jednako. Svaki zapis nosi izvor, datum i izravnu poveznicu, a osvrt se bavi načinom izvještavanja, ne političkim stavom redakcije. Stranica ne donosi preporuke ni ocjene stranaka; donosi pitanja koja treba postaviti prije zaključka. Ažurira se iz istih dnevnih podataka kao i gradski kanali.',
    hashtags: ['#Politika', '#Izbori', '#Regija', '#AktualMedia', '#GNKASG']
  },
  sigurnost: {
    name: 'SIGURNOST I KIBERNETIKA',
    title: 'Sigurnosni desk: obavještajne teme, kibernetika i preuzimanja',
    lang: 'hr',
    theme: 'sigurnost',
    description: 'Sigurnosni desk prati tekstove o obavještajnim službama, kibernetičkim incidentima, dezinformacijama i spajanjima tvrtki u cijeloj regiji. Osvrti ne prenose neutemeljene tvrdnje kao činjenice: svaka sumnja ostaje sumnja, a svaki dokument mora biti imenovan. Posebna pažnja posvećena je preuzimanjima i koncentracijama, gdje se u medijima često miješaju prijava, odobrenje i stvarno vlasništvo. Stranica povezuje izvornike i označava što je provjerljivo, a što je interpretacija. Ažurira se iz dnevnih podataka svih gradskih kanala i ima vlastiti feed.',
    hashtags: ['#Sigurnost', '#Kibernetika', '#Obavjestaj', '#Preuzimanja', '#AktualMedia', '#GNKASG']
  }
};

/* ---------- zajednički okvir portala ---------- */

function portalShell({ title, description, path, keywords, jsonld = [], body, cssExtra = '' }) {
  const canonical = `${HUB}${path}`;
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
<meta name="keywords" content="${esc(keywords.join(', '))}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(truncate(description, 300))}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SOCIAL_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(truncate(description, 200))}">
<meta name="twitter:image" content="${SOCIAL_IMAGE}">
<link rel="sitemap" type="application/xml" href="/izdanja/sitemap.xml">
${jsonld.map((n) => `<script type="application/ld+json">${safeJson(n)}</script>`).join('\n')}
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
.iz-head .iz-home-h1{font:700 clamp(20px,2.6vw,26px)/1.2 Georgia,"Times New Roman",serif;margin:6px 0 4px;letter-spacing:-.01em}
.iz-head .iz-home-h1 a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(233,198,108,.45)}
.iz-head .iz-home-h1 a:hover{color:var(--gold)}
.iz-head p{max-width:78ch;color:var(--muted);margin:0}
.iz-nav{display:flex;flex-wrap:wrap;gap:8px 18px;padding:14px 0;font:600 12px/1.5 system-ui;letter-spacing:.08em;text-transform:uppercase;color:#cdd8e5}
.iz-nav a{color:#cdd8e5}.iz-nav a[aria-current]{color:var(--gold)}
.iz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;padding:26px 0 10px}
.iz-card{display:flex;flex-direction:column;gap:10px;background:#0b1d31;border:1px solid #1e3b58;border-radius:14px;padding:20px}
.iz-card--lead{grid-column:span 2}
.iz-card .flag{display:flex;align-items:center;gap:8px;font:600 10px/1.4 system-ui;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
.iz-card h2{font:700 22px/1.2 Georgia,serif;margin:0}
.iz-card p{margin:0;color:#c3cede;font-size:14.5px}
.iz-card .acts{display:flex;flex-wrap:wrap;gap:10px;margin-top:auto;padding-top:8px}
.iz-card .btn{font:600 12px/1 system-ui;letter-spacing:.04em;background:var(--gold);color:#08131f;padding:10px 13px;border-radius:999px}
.iz-card .btn.ghost{background:transparent;border:1px solid #2c4a6b;color:#dbe5f1}
.iz-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none;font:600 10px/1 system-ui;letter-spacing:.05em;text-transform:uppercase;color:#9fb0c4}
.iz-tags li{border:1px solid #25435f;border-radius:999px;padding:5px 8px}
.iz-latest{font:400 12px/1.5 system-ui;color:#9fb0c4;border-top:1px dashed #24425f;padding-top:8px}
.iz-latest b{color:var(--gold);font-weight:600}
.iz-band{padding:30px 0;border-top:1px solid #17314a}
.iz-band h2{font:700 20px/1.2 Georgia,serif;margin:0 0 14px}
.iz-list{list-style:none;margin:0;padding:0}
.iz-list li{display:grid;grid-template-columns:86px minmax(0,1fr) auto;gap:12px;padding:10px 0;border-top:1px solid #16304a;font-size:14.5px}
.iz-list time{font:600 11px/1.6 system-ui;color:#8fa3ba}
.iz-list .src{font:600 10px/1.6 system-ui;text-transform:uppercase;letter-spacing:.08em;color:var(--gold);white-space:nowrap}
.iz-score{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;background:#0b1d31;border:1px solid #1e3b58;border-radius:12px;padding:12px 16px;margin:0 0 10px}
.iz-score b{font:700 24px/1 system-ui;color:var(--gold)}
.iz-score small{display:block;color:#9fb0c4;font:400 11px/1.4 system-ui}
.iz-foot{border-top:1px solid #17314a;padding:28px 0 44px;color:#8fa3ba;font:400 12px/1.6 system-ui}
.iz-foot a{color:var(--gold)}
.iz-small{font:400 11px/1.6 system-ui;color:#8296ad}
@media(max-width:760px){.iz-card--lead{grid-column:span 1}.iz-list li{grid-template-columns:70px minmax(0,1fr)}.iz-list .src{display:none}}
${cssExtra}
</style>
</head>
<body class="iz">
${body}
<script src="/assets/public-unified-menu-v6.js?v=20261019-izdanja" defer></script>
<script src="/assets/public-contrast-hardening-v1.js?v=20261019-izdanja" defer></script>
</body>
</html>`;
}

const portalHeader = (active, { h1 = true } = {}) => `<div class="iz-top"><div class="iz-wrap"><span>AKTUAL MEDIA d.o.o. · Izdanja</span><a href="/gnk-aktual/">← AKTUAL MEDIA</a></div></div>
<header class="iz-head"><div class="iz-wrap">
  <p class="k">GNK ASG · AKTUAL MEDIA · regionalna izdanja</p>
  ${h1 ? `<h1>Naša izdanja</h1>
  <p>Osam gradskih kanala, poslovni tjednik, sportski, politički i sigurnosni desk te galerija. Svako izdanje ima vlastiti link, svoj jezik, svoj feed i svoju metodologiju — a sve se vraća ovamo.</p>`
    : `<p class="iz-home-h1"><a href="/izdanja/">Naša izdanja</a> <span aria-hidden="true">·</span> desk</p>`}
  <nav class="iz-nav" aria-label="Izdanja">${['', 'sport/', 'politika/', 'sigurnost/'].map((p, i) => `<a href="/izdanja/${p}"${active === p ? ' aria-current="page"' : ''}>${['Sva izdanja', 'Sport', 'Politika', 'Sigurnost'][i]}</a>`).join('')}<a href="/galerija/">Galerija</a><a href="/gnk-aktual/">AKTUAL MEDIA</a></nav>
</div></header>`;

const portalFooter = () => `<footer class="iz-foot"><div class="iz-wrap">
  <p><strong>AKTUAL MEDIA d.o.o.</strong> · Urednik: Nermin Sefić · <a href="mailto:${CONTACT}">${CONTACT}</a></p>
  <p class="iz-small">Sva izdanja objavljuju osvrte na način izvještavanja. Izvornici su uvijek povezani, a tvrdnje izvornika nisu tvrdnje redakcije. Automatski sastavljeni dijelovi nisu pojedinačno urednički pregledani.</p>
  <p class="iz-small"><a href="/izdanja/sitemap.xml">Sitemap izdanja</a> · <a href="/gnk-aktual/">AKTUAL MEDIA</a> · <a href="https://gnk-asg.hr/">gnk-asg.hr</a></p>
</div></footer>`;

const latestFor = (channel, count = 2) => channelData(channel.id).items.slice(0, count);

/* ---------- hub ---------- */

function cardFor(channel, { lead = false } = {}) {
  const meta = EDITION_META[channel.id] || {};
  const data = channelData(channel.id);
  const latest = data.items.slice(0, 2);
  const updated = data.updatedAt ? shortDate(data.updatedAt.slice(0, 10)) : '—';
  return `<article class="iz-card${lead ? ' iz-card--lead' : ''}">
    <span class="flag">${esc(meta.kicker || `${channel.country} · ${channel.city}`)} · ${esc(meta.langLabel || channel.lang)}</span>
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
    `<article class="iz-card"><span class="flag">${esc(tjednik.kicker)}</span><h2><a href="${tjednik.url}" rel="external noopener">${esc(tjednik.name)}</a></h2><p>${esc(tjednik.desc)}</p><ul class="iz-tags">${tjednik.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><a class="btn" href="${tjednik.url}" rel="external noopener">Otvori tjednik ↗</a></div></article>`,
    `<article class="iz-card"><span class="flag">${esc(galerija.kicker)}</span><h2><a href="${galerija.url}" rel="external noopener">${esc(galerija.name)}</a></h2><p>${esc(galerija.desc)}</p><ul class="iz-tags">${galerija.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><a class="btn" href="${galerija.url}" rel="external noopener">Otvori galeriju ↗</a><a class="btn ghost" href="/galerija/sitemap.xml" rel="external noopener">Sitemap</a></div></article>`
  ];
  for (const [id, desk] of Object.entries(DESKS)) {
    cards.push(`<article class="iz-card"><span class="flag">Desk · AKTUAL MEDIA</span><h2><a href="/izdanja/${id}/">${esc(desk.name)}</a></h2><p>${esc(desk.description)}</p><ul class="iz-tags">${desk.hashtags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><a class="btn" href="/izdanja/${id}/">Otvori desk →</a></div></article>`);
  }
  for (const p of PLATFORMS) {
    cards.push(`<article class="iz-card"><span class="flag">Platforma · GNK ASG</span><h2><a href="${p.url}"${p.external ? ' rel="external noopener"' : ''}>${esc(p.name)}</a></h2><p>${esc(p.description)}</p><ul class="iz-tags">${p.tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div class="acts"><a class="btn" href="${p.url}"${p.external ? ' rel="external noopener"' : ''}>${esc(p.cta)}</a></div></article>`);
  }
  return cards.join('\n');
}

function hubPage() {
  const cards = CHANNELS.map((c, i) => cardFor(c, { lead: i === 0 })).join('\n');
  const items = CHANNELS.flatMap((c) => latestFor(c, 3).map((i) => ({ ...i, channel: c })))
    .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 14);

  const body = `${portalHeader('')}
<main class="iz-wrap">
  <div class="iz-grid">${cards}${extraCards()}</div>
  <section class="iz-band">
    <h2>Najnovije iz svih izdanja</h2>
    <ul class="iz-list">${items.map((i) => `<li><time datetime="${esc(i.date)}">${esc(shortDate(i.date.slice(0, 10)))}</time><a href="${i.channel.base}clanak/${i.slug}/" rel="external noopener">${esc(i.title)}</a><span class="src">${esc(i.channel.title)}</span></li>`).join('') || '<li>Prva izdanja se pune dnevnim ciklusom.</li>'}</ul>
  </section>
  <section class="iz-band">
    <h2>Oznake izdanja</h2>
    <ul class="iz-tags">${['#NerminSefić', '#NerminSefic', '#AKTUALMEDIA', '#GNKASG', '#Našaizdanja', '#KanalZagreb', '#KanalBeograd', '#KanalSarajevo', '#KanalBudimpesta', '#KanalLjubljana', '#CanaleRoma', '#KanalSofija', '#CanalulBucuresti', '#BusinessTjednik', '#RegionalneVijesti', '#Sport', '#Politika', '#Sigurnost'].map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
  </section>
</main>
${portalFooter()}`;

  return portalShell({
    title: 'Naša izdanja — AKTUAL MEDIA · osam gradskih kanala, tjednik i deskovi',
    description: 'Sva izdanja AKTUAL MEDIA na jednom mjestu: KANAL ZAGREB, BEOGRAD, SARAJEVO, BUDIMPEŠTA, LJUBLJANA, CANALE ROMA, SOFIJA, BUCUREȘTI, BUSINESS TJEDNIK, sport, politika, sigurnost i galerija Nermina Sefića.',
    path: '',
    keywords: ['AKTUAL MEDIA', 'izdanja', 'KANAL ZAGREB', 'KANAL BEOGRAD', 'KANAL SARAJEVO', 'KANAL BUDIMPEŠTA', 'KANAL LJUBLJANA', 'CANALE ROMA', 'KANAL SOFIJA', 'CANALUL BUCURESTI', 'BUSINESS TJEDNIK', 'GNK ASG'],
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Naša izdanja — AKTUAL MEDIA', url: HUB, inLanguage: 'hr', isPartOf: { '@type': 'WebSite', name: 'AKTUAL MEDIA', url: 'https://gnk-asg.hr/' } },
      { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Izdanja AKTUAL MEDIA', numberOfItems: CHANNELS.length + 8, itemListElement: CHANNELS.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: c.base })) },
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

function collect(theme) {
  const out = [];
  for (const channel of CHANNELS) {
    const data = channelData(channel.id);
    for (const item of data.items.slice(0, 60)) {
      const itemTheme = themeFor(`${item.title} ${item.summary}`).id;
      if (itemTheme !== theme) continue;
      out.push({ ...item, channel });
    }
  }
  const seen = new Set();
  return out
    .filter((i) => (seen.has(i.url) ? false : seen.add(i.url)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function deskPage(id, desk) {
  const items = collect(desk.theme);
  const results = items.map((i) => ({ item: i, score: scoreFromTitle(i.title) })).filter((x) => x.score).slice(0, 12);
  const bySource = new Map();
  for (const item of items) {
    const key = item.channel.id;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(item);
  }

  const body = `${portalHeader(id + '/', { h1: false })}
<main class="iz-wrap">
  <section class="iz-head" style="border-bottom:0;padding-top:26px">
    <p class="k">Desk AKTUAL MEDIA</p>
    <h1>${esc(desk.title)}</h1>
    <p>${esc(desk.description)}</p>
    <ul class="iz-tags" style="margin-top:14px">${desk.hashtags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </section>

  ${id === 'sport' ? `<section class="iz-band"><h2>Rezultati objavljeni u izvorima</h2>
    <div id="izResults">${results.length ? results.map(({ item, score }) => `<div class="iz-score"><span>${esc(item.title)}<small>${esc(item.sourceName)} · ${esc(item.channel.title)}</small></span><b>${esc(score.label)}</b></div>`).join('') : '<p class="iz-small">U posljednjem ciklusu nije bilo naslova sa zapisanim rezultatom.</p>'}</div>
    <p class="iz-small">Rezultat se prikazuje samo ako je zapisan u naslovu izvora. Stranica se osvježava pri svakom dnevnom ciklusu, iz podataka koje on zapisuje.</p>
  </section>` : ''}

  <section class="iz-band">
    <h2>Osvrti</h2>
    <ul class="iz-list">${items.slice(0, 40).map((i) => `<li><time datetime="${esc(i.date)}">${esc(shortDate(i.date.slice(0, 10)))}</time><a href="${i.channel.base}clanak/${i.slug}/" rel="external noopener">${esc(i.title)}</a><span class="src">${esc(i.channel.title)}</span></li>`).join('') || '<li>Prvi ciklus još nije zapisao tekstove za ovaj desk.</li>'}</ul>
  </section>

  <section class="iz-band">
    <h2>Po izdanju</h2>
    <ul class="iz-list">${[...bySource.entries()].map(([cid, list]) => { const c = CHANNELS.find((x) => x.id === cid); return `<li><time>${list.length}</time><a href="${c.base}" rel="external noopener">${esc(c.title)}</a><span class="src">${esc(c.city)}</span></li>`; }).join('') || ''}</ul>
  </section>
</main>
${portalFooter()}
${id === 'sport' ? `<script>(()=>{const box=document.getElementById('izResults');if(!box)return;const esc=(s)=>String(s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const render=(rows)=>{if(!rows.length)return;box.innerHTML=rows.slice(0,12).map((r)=>'<div class="iz-score"><span>'+esc(r.title)+'<small>'+esc(r.source)+' · '+esc(r.channel)+'</small></span><b>'+esc(r.score)+'</b></div>').join('')};const load=()=>fetch('/data/izdanja-sport.json',{cache:'no-store'}).then((r)=>r.ok?r.json():null).then((d)=>d&&d.results&&render(d.results)).catch(()=>{});load();setInterval(load,300000)})();</script>` : ''}`;

  return portalShell({
    title: `${desk.title} | AKTUAL MEDIA`,
    description: desk.description,
    path: `${id}/`,
    keywords: [...desk.hashtags, 'AKTUAL MEDIA', 'GNK ASG', 'regija'],
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: desk.title, url: `${HUB}${id}/`, inLanguage: 'hr', description: desk.description },
      { '@context': 'https://schema.org', '@type': 'ItemList', name: desk.title, numberOfItems: items.length, itemListElement: items.slice(0, 20).map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.title, url: `${i.channel.base}clanak/${i.slug}/` })) }
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
  writePage('', hubPage());
  for (const [id, desk] of Object.entries(DESKS)) writePage(id, deskPage(id, desk));

  const entries = [
    { loc: HUB, priority: '1.0' },
    ...Object.keys(DESKS).map((id) => ({ loc: `${HUB}${id}/`, priority: '0.7' })),
    ...CHANNELS.map((c) => ({ loc: c.base, priority: '0.9' })),
    { loc: 'https://gnk-asg-tjednik.pages.dev/', priority: '0.7' },
    { loc: 'https://gnk-asg.hr/galerija/', priority: '0.6' }
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
      count: channelData(c.id).items.length
    })),
    { id: 'tjednik', name: 'BUSINESS TJEDNIK', url: 'https://gnk-asg-tjednik.pages.dev/', lang: 'hr', city: 'Zagreb', country: 'Hrvatska', description: 'Poslovni tjednik s kritičkim osvrtima na Lider, Jutarnji list, Poslovni dnevnik i Forbes, tjednom promjenom i dnevnim dodacima.', hashtags: ['#BusinessTjednik', '#AktualMedia'], count: 0 },
    { id: 'sport', name: 'SPORT', url: '/izdanja/sport/', lang: 'hr', city: 'Regija', country: 'AKTUAL MEDIA', description: DESKS.sport.description, hashtags: DESKS.sport.hashtags, count: collect('sport').length },
    { id: 'politika', name: 'POLITIKA', url: '/izdanja/politika/', lang: 'hr', city: 'Regija', country: 'AKTUAL MEDIA', description: DESKS.politika.description, hashtags: DESKS.politika.hashtags, count: collect('politika').length },
    { id: 'sigurnost', name: 'SIGURNOST I KIBERNETIKA', url: '/izdanja/sigurnost/', lang: 'hr', city: 'Regija', country: 'AKTUAL MEDIA', description: DESKS.sigurnost.description, hashtags: DESKS.sigurnost.hashtags, count: collect('sigurnost').length },
    { id: 'galerija', name: 'GALERIJA NERMINA SEFIĆA', url: 'https://gnk-asg.hr/galerija/', lang: 'hr', city: 'Zagreb', country: 'Hrvatska', description: 'Službeni portreti, fotografije s događanja i tematski vizuali, svaki s vlastitom stranicom i podacima o korištenju.', hashtags: ['#NerminSefić', '#Galerija'], count: 0 }
  ];
  writeFileSync(join(PORTAL, 'data', 'izdanja.json'), `${JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), sourceOfTruth: HUB, cards }, null, 2)}\n`);

  injectBand(cards);
  try {
    const { buildAktualCentral } = await import('./aktual-central.mjs');
    const central = buildAktualCentral({ cards });
    console.log(`[central] ${JSON.stringify(central)}`);
  } catch (error) {
    console.log(`::warning::Središnji blok nije izgrađen: ${error.message}`);
  }

  return { channels: CHANNELS.length, sport: collect('sport').length, politics: collect('politika').length, security: collect('sigurnost').length };
}

/* ---------- blok na AKTUAL MEDIA ---------- */

function injectBand(cards) {
  const file = join(PORTAL, 'gnk-aktual', 'index.html');
  if (!existsSync(file)) return;
  let html = readFileSync(file, 'utf8');
  const start = '<!-- IZDANJA-BAND:START -->';
  const end = '<!-- IZDANJA-BAND:END -->';
  const picks = cards.filter((c) => ['zagreb', 'beograd', 'sarajevo', 'budimpesta', 'ljubljana', 'rim', 'sofija', 'bukurest'].includes(c.id));
  const lis = picks.map((c, i) => `<li class="izdanja-item"><span class="izdanja-num">${String(i + 1).padStart(2, '0')}</span><div><h3><a href="${c.url}" target="_blank" rel="external noopener">${esc(c.name)}</a></h3><p>${esc(c.lang)} · ${esc(c.city)} · ${c.count} osvrta</p></div></li>`).join('');
  const block = `${start}
  <section class="izdanja-band" aria-labelledby="izdanjaBandTitle">
    <div class="izdanja-band-head">
      <div>
        <h2 class="izdanja-band-title" id="izdanjaBandTitle">Naša izdanja u regiji</h2>
        <p class="izdanja-sub">Osam gradskih kanala na osam jezika, poslovni tjednik, sportski, politički i sigurnosni desk. Svako izdanje ima svoj link i svoj feed — a sve se vraća na AKTUAL MEDIA.</p>
      </div>
      <a class="izdanja-all" href="/izdanja/">Sva izdanja →</a>
    </div>
    <ol class="izdanja-list">${lis}</ol>
  </section>
  ${end}`;
  html = html.includes(start) && html.includes(end)
    ? html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block)
    : html.replace('<!-- KANAL-BAND:END -->', `<!-- KANAL-BAND:END -->\n${block}`);
  writeFileSync(file, html);
}

if (process.argv[1] && /hub\.mjs$/.test(process.argv[1])) {
  buildHub().then((hub) => console.log(JSON.stringify({ ok: true, ...hub }, null, 2)));
}
