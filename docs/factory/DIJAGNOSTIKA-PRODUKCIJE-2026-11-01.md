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

## Usporedba regionalnih arhiva prije integracije (2. 11.)

`node scripts/factory/archive-compare-v1.mjs <puni-main-SHA> <puni-SHA-grane>` samo čita dva git stabla i ispisuje zapise po kanalu; ne mijenja sadržaj niti automatski spaja. Prijavljuje nedostajuće registre/datoteke, neispravne ili ponovljene slugove, slugove jedinstvene za svaku stranu i razlike u poljima `title`, `date`, `url`, `source`, `sourceName`. Isti slug ne jamči jednakost ostalih polja, prava, datoteka stranica ili kvalitete sadržaja.

Za snimke main `fb8c7b2925c2daf6b7815335960645ab4e30a885` i radnu granu `5d314a6da1f4d06a1c935f7315d3bcf2ce87b94a` mjereno je 17 kanala: 9.736 zapisa na mainu i 7.361 na grani, od toga **2.706 slugova samo na mainu**, **331 samo na grani** te šest zajedničkih slugova s razlikom u navedenih pet polja. Primjer Beograda: main 609, grana 443; 189 samo na mainu i 23 samo na grani. Ne smije se jednostavno prepisati jedna strana drugom. Potreban je detaljan pregled podataka i postojećih HTML stranica, osobito različitih zapisa, pa test spojenog stabla. Budući da se main mijenja, rezultate treba ponoviti za aktualne pune SHA-ove.

Izoliranom reprodukcijom na istom main SHA-u `tests/test-sites-network-v1.mjs` prijavio je 88 problema, uključujući nedostajuće novije prenose i zastarjele izlaze razmjene za šest stranica. Puni GitHub log ne može se dohvatiti u sandboxu; reprodukcija ne dokazuje identičan ispis u GitHubu. Popravak mora uskladiti izvore i izlaze bez zaobilaženja gatea i bez brisanja objavljenih sadržaja.
