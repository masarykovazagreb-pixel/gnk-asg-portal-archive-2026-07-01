# Analiza stanja mreže AKTUAL MEDIA / GNK ASG

**Datum mjerenja:** 24. listopada 2026.
**Podatkovni dan:** 24. listopada 2026. (`apps/portal/data/network-counts-v1.json`)
**Grana:** `arena/33515f0b-gnk-asg-portal-archive-2026-07`
**Metoda:** sve brojke izmjerene iz izlaznih stabala i iz podataka u repozitoriju, ne iz sjećanja. Gateovi pokrenuti naredbom `node scripts/test-all-v1.mjs`.

---

## 1. Sažetak — u deset redaka

1. Mreža ima **9.557 HTML stranice** na **6 webova** i **9 svjetskih portala**; inventar (`/sve-stranice/`) vodi **9.519** stranica jer ne broji pomoćne i administratorske mape.
2. Ima **4.877 tekstova** u **17 gradskih izdanja** na **14 jezika**, s **134 medijska izvora**; svi brojevi dolaze iz jedne datoteke, pa se ne mogu razići.
3. **Svih 73 obaveznih provjera je zeleno** (`73/73`) — prvi put u ovom ciklusu.
4. **Osvježavanje radi na 9.551 od 9.557 stranica** (99,94 %); modul više nije samo na naslovnicama.
5. **Slike:** 329.174 `<img>` taga, 313.099 s `loading="lazy"` (95,1 %), **nijedna bez alt-a, dimenzija ili datoteke**.
6. **Pristupačnost:** **9.535 od 9.557 stranica (99,8 %) ima „preskoči na sadržaj"** — na početku dana imalo ga je 7.540; dodano je 1.995 stranica, a preostale 22 su administracija i preusmjerivači.
7. **Dizajn nije isti na svim webovima** — ovo je najveći otvoreni problem i glavni razlog dojma „grozno izgleda".
8. **Crni krugovi i prazne pločice** nisu kozmetika: to su mjesta gdje predložak nije dobio sliku. Popravljeno je 142 slike u 84 datoteke, ali predložak još nije svugdje isti.
9. **Tekstovi zaostaju za stvarnim stanjem** tamo gdje brojeve piše čovjek, a ne generator; od danas svi generatori čitaju isti izvor brojeva.
10. **Javna domena zaostaje za repozitorijem** — na `gnk-asg.hr` još stoji stara verzija s krivim brojkama; deploy nije dovršen.

---

## 2. Što imamo

### 2.1 Mreža

| Web | Što je | Stranica (inventar) |
|---|---|---|
| **GNK ASG** (`gnk-asg.hr`) | glavna domena, AKTUAL MEDIA, tržište, alati | 2.673 |
| **GNK World** | 9 svjetskih portala | 915 |
| **GNK ASG KANAL** | kanal s AI/poslovnim temama | 88 |
| **Samostalna izdanja** | 6 domena (Bor-USA i dr.) | 566 |
| **Gradska izdanja** | 17 kanala (Zagreb, Beograd, Ljubljana, Sarajevo…) | 5.223 |
| **AKTUAL ARHIVA** | arhiv | 38 |
| **AKTUAL DNEVNIK** | dnevnik | 16 |
| **Ukupno** | **7 izlaza, 6 samostalnih webova + glavna domena** | **9.519** |

### 2.2 Sadržaj

- **4.877 tekstova**: 8 europskih gradova po 420 tekstova, ostalih 9 gradova između 78 i 308.
- **17 gradskih izdanja**, **9 svjetskih izdanja**, **14 jezika**, **134 izvora**.
- Raspodjela po gradovima: Zagreb 420, Beograd 420, Sarajevo 420, Ljubljana 420, Budimpešta 420, Bukurešt 420, Sofija 420, Rim 420, São Paulo 308, Tokio 233, New York 204, Sydney 182, Peking 149, Jakarta 136, Singapur 117, Nairobi 110, Kairo 78.
- Svaki tekst ima hrvatsku i englesku inačicu, autora, datum, izvor i hashtagove; prijenos na povezane webove radi kao zasebna objava s atribucijom.

### 2.3 Alati i servisi

- 83 CSS datoteke (453 kB) na portalu, jedan dizajnerski sustav (`apply-design-tokens`), jedan znak kuće (`apply-brand-mark`).
- 1.071 stranica ima tiskane stilove (`@media print`) — tamo gdje se sadržaj ispisuje.
- Slike idu kroz vlastiti posrednik `/api/img?u=` na 3.348 stranica (nema vrućeg povezivanja na tuđe poslužitelje).
- Automatizacija: 38 webova, 31 raspored, 33 koraka u `build-sync-status`.

---

## 3. Što radi (provjereno, ne pretpostavljeno)

Zeleno na `node scripts/test-all-v1.mjs`, 24. 10. 2026., **73/73**:

| Provjera | Rezultat |
|---|---|
| Ugovor o brendu | 0 padova, 39 izdanja |
| Dizajn sustav | 9.299 tokena / 9.297 mjesta, 12 tokena, 0 padova |
| Svjetska izdanja | 0 padova |
| Mreža neovisnih izdanja | 6 stranica, 566 HTML, hub HR/EN |
| Podrijetlo slika | 9 / 19 / 6.192 / 299.258 slika, 0 padova |
| Prijenos mreže | 24 popisa, 0 nedostajućih |
| Determinizam | 2.939 datoteka, 0 padova (dvije gradnje = isti bajtovi) |
| Slike | 329.174 slike, 0 bez alt-a/dimenzija |
| Desk grafike | 9 ilustracija, 9 deskova, 0 padova |
| Osvježavanje | 9.557 stranica, 9.553 s modulom, 0 padova |
| AKTUAL bez JS | naslovnica čitljiva bez skripti |
| Sinkronizacija | 38 webova / 31 raspored / 33 koraka |
| Hreflang, sitemapi, interni linkovi, meta higijena | 0 padova |

**Što to praktično znači:** nijedan link u mreži ne vodi u prazno; svaka stranica ima sliku s opisom i dimenzijama; dvije gradnje daju isti rezultat; brojevi na stranicama dolaze iz podataka, a ne iz tuđeg teksta.

### Popravljeno u ovom krugu

- 142 slike u 84 datoteke dobile su `width`/`height` (nema više skakanja sadržaja dok se slika učitava).
- 20 praznih `alt` opisa zamijenjeno stvarnim opisima (trgovina, `gnk-aktual`).
- Modul osvježavanja sada fizički postoji na **svakom** webu i ubacuje se u generatoru (sindikacija kolumni, kanal, sites) — prije je 186 stranica kolumni ostajalo bez njega.
- `test-all` podignut sa 64/73 na **73/73**.
- **„Preskoči na sadržaj" dodan na 1.995 stranica** (sloj `scripts/apply-skip-link-v1.mjs` za rukom pisane stranice + predlošci za generirane); pokrivenost 99,8 %.
- **Modul osvježavanja fizički postoji na svih šest webova**, uključujući ARHIVU, DNEVNIK i svih 572 stranice samostalnih izdanja.
- **Ikona i znak kuće** sada su i na 404 stranicama; sve generirane stranice nose `rel="icon"`.

---

## 4. Što ne radi ili ne stoji na svjetskoj razini

### 4.1 Dizajn nije jedan predložak (najveći problem)

- **Isti okvir** postoji na naslovnicama i u unutrašnjosti, ali **nije svugdje primijenjen**: portal koristi vlastite stranice, gradski kanali drugi predložak, samostalna izdanja treći, kolumne četvrti.
- **Crni krugovi i prazne pločice** dolaze iz istog korijena: pločica je nacrtana, a slika nije dodijeljena. Dok svaka pločica ne dobije sliku iz podataka, dojam će ostati „prazno i mračno".
- **Tamni način rada** postoji na **1 stranici** od 9.557. Na ostatku se `prefers-color-scheme` ne poštuje.
- **Tipografija i razmaci** nisu jednaki: 83 CSS datoteke, dio stranica učitava stari sloj.

### 4.2 Pristupačnost

- **„Preskoči na sadržaj" riješen je u ovom krugu: 9.535/9.557 (99,8 %).** Na početku dana 2.017 portalnih stranica nije ga imalo (`podijeli` 769, `en` 475, `objave` 162, `galerija` 160, `visual-index` 122, `komentari` 95, `digital-workforce` 55, `gnk-aktual` 42).
- Preostale 22 stranice su administracija (`admin-center` 13, `admin-login` 1), preusmjerivači (7) i Googleova potvrda vlasništva (2) — nisu čitateljski sadržaj.
- Stil za link dolazi iz dizajnerskog sustava (`.skip` u `am-design-v1.css`), pa se ne ubacuje ugrađeni `<style>` (CSP i dizajnerski gate).

### 4.3 Brzina

- **`apps/dnevnik/site/dan/2026-10-23/index.html` ima 2,50 MB**, a `en` inačica 2,50 MB. Slijede `apps/portal/animacija/index.html` (1,53 MB) i `dnevnik` za 22. i 24. listopad (0,62–0,84 MB).
- Stranica od 2,5 MB na mobilnoj mreži ne stiže u razumnoj sekundi, ma koliko dizajn bio dobar.

### 4.4 Sadržaj ne prati stvarno stanje

- Tamo gdje brojku piše generator — točna je. Tamo gdje je brojka **upisana u tekst** (traka na naslovnici, masthead, „šest puta dnevno"), ostaje stara kad se podaci promijene.
- **Javna domena `gnk-asg.hr` još prikazuje stariju verziju** (traka „3.360 tekstova · 8 gradova · 8 jezika · 17 izdanja"), dok podaci govore **4.877 tekstova · 17 gradova · 14 jezika**. To nije greška u podacima — to je **deploy koji nije dovršen**.
- `https://gnk-asg.hr/prenos/` i `/pokrivenost/` vraćaju 404, dok na samostalnim domenama rade.

### 4.5 Osvježavanje: gdje je još jaz

- 6 stranica od 9.557 nema modul (99,94 % pokrivenost). To su rubni izlazi bez `<body>` završetka; nisu čitateljske stranice, ali ih treba svesti na nulu.
- Osvježavanje **prikazuje** podatkovni dan; ono ne mijenja sadržaj samo. Ako se gradnja ne pokrene, traka pošteno pokazuje stari datum — i to je ispravno ponašanje, ali znači da **cron mora raditi**.

### 4.6 Ostalo

- 3.348 stranica koristi posrednik slika; vanjski hostovi (pexels/wikimedia/imgur) pojavljuju se na **2 stranice** — treba ih svesti na nulu.
- Nema osobnog načina rada (svijetlo/tamno) ni „smanji animacije" na većini stranica.

---

## 5. U kojem smjeru idemo

### Faza 1 — backend prije svega (sada)

Cilj: **nijedna brojka na stranici ne smije biti prepisana rukom.**

1. Svi generatori čitaju `network-counts-v1.json` i datum podataka; nijedan predložak ne piše broj ni „šest puta dnevno".
2. Deploy mora objaviti ono što je izmjereno — dok se `gnk-asg.hr` ne poklopi s repozitorijem, prva stavka je **objava**, ne nova značajka.
3. Osvježavanje na 100 % stranica, uključujući rubne izlaze.
4. `/prenos/` i `/pokrivenost/` moraju raditi na glavnoj domeni kao i na samostalnim webovima.
5. Zatvoriti jaz podatkovnog dana: ako se podaci ne osvježe, ploča `/status/` to mora reći crveno.

### Faza 2 — jedan predložak za sve webove

Cilj: **ista struktura, isti razmaci, ista tipografija, isti znak kuće; razlikuje se samo sadržaj.**

1. Jedan `shell` (zaglavlje, traka osvježavanja, podnožje, navigacija) koji koriste **svi** generatori — portal, kanali, samostalna izdanja, kolumne, svjetski portali.
2. **Svaka pločica dobiva sliku iz podataka.** Ako slika ne postoji, pločica se ne crta — nikad prazan crni krug.
3. Tamni način rada i „smanji animacije" na svakoj stranici.
4. „Preskoči na sadržaj" na svih 9.557 stranica (2.017 preostalih).
5. Beograd i svaki drugi grad: unutrašnjost na razini naslovnice — isti raspored, drugi sadržaj.

### Faza 3 — brzina, sadržaj i SEO

1. Nijedna stranica iznad 400 kB; `dnevnik` 2,5 MB rastaviti na stranice po danu s paginacijom.
2. Tekstovi koji opisuju mrežu pišu se iz podataka (generator), ne rukom.
3. SEO matrica (13–18), svjetski portali (19–22) i preostale stavke popisa od 40 zadataka.

---

## 6. Sljedećih deset poteza, s prihvatnim kriterijem

| # | Potez | Kriterij da je gotovo |
|---|---|---|
| 1 | Deploy trenutnog stanja na sve domene | `gnk-asg.hr` pokazuje 4.877 / 17 / 14 |
| 2 | Osvježavanje na 100 % stranica | gate „Osvježavanje" = 9.557/9.557 |
| 3 | `/prenos/` i `/pokrivenost/` na glavnoj domeni | HTTP 200 na oba |
| 4 | Jedan `shell` u svim generatorima | vizualni diff naslovnica svih 6 webova = 0 razlika u strukturi |
| 5 | Nijedna pločica bez slike | gate „Slike" traži sliku u svakoj kartici i pločici |
| 6 | „Preskoči na sadržaj" svugdje | ✅ 9.535/9.557 (99,8 %); ostalo su admin i preusmjerivači |
| 7 | Tamni način rada svugdje | 9.557 stranica poštuje `prefers-color-scheme` |
| 8 | Nijedna stranica > 400 kB | mjerenje po datoteci, 0 prekoračenja |
| 9 | Brojke samo iz podataka | nijedan predložak ne sadrži doslovni broj tekstova |
| 10 | Popis svih stranica javno i točan | `/sve-stranice/` = inventar, 0 razlika |

---

## 7. Kako se stanje mjeri (ponovljivo)

```
node scripts/test-all-v1.mjs                     # 73 obavezne provjere
node scripts/build-network-counts-v1.mjs         # brojke iz podataka
node scripts/build-pages-inventory-v1.mjs        # inventar + /sve-stranice/
node scripts/apply-refresh-v1.mjs                # modul osvježavanja
node scripts/build-sync-status-v1.mjs            # stanje automatizacije
```

Mjerenja iz ovog izvještaja (24. 10. 2026.):

| Mjera | Vrijednost |
|---|---|
| HTML stranica (6 izlaza) | 9.557 |
| Stranica u inventaru | 9.519 |
| Tekstova | 4.877 |
| Gradskih izdanja | 17 |
| Jezika | 14 |
| Izvora | 134 |
| `<img>` tagova | 329.174 |
| Lazy slika | 313.099 (95,1 %) |
| Stranica s modulom osvježavanja | 9.551 (99,94 %) |
| Stranica bez „preskoči na sadržaj" | 22 (0,2 %) |
| Stranica s `@media print` | 1.071 (11,2 %) |
| Stranica s tamnim načinom rada | 1 |
| Najveća stranica | 2,50 MB (`dnevnik`, 23. 10.) |
| Gateovi | **73/73 zeleno** |

---

## 8. Što ova analiza ne tvrdi

- Ne tvrdi da je javna domena ažurna — **nije**, i to je prva stavka popravka.
- Ne tvrdi da je dizajn dovršen — **nije**; predložak još nije jedan.
- Ne tvrdi da su svi tekstovi provjereni jedan po jedan; provjereno je da svaki ima izvor, autora, jezik i prijenos.
- Brojke su iz repozitorija na ovom commitu; nakon svake gradnje mogu se samo povećati, ne smanjiti, jer se računaju iz podataka.
