# MASTER ASG — operativni backlog — 2026-09-06

Cilj: stvarno verificiranih 99%. Redoslijed: kvarovi/degradacije → automatizacija/workforce → SEO/meta/indexacija → sadržaj. Svaka promjena mora imati regresijsku provjeru prije zatvaranja.

## P0
1. [ ] Dijagnosticirati GitHub Actions kvar bez pokrenutih stepova na zadnjem scheduled runu; obrazac je potvrđen na više nepovezanih workflowa.
2. [ ] Vratiti barem jedan uspješan scheduled Actions run na aktualnom `main` SHA i potvrditi runner/permissions stanje.
3. [ ] Provjeriti sve mutation workflove koji koriste `gnk-asg-main-mutation` concurrency i ukloniti konflikt samo ako je reproduciran.
4. [ ] Verificirati health/freshness kritičnih javnih ruta nakon Actions oporavka.
5. [ ] Verificirati AKTUAL/news freshness i da generator/objava nisu stale.
6. [ ] Verificirati weather pipeline i njegovu timestamp/freshness disciplinu.
7. [ ] Verificirati market/digital-assets pipeline i stale/failure fallback.
8. [ ] Verificirati Digital Workforce runtime + newsroom generation + javne statičke rute.

## P1
9. [x] Izvršiti entity SEO audit za `Nermin Sefić`, `Nermin Sefic` i `GNK ASG` na HR i EN rutama.
10. [x] Provjeriti canonical/hreflang/robots/OG/JSON-LD konzistentnost na entity stranicama.
11. [ ] Provjeriti `sitemap.xml`, `sitemap-index.xml`, `editorial-sitemap.xml` i URL pokrivenost novih ruta.
12. [ ] Provjeriti `image-sitemap.xml`, image loc/title/caption i dostupnost kanonskih slika.
13. [ ] Provjeriti da SEO normalizer ne mijenja sadržaj izvan deklariranih entity ruta.
14. [ ] Pokrenuti regression audit nakon svakog SEO writea i usporediti ključne javne rute.
15. [ ] Provjeriti publication/freshness workflove i posljednji stvarno uspješan publish commit.
16. [ ] Provjeriti worker SLA/watchdog, stale worker evidenciju i automatizirane recovery putove.
17. [ ] Provjeriti da release fence / kill-switch varijable ne blokiraju kritične scheduled jobove.

## P2
18. [ ] Audit meta title/description duplikata i predugih/praznih vrijednosti na glavnim javnim stranicama.
19. [ ] Audit missing alt teksta i image SEO signala na prioritetnim slikama.
20. [ ] Audit internal-link strukture prema entity, newsroom i Digital Workforce hubovima.
21. [ ] Provjeriti robots/indexability kontradikcije između HTML meta, sitemapova i javnih ruta.
22. [x] Održavati ovaj backlog: zatvarati samo verificirane stavke i svaki dan reprioritizirati prema novim P0/P1 kvarovima.

## 23-projektni paralelni checkpoint
- Registar za svih 22 postojećih laneova + 23. `Security/Intelligence Integration Readiness` nalazi se u `ops/master-nn/23-project-registry.json`.
- Shared Intelligence knowledge object contract nalazi se u `ops/master-nn/knowledge-object.schema.json`.
- Security/intelligence source registry je strogo `READINESS_ONLY`; `connected=false`, a stvarni connect ostaje owner-gated: `ops/master-nn/security-intelligence-source-registry.json`.
- Ovaj rad je izoliran na svježoj grani iz aktualnog `main`; postojeći PR #79 nije mergean, rerunan niti modificiran, pa nema blind-write kolizije.

## Trenutno verificirano
- `main` na početku ovog ciklusa: `e40a435326385a57474e8434e16c03aff5fc03b9`.
- Najnoviji provjereni scheduled kvar na tom SHA je `GNK ASG Automation SLA Watchdog` run `34160679475` od 2026-09-07: završio je `failure`; job `Verify automation SLAs and dispatch canonical recovery` (`101861728185`) vraća `steps: null`.
- Pokušaj čitanja loga za job `101861728185` vraća GitHub/Azure `404 BlobNotFound`, što dodatno potvrđuje failure-before-visible-steps obrazac i na aktualnom automation watchdogu. Zbog istog obrasca na više nepovezanih workflowa i dalje nema osnove za spekulativni popravak pojedinačnog generatora ili blind rerun.
- Prethodno je isti obrazac potvrđen na `Site Health Check (2x daily Zagreb)`, `GNK News Refresh V2`, `World Monitor Data Refresh (free sources)` i `Refresh GNKC Index`; Actions/runner/job-evidence sloj ostaje P0.
- `refresh-gnkc-index.yml` na `main` ima standardni `ubuntu-latest`, `contents: write`, Node 22 i uredno definirane stepove; sam YAML ne objašnjava failure prije stepova.
- HR i EN `nermin-sefic` stranice imaju verificirane canonical, hreflang HR/EN/x-default, `robots=index,follow`, OG/Twitter i JSON-LD Person/ProfilePage/Organization signale te varijante `Nermin Sefić` / `Nermin Sefic`.
- `apps/portal/sitemap.xml` sadrži HR i EN `nermin-sefic` URL-ove s HR/EN/x-default alternates, ali oba imaju `lastmod` `2026-08-03`, stariji od aktualne entity SEO izmjene; sitemap freshness ostaje otvoreni P1.
- `apps/portal/sitemap-index.xml` uključuje glavni, editorial, corporate-editorials, visual, image i world-topics-image sitemap; deklarirani lastmod za glavni i image sitemap je `2026-08-26`, što nije sinkronizirano s novijom entity SEO izmjenom i traži kontrolirani refresh tek nakon potvrde sadržaja svih sitemapova.
