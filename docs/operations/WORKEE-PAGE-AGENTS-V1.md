# Workee — koordinator agenata stranica

Workee je naziv internog koordinatora provjera stranica. Ovo nije integracija s vanjskim servisom Workee i ne predstavlja 1.573 samostalna AI procesa. Postojeći modelirani Workforce profili ostaju jasno odvojeni od ovih izvršenih lokalnih provjera.

`node scripts/workee-page-agents-v1.mjs` prolazi HTML izlaze portala, REGION-a, samostalnih stranica, svjetskih izdanja, arhive, dnevnika i tjednika. Svaka pronađena datoteka dobiva jednog agenta sa stabilnim ID-jem, hashom sadržaja i vlastitim prijedlozima. HR i EN datoteke imaju zasebne agente. Nova datoteka pri sljedećem pokretanju automatski dobiva agenta; nije potrebno ručno dodavati ime u registar.

Agent provjerava title, description, canonical, OG sliku, Twitter card i nedostajući alt. Nalazi imaju dokaz, prioritet i stabilan ID prijedloga. Svaka stranica dobiva i prijedlog razvoja povezan s njezinim naslovom, jasno označen kao prijedlog bez provjerenog interesa čitatelja. To su deterministička pravila; nije uključen vanjski model niti generiranje novih članaka.

Izlaz: `artifacts/workforce-supervisor/page-agents.json`. Postojeći Workforce Supervisor pokreće provjere i sprema izvještaj kao GitHub Actions artefakt uz točan `GITHUB_SHA`. Postojeći mrežni pokretač također uključuje Workee. Nema novog rasporeda, samostalnog deploy bota ni novih ovlasti za pisanje.

Tijek: agentov nalaz ili ideja → Workee izvještaj → urednik bira i provjerava izvore/prava → zaseban zadatak i PR → postojeće provjere → odobrena objava i exact-SHA provjera. Agent ne mijenja HTML, ne objavljuje komentare, ne dodaje lažno autorstvo i ne preuzima uredničko odobrenje.

Pokrivenost znači pronađene lokalne HTML datoteke, ne sve dinamičke rute i ne dokaz dostupnosti produkcije. Nepostojeći build direktoriji navedeni su u `scope.missingRoots`; ne prikazuju se kao provjereni. Izvještaj se obnavlja pri svakom ciklusu; ne glumi trajnu bazu prihvaćenih odluka. Stabilni ID-jevi omogućuju povezivanje s kasnijim zadacima bez ponovnog proglašavanja starog prijedloga novim.
