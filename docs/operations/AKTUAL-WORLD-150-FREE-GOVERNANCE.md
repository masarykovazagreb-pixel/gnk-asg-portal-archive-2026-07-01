> **ODLUKA VLASNIKA — 22.10.2026.: ZAUSTAVLJEN RAZVOJ 12 NOVIH PORTALA.** Nove međunarodne stranice kreira vlasnik izvan ovog zadatka. Nema dodatnog razvoja, deploya, robots-index aktivacije ili automatskog ciklusa za `apps/world/`, `apps/global-free/` i `apps/world-network/`. Ranije izrađeni nacrti ostaju samo povijesni staging materijal. Budući vlasnikovi portali mogu se naknadno registrirati za besplatno čitanje i nadzor, bez automatskog objavljivanja. Prioritet su postojeća AKTUAL MEDIA i osam regionalnih izdanja, urednički Infocentar, Worker sigurnost, izvorna istraživanja i CI stabilizacija.

# AKTUAL MEDIA / GNK ASG — 150 agenata i 12 besplatnih globalnih portala (operativna istina)

Datum pripreme: 22.10.2026. Jedini aktivni GitHub repozitorij: `masarykovazagreb-pixel/gnk-asg-portal-archive-2026-07-01`. Beckuphome je arhiva. `main` nije isto što i dokazano aktivna produkcija.

## Uloga 150 agenata

Izvršni sloj `scripts/aktual-world-agent-factory-v1.mjs` s registrom `config/control-plane/master-asg-150-agent-registry-v1.json` provodi **150 provjera/izvršnih odgovornosti**: 15 nacionalnih nadzornika izvora, 8 regionalnih deskova, 32 frontend, 25 backend, 20 SEO, 18 vizualnih, 15 QA, 10 distribucijskih i 7 sigurnosnih agenata. Nisu to 150 pojedinačnih Cloudflare Worker instanci, 150 neovisnih AI modela, niti 150 naplatnih agenata.

Nacionalni registrirani izvori su Jutarnji list, Poslovni dnevnik, Lider, Forbes, Index, tportal, N1 HR, HRT, Telegram, 24sata, Večernji, Bug, Muzika.hr, Ravno do dna i Glazba.hr. Za svaki postoji maksimalno pet uredničkih kandidata dnevno, samo ako postoje stvarni datum i poveznica izvornika. Ako besplatni RSS nije dostupan, evidentira se nedostupnost, ne lažira rezultat i ne zaobilazi pravila stranice. Lokalni arhivski podaci su izvor početnog pregleda; na postojećem četverosatnom rasporedu javni RSS feedovi smiju se čitati bez plaćenog API-ja.

Regionalni deskovi postoje na osam jezika: Zagreb/hr, Beograd/sr, Sarajevo/bs, Budimpešta/hu, Ljubljana/sl, Rim/it, Sofija/bg, Bukurešt/ro. Uvijek se koristi postojeći `apps/region/channels.json`, arhiva i pojedinačna glavna mreža izdavanja; nijedan novi agent ne smije postati konkurentski pisac na main. Paket uz svaki naslov ima izvor, datum, uredničko pitanje i `HOLD_SOURCE_REVIEW`, ne puni napisani članak i ne obmanjujući status "published". Samo izričito kvalitativno provjeren tekst može proći postojeće uredničke i produkcijske ograde.

## Jedinstven skup novih portala: 12, ne 150

**Jedina kanonska lista za buduće nove Cloudflare Pages projekte:** `config/control-plane/world-free-portal-network-v1.json`, konkretne stranice: `apps/world/site/<id>/index.html`. Popis sadrži New York, Mexico City, São Paulo, Lagos, Nairobi, Dubai, Mumbai, Singapore, Tokyo, Seoul, Jakarta i Sydney. Svaki ima lokaliziranu naslovnicu i tekst, slikovni prikaz brenda, Open Graph / Twitter metapodatke i poveznicu na `https://gnk-asg.hr/gnk-aktual/`.

Drugi prototipni skupovi `config/control-plane/global-150-free-network-v1.json`, `apps/world-network/site/` te `config/control-plane/aktual-global-12-free-sites-v1.json` / `apps/global-free/sites/` služe za **interni UX, grafički i sadržajni preview**. **Nisu dodatni izdavači ni odobrena 13+12 nova projekta**; nije dopušteno automatski deployati ih samo zato što postoji staging HTML. Tako se broj vanjskih projekata drži na 12.

## Ograničenja besplatnog rada

- Bez naplatnih LLM API-ja, Exa API-ja, pretplate, kupnje domene, Cloudflare Workers dodatnih pretplata ili novih rasporeda. Cloudflare Pages besplatna razina (prema službenoj dokumentaciji 2026.) ima ograničenje do 100 Pages projekata po računu i 500 buildova mjesečno, s jednim istodobnim buildom. Kapacitet korisničkog Cloudflare računa nije potvrđen.
- **Za GitHub Actions nema dodatnog internog ograničenja minuta.** Sustav smije koristiti cijelu raspoloživu besplatnu kvotu GitHub računa ili besplatne standardne runnere javnog repozitorija. Automatska naplata, plaćeni runneri i nadogradnja plana nisu odobreni. Četverosatni raspored 150 uloga ostaje radi učinkovitosti, a ne internog mjesečnog limita.
- **Vanjske stranice nisu automatski objavljene.** Ručni `.github/workflows/aktual-world-free-release.yml` sada je isključivo **read-only FREE staging preflight**: provjerava točan SHA glavne grane i svih 12 staging dokumenata te izbacuje evidencijski manifest, ali **ne poziva Cloudflare, ne stvara projekte, ne deploya i ne troši plaćene API-je**. To je nužno jer postojeći CI izričito blokira nove proizvoljne produkcijske deploy workflowe. Stvarno Cloudflare postavljanje mora proći postojeći odobreni i zaštićeni release proces, uz dostupne ovlasti i uvjete Free plana.
- Sam prvi kontrolirani Cloudflare deploy ostaje **NOINDEX STAGING**. HTTP 200 je samo dokaz dostupnosti, ne indeksacije, uredničke kvalitete ili prihvaćanja. Prije indeksabilnog izdanja treba potvrditi URL iz stvarnog Cloudflare odgovora, canonical, jezike, prava slike, izvore, kvalitetu originalnih tekstova, završnu uredničku odluku, raspored, SEO, social meta i exact-SHA release. Ne objavljivati mase tankih/sličnih stranica samo radi backlinkova.
- Izvještaj o 150 izvršenih provjera i 12 lokaliziranih previewa je `artifacts/aktual-world-agent-factory/report.json`; kandidati za komentar `review-packets.json`. On nastaje samo nakon uspješnog pokretanja, nije dokaz da je workflow već prošao.

## Infocentar i pravilo 30 minuta

Prijedlog ide u postojeći zaštićeni `/admin-center/editorial-approval/` / urednički red s dokazom slanja i dostave, jedinstvenim hashom sadržaja i mogućnošću odbijanja. Trenutna stranica odluke pamti **lokalno u pregledniku**; to nije pouzdan server-side okidač produkcije i ne smije se prikazivati kao implementirano globalno odobravanje. Izostanak prigovora nakon 30 minuta daje zeleno svjetlo samo za **niski rizik, internu pripremu i PR** uz verificiranu dostavu. Stvarni javni sadržaj, pravno osjetljivi navodi, promjene prava, DNS-a i tajni moraju ostati iza izričitih odobrenja.

## Plan daljnjeg razvoja (redoslijed)

1. Validirati CI i razriješiti izvore koji vraćaju 403/404 bez preuzimanja tuđeg punog teksta.
2. Uvesti kvalitetni originalni komentatorski engine (besplatan lokalni model ili vlastiti ovlašteni AI servis, ako postoji), s odvojenim uredničkim HOLD i objavama na postojećoj mreži. Nema izmišljanja autorstva.
3. Spojiti privatni server-side red odluka i potvrđenu dostavu na Infocentar.
4. Uz stvarni Free-tier Cloudflare račun i postojeći odobreni release mehanizam aktivirati **isključivo** 12 kanonskih stranica; ne mijenjati CI allowliste ili produkcijske zaštite samo da bi se omogućio novi deploy. Pribaviti pozitivne, neovisne HTTP potvrde.
5. Tek na provjerenim javnim URL-ovima graditi indeksabilne originalne tekstove, licencirane vlastite slike, dobar alt, JSON-LD, sitemap, hreflang i opravdane lokalizirane ključne riječi, uz selektivno povezivanje s AKTUAL MEDIA. Bez spam farmi i dupliciranja medijskih članaka.

Ovaj sustav je stvarni program za pripremu, nadzor, testove i multijezični staging. Nije istinito tvrditi da 150 samostalnih LLM-ova kontinuirano razvija projekt ili da je 12 portala već javno izdano dok to ne potvrde pravo izvršenje i hosting.
