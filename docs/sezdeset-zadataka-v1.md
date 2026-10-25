# Šezdeset zadataka — AKTUAL MEDIA mreža

**Naredba:** „zadaj si 60 zadataka i sve ih rješavaj redom."
**Datum:** 25. listopada 2026.
**Grana:** `arena/33515f0b-gnk-asg-portal-archive-2026-07`
**Nositelj:** GNK ASG d.o.o. · **Osnivač:** GNK DINAMO Ltd, SAD · **Izdavač:** AKTUAL MEDIA d.o.o. · **Urednik:** Nermin Sefić · **Kontakt:** info@gnk-asg.hr

Pravilo: zadatak je gotov kad ga **mjeri skripta**, ne kad je napisan. Dokaz je uz svaki redak; konačni rezultat je u `docs/izvjestaj-60-v1.md`.

## A. Sinkronizacija i jezgra (1–8)

| # | Zadatak | Dokaz |
|---|---|---|
| 1 | Obnoviti izlaz svih 7 webova nakon prekida | 7 buildova exit 0 |
| 2 | Impressum na jeziku izdanja (14 jezika) | `test-web-standard` bez hrvatskog okvira na 13 nehrvatskih izdanja |
| 3 | Autorska traka Nermina Sefića na svakom webu | traka 7/7 + 17/17 izdanja |
| 4 | Portret urednika na disku svakog weba i izdanja | `assets/people/nermin-sefic.webp` |
| 5 | Traka i impressum u generatorima, ne kao popravak | `grep` u 8 buildera |
| 6 | Redoslijed sinkronizacije: koraci u `sync-all` | `test-sync-pipeline` |
| 7 | Ploča sinkronizacije govori istinu | `test-sync-status` |
| 8 | Pun gate zelen | `test-all` |

## B. Template i dizajn (9–20)

| # | Zadatak | Dokaz |
|---|---|---|
| 9 | Isti tokeni na svakom webu | `designTokensFile()` u svim listovima |
| 10 | Nema ugrađenog `<style>` u traci i impressumu | CSS u vanjskim listovima |
| 11 | Traka ima isti oblik na svih 7 webova i 17 izdanja | jedan modul `author-band-v1.mjs` |
| 12 | Traka govori jezikom weba | 14 jezika u `COPY` |
| 13 | Impressum govori jezikom weba | 14 jezika u `WORDS` |
| 14 | Linkovi u traci apsolutni (rade s poddomena) | `https://gnk-asg.hr/…` |
| 15 | Portret bez tuđeg hosta (CSP `img-src 'self'`) | kopija u svakom izlazu |
| 16 | `alt` nosi ime i funkciju | `alt="Nermin Sefić, …"` |
| 17 | Traka ima `width`/`height` i `loading="lazy"` | gate |
| 18 | Ista tipografija trake na svim webovima | `AUTHOR_BAND_CSS` |
| 19 | Traka ne dira sadržaj (ide uz podnožje) | umetanje prije `</footer>` |
| 20 | Traka je idempotentna | `--check` daje 0 zastarjelih |

## C. SEO (21–32)

| # | Zadatak | Dokaz |
|---|---|---|
| 21 | Četiri ciljna upita | `nermin sefić`, `gnk asg`, `aktual media`, `gnk dinamo ltd usa` |
| 22 | Svaki web nosi `Organization` + `Person` čvor | `test-website-jsonld` |
| 23 | Hashtagovi i `article:tag` na svakom tekstu | `test-hashtags` |
| 24 | Najmanje 6 unutarnjih linkova po tekstu | gate |
| 25 | Sitemap svugdje | 7/7 |
| 26 | `robots.txt` svugdje | 7/7 |
| 27 | Feed svugdje | 7/7 |
| 28 | Backlink blok bez `nofollow` | `test-network-mesh` |
| 29 | Kanonik preuzetog teksta na izvoru | `test-attribution` |
| 30 | OpenGraph + Twitter kartica | gate |
| 31 | Stranica `AKTUAL MEDIA` kao odredište upita | `/aktual-media/` |
| 32 | Stranica `GNK DINAMO Ltd USA` | `/gnk-dinamo-ltd-usa/` |

## D. Agenti (33–42)

| # | Zadatak | Dokaz |
|---|---|---|
| 33 | Agent po webu (7) | `ops/network-agents-v1.json` |
| 34 | Agent po izdanju (17) | 17 zapisa |
| 35 | Javna ploča agenata | `/agenti/` |
| 36 | Agent standarda u dnevnoj sinkronizaciji | `sync-all` korak `web-agents` |
| 37 | Agent impressuma | `tests/test-web-standard-v1.mjs` |
| 38 | Agent autorske trake | isti gate |
| 39 | Agent portreta | isti gate |
| 40 | Agent jezika izdanja | isti gate |
| 41 | Agent CSS-a trake | isti gate |
| 42 | Mjerenje se ne vjeruje napamet | gate ponovno pokreće mjerenje |

## E. Sadržaj i veze (43–52)

| # | Zadatak | Dokaz |
|---|---|---|
| 43 | Nerminovi tekstovi na svakom webu | `prenos-network-v1.json` |
| 44 | Atribucija uz svaku kopiju | `test-attribution` |
| 45 | Razmjena vijesti na svakom webu | `exchange.json` |
| 46 | Blok „ostala izdanja" u podnožju | gate |
| 47 | Biografski redak uz portret | traka |
| 48 | Kontakt `info@gnk-asg.hr` u svakom podnožju | gate |
| 49 | Izvor s datumom uz tvrdnju | `test-attribution` |
| 50 | Lokalizirani naslovi preuzetih tekstova | `test-prenos` |
| 51 | Tjednik povezan s mrežom | `test-tjednik` |
| 52 | Arhiva i Dnevnik povezani s mrežom | `test-satellites` |

## F. Tehnika i izvještaj (53–60)

| # | Zadatak | Dokaz |
|---|---|---|
| 53 | CSP bez ugrađenog stila tamo gdje ga test traži | `test-aktual-products` |
| 54 | `_headers` sa sigurnosnim zaglavljima | 7/7 |
| 55 | Nula mrtvih unutarnjih linkova | `test-links` |
| 56 | Nula slika bez datoteke | `test-image-alt` |
| 57 | `loading`/dimenzije na slikama | gate |
| 58 | Pristupačnost trake (`aria-label`, `alt`) | gate |
| 59 | Izvještaj na hrvatskom | `docs/izvjestaj-60-v1.md` |
| 60 | Commit, push, PR | `git log`, PR #358 |

---

## Stanje

Popunjava se dok zadaci padaju; konačni dokazi su u `docs/izvjestaj-60-v1.md`.
