# Atlas mreže — grafika, paukova mreža i glavni gradovi

Tri stvari koje ovaj dokument objašnjava postoje zato što su se prije vodile
rukom, na svakoj stranici zasebno: **naslovna grafika izdanja**, **prikaz
mreže** i **popis zemalja koje pokrivamo**. Od 23. 10. 2026. sve tri imaju
jedan izvor i jedan test.

---

## 1. Atlas grafika — jedna familija, deset ilustracija

**Zašto ilustracije, a ne fotografije:** regionalna izdanja imaju stvarne
fotografije gradova (Zagreb, Beograd, Sarajevo…). Za devet svjetskih izdanja
nije bilo slobodne fotografije pod istom licencijom, pa su dosad imala samo
apstraktne plohe bez grada. Atlas to mijenja: svako izdanje dobiva
**ilustraciju** svog grada u paleti izdanja, u istoj familiji — noćni grad,
zlatna svjetla prozora, meridijani u pozadini.

Pravila koja se ne mijenjaju:

| Pravilo | Zašto |
| --- | --- |
| U slici nema teksta | Ime izdanja mora biti čitljivo tražilici i čitaču ekrana; tekst u rasteru to ne može. |
| Alt nikad nije prazan | Slika nosi značenje, nije dekoracija. |
| Alt kaže da je ilustracija | Nikad se ne tvrdi da je fotografija stvarnog grada. |
| Alt je na jeziku izdanja | Japansko izdanje ima japanski opis (`chrome.artAlt`), ne engleski. |
| Iste veličine svugdje | Kartica, hero i OG slika ne smiju se razmazati. |

### Veličine (ugovor)

| Veličina | Dimenzije | Gdje se koristi |
| --- | --- | --- |
| `-240.webp` | 240×160 | mini traka izdanja |
| `-440.webp` | 440×248 | kartice na `/izdanja/`, `/mreza/`, `/kanal/` |
| `-480.webp` | 480×270 | uske kolone |
| `-800.webp` | 800×450 | `srcset` |
| `-880.webp` | 880×587 | pločice s tekstom (`tiles.mjs`) |
| `-1200.webp` | 1200×675 | naslovnica izdanja i OG izvor |
| `-1600.webp` | 1600×900 | hero na portalu |
| `-og.jpg` | 1200×630 | Open Graph / Twitter |

### Kako se gradi

```bash
# 1. izvor (1600 px) stoji u assets/atlas/src/<slug>.webp
node scripts/build-atlas-art-v1.mjs              # svih deset grafika + manifest
node scripts/build-atlas-art-v1.mjs --only tokio
node scripts/build-atlas-art-v1.mjs --check      # provjera bez pisanja

# 2. preslikavanje u mape koje traže pločice, OG oznake i sitemap slika
node scripts/apply-atlas-art-v1.mjs              # devet svjetskih izdanja
node scripts/apply-atlas-art-v1.mjs --check

# 3. pločice s tekstom (880×587 + 192)
node apps/region/engine/tiles.mjs --only tokio
```

Manifest je `apps/portal/data/atlas-art-v1.json`: slug, naslov, alt na
hrvatskom i engleskom, napomena, putanje, dimenzije i veličina datoteke.
Stranice **ne sastavljaju putanju same** — čitaju manifest, pa se ime datoteke
mijenja na jednom mjestu.

`apply-atlas-art-v1.mjs` prekida rad ako se dimenzija iz manifesta ne slaže s
ugovorom. Bolje bez zamjene nego s razmazanom naslovnicom.

---

## 2. Paukova mreža — sve adrese na jednoj slici

Modul: `apps/satellites/lib/spiderweb-v1.mjs` (`spiderWeb`, `SPIDER_CSS`,
`SPIDER_JS`).

### Što crta

| Prsten | Sadržaj | Broj |
| --- | --- | --- |
| matica | AKTUAL MEDIA (`/gnk-aktual/`) | 1 |
| 1. prsten | gradska izdanja (`/kanal/<grad>/`) | 17 |
| 2. prsten | svjetski portali (`gnk-world-<grad>.pages.dev`) | 9 |
| 3. prsten | samostalne stranice (`bor-usa`, `kosarka`…) | 6 |

Ukupno **32 adrese**. Sve dolaze iz `apps/region/channels.json`, `apps/world/lib/registry.mjs`
i `apps/sites/lib/registry.mjs` — iz istih popisa iz kojih se grade stranice,
pa u grafiku ne može ući adresa koja ne postoji.

### Pravila

- **Svaki čvor je pravi `<a href>`** — mreža je link koji tražilica vidi, ne slika.
- **Niti su `<path>` s `data-a`/`data-b`** — osvjetljavanje radi skripta, a bez
  nje mreža i dalje radi (linkovi i fokus).
- **Nema vanjskog skripta ni fonta** — radi s CSP-om `script-src 'self'`.
- **`role="img"` + `<title>` + `<desc>`** — čitač ekrana dobiva isti opis kao
  čitatelj.
- **Ispod grafike je i tekstualni popis** svih adresa; mreža nikad ne ovisi o
  tome je li se SVG učitao.
- **Oznaka „· portal"** stoji samo na drugom prstenu: isti grad ima i izdanje i
  portal, pa bi bez oznake čitatelj vidio dvostruko ime i pomislio na pogrešku.
- **Natpisi se ne preklapaju i ne izlaze iz platna** — test to mjeri po rasponu
  pisma (latinica, arapski, CJK imaju različite širine).

### Gdje se pojavljuje

| Stranica | Inačica |
| --- | --- |
| `/mreza/`, `/en/network/` | puna (grafika + tri popisa) |
| `/izdanja/` | puna, u sekciji „Sve adrese na jednoj slici" |
| `/glavni-gradovi/`, `/en/capitals/` | puna |
| `/kanal/<grad>/` (17) | kompaktna + link na `/kanal/<grad>/mreza/` |
| `/kanal/<grad>/mreza/` (17) | puna, na jeziku izdanja |
| `gnk-world-<grad>.pages.dev` (9) | puna, na jeziku portala |

Ukupno **48 stranica**.

---

## 3. Glavni gradovi — pravilo, ne popis želja

Popis: `apps/region/capitals.json`. Stranice: `/glavni-gradovi/` i
`/en/capitals/`. Strojni oblik: `apps/portal/data/glavni-gradovi-v1.json`.

**Pravilo:** zemlja se pokriva iz svoje prijestolnice. Gdje najveći grad nije
glavni — New York, São Paulo, Sydney — on zadržava svoje izdanje, a glavni grad
dobiva vlastito **tek kad ima provjerenu listu izvora**.

| Status | Značenje | Primjer |
| --- | --- | --- |
| `live` | izdanje postoji i ima izvore | Zagreb, Tokio, Kairo… (14) |
| `preparing` | prijestolnica je na popisu, izdanje još nema izvore | Washington, Brasília, Canberra (3) |

Stranica zato **nikad ne obećava praznu stranicu**: prijestolnica u pripremi
stoji s objašnjenjem i linkom na izdanje koje tu zemlju pokriva danas.

### Jedna adresa po prijestolnici

Popis nije jedina stranica. Svaka prijestolnica ima vlastitu:

| Adresa | Što nosi |
| --- | --- |
| `/glavni-gradovi/<slug>/` | hrvatska stranica: jezik, zona, kontinent, izvori, najnoviji zapisi, mjesto u mreži |
| `/en/capitals/<slug>/` | ista stranica na engleskom, isti podaci, isti kanonski slug |

Ukupno **34 stranice** (17 × 2). Grade se iz `capitals.json`, pa se nova
prijestolnica ne piše ručno — dodaje se unos, a stranica nastaje u sljedećem
ciklusu. Popis `/glavni-gradovi/` kartice slaže **po kontinentu** i svaka
kartica vodi na stranicu grada.

Pravilo za prijestolnicu koja još nema izdanje: stranica **ne izmišlja**
sadržaj. Kaže što nedostaje (osam točaka ugovora), vodi na izdanje koje tu
zemlju pokriva danas i pokazuje njegove posljednje zapise. Slika je tada
grafika tog izdanja, s potpisom koji to kaže — nikad se ne tvrdi da je
prijestolnica već dobila svoju.

Vlastiti sitemap: `/glavni-gradovi/sitemap.xml` (34 adrese), uključen u
`sitemap-index.xml`. Stranice u pripremi imaju niži prioritet (0.5–0.6) od
aktivnih (0.7–0.8).

### Kako se dodaje novi glavni grad

1. Unos u `apps/region/capitals.json` (`slug`, `status: preparing`, `edition: null`) — stranica `/glavni-gradovi/<slug>/` nastaje sama.
2. Kanal u `apps/region/channels.json`: provjerena lista izvora, paleta,
   vremenska zona, kontinent, jezik.
3. Znak u `scripts/build-aktual-media-logos-v1.py` + `python3 …`.
4. Atlas grafika u `assets/atlas/src/<id>.webp` + `node scripts/build-atlas-art-v1.mjs`.
5. `node apps/region/engine/build.mjs` → `hub.mjs` → `audit.mjs`.
6. `node tests/test-editions-parity-v1.mjs` i `node tests/test-network-atlas-v1.mjs`.
7. Tek tada `status: live`.

Redoslijed je obavezan: **izvori → dizajn → stranice → testovi → objava.**

---

## 4. Testovi

| Test | Što čuva |
| --- | --- |
| `tests/test-network-atlas-v1.mjs` | atlas (šest veličina, alt, napomena), paukova mreža (32 čvora na 48 stranica, bez preklapanja natpisa), glavni gradovi (17 redaka, 34 stranice, canonical i hreflang) |
| `tests/test-capitals-completeness-v1.mjs` | ugovor prijestolnica: slugovi, jezik/kontinent/zona izdanja, priprema s gradom koji pokriva zemlju, 34 adrese u sitemapu |
| `tests/test-editions-parity-v1.mjs` | jednak standard 17 izdanja i 9 portala |
| `tests/test-network-mesh-v1.mjs` | blok od 20 ulaza na svakoj stranici |
| `tests/test-seo-matrix-v1.mjs` | title, description, canonical, hreflang, OG |
| `scripts/network-agents-v1.mjs` | 24 agenta, izvještaj u `artifacts/network-agents-v1.json` |

`region-deploy.yml` prije gradnje pokreće `build-atlas-art-v1.mjs --check`, pa
deploy pada ako manifest i datoteke nisu usklađeni.
