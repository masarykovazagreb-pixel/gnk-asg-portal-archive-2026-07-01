# GNK ASG portal — pregled i opseg redizajna

**Datum pregleda:** 2026-10-12
**Izvor pregleda:** HTML i runtime izvori u `apps/portal` te aktivni Worker entrypoint; ovo nije tvrdnja da je aktualni produkcijski deploy već promijenjen ili da je svaka produkcijska ruta zasebno pregledana u pregledniku.

## Opseg

Skenirano je svih **2.526 HTML datoteka** u portalu, uključujući **2.486 datoteka `index.html`** koje predstavljaju glavne statičke rute. Najčešće zajedničke frontend baze su `assets/style.css`, `assets/public-sections-v1.css`, `assets/editorial-content-v2.css` i `assets/public-unified-menu-v6.css`. Dio sadržaja dolazi iz dinamičkih Worker ruta, pa se isti vizualni sloj primjenjuje u aktivnom HTML response wrapperu nakon route resolutiona.

### Klasifikacija glavnih ruta (`index.html`)

| Skupina | Broj | Postupak |
|---|---:|---|
| Ostale javne stranice | 1.795 | Zajednički višebojni redizajn i tematski medijski sloj |
| AKTUAL MEDIA / AKTUAL sadržaj | 81 | Samo diskretno, izolirano dotjerivanje |
| Uredničko odobravanje i objavljivanje | 2 | Poseban izolirani izgled; postojeće kontrole i API pozivi ostaju |
| SPT | 580 | Potpuno izuzeto, uključujući SPT objave izvan `/spt/` |
| Bankarske stranice / izdvojeni bankarski sadržaji | 6 | Potpuno izuzeto iz novog sloja |
| Ostale zaštićene operatorske stranice | 22 | Ostaju nepromijenjene |
| **Ukupno** | **2.486** | |

Dvije uređivačke/objavljivačke površine s izdvojenim dizajnom su `/admin-center/news-publication/` i `/admin-center/editorial-approval/`. Njihova funkcionalnost i zaštita sesijom nisu izmijenjene. Javne objave, Newsroom, analize, tržišta, korporativne stranice i ostale neizuzete rute dobivaju zajednički dizajn. Od 2.526 HTML datoteka ukupno, šest HTML fragmenata/asset-pregleda i Google verifikacijskih stranica također ostaju bez vizualne injekcije jer nisu pune portalne stranice.

## Tehničko rješenje

- Aktivni wrapper `workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js` dodaje odgovarajući CSS link i uske scope markere samo za rute u opsegu.
- Transformacija radi nad `GET` odgovorima tipa HTML, uključujući HTML koji vraćaju dinamičke Worker rute.
- Opći sloj koristi lokalne tematske ilustracije iz `apps/portal/assets/topic-media/`, odabrane prema ruti i prikazane samo kao dekorativna pozadinska umjetnost hero sekcija; postojeće uredničke fotografije i sadržaj nisu zamijenjeni.
- Slojevi ostaju odvojeni (`portal-colorful-redesign-v1.css`, `aktual-media-polish-v1.css`, `publishing-desk-refresh-v1.css`); SPT, bankarski sadržaj i Aktuali ne dobivaju opći medijski sloj.
- Nema izmjena objavljenog sadržaja, `id`/anchor strukture, JavaScript aplikacija, obrazaca, API endpointa, D1/KV/R2 bindinga, autorizacije, maila, redova objava ili podataka.
- Korijenska i engleska naslovnica zadržavaju postojeće HTML i funkcije; mijenja se samo prikaz putem zajedničkog stila.
- Bankarske rute obuhvaćaju i sadržaje s bankarskim slugom izvan `/bank/`, uključujući projektno ažuriranje u `/aktual/` i članak o bankarskim garancijama.
- Javni meni sada jasno prikazuje `Banka / Adria Bank` odmah uz Financije i vodi na postojeće `/bank/` odnosno `/en/bank/`; same bankarske stranice nisu mijenjane.

## Verifikacija

`node scripts/test-sitewide-visual-redesign-v1.mjs` prolazi. Test provjerava svih 2.526 HTML datoteka, idempotentnost injekcije, očuvanje skripti/linkova/ID-jeva/formi/kontrola naslovnice, mapiranje osam tematskih ilustracija te byte-for-byte nepromijenjen HTML za svih 580 SPT-ruta (uključujući SPT sadržaj izvan `/spt/`), bankarske i druge zaštićene rute. Aktual zasebno prima samo svoj izolirani polish sloj.

`node --check` prolazi za novi Worker modul i aktivni entrypoint. Produkcija nije deployana ovim pregledom.

## Tematske slike i video

Za javne stranice izvan izuzeća dodan je lokalni set od osam širokih ilustrativnih hero-vizuala. Worker odabire motiv prema ruti; CSS ga prikazuje dekorativno u postojećim hero-površinama, a postojeće uredničke fotografije i infografike ostaju primarne:

| Tema | Lokalni vizual |
|---|---|
| Korporativna mreža i grupni identitet | `corporate-network.jpg` |
| Financije i tržišta | `markets-finance.jpg` |
| Tehnologija i AI | `technology-ai.jpg` |
| Projekti, energija i infrastruktura | `projects-infrastructure.jpg` |
| Newsroom i uredništvo | `newsroom-editorial.jpg` |
| Analize i istraživanje | `research-analysis.jpg` |
| Sport i zajednica | `sports-community.jpg` |
| Kulinarstvo i World Table | `culinary-world-table.jpg` |

Vizuali su generirani za portal bez logotipa ili činjeničnih natpisa, ukupno približno 1,6 MB; ne zahtijevaju vanjske image hostove i služe kao ilustracije, ne kao dokumentarne fotografije. Specifične fotografije restorana i gradskih lokacija ostaju netaknute; kulinarski art cilja samo zasebni `food-hero`.

Pregled inventara našao je stvarne video-sadržaje samo u SPT području, koje je izričito izuzeto, uključujući SPT objave izvan `/spt/`. Video nije kopiran, premješten ni promijenjen, a lažni video-playeri nisu dodani. Opći CSS samo uređuje `<video>` element ako se stvarni, odobreni video pojavi na javnoj stranici; za kratke filmove izvan SPT-a potreban je zaseban odobreni video materijal.

## AKTUAL MEDIA RADIO — plutajući player

Pregledom je utvrđeno da je plutajući panel ranije bio širok približno 220 px, s premalim kontrolama i zbijenim rasporedom. Redizajn je ograničen na CSS plutajućeg panela: uredniji tamnoplavi/gold vizualni sloj, čitljiva hijerarhija, stanice u dosljednoj trostupčanoj mreži, poravnate glasnoća/play/otvaranje kontrole, bolji fokusni prikaz te prilagodba uskim i niskim viewportima. Stilovi su ograničeni na `#aktualMediaRadioFloat` kako ne bi prepisivali tipografiju i gumbe ostatka portala.

Audio engine, URL-ovi stanica, BroadcastChannel, play/pauza, glasnoća, odvajanje u stalni player, zatvaranje/ponovno otvaranje i pomicanje nisu mijenjani. Zadržan je postojeći markup i data-attribute ugovor. Povećan je samo asset cache-buster; zatvoreni okrugli launcher i jedina pohranjena UI postavka (otvoreno/zatvoreno) ostaju podržani. Promjene su lokalne — produkcijski deploy nije izvršen.
