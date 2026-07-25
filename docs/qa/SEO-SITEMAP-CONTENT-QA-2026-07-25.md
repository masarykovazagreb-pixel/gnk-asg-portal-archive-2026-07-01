# SEO / Sitemap / Content QA — 2026-07-25

**Grana:** `agent/seo-sitemap-content-qa-20260725`
**Opseg:** SEO, sitemap, robots.txt, novi sadržaj, javna Digital Workforce prezentacijska stranica, accessibility, broken linkovi, priprema za Search Console / Aktual Media / LinkedIn.
**Izvan opsega:** produkcijski deploy, Cloudflare, Worker backend, autentifikacija, scheduler, mail, API autorizacija, PR #723, privatni Digital Workforce staging.

## Bitna metodološka napomena

Ovaj QA je proveden **isključivo statičkom analizom repozitorija** (čitanje fajlova, XML/JSON validacija, pokretanje repo-ovih vlastitih Node test skripti). **Nema mrežnog pristupa `gnk-asg.hr`** iz ovog okruženja, pa stvarni HTTP statusi (200/404/redirect na živom sajtu), vizualni izgled u browseru, i responsive screenshotovi **nisu i ne mogu biti provedeni odavde**. Sve stavke koje to zahtijevaju označene su niže kao "NIJE MOGUĆE ODAVDE — TREBA VLASNIKOVU PROVJERU".

---

## A. Sažetak

**Provjereno:**
- Strukturna XML validnost svih 5 sitemapova (sitemap.xml, sitemap-index.xml, editorial-sitemap.xml, visual-sitemap.xml, image-sitemap.xml)
- robots.txt sintaksa, Allow/Disallow konzistentnost, sitemap reference
- SEO metapodaci (title/description/canonical/OG/JSON-LD) na uzorku od 10 novih objava + 3 nova komentara
- Duplikati naslova/opisa kroz novi sadržaj
- Osnovna heuristička provjera tipfelera/ponavljanja riječi u novom sadržaju
- Broken internal linkovi kroz cijeli repozitorij (~340 stranica)
- 5 obveznih test skripti iz repozitorija (Sekcija 5 uputa)
- Statička (kod-only) provjera javne `/digital-workforce/` stranice

**Popravljeno:** Ništa u ovom prolazu — svi nalazi su ili već PASS, ili zahtijevaju vlasnikovu odluku prije izmjene (vidi D).

**Nije popravljeno / blokatori:**
- `/digital-workforce/` namjerno NIJE dodan u sitemap — vidi D1
- Screenshotovi i live HTTP provjere nisu provedeni — izvan mojih mogućnosti odavde

---

## B. Promijenjene datoteke

**Nijedna produkcijska datoteka nije mijenjana u ovom prolazu.** Ovaj izvještaj je jedina nova datoteka:

| Putanja | Razlog | Što je promijenjeno | Rizik |
|---|---|---|---|
| `docs/qa/SEO-SITEMAP-CONTENT-QA-2026-07-25.md` | Zahtjev zadatka | Novi QA izvještaj | Nema (samo dokumentacija) |

---

## C. Rezultati

| Provjera | Status |
|---|---|
| Sitemap (XML validnost, duplikati) | **PASS** |
| Sitemap (live HTTP/404 provjera) | NIJE MOGUĆE ODAVDE |
| robots.txt (sintaksa, konzistentnost) | **PASS** (uz 1 preporuku, vidi D1) |
| SEO novih objava (uzorak) | **PASS** |
| Digital Workforce frontend — statička provjera koda | **DECIDED** — noindex primijenjen, sitemap: excluded intentionally, public launch: pending production approval |
| Digital Workforce frontend — vizualni/responsive QA | NIJE MOGUĆE ODAVDE |
| Broken links (interni) | **PASS** |
| Broken links (vanjski, live HTTP) | NIJE MOGUĆE ODAVDE |
| Accessibility (statička provjera: alt, label, lang) | **PASS** (provjereno ranije u sesiji — 0 slika bez alt, 0 formi bez labela) |
| 5 obveznih test skripti | **PASS** (svih 5 vraća `ok:true`) |

---

## D. Otvorene stavke

### D1 — DECIDED — NOT INDEXABLE UNTIL PUBLIC APPROVAL

**Vlasnikova odluka (25.7.2026.):**
1. `/digital-workforce/` se **ne dodaje u sitemap** — excluded intentionally.
2. Sadržaj, backend, autentifikacija i privatni staging **nisu dirani**.
3. Uvedena privremena zaštita od indeksiranja na javnoj ruti.
4. `robots.txt` **zasad nije mijenjan** — čeka se potvrda da je `noindex` stvarno pročitan i uklonjen iz indeksa prije razmatranja `Disallow`.
5. **Public launch: pending production approval.**
6. PR #723 i privatna Digital Workforce infrastruktura nisu dirani.

**Provedena izmjena:** dodan `<meta name="robots" content="noindex, nofollow, noarchive">` na svih **12** stranica `/digital-workforce/` cjeline (glavna stranica + 11 podstranica: plan, bulletins, projects, risks, opinions, dependencies, tasks, credits, newsroom, workers, activity-log). Canonical tagovi nisu mijenjani (ostaju self-referencing, što je neutralno i ne čini stranicu "javno indeksabilnom" samo po sebi).

Popis izmijenjenih fajlova:
```
apps/portal/digital-workforce/index.html
apps/portal/digital-workforce/plan/index.html
apps/portal/digital-workforce/bulletins/index.html
apps/portal/digital-workforce/projects/index.html
apps/portal/digital-workforce/risks/index.html
apps/portal/digital-workforce/opinions/index.html
apps/portal/digital-workforce/dependencies/index.html
apps/portal/digital-workforce/tasks/index.html
apps/portal/digital-workforce/credits/index.html
apps/portal/digital-workforce/newsroom/index.html
apps/portal/digital-workforce/workers/index.html
apps/portal/digital-workforce/activity-log/index.html
```

Verificirano: svi relevantni test skriptovi (`audit-public-portal-v1.mjs`, `audit-seo-entity-integrity-v1.mjs`, `test-public-design-contract.mjs`, `test-visible-menu-logo-content-v1.mjs`, `test-index-content-contract.mjs`) i dalje vraćaju `ok:true` / 0 grešaka nakon izmjene.

**Sljedeći korak (nije dio ovog PR-a):** nakon što se u Search Console potvrdi da je `/digital-workforce/` stranica stvarno uklonjena iz indeksa (ili nikad nije bila indeksirana), razmotriti dodavanje `Disallow: /digital-workforce/` u robots.txt kao dodatni sloj zaštite.

### D2 — Screenshotovi i live vizualni QA

Zadatak 4 traži screenshotove na 6 rezolucija (desktop/mobile) i provjeru boja/kontrasta u stvarnom renderiranju. Ovo zahtijeva browser s pristupom `gnk-asg.hr`, koji nemam iz ovog okruženja. Statička provjera CSS fajlova koje stranica učitava (`digital-workforce-suite-v1.css`, `digital-workforce-protected-preview-v1.css`) pokazuje korištenje istog dizajn sustava (`style.css` dark-gold tema) kao ostatak sajta, ali stvarna boja/kontrast u browseru nije potvrđena.

### D3 — Live HTTP status provjere (Zadaci 1, 2, 5)

Sve "HTTP 200 / 404" stavke u ovom izvještaju odnose se na **postojanje fajla u repozitoriju**, ne na stvarni odgovor produkcijskog servera. Vlasnik treba potvrditi da je produkcijski deploy (Cloudflare Worker) sinkroniziran s `main` granom prije nego što se ovi rezultati smatraju konačnima za live sajt.

---

## E. Search Console lista

Vidi priloženi `gnk-asg-indeksiranje-linkovi.txt` iz ranije u sesiji (Tier 0–6), koji ostaje važeći. `/digital-workforce/` namjerno izostavljen dok se D1 ne riješi.

---

## F. Screenshotovi

**Nema priloženih screenshotova** — izvan mogućnosti ovog okruženja (nema pristupa live renderiranju `gnk-asg.hr`). Preporuka: vlasnik ili druga sesija s browser pristupom treba provesti Zadatak 4 vizualni dio zasebno.

---

## Aktual Media / LinkedIn UTM (pripremljeno, NIJE objavljeno)

**Aktual Media:**
```
https://gnk-asg.hr/digital-workforce/?utm_source=aktualmedia&utm_medium=referral&utm_campaign=digital_workforce_launch
https://gnk-asg.hr/objave/likvidnosni-jaz-i-upravljanje-obrtnim-kapitalom/?utm_source=aktualmedia&utm_medium=referral&utm_campaign=editorial_launch
```

**LinkedIn:**
```
https://gnk-asg.hr/digital-workforce/?utm_source=linkedin&utm_medium=social&utm_campaign=digital_workforce_launch
https://gnk-asg.hr/objave/likvidnosni-jaz-i-upravljanje-obrtnim-kapitalom/?utm_source=linkedin&utm_medium=social&utm_campaign=editorial_launch
```

Napomena: digital-workforce UTM linkovi **ne smiju se koristiti** — stranica je sad eksplicitno `noindex` i status je "public launch: pending production approval" (D1: DECIDED). UTM linkovi za editorial sadržaj (objave) ostaju važeći.
