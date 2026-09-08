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
- `main` prije ovog writea 2026-09-08 09:11 Europe/Zagreb: `8981ccc70371c99678c0b1a9747d8c3989426ecc`.
- Najnoviji provjereni scheduled run je `Weather Refresh (Zagreb)` run `34198111568`, pokrenut 2026-09-08T07:11:27Z na exact SHA `8981ccc70371c99678c0b1a9747d8c3989426ecc`: završio je `failure`; jedini job `refresh` (`101970335402`) ima `steps: []`, `runner_id: 0` i prazan `runner_name`. To je aktualni dokaz runner-allocation/execution P0, ne code-step failure.
- Prethodni Execution Probe run `34170993438` i Site Health Check run `34177082529` pokazali su isti failure-before-steps obrazac; blind rerun nije opravdan.
- Isti obrazac ranije je potvrđen na `GNK News Refresh V2`, `World Monitor Data Refresh (free sources)` i `Refresh GNKC Index`; zbog ponavljanja na nepovezanim workflowima nema dovoljno dokaza za spekulativnu izmjenu pojedinačnog generatora. Actions/runner/permission sloj ostaje izolirani P0.
- Dok runner P0 traje, runner-independent R0/R1 rad na ostalim MASTER laneovima ostaje dopušten i ne smije biti blokiran ovim incidentom.
- Runner-independent sitemap audit potvrđuje da `apps/portal/sitemap-index.xml` registrira glavni, editorial, corporate-editorials, visual, image i world-topics-image sitemap. Glavni i image sitemap u indeksu imaju `lastmod=2026-08-26`, dok corporate-editorials ima `2026-08-30`; freshness parity nije zatvorena.
- `apps/portal/sitemap.xml` sadrži HR/EN/x-default alternates na većem broju ključnih ruta, ali audit još nije dovoljan za zatvaranje P1 #11 bez potpune URL coverage i editorial-sitemap provjere.
- `refresh-gnkc-index.yml` na `main` ima standardni `ubuntu-latest`, `contents: write`, Node 22 i uredno definirane stepove; sam YAML ne objašnjava failure prije stepova.
- HR i EN `nermin-sefic` stranice imaju verificirane canonical, hreflang HR/EN/x-default, `robots=index,follow`, OG/Twitter i JSON-LD Person/ProfilePage/Organization signale te varijante `Nermin Sefić` / `Nermin Sefic`.
- `apps/portal/sitemap.xml` sadrži HR i EN `nermin-sefic` URL-ove s HR/EN/x-default alternates, ali oba imaju `lastmod` `2026-08-03`, stariji od aktualne entity SEO izmjene; sitemap freshness ostaje otvoreni P1.
