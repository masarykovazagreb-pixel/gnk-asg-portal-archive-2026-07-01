# Trideset zadataka do savršenstva

Radni nalog. Redoslijed je obavezan: svaki zadatak završava zelenim
`node scripts/test-all-v1.mjs`, zapisom u ovom dokumentu i commitom.

Prvi zadatak (sinkronizacija i stabilnost) je temelj — bez njega ostalo ne
drži, jer se rezultat svakog sljedećeg koraka briše pri prvoj regeneraciji.

Legenda: ✅ gotovo · 🔄 u tijeku · ⬜ nije početo

---

## A. Stabilnost i sinkronizacija

### 1. ✅ Jedan popis koraka, jedan redoslijed
**Cilj:** redoslijed izgradnje ne živi u dvije kopije.
**Ishod:** `scripts/sync-all-v1.mjs` (18 generatora → 7 slojeva → 4 provjere),
workflow ga zove, `--check` i `--group=` rade.
**Provjera:** `tests/test-sync-pipeline-v1.mjs` — 29 koraka, redoslijed, bez
dvostrukih id-eva, workflow i popis se ne razilaze.

### 2. ⬜ Determinizam izlaza
**Cilj:** isti ulaz daje iste bajtove; nema vremenskih žigova koji se mijenjaju
između dvije gradnje.
**Ishod:** dvostruki build u dvije privremene mape daje identičan izlaz.
**Provjera:** `tests/test-build-determinism-v1.mjs`.

### 3. ⬜ Idempotentnost slojeva
**Cilj:** svaki `apply-*` dvaput zaredom ne mijenja ništa drugi put.
**Ishod:** nijedan sloj ne "šeta" datoteke između dva pokretanja.
**Provjera:** `tests/test-layer-idempotency-v1.mjs`.

### 4. ⬜ Workflow higijena
**Cilj:** svaki raspored ima najmanja dopuštenja, vremensko ograničenje i
concurrency.
**Ishod:** 31 raspored bez iznimke.
**Provjera:** `tests/test-workflow-hygiene-v1.mjs`.

### 5. ⬜ Cron bez kolizija
**Cilj:** dva posla koja pišu u iste putanje ne idu u istu minutu.
**Ishod:** tablica minuta po putanji; nijedan sudar.
**Provjera:** `tests/test-cron-collisions-v1.mjs`.

### 6. ⬜ Nadzorna ploča sinkronizacije
**Cilj:** stanje svih automatizacija vidljivo bez otvaranja Actionsa.
**Ishod:** `apps/portal/status/sync.json` + prikaz na `/status/`.
**Provjera:** gate da zapis postoji, da je svjež i da se slaže s workflowima.

---

## B. Mreža i razmjena

### 7. ⬜ Uzvratnost A↔B
**Cilj:** svaki web vodi na svaki drugi i to se vidi u izlazu.
**Ishod:** matrica 32×32 bez slijepe ulice.
**Provjera:** `tests/test-network-reciprocity-v1.mjs`.

### 8. ⬜ Najmanje 20 izlaznih veza po webu
**Cilj:** nijedan web nije otok.
**Provjera:** isti gate, prag po webu.

### 9. ⬜ `exchange.json` — schema i validator
**Cilj:** strojni zapis razmjene isti na svakom webu.
**Ishod:** schema v1 + validator na svih 32 weba.
**Provjera:** `tests/test-exchange-schema-v1.mjs`.

### 10. ⬜ Feedovi valjani
**Cilj:** RSS, Atom i JSON Feed parsiraju se i nose iste zapise.
**Provjera:** `tests/test-feeds-valid-v1.mjs`.

### 11. ⬜ Atribucija na svakoj kopiji
**Cilj:** svaki preneseni tekst ima izvor, autora, datum i canonical.
**Provjera:** `tests/test-attribution-v1.mjs`.

### 12. ⬜ Bez dvostrukog sadržaja bez atribucije
**Cilj:** isti naslov na dva weba znači preneseni tekst s izvorom.
**Provjera:** `tests/test-syndication-dup-v1.mjs`.

---

## C. SEO

### 13. ⬜ Tri ciljna upita, mjerljivo
**Cilj:** „gnk asg“, „aktual media“, „nermin sefić“ imaju mjerljive signale.
**Ishod:** `apps/portal/data/seo-targets-v1.json` + provjere po upitu.
**Provjera:** `tests/test-seo-targets-v1.mjs`.

### 14. ⬜ Meta higijena mreže
**Cilj:** bez duplikata, bez `#` i autora u keywords, duljine u granicama.
**Provjera:** `tests/test-meta-hygiene-v1.mjs`.

### 15. ⬜ Canonical i hreflang matrica
**Cilj:** svaki HR par ima EN par i obratno, canonical gleda na sebe.
**Provjera:** `tests/test-canonical-hreflang-v1.mjs`.

### 16. ⬜ Strukturirani podaci
**Cilj:** Organization, WebSite, NewsArticle, BreadcrumbList, FAQPage valjani.
**Provjera:** `tests/test-jsonld-v1.mjs`.

### 17. ⬜ Sitemap integritet
**Cilj:** svaka indeksabilna stranica u sitemapu, bez mrtvih URL-ova.
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
**Cilj:** kontrast, fokus, skip-link, landmark na svakoj stranici.
**Provjera:** `tests/test-a11y-matrix-v1.mjs`.

### 24. ⬜ Težina stranice
**Cilj:** HTML/CSS/JS u budžetu; slike s dimenzijama i lazy.
**Provjera:** `tests/test-weight-budget-v1.mjs`.

### 25. ⬜ Mobilna parnost
**Cilj:** viewport, tap targeti, bez horizontalnog skrola.
**Provjera:** `tests/test-mobile-parity-v1.mjs`.

### 26. ⬜ Tema i ispis
**Cilj:** tamna/svijetla tema i print stil na svakom webu.
**Provjera:** `tests/test-theme-print-v1.mjs`.

---

## F. Operacije i povjerenje

### 27. ⬜ Svježina kao SLA
**Cilj:** svaki web ima sadržaj mlađi od 24 h.
**Provjera:** `tests/test-freshness-sla-v1.mjs`.

### 28. ⬜ Registar izvora
**Cilj:** svaki izvor ima tip, URL i licencu; nijedan mrtav host.
**Provjera:** `tests/test-source-registry-v1.mjs`.

### 29. ⬜ Slike: alt, izvor, licenca
**Cilj:** nijedna slika bez podrijetla ni bez hotlinka.
**Provjera:** `tests/test-image-provenance-v1.mjs`.

### 30. ⬜ Watchdog koji popravlja
**Cilj:** dnevna provjera koja sama popravi sigurne klase kvarova.
**Ishod:** `scripts/watchdog-v1.mjs` + `docs/sinkronizacija-v1.md`.
**Provjera:** `tests/test-watchdog-v1.mjs`.
