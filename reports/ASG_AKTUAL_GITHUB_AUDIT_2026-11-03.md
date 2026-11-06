# MASTER ASG / AKTUAL MEDIA — GitHub i produkcija: provjera 2026-11-03

**Status:** djelomično funkcionalno; nema osnove za status 100% green.

## Jedini aktivni repozitorij
- `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`, grana `main`.
- Source of truth: `docs/ACTIVE-SOURCE-OF-TRUTH.md`.
- Izvorni commit i produkcijski SHA moraju se uvijek bilježiti **odvojeno**; uspješan workflow bez javne kontrole nije dokaz produkcijske paritetnosti.
- Uspješan Deploy Admin Auth V6 od 2026-11-03: Actions run `41653948253` (pokrenut prije ovih popravaka). Noviji produkcijski postupci ne smiju se automatski proglasiti LIVE.

## Greške potvrđene iz dnevnika izvršavanja
1. **P0 — Publish Scheduled Editorial Content (run 41674945056):** prekid u koraku `build-aktual-media-weekly-v1.mjs`, jer `aktual-weekly-curation.json` sadrži osam provjerenih stavki za `2026-10-26`, ali središnji feed ima novo izdanje `2026-11-02`; za taj tjedan nedostaje 8 kuriranih, izvorno provjerenih stavki. Ne smiju se izmišljati vijesti ni lažno označiti izdanje spremnim.
2. **P0 — AUTONOMIJA 365 (run 41653556935):** teško pravilo `proxy-popis` nije zadovoljeno jer regionalna arhiva koristi hostove `akcdn.detik.net.id` i `awsimages.detik.net.id` koji nisu bili na dopuštenom popisu.
3. **P1 — REGION (run 41670487772):** generiranje 17 kanala otkazano u 30-minutnom prozoru prije kraja; za Nairobi prijavljeno 2/8 izvora, za Jakartu 4/8. Potrebno razdvajanje vremena i veličine posla, uz očuvanje provjera kvalitete.
4. **P1 — Preview/SEO:** javni članak o opozivu žigova `/objave/dinamo-zigovi-privremena-mjera-rizik-240-milijuna/` dohvatljiv je kroz vanjski tekstualni servis, ali nije dokazana svježina produkcijskog SHA ni ispravnost svih prikaza kartice na LinkedInu. Meta-podatci moraju upućivati na trajnu prikladnu sliku, ne privremeni Canva URL.

## Popravci primijenjeni 2026-11-03
- `workers/gnk-asg-direct-operator/src/image-proxy-v1.js`: eksplicitno dopuštena samo dva navedena Detik CDN hosta, bez wildcarda. Nema otvaranja proizvoljnog proxyja.
- `scripts/build-aktual-media-weekly-v1.mjs`: dodat read-only `--readiness` koji vraća strukturni status kuracije. Uobičajeni generator i dalje **pada** bez najmanje osam stavki.
- `.github/workflows/editorial-scheduled-publish.yml`: kada tekuće tjedno izdanje nije kurirano, zabilježi se upozorenje i preskaču samo generiranje tjednika i njegovih slojeva; ostali odobreni i dospjeli članci nastavljaju kroz postojeće kontrole.
- `scripts/build-autonomy-v1.mjs`: mjeri `broj stvarno pokrivenih hostova / broj stvarnih hostova`; rezervni hostovi nisu krivo prijavljeni kao greška niti se prikazuje obmanjujući omjer.

## Izvršene provjere
- GitHub REST: repo, main SHA, otvoreni PR-ovi, povijest Actions i neuspjeli logovi.
- Detaljni logovi tri neuspjela/presječena workflowa pregledani; uzroci povezani s konkretnim koracima.
- Središnji `news.json`: 300 stavki; novi tjedan `2026-11-02`.
- `aktual-weekly-curation.json`: 8 izvora za prošli tjedan `2026-10-26`; sadašnja kuracija **nije spremna**.
- Ponovna statička provjera središnjeg feeda i eksplicitne allow-liste: **0 nedopuštenih hostova**. Potpuna potvrda svih regionalnih izvora i pokretanje novog AUTONOMIJA ciklusa još su potrebni.
- Javni AKTUAL MEDIA hub i članak o žigovima dohvatljivi vanjskim čitačem; HTTP asset-status i LinkedIn scrape nisu potvrđeni.

## Što ne raditi
- Ne generirati osam neprovjerenih tjednih tekstova samo da CI pozeleni.
- Ne isključivati tvrde kriterije `proxy-popis` ili `editorial policy`.
- Ne predstavljati završetak CI, commit na main ili `Auto deploy main` kao dokaz odgovarajućeg produkcijskog SHA bez provjere.
- Ne povećavati trajanje 17-regionalnih generatora naslijepo bez procjene Actions minute budgeta.

## Dodatna provjera — 20:00 Europe/Zagreb

### Potvrđeni uspjesi
- `Check AKTUAL MEDIA Weekly V1` run `41681804408`: **success**. Postojeće kurirano izdanje valjano; tekući tjedan 2026-11-02 i dalje čeka osam stvarnih provjerenih priča.
- `sites-deploy` run `41700149864`: **success** nakon premještanja stroge provjere generiranih datoteka iza izgradnje; završen Cloudflare postupak svih šest samostalnih stranica. Ne tvrditi da je neovisni HTTP test svih 6 domena obavljen.
- `Site Health Check (2x daily Zagreb)` run `41696255278`: **success**.
- Javni AKTUAL MEDIA HR hub, odštetna pravna analiza o žigovima i /izdanja/ učitavaju se u vanjskom čitaču, ali precizan aktivni deploy SHA nije potvrđen.

### Novi uzroci problema i promjene
- `ops-automation-sla-watchdog.yml`: u ranijem runu `41693398101` potvrđeni **stale** AKTUAL podaci, zastarjela vremenska prognoza i otkazani REGION ciklusi. Oporavak sada ne šalje duplikat ako je kanonski writer već aktivan. Regionalna svježina se provjerava na svih **17** kanala kroz povijest batch izvršavanja, ne samo kroz 8 kanala u zadnjem ciklusu; usmjerava se jedna ciljna grupa kada kasni.
- GitHub `checkout@v4` u `weather-refresh.yml` prethodno je radio `fetch-depth:0`, pokušavao preuzeti **sve grane i oznake** te bio otkazan unutar petominutnog roka (run `41700209099`) prije dohvaćanja vremena. Promijenjeno na `fetch-depth:1`, samo potrebni main; news writer jednako. REGION zbog rebasea zadržava 100 commita, ali ne cijelu povijest svih grana.
- Različiti kanonski resursi (vijesti/vrijeme/region) više ne dijele jednu jedinu GitHub concurrency grupu. I dalje vrijede ne-force git push / exact-main-SHA zaštite. `Site Functional Readiness` ne otkazuje aktivnu provjeru nakon svakog novog commita.
- Strogi sites-test nije isključen: build se prvo dovršava, a **zatim** se provode potpuna usporedba generiranog izlaza i SEO/linkovi.

### Trenutačne otvorene stavke
1. Nakon novih izmjena nisu potvrđeni uspješni kanonski osvježivači `GNK News Refresh V2`, `Weather Refresh`, niti puni regionalni rotacijski ciklus za svih 17 izdanja. Novi runovi još su u postupku ili redu čekanja.
2. Puni `Site Functional Readiness` za najnoviji main SHA čeka potvrdu; `Auto deploy main` rezultat **success** može značiti i uspješno preskakanje zbog crvenog/nedovršenog gatea, a ne objavu.
3. Cloudflare kontrola točnog aktivnog SHA i LinkedIn Open Graph dohvat odobrene naslovnice za analizu žigova nisu potvrđeni.
4. Kuracija tjednika za 2026-11-02 nije spremna; ne generirati izmišljene vijesti.
5. Vanjski RSS izvori imaju djelomične prekide; zadržati oznake nepotpune pokrivenosti i stvarne izvore, bez lažno zelenog statusa.

### Posljednji pregledani relevantni commitovi
- `038e783b`: izgradnja satelitske mreže prije strogog testa generiranih artefakata.
- `eaf6b7d3`, `cb41297b`, `8263367d`: zasebne concurrency grupe (vijesti, vrijeme, region).
- `e5c25d31`, `a6252a31`, `72a3f839`: watchdog oporavak bez duplikata, 17 kanala i batch dispatch.
- `024e5581`: ne otkazuj aktivni readiness.
- `0429b045`, `6504157b`, `1bb61f9a`: ograničeno Git preuzimanje uz postojeću zaštitu non-force push/rebase.
