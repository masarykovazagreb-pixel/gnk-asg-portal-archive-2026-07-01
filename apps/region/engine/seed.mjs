#!/usr/bin/env node
/**
 * Početno izdanje za dva kanala.
 *
 * Ovi zapisi nisu izmišljeni: prepisani su iz javnih feedova N1 Srbija i
 * Telex 19. 10. 2026. i služe kao prvo izdanje dok dnevni ciklus ne preuzme
 * svježe tekstove. Svaki zapis ima izvorni naslov, sažetak, datum i link.
 *
 *   node apps/region/engine/seed.mjs [--channel beograd]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash6, slugify, themeFor, truncate } from './lib.mjs';
import { CHANNELS } from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'data');
const ONLY = process.argv.includes('--channel') ? process.argv[process.argv.indexOf('--channel') + 1] : '';

const SEED = {
  beograd: [
    {
      title: 'Studentski marševi ka Beogradu: Tri kolone, jedan cilj - pobeda na izborima',
      url: 'https://n1info.rs/vesti/studentski-marsevi-ka-beogradu/',
      summary: 'Tri studentske kolone - jedna, ona prva koja je još u petak krenula iz Zaječara, druga koja je jutros krenula iz Valjeva, i treća koje se danas uputila',
      date: '2026-10-19T17:41:26+02:00',
      source: 'n1',
      sourceName: 'N1 Srbija',
      categories: ['Vesti']
    },
    {
      title: 'VJT odbacilo krivične prijave u vezi sa glasanjem u inostranstvu',
      url: 'https://n1info.rs/vesti/vjt-odbacilo-krivicne-prijave-u-vezi-sa-glasanjem-u-inostranstvu/',
      summary: 'Beogradsko Više javno tužilaštvo (VJT) saopštilo je da je odbacilo krivične prijave protiv ministra spoljnih poslova u tehničkom mandatu, v.d. general',
      date: '2026-10-19T17:32:57+02:00',
      source: 'n1',
      sourceName: 'N1 Srbija',
      categories: ['Vesti']
    },
    {
      title: 'Batut: U Srbiji registrovano 60 slučajeva groznice Zapadnog Nila, najviše u Beogradu',
      url: 'https://n1info.rs/vesti/batut-u-srbiji-registrovano-60-slucajeva-groznice-zapadnog-nila/',
      summary: 'U Srbiji je od početka sezone nadzora, 1. juna do 18. oktobra registrovano 60 slučajeva obolevanja od groznice Zapadnog Nila, od čega je 49 slučajeva',
      date: '2026-10-19T17:01:09+02:00',
      source: 'n1',
      sourceName: 'N1 Srbija',
      categories: ['Vesti']
    },
    {
      title: 'Medijska udruženja: SNS i njeni funkcioneri nastavljaju da diskriminišu medije',
      url: 'https://n1info.rs/vesti/medijska-udruzenja-sns-i-njeni-funkcioneri-nastavljaju-da-diskriminisi-medije/',
      summary: 'Nezavisno udruženje novinara Srbije (NUNS) i Asocijacija nezavisnih elektronskih medija (ANEM) osudili su onemogućavanje rada novinaru Mašine na skupu',
      date: '2026-10-19T17:22:38+02:00',
      source: 'n1',
      sourceName: 'N1 Srbija',
      categories: ['Vesti']
    }
  ],
  budimpesta: [
    {
      title: 'Karácsony Gergely szerint a fellélegzés éve lehet 2027',
      url: 'https://telex.hu/belfold/2026/10/19/karacsony-gergely-koltsegvetes-reakcio',
      summary: 'A főpolgármester szerint „ez egy nagyon jó költségvetési tervezet”, amit Magyar Péter bemutatott a parlamentben.',
      date: '2026-10-19T17:34:42+02:00',
      source: 'telex',
      sourceName: 'Telex',
      categories: ['Belföld']
    },
    {
      title: 'Magyar Péter bejelentései: megszűnik az árrésstop, duplázódik a családi pótlék, jön az adócsökkentés',
      url: 'https://telex.hu/gazdasag/2026/10/19/magyar-peter-parlament-parlament-bejelentes-koltsegvetes-tamogatas-program-tisza-kormany',
      summary: 'A miniszterelnök több mint kétórás beszédben ismertette a jövő évi költségvetés legfontosabb intézkedéseit. Összegyűjtöttük, mit lehet már biztosan tudni a változásokról, kik járhatnak jobban, és milyen területekre jut több pénz 2027-ben.',
      date: '2026-10-19T17:34:12+02:00',
      source: 'telex',
      sourceName: 'Telex',
      categories: ['Gazdaság']
    },
    {
      title: 'Vége az Otthon Startnak: új lakáshitel jön, a Wekerle Pluszban már nem mindenkinek jár a 3 százalékos kamat',
      url: 'https://telex.hu/gazdasag/2026/10/19/otthon-start-helyett-wekerle-program-kinek-hany-eves-korig-mennyi-energetikai-korszerusites-kiknek-reszletek',
      summary: 'Magyar Péter új támogatásokat jelentett be, amelyek nem elsősorban a tehetősebbeknek kedveznek. A lakásvásárlást és évente 20 ezer háztartás energetikai korszerűsítését segítenék. De kiknek jár?',
      date: '2026-10-19T16:34:18+02:00',
      source: 'telex',
      sourceName: 'Telex',
      categories: ['Gazdaság']
    },
    {
      title: 'Acélipari munkások foglalták el Genova repterét',
      url: 'https://telex.hu/kulfold/2026/10/19/genova-repuloter-sztrajk-lezaras-olaszorszag',
      summary: 'Az utasok először elérhették a beszállókapukat, majd a délelőtt folyamán ezt a folyosót is lezárták a létszámleépítés ellen demonstrálók.',
      date: '2026-10-19T15:31:15+02:00',
      source: 'telex',
      sourceName: 'Telex',
      categories: ['Külföld']
    }
  ]
};

const channelById = (id) => CHANNELS.find((c) => c.id === id);

for (const [id, entries] of Object.entries(SEED)) {
  if (ONLY && ONLY !== id) continue;
  const channel = channelById(id);
  if (!channel) continue;
  const file = join(DATA, `${id}.json`);
  const existing = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { items: [], sources: [] };
  const known = new Set(existing.items.map((i) => i.url));
  const additions = entries
    .filter((item) => !known.has(item.url))
    .map((item) => {
      const day = item.date.slice(0, 10);
      return {
        slug: `${id}-${day}-${item.source}-${slugify(item.title, 44)}-${hash6(item.url)}`,
        title: truncate(item.title, 180),
        summary: truncate(item.summary, 700),
        date: item.date,
        url: item.url,
        source: item.source,
        sourceName: item.sourceName,
        categories: item.categories || [],
        author: '',
        theme: themeFor(`${item.title} ${item.summary}`).id,
        addedAt: new Date().toISOString(),
        seeded: true
      };
    });
  const items = [...additions, ...existing.items].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  mkdirSync(DATA, { recursive: true });
  writeFileSync(file, `${JSON.stringify({ version: 1, channel: id, lang: channel.lang, city: channel.city, country: channel.country, updatedAt: new Date().toISOString(), sources: existing.sources || [], items }, null, 2)}\n`);
  console.log(`${id}: dodano ${additions.length}, ukupno ${items.length}`);
}
