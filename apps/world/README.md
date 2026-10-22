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
