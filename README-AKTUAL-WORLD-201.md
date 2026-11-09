# AKTUAL WORLD — dovršeni paket za provjeru i integraciju

**Status:** lokalno validirani izvorni kod i statičke stranice. **Nije dokaz objave na gnk-asg.hr.**

## Sadržaj

- 201 **jedinstvena** država/područje u `apps/portal/data/world-countries-v1.json`. Izvorni paket pogreškom je dvaput sadržavao Moldovu i zato gradio samo 200 URL-ova; drugi zapis zamijenjen je Gvajanom (GY).
- 201 HTML + 201 XML RSS stranica država, 10 HTML + 10 RSS stranica gradova i sitemap s **212 postojećih** URL-ova (201 zemlja + 10 gradova + novi pregledni imenik).
- 435 konfiguriranih potencijalnih vanjskih izvora. Nije potvrđeno da je svaki izvor dostupan niti licenciran.
- `scripts/refresh-aktual-world-headlines-v1.mjs`: dohvaća ograničene **naslove i poveznice**, ne kopira tekst članaka; ograničenja veličine, vremena i URL-a; neuspješni dohvat ne mijenja postojeći cache. Ne jamči neprekidno 24/7 osvježavanje.
- `scripts/build-aktual-world-v1.mjs`: koristi samo cache mlađi od 24h, inače pokazuje nedostupnost provjerenih naslova; gradi HTML, feed i sitemap bez izmišljanja datumâ ili vijesti.
- `.github/workflows/aktual-world-source-refresh-v1.yml`: planira provjeru svaka 6 sata te **predlaže PR**; ništa se automatski ne spaja niti objavljuje na produkciji. Potrebne su GitHub Actions `contents:write` i `pull-requests:write` ovlasti.

## Primjena na stvarni repo (iz njegovog korijena)

```bash
# Prvo u svojem repozitoriju: zaštititi lokalne izmjene i dohvatiti svježi main.
git status --short
git fetch origin main
git switch -c feature/aktual-media-world-201 origin/main
# Primijeniti PRIPREMLJENI POBOLJŠANI patch, ne originalni.
git am --3way /putanja/MASTER_ASG_AKTUAL_WORLD_201_FINAL.patch
node --test tests/test-aktual-world-v1.mjs
node scripts/generate-world-countries-v1.mjs
AKTUAL_WORLD_OUT=apps/portal/gnk-aktual node scripts/build-aktual-world-v1.mjs --base https://gnk-asg.hr/gnk-aktual/
git status --short
# Pregledati promjene i pokrenuti ostale repo testove prije push-a.
git push -u origin feature/aktual-media-world-201
# Otvoriti PR u main, provjeriti CI i spajati samo nakon reviewa.
```

Važno: `refresh` traži pristup internetu i nije bio mrežno validiran u ovom okruženju. Za početni izvorni cache:

```bash
node scripts/refresh-aktual-world-headlines-v1.mjs
AKTUAL_WORLD_OUT=apps/portal/gnk-aktual node scripts/build-aktual-world-v1.mjs --base https://gnk-asg.hr/gnk-aktual/
```

Nakon provjere mergea pokrenuti odobreni **Deploy Admin Auth V6** s aktualnim potpunim `main` SHA i uključenim exact-SHA zaštitama. Nije dovoljno da PR bude spojen. Ne uključivati indeksiranje ili indeksne pingove bez dodatne uredničke provjere i reviewa.

Obvezna javna provjera: `/gnk-aktual/media/hrvatska/`, `/gnk-aktual/media/hrvatska/feed.xml`, `/gnk-aktual/grad/zagreb/`, `/gnk-aktual/media/sitemap.xml`, `robots`, `canonical`, RSS i stvarni deploy SHA.

**Ograničenja:** Ovo je indeks poveznica i potencijalnih izvora, ne sustav koji AI autonomno piše članke iz tuđih vijesti. Za takvu funkcionalnost potrebna je odvojena urednička i licencna validacija. Brand i urednički navodi preuzeti iz korisnikova paketa; nisu potvrda korporativnog vlasništva ili vanjskih prava.

## GitHub regeneracija — dokaz 7. 11. 2026.

Feature-only workflow `.github/workflows/aktual-world-feature-rebuild-v1.yml` uspješno je dovršio run [42370806911](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/42370806911) i napravio commit `4b674deb3aa4c6791055be7374331c7e1e2e178a` sa 423 regenerirane World datoteke. Prošli su ciljano testiranje 201 država/10 gradova, meta-higijena, zajednički dizajn i sitemap integritet. Ovo **nije potvrda** da globalni `test-all` ili produkcijski deploy prolazi. Mrežni status 24/7 objave nije potvrđen. GitHub PR provjere za commit koji je zapisao `github-actions[bot]` mogu ostati `action_required`; pregledati ih na novom ljudskom/povezanom commitu.
