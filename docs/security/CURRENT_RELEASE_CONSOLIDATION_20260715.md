# GNK ASG / GNEW — konsolidacija aktualnog releasea

Datum pregleda: 15. srpnja 2026.

Auditirana osnova:

`dc6f34cff0def561b461a5218365d8a6f20d022e`

Ovaj dokument i prateća skripta ne mijenjaju runtime, produkciju, DNS, Cloudflare rute, tajne, bindinge, mail routing niti podatke. Ne šalju poruke i ne pokreću kampanje.

## Izvršni zaključak

Aktualni `main` sadrži V38 release paket, exact-SHA produkcijski verifier i spojenu novu implementaciju praćenja klikova iz PR-a #465. Produkcijski deploy ostaje blokiran dok se ne završi konsolidacija aktualnih grana i ne odobri točan završni `main` SHA.

Status odluke:

`BLOCKED_PENDING_CONSOLIDATION`

To nije ocjena da je sustav neispravan. To znači da trenutačno ne postoji jedan konačan i potpuno konsolidiran release SHA koji obuhvaća sve otvorene projektne odluke.

## Potvrđeno na aktualnom mainu

1. Produkcijski workflow `Deploy Admin Auth V6` pokreće se ručno.
2. Workflow zahtijeva točan tekst `DEPLOY_ADMIN_AUTH_V6`.
3. Workflow zahtijeva puni 40-znamenkasti odobreni SHA.
4. Odobreni SHA mora biti predak aktualnog `origin/main`.
5. Završni verifier traži V38 release marker i točan `x-gnk-deploy-revision`.
6. Click tracking runtime i ugovorni test nalaze se na `main` nakon PR-a #465.
7. Media Application na `main` još koristi invitation model: `mailCode` + `pin`, tablicu `media_invitation_access` i invitation session.

## Aktualni otvoreni rad

### PR #467 — aktualni funkcionalni kandidat

Svrha: vratiti live same-origin Digital Exchange Monitor preko `/api/public-market` uz siguran statički fallback.

Stanje pri izradi ovog audita:

- napravljen iz aktualnog `main` SHA-a;
- mergeable;
- relevantni ugovorni i portal audit workflowi zeleni;
- nije spojen;
- nije deployan.

Odluka: zadržati otvorenim do zasebne odluke o mergeu. Nakon eventualnog mergea mora se auditirati novi puni `main` SHA.

### PR #466 — zastarjela auditna osnova

PR je vezan uz stariji `main` SHA `f9c97c178341687e2265e569946d09d9aa066624`. Aktualni `main` je nakon toga dobio dva automatizirana sadržajna commita.

Odluka: ovaj konsolidacijski audit zamjenjuje njegovu ulogu. PR #466 ne koristiti kao produkcijski dokaz bez osvježavanja na aktualnu osnovu.

### PR #463 i PR #464 — supersedirani click-tracking rad

Njihova novija izvedba već je spojena u `main` preko PR-a #465.

Odluka: kandidati za zatvaranje kao supersedirani nakon provjere da ne sadrže jedinstvenu dokumentaciju koju treba sačuvati.

### PR #397 — Media Application odluka nije prenesena na V38

PR uvodi otvorenu registraciju s korisničkim imenom i lozinkom, ali je nastao na znatno starijoj osnovi. Aktualni V38 `main` i dalje koristi invitation/PIN model.

Odluka: ne spajati stari PR izravno. Potrebna je nova uska implementacija na aktualnom V38 `main`, ili izričita odluka da invitation model ostaje.

### PR #433 i PR #454 — zahtijevaju provjeru protiv aktualnog V38

- PR #433: mobilni položaj MENU i AI kontrola.
- PR #454: kontakt, AI auto-reply, CID logo i prošireni status dashboard.

Oba PR-a su konfliktna sa sadašnjim `main` i ne smiju se izravno spajati. Treba usporediti jesu li njihove funkcije već prenesene novijim mergeovima te izdvojiti samo eventualno nedostajuće dijelove.

## Klasifikacija otvorenih PR-ova

### Zadržati kao aktualan kandidat

- #467

### Ponovno implementirati ili posebno odlučiti

- #397
- #433
- #454

### Supersedirano aktualnim mainom ili novijim PR-om

- #431
- #463
- #464
- #466 nakon ovog konsolidacijskog audita

### Povijesni cleanup kandidati

Stariji preview, release-candidate, connectivity, dijagnostički, indeksni i Media Center PR-ovi trebaju se pregledati i zatvoriti u zasebnom cleanup koraku. Ne smiju se masovno zatvoriti bez kratke provjere sadržavaju li jedinstveni dokaz, rollback podatak ili dokumentaciju.

## Produkcijski gate

Prije produkcijskog deploya obvezno je:

1. donijeti odluku o PR-u #467;
2. riješiti ili izričito odgoditi Media Application registracijski model;
3. napraviti novi puni audit na rezultirajućem točnom `main` SHA-u;
4. provjeriti javne i zaštićene rute bez slanja mailova;
5. potvrditi da Mail Studio, Email Status i Contact vraćaju kontrolirane auth/readiness odgovore;
6. odobriti zasebno točan 40-znamenkasti produkcijski SHA;
7. tek tada ručno pokrenuti `Deploy Admin Auth V6`.

## Izričite zabrane u ovoj fazi

- nema produkcijskog deploya;
- nema mergea bez zasebne odluke;
- nema DNS ili Cloudflare route promjena;
- nema promjena tajni, tokena, bindinga ili mail routinga;
- nema slanja testnih ili stvarnih poruka;
- nema kampanja, bulk slanja ili scheduled outreach aktivnosti;
- nema automatskog zatvaranja svih starih PR-ova bez pregleda.

## Sljedeća tehnička odluka

Najčišći redoslijed je:

1. završiti provjeru ovog auditnog PR-a;
2. odlučiti o PR-u #467;
3. izraditi aktualni V38 Media Application paket prema odabranom modelu;
4. zatim izvesti konačni audit i pripremiti deploy zajedno s korisnikom.
