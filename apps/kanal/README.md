# GNK ASG KANAL

Samostalni urednički kanal društva GNK ASG d.o.o. — objave, analize, komentari i
pojašnjenja u obliku koji druge redakcije (prvenstveno AKTUAL MEDIA) mogu strojno
preuzeti uz atribuciju.

- **Izlaz:** `apps/kanal/site/` (statički HTML, bez baze i bez servera)
- **Hosting:** GitHub Pages (workflow `.github/workflows/kanal-pages.yml`)
- **Domena:** vidi `docs/HOSTING-I-DOMENA.md` (`kanal.gnk-asg.hr` preko CNAME-a)
- **Feed za AKTUAL:** `site/feed.json` (JSON Feed 1.1 + blok `_kanal`)
- **Kontakt:** `beckuphome@gmail.com`

## Brze naredbe

```bash
node apps/kanal/build.mjs                      # lokalna gradnja
node apps/kanal/build.mjs --base https://kanal.gnk-asg.hr/
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

## Uređivački status (važno)

Svi tekstovi u prvom izdanju nose status **„AI-asistirani nacrt · čeka potvrdu
urednika"**. To je namjerno: tekstove je pripremila AI uz provjeru brojki prema
navedenim izvorima, ali završni ljudski pregled (Nermin Sefić) nije zabilježen u
ovom repozitoriju. Kada se pregled obavi, u `src/site.json` mijenja se:

```json
"editorial": { "status": "approved", "statusLabel": "Urednički pregledano" }
```

i ponovno se gradi site. Bez toga AKTUAL ne smije objaviti tekst kao potvrđenu vijest
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
