# Procjena cporter202 API repozitorija za GNK ASG portal

Datum provjere: 2026-07-19  
Status: istraženo; nijedan vanjski scraper nije odobren za produkciju

## Sažetak odluke

`cporter202/API-mega-list` nije katalog 11.860 provjerenih besplatnih API-ja. U praksi je pretežno generirani katalog Apify Actora i scrapera, često s affiliate parametrom `fpr=p2hrc6`. Koristan je samo kao početna točka za otkrivanje ideja. Ne smije postati ovisnost aplikacije niti izvor kojem automatski vjerujemo.

Za GNK ASG portal koristimo samo službeno dokumentirane izvore, s jasnim uvjetima korištenja, stabilnim API-jem, server-side pristupom, cacheom i fallbackom.

## Što je provjereno

- GitHub profil `cporter202`: 22 javna repozitorija vraćena GitHub API-jem.
- Samo 2 od 22 repozitorija imaju prepoznatu licencu (MIT); 20 nema prepoznatu licencu.
- `API-mega-list`: nema GitHub licencu; glavni README ima približno 8,8 MB i sadržaj je generiran po kategorijama.
- Uzorak pet najvećih preuzetih kategorijskih README datoteka:
  - 8.676 ukupnih HTTP(S) poveznica
  - 8.345 poveznica vodi na `apify.com`
  - svih 8.345 Apify poveznica nosi isti affiliate parametar
  - udio Apify poveznica u uzorku: 96,18%
- `agentic-ai-apis` sam navodi da se Apify katalog sinkronizira svakodnevno i da zadržava affiliate tracking.
- `stock-market-signal-automation` ima MIT licencu, ali ne daje besplatne tržišne signale: repozitorij sadrži primjere, dok je živi signalni pristup vezan uz KamdenAI članstvo.

Ovo je uzorkovanje najvećih kategorija, a ne tvrdnja da je svaki pojedini zapis u cijelom repozitoriju Apify.

## Glavni rizici

1. **Nije stvarno besplatno.** Mnogi Actori naplaćuju izvršenje ili rezultat, iako opis koristi riječ “free” ili “no API key”.
2. **Nepotreban posrednik.** Pojedini Actori naplaćuju wrapper iznad izvornog besplatnog API-ja. Primjer: Apify wrapper za Frankfurter oglašava cijenu po rezultatima, dok službeni Frankfurter API ne traži ključ.
3. **Uvjeti korištenja i zakonitost.** Scraping društvenih mreža, paywall bypass, osobni podaci i lead-generation izvori nose ToS, privatnost, GDPR i autorskopravne rizike.
4. **Nepoznata kvaliteta.** “Production-ready” u generiranom popisu nije dokaz pouzdanosti, održavanja ili točnosti.
5. **Licenca.** Bez licence ne kopiramo kod ni generirani sadržaj u naš projekt. Poveznicu smijemo neovisno provjeriti kod izvornog pružatelja.
6. **Operativna ovisnost.** Scraperi pucaju kada ciljana stranica promijeni HTML, uvede zaštitu ili promijeni pravila.

## Provjereni shortlist za naš portal

| Izvor | Moguća namjena | Uvjeti / ograničenja | Odluka |
|---|---|---|---|
| Postojeći službeni RSS izvori | Primarni news feed | Bez dodatnog API posrednika; poštovati izvor i atribuciju | **Zadržati kao primarni izvor** |
| [GDELT DOC 2.0](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) | Rezervno otkrivanje svježih globalnih članaka | Realtime/open data; potrebni deduplikacija, rangiranje kvalitete i poveznica na originalni medij | **Pilot samo ako RSS opet zakaže** |
| [Frankfurter v2](https://frankfurter.dev/) | FX i povijesni tečajevi | Bez API ključa; javni API; otvoren kod i moguć self-hosting | **Odobreno; koristiti izravno, bez Apify wrappera** |
| [ECB Data Portal API](https://data.ecb.europa.eu/help/api/overview) | Službena provjera FX/makro podataka | SDMX 2.1; složeniji model podataka; testirati volumen i cache | **Odobreno kao autoritativni fallback/validator** |
| [football-data.org v4](https://www.football-data.org/documentation/api) | Budući nogometni rasporedi i tablice | Free plan: 12 natjecanja, odgođeni rezultati i 10 poziva/min; obvezna vidljiva atribucija | **Uvjetno, tek za sportski modul** |
| [Open-Meteo](https://open-meteo.com/en/pricing) | Vrijeme/lokacijski kontekst | Besplatni endpoint je samo za nekomercijalnu upotrebu, 10.000 poziva/dan i bez uptime jamstva; komercijalna upotreba traži customer plan | **Ne računati kao besplatni produkcijski API** |
| Postojeći CoinGecko/CoinPaprika/Coinbase fallback lanac | Kripto tržišni podaci | Provider-specific limiti; server-side cache i fallback obvezni | **Zadržati i nadzirati** |

## Prioritet implementacije

1. Nakon deploya provjeriti da `/api/public-news-feed` vraća aktualne članke iz deployanog asseta.
2. Ne dodavati cporter202/Apify scraper u news pipeline.
3. Ako RSS pokrivenost ostane nedovoljna, napraviti mali GDELT adapter iza feature flaga:
   - maksimalno trajanje zahtjeva
   - cache
   - deduplikacija po canonical URL-u i naslovu
   - minimalni prag svježine
   - filtriranje jezika/domene
   - fallback na postojeći feed
4. Za FX ostati na izravnom Frankfurter/ECB pristupu i nikad ne plaćati scraper koji samo prosljeđuje isti API.
5. Football-data.org dodati tek kada postoji jasno definiran sportski prikaz i provjerena pokrivenost željenih liga.
6. Ne koristiti paywall-bypass, privatne profile, harvesting osobnih kontakata ni neslužbene social-media scrapere.

## Pravilo za svaki novi “free API”

API ulazi u produkciju tek nakon provjere svih stavki:

- službena dokumentacija i izvorni provider
- licenca i komercijalni uvjeti
- autentikacija i tajne isključivo server-side
- rate limit, timeout, retry i cache
- stabilna shema i validacija odgovora
- atribucija i provenance u korisničkom sučelju
- privacy/GDPR procjena
- feature flag i fallback
- testovi normalizacije i produkcijski health check
- troškovni limit ili potpuno isključena naplata po potrošnji

## Izvori

- [cporter202/API-mega-list](https://github.com/cporter202/API-mega-list)
- [Upozorenje zajednice o affiliate/Apify prirodi popisa](https://github.com/cporter202/API-mega-list/issues/19)
- [cporter202/agentic-ai-apis](https://github.com/cporter202/agentic-ai-apis)
- [cporter202/stock-market-signal-automation](https://github.com/cporter202/stock-market-signal-automation)
- [GDELT službeni pregled podataka i API-ja](https://www.gdeltproject.org/data.html)
- [football-data.org pravila i rate limits](https://docs.football-data.org/general/v4/policies.html)
- [football-data.org cijene](https://www.football-data.org/pricing)
- [Frankfurter službena dokumentacija](https://frankfurter.dev/)
- [ECB Data Portal API](https://data.ecb.europa.eu/help/api/overview)
- [Open-Meteo cijene i uvjeti](https://open-meteo.com/en/pricing)

## Zaključak

Ne integrirati cporter202 katalog ni njegove Apify scrapere. Vrijednost repozitorija je u idejama i imenima mogućih izvora, ali svaki kandidat mora biti ponovno pronađen i provjeren kod izvornog pružatelja. Za sada nema potrebe uvoditi novi provider prije potvrde da je deployani news fix riješio svježinu feeda.
