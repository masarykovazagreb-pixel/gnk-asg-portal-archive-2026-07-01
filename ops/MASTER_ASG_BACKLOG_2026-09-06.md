# MASTER ASG — operativni backlog — 2026-09-06

Cilj: stvarno verificiranih 99%. Redoslijed: kvarovi/degradacije → automatizacija/workforce → SEO/meta/indexacija → sadržaj. Svaka promjena mora imati regresijsku provjeru prije zatvaranja.

## P0
1. [ ] Dijagnosticirati GitHub Actions kvar bez pokrenutih stepova na zadnjem `Generate Digital Workforce Newsroom Pages` schedule runu.
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
- `main` na početku ovog ciklusa: `b0d50e4f689bfb5c6ade0ba0cdea70e4486d12f5`.
- Novi scheduled kvar potvrđen je i na `Refresh GNKC Index` runu `34028796562` od 2026-09-06: job `refresh` završava `failure`, a log endpoint vraća 404 `BlobNotFound`. Budući da se isti obrazac pojavljuje na više različitih workflowa prije dostupnih stepova, nema dovoljno dokaza za spekulativnu izmjenu pojedinačne generator skripte; Actions/runner/permission sloj ostaje P0.
- `refresh-gnkc-index.yml` na `main` ima standardni `ubuntu-latest`, `contents: write`, Node 22 i uredno definirane stepove; sam YAML ne objašnjava failure prije stepova.
- HR i EN `nermin-sefic` stranice imaju verificirane canonical, hreflang HR/EN/x-default, `robots=index,follow`, OG/Twitter i JSON-LD Person/ProfilePage/Organization signale te varijante `Nermin Sefić` / `Nermin Sefic`.
- Javni web indeks danas vraća `https://gnk-asg.hr/`, HR `https://gnk-asg.hr/nermin-sefic/` i EN `https://gnk-asg.hr/en/nermin-sefic/`, pa entity rute jesu javno dohvatljive i indeksabilne.
- `sitemap.xml` sadrži HR `nermin-sefic` URL s HR/EN/x-default alternates, ali `lastmod` je još `2026-08-03`, stariji od aktualne entity SEO izmjene; sitemap freshness ostaje otvoreni P1 dok se ne provjere i preostali sitemapovi te napravi siguran sinkronizirani write.
