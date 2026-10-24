# Četrdeset zadataka do savršenstva

Radni nalog. Redoslijed je obavezan: svaki zadatak završava zelenim
`node scripts/test-all-v1.mjs`, zapisom u ovom dokumentu i commitom.

Ovaj dokument zamjenjuje `docs/trideset-zadataka-v1.md` i nastavlja ga: prvih
dvanaest zadataka je isti posao (stabilnost i mreža), a onda se popis širi na
četrdeset — SEO do kraja, svijet, dizajn, operacije, i deset zadataka koji u
tridesetorici nisu postojali, a u projektu nedostaju: agenti, radio, tjednik,
parnost objavljenog i izgrađenog, brojke koje se ne razilaze, jezična parnost,
pretraga, stranice povjerenja, težina i performanse, te operativna knjiga.

Legenda: ✅ gotovo · 🔄 u tijeku · ⬜ nije početo

---

## A. Stabilnost i sinkronizacija

### 1. ✅ Jedan popis koraka, jedan redoslijed
**Cilj:** redoslijed izgradnje ne živi u dvije kopije.
**Ishod:** `scripts/sync-all-v1.mjs` (generatori → slojevi → provjere), workflow
ga zove, `--check`, `--group=` i `--only=` rade.
**Provjera:** `tests/test-sync-pipeline-v1.mjs`.

### 2. ✅ Determinizam izlaza
**Cilj:** isti ulaz daje iste bajtove; nema vremenskih žigova iz sata.
**Provjera:** `tests/test-build-determinism-v1.mjs` — 3 weba, 2 939 datoteka,
0 razlika.

### 3. ✅ Idempotentnost slojeva
**Cilj:** svaki `apply-*` dvaput zaredom ne mijenja ništa drugi put.
**Provjera:** `tests/test-layer-idempotency-v1.mjs` — 5 slojeva, 0 promjena.

### 4. ✅ Workflow higijena
**Cilj:** svaki raspored ima najmanja dopuštenja, `timeout-minutes` i
`concurrency`.
**Provjera:** `tests/test-workflow-hygiene-v1.mjs` — 337 provjera, 0 padova;
`::add-mask::` je jedina dopuštena iznimka.

### 5. ✅ Cron bez kolizija
**Cilj:** dva posla koja pišu u iste putanje ne idu u istu minutu.
**Provjera:** `tests/test-cron-collisions-v1.mjs` — 14 parova, 0 sudara.

### 6. ✅ Nadzorna ploča sinkronizacije
**Cilj:** stanje svih automatizacija vidljivo bez otvaranja Actionsa.
**Ishod:** `apps/portal/status/sync.json` + `/status/sinkronizacija/`.
**Provjera:** `tests/test-sync-status-v1.mjs` — 30 koraka, 31 raspored,
36 putanja.

---

## B. Mreža i razmjena

### 7. ✅ Uzvratnost A↔B
**Cilj:** svaki web vodi na svaki drugi i to se vidi u izlazu.
**Provjera:** `tests/test-network-reciprocity-v1.mjs` — 35 webova, 1 172 para,
1 172 uzvratna.

### 8. ✅ Najmanje 20 izlaznih veza po webu
**Cilj:** nijedan web nije otok.
**Provjera:** isti gate, prag po webu.

### 9. ✅ `exchange.json` — schema i validator
**Cilj:** strojni zapis razmjene isti na svakom webu.
**Ishod:** ugovor v1 (`version`, `generated`, `note`, `items[]` s
`edition/home/url/title/lang/published`).
**Provjera:** `tests/test-exchange-schema-v1.mjs` — 33 zapisa, 396 stavki.

### 10. ✅ Feedovi valjani
**Cilj:** RSS, Atom i JSON Feed parsiraju se i nose iste zapise.
**Provjera:** `tests/test-feeds-valid-v1.mjs` — 34 weba.

### 11. ✅ Atribucija na svakoj kopiji
**Cilj:** svaki preneseni tekst ima izvor, autora, datum i canonical.
**Provjera:** `tests/test-attribution-v1.mjs` — 492 stranice.

### 12. ✅ Bez dvostrukog sadržaja bez atribucije
**Cilj:** ista kanonska adresa ne postoji dvaput na istom webu.
**Provjera:** `tests/test-no-duplicate-content-v1.mjs` — 566 stranica,
492 kopije.

---

## C. SEO

### 13. ⬜ Tri ciljna upita, mjerljivo
**Cilj:** „gnk asg“, „aktual media“ i „nermin sefić“ imaju mjerljive signale na
svakom webu mreže, ne samo na portalu.
**Ishod:** `apps/portal/data/seo-targets-v1.json` (koji web, koji upit, gdje se
pojavljuje: naslov, opis, tijelo, sidro) + generator koji ga mjeri iz izlaza.
**Provjera:** `tests/test-seo-targets-v1.mjs` — pragovi po upitu.

### 14. ⬜ Meta higijena mreže
**Cilj:** bez duplikata, bez `#` i autora u `keywords`, duljine u granicama
(izdanja 80–320, portali 41–160), `article:tag` uz hashtagove.
**Provjera:** `tests/test-meta-hygiene-v1.mjs`.

### 15. ⬜ Canonical i hreflang matrica
**Cilj:** svaki HR par ima EN par i obratno; canonical gleda na sebe, kopija na
izvornik; `hreflang` ima `x-default`.
**Provjera:** `tests/test-canonical-hreflang-v1.mjs`.

### 16. ⬜ Strukturirani podaci
**Cilj:** Organization, WebSite, NewsArticle, BreadcrumbList i FAQPage valjani;
nijedan čvor nije prazan.
**Provjera:** `tests/test-jsonld-v1.mjs`.

### 17. ⬜ Sitemap integritet
**Cilj:** svaka indeksabilna stranica u sitemapu, bez mrtvih URL-ova i bez
`noindex` unutar sitemapa.
**Provjera:** `tests/test-sitemap-integrity-v1.mjs`.

### 18. ⬜ Tri klika do svake stranice
**Cilj:** nijedna stranica nije siroče.
**Provjera:** `tests/test-link-depth-v1.mjs`.

---

## D. Svijet

### 19. ⬜ Svih 195 država
**Cilj:** atlas pokriva svaku državu, s izdanjem ili bez.
**Provjera:** `tests/test-countries-195-v1.mjs`.

### 20. ⬜ Pokrivenost za zemlje bez izdanja
**Cilj:** svaka država ima stranicu s izvorima.
**Provjera:** isti gate.

### 21. ⬜ Prijestolnice i izdanja
**Cilj:** svaka država → glavni grad → izdanje ili pokrivenost.
**Provjera:** isti gate.

### 22. ⬜ Izjava GNK DINAMO Ltd grupa
**Cilj:** ista rečenica na svakom webu, bez objašnjenja vlasništva.
**Provjera:** `tests/test-dinamo-statement-v1.mjs`.

---

## E. Dizajn i pristupačnost

### 23. ⬜ Pristupačnost
**Cilj:** kontrast, fokus, skip-link, landmark, jedan `h1` i alt na svakoj
javnoj stranici.
**Provjera:** `tests/test-a11y-matrix-v1.mjs`.

### 24. ⬜ Težina stranice
**Cilj:** HTML/CSS/JS u budžetu; slike s dimenzijama i `loading="lazy"`.
**Provjera:** `tests/test-weight-budget-v1.mjs`.

### 25. ⬜ Mobilna parnost
**Cilj:** viewport, tap targeti ≥ 44 px, bez horizontalnog skrola, bez fiksnih
širina preko `100vw`.
**Provjera:** `tests/test-mobile-parity-v1.mjs`.

### 26. ⬜ Tema i ispis
**Cilj:** tamna i svijetla tema (`prefers-color-scheme`) i print stil na svakom
webu.
**Provjera:** `tests/test-theme-print-v1.mjs`.

---

## F. Operacije i povjerenje

### 27. ⬜ Svježina kao SLA
**Cilj:** svaki web ima sadržaj mlađi od 24 h u odnosu na zadnji podatkovni dan.
**Provjera:** `tests/test-freshness-sla-v1.mjs`.

### 28. ⬜ Registar izvora
**Cilj:** svaki izvor ima tip, URL i licencu; nijedan mrtav host ni `http://`.
**Provjera:** `tests/test-source-registry-v1.mjs`.

### 29. ⬜ Slike: alt, izvor, licenca
**Cilj:** nijedna slika bez podrijetla, bez dimenzija ni bez `alt`; nema
hotlinka na tuđe hostove.
**Provjera:** `tests/test-image-provenance-v1.mjs`.

### 30. ⬜ Watchdog koji popravlja
**Cilj:** dnevna provjera koja sama popravi sigurne klase kvarova (ploča,
razmjena, feedovi, sitemap), s `--check` i `--fix`.
**Ishod:** `scripts/watchdog-v1.mjs` + `docs/sinkronizacija-v1.md`.
**Provjera:** `tests/test-watchdog-v1.mjs`.

---

## G. Novi zadaci (31–40)

### 31. ⬜ Registar agenata
**Cilj:** svaki agent i automat ima vlasnika, raspored, dopuštenja, prekidač i
zapis zadnjeg uspjeha — na jednom mjestu.
**Ishod:** `ops/agents-registry-v1.json` + `scripts/build-agents-registry-v1.mjs`.
**Provjera:** `tests/test-agent-registry-v1.mjs` — svaki raspored ima agenta,
svaki agent vlasnika i kill-switch.

### 32. ⬜ Radio kao proizvod
**Cilj:** `/radio/` je stvarna stranica: program po satima, trajanje, izvori,
feed, i veza na svaki grad koji ga emitira.
**Provjera:** `tests/test-radio-v1.mjs`.

### 33. ⬜ Tjednik: brojevi se ne ponavljaju
**Cilj:** svaki broj tjednika ima jedinstven redni broj, datum i arhivski
zapis; nijedan broj ne nedostaje u nizu.
**Provjera:** `tests/test-weekly-issues-v1.mjs`.

### 34. ⬜ Objavljeno je izgrađeno
**Cilj:** nijedna datoteka u objavljenom stablu nije zaostatak: svaki HTML ima
zapis u izvještaju gradnje, a nijedna uklonjena ruta ne visi.
**Provjera:** `tests/test-deploy-parity-v1.mjs`.

### 35. ⬜ Brojke se ne razilaze
**Cilj:** isti broj tekstova, gradova, jezika i izdanja na svakoj stranici koja
ga navodi — jedan izvor brojeva.
**Ishod:** `apps/portal/data/network-counts-v1.json` + gate.
**Provjera:** `tests/test-counts-consistency-v1.mjs`.

### 36. ⬜ Jezična parnost
**Cilj:** svaka HR stranica izdanja ima EN par, chrome govori 14 jezika, i
nijedan jezik nije pola preveden.
**Provjera:** `tests/test-language-parity-v1.mjs`.

### 37. ⬜ Pretraga bez servera
**Cilj:** statični indeks pokriva sve objave, ima budžet i radi iz datoteke.
**Provjera:** `tests/test-search-index-v1.mjs`.

### 38. ⬜ Stranice povjerenja
**Cilj:** impressum, kontakt, privatnost, ispravci i napomena o AI na svakom
webu, s istim podacima izdavača.
**Provjera:** `tests/test-trust-pages-v1.mjs`.

### 39. ⬜ Performanse i treće strane
**Cilj:** nijedan blokirajući skript treće strane, nijedan vanjski font, slike u
`webp`/`avif`, `preconnect` samo prema vlastitim hostovima.
**Provjera:** `tests/test-performance-v1.mjs`.

### 40. ⬜ Operativna knjiga
**Cilj:** jedan dokument s naredbama, redoslijedom i vraćanjem unatrag; svaka
naredba iz knjige postoji i `--help` joj radi.
**Ishod:** `docs/operacija-v1.md`.
**Provjera:** `tests/test-runbook-v1.mjs`.
