# Svjetska izdanja — devet samostalnih portala

Generator devet portala za gradska izdanja izvan regije (Nairobi, Jakarta,
New York, São Paulo, Sydney, Singapur, Kairo, Tokio, Peking).

- `lib/registry.mjs` — jedini popis portala: adresa, jezik, paleta, kontinent,
  izvori i kanonska adresa izdanja na gnk-asg.hr.
- `build.mjs` — gradi `site/<grad>/`: naslovnicu, teme, izvore, metodologiju,
  mrežu, 404, RSS i JSON feed, sitemap, robots, llms.txt, manifest i `_headers`.
- `site/` je izlaz (u `.gitignore`); ne uređuje se ručno.

Portal ne kopira članke: svaki zapis vodi na kanonski osvrt pod
`gnk-asg.hr/kanal/<grad>/clanak/<slug>/`. Zato portal nema stranice članaka
ni članke u sitemapu — nema dvostrukog sadržaja među domenama.

```bash
node apps/world/build.mjs                 # svih devet
node apps/world/build.mjs --only tokio    # jedan
node tests/test-world-portals-v1.mjs      # ugovor portala
node tests/test-network-mesh-v1.mjs       # mreža: 20 ulaza, 18 portala
```

Objava: `.github/workflows/world-portals-deploy.yml` (dev9 Cloudflare Pages
projekata `gnk-world-<grad>`). Dokumentacija: `docs/svijet-portali-v1.md`.

## Lokalni predlošci planiranih država

`node scripts/world/build-country-previews-v1.mjs` generira lokalne, neindeksabilne
predloške za države statusa `planned` u `apps/world/country-previews/<id>/`.
Izlaz je ignoriran u Gitu, bez članaka, feedova, slika, sitemapa i deploya.
Za drugi direktorij: `node scripts/world/build-country-previews-v1.mjs --out /tmp/country-previews`.
Generator ne obrađuje postojeće `live` i `preparing` kanale te ne prepisuje
postojeću stranicu bez oznake generatora. `node scripts/world/test-country-previews-v1.mjs`
provjerava zaštite. URL i naziv Cloudflare projekta u registru su plan, a ne dokaz
postojanja projekta ili domene. Javno izdanje i dalje zahtijeva izvore, prava,
urednika i postojeće kapije iz `docs/factory/SVIJET-PLAN-V1.md`.

Radni predlošci nose opis, Open Graph i Twitter metapodatke s jasnom oznakom
pripreme, te poveznice prema GNK ASG-u i AKTUAL MEDIA-i. Namjerno nemaju canonical
ni og:url prema nepostojećim javnim adresama i zadržavaju noindex/robots zabranu.
