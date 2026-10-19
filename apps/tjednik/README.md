# GNK ASG BUSINESS TJEDNIK

Kritički poslovni tjednik GNK ASG-a. Čita **Lider**, **Jutarnji list** (Novac),
**Poslovni dnevnik** i **Forbes** (Business), za svaki obrađeni tekst objavljuje
zaseban kritički osvrt i jednom dnevno gradi **dnevni dodatak** te **tjednu
promjenu**.

- **JAVNO:** https://gnk-asg-tjednik.pages.dev/ (Cloudflare Pages, projekt `gnk-asg-tjednik`)
- **Boje:** tamnoplava/teal paleta (različita od zlatne palete KANALA)
- **Izlaz:** `apps/tjednik/site/` — statički HTML, bez baze i bez servera
- **Feed:** `site/feed.json` (JSON Feed 1.1) i `site/feed.xml`
- **Stroj:** `.github/workflows/tjednik-daily.yml` (06:20 UTC, svaki dan)
- **Deploy:** `.github/workflows/tjednik-deploy.yml` (push na `apps/tjednik/**`)

## Pravilo

Tjednik **ne prenosi** cjelovite tekstove izvora. Iz izvornika se koriste naslov,
sažetak, kategorije, datum i poveznica. Osvrt analizira **način izvještavanja**
(što treba provjeriti, koji dokument nedostaje, što naslov pretpostavlja), a ne
tvrdi da je izvornik netočan. Svaka stranica nosi oznaku „Automatski osvrt“ i
poveznicu na izvornik (`isBasedOn` u JSON-LD).

## Naredbe

```bash
node apps/tjednik/engine/tjednik.mjs                 # dohvati izvore + izgradi
node apps/tjednik/engine/tjednik.mjs --dry-run       # samo popis kandidata
node apps/tjednik/engine/tjednik.mjs --max 4         # kraći ciklus
node apps/tjednik/build.mjs --base https://gnk-asg-tjednik.pages.dev/
```

Lokalni pregled:

```bash
cd apps/tjednik/site && python3 -m http.server 8080 --bind 0.0.0.0
```

## Struktura

```
apps/tjednik/
  build.mjs                  generator (bez ovisnosti)
  engine/
    tjednik.mjs              dnevni stroj: izvori → kritike → build
    lib.mjs                  datumi, ISO tjedan, teme, kritička pitanja
    sources.json             izvori i dnevni cap po izvoru
    state.json               dedupe (URL → slug) i dnevni zapis
    last-run.json            izvještaj zadnjeg ciklusa
  src/
    critiques/*.json         jedan osvrt = jedan JSON + jedna HTML stranica
    assets/tjednik.css       paleta i layout
    assets/og/tjednik.png    OG slika 1200×630
  site/                      generirani site (commitan, deploya se)
```

## Stranice

| Ruta | Sadržaj |
|---|---|
| `/` | naslovnica: tjedna promjena, najnovije kritike, dnevni dodatak |
| `/kritike/` | arhiva svih osvrta |
| `/kritike/<slug>/` | pojedinačni kritički osvrt + izvornik |
| `/tjednik/` | arhiva tjedana |
| `/tjednik/<YYYY-Www>/` | tjedna promjena: brojke, teme, usporedba s prethodnim tjednom |
| `/dodaci/` | arhiva dnevnih dodataka |
| `/dodaci/<YYYY-MM-DD>/` | svi osvrti jednog dana po izvorima |
| `/izvori/` | četiri izvora i njihove kritike |
| `/metodologija/` | pravila, što osvrt jest i što nije, ispravci |

## Registracija u program (control plane)

Tjednik je upisan u `ops/automation-control-v1.json` (`knownCurrentSchedules`) i
`ops/automation-kill-switches.json` (`tjednikPublish`). Validacija:
`node scripts/validate-automation-kill-switches.mjs`.

## Ograničenja

- Svaki izvor ima dnevni cap (`sources.json`). Obrađuje se najnoviji dio feeda,
  ne cijela arhiva izvora.
- Lider nema javni RSS; naslovi se čitaju s popisa, a opis iz `og:description`
  pojedinog članka.
- Forbes feed sadrži i sportske/zabavne tekstove; filtriraju se kategorije
  `sportsmoney`, `gaming`, `hollywood`, `media`.
- Ako izvor promijeni feed ili blokira pristup, ciklus se nastavlja s ostalima,
  a `last-run.json` bilježi grešku po izvoru.
