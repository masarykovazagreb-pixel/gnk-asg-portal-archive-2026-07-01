# AKTUAL MEDIA — sitemap, oznake i poveznice

## Izvedeno

- EN sitemap zemaljskih imenika bio je naveden u `robots.txt`, ali nedostajao je u glavnom indeksu. Sada je registriran i tamo, bez izmišljenog datuma izmjene. Sadrži indeksnu stranicu i osam trenutno indexable imenika; preostalih 193 imaju postojeći `noindex` i nisu nasilno uvršteni. `noindex` nije dokaz da su ti URL-ovi uklonjeni iz Googlea.
- Generator regionalnog indeksa i alat za očuvanje indeksa zadržavaju novi unos. Legacy Python generator pri obnovi indeksa čuva prethodno registrirane sitemape umjesto da zamijeni indeks s četiri stavke; za tri vlastita izmijenjena sitemapa uklanja neprovjerene datume. Ostalo ponašanje legacy generatora nije ovim zahvatom odobreno za masovnu regeneraciju.
- Na 193 EN imenika na kojima nedostaju obje oznake umetnuti su vidljivi #NerminSefić, #NerminSefic, #AktualMedia, #GNKASG i #MrezaIzdanja. Poveznice vode na postojeće engleske stranice profila, redakcije i portala. Osam postojećih blokova nije zamijenjeno. Oznake su oznake mreže, ne tvrdnja da je Nermin Sefić autor bilo kojeg tuđeg članka, niti su ubačene u meta keywords. Politika `hashtag_scope: all_pages` provjerava se prije popravka.
- Scoped alat provjerava samo 201 registriranu EN zemaljsku stranicu, odbija djelomične oznake ili neočekivano podnožje, po zadanim postavkama je read-only i ponovno pokretanje je idempotentno. U generator je dodan isti blok. Postojeći autorski slojevi nisu uklonjeni; nezavisna provjera utvrdila je da je na 193 promijenjene stranice jedina razlika upravo dodani blok.

## Poveznice i mjerenje

Dodane veze na vlastite stranice su **interne poveznice**, ne backlinkovi s drugih domena. Vanjskim stranicama ne treba lažno pripisati linkove, partnerstva ili pravo korištenja. Tijekom provjere vanjsko probno izdanje za Hrvatsku vratilo je HTTP 500 pa trenutačnu povratnu poveznicu i dostupnost nije moguće potvrditi. Za stvarne backlinkove potrebno je da drugi vlasnici objave relevantne, urednički opravdane poveznice; nema potvrde da je bilo kome poslan zahtjev ili da je link objavljen.

Rast vidljivosti 50 puta nije moguće jamčiti pomoću hashtagova, meta opisa ili sitemapa. Za mjerenje treba pratiti impresije, klikove, upite, indeksne statuse i upućujuće domene u Search Console/analitici kroz usporedive periode. Bez pristupa tim podacima rezultat je nepoznat. Sitemapovi opisuju poželjne kanonske javne URL-ove, ne svaku internu, noindex ili dupliciranu stranicu; cilj je točno pokrivanje, ne maksimalan broj adresa.

## Provjere i opseg

- `node tests/test-sitemap-integrity-v1.mjs`: 39 lokalnih sitemap datoteka, 48.899 provjerenih lokalnih loc unosa, nula prijavljenih nedostajućih datoteka ili neregistriranih sitemapa. Broj uključuje duplikate između sitemapa i unose indeksa, nije broj jedinstvenih ili indeksiranih stranica.
- `node --test tests/test-world-hashtags-sitemap-v1.mjs tests/test-aktual-world-meta-v1.mjs`: oznake, kanonske indexable adrese u EN sitemapu i usklađeni opisi, plus deterministička izolirana gradnja.
- `python3 tests/test-sitemap-index-preservation-v1.py`: očuvanje svih postojećih unosa i neizmišljanje datuma. `node scripts/audit-aktual-brand-indexability-v1.mjs --strict`: lokalna provjera 17 kanala, bez tvrdnje o Google indeksiranju.
- Ovo nije potpuna revizija svih stranica domene niti pregled uređaja. Postojeći generator EN imenika kod pune regeneracije prepisuje dodatne slojeve pa ga ne treba pokretati preko živog stabla bez zasebne zaštite slojeva. Dodatni sitemap URL-ovi zahtijevaju provjeru kanonskog URL-a, objave, robots/noindex i pristupačnosti; ne dodavati sve datoteke naslijepo.
