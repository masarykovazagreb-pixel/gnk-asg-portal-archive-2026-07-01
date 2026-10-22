# GNK ASG / AKTUAL MEDIA — 150 agentskih uloga, 12 novih FREE portala

Jedini kanonski writer: `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01` na grani `main`. Radna implementacija je u PR #349 dok se testovi ne potvrde i promjena ne prihvati.

## Stvarno izvršivi agenti, bez naplate
- 8 regionalnih redakcija × 12 provjera = 96 uloga. Izvor: `apps/region/channels.json` i javni RSS podaci u `apps/region/data/*.json`.
- 12 pripremljenih svjetskih redakcija × 4 provjere = 48 uloga.
- 6 centralnih nadzornika = **150 izvršivih uloga**.
- `node tests/test-agent-factory-150-v1.mjs` testira konfiguraciju, sadržaj, jezike, metapodatke i HOLD ograde.
- `node scripts/agent-factory-150-v1.mjs` izvodi stvarne determinističke provjere i upisuje JSON izvještaje u `artifacts/agent-factory-150/`.
- Pokretati unutar već postojećeg 4-satnog workflowa. Bez dodatnog cron-a, bez automatskih plaćenih API poziva i bez 150 zasebnih Cloudflare instanci.

**Izvršna stvarnost**: 150 je broj *uloga/izvršenih provjera*, ne neovisnih online Worker servisa, niti 150 kreativnih AI modela. Za autonomno pisanje su potrebni lokalni besplatni AI modeli ili posebna, zasebno uključena besplatna usluga; trenutačna infrastruktura priprema verificirane pakete izvora, ne izmišlja gotove članke.

## Svjetska besplatna mreža
12 pripremljenih statičkih portala: New York (en), Mexico City (es-MX), São Paulo (pt-BR), Lagos (en), Nairobi (sw), Dubai (ar), Mumbai (hi), Singapore (en), Tokio (ja), Seul (ko), Jakarta (id), Sydney (en-AU). Izvorište: `config/control-plane/world-free-portal-network-v1.json`; statični izlaz: `apps/world/site/`.

Brend je **AKTUAL MEDIA / Aktual mediji**, uz uredničku koordinaciju **Nermin Sefić** (alias Nermin Sefic). Individualni osobni autor samo uz dokaz autorstva.

Svaki portal ima lokalizirani uvod, SEO opis, Open Graph, Twitter i identitet, sliku postojeće brend imovine, lokalnu semantiku i poveznice prema glavnoj domeni. **Svaki portal trenutačno nosi noindex i nema canonical ni potvrđenu besplatnu poddomenu**, jer je to tehnička priprema, ne javno objavljena redakcija.

## Besplatan hosting i troškovne ograde
Primarni kandidat je Cloudflare Pages Free s projektom po kanalu i `pages.dev` adresom tek nakon uspješnog provisioninga. Ne rezerviramo niti objavljujemo izmišljene URL-ove. GitHub Pages na besplatnom planu zahtijeva javni repozitorij, te nije dobar izvor za skriveni portal.

Održati najviše 1000 Actions minuta mjesečno na postojećim kontrolama; ne stvarati novi cron. Uključivanje vanjskih projektnih lokacija ne zaobilazi provjere sadržaja, prava na slike, editor review, zaštitu tajni ni production release. Predviđeni kasniji deployment je manual-only na besplatne projekte uz zaseban release gate.

## Infocentar i 30 minuta
Sva redakcijska priprema stvara source packet s predloženim naslovima/URL-ovima i statusom HOLD. Dostava obavijesti korisniku mora biti potvrđena, sve izmjene zamrznute hashom i odbijanje mora odmah zaustaviti proces. Nakon 30 minuta bez prigovora mogu se odobriti samo niskorizične interne pripreme. Objavljivanje provjerene, dopuštene uredničke građe zahtijeva da neovisne sigurnosne, ljudske uredničke i produkcijske kontrole stvarno budu zadovoljene. Sama šutnja nije provjera činjenica.

Objavu potvrditi tek nakon realnog deploya i vanjske HTTP provjere točnog URL-a; `main` nije automatski `live`.
