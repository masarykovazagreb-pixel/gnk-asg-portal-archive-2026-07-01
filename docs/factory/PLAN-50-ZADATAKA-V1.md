# Plan završavanja — 50 zadataka

Redoslijed rada od 1. 11. 2026. Plan nadopunjuje, ne zamjenjuje, `ZADACI-100-SVIJET-V1.md`. **Gotovo** znači provjereno uz navedeni dokaz; ne znači deploy. **Otvoreno** uključuje zadatke koji ovise o vanjskim servisima ili dokazima. Opća vlasnikova dozvola za rad ne stvara prava trećih osoba niti dokazuje postojanje urednika, licence ili javnog weba. Prije spajanja u main i dalje vrijedi prethodno izričito pravilo o odobrenju.

| # | Zadatak po redu | Stanje i dokaz |
|---|---|---|
| 1 | Utvrditi radnu granu i stanje promjena. | gotovo — `git status`, grana `arena/3c5bc634-gnk-asg-portal-archive-2026-07` |
| 2 | Usporediti udaljenu radnu granu i main. | gotovo — 1. 11. prije promjene: radna `3aa34a357e8`, main `9b8f16f0b94`; main se može mijenjati |
| 3 | Pregledati nedavne produkcijske workflowe. | gotovo — u trenutku pregleda Admin Auth u tijeku; Autonomija i SLA Watchdog neuspješni; drugi rezultati variraju |
| 4 | Utvrditi neuspjeli korak Autonomije. | gotovo — run 41311996151, korak „Signal tvrdih kriterija”; detaljni log nedostupan (EOF) |
| 5 | Utvrditi neuspjeli korak Watchdoga. | gotovo — run 41310173603, provjera svježine/SLA; detaljni log nedostupan (EOF) |
| 6 | Pribaviti detaljan uzrok i sanirati Autonomiju. | otvoreno — bez dostupnog loga nije utvrđen točan kriterij |
| 7 | Pribaviti detaljan uzrok i sanirati Watchdog. | otvoreno — bez dostupnog loga nije utvrđen točan uzrok |
| 8 | Pregledati otkazane redovne workflowe i uzrok. | otvoreno |
| 9 | Analizirati pomak i povijest maina prije integracije. | otvoreno |
| 10 | Izraditi postupak povratka neuspjelog deploya. | otvoreno |
| 11 | Provjeriti broj država i njihova stanja. | gotovo — validator: 195, 14 live u registru, 3 preparing, 178 planned; nije provjera uživo |
| 12 | Provjeriti jedinstvenost ISO oznaka. | gotovo — `test-world-registry-v1.mjs` |
| 13 | Provjeriti jedinstvenost kanala i mapiranja. | gotovo — isti test |
| 14 | Odbiti nepoznata stanja i nepostojeće kanale. | gotovo — isti test |
| 15 | Provjeriti državu i adresu mapiranog kanala. | gotovo — isti test |
| 16 | Spriječiti pogrešno mapiranje planned zapisa. | gotovo — isti test |
| 17 | Uključiti integritet registra u obavezni skup testova. | gotovo — `scripts/test-all-v1.mjs` |
| 18 | Provjeriti neobjavljene predloške za sve planirane države. | gotovo — `test-country-previews-v1.mjs`, 5 testova |
| 19 | Provjeriti vidljivost registra i filtara bez izmišljanja poveznica. | gotovo — `test_world_directory_v1.mjs`, 3 testa |
| 20 | Provjeriti centar agenata i filtara. | gotovo — `test_factory_center_v1.mjs`, 5 testova |
| 21 | Provjeriti dostupnost stvarnih live izdanja izvana. | otvoreno — status registra nije dokaz HTTP dostupnosti |
| 22 | Ustanoviti stanje kanala SAD-a i uvjete za stvarni HR–USA fallback. | otvoreno |
| 23 | Ustanoviti stanje Brazila. | otvoreno |
| 24 | Ustanoviti stanje Australije. | otvoreno |
| 25 | Dokumentirati jezike, RTL i pristupačnost za svjetske predloške. | otvoreno |
| 26 | Pregledati W1 izvore i njihove aktualne uvjete. | otvoreno |
| 27 | Pribaviti dokaz prava na tekstove i izvatke. | otvoreno — dozvole trećih osoba ne pretpostavljaju se |
| 28 | Pribaviti dokaz prava na fotografije zasebno. | otvoreno |
| 29 | Dokumentirati stvarne urednike i njihove ovlasti. | otvoreno — bez izmišljanja osoba ili odobrenja |
| 30 | Testirati blokadu objave bez dokaza izvora, prava i urednika. | otvoreno |
| 31 | Provjeriti planiranje HR objave i nezastarjele izvore. | otvoreno |
| 32 | Provjeriti planiranje svjetske objave i razlike među statusima. | otvoreno |
| 33 | Testirati lokalnu nedostupnost i djelomične greške peer feedova. | otvoreno |
| 34 | Testirati atribuciju i sigurnost poveznica razmjene. | otvoreno |
| 35 | Odvojiti planiranje od stvarne objave u korisničkom sučelju. | otvoreno za novu provjeru; postojeći plan ne objavljuje |
| 36 | Provjeriti svježinu datuma razmjene na promjeni dana. | otvoreno za novu provjeru; regresija prethodno dodana u `3aa34a357e8` |
| 37 | Provjeriti arhivu 15 regionalnih kanala bez brisanja. | otvoreno |
| 38 | Provjeriti Beograd: zapisi i stranice. | otvoreno |
| 39 | Provjeriti najnoviji ciklus Kaira. | otvoreno |
| 40 | Pregledati SEO duplikate bez automatskog izmišljanja sadržaja. | otvoreno |
| 41 | Pregledati pristupačnost tipkovnice i kontrast. | otvoreno |
| 42 | Provjeriti vlasničke oznake i odobrene javne spomene. | otvoreno |
| 43 | Provjeriti radio nacrte i prava na vanjsku distribuciju. | otvoreno |
| 44 | Testirati sigurnosne kapije vanjske distribucije. | otvoreno |
| 45 | Provjeriti deterministički orkestrator i evidenciju. | otvoreno |
| 46 | Pregledati tajne, rasporede i pouzdanost workflowa. | otvoreno |
| 47 | Pokrenuti sve obavezne provjere na čistom klonu konačnog commita. | otvoreno do završetka provjere |
| 48 | Poslati granu tek nakon zelenog test-all. | otvoreno do uspješnog pusha |
| 49 | Nakon posebnog odobrenja integrirati i provjeriti stvarni deploy. | otvoreno; bez pretpostavke da je deploy izvršen |
| 50 | Provjeriti javne URL-ove, izvore i izvijestiti što radi, a što ne. | otvoreno |
