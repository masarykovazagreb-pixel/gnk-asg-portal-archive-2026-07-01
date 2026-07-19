# Deset provjerenih izvora za burze, tržišta i makro podatke

Datum provjere: 2026-07-19  
Namjena: GNK ASG informativni Market Monitor i budući poslovno-financijski moduli

## Produkcijsko stanje nakon deploya

Provjera `https://gnk-asg.hr/api/market` nakon deploya:

- HTTP 200
- `status: live`
- `liveCount: 11`
- zadnje ažuriranje: `2026-07-19T09:15:03.773Z`
- FX izvor: Frankfurter
- roba/energija: neslužbeni Yahoo Finance chart endpointi

News fix je također potvrđen na produkciji:

- deploy SHA: `d0ff5116e8850417f04f1760a388a5d9c9e1b7e2`
- marker: `canonical-normalized-feed-v2-assets-primary`
- 100 stavki
- najnovija stavka: `2026-07-19T07:52:10+00:00`
- feed više nije zaglavljen na lipanjskim podatcima

## Top 10 izvora

| # | Izvor | Najbolja namjena | Besplatni pristup | Produkcijska odluka |
|---:|---|---|---|---|
| 1 | [ECB Data Portal API](https://data.ecb.europa.eu/help/api/overview) | EUR tečajevi, kamate, monetarni i bankarski pokazatelji | Javni SDMX 2.1 REST servis | **DA — autoritativni EU izvor** |
| 2 | [Eurostat REST API](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-introduction) | EU/Hrvatska BDP, inflacija, zaposlenost, industrija i trgovina | Javni REST web servis; provjeriti atribuciju i pravila ponovne uporabe | **DA — za EU makro modul** |
| 3 | [FRED API](https://fred.stlouisfed.org/docs/api/fred/) | Globalni i američki makro, kamate, prinosi, kreditni i tržišni indikatori | Besplatan API ključ; prava ovise i o izvornom datasetu | **DA — uz server-side ključ i provjeru serije** |
| 4 | [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | Službene objave američkih kompanija, 10-K/10-Q/8-K i XBRL fundamenti | Bez autentikacije i API ključa; real-time ažuriranje; obvezno poštovati SEC automated-access politiku | **DA — za fundamentals/filings, ne za cijene** |
| 5 | [U.S. EIA Open Data](https://www.eia.gov/opendata/) | Nafta, plin, električna energija, zalihe, proizvodnja i energetske cijene | EIA ga opisuje kao free and open data; koristiti API/bulk pristup | **DA — za energetski kontekst i validaciju** |
| 6 | [World Bank Indicators API v2](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation) | BDP, dug, FDI, trgovina i usporedbe država | Javni API v2; SDMX pozivi ograničeni na 15.000 podatkovnih točaka po pozivu | **DA — za globalni makro** |
| 7 | [Frankfurter v2](https://frankfurter.dev/) | Aktualni i povijesni FX | Bez ključa; otvoren kod; moguć self-hosting; 201 valuta iz 84 središnje banke | **DA — izravno, bez plaćenog wrappera** |
| 8 | [CoinGecko Demo API](https://docs.coingecko.com/) | Agregirane kripto cijene, tržišna kapitalizacija i metadata | Besplatni Demo ključ; ograničeni endpointi i krediti; službeno naveden limit 100 poziva/min | **DA — već primarni kripto izvor, uz cache** |
| 9 | [Coinbase Exchange Market Data](https://docs.cdp.coinbase.com/exchange/introduction/welcome) | Izravne spot cijene i order-book tržišni podatci | Market Data API je javan; trading API zahtijeva autentikaciju | **DA — kripto fallback i provjera cijene** |
| 10 | [Alpha Vantage](https://www.alphavantage.co/documentation/) | Dionice, indeksi, FX, roba, kripto i tehnički indikatori | Besplatan ključ, standardno samo 25 poziva/dan; EULA i komercijalnu uporabu provjeriti prije javnog prikaza | **PILOT — dobar uz agresivan cache, nije automatski odobren za javnu produkciju** |

## Dodatni kandidat koji nije “besplatan za naš portal”

[Twelve Data](https://twelvedata.com/pricing) tehnički je dobar za real-time američke dionice, ETF-ove, FX i kripto. Basic plan daje 8 API kredita/min i 800/dan, ali je individualna cijena izričito za osobnu, internu i nekomercijalnu uporabu. Za javni korporativni portal treba poslovni/licencirani plan. Zato nije uvršten kao besplatni produkcijski izvor.

## Preporučena arhitektura po vrsti podataka

### Kripto

1. CoinGecko Demo — primarni agregirani izvor
2. Coinbase Exchange — izravni spot fallback
3. CoinPaprika — postojeći sekundarni fallback, zasebno pratiti uvjete i limite
4. Zadnja dobra vrijednost iz KV/cachea ako svi provideri privremeno padnu

### FX

1. Frankfurter v2 — primarni jednostavni API
2. ECB Data Portal — autoritativna provjera/fallback
3. Cache najmanje do sljedećeg službenog dnevnog ažuriranja

### Dionice i indeksi

1. Alpha Vantage pilot za mali broj simbola i dnevne/cached podatke
2. SEC EDGAR za fundamentne podatke i službene objave, ne za quote
3. Za širi real-time javni prikaz ugovoriti komercijalno licenciran feed; ne oslanjati se na neslužbeni Yahoo endpoint

### Roba i energija

1. EIA — službeni energetski pokazatelji, zalihe, proizvodnja i referentne serije
2. Alpha Vantage pilot za dnevne commodity serije ako licenca dopušta
3. Neslužbeni Yahoo Finance endpoint zadržati samo privremeno kao last-resort dok se ne zamijeni licenciranim izvorom

### Makro

1. ECB + Eurostat za Hrvatsku i EU
2. FRED za tržišne/makro serije i povijesne revizije
3. World Bank za usporedbu država i dugoročne pokazatelje

## Redoslijed implementacije

1. **Popraviti deduplikaciju vijesti.** Produkcijski feed ima 16 grupa duplih URL-ova među 100 stavki, iako su ID-jevi različiti.
2. **Migrirati Frankfurter v1 endpoint na v2** uz contract test i fallback na postojeći v1 dok se ne potvrdi identična normalizacija.
3. **Označiti Yahoo Finance kao neslužbeni/privremeni izvor** u kodu i health rezultatu.
4. **Dodati EIA adapter** za službene energetske serije, ali ga ne predstavljati kao intraday futures quote.
5. **Napraviti Alpha Vantage pilot iza feature flaga** bez javnog uključivanja dok se ne potvrdi komercijalna licenca; maksimalno 25 poziva/dan.
6. **Dodati makro modul** s ECB/Eurostat/FRED podatcima tek nakon završetka aktualnih produkcijskih bugova.

## Minimalne tehničke kontrole

- svi ključevi samo u Cloudflare secrets
- provider adapter po izvoru
- timeout, ograničen retry i circuit breaker
- cache + zadnja dobra vrijednost
- jedinstvena normalizirana shema
- `source`, `sourceUrl`, `asOf`, `retrievedAt` i `isDelayed`
- server-side rate limiting
- bez automatske naplate i bez pay-per-result providera
- atribucija vidljiva na portalu
- informativni disclaimer; bez investicijskog savjetovanja
- test licencnih i rate-limit pretpostavki prije uključivanja feature flaga

## Zaključak

Za trenutni portal najbolja kombinacija je CoinGecko + Coinbase za kripto, Frankfurter + ECB za FX te EIA/Eurostat/FRED/World Bank za službeni tržišni i makro kontekst. Za javne real-time dionice ne postoji sigurna pretpostavka da je “free API” automatski dopušten za komercijalni display; zato Alpha Vantage ostaje pilot, a Twelve Data zahtijeva poslovnu licencu.
