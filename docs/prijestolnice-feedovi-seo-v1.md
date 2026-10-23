# Prijestolnice: feedovi i SEO matrica

Datum: 23. 10. 2026.

Stranice prijestolnica bile su javne, ali nisu bile dio dvaju sustava koji
vrijede za sve ostalo: nisu imale strojni feed i nisu ulazile u SEO matricu.
Ovaj zapis opisuje što je dodano, po kojim pravilima i kako se provjerava.

## 1. Feedovi

Za svaki jezik postoji isti par datoteka:

| jezik | JSON Feed | Atom |
| --- | --- | --- |
| hrvatski | `/glavni-gradovi/feed.json` | `/glavni-gradovi/feed.xml` |
| engleski | `/en/capitals/feed.json` | `/en/capitals/feed.xml` |

Pravila:

- **Jedan zapis po prijestolnici**, `id` je adresa stranice
  (`https://gnk-asg.hr/glavni-gradovi/<slug>/` odnosno `/en/capitals/<slug>/`).
- **Datum nije izmišljen**: `date_modified` je datum najnovijeg zapisa izdanja
  koje grad pokriva. Ako izdanja nema (prijestolnica u pripremi), polje se
  izostavlja umjesto da se upiše današnji datum.
- **Slika je s naše domene** (`/assets/izdanja/<id>-1200.webp`), pa feed ne
  uvodi vanjske ovisnosti.
- **Sažetak kaže istinu o statusu**: broj zapisa i izvora za aktivna izdanja,
  odnosno koje izdanje zemlju pokriva danas za prijestolnice u pripremi.
- Feed je objavljen u `<head>` svake stranice prijestolnice, oba indeksa i oba
  atlasa (`rel="alternate"`), a `_headers` postavlja propisane tipove:
  `application/feed+json` i `application/atom+xml`.
- `feeds.opml` na `/mreza/` uključuje oba feeda, pa ih čitač može preuzeti
  jednim klikom uz ostalih 19 izdanja.

## 2. SEO matrica

`apps/sites/engine/seo-matrix.mjs` gradi matricu iz stvarnih datoteka. Rute
prijestolnica dolaze iz istog `apps/region/capitals.json` iz kojeg ih gradi
regionalni hub — nema ručnog popisa koji može zaostati.

Dodano je 38 ruta:

- 17 prijestolnica × 2 jezika (`kind: "capital"`),
- 2 indeksa (`/glavni-gradovi/`, `/en/capitals/`),
- 2 atlasa (`/atlas/`, `/en/atlas/`), `kind: "capital-index"`.

Ukupno: **116 ruta**, sve s ocjenom 100 i bez otvorenih problema.

Tri promjene u audit u:

1. **JSON-LD se čita iz svih blokova.** Prije se parsirao samo prvi blok, pa
   je stranica koja WebSite, izdavača, BreadcrumbList i stranicu piše odvojeno
   lažno prijavljivala da nema BreadcrumbList. Sada se čitaju svi blokovi i
   ravna se `@graph`.
2. **Prijestolnica mora nositi `City`** u JSON-LD i `geo.placename` u metama —
   tražilica tada zna koje mjesto stranica opisuje. To su dva dodatna uvjeta
   koja vrijede samo za `kind: "capital"`.
3. **Zajednički shell sada piše `publisher` i `hashtags`** na svakoj stranici
   koja ga koristi; prije su te oznake imale samo stranice izdanja.

Pragovi za izdanja nisu sniženi. Prijestolnice prolaze iste provjere: naslov
15–90, opis 80–320, canonical jednak adresi, hreflang hr/en/x-default, robots
`index,follow`, 5 OG i 4 Twitter oznake, barem 6 poveznica, jedan `h1`,
`WebSite` + `BreadcrumbList` + `CollectionPage`, najmanje 20 ključnih riječi i
3 hashtaga.

## 3. Provjere

- `node tests/test-seo-matrix-v1.mjs` — 116 ruta, 0 problema; tvrdo traži
  svih 17 prijestolnica na oba jezika i sva četiri indeksa.
- `node tests/test-capitals-completeness-v1.mjs` — provjerava da feedovi
  postoje, da se JSON i XML parsiraju, da `id` odgovara stvarnoj adresi, da su
  datumi ISO i poredani te da svaka stranica nudi oba feeda.
- `node scripts/test-all-v1.mjs` — 47/47.
- `node scripts/network-agents-v1.mjs` — 29/29.

## 4. Kako dodati novu prijestolnicu

1. Unesi zemlju u `apps/region/capitals.json` (slug, jezik, kontinent, status).
2. `node apps/region/engine/hub.mjs` — gradi stranicu, feedove i sitemap.
3. `node apps/sites/engine/hub.mjs` — matrica sama pokupi novu rutu.
4. `node scripts/test-all-v1.mjs` — ako ruta nije čista, gate pada.

Nema ručnog koraka u matrici ni u feedu: oba čitaju isti izvor.
