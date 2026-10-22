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
