# GNK ASG portal — završni izvještaj o punom SEO-u i ponovljenoj provjeri

**Datum provjere:** 23. svibnja 2026.  
**Projekt:** Projekt 2 / `aktualmedia/gnk-asg`  
**Promjena:** PR #3 — puni SEO i ponovljena validacija svih javnih ruta  
**Merge commit promjene:** `84d44bdf50c56098bfa5e182ed91748951627eda`  
**Automatska objava generiranih SEO oznaka:** `052961153752f963bf59498d6a1b2ab31043973b`

## Implementirani SEO opseg

Za osam javnih indeksabilnih ruta uveden je i automatiziran cjeloviti SEO paket:

1. `/` — hrvatska početna stranica
2. `/en/` — engleska početna stranica
3. `/sadrzaj/` — pregled javnog sadržaja
4. `/financije/` — financijski profil FY 2025
5. `/tehnologija/` — tehnologija i umjetna inteligencija
6. `/intelligence-desk/` — Intelligence Desk
7. `/registri/` — javni registri i službeni izvori
8. `/instalacija/` — instalacija PWA aplikacije

Svaka javna ruta sada ima ili se generatorom održava kroz:

- jedinstveni `<title>` i meta description;
- canonical URL;
- `robots` politiku za indeksiranje i proširene preview postavke;
- Open Graph title, description, URL, site name, locale, image, dimenzije i alt tekst;
- Twitter Card title, description, image i alt tekst;
- JSON-LD za WebSite, Organization i konkretnu stranicu;
- BreadcrumbList za javne podstranice;
- HowTo strukturirane podatke za instalacijsku stranicu;
- `hreflang` poveznice za hrvatsku i englesku početnicu;
- uvrštenje u `sitemap.xml`.

Administratorska ruta ostaje namjerno izvan indeksiranja kroz HTML `noindex` i `robots.txt` zabranu.

## Društveni preview

Uveden je brendirani preview asset:

- `assets/gnk-asg-social-card.svg`
- format: SVG
- dimenzije: 1200 × 630
- uključen u Open Graph, Twitter Card i PWA cache.

## Ponovljeni automatizirani test

Workflow: `.github/workflows/portal-validation.yml` — **Portal Validation and Live Data Test**  
GitHub Actions run: `26342670457`  
Job: `77547301295`  
Zaključak: **success**

### Početna provjera postojećeg stanja

Prije žive obnove podataka i SEO generiranja:

- JavaScript sintaksa aktivnih modula — PASS
- Python sintaksa automatiziranih procesora — PASS
- Postojeća struktura portala, 3D mreža, admin sigurnost i pohranjeni podatci — PASS
- Rezultat: **46 / 46 provjera prošlo; 0 nije prošlo**

### Stvarno povlačenje podataka u ponovljenom testu

#### Vijesti i digitalna imovina

Izvršena skripta: `python scripts/update_feeds_v2.py`

- Javne vijesti: **375**
- Pogreške izvora: **0**
- Digital Assets Monitor: **8 valuta**
- BTC graf: **169 podatkovnih točaka**

Raspodjela vijesti:

| Grupa | Broj |
|---|---:|
| technology | 119 |
| digital-assets | 85 |
| international | 80 |
| srbija | 31 |
| slovenija | 30 |
| hrvatska | 20 |
| bih | 10 |

#### Makro tržišni podatci

Izvršena skripta: `python scripts/update_macro_data.py`

- Učitana tržišna sredstva: **4** — Bitcoin, zlato, Brent nafta i USD/EUR
- Pogreške: **0**

#### Media Monitor Status

Izvršena skripta: `python scripts/discover_corporate_media.py`

- Status: **ok**
- Provjereni upiti: **8**
- Pogreške: **0**
- Politika javnog prikaza: `manual_approval_only`
- Neodobreni rezultati nisu pohranjeni niti javno prikazani.

### SEO generiranje i validacija

Izvršena skripta: `python scripts/generate_seo.py`

Generator je uspješno proizveo meta oznake, strukturirane podatke, `sitemap.xml` i `robots.txt` za svih osam javnih ruta.

Potvrđeno kao PASS:

- meta, canonical, Open Graph, Twitter i JSON-LD: `/`
- meta, canonical, Open Graph, Twitter i JSON-LD: `/en/`
- meta, canonical, Open Graph, Twitter i JSON-LD: `/sadrzaj/`
- meta, canonical, Open Graph, Twitter i JSON-LD: `/financije/`
- meta, canonical, Open Graph, Twitter i JSON-LD: `/tehnologija/`
- meta, canonical, Open Graph, Twitter i JSON-LD: `/intelligence-desk/`
- meta, canonical, Open Graph, Twitter i JSON-LD: `/registri/`
- meta, canonical, Open Graph, Twitter i JSON-LD: `/instalacija/`
- sitemap sadrži svih osam javnih URL-ova — PASS
- robots.txt zadržava admin izvan indeksa i navodi sitemap — PASS

## Završni rezultat testa

**60 / 60 provjera prošlo; 0 provjera nije prošlo.**

## Potvrda objave u glavnoj verziji

Nakon spajanja PR-a, workflow `Daily SEO Refresh` automatski je fizički upisao generirane HTML oznake u `main` granu kroz commit `052961153752f963bf59498d6a1b2ab31043973b`.

Naknadnim čitanjem `main` datoteka potvrđeno je da početna hrvatska i engleska stranica te podstranice sadržaja i financija već sadrže generirani SEO blok s canonical, Open Graph, Twitter i JSON-LD oznakama, dok je svih osam ruta obuhvaćeno istim generatorom i prethodno prošlo automatiziranu validaciju.

## Preporučena sljedeća poboljšanja

1. Dodati PNG ili WebP social preview sliku dimenzija 1200 × 630 i koristiti je kao primarni `og:image` / `twitter:image`, uz zadržavanje SVG-a za web prikaz. Raster je u praksi kompatibilniji s platformama za dijeljenje.
2. Povezati stranicu s Google Search Console i predati `sitemap.xml`, zatim zatražiti indeksiranje početne, financijske i tehnološke stranice.
3. Dodati engleske izvedbe ključnih podstranica (`/en/finance/`, `/en/technology/`, `/en/registries/`) ako je međunarodna publika primarni cilj portala.
4. Uvesti preglednički E2E test, npr. Playwright screenshot/interaction test, za rotaciju 3D globusa, mobilni prikaz i osnovne navigacijske tokove.
5. U sljedećoj tehničkoj zakrpi prilagoditi GitHub Actions runtime upozorenju o prelasku s Node.js 20 na Node.js 24.
