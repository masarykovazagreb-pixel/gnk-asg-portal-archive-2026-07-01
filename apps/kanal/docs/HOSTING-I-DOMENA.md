# Hosting i domena — što je besplatno i što stvarno radi u 2026.

Kanal je statički site (HTML/CSS/JS, bez baze i bez servera). Zato mu je dovoljan
besplatan hosting za statičke stranice. Ovo su provjerene opcije, poredane po tome
koliko brzo mogu krenuti.

## 1. GitHub Pages — aktivan odmah (bez nove registracije)

| | |
|---|---|
| URL | `https://masarykovazagreb-pixel.github.io/gnk-asg-kanal/` |
| Domena | besplatna subdomena `*.github.io` |
| Promet | ~100 GB/mjesec (meka granica), 1 GB po siteu |
| HTTPS | automatski |
| Trošak | 0 € |

Workflow `.github/workflows/kanal-pages.yml` gradi `apps/kanal/site` i objavljuje ga.
Trigger je samo promjena u `apps/kanal/**` ili ručno pokretanje — ne dira portal ni
Cloudflare deploy.

**Prvo uključivanje (jednom, potrebna je administratorska ovlast na repou):**
GitHub → repo → *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
API to ne može sam uključiti jer integracijski token nema admin pravo (`403`), pa je
potreban jedan klik u sučelju. Nakon toga se workflow pokreće sam ili ručno:

```bash
gh workflow run kanal-pages.yml
gh run watch
```

## 2. Vlastita domena na postojećoj domeni (najbolje rješenje, 0 €)

Društvo već posjeduje `gnk-asg.hr`. Poddomena je besplatna i profesionalna:

- `gnk-asg-kanal.pages.dev` (preporučeno)
- alternativa: `media.gnk-asg.hr`, `objave.gnk-asg.hr`

**Postupak**

1. Kod DNS providera za `gnk-asg.hr` dodaj:
   ```
   CNAME  kanal  masarykovazagreb-pixel.github.io
   ```
2. U GitHubu: *Settings → Pages → Custom domain* → `gnk-asg-kanal.pages.dev` → Save.
3. Uključi *Enforce HTTPS* (potvrda traje do 24 h).
4. Izgradi site s novim osnovnim URL-om:
   ```bash
   node apps/kanal/build.mjs --base https://gnk-asg-kanal.pages.dev/
   ```
   ili postavi repo varijablu `KANAL_BASE=https://gnk-asg-kanal.pages.dev/` da workflow
   automatski koristi novu domenu.

> Napomena: kanonske poveznice, sitemap, feedovi i OG slike ovise o `--base`.
> Nakon promjene domene obavezno ponovno izgraditi i objaviti.

## 3. Cloudflare Pages — AKTIVNO, javno vidljivo

**Kanal je objavljen:** https://gnk-asg-kanal.pages.dev/

Projekt `gnk-asg-kanal` postoji u Cloudflare računu, a deploy radi automatski iz
workflowa `.github/workflows/kanal-deploy.yml` (push na `apps/kanal/**`).

### Custom domena `gnk-asg-kanal.pages.dev` — jedan korak u dashboardu

Automatsko povezivanje nije prošlo jer API token ima prava za Workers/Pages, ali ne
i za DNS zonu. Postupak (2 minute):

1. Cloudflare dashboard → *Workers & Pages* → **gnk-asg-kanal** → *Custom domains*.
2. *Set up a custom domain* → upiši `gnk-asg-kanal.pages.dev` → *Continue*.
3. Cloudflare sam kreira CNAME `kanal` → `gnk-asg-kanal.pages.dev` (zona `gnk-asg.hr`
   je na Cloudflare imenskim poslužiteljima, pa nema ručnog DNS rada).
4. Nakon toga pokreni workflow ponovno (Actions → kanal-deploy → Run workflow).
   Workflow tada gradi site s `--base https://gnk-asg-kanal.pages.dev/`, pa se kanonske
   poveznice, sitemap i feedovi automatski prebacuju na novu domenu.

Ako želiš da to radi bez ručnog koraka, dodaj API tokenu ovlasti
`Zone:DNS:Edit` i `Zone:Zone:Read` za `gnk-asg.hr` — workflow tada sam kreira zapis
i povezuje domenu.

### Tehnički podaci

| | |
|---|---|
| URL | `https://gnk-asg-kanal.pages.dev` |
| Promet | neograničen za statičke datoteke |
| Buildovi | 500/mjesec |
| HTTPS | automatski |
| Trošak | 0 € |

**Postupak (10 minuta, potreban Cloudflare račun na `beckuphome@gmail.com`)**

1. Cloudflare dashboard → *Workers & Pages → Create → Pages → Connect to Git*.
2. Odaberi repo `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`, grana `main`.
3. Postavke gradnje:
   - Framework preset: **None**
   - Build command: `node apps/kanal/build.mjs --base https://gnk-asg-kanal.pages.dev/`
   - Build output directory: `apps/kanal/site`
   - Node version: 22 (`NODE_VERSION=22`)
4. Deploy. `_headers` i `_redirects` u izlazu automatski primjenjuju sigurnosna
   zaglavlja i preusmjeravanja.
5. (opcionalno) *Custom domains* → `gnk-asg-kanal.pages.dev`.

Prednost prema GitHub Pagesu: neograničen promet i bolji cache. Nedostatak: dodatni
račun i build minuta.

## 3b. Cloudflare Pages — Direct Upload (bez Git integracije)

Ako ne želite povezivati repozitorij: *Workers & Pages → Create → Pages → Upload assets*
i prevucite sadržaj mape `apps/kanal/site`. Dobijete `https://<ime>.pages.dev` odmah.
Nedostatak: svaka izmjena je ručni upload; za automatizaciju koristite Git integraciju
iz prethodne točke.

## 4. Alternative (ako zatreba)

| Platforma | Besplatan URL | Promet | Napomena |
|---|---|---|---|
| Netlify | `gnk-asg-kanal.netlify.app` | ~15 GB/mj (300 kredita) | dobar DX, ali krediti se troše |
| Vercel | `gnk-asg-kanal.vercel.app` | 100 GB/mj | besplatan plan je za nekomercijalne projekte |
| Cloudflare Workers | `*.workers.dev` | 100k zahtjeva/dan | više za API nego za site |

## 5. Što NE preporučujem

- **Freenom (.tk, .ml, .ga, .cf, .gq)** — ugašen za nove registracije 2023./2024.
  Preostale domene su nestale, a ekstenzije nose reputaciju spama.
- **`.is-a.dev`, `.js.org` i slične zajednice** — besplatne su, ali uvjetuju
  nekomercijalni, programerski projekt. Korporativni medijski kanal ne prolazi uvjete
  i može biti uklonjen.
- **Besplatni hosting s reklamama (InfinityFree i sl.)** — ubacuju oglase, nemaju
  pouzdan HTTPS i ne podržavaju prilagođena zaglavlja.

## 6. Preporuka

1. Danas: GitHub Pages (`*.github.io`) — radi bez ikakve registracije.
2. Ove nedjelje: `gnk-asg-kanal.pages.dev` preko CNAME-a — profesionalna adresa, 0 €.
3. Ako promet naraste: Cloudflare Pages (neograničen bandwidth) s istom domenom.

## 7. Provjera nakon objave

```bash
curl -sI https://gnk-asg-kanal.pages.dev/ | head -5           # 200 + zaglavlja
curl -s  https://gnk-asg-kanal.pages.dev/feed.json | head     # feed
curl -s  https://gnk-asg-kanal.pages.dev/robots.txt           # sitemap
curl -s  https://gnk-asg-kanal.pages.dev/sitemap.xml | head   # urlset
```

Zatim: Google Search Console → *Add property* → `gnk-asg-kanal.pages.dev` → potvrdi TXT
zapisom → pošalji `sitemap.xml`. Isto učiniti u Bing Webmaster Toolsu (uvoz iz GSC-a).
