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
8. Aktualni mail auto-reply već sadrži AI fallback, zaštitu od petlji, MIME HTML/text poruku i CID/remote PNG logo.
9. Aktualni Email Status V8 već sadrži D1 evidenciju poruka, isporuku, odbijanje, otvaranja, potvrdu primitka, click tracking, paginaciju i tehničke signale uređaja/IP-a.

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

### PR #433 — supersediran novim menu runtimeom

PR mijenja stari `public-floating-menu-v1.js`. Na aktualnom `main` ta datoteka je samo legacy shim koji učitava `public-compact-menu-v1.js`, pa izravni stari menu kod iz PR-a više nije aktivni runtime. Aktualni `floating-intelligence.css` već na mobitelu podiže AI gumb iznad donje navigacije i safe-area zone.

Odluka: ne prenositi stari menu kod. PR je kandidat za zatvaranje kao supersediran, nakon kratke vizualne provjere aktivnog compact-menu runtimea.

### PR #454 — djelomično supersediran; postoji uski operativni gap

Aktualni `main` već sadrži:

- AI-assisted auto-reply s kontroliranim fallbackom;
- CID inline logo uz remote PNG fallback;
- bounce/list/internal/loop/duplicate zaštite;
- Email Status V8 s D1 evidencijom, otvaranjima, potvrdom primitka i klikovima;
- dashboard i health prikaz.

PR #454 ipak sadrži dvije funkcije koje nisu potvrđene na aktualnom `main`:

1. zasebnu D1 tablicu `email_autoreply_audit` i operativna polja za AI/fallback način rada, profil, model i logo mode;
2. dodjelu i filtriranje jednog od deset Global Communications Centre profila.

Odluka: PR #454 ne spajati izravno. Ako su centre attribution i zasebni D1 auto-reply audit još poslovni zahtjev, prenijeti samo ta dva uska dijela na aktualni V38 uz novi ugovorni test.

## Klasifikacija otvorenih PR-ova

### Zadržati kao aktualan kandidat

- #467

### Ponovno implementirati ili posebno odlučiti

- #397
- #454 samo za D1 auto-reply operativni audit i Global Communications Centre attribution

### Supersedirano aktualnim mainom ili novijim PR-om

- #431
- #433
- #463
- #464
- #466 nakon ovog konsolidacijskog audita

### Povijesni cleanup kandidati

Stariji preview, release-candidate, connectivity, dijagnostički, indeksni i Media Center PR-ovi trebaju se pregledati i zatvoriti u zasebnom cleanup koraku. Ne smiju se masovno zatvoriti bez kratke provjere sadržavaju li jedinstveni dokaz, rollback podatak ili dokumentaciju.

## Produkcijski gate

Prije produkcijskog deploya obvezno je:

1. donijeti odluku o PR-u #467;
2. riješiti ili izričito odgoditi Media Application registracijski model;
3. odlučiti jesu li D1 auto-reply audit i Global Communications Centre attribution obvezni za ovaj release;
4. napraviti novi puni audit na rezultirajućem točnom `main` SHA-u;
5. provjeriti javne i zaštićene rute bez slanja mailova;
6. potvrditi da Mail Studio, Email Status i Contact vraćaju kontrolirane auth/readiness odgovore;
7. odobriti zasebno točan 40-znamenkasti produkcijski SHA;
8. tek tada ručno pokrenuti `Deploy Admin Auth V6`.

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
4. po potrebi dodati uski D1 auto-reply operations paket;
5. zatim izvesti konačni audit i pripremiti deploy zajedno s korisnikom.
