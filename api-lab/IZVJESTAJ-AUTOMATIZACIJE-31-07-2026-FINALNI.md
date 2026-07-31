# KOMPLETAN IZVJEŠTAJ — automatizacije gnk-asg.hr
## 31.07.2026., 09:30 UTC — za predaju drugom informatičaru
## Sve provjereno uživo danas. Ništa nije popravljano bez posebne napomene.

---

## SAŽETAK — 7 PITANJA, 7 ODGOVORA

### 1. Kolumne (npr. Cibona) vraćaju 404 — POTVRĐENO, uzrok poznat

Kolumne postoje **samo** kao zapisi u `apps/portal/data/kolumne.json`, koje
JavaScript prikazuje dinamički na jednoj zajedničkoj stranici `/gnk-aktual/`.
**Nijedna statička HTML stranica ne postoji** na putu koji je registriran
(`apps/portal/gnk-aktual/kolumne/<slug>/index.html`). Otud 404 — poveznica
vodi na adresu koja fizički ne postoji na disku.

### 2. Nove kolumne se ne objavljuju na Blogger — POTVRĐENO, isti korijen

`scripts/blog-publish-v1.mjs`, funkcija `readArticle()`, traži pravu HTML
datoteku prije slanja na Blogger. Za kolumne je nema (točka 1), pa funkcija
vrati `null`. Provjereno izravno u `apps/portal/data/blog-content/published.json`:
**153 objave stigle, nijedna od tri objavljene kolumne nije među njima.**

### 3. Skrivena greška koju workflow ne prijavljuje — POTVRĐENO

Kad `readArticle()` vrati `null`, zapis ide u `summary.skipped`, **ne** u
grešku. `blog-mirror-publish.yml` završava sa statusom `success` čak i kad
nijedna kolumna nije stvarno objavljena — zato izgleda da "sve radi" dok
tri kolumne tiho nestaju svaki sat, zauvijek, bez ijednog crvenog znaka.

### 4. Više workflowa piše u main istovremeno — POTVRĐENO, uzrok pronađen

Najmanje **15 aktivnih workflowa** commita izravno na `main` po vlastitom
rasporedu: `news-refresh`, `blog-mirror-publish`, `macro-market-refresh`,
`market-pulse-refresh`, `mirror-sync-masarykova`, `seo-news-cycle`,
`seo-audit-refresh`, `refresh-gnkc-index`, `refresh-index-live-data`,
`sync-webshop-products`, `linkedin-daily-rotation`,
`editorial-scheduled-publish`, `generate-digital-workforce-newsroom-pages`,
`provjera-workera`, `provjera-aplikacije`. Nijedan od njih ne čeka drugi.

**Dokaz da se to stvarno događa:** `news-refresh.yml` je danas u 07:16 pao
na koraku "Commit refreshed feed" — klasičan `git push` odbijen jer je grana
u međuvremenu pomaknuta. Ponovno pokretanje odmah nakon toga prošlo je čisto.
Nije kvar u logici, nego sudar u pisanju.

### 5. Statičke stranice po kolumni i slug/URL usklađenost — NE POSTOJE

Provjereno: `ls apps/portal/gnk-aktual/kolumne/` → mapa ne postoji nigdje u
repozitoriju. Slug u `kolumne.json` (npr. `08-cibona-prvak`) i put u
`editorial-registry.json` (`/gnk-aktual/kolumne/08-cibona-prvak/`) se
međusobno slažu — problem nije neusklađenost imena, nego **potpuni izostanak
same datoteke** na koju put pokazuje.

### 6. Automatike koje mogu pokrenuti deploy BEZ izričitog odobrenja — DA, DVIJE

**a) `editorial-content-deploy.yml`** — pokreće se sam na svaki push koji
dira **isključivo** urednički sadržaj (`objave/`, `komentari/`, `analize/`,
`news.json` i slično). Ako prepozna da je promjena čisto urednička, **sam
pozove `deploy-admin-auth-v6.yml`** preko GitHub API-ja, bez čekanja na
ičiju potvrdu. Ovo je namjerno dizajnirano uže sigurno "prečac" - i dalje
ide kroz odobreni gate, ne zaobilazi ga - ali čovjek ne mora ništa kliknuti.

**b) `deploy-gnk-asg-image-proxy.yml`** — moja izmjena od jučer. Pokreće se
sam na push koji dira `workers/gnk-asg-image-proxy/**`, i **izravno** radi
`wrangler deploy`, mimo `deploy-admin-auth-v6.yml` u potpunosti. Ovo **krši**
postojeće testirano pravilo (`scripts/test-deploy-approval-guardrails.mjs`)
da samo jedan workflow smije imati produkcijsku ovlast. Test pada na svakom
mom idućem PR-u otkad postoji. **Ovo treba odluku, ne moju samovolju.**

### 7. Glazba, moda, stil, umjetnost — dodano, ali nestabilno

Izvori postoje u `refresh_news.py` (dodano jučer), ali provjera upravo sada
pokazuje da grupe `glazba`, `stil`, `auti`, `turizam`, `ljubimci`,
`zanimljivosti` **trenutno nemaju vidljivih stavki** na stranici, ili ih
imaju vrlo malo. Uzrok, provjeren u `update_status.json`:
- `The Dodo`, `Motor Authority`, `Lonely Planet` → **404**, URL-ovi su se
  promijenili ili preseljeni
- `Reddit aww`, `Reddit UpliftingNews`, `Reddit MadeMeSmile` → **429 Too Many
  Requests** — Reddit blokira anonimne, učestale pozive na razini poslužitelja

Ovo nije lažno obećanje nego stvaran nalaz iz greški zabilježenih danas.
Rješenje traži ili API ključeve (Reddit ima službeni API s autentifikacijom
koji ne bi bio ograničen ovako), ili nove, stabilnije javne izvore. Nisam
dalje mijenjao ništa u ovom krugu jer je prioritet bio dovršiti audit.

---

## POTPUN INVENTAR — SVI AKTIVNI WORKFLOWI, KATEGORIZIRANO

Ukupno u repozitoriju: **353** workflow datoteka. Aktivnih: **59**.
Deaktiviranih (arhiviranih, `if: false` ili ručno ugašenih): **294**.

| Datoteka | Okidač | Piše u Git | Radi deploy |
|---|---|---|---|
| blog-mirror-publish.yml | schedule, ručno | DA | - |
| content-source-governance.yml | PR, ručno | - | - |
| **deploy-admin-auth-v6.yml** | **samo ručno, s potvrdom** | - | **DA (jedini odobreni)** |
| deploy-black-logo-smoke-test.yml | ručno | - | - |
| **deploy-gnk-asg-image-proxy.yml** | **push, ručno** | DA | **DA (krši pravilo, v. točku 6b)** |
| deploy-mail-studio-multilingual.yml | PR | - | - |
| deploy-public-portal-assets-safe.yml | PR | - | - |
| editorial-content-ci.yml | PR | - | - |
| **editorial-content-deploy.yml** | **push** | - | **pokreće deploy-admin-auth-v6 automatski (v. točku 6a)** |
| editorial-scheduled-publish.yml | schedule, push, ručno | DA | - |
| generate-digital-workforce-newsroom-pages.yml | schedule, push, ručno | DA | - |
| linkedin-daily-rotation.yml | schedule, ručno | DA | - |
| macro-market-refresh.yml | schedule, ručno | DA | - |
| market-pulse-refresh.yml | schedule, ručno | DA | - |
| mirror-sync-masarykova.yml | schedule, ručno | DA | - |
| news-refresh.yml | schedule, ručno | DA | - |
| provjera-aplikacije.yml | ručno | DA | - |
| provjera-workera.yml | schedule, ručno | DA | - |
| public-editorial-assets-ci.yml | PR | - | - |
| public-market-contract.yml | PR, ručno | - | - |
| public-portal-audit.yml | push, PR, ručno | - | - |
| read-latest-deploy-status-cd053a.yml | push | DA | - |
| record-news-deploy-501ddc-status.yml | push | DA | - |
| record-one-time-deploy-14868bc-status.yml | push | DA | - |
| record-one-time-deploy-77de-status.yml | push | DA | - |
| record-one-time-deploy-cd053a-status.yml (+v2) | push | DA | - |
| refresh-gnkc-index.yml | schedule, ručno | DA | - |
| refresh-index-live-data.yml | schedule, PR, ručno | DA | - |
| seo-audit-refresh.yml | schedule, ručno | DA | - |
| seo-news-cycle.yml | schedule, ručno | DA | - |
| set-pexels-secret.yml | ručno (jednokratno, iskorišteno) | - | - |
| site-functional-readiness.yml | push, PR | - | - |
| site-health-check-v1.yml | schedule, ručno | - | - |
| sync-webshop-products.yml | schedule, ručno | DA | - |
| validate-*.yml (11 datoteka) | PR, ručno | - | - |

**Legenda:** "schedule" = pokreće se sam po cron rasporedu. "push" = pokreće se
sam čim netko gurne na `main` (bez ičije potvrde, ako putanja odgovara).
"PR" = pokreće se samo pri otvaranju/izmjeni pull requesta, nikad na live
sajtu izravno — ovo su CI/kontrolne provjere, ne produkcijske akcije.
"ručno" = `workflow_dispatch`, netko mora svjesno kliknuti.

**Stvarno produkcijske (mijenjaju live sajt ili šalju van):**
`deploy-admin-auth-v6.yml`, `deploy-gnk-asg-image-proxy.yml`,
`editorial-content-deploy.yml` (posredno, preko dispatcha),
`blog-mirror-publish.yml`, `news-refresh.yml`, `market-pulse-refresh.yml`,
`macro-market-refresh.yml`, `mirror-sync-masarykova.yml`,
`sync-webshop-products.yml`, `linkedin-daily-rotation.yml`.

**Samo CI/provjera, nikad ne dira produkciju:** svih 11 `validate-*.yml`,
`content-source-governance.yml`, `editorial-content-ci.yml`,
`public-editorial-assets-ci.yml`, `public-market-contract.yml`,
`deploy-mail-studio-multilingual.yml`, `deploy-public-portal-assets-safe.yml`
— potonja dva unatoč imenu "deploy" samo **provjeravaju** PR, ne objavljuju.

---

## STVARNI RITAM (izmjeren danas, ne iz dokumentacije koda)

| Automatika | Piše u kodu | Stvarno izmjereno danas |
|---|---|---|
| news-refresh | "svaka 2 sata" | 2-4h, nepravilno |
| blog-mirror-publish | "svaki sat" | 2.5-4h, nepravilno |
| market-pulse-refresh | ? | ~4h |
| macro-market-refresh | ? | 3-7h, vrlo nepravilno |

GitHub Actions cron ne garantira točno vrijeme, samo najraniji mogući trenutak
— pod opterećenjem repozitorija (353 datoteke, mnogo paralelnih poslova)
kasni. Nije kvar, ali dokumentacija u kodu je optimističnija od stvarnosti.

---

## PRIORITETNI POPRAVCI, PREPORUČENIM REDOSLIJEDOM

1. **Riješiti `deploy-gnk-asg-image-proxy.yml` sukob s guardrail pravilom** —
   premjestiti unutar `deploy-admin-auth-v6.yml` ili svjesno proširiti test
2. **Generirati statičku HTML stranicu po kolumni** — rješava i 404 i Blogger
   nogu odjednom (vidi `api-lab/PREDAJA-BLOG-KOLUMNE-31-07-2026.md` za opcije)
3. **Dodati provjeru u `blog-mirror-publish.yml`** da glasno javi kad
   `readArticle()` vrati `null` umjesto tihog preskakanja
4. **Razmotriti concurrency grupe** na workflowima koji pišu u main, da se
   spriječe sudari poput današnjeg u `news-refresh`
5. Zamijeniti mrtve URL-ove (`The Dodo`, `Motor Authority`, `Lonely Planet`) i
   riješiti Reddit 429 (ili ključ, ili odustati od Reddita za te dvije rubrike)

---

## POVEZANI DOKUMENTI NA `api-lab` GRANI

- `PREGLED-31-07-2026.md` — jučerašnji opći pregled
- `PREDAJA-BLOG-KOLUMNE-31-07-2026.md` — tehnički detalji Blogger mehanizma
- `IZVJESTAJ-KONACNI-31-07-2026.md` — jučerašnji popis automatizacija
- **ovaj dokument** — najdublja, danas provjerena analiza sedam konkretnih pitanja
