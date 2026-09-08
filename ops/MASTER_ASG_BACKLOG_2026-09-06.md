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

## Trenutno verificirano
- `main` na početku ciklusa 2026-09-08: `e40a435326385a57474e8434e16c03aff5fc03b9`.
- Najnoviji provjereni scheduled kvar je `Site Health Check (2x daily Zagreb)` run `34177082529`, pokrenut 2026-09-08T01:34:05Z na exact `main` SHA `e40a435326385a57474e8434e16c03aff5fc03b9`: završio je `failure`; jedini job `health-check` (`101908521203`) ima `steps: null`. Nema dokaza da je izvršen ijedan workflow step, pa se kvar i dalje klasificira kao runner-allocation/execution P0, ne kao code-step failure.
- Prethodni Execution Probe run `34170993438` pokazao je isti failure-before-steps obrazac; blind rerun nije opravdan.
- Prethodno je isti obrazac potvrđen i na `GNK News Refresh V2`, `World Monitor Data Refresh (free sources)` i `Refresh GNKC Index`; zbog ponavljanja na nepovezanim workflowima nema dovoljno dokaza za spekulativnu izmjenu pojedinačnog generatora. Actions/runner/permission sloj ostaje izolirani P0.
- Dok runner P0 traje, runner-independent R0/R1 rad na ostalim MASTER laneovima ostaje dopušten i ne smije biti blokiran ovim incidentom.
- `refresh-gnkc-index.yml` na `main` ima standardni `ubuntu-latest`, `contents: write`, Node 22 i uredno definirane stepove; sam YAML ne objašnjava failure prije stepova.
- HR i EN `nermin-sefic` stranice imaju verificirane canonical, hreflang HR/EN/x-default, `robots=index,follow`, OG/Twitter i JSON-LD Person/ProfilePage/Organization signale te varijante `Nermin Sefić` / `Nermin Sefic`.
- `apps/portal/sitemap.xml` sadrži HR i EN `nermin-sefic` URL-ove s HR/EN/x-default alternates, ali oba imaju `lastmod` `2026-08-03`, stariji od aktualne entity SEO izmjene; sitemap freshness ostaje otvoreni P1.
- `apps/portal/sitemap-index.xml` uključuje glavni, editorial, corporate-editorials, visual, image i world-topics-image sitemap; deklarirani lastmod za glavni i image sitemap je `2026-08-26`, što nije sinkronizirano s novijom entity SEO izmjenom i traži kontrolirani refresh tek nakon potvrde sadržaja svih sitemapova.
