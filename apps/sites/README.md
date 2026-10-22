# GNK ASG mreža — šest neovisnih izdanja

Jedan generator, šest stranica, šest vlastitih hostinga. Sadržaj je u
`content/`, izgled i SEO u `lib/`, izlaz u `site/` (ne uređuje se rukom).

| slug | izdanje | hosting | vrsta |
|---|---|---|---|
| `bor-usa` | BOR USA | `gnk-bor-usa.pages.dev` | stalno |
| `kosarka` | KOŠARKA 360 | `gnk-kosarka.pages.dev` | stalno |
| `scena-znanosti` | SCENA ZNANOSTI | `gnk-scena-znanosti.pages.dev` | stalno |
| `step-buducnosti` | STEP BUDUĆNOSTI | `gnk-step-buducnosti.pages.dev` | stalno, galerija |
| `zdravlje` | ZDRAVLJE 360 | `gnk-zdravlje.pages.dev` | stalno |
| `izbori-srbija` | IZBORI U SRBIJI | `gnk-izbori-srbija.pages.dev` | privremeno |

Hub je na matičnoj stranici: <https://gnk-asg.hr/mreza/> i
<https://gnk-asg.hr/en/network/>. Strojni popis: `/data/mreza-v1.json`.

## Naredbe

```bash
node apps/sites/build.mjs          # gradi svih šest u apps/sites/site/
node apps/sites/engine/hub.mjs     # gradi /mreza/, /en/network/ i data/mreza-v1.json
node apps/sites/engine/ingest-izbori.mjs   # osvježi izborne feedove (mreža)
node tests/test-sites-network-v1.mjs       # gate: SEO, linkovi, svježina izlaza
```

`SITES_OUT=/tmp/x node apps/sites/build.mjs` gradi izvan repozitorija; gate to
koristi za provjeru da je commitani izlaz identičan onome što generator daje.
`--no-fresh` preskače tu usporedbu (koristi se u CI-ju nakon svježeg feeda).

## Što svaka stranica dobiva

- `/`, 3–4 tematske stranice i `/metodologija/`, svaka i na `/en/`;
- vlastiti `sitemap.xml` (s `image:` i `xhtml:` hreflangom), `feed.xml`,
  `robots.txt`, `manifest.webmanifest`, `404.html`, `_headers` sa CSP-om;
- šest generiranih SVG grafika + pravi PNG za OG/Twitter (1200×630) i ikone;
- `title`, `description`, `canonical`, `hreflang` hr/en/x-default, `robots`,
  `author`, `editor` (Nermin Sefić), `keywords`/`news_keywords`, OG + Twitter
  kartice s `image:alt`, JSON-LD (WebSite, Organization, Person,
  CollectionPage/Article, BreadcrumbList, FAQPage);
- mrežnu traku, obavijest i podnožje s poveznicama na gnk-asg.hr, hub i sva
  ostala izdanja — svaka stranica ima 60+ poveznica, nikad manje od šest.

Grafike su apstraktne i generirane iz palete izdanja: bez stock fotografija,
bez izmišljenih portreta i bez teksta upečenog u sliku.

## Uređivanje sadržaja

`content/<slug>.mjs` izvozi `{ sources, glossary, pages }`. Stranica ima
`nav`, `title`, `kicker`, `lead`, `sections[{ h, p, list }]`, `faq` i `images`
(indeksi 0–5 ili putanje). Sav tekst je dvočlan: `{ hr, en }`. Ako dodaješ
stranicu, dodaj je u `pages` — sitemap, feed, navigacija i JSON-LD se grade sami.

## Izborni desk

Desk ne anketira i ne prognozira. Izvor su dva sloja:

1. arhiva osam gradskih izdanja (`apps/region/data/*.json`);
2. javni feedovi iz `data/izbori-feeds.json`, koje `engine/ingest-izbori.mjs`
   filtrira istim kriterijem (Srbija + izborni proces) i sprema u
   `data/izbori-extra.json` (21 dan povijesti).

Ako feed ne odgovori, preskače se; build nikad ne ovisi o mreži. Brojke na
stranici su broj objava, ne glasovi — to piše na svakoj stranici deska.

**Kraj izdanja.** Desk je privremen. Kad izborni proces završi:

1. postavi repository variable `IZBORI_DESK_ENABLED=false` — raspored prestaje
   objavljivati desk, povijest ostaje u repozitoriju;
2. zamijeni naslovnicu arhivskom stranicom (posljednje stanje + datoteke) ili
   preusmjeri `gnk-izbori-srbija.pages.dev` na hub;
3. ostavi `/metodologija/` i `/izvori/` online kao zapis metode.

## Hosting

`.github/workflows/sites-deploy.yml` gradi i objavljuje svih šest na zasebne
Cloudflare Pages projekte (`gnk-<slug>`), uz tajne `CLOUDFLARE_API_TOKEN` i
`CLOUDFLARE_ACCOUNT_ID`. Bez tajni korak se preskače s upozorenjem — build i
gate i dalje rade. Push gradi svih šest; raspored (`17 * * * *`) osvježava
samo izborni desk.

Vlastita domena po izdanju: u Cloudflare Pages → projekt → Custom domains, pa
postavi `SITE_BASE_<SLUG>` (npr. `SITE_BASE_BOR_USA=https://bor.gnk-asg.hr/`)
u okruženju workflowa. Canonical, OG, sitemap i feed tada automatski prelaze
na novu domenu — nigdje nije upisan `pages.dev` kao trajna adresa.

## Granice

- Desk ne objavljuje imena osumnjičenih, snimke nasilja ni zaključke o krivnji.
- Zdravlje nije medicinski savjet; scena znanosti ne recenzira radove.
- Nijedna brojka nije iz pamćenja: ako izvor ne postoji, brojka ne postoji.
- Ispravak se objavljuje na stranici na kojoj je pogreška nastala.

## SEO stroj i hashtagovi

Svaka stranica mreže dobiva meta sloj iz generatora, ne ručno:

- `lib/seo.mjs` izvodi hashtagove iz imena izdanja, rubrike (`nav`) i
  registriranih tema. Isti sadržaj uvijek daje isti skup oznaka.
- `build.mjs` upisuje `keywords`, `news_keywords`, `hashtags`,
  `article:tag` (jedan po oznaci), `article:section`,
  `article:published_time`, `article:modified_time`, `og:updated_time`,
  `rel="sitemap"`, `rel="hub"` i JSON-LD `keywords`, `articleSection`,
  `isAccessibleForFree`, `copyrightNotice`, `creditText`.
- Vidljive oznake na svakoj stranici vode na indeks oznaka:
  `/gnk-aktual/mreza/oznake/` (HR) i `/en/gnk-aktual/network/tags/` (EN).
- `engine/aktual-network.mjs` gradi i indeks oznaka, i Markdown verziju
  indeksa (`/gnk-aktual/mreza/index.md`) za asistente i crawlere.
- `engine/seo-matrix.mjs` čita stvarno izgrađene datoteke i piše
  `apps/portal/data/seo-matrix-v1.json`: 78 ruta, ocjena, hashtagovi i
  otvoreni problemi. `tests/test-seo-matrix-v1.mjs` je obavezan gate.

### Background stroj

`.github/workflows/seo-meta-machine.yml` svakih šest sati ponovno gradi
mrežu, provjerava mrežni gate i SEO matricu te sprema matricu kao artefakt.
Ne mijenja repozitorij i ne objavljuje ništa.

IndexNow slanje je opt-in:

- ručno: Actions → `seo-meta-machine` → `confirm_indexnow=INDEXNOW`;
- trajno: repository variable `SEO_INDEXNOW_AUTO=true` — tada i raspored
  šalje 78 URL-ova na 7 domena (`scripts/gnk-indexnow-network-v1.mjs`).

Ključ je javan (`/<key>.txt` na svakoj domeni, build ga upisuje u izlaz), pa
tražilica može provjeriti vlasništvo bez ijednog secreta.
