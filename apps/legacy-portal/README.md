# GNK ASG d.o.o. — Corporate Technology Portal

Službeni korporativni portal **GNK ASG d.o.o.** — Sport, Technology, Finance & Governance.

## Javni portal

Službena domena:

`https://gnk-asg.hr/`

GitHub Pages repozitorij i hosting osnova:

`aktualmedia/gnk-asg`

## Ugrađeni moduli

- korporativni profil GNK ASG d.o.o. i vizualni identitet
- revidirani financijski pokazatelji za FY 2025
- GNK DINAMO Ltd. Group Overview s odvojenom napomenom o osnovi grupnih podataka
- rotirajući **3D globus globalne mreže**: 33 postojeća društva i 12 planiranih pozicija, geografske koordinate, ručna rotacija, zumiranje, automatska rotacija, animirani tokovi, klik na lokaciju i prebacivanje na postojeći 2D prikaz
- postojeća 2D mreža s filtrima i premium animiranim vezama kao dostupni alternativni prikaz / fallback
- Technology & Artificial Intelligence odjeljak
- Market Intelligence: digitalna imovina, stablecoini, burze, tržišni indeksi i dnevni tržišni osvrt
- ASG Gold Reference informativni pre-launch prikaz
- Business & Technology News rubrike za Hrvatsku, Sloveniju, Srbiju, BiH i međunarodne izvore
- FINA Info.BIZ / RGFI panel sa službenim poveznicama za provjeru
- GNK ASG Intelligence Desk kao informativno korisničko sučelje nad javnim podatcima portala
- pripremljeni sigurni ulaz `/webmail/` za budući Zoho Mail račun `info@gnk-asg.hr`, bez prikupljanja zaporki na javnom portalu
- PWA manifest, mobilna navigacija i network-first service worker

## 3D mreža društava

3D prikaz izrađen je kao vlastiti Canvas modul bez vanjskih CDN biblioteka, radi stabilnosti javnog portala i instalirane PWA aplikacije.

- modul: `assets/group-globe-3d.js`
- stilovi: `assets/group-globe-3d.css`
- geografski podatci: `data/group_network_geo.json`
- izvorni poslovni model mreže ostaje u `data/group_network.json`
- korisnik može rotirati globus mišem ili dodirom, zumirati, uključiti/isključiti automatsku rotaciju i odabrati lokaciju radi detalja
- postojeći 2D prikaz ostaje dostupan gumbom `2D mreža`

## Sigurnosni model medijskih objava i webmaila

Portal je javna statična stranica. Zato se vjerodajnice, privatni administrativni redovi i neodobreni rezultati pretrage ne spremaju u javno sučelje niti u javne podatkovne datoteke portala.

- javna rubrika `GNK ASG u medijima` čita samo `data/media_approved.json`;
- objava ulazi u javni prikaz samo kroz autorizirani ručni workflow `manage-approved-media.yml`;
- status dostupnosti medijskog monitoringa zapisuje se u `data/media_monitor_status.json`;
- administrativna stranica prikazuje samo javno odobrene objave i status monitoringa;
- `/webmail/` je samo brendirani sigurni ulaz u pripremi; nakon aktivacije pošte prijava se provodi na službenom Zoho Mail sustavu, a ne na GitHub Pages portalu.

## Automatski workflowi

### `Hourly News and Macro Reference Update`

Datoteka: `.github/workflows/hourly-data-update.yml`

- izvršava se svaki sat u 17. minuti;
- moguće ga je pokrenuti ručno kroz karticu **Actions**;
- pokreće `scripts/update_feeds_v2.py` i `scripts/update_macro_data.py`;
- ažurira `data/news.json`, `data/macro_market.json` i `data/update_status.json`;
- promjene automatski sprema u repozitorij.

### `Five Minute Market Intelligence Update`

Datoteka: `.github/workflows/fast-market-update.yml`

- izvršava se svakih pet minuta;
- osvježava `data/market.json`, `data/stablecoins.json`, `data/exchange_compare.json`, `data/market_indices.json`, `data/btc_chart.json` i `data/fast_market_status.json`;
- uspješno osvježene tržišne cjeline objavljuje i kada je pojedini javni izvor privremeno nedostupan, uz statusnu napomenu.

### `Daily Market Brief Publication`

Datoteka: `.github/workflows/daily-market-brief.yml`

- jednom dnevno generira javni profesionalni tržišni osvrt iz posljednjih objavljenih tržišnih podataka;
- ažurira `data/daily_market_brief.json`.

### `Media Monitor Status`

Datoteka: `.github/workflows/media-monitor-status.yml`

- provjerava dostupnost javnih pretraga za relevantne korporativne pojmove;
- ne sprema niti javno prikazuje neodobrene rezultate;
- ažurira samo javni status monitoringa.

### `Approve Corporate Media Publication`

Datoteka: `.github/workflows/manage-approved-media.yml`

- ovlaštenom korisniku omogućuje ručno odobriti ili ukloniti provjerenu javnu objavu;
- mijenja samo javnu listu odobrenih poveznica.

### `Daily SEO Refresh`

Datoteka: `.github/workflows/daily-seo-refresh.yml`

- izvršava se dnevno;
- moguće ga je pokrenuti ručno;
- generira SEO metapodatke, društveni PNG pregled, `sitemap.xml` i `robots.txt` za službenu domenu `https://gnk-asg.hr/`, bez indeksiranja administratorskog ulaza.

### `Portal Validation and Live Data Test`

Datoteka: `.github/workflows/portal-validation.yml`

- izvršava se na pull requestu i ručno, a produkcijska kontrola usklađuje se s funkcionalnim promjenama portala;
- validira JavaScript i Python sintaksu aktivnih modula;
- provjerava 3D mrežu, svih 45 lokacija i pripadajuće geografske koordinate;
- potvrđuje da javni admin i pripremljeni webmail ne obrađuju osjetljive vjerodajnice;
- izvršava stvarno probno povlačenje vijesti, kripto tržišnih podataka, BTC grafa, makro tržišnih serija i statusa medijskog monitoringa;
- ne commitira probne podatke u javni portal.

## Kontrola prikaza vijesti

Datoteka `data/blocked_news.json` služi za uklanjanje neželjenih URL-ova ili izraza iz naslova u javnom prikazu. Nakon izmjene blok-liste, sadržaj se prilagođava pri sljedećem automatskom ažuriranju.

## Podatkovna osnova

Korporativni podatci GNK ASG d.o.o. i financijski pokazatelji za FY 2025 temelje se na dostavljenim financijskim dokumentima i izvješću neovisnog revizora. Podatci o GNK DINAMO Ltd. grupnom okviru prikazuju se odvojeno, uz jasnu napomenu o osnovi i statusu grupnog dokumenta.
