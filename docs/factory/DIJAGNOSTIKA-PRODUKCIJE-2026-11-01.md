# Dijagnostika produkcije — 1. 11. 2026.

Ovo je istraživanje snimke, ne potvrda da je kvar već otklonjen. Sve vrijeme je UTC ako nije drukčije navedeno.

## Autonomija 365

GitHub run [41311996151](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/41311996151) završio je neuspješno na „Signal tvrdih kriterija”. Sadržaj koji je sam ciklus zapisao u `apps/portal/data/autonomy-status.json` u commitu `12ffdf821ed6` (mjereno 13:35:54) daje konkretan uzrok: tvrdi kriterij `proxy-popis` pao je jer nedostaju `akcdn.detik.net.id` i `awsimages.detik.net.id`. `www.nasa.gov` je naveden kao višak, ali rotirajući višak ne ruši kriterij. Broj `85 / 85` **ne znači** jednakost skupova.

Regionalni zapis Jakarta iz istog commita sadržavao je 510 nepraznih slika, od toga pet s prvog hosta (zapisi CNN Indonesia) i pet s drugog (CNBC Indonesia). Dijagnostika: `node scripts/factory/image-host-audit-v1.mjs <putanja-do-arhive.json>`. Alat ne dohvaća slike niti širi dopušteni popis. Nalaz da host tehnički nedostaje **nije dokaz prava na fotografije**; prava i sigurnosni pregled moraju prethoditi dodavanju. Bez toga udaljene slike ostaju blokirane proxyjem. Našu radnu granu i produkciju ne treba poistovjećivati: podaci na mainu mijenjaju se.

## SLA i otkazani poslovi

Run [41310173603](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/41310173603) pao je na koraku provjere svježine i SLA; detaljni log u ovom okruženju vraća EOF pa točan popis svih njegovih grešaka nije utvrđen. Status feeda na mainu dohvaćen tijekom istrage imao je `ok: true`, 300 stavki i `updated_at` 09:09:42 CET, odnosno 08:09:42 UTC. U trenutku pokretanja Watchdoga 13:12:55 UTC taj je zapis bio star oko pet sati, više od 180 minuta praga u workflowu. To je dokaz zastarjelosti u tom trenutku, ali bez loga ne dokazuje sve uvjete ni točan skup prijavljenih grešaka.

News oporavak [41310214267](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/41310214267) bio je otkazan; prethodni uspješni news ciklus [41287390773](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/41287390773) završio je u 09:09:52 UTC. U repozitoriju više od 20 workflowa koristi istu `gnk-asg-main-mutation` concurrency grupu; to je rizik zamjene poslova na čekanju, ali bez potpunog loga ne tvrdi se da je uzrok baš ovog otkazivanja. Ne uklanjati zaštitu od konkurentnog pisanja niti forsirati push kao prečac.

[Deploy Admin Auth V6 41312228183](https://github.com/masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01/actions/runs/41312228183) završen je uspješno za `9b8f16f0b945` na mainu. To nije dokaz deploya radne grane niti dokaz naknadne svježine svih sadržaja.

## Poboljšanje nadzora na radnoj grani

Nadzor je prethodno mogao prekinuti izvršavanje ako GitHub odbije zahtjev za pokretanje oporavka, a neki opisi mogli su tvrditi da je oporavak pokrenut prije uspješnog odgovora. Promjena na radnoj grani bilježi neuspjeh zahtjeva bez ispisa osjetljivih detalja, ne tvrdi da je oporavak pokrenut te nastavlja skupljati ostale rezultate. U istom ciklusu ponovljeni zahtjev čuva ishod prvog pokušaja; sljedeći redovni ciklus može ponovno pokušati. Test koristi lažni API i ne pokreće produkcijske poslove. To nije popravak samog uzroka zastarjelih feedova ni potvrda deploya.
