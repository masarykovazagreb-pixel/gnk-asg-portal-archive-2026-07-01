# Migracija, provjera izdanja i rollback

## Osnovni princip

Promjene se pripremaju u Git grani i provjeravaju kroz pull request. Nema produkcijske objave iz radne grane ni automatskog fallbacka. Produkcijski deploy dopušten je samo kroz zaštićeni workflow, uz zasebno odobrenje, potpunu SHA vrijednost i provjeru iste verzije prije deploya.

## Produkcijska provjera

Workflow `.github/workflows/deploy-admin-auth-v6.yml` prihvaća ručno pokretanje s grane `main`, punim SHA-om od 40 znakova i izričitom potvrdom. Provjerava se da odobreni SHA odgovara `main`, čistom checkoutu i SHA-u neposredno prije deploya. Nakon deploya `scripts/verify-production-release-v38.sh` provjerava zaglavlja i oznake točne aktivne verzije.

Za svako ovlašteno pokretanje postaviti `notify_search_engines=false`. IndexNow te Google/Bing obavijesti, vanjske poruke, objave i društvena distribucija nisu dio deploya bez zasebnog odobrenja.

## Rollback

Rollback je zaseban, odobren operativni zahvat. Utvrditi točan Worker i prethodni dobar version ID, vratiti samo odabrani kod, sačuvati bindinge i povezane podatke, a zatim provjeriti vraćeni SHA i javne endpointove. Ne raditi reset ili force-push grane `main`; za popravak koji nije dostupan kao prethodna Worker verzija pripremiti i pregledati zaseban recovery PR.

Detaljna checklista, naredbe, provjere točnog SHA-a, uvjeti za oporavak i zabrane vanjskih obavijesti nalaze se u [Production exact-SHA verification and rollback runbook v1](operations/PRODUCTION-ROLLBACK-AND-RECOVERY-V1.md).
