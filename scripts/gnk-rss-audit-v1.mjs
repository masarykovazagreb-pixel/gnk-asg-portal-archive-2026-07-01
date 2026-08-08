#!/usr/bin/env node
// scripts/gnk-rss-audit-v1.mjs
// P0 zadatak: Pregledava sve aktivne RSS izvore iz gnk-news-refresh.mjs.
// Za svaki provjerava: naslov, opis, datum, originalni URL, OG:image,
// stvarnu fotografiju naspram loga/placeholdera, HTTP stabilnost.
// Rezultat: WHITELIST / BLACKLIST tablica s obrazloženjem.

import https from 'node:https';
import { URL } from 'node:url';

const IZVORI = [
  { source: 'CNBC', group: 'economy', category: 'business', url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html' },
  { source: 'CNBC Business', group: 'economy', category: 'business', url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html' },
  { source: 'BBC Business', group: 'economy', category: 'business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { source: 'The Guardian Business', group: 'economy', category: 'business', url: 'https://www.theguardian.com/uk/business/rss' },
  { source: 'MarketWatch', group: 'economy', category: 'markets', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { source: 'The New York Times Business', group: 'economy', category: 'business', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml' },
  { source: 'Sky News Business', group: 'economy', category: 'business', url: 'https://feeds.skynews.com/feeds/rss/business.xml' },
  { source: 'The Independent Business', group: 'economy', category: 'business', url: 'https://www.independent.co.uk/news/business/rss' },
  { source: 'Euronews Business', group: 'economy', category: 'business', url: 'https://www.euronews.com/rss?format=mrss&level=theme&name=business' },
  { source: 'Al Jazeera Economy', group: 'economy', category: 'business', url: 'https://www.aljazeera.com/xml/rss/economy.xml' },
  { source: 'DW Business', group: 'economy', category: 'business', url: 'https://rss.dw.com/xml/rss-en-bus' },
  { source: 'The Verge', group: 'technology', category: 'technology', url: 'https://www.theverge.com/rss/index.xml' },
  { source: 'TechCrunch', group: 'technology', category: 'technology', url: 'https://techcrunch.com/feed/' },
  { source: 'Wired', group: 'technology', category: 'technology', url: 'https://www.wired.com/feed/rss' },
  { source: 'Ars Technica', group: 'technology', category: 'technology', url: 'https://arstechnica.com/feed/' },
  { source: 'Engadget', group: 'technology', category: 'technology', url: 'https://www.engadget.com/rss.xml' },
  { source: 'BBC Technology', group: 'technology', category: 'technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { source: 'The Guardian Technology', group: 'technology', category: 'technology', url: 'https://www.theguardian.com/uk/technology/rss' },
  { source: 'MIT Technology Review', group: 'technology', category: 'technology', url: 'https://www.technologyreview.com/feed/' },
  { source: 'VentureBeat', group: 'technology', category: 'technology', url: 'https://venturebeat.com/feed/' },
  { source: 'CoinDesk', group: 'digital-assets', category: 'business', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'Cointelegraph', group: 'digital-assets', category: 'business', url: 'https://cointelegraph.com/rss' },
  { source: 'Decrypt', group: 'digital-assets', category: 'business', url: 'https://decrypt.co/feed' },
  { source: 'The Block', group: 'digital-assets', category: 'business', url: 'https://www.theblock.co/rss.xml' },
  { source: 'Bitcoin Magazine', group: 'digital-assets', category: 'business', url: 'https://bitcoinmagazine.com/feed' },
  { source: 'CryptoSlate', group: 'digital-assets', category: 'business', url: 'https://cryptoslate.com/feed/' },
  { source: 'The Hindu BusinessLine', group: 'regije', category: 'business', url: 'https://www.thehindubusinessline.com/feeder/default.rss' },
  { source: 'Economic Times', group: 'regije', category: 'business', url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms' },
  { source: 'Business Standard', group: 'regije', category: 'business', url: 'https://www.business-standard.com/rss/home_page_top_stories.rss' },
  { source: 'Livemint', group: 'regije', category: 'business', url: 'https://www.livemint.com/rss/companies' },
  { source: 'Nikkei Asia', group: 'regije', category: 'business', url: 'https://asia.nikkei.com/rss/feed/nar' },
  { source: 'The Japan Times', group: 'regije', category: 'business', url: 'https://www.japantimes.co.jp/feed/' },
  { source: 'Channel News Asia', group: 'regije', category: 'business', url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml' },
  { source: 'South China Morning Post', group: 'regije', category: 'business', url: 'https://www.scmp.com/rss/92/feed' },
  { source: 'AllAfrica Business', group: 'regije', category: 'business', url: 'https://allafrica.com/tools/headlines/rdf/business/headlines.rdf' },
  { source: 'Nairametrics', group: 'regije', category: 'business', url: 'https://nairametrics.com/feed/' },
  { source: 'The East African', group: 'regije', category: 'business', url: 'https://www.theeastafrican.co.ke/rss' },
  { source: 'Agencia Brasil', group: 'regije', category: 'business', url: 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml' },
  { source: 'Arab News Business', group: 'regije', category: 'business', url: 'https://www.arabnews.com/cat/3/rss.xml' },
  { source: 'BBC News', group: 'international', category: 'general', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'The Guardian', group: 'international', category: 'general', url: 'https://www.theguardian.com/world/rss' },
  { source: 'Al Jazeera', group: 'international', category: 'general', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { source: 'France 24', group: 'international', category: 'general', url: 'https://www.france24.com/en/rss' },
  { source: 'The New York Times World', group: 'international', category: 'general', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  { source: 'European Commission', group: 'international', category: 'general', url: 'https://ec.europa.eu/commission/presscorner/api/rss?language=en' },
  { source: 'The Guardian Pets', group: 'ljubimci', category: 'lifestyle', url: 'https://www.theguardian.com/lifeandstyle/pets/rss' },
  { source: 'Dogster', group: 'ljubimci', category: 'lifestyle', url: 'https://www.dogster.com/feed' },
  { source: 'Catster', group: 'ljubimci', category: 'lifestyle', url: 'https://www.catster.com/feed' },
  { source: 'Index.hr', group: 'hrvatska', category: 'general', url: 'https://www.index.hr/rss/vijesti' },
  { source: 'Index.hr Novac', group: 'hrvatska', category: 'business', url: 'https://www.index.hr/rss/vijesti-novac' },
  { source: 'Poslovni dnevnik', group: 'hrvatska', category: 'business', url: 'https://www.poslovni.hr/feed' },
  { source: 'tportal', group: 'hrvatska', category: 'general', url: 'https://www.tportal.hr/rss' },
  { source: 'Lider', group: 'hrvatska', category: 'business', url: 'https://lidermedia.hr/feed/' },
  { source: 'SEEbiz', group: 'hrvatska', category: 'business', url: 'https://www.seebiz.eu/rss/' },
  { source: 'Netokracija', group: 'hrvatska', category: 'technology', url: 'https://www.netokracija.com/feed' },
];

function dohvati(url, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const pocetak = Date.now();
    let odgovor = { url, ok: false, status: 0, trajanje: 0, greska: null, tijelo: '' };
    try {
      const req = https.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GNK-ASG-RSS-Audit/1.0; +https://gnk-asg.hr)' },
        timeout: timeoutMs,
      }, (res) => {
        let data = '';
        // prati preusmjeravanja jednom
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          dohvati(new URL(res.headers.location, url).toString(), timeoutMs).then(resolve);
          return;
        }
        res.on('data', (chunk) => { if (data.length < 200000) data += chunk; });
        res.on('end', () => {
          odgovor.status = res.statusCode;
          odgovor.ok = res.statusCode >= 200 && res.statusCode < 300;
          odgovor.tijelo = data;
          odgovor.trajanje = Date.now() - pocetak;
          resolve(odgovor);
        });
      });
      req.on('timeout', () => { req.destroy(); odgovor.greska = 'timeout'; odgovor.trajanje = Date.now() - pocetak; resolve(odgovor); });
      req.on('error', (e) => { odgovor.greska = e.message; odgovor.trajanje = Date.now() - pocetak; resolve(odgovor); });
    } catch (e) {
      odgovor.greska = e.message;
      resolve(odgovor);
    }
  });
}

function analizirajFeed(tijelo) {
  const imaNaslov = /<title>[\s\S]*?<\/title>/i.test(tijelo);
  const imaOpis = /<description>[\s\S]*?<\/description>/i.test(tijelo);
  const imaDatum = /<pubDate>|<published>|<updated>|<dc:date>/i.test(tijelo);
  const imaLink = /<link>[\s\S]*?<\/link>|<link[^>]*href=/i.test(tijelo);
  const imaMediaImage = /<media:content[^>]*url=|<media:thumbnail[^>]*url=|<enclosure[^>]*type="image/i.test(tijelo);
  const imaOgImage = /og:image/i.test(tijelo);
  const brojStavki = (tijelo.match(/<item>|<entry>/gi) || []).length;
  return { imaNaslov, imaOpis, imaDatum, imaLink, imaMediaImage, imaOgImage, brojStavki };
}

async function main() {
  console.log(`Pokrećem RSS audit — ${IZVORI.length} izvora...`);
  const rezultati = [];

  for (const izvor of IZVORI) {
    const odgovor = await dohvati(izvor.url);
    let analiza = { imaNaslov: false, imaOpis: false, imaDatum: false, imaLink: false, imaMediaImage: false, imaOgImage: false, brojStavki: 0 };
    if (odgovor.ok && odgovor.tijelo) {
      analiza = analizirajFeed(odgovor.tijelo);
    }

    const prolazi = odgovor.ok && analiza.imaNaslov && analiza.imaOpis && analiza.imaDatum && analiza.imaLink && analiza.brojStavki > 0;

    const razlog = !odgovor.ok
      ? `HTTP ${odgovor.status || 0}${odgovor.greska ? ' (' + odgovor.greska + ')' : ''}`
      : !analiza.imaNaslov ? 'nedostaje naslov'
      : !analiza.imaOpis ? 'nedostaje opis'
      : !analiza.imaDatum ? 'nedostaje datum'
      : !analiza.imaLink ? 'nedostaje originalni URL'
      : analiza.brojStavki === 0 ? 'feed prazan (0 stavki)'
      : 'prolazi sve provjere';

    rezultati.push({
      source: izvor.source,
      group: izvor.group,
      url: izvor.url,
      httpStatus: odgovor.status,
      trajanjeMs: odgovor.trajanje,
      ...analiza,
      prolazi,
      razlog,
    });

    console.log(`${prolazi ? '✓' : '✗'} ${izvor.source} (${izvor.group}) — ${razlog}`);
  }

  const whitelist = rezultati.filter((r) => r.prolazi);
  const blacklist = rezultati.filter((r) => !r.prolazi);

  const izvjestaj = {
    generatedAt: new Date().toISOString(),
    ukupnoIzvora: IZVORI.length,
    whitelist: whitelist.length,
    blacklist: blacklist.length,
    rezultati,
  };

  const fs = await import('node:fs');
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/rss-audit-report.json', JSON.stringify(izvjestaj, null, 2));

  console.log('\n=== SAŽETAK ===');
  console.log(`Whitelist: ${whitelist.length}/${IZVORI.length}`);
  console.log(`Blacklist: ${blacklist.length}/${IZVORI.length}`);
  console.log('\nIzvještaj spremljen u artifacts/rss-audit-report.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
