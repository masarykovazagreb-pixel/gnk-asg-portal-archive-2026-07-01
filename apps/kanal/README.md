# GNK ASG KANAL

Samostalni urednički kanal društva GNK ASG d.o.o. — objave, analize, komentari i
pojašnjenja u obliku koji druge redakcije (prvenstveno AKTUAL MEDIA) mogu strojno
preuzeti uz atribuciju.

- **JAVNO:** https://gnk-asg-kanal.pages.dev/ (Cloudflare Pages, objavljeno 19. 10. 2026.)
- **Izlaz:** `apps/kanal/site/` (statički HTML, bez baze i bez servera)
- **Hosting:** Cloudflare Pages (`gnk-asg-kanal`), workflow `.github/workflows/kanal-deploy.yml`
- **Domena:** samo `gnk-asg-kanal.pages.dev` (odluka 19. 10. 2026: custom domena se ne koristi)
- **Feed za AKTUAL:** `site/feed.json` (JSON Feed 1.1 + blok `_kanal`)
- **Kontakt:** `info@gnk-asg.hr`

## Brze naredbe

Deploy se pokreće automatski na svaki push koji dira `apps/kanal/**`
(workflow `kanal-deploy.yml`). Ručno: Actions → kanal-deploy → Run workflow
(dostupno kad je workflow na `main`).

### Dnevni stroj — 10 objava svakoga dana

```bash
node apps/kanal/engine/daily.mjs                 # današnje izdanje (10 objava)
node apps/kanal/engine/daily.mjs --date 2026-10-20
node apps/kanal/engine/daily.mjs --date 2026-10-20 --force   # ponovno sastavi
node apps/kanal/engine/portal-block.mjs --limit 6            # blok na AKTUAL
```

Sastav izdanja: 1 cjelovit tekst iz `engine/pool.json`, 2 roka, 3 brojke,
2 pojma, 1 pitanje čitatelja i 1 provjera tvrdnje. Iste stavke se ne ponavljaju
21 dan (`engine/state.json` → `lastUsed`), a izdanje je idempotentno: drugi
pokret za isti datum ne piše ništa bez `--force`.

Automatizacija: `.github/workflows/kanal-daily.yml` (svaki dan 05:00 UTC),
registrirana u `ops/automation-control-v1.json` i `ops/automation-kill-switches.json`
(kanal `kanalPublish`). Workflow također osvježava blok na AKTUAL MEDIA
(`apps/portal/gnk-aktual/index.html`, oznake `KANAL-BAND:START/END`) i
`apps/portal/data/kanal-latest.json`.

Desk objave su `kind: "desk"` → `noindex`, kicker „Dnevni desk", autor
„GNK ASG KANAL · Dnevni desk" i vidljiva oznaka da su automatski sastavljene,
bez pripisivanja Nerminu Sefiću.

```bash
node apps/kanal/build.mjs                      # lokalna gradnja
node apps/kanal/build.mjs --base https://gnk-asg-kanal.pages.dev/
node apps/kanal/integrations/aktual-import.mjs --out ./aktual-import.json
NODE_PATH=/home/user/.cache/ogtool/node_modules node apps/kanal/make-og.mjs  # OG slike
```

Lokalni pregled:

```bash
cd apps/kanal/site && python3 -m http.server 8080 --bind 0.0.0.0
```

## Struktura

```
apps/kanal/
  build.mjs                 generator (bez ovisnosti)
  make-og.mjs               generiranje 1200×630 OG slika (sharp)
  src/
    site.json               brend, autor, izdavač, rubrike, kontakt
    articles/*.json         10 objava (HTML tijelo, izvori, FAQ, X postovi)
    pages/*.json            o kanalu, Nermin Sefić, metodologija, pojašnjenja,
                            objave, komentari, kontakt, privatnost
    assets/                 CSS, JS, logo, portret, OG slike
    data/comments/*.json    objavljeni komentari po tekstu
  site/                     generirani izlaz (commit se drži radi Pagesa)
  integrations/
    aktual-media.md         ugovor o preuzimanju: polja, pravila, rutina
    aktual-import.mjs       importer za AKTUAL
  docs/HOSTING-I-DOMENA.md  besplatan hosting i domena, korak po korak
```

## Što svaki tekst dobiva

- vlastitu adresu `/<slug>/`, `<title>`, meta description, canonical
- Open Graph + X/Twitter card + 1200×630 OG sliku
- JSON-LD `@graph`: Organization, Person, WebSite, NewsArticle, FAQPage, BreadcrumbList
- autora, datum, vrijeme čitanja, broj riječi
- ključne činjenice, izvore, komentare (uz uredničku provjeru), FAQ
- vidljiv status provjere (AI transparentnost, EU AI Act čl. 50)
- RSS, Atom, JSON Feed, sitemap, llms.txt

## Uređivački status

Svi tekstovi prvog izdanja su **urednički pregledani i odobreni 19. 10. 2026.**
(odobrenje glavnog urednika Nermina Sefića, evidentirano na stranici
`/metodologija/`). Status se u `src/site.json` mijenja poljem:

```json
"editorial": {
  "status": "approved",
  "statusLabel": "Urednički pregledano · 19. 10. 2026.",
  "reviewer": "Nermin Sefić",
  "reviewedAt": "2026-10-19"
}
```

Ako se činjenični dio nekog teksta izmijeni, status se vraća na
`pending-human-review` do novog pregleda. AKTUAL preuzima `editorialStatus` iz
feeda i ne objavljuje `pending` tekst kao potvrđenu vijest
(vidi `integrations/aktual-media.md`, pravilo 3).

## Poznato ograničenje

Tekstovi su 480–880 riječi. Portal `gnk-asg.hr` ima gate od 3.000 riječi za
dugometražni urednički sadržaj (`docs/EDITORIAL-CONTENT-DEPTH-RULE.md`). KANAL
objavljuje kraće formate (vijest, komentar, pojašnjenje, vodič), pa se taj gate ne
primjenjuje — ali to znači da tekstovi nisu zamjena za dugometražne analize portala.

## Ne dira

- `apps/portal/` i `gnk-asg.hr` (produkcija portala)
- Cloudflare Workere i `deploy-admin-auth-v6.yml`
- postojeće cron automatizacije

Workflow `kanal-pages.yml` pokreće se isključivo za `apps/kanal/**`.
