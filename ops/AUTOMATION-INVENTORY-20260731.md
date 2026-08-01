# GNK ASG — registar automatizacija

Datum početne evidencije: 31.07.2026.
Grana: `agent/stabilize-automation-clean-main-20260731`
Status: kontrolni dokument; bez produkcijskog deploya i bez mergea.

## Pravila upravljanja

- Jedini dopušteni produkcijski deploy put je `.github/workflows/deploy-admin-auth-v6.yml` uz izričitu potvrdu.
- Automatike koje pišu u `main` moraju imati concurrency zaštitu, retry nakon sudara i jasno vlasništvo nad datotekama.
- Opisni cron ritam nije jamstvo stvarnog vremena izvršenja. Kontrola se vodi prema stvarnim GitHub Actions runovima.
- Jednokratni pad zbog sudara pri pisanju nije kodna greška ako ponovljeni run prolazi i nema trajnog odstupanja.
- Svaki novi workflow mora biti upisan u ovaj registar prije aktivacije.

## Potvrđene operativne automatike

| Automatika | Workflow | Namjena | Deklarirani ritam | Stvarno opaženi ritam 31.07.2026. | Zadnje potvrđeno stanje | Rizik |
|---|---|---|---|---|---|---|
| Vijesti | `news-refresh.yml` | Osvježava AKTUAL vijesti i podatke izvora | svaka 2 sata | približno 2–4 sata | ponovljeni run zelen nakon prolaznog write sudara | visoki rizik sudara pri pisanju u `main` |
| Blogger zrcalo | `blog-mirror-publish.yml` | Objavljuje do 6 novih tekstova na Blogger | svaki sat | približno 3–4 sata | 4 uzastopna uspješna runa | vanjski API rate limit; kolumne trebaju statičke HTML rute |
| Tržišni podaci | `market-pulse.yml` ili odgovarajući market workflow | Osvježava tržišne podatke | periodično | približno 4 sata | 4 uzastopna uspješna runa | vanjski API i write konkurencija |
| Makro podaci | macro refresh workflow | Osvježava makroekonomske podatke | periodično | približno 3–7 sati | 4 uzastopna uspješna runa | nepravilni intervali i vanjski izvori |
| SEO ciklus | `seo-news-cycle.yml` | SEO i visibility obrada novog sadržaja | periodično | približno 4 sata | 4 uzastopna uspješna runa | ovisnost o svježem sadržaju i prethodnim writeovima |
| Sigurnosno zrcalo | `mirror-sync-masarykova.yml` | Sinkronizira sigurnosno zrcalo | periodično | približno 3–6 sati | 4 uzastopna uspješna runa | konkurentni push/sync i zaštita povijesti |
| Produkcijski deploy | `deploy-admin-auth-v6.yml` | Jedini odobreni produkcijski deploy | ručno | samo po izričitoj odluci | nije dio periodičnog nadzora | kritično; zahtijeva sve zelene provjere |

## Potvrđene kontrolne i CI automatike na PR-u #888

| Workflow | Funkcija | Stanje na ranije provjerenom HEAD-u |
|---|---|---|
| `Automation Kill-Switch Contract` | Provjerava fail-closed registre i kill-switcheve | zeleno |
| `Kolumne Static Pages Contract` | Generira kolumne u privremenu mapu i provjerava SEO/HTML ugovor | zeleno |
| `Validate Legacy Public Portal Package` | Legacy portal paket | zeleno |
| `Validate gnk-asg-image-proxy` | Validation-only Worker provjera | zeleno |
| `Site Functional Readiness` | Funkcionalna spremnost | zeleno |
| `Validate GNK ASG production package` | Produkcijski paket bez deploya | zeleno |
| `Public Portal Audit` | Browser i infrastrukturni audit | prethodno crveno na validaciji browser contrast evidence; svaki novi HEAD mora se ponovno provjeriti |

## Pripremljene ili isključene automatike

| Automatika | Workflow | Status |
|---|---|---|
| Tjedni ciklus kolumni | `kolumne-tjedni-ciklus.yml` | isključen / ručno pokretanje; ne aktivirati bez zasebne odluke |
| Statičke stranice kolumni | `kolumne-static-pages-contract.yml` | CI-only; bez produkcijskog pisanja |
| Image proxy validacija | `validate-gnk-asg-image-proxy.yml` | validation-only; nema Cloudflare deploya ni secreta |
| Digital Workforce orkestrator | workflow iz PR-a #854 | planiran ciklus svaka 4 sata; zaseban PR, nije dio PR-a #888 niti je ovdje aktiviran |

## Uklonjeni nesigurni workflowi

- `.github/workflows/deploy-gnk-asg-image-proxy.yml` — uklonjen jer je zaobilazio jedini dopušteni deploy gate.
- `.github/workflows/set-pexels-secret.yml` — uklonjen nakon jednokratne uporabe.

## Stalna kontrola

Kod svakog nadzora provjeriti:

1. sve otvorene PR-ove i njihov aktualni HEAD;
2. sve GitHub Actions runove na relevantnom HEAD-u;
3. periodične workflowe bez uspješnog runa dulje od dvostrukog stvarno opaženog intervala;
4. ponovljene write sudare, non-fast-forward push greške i konkurentne izmjene `maina`;
5. Blogger 429/401/403 greške i rast reda neobjavljenih stavki;
6. news refresh broj uspješnih izvora i trajni pad izvora;
7. market/macro zastarjelost podataka;
8. stanje mirror sinkronizacije;
9. svaki novi ili preimenovani workflow koji nije evidentiran ovdje;
10. zabranu mergea i deploya dok sve obvezne provjere nisu potvrđeno zelene.

## Otvorene tehničke mjere

- Uvesti jedinstveni `concurrency` ključ ili centralni write-lock za workflowe koji commitaju/pushaju u `main`.
- Dodati kontrolirani pull/rebase + ograničeni retry za non-fast-forward sudare.
- Razdvojiti generiranje podataka od centralnog commit/publish koraka kako bi samo jedan workflow pisao u `main`.
- Uskladiti dokumentaciju: navesti deklarirani cron i stvarno očekivani servisni prozor.
- Automatski alarmirati tek kod trajnog kvara, ponovljenog pada ili prekoračenja toleriranog intervala, a ne kod jednog prolaznog sudara.

## Napomena o potpunosti

Ovaj dokument sadrži automatike potvrđene kroz tehničku predaju, stvarne runove te otvorene PR-ove #888, #862, #854 i #852. Svaki dodatno otkriven workflow mora se odmah dodati u registar; registar je operativni izvor istine, a ne jednokratni izvještaj.
