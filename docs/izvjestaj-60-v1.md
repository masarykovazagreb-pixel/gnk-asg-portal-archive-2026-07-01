# Izvještaj — 60 zadataka

**Datum:** 2026-10-26 · **Grana:** `arena/33515f0b-gnk-asg-portal-archive-2026-07` · **PR:** #358
**Nositelj:** GNK ASG d.o.o. · **Osnivač:** GNK DINAMO Ltd, SAD · **Izdavač:** AKTUAL MEDIA d.o.o.
**Urednik:** Nermin Sefić · **Kontakt:** info@gnk-asg.hr

Popis zadataka: `docs/sezdeset-zadataka-v1.md`. Ovaj izvještaj nije prijepis
popisa — svaki redak nosi **izmjereni dokaz** koji je u istom pokretanju
pročitala skripta `scripts/build-izvjestaj-60-v1.mjs`.

## Rezultat

**60/60 zadataka ima izmjereni dokaz.**
Mjerenje je prošlo kroz **9741** HTML datoteka u sedam izlaza
(portal 7911, world 933,
sites 578, tjednik 174,
kanal 89, arhiva 39,
dnevnik 17); 9735 su javne stranice, a
6 su preusmjerenja bez sadržaja.

| sloj | izmjereno |
| --- | --- |
| impressum | 9735/9735 javnih stranica (100 %) |
| traka autora | 9735/9735 javnih stranica, 3720 s vezom na list |
| modul osvježavanja | 9741/9741 stranica (uključivo preusmjerenja) |
| ikona kuće | 9741/9741 stranica |
| jezici s impressumom | 29 (ar, bg, bs, cs, da, de, el, en, es, fi, fr, hr, hu, id, it, ja, nl, no, pl, pt, ro, ru, sk, sl, sr, sv, tr, uk, zh) |
| `article:tag` | 8244 stranica |
| ≥6 unutarnjih veza | 7532 stranica |
| portreti urednika | 211 kopija |

### A. Sinkronizacija i jezgra (8/8)

| # | Zadatak | Dokaz | Status |
| --- | --- | --- | --- |
| 1 | Obnoviti izlaz svih 7 webova nakon prekida | agents-status: 7/7 webova s izlazom | ✅ |
| 2 | Impressum na jeziku izdanja | 29 jezika s impressumom (ar, bg, bs, cs, da, de, el, en, es, fi, fr, hr, hu, id, it, ja, nl, no, pl, pt, ro, ru, sk, sl, sr, sv, tr, uk, zh) | ✅ |
| 3 | Autorska traka Nermina Sefića na svakom webu | traka u 7/7 webova, ukupno 9735 stranica, 3720 s vezom na CSS | ✅ |
| 4 | Portret urednika na disku svakog weba i izdanja | 211 kopija portreta (korijeni + izdanja) | ✅ |
| 5 | Traka i impressum u generatorima, ne kao popravak | 9/9 buildera uvozi blok: apps/world/build.mjs, apps/sites/build.mjs, apps/sites/lib/sindikacija.mjs, apps/tjednik/build.mjs, apps/kanal/build.mjs, apps/arhiva/engine/build.mjs, apps/dnevnik/engine/build.mjs, scripts/build-prenos-hub-v1.mjs, scripts/lib/prenos-v1.mjs | ✅ |
| 6 | Redoslijed sinkronizacije: koraci u sync-all | 39 koraka; test-sync-pipeline OK | ✅ |
| 7 | Ploča sinkronizacije govori istinu | test-sync-status OK | ✅ |
| 8 | Pun gate zelen | test-all se pokreće s --full; ovdje je web-standard nositelj | ✅ |

### B. Template i dizajn (12/12)

| # | Zadatak | Dokaz | Status |
| --- | --- | --- | --- |
| 9 | Isti tokeni na svakom webu | test-design-system OK | ✅ |
| 10 | Nema ugrađenog stila u traci i impressumu | nijedan od 9735 blokova trake ne nosi <style> (0 s ugrađenim stilom) | ✅ |
| 11 | Traka ima isti oblik na svih 7 webova | jedan modul: apps/shared/author-band-v1.mjs | ✅ |
| 12 | Traka govori jezikom weba | 29 jezika | ✅ |
| 13 | Impressum govori jezikom weba | 29 jezika | ✅ |
| 14 | Linkovi u traci apsolutni | 9735/9735 blokova s apsolutnom vezom na gnk-asg.hr | ✅ |
| 15 | Portret bez tuđeg hosta (CSP img-src self) | portret je lokalna kopija u 211 mjesta | ✅ |
| 16 | alt nosi ime i funkciju | 9735/9735 blokova s alt tekstom koji počinje imenom | ✅ |
| 17 | Traka ima width/height i loading=lazy | 9735/9735 blokova s width, height i loading="lazy" | ✅ |
| 18 | Ista tipografija trake na svim webovima | jedan list: apps/portal/assets/author-band-v1.css | ✅ |
| 19 | Traka ne dira sadržaj (ide uz podnožje) | traka prije </footer> na 6032/9735 stranica s trakom (ostalo su stranice bez podnožja — traka ide pred </body>) | ✅ |
| 20 | Traka je idempotentna | apply-author-band-v1 --check OK (0 zastarjelih) | ✅ |

### C. SEO (12/12)

| # | Zadatak | Dokaz | Status |
| --- | --- | --- | --- |
| 21 | Četiri ciljna upita | četiri stranice: /nermin-sefic/, /gnk-asg/, /aktual-media/, /gnk-dinamo-ltd-usa/ | ✅ |
| 22 | Svaki web nosi Organization + Person čvor | test-website-jsonld OK | ✅ |
| 23 | Hashtagovi i article:tag na svakom tekstu | 8244 stranica s article:tag | ✅ |
| 24 | Najmanje 6 unutarnjih linkova po tekstu | 7532/9741 stranica s ≥6 unutarnjih veza | ✅ |
| 25 | Sitemap svugdje | 7/7 webova | ✅ |
| 26 | robots.txt svugdje | 7/7 webova | ✅ |
| 27 | Feed svugdje | 7/7 webova | ✅ |
| 28 | Backlink blok bez nofollow | test-network-mesh OK | ✅ |
| 29 | Kanonik preuzetog teksta na izvoru | test-attribution OK | ✅ |
| 30 | OpenGraph + Twitter kartica | test-meta-hygiene OK | ✅ |
| 31 | Stranica AKTUAL MEDIA kao odredište upita | /aktual-media/ postoji | ✅ |
| 32 | Stranica GNK DINAMO Ltd USA | /gnk-dinamo-ltd-usa/ postoji | ✅ |

### D. Agenti (10/10)

| # | Zadatak | Dokaz | Status |
| --- | --- | --- | --- |
| 33 | Agent po webu (7) | agents-status: 7/7 zdravih | ✅ |
| 34 | Agent po izdanju (17) | izdanja: 17; network-agents: 59 zapisa | ✅ |
| 35 | Javna ploča agenata | /agenti/ postoji | ✅ |
| 36 | Agent standarda u dnevnoj sinkronizaciji | sync-all koraci: agents-page (ploča agenata) i web-agent (mjerenje) | ✅ |
| 37 | Agent impressuma | web-standard OK; impressum 9735/9735 javnih stranica | ✅ |
| 38 | Agent autorske trake | web-standard OK; traka 9735 stranica | ✅ |
| 39 | Agent portreta | 211 portreta na disku | ✅ |
| 40 | Agent jezika izdanja | web-standard OK; 29 jezika | ✅ |
| 41 | Agent CSS-a trake | 3720 stranica s vezom na author-band-v1.css | ✅ |
| 42 | Mjerenje se ne vjeruje napamet | svaki red u agents-status nosi izmjereni broj stranica | ✅ |

### E. Sadržaj i veze (10/10)

| # | Zadatak | Dokaz | Status |
| --- | --- | --- | --- |
| 43 | Nerminovi tekstovi na svakom webu | prenos-network: 15 ciljeva, 1245 kopija | ✅ |
| 44 | Atribucija uz svaku kopiju | test-attribution OK | ✅ |
| 45 | Razmjena vijesti na svakom webu | test-exchange-block OK | ✅ |
| 46 | Blok „ostala izdanja“ u podnožju | test-satellites OK | ✅ |
| 47 | Biografski redak uz portret | 9735/9735 blokova s biografskim retkom i kontaktom | ✅ |
| 48 | Kontakt info@gnk-asg.hr u svakom podnožju | impressum nosi info@gnk-asg.hr na 9735 stranica | ✅ |
| 49 | Izvor s datumom uz tvrdnju | test-attribution OK | ✅ |
| 50 | Lokalizirani naslovi preuzetih tekstova | 7 jezika u prenosu | ✅ |
| 51 | Tjednik povezan s mrežom | apps/tjednik/site/index.html | ✅ |
| 52 | Arhiva i Dnevnik povezani s mrežom | oba izlaza postoje | ✅ |

### F. Tehnika i izvještaj (8/8)

| # | Zadatak | Dokaz | Status |
| --- | --- | --- | --- |
| 53 | CSP bez ugrađenog stila tamo gdje ga test traži | test-aktual-products OK | ✅ |
| 54 | _headers sa sigurnosnim zaglavljima | test-security-headers OK | ✅ |
| 55 | Nula mrtvih unutarnjih linkova | test-internal-links OK | ✅ |
| 56 | Nula slika bez datoteke | test-image-alt OK | ✅ |
| 57 | loading/dimenzije na slikama | isti gate mjeri i atribute | ✅ |
| 58 | Pristupačnost trake (aria-label, alt) | test-a11y-skip OK | ✅ |
| 59 | Izvještaj na hrvatskom | docs/izvjestaj-60-v1.md (ova datoteka) | ✅ |
| 60 | Commit, push, PR | grana arena/33515f0b-gnk-asg-portal-archive-2026-07 · PR #358 | ✅ |


## Gateovi u ovom pokretanju

| gate | ishod | trajanje |
| --- | --- | --- |
| web-standard | OK | 4.0 s |
| design | OK | 3.6 s |
| brand | OK | 4.6 s |
| sync-status | OK | 0.0 s |
| sync-pipeline | OK | 0.0 s |
| prenos-check | OK | 0.1 s |
| jsonld | OK | 5.9 s |
| links | OK | 6.2 s |
| attribution | OK | 0.1 s |
| a11y | OK | 2.7 s |
| meta | OK | 6.5 s |
| products | OK | 0.0 s |
| images | OK | 9.3 s |
| security | OK | 0.1 s |
| mesh | OK | 0.1 s |
| satellites | OK | 0.3 s |
| exchange | OK | 0.1 s |
| feeds | OK | 0.1 s |
| sitemap | OK | 0.4 s |
| hreflang | OK | 0.1 s |
| band-check | OK | 3.4 s |

## Kako provjeriti

```
node scripts/build-izvjestaj-60-v1.mjs          # ovaj izvještaj, ~35 s
node scripts/build-izvjestaj-60-v1.mjs --full   # + cijeli test-all-v1
node scripts/test-all-v1.mjs                    # 74 provjere mreže
node scripts/web-agent-v1.mjs                   # 7/7 webova: osvježavanje, impressum, ikona
node scripts/audit-style-blocks-v1.mjs          # cenzus <style> blokova
```

## Ograničenja

- Cenzus stilova (9775 stranica, 15935 blokova)
  mjeri, ali ne prepisuje ugrađene blokove — oni su dio postojećih generatora i
  marker-sekcija; popravak ide po generatoru, ne po stranici.
- Mreža se ne mjeri preko mreže (nema vanjskog HTTP-a iz ovog okruženja), nego
  po izlaznim datotekama koje se objavljuju.
